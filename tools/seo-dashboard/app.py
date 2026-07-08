import json
import os
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Flask, jsonify, render_template, request

from collector import collect_dashboard_data


app = Flask(__name__)
STATE_DIR = Path(__file__).resolve().parent / "state"
SNAPSHOT_PATH = STATE_DIR / "dashboard-cache.json"
REPO_ROOT = Path(__file__).resolve().parents[2]
COMPETITOR_SCRIPT_PATH = REPO_ROOT / "tools" / "competitor-keyword-discovery" / "competitor_keyword_discovery.py"
COMPETITOR_OUTPUT_DIR = REPO_ROOT / "artifacts" / "competitor-keyword-discovery"
COMPETITOR_OUTPUT_PATH = COMPETITOR_OUTPUT_DIR / "competitor-keywords.json"
cache: Dict[str, Any] = {"data": None, "created": 0.0}
cache_lock = threading.Lock()
refresh_state: Dict[str, Any] = {
    "running": False,
    "started": 0.0,
    "finished": 0.0,
    "error": "",
}
competitor_state: Dict[str, Any] = {
    "running": False,
    "started": 0.0,
    "finished": 0.0,
    "error": "",
    "lastOutputPath": str(COMPETITOR_OUTPUT_PATH),
}


def _load_snapshot_cache() -> None:
    if not SNAPSHOT_PATH.exists():
        return
    try:
        payload = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return
    data = payload.get("data")
    created = float(payload.get("created") or 0.0)
    if not isinstance(data, dict):
        return
    with cache_lock:
        cache["data"] = data
        cache["created"] = created or time.time()


def _save_snapshot_cache(data: Dict[str, Any]) -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "created": time.time(),
            "data": data,
        }
        SNAPSHOT_PATH.write_text(
            json.dumps(payload, indent=2, sort_keys=True),
            encoding="utf-8",
        )
    except OSError:
        return


def _placeholder_payload() -> Dict[str, Any]:
    return {
        "generatedAt": "",
        "dateRange": {"start": "", "end": "", "days": 0},
        "sampleWindow": {},
        "sources": {},
        "summary": {},
        "bucketCounts": {},
        "trend": [],
        "topPages": [],
        "topQueries": [],
        "hubPerformance": [],
        "hubHealth": [],
        "liveMatches": [],
        "upcomingMatches": [],
        "recentMatches": [],
        "freshnessPages": [],
        "manualSubmissionQueue": [],
        "operatorActionSummary": {},
        "serpbear": {"configured": False, "keywords": []},
        "competitorKeywords": _load_competitor_keywords(),
        "loading": True,
        "loadingMessage": "Collecting production and GSC signals in the background.",
    }


def _load_competitor_keywords() -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "available": COMPETITOR_SCRIPT_PATH.exists(),
        "configured": COMPETITOR_OUTPUT_PATH.exists(),
        "running": False,
        "error": "",
        "generatedAt": "",
        "outputPath": str(COMPETITOR_OUTPUT_PATH),
        "competitors": [],
    }
    with cache_lock:
        payload["running"] = bool(competitor_state["running"])
        payload["error"] = str(competitor_state["error"] or "")

    if COMPETITOR_OUTPUT_PATH.exists():
        try:
            raw = json.loads(COMPETITOR_OUTPUT_PATH.read_text(encoding="utf-8"))
            payload["configured"] = True
            payload["generatedAt"] = time.strftime(
                "%Y-%m-%dT%H:%M:%S%z",
                time.localtime(COMPETITOR_OUTPUT_PATH.stat().st_mtime),
            )
            payload["competitors"] = raw if isinstance(raw, list) else []
        except Exception as error:
            payload["error"] = str(error)
    return payload


def _run_competitor_keyword_discovery() -> None:
    with cache_lock:
        if competitor_state["running"]:
            return
        competitor_state["running"] = True
        competitor_state["started"] = time.time()
        competitor_state["error"] = ""
    try:
        COMPETITOR_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "python",
                str(COMPETITOR_SCRIPT_PATH),
                "--google-suggest",
                "--max-keywords",
                "25",
            ],
            cwd=str(REPO_ROOT),
            check=True,
            capture_output=True,
            text=True,
            timeout=240,
        )
    except Exception as error:
        with cache_lock:
            competitor_state["error"] = str(error)
    finally:
        with cache_lock:
            competitor_state["running"] = False
            competitor_state["finished"] = time.time()


def _ensure_competitor_refresh() -> bool:
    with cache_lock:
        already_running = bool(competitor_state["running"])
    if already_running:
        return False
    worker = threading.Thread(target=_run_competitor_keyword_discovery, daemon=True)
    worker.start()
    return True


def _refresh_cache(force_refresh: bool = False) -> None:
    with cache_lock:
        if refresh_state["running"]:
            return
        refresh_state["running"] = True
        refresh_state["started"] = time.time()
        refresh_state["error"] = ""
    try:
        data = collect_dashboard_data(force_refresh=force_refresh)
        created = time.time()
        _save_snapshot_cache(data)
        with cache_lock:
            cache["data"] = data
            cache["created"] = created
    except Exception as error:
        with cache_lock:
            refresh_state["error"] = str(error)
    finally:
        with cache_lock:
            refresh_state["running"] = False
            refresh_state["finished"] = time.time()


def _ensure_background_refresh(force_refresh: bool = False) -> None:
    with cache_lock:
        already_running = refresh_state["running"]
    if already_running:
        return
    worker = threading.Thread(
        target=_refresh_cache,
        kwargs={"force_refresh": force_refresh},
        daemon=True,
    )
    worker.start()


def get_dashboard_data(force: bool = False) -> Dict[str, Any]:
    ttl_seconds = max(60, int(os.getenv("SEO_DASHBOARD_CACHE_SECONDS", "1800")))
    should_refresh = False
    cached_data: Optional[Dict[str, Any]] = None
    cached_age = 0.0
    running = False
    error_message = ""
    with cache_lock:
        cached_data = dict(cache["data"]) if cache["data"] is not None else None
        cached_age = time.time() - cache["created"] if cache["created"] else 0.0
        running = bool(refresh_state["running"])
        error_message = str(refresh_state["error"] or "")

        if (
            cached_data is not None
            and not force
            and cached_age < ttl_seconds
            and not running
        ):
            return cached_data

        if force or cached_data is None or cached_age >= ttl_seconds:
            should_refresh = not running

    if should_refresh:
        _ensure_background_refresh(force_refresh=force)

    with cache_lock:
        cached_data = dict(cache["data"]) if cache["data"] is not None else None
        running = bool(refresh_state["running"])
        error_message = str(refresh_state["error"] or "")

    if cached_data is not None:
        cached_data["loading"] = running
        cached_data["loadingMessage"] = (
            "Refreshing production and GSC signals in the background."
            if running
            else error_message
        )
        return cached_data

    payload = _placeholder_payload()
    if error_message:
        payload["loadingMessage"] = error_message
    return payload


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "crickzen-seo-dashboard"})


@app.get("/api/dashboard")
def dashboard_api():
    force = request.args.get("refresh") == "1"
    payload = get_dashboard_data(force=force)
    payload["competitorKeywords"] = _load_competitor_keywords()
    return jsonify(payload)


@app.get("/api/manual-submission-queue")
def manual_submission_queue_api():
    force = request.args.get("refresh") == "1"
    data = get_dashboard_data(force=force)
    return jsonify(
        {
            "generatedAt": data.get("generatedAt"),
            "sampleWindow": data.get("sampleWindow"),
            "operatorActionSummary": data.get("operatorActionSummary"),
            "manualSubmissionQueue": data.get("manualSubmissionQueue"),
        }
    )


@app.get("/api/competitor-keywords")
def competitor_keywords_api():
    return jsonify(_load_competitor_keywords())


@app.post("/api/competitor-keywords/run")
def competitor_keywords_run_api():
    started = _ensure_competitor_refresh()
    payload = _load_competitor_keywords()
    return jsonify({"ok": True, "started": started, **payload})


if __name__ == "__main__":
    port = int(os.getenv("SEO_DASHBOARD_PORT", "8091"))
    _load_snapshot_cache()
    _ensure_background_refresh()
    app.run(host="127.0.0.1", port=port, debug=False)
