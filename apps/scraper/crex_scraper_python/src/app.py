"""
Flask Application Entry Point.
Exposes API endpoints and manages scraper lifecycle.
"""

import asyncio
import logging
import re
import threading
import time
from concurrent.futures import TimeoutError as FutureTimeoutError
from typing import Optional, Dict, Any

from flask import Flask, jsonify, Response, request
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from .adapters.crex_adapter import CrexAdapter
from .config import get_settings
from .crex_scraper import CrexScraperService
from .crex_url_utils import (
    extract_crex_api_key,
    get_crex_details_url,
    get_crex_scorecard_url,
    get_crex_live_url,
    normalize_crex_url,
)
from .cricket_data_service import CricketDataService
from .player_stats_crawler import PlayerStatsCrawlerService, PlayerStatsTask, select_player_reference
from .health import HealthState
from .live_match_selection import select_live_matches
from .prematch_selection import select_prematch_candidates
from .loggers.adapters import configure_logging

# Configure logging immediately
configure_logging(level=logging.INFO)

logger = logging.getLogger(__name__)

app = Flask(__name__)
settings = get_settings()
scraper_service = CrexScraperService()

# Global event loop for the scraper service
scraper_loop: Optional[asyncio.AbstractEventLoop] = None
player_hydration_tasks: Dict[str, asyncio.Task] = {}


async def _hydrate_match_details(url: str) -> Dict[str, Any]:
    adapter = scraper_service.registry.get_adapter("crex")
    if not isinstance(adapter, CrexAdapter):
        raise RuntimeError("CREX adapter is unavailable")

    match_url = get_crex_live_url(url)
    info_url = get_crex_details_url(match_url)
    scorecard_url = get_crex_scorecard_url(match_url)
    sc4_key = extract_crex_api_key(match_url)

    token = scraper_service._auth_token
    if not token:
        token = await asyncio.to_thread(CricketDataService.get_bearer_token)
        if token:
            scraper_service._auth_token = token

    result: Dict[str, Any] = {
        "requested_url": url,
        "match_url": match_url,
        "info_url": info_url,
        "scorecard_url": scorecard_url,
        "match_info_saved": False,
        "scorecard_saved": False,
        "sc4_key": sc4_key,
    }

    async with scraper_service.pool.get_context() as context:
        match_info = await adapter.fetch_match_info(context, info_url)
        if match_info:
            result["match_info_saved"] = await asyncio.to_thread(
                CricketDataService.push_match_info,
                match_info,
                token,
                info_url,
            )

        page = await context.new_page()
        try:
            await page.goto(scorecard_url, wait_until="domcontentloaded", timeout=30000)
            local_storage = await adapter._wait_for_local_storage_ready(page, "hydrate_scorecard")
            result["local_storage_items"] = len(local_storage or {})

            if sc4_key:
                scorecard_store: Dict[str, Any] = {"sC4_stats": None}
                headers = {
                    "Accept": "application/json",
                    "Origin": "https://crex.com",
                    "Referer": scorecard_url,
                }
                await adapter._trigger_sc4_call(
                    f"https://api-v1.com/v10/sC4.php?key={sc4_key}",
                    headers,
                    scorecard_store,
                    page,
                )

                scorecard_stats = scorecard_store.get("sC4_stats")
                if scorecard_stats:
                    if local_storage:
                        adapter._decode_sc4_stats(scorecard_stats, local_storage)
                    result["scorecard_saved"] = await asyncio.to_thread(
                        CricketDataService.push_sc4_stats,
                        scorecard_stats,
                        token,
                        match_url,
                    )
        finally:
            await page.close()

    result["success"] = bool(result["match_info_saved"] or result["scorecard_saved"])
    return result


async def _hydrate_player_profile(
    external_id: Optional[str] = None,
    match_url: Optional[str] = None,
    player_name: Optional[str] = None,
    role: Optional[str] = None,
    resolve_only: bool = False,
) -> Dict[str, Any]:
    """Fetch a CREX player page on demand and persist it before responding.

    Scorecard rows do not always carry the provider ID. In that case resolve
    the displayed name against the match's playing-XI links first, then fetch
    the exact provider profile URL and preserve its stable suffix.
    """
    normalized_id = str(external_id or "").strip().lower()
    player_url = ""
    resolved_name = str(player_name or "").strip()

    if normalized_id:
        if not re.match(r"^player:[a-z0-9][a-z0-9-]*$", normalized_id):
            raise ValueError("externalId must be a CREX player identifier")
        slug = normalized_id.split(":", 1)[1]
        player_url = "https://crex.com/player/" + slug

    crawler = scraper_service.player_stats_crawler or PlayerStatsCrawlerService(
        pool=scraper_service.pool,
        cache=scraper_service.cache,
        registry=scraper_service.registry,
        auth_token_provider=lambda: scraper_service._auth_token,
    )

    if not normalized_id:
        if not match_url or not resolved_name:
            raise ValueError("matchUrl and playerName are required when externalId is absent")
        adapter = scraper_service.registry.get_adapter("crex")
        if not isinstance(adapter, CrexAdapter):
            raise RuntimeError("CREX adapter is unavailable")
        canonical_match_url = get_crex_live_url(match_url)
        # Managed matches normally have the CREX localStorage/API snapshot in
        # the crawler cache. Resolve from that fast lane first so a click does
        # not open a second Playwright page just to discover an existing ID.
        seed = await crawler._fetch_iv4_seed(canonical_match_url)
        if not seed or not (seed.get("players") or []):
            async with scraper_service.pool.get_context() as context:
                seed = await adapter.fetch_player_stats_seed(context, get_crex_details_url(canonical_match_url))
        player = select_player_reference(seed.get("players") or [], resolved_name)
        if not player:
            # CREX can finish the playing-XI tab after the first DOM snapshot.
            # Retry the same provider page once before returning a false 404 to
            # the scorecard click path.
            logger.warning("Player link not found on first seed pass; retrying %s", resolved_name)
            async with scraper_service.pool.get_context() as context:
                seed = await adapter.fetch_player_stats_seed(context, get_crex_details_url(canonical_match_url))
            player = select_player_reference(seed.get("players") or [], resolved_name)
        if not player:
            return {
                "externalId": None,
                "fetched": False,
                "playerName": resolved_name,
                "reason": "provider_player_link_not_found",
            }
        player_url = str(player.get("player_url") or "").strip()
        normalized_id = crawler._extract_external_id(player_url, "player", resolved_name).lower()
        resolved_name = str(player.get("player_name") or resolved_name).strip()

    if resolve_only:
        await _queue_player_profile_hydration(
            external_id=normalized_id,
            match_url=match_url,
            player_name=resolved_name,
            role=role,
        )
        return {
            "externalId": normalized_id,
            "fetched": False,
            "queued": True,
            "playerName": resolved_name,
        }

    task = PlayerStatsTask(
        priority=0,
        match_id="demand:" + normalized_id,
        match_url=player_url,
        task_type="PLAYER_REFERENCE",
        metadata={
            "onDemand": True,
            "sourceMatchUrl": match_url,
            "player": {"externalId": normalized_id, "name": resolved_name, "role": role},
        },
    )
    await crawler._process_player_reference_task(task)
    persisted = await asyncio.to_thread(
        CricketDataService.get_player_stats_player,
        normalized_id,
        scraper_service._auth_token,
    )
    has_profile = any(
        isinstance(snapshot, dict) and str(snapshot.get("category") or "").lower() == "player_profile"
        for snapshot in (persisted or {}).get("stats") or []
    )
    return {"externalId": normalized_id, "fetched": has_profile, "playerName": resolved_name}


async def _queue_player_profile_hydration(
    external_id: str,
    match_url: Optional[str] = None,
    player_name: Optional[str] = None,
    role: Optional[str] = None,
) -> bool:
    """Run one verified profile hydration in the scraper loop's background.

    This function is always executed on ``scraper_loop``.  Keeping task
    creation inside that loop is important because Flask handles requests on
    another thread and ``asyncio.create_task`` there would have no running
    event loop.
    """
    key = str(external_id or "").strip().lower()
    if not key or scraper_loop is None or scraper_loop.is_closed():
        return False

    existing = player_hydration_tasks.get(key)
    if existing is not None and not existing.done():
        return True

    task = asyncio.create_task(_hydrate_player_profile(
        external_id=key,
        match_url=match_url,
        player_name=player_name,
        role=role,
    ))
    player_hydration_tasks[key] = task

    def _finish(completed: asyncio.Task) -> None:
        if player_hydration_tasks.get(key) is completed:
            player_hydration_tasks.pop(key, None)
        try:
            result = completed.result()
            if not result.get("fetched"):
                logger.warning("player_profile.background_unavailable", extra={"external_id": key})
        except asyncio.CancelledError:
            logger.info("player_profile.background_cancelled", extra={"external_id": key})
        except Exception as exc:
            logger.error("player_profile.background_failed", extra={"external_id": key, "error": str(exc)}, exc_info=True)

    task.add_done_callback(_finish)
    return True

def start_scraper_background():
    """Start the scraper service in a background thread."""
    global scraper_loop
    scraper_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(scraper_loop)
    
    try:
        scraper_loop.run_until_complete(scraper_service.start())
        # Keep the loop running for background tasks
        scraper_loop.run_forever()
    except Exception as e:
        logger.error(f"Scraper background loop failed: {e}")
    finally:
        scraper_loop.close()

@app.route("/health")
@app.route("/status")
def health_check():
    """
    Return service health status without mutating process lifecycle.
    """
    summary = scraper_service.health.get_summary()
    restart_condition = scraper_service.get_restart_condition(summary)
    restart_recommended = restart_condition is not None
    restart_scheduled = getattr(scraper_service, "_container_restart_scheduled", False) is True

    status_code = 503 if restart_recommended else 200

    fast_updates: Dict[str, Any]
    try:
        fast_updates = scraper_service.get_fast_update_status()
    except Exception as exc:
        logger.error("Failed to build fast update status: %s", exc, exc_info=True)
        fast_updates = {
            "enabled": False,
            "error": str(exc),
        }

    return jsonify({
        "status": "success",
        "data": {
            "state": summary.state,
            "score": summary.score,
            "uptime": summary.uptime_seconds,
            "pids": summary.pids_count,
            "memory_mb": summary.memory_usage_mb,
            "last_scrape": summary.last_scrape_timestamp,
            "active_matches": summary.active_matches,
            "details": summary.details,
            "restart_recommended": restart_recommended,
            "restart_scheduled": restart_scheduled,
            "restart_reason": restart_condition["reason"] if restart_condition else None,
            "restart_metadata": restart_condition["metadata"] if restart_condition else None,
            "fast_updates": fast_updates,
        }
    }), status_code

@app.route("/prediction-candidates")
def prediction_candidates():
    """Expose the scraper's selected live slate to the model scheduler."""
    discovery_slate = getattr(scraper_service, "_discovery_live_urls", None)
    discovery_matches = getattr(scraper_service, "_discovery_live_matches", None)
    if discovery_slate is not None:
        urls = list(discovery_slate or [])
        source = "scraper:discovery"
        candidate_matches = list(discovery_matches or [])
        if not candidate_matches:
            candidate_matches = [{"url": url} for url in urls]
    else:
        urls = list(getattr(scraper_service, "_last_managed_live_urls", []) or [])
        source = "scraper:selected"
        candidate_matches = [{"url": url} for url in urls]

    # The scraper lifecycle and Flask endpoint may run in different workers,
    # so older service instances may not expose the discovery field. Only that
    # legacy shape may fall back to the backend catalog; an empty discovery
    # result is authoritative and must not resurrect stale rows.
    if discovery_slate is None and not urls:
        try:
            token = scraper_service._auth_token or CricketDataService.get_bearer_token()
            matches = CricketDataService.get_live_matches(token)
            selected_matches = select_live_matches(matches, settings.max_live_matches)
            urls = scraper_service._extract_live_urls(selected_matches)
            source = "backend:fallback"
            candidate_matches = selected_matches
        except Exception as exc:
            logger.warning("prediction_candidates.fallback_error", extra={"error": str(exc)})

    # Discovery owns the bounded live URL slate, but its schedule page can
    # occasionally omit the full provider names. Enrich only those candidates
    # from the current backend live catalogue; never replace the discovery
    # slate or use URL abbreviations as identity.
    missing_provider_names = any(
        not (
            (match.get("team1Name") or match.get("team1_name"))
            and (match.get("team2Name") or match.get("team2_name"))
        )
        for match in candidate_matches
    )
    if missing_provider_names and candidate_matches:
        try:
            token = scraper_service._auth_token or CricketDataService.get_bearer_token()
            backend_matches = CricketDataService.get_live_matches(token)
            backend_by_url = {
                normalize_crex_url(str(match.get("url") or match.get("matchUrl") or "")): match
                for match in (backend_matches or [])
                if isinstance(match, dict)
                and normalize_crex_url(str(match.get("url") or match.get("matchUrl") or ""))
            }
            enriched_matches = []
            for match in candidate_matches:
                enriched = dict(match)
                source_match = backend_by_url.get(
                    normalize_crex_url(str(match.get("url") or match.get("matchUrl") or ""))
                )
                if source_match:
                    for key in ("team1Name", "team1_name", "team2Name", "team2_name", "matchFormat", "match_format"):
                        if not enriched.get(key) and source_match.get(key):
                            enriched[key] = source_match[key]
                enriched_matches.append(enriched)
            candidate_matches = enriched_matches
        except Exception as exc:
            logger.warning("prediction_candidates.identity_enrichment_error", extra={"error": str(exc)})

    payload = []
    for match in candidate_matches:
        url = match.get("url") or match.get("matchUrl") or match.get("match_url")
        if not url:
            continue
        team1 = str(match.get("team1Name") or match.get("team1_name") or "").strip()
        team2 = str(match.get("team2Name") or match.get("team2_name") or "").strip()
        label = " vs ".join(team for team in (team1, team2) if team)
        payload.append({
            "url": url,
            "is_live": True,
            "source": source,
            "label": label,
            "scheduled_start_time": match.get("scheduledStartTime") or match.get("scheduled_start_time"),
            "match_format": match.get("matchFormat") or match.get("match_format") or match.get("format"),
            "team1_name": team1 or None,
            "team2_name": team2 or None,
        })

    return jsonify({
        "status": "success",
        "matches": payload,
        "count": len(payload),
    })


@app.route("/prematch-candidates")
def prematch_candidates():
    """Expose a bounded, non-live fixture slate for the opening model only."""
    try:
        token = scraper_service._auth_token or CricketDataService.get_bearer_token()
        matches = CricketDataService.get_upcoming_matches(token)
        selected = select_prematch_candidates(matches, now=time.time())
    except Exception as exc:
        logger.warning("prematch_candidates.error", extra={"error": str(exc)})
        selected = []

    payload = []
    for match in selected:
        team1 = str(match.get("team1Name") or match.get("team1_name") or "").strip()
        team2 = str(match.get("team2Name") or match.get("team2_name") or "").strip()
        label = " vs ".join(team for team in (team1, team2) if team)
        payload.append({
            "url": match.get("url") or match.get("matchUrl") or match.get("match_url"),
            "is_live": False,
            "source": "backend:upcoming",
            "scheduled_start_time": match.get("scheduledStartTime") or match.get("scheduled_start_time"),
            "match_format": match.get("matchFormat") or match.get("match_format") or match.get("format"),
            "team1_name": team1 or None,
            "team2_name": team2 or None,
            "label": label,
        })

    return jsonify({"status": "success", "matches": payload, "count": len(payload)})

@app.route("/metrics")
def metrics():
    """
    Expose Prometheus metrics.
    """
    return Response(generate_latest(scraper_service.metrics.registry), mimetype=CONTENT_TYPE_LATEST)

@app.route("/recycle", methods=["POST"])
def manual_recycle():
    """
    Trigger manual browser recycle.
    """
    if scraper_loop is None or scraper_loop.is_closed() or not scraper_service._running:
        return jsonify({"status": "error", "message": "scraper service is not ready"}), 503

    try:
        future = asyncio.run_coroutine_threadsafe(
            scraper_service.recycle_browser_pool("manual_recycle"),
            scraper_loop,
        )
        future.result(timeout=45)
        return jsonify({"status": "success", "message": "Browser recycle completed"}), 202
    except FutureTimeoutError:
        logger.error("Manual recycle timed out")
        return jsonify({"status": "error", "message": "manual recycle timed out"}), 504
    except Exception as exc:
        logger.error("Manual recycle failed: %s", exc, exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/hydrate-match-details", methods=["POST"])
def hydrate_match_details():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"status": "error", "message": "url is required"}), 400

    if scraper_loop is None or scraper_loop.is_closed() or not scraper_service._running:
        return jsonify({"status": "error", "message": "scraper service is not ready"}), 503

    try:
        future = asyncio.run_coroutine_threadsafe(_hydrate_match_details(url), scraper_loop)
        result = future.result(timeout=90)
        status_code = 200 if result.get("success") else 502
        return jsonify({"status": "success" if result.get("success") else "partial", "data": result}), status_code
    except FutureTimeoutError:
        logger.error("Hydration timed out for %s", url)
        return jsonify({"status": "error", "message": "hydration timed out"}), 504
    except Exception as exc:
        logger.error("Hydration failed for %s: %s", url, exc, exc_info=True)
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/hydrate-player-profile", methods=["POST"])
def hydrate_player_profile():
    payload = request.get_json(silent=True) or {}
    external_id = payload.get("externalId")
    match_url = payload.get("matchUrl")
    player_name = payload.get("playerName")
    resolve_only = str(payload.get("resolveOnly") or "").lower() == "true"
    queue_only = str(payload.get("queueOnly") or "").lower() == "true"
    if not external_id and not (match_url and player_name):
        return jsonify({"status": "error", "message": "externalId or matchUrl and playerName are required"}), 400
    if scraper_loop is None or scraper_loop.is_closed() or not scraper_service._running:
        return jsonify({"status": "error", "message": "scraper service is not ready"}), 503
    try:
        if queue_only:
            normalized_id = str(external_id or "").strip().lower()
            if not re.match(r"^player:[a-z0-9][a-z0-9-]*$", normalized_id):
                return jsonify({"status": "error", "message": "externalId must be a CREX player identifier"}), 400
            queue_future = asyncio.run_coroutine_threadsafe(
                _queue_player_profile_hydration(external_id=normalized_id),
                scraper_loop,
            )
            queued = queue_future.result(timeout=5)
            return jsonify({
                "status": "accepted" if queued else "unavailable",
                "data": {"externalId": normalized_id, "queued": queued, "fetched": False},
            }), 200 if queued else 503

        future = asyncio.run_coroutine_threadsafe(
            _hydrate_player_profile(
                external_id=external_id,
                match_url=match_url,
                player_name=player_name,
                role=payload.get("role"),
                resolve_only=resolve_only,
            ),
            scraper_loop,
        )
        # Resolving a match name still needs a browser pass, but it must not
        # hold the request open for the subsequent player-page crawl.
        result = future.result(timeout=60 if not resolve_only else 45)
        if resolve_only and result.get("externalId"):
            return jsonify({"status": "accepted", "data": result}), 200
        if result.get("fetched"):
            return jsonify({"status": "success", "data": result})
        return jsonify({"status": "unavailable", "data": result}), 404
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except FutureTimeoutError:
        return jsonify({"status": "error", "message": "player profile hydration timed out"}), 504
    except Exception as exc:
        logger.error("Player profile hydration failed for %s: %s", external_id, exc, exc_info=True)
        return jsonify({"status": "error", "message": "player profile hydration failed"}), 502

# Start scraper on app startup (if not running in a separate worker process manager that handles this)
# For simple deployment, we start it here.
threading.Thread(target=start_scraper_background, daemon=True).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
