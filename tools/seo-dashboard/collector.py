import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote

import google.auth.transport.requests
import requests
from google.oauth2 import service_account


GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GSC_API_ROOT = "https://searchconsole.googleapis.com/webmasters/v3/sites"
INSPECTION_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
DEFAULT_BASE_URL = "https://www.crickzen.com"
HUB_PATHS = (
    "/live-cricket-score",
    "/live-score",
    "/live-score/today",
    "/live-score/ipl",
    "/cricket-schedule/today",
    "/cricket-schedule/ipl-2026",
    "/live-score/archive",
)


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _request_json(url: str, timeout: int = 30) -> Any:
    response = requests.get(
        url,
        headers={"User-Agent": "CrickzenSeoDashboard/1.0", "Cache-Control": "no-cache"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def _request_text(url: str, timeout: int = 45) -> str:
    response = requests.get(
        url,
        headers={"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.text


def canonical_match_url(match: Dict[str, Any], base_url: str) -> str:
    slug = match.get("externalMatchKey")
    if not slug:
        source_url = str(match.get("url") or "").rstrip("/")
        slug = source_url.split("/")[-1]
    return f"{base_url}/cric-live/{slug}" if slug else ""


def find_discovery_hubs(
    canonical_url: str, base_url: str, hub_html: Dict[str, str]
) -> List[str]:
    canonical_path = canonical_url.replace(base_url, "", 1)
    return [
        path
        for path, html in hub_html.items()
        if canonical_url in html or canonical_path in html
    ]


def parse_html_proof(html: str, expected_url: str) -> Dict[str, Any]:
    canonical_match = re.search(
        r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)",
        html,
        flags=re.IGNORECASE,
    )
    robots_match = re.search(
        r"<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"']([^\"']+)",
        html,
        flags=re.IGNORECASE,
    )
    canonical = canonical_match.group(1) if canonical_match else ""
    robots = robots_match.group(1) if robots_match else ""
    return {
        "h1Count": len(re.findall(r"<h1\b", html, flags=re.IGNORECASE)),
        "canonical": canonical,
        "canonicalMatches": canonical.rstrip("/") == expected_url.rstrip("/"),
        "robots": robots,
        "noindex": "noindex" in robots.lower(),
        "cricLiveLinks": len(
            re.findall(r'href=["\']/cric-live/', html, flags=re.IGNORECASE)
        ),
        "faqPresent": bool(re.search(r"\bfaq\b|frequently asked", html, re.IGNORECASE)),
    }


def normalize_serpbear(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, dict):
        rows = payload.get("keywords") or payload.get("data") or payload.get("rows") or []
    else:
        rows = payload if isinstance(payload, list) else []

    normalized = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        keyword = row.get("keyword") or row.get("name") or row.get("term")
        if not keyword:
            continue
        position = row.get("position")
        if position is None:
            position = row.get("rank")
        previous = row.get("previousPosition")
        if previous is None:
            previous = row.get("previous_position")
        normalized.append(
            {
                "keyword": str(keyword),
                "position": _number(position, 0),
                "previousPosition": _number(previous, 0),
                "url": row.get("url") or row.get("rankingUrl") or "",
                "updatedAt": row.get("updatedAt") or row.get("lastUpdated") or "",
            }
        )
    return normalized


class GscClient:
    def __init__(self, credentials_path: str, site_url: str):
        credential_info = json.loads(
            Path(credentials_path).read_text(encoding="utf-8-sig")
        )
        credentials = service_account.Credentials.from_service_account_info(
            credential_info, scopes=[GSC_SCOPE]
        )
        credentials.refresh(google.auth.transport.requests.Request())
        self.token = credentials.token
        self.site_url = site_url

    def query(
        self,
        start_date: str,
        end_date: str,
        dimensions: Optional[List[str]] = None,
        row_limit: int = 1000,
        page_contains: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        body: Dict[str, Any] = {
            "startDate": start_date,
            "endDate": end_date,
            "rowLimit": row_limit,
            "dataState": "all",
        }
        if dimensions:
            body["dimensions"] = dimensions
        if page_contains:
            body["dimensionFilterGroups"] = [
                {
                    "filters": [
                        {
                            "dimension": "page",
                            "operator": "contains",
                            "expression": page_contains,
                        }
                    ]
                }
            ]
        response = requests.post(
            f"{GSC_API_ROOT}/{quote(self.site_url, safe='')}/searchAnalytics/query",
            headers={"Authorization": f"Bearer {self.token}"},
            json=body,
            timeout=60,
        )
        response.raise_for_status()
        return response.json().get("rows", [])

    def inspect(self, inspection_url: str) -> Dict[str, Any]:
        response = requests.post(
            INSPECTION_URL,
            headers={"Authorization": f"Bearer {self.token}"},
            json={"inspectionUrl": inspection_url, "siteUrl": self.site_url},
            timeout=60,
        )
        response.raise_for_status()
        result = response.json().get("inspectionResult", {})
        return result.get("indexStatusResult", {})


def summarize(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    rows = list(rows)
    clicks = sum(_number(row.get("clicks")) for row in rows)
    impressions = sum(_number(row.get("impressions")) for row in rows)
    weighted_position = sum(
        _number(row.get("position")) * _number(row.get("impressions")) for row in rows
    )
    return {
        "clicks": round(clicks, 2),
        "impressions": round(impressions, 2),
        "ctr": round(clicks / impressions, 4) if impressions else 0,
        "position": round(weighted_position / impressions, 2) if impressions else 0,
    }


def _comparison(current: Dict[str, Any], previous: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(current)
    result["previous"] = previous
    result["delta"] = {
        key: round(_number(current.get(key)) - _number(previous.get(key)), 4)
        for key in ("clicks", "impressions", "ctr", "position")
    }
    return result


def _load_serpbear() -> Dict[str, Any]:
    export_path = os.getenv("SERPBEAR_EXPORT_PATH", "").strip()
    if not export_path:
        return {"configured": False, "keywords": [], "message": "Not configured"}
    path = Path(export_path)
    if not path.exists():
        return {
            "configured": True,
            "keywords": [],
            "message": f"Export not found: {path}",
        }
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        keywords = normalize_serpbear(payload)
        return {
            "configured": True,
            "keywords": keywords,
            "message": f"Loaded {len(keywords)} keywords",
            "path": str(path),
        }
    except Exception as error:
        return {"configured": True, "keywords": [], "message": str(error)}


def collect_dashboard_data() -> Dict[str, Any]:
    base_url = os.getenv("SEO_DASHBOARD_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    site_url = os.getenv("GSC_SITE_URL", f"{base_url}/")
    credentials_path = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        str(Path(__file__).resolve().parents[2] / "gsc-service-account.json"),
    )
    days = max(7, int(os.getenv("SEO_DASHBOARD_DAYS", "14")))
    inspection_limit = max(0, int(os.getenv("SEO_DASHBOARD_INSPECT_LIMIT", "5")))
    end = date.today() - timedelta(days=2)
    start = end - timedelta(days=days - 1)
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)

    data: Dict[str, Any] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dateRange": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days": days,
        },
        "sources": {},
        "summary": {},
        "trend": [],
        "topPages": [],
        "topQueries": [],
        "hubPerformance": [],
        "hubHealth": [],
        "liveMatches": [],
        "serpbear": _load_serpbear(),
    }

    try:
        indexing = _request_json(f"{base_url}/api/v1/seo/indexing/status")
        data["sources"]["indexing"] = {"ok": True, **indexing}
    except Exception as error:
        data["sources"]["indexing"] = {"ok": False, "error": str(error)}

    sitemap_urls = set()
    sitemap_text = ""
    try:
        sitemap_text = _request_text(f"{base_url}/sitemaps/sitemap-matches-0001.xml")
        sitemap_urls = set(re.findall(r"<loc>([^<]+)</loc>", sitemap_text))
        data["sources"]["sitemap"] = {
            "ok": True,
            "urlCount": len(sitemap_urls),
            "matchUrlCount": sum("/cric-live/" in url for url in sitemap_urls),
        }
    except Exception as error:
        data["sources"]["sitemap"] = {"ok": False, "error": str(error)}

    hub_html: Dict[str, str] = {}
    for path in HUB_PATHS:
        url = f"{base_url}{path}"
        try:
            html = _request_text(url)
            hub_html[path] = html
            proof = parse_html_proof(html, url)
            data["hubHealth"].append({"path": path, "status": 200, **proof})
        except Exception as error:
            data["hubHealth"].append({"path": path, "status": 0, "error": str(error)})

    live_matches: List[Dict[str, Any]] = []
    try:
        payload = _request_json(f"{base_url}/api/cricket-data/live-matches?_ts=seo-dashboard")
        live_matches = payload if isinstance(payload, list) else []
        data["sources"]["liveFeed"] = {"ok": True, "count": len(live_matches)}
    except Exception as error:
        data["sources"]["liveFeed"] = {"ok": False, "count": 0, "error": str(error)}

    gsc: Optional[GscClient] = None
    page_rows: List[Dict[str, Any]] = []
    try:
        gsc = GscClient(credentials_path, site_url)
        current_rows = gsc.query(
            start.isoformat(), end.isoformat(), page_contains="/cric-live/"
        )
        previous_rows = gsc.query(
            previous_start.isoformat(),
            previous_end.isoformat(),
            page_contains="/cric-live/",
        )
        date_rows = gsc.query(
            start.isoformat(),
            end.isoformat(),
            dimensions=["date"],
            page_contains="/cric-live/",
        )
        page_rows = gsc.query(
            start.isoformat(),
            end.isoformat(),
            dimensions=["page"],
            row_limit=500,
            page_contains="/cric-live/",
        )
        query_rows = gsc.query(
            start.isoformat(),
            end.isoformat(),
            dimensions=["query"],
            row_limit=500,
            page_contains="/cric-live/",
        )
        hub_rows = gsc.query(
            start.isoformat(), end.isoformat(), dimensions=["page"], row_limit=500
        )
        data["summary"] = _comparison(
            summarize(current_rows), summarize(previous_rows)
        )
        data["trend"] = [
            {
                "date": row.get("keys", [""])[0],
                "clicks": _number(row.get("clicks")),
                "impressions": _number(row.get("impressions")),
                "ctr": _number(row.get("ctr")),
                "position": _number(row.get("position")),
            }
            for row in date_rows
        ]
        data["topPages"] = [
            {
                "url": row.get("keys", [""])[0],
                "clicks": _number(row.get("clicks")),
                "impressions": _number(row.get("impressions")),
                "ctr": _number(row.get("ctr")),
                "position": _number(row.get("position")),
            }
            for row in sorted(
                page_rows, key=lambda row: _number(row.get("impressions")), reverse=True
            )[:20]
        ]
        data["topQueries"] = [
            {
                "query": row.get("keys", [""])[0],
                "clicks": _number(row.get("clicks")),
                "impressions": _number(row.get("impressions")),
                "ctr": _number(row.get("ctr")),
                "position": _number(row.get("position")),
            }
            for row in sorted(
                query_rows,
                key=lambda row: _number(row.get("impressions")),
                reverse=True,
            )[:20]
        ]
        data["hubPerformance"] = [
            {
                "url": row.get("keys", [""])[0],
                "clicks": _number(row.get("clicks")),
                "impressions": _number(row.get("impressions")),
                "ctr": _number(row.get("ctr")),
                "position": _number(row.get("position")),
            }
            for row in hub_rows
            if any(row.get("keys", [""])[0].rstrip("/").endswith(path) for path in HUB_PATHS)
        ]
        data["sources"]["gsc"] = {"ok": True, "siteUrl": site_url}
    except Exception as error:
        data["sources"]["gsc"] = {"ok": False, "error": str(error)}

    page_metrics = {
        row.get("keys", [""])[0]: row
        for row in page_rows
        if row.get("keys")
    }
    for index, match in enumerate(live_matches):
        canonical_url = canonical_match_url(match, base_url)
        metrics = page_metrics.get(canonical_url, {})
        discovery_hubs = find_discovery_hubs(canonical_url, base_url, hub_html)
        row: Dict[str, Any] = {
            "slug": canonical_url.split("/")[-1] if canonical_url else "",
            "url": canonical_url,
            "status": match.get("status") or "LIVE",
            "inSitemap": canonical_url in sitemap_urls,
            "discoveryHubCount": len(discovery_hubs),
            "discoveryHubs": discovery_hubs,
            "clicks": _number(metrics.get("clicks")),
            "impressions": _number(metrics.get("impressions")),
            "ctr": _number(metrics.get("ctr")),
            "position": _number(metrics.get("position")),
        }
        try:
            html = _request_text(canonical_url)
            row["html"] = {"status": 200, **parse_html_proof(html, canonical_url)}
        except Exception as error:
            row["html"] = {"status": 0, "error": str(error)}

        if gsc and index < inspection_limit:
            try:
                inspection = gsc.inspect(canonical_url)
                row["inspection"] = {
                    "verdict": inspection.get("verdict", ""),
                    "coverageState": inspection.get("coverageState", ""),
                    "indexingState": inspection.get("indexingState", ""),
                    "robotsTxtState": inspection.get("robotsTxtState", ""),
                    "googleCanonical": inspection.get("googleCanonical", ""),
                    "userCanonical": inspection.get("userCanonical", ""),
                    "lastCrawlTime": inspection.get("lastCrawlTime", ""),
                }
            except Exception as error:
                row["inspection"] = {"error": str(error)}
        data["liveMatches"].append(row)

    return data
