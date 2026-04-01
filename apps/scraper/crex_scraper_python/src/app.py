"""
Flask Application Entry Point.
Exposes API endpoints and manages scraper lifecycle.
"""

import asyncio
import logging
import threading
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
    Return service health status.
    """
    summary = scraper_service.health.get_summary()
    return jsonify({
        "status": "success",
        "data": {
            "state": summary.state,
            "score": summary.score,
            "uptime": summary.uptime_seconds,
            "pids": summary.pids_count,
            "memory_mb": summary.memory_usage_mb,
            "last_scrape": summary.last_scrape_timestamp,
            "details": summary.details
        }
    })

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
    # Stub for now, will implement full logic later
    return jsonify({"status": "success", "message": "Recycle triggered (stub)"})


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

# Start scraper on app startup (if not running in a separate worker process manager that handles this)
# For simple deployment, we start it here.
threading.Thread(target=start_scraper_background, daemon=True).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
