import os
import threading
import time
from typing import Any, Dict

from flask import Flask, jsonify, render_template, request

from collector import collect_dashboard_data


app = Flask(__name__)
cache: Dict[str, Any] = {"data": None, "created": 0.0}
cache_lock = threading.Lock()


def get_dashboard_data(force: bool = False) -> Dict[str, Any]:
    ttl_seconds = max(60, int(os.getenv("SEO_DASHBOARD_CACHE_SECONDS", "1800")))
    with cache_lock:
        if (
            not force
            and cache["data"] is not None
            and time.time() - cache["created"] < ttl_seconds
        ):
            return cache["data"]
        data = collect_dashboard_data()
        cache["data"] = data
        cache["created"] = time.time()
        return data


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "crickzen-seo-dashboard"})


@app.get("/api/dashboard")
def dashboard_api():
    force = request.args.get("refresh") == "1"
    return jsonify(get_dashboard_data(force=force))


if __name__ == "__main__":
    port = int(os.getenv("SEO_DASHBOARD_PORT", "8091"))
    app.run(host="127.0.0.1", port=port, debug=False)
