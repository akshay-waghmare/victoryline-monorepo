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
)
from .cricket_data_service import CricketDataService
from .player_stats_crawler import PlayerStatsCrawlerService, PlayerStatsTask
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


async def _hydrate_player_profile(external_id: str) -> Dict[str, Any]:
    """Fetch a CREX player page on demand and persist it before responding."""
    normalized_id = str(external_id or "").strip().lower()
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
    task = PlayerStatsTask(
        priority=0,
        match_id="demand:" + normalized_id,
        match_url=player_url,
        task_type="PLAYER_REFERENCE",
        metadata={
            "onDemand": True,
            "player": {"externalId": normalized_id, "name": slug.replace("-", " ")},
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
    return {"externalId": normalized_id, "fetched": has_profile}

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
    urls = list(getattr(scraper_service, "_last_managed_live_urls", []) or [])
    source = "scraper:selected"

    # The scraper lifecycle and Flask endpoint may run in different workers,
    # so the in-memory slate is not guaranteed to be visible here. Rehydrate
    # it from the backend catalog rather than returning a false empty slate.
    if not urls:
        try:
            token = scraper_service._auth_token or CricketDataService.get_bearer_token()
            matches = CricketDataService.get_live_matches(token)
            selected_matches = select_live_matches(matches, settings.max_live_matches)
            urls = scraper_service._extract_live_urls(selected_matches)
            source = "backend:fallback"
        except Exception as exc:
            logger.warning("prediction_candidates.fallback_error", extra={"error": str(exc)})

    return jsonify({
        "status": "success",
        "matches": [{"url": url, "is_live": True, "source": source} for url in urls],
        "count": len(urls),
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
    if not external_id:
        return jsonify({"status": "error", "message": "externalId is required"}), 400
    if scraper_loop is None or scraper_loop.is_closed() or not scraper_service._running:
        return jsonify({"status": "error", "message": "scraper service is not ready"}), 503
    try:
        future = asyncio.run_coroutine_threadsafe(_hydrate_player_profile(external_id), scraper_loop)
        result = future.result(timeout=60)
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
