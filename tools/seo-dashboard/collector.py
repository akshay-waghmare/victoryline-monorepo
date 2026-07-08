import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import quote

import google.auth.transport.requests
import requests
from google.oauth2 import service_account


GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GSC_API_ROOT = "https://searchconsole.googleapis.com/webmasters/v3/sites"
INSPECTION_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
DEFAULT_BASE_URL = "https://www.crickzen.com"
DEFAULT_STATE_PATH = "tools/seo-dashboard/state/dashboard-history.json"
DISCOVERY_PATHS: Tuple[Tuple[str, str], ...] = (
    ("/", "homepage"),
    ("/matches", "matches"),
    ("/series", "series"),
    ("/live-cricket-score", "liveCricketScore"),
    ("/live-score", "liveScore"),
    ("/live-score/today", "liveScoreToday"),
    ("/cricket-schedule/today", "scheduleToday"),
)
HUB_PATHS = DISCOVERY_PATHS + (
    ("/live-score/ipl", "liveScoreIpl"),
    ("/cricket-schedule/ipl-2026", "scheduleIpl"),
    ("/live-score/archive", "archive"),
)


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _request_json(url: str, timeout: int = 15) -> Any:
    response = requests.get(
        url,
        headers={"User-Agent": "CrickzenSeoDashboard/1.0", "Cache-Control": "no-cache"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def _request_text(url: str, timeout: int = 15) -> str:
    response = requests.get(
        url,
        headers={"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.text


def _extract_sitemap_index_entries(xml: str) -> List[Dict[str, str]]:
    entries: List[Dict[str, str]] = []
    for block in re.findall(r"<sitemap>(.*?)</sitemap>", xml, flags=re.IGNORECASE | re.DOTALL):
        loc_match = re.search(r"<loc>([^<]+)</loc>", block, flags=re.IGNORECASE)
        if not loc_match:
            continue
        lastmod_match = re.search(r"<lastmod>([^<]+)</lastmod>", block, flags=re.IGNORECASE)
        entries.append(
            {
                "loc": loc_match.group(1).strip(),
                "lastmod": lastmod_match.group(1).strip() if lastmod_match else "",
            }
        )
    return entries


def _extract_sitemap_url_entries(xml: str) -> Dict[str, str]:
    entries: Dict[str, str] = {}
    for block in re.findall(r"<url>(.*?)</url>", xml, flags=re.IGNORECASE | re.DOTALL):
        loc_match = re.search(r"<loc>([^<]+)</loc>", block, flags=re.IGNORECASE)
        if not loc_match:
            continue
        lastmod_match = re.search(r"<lastmod>([^<]+)</lastmod>", block, flags=re.IGNORECASE)
        entries[loc_match.group(1).strip()] = (
            lastmod_match.group(1).strip() if lastmod_match else ""
        )
    return entries


def _load_match_sitemap_entries(base_url: str) -> Dict[str, Any]:
    index_text = _request_text(f"{base_url}/sitemap.xml")
    index_entries = _extract_sitemap_index_entries(index_text)
    match_partitions = [
        entry for entry in index_entries if "/sitemaps/sitemap-matches-" in entry.get("loc", "")
    ]
    url_entries: Dict[str, str] = {}
    for entry in match_partitions:
        partition_text = _request_text(entry["loc"])
        url_entries.update(_extract_sitemap_url_entries(partition_text))
    return {
        "indexEntries": index_entries,
        "matchPartitions": match_partitions,
        "urlEntries": url_entries,
    }


def _state_path() -> Path:
    configured = os.getenv("SEO_DASHBOARD_STATE_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[2] / DEFAULT_STATE_PATH


def _load_dashboard_state() -> Dict[str, Any]:
    path = _state_path()
    if not path.exists():
        return {"urls": {}}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"urls": {}}
    if not isinstance(payload, dict):
        return {"urls": {}}
    urls = payload.get("urls")
    if not isinstance(urls, dict):
        payload["urls"] = {}
    return payload


def _save_dashboard_state(state: Dict[str, Any]) -> None:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def canonical_match_url(match: Dict[str, Any], base_url: str) -> str:
    slug = match.get("externalMatchKey")
    if not slug:
        source_url = str(match.get("url") or "").rstrip("/")
        slug = source_url.split("/")[-1]
    return f"{base_url}/cric-live/{slug}" if slug else ""


def freshness_support_url(slug: str, page_type: str, base_url: str) -> str:
    clean_slug = str(slug or "").strip().strip("/")
    if not clean_slug:
        return ""
    if page_type == "preview":
        return f"{base_url}/cricket-match-preview/{clean_slug}"
    if page_type == "result":
        return f"{base_url}/cricket-match-report/{clean_slug}"
    return f"{base_url}/cricket-live-updates/{clean_slug}"


def primary_freshness_type(category: str) -> str:
    if category == "upcoming":
        return "preview"
    if category == "recent":
        return "result"
    return "live-updates"


def normalize_schedule_payload(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return [row for row in payload["data"] if isinstance(row, dict)]
    return []


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
    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    description_match = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)",
        html,
        flags=re.IGNORECASE,
    )
    canonical = canonical_match.group(1) if canonical_match else ""
    robots = robots_match.group(1) if robots_match else ""
    title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else ""
    description = description_match.group(1).strip() if description_match else ""
    return {
        "h1Count": len(re.findall(r"<h1\b", html, flags=re.IGNORECASE)),
        "canonical": canonical,
        "canonicalMatches": canonical.rstrip("/") == expected_url.rstrip("/"),
        "robots": robots,
        "noindex": "noindex" in robots.lower(),
        "title": title,
        "description": description,
        "cricLiveLinks": len(
            re.findall(r'href=["\']/cric-live/', html, flags=re.IGNORECASE)
        ),
        "faqPresent": bool(re.search(r"\bfaq\b|frequently asked", html, re.IGNORECASE)),
        "sportsEvent": bool(re.search(r"SportsEvent", html, re.IGNORECASE)),
        "newsArticle": bool(re.search(r"NewsArticle", html, re.IGNORECASE)),
        "liveBlogPosting": bool(re.search(r"LiveBlogPosting", html, re.IGNORECASE)),
        "publishedTimestamp": bool(
            re.search(r">\s*Published\s*<|published[\s:]+[A-Z][a-z]{2}", html, re.IGNORECASE)
        ),
        "updatedTimestamp": bool(
            re.search(r">\s*Updated\s*<|updated[\s:]+[A-Z][a-z]{2}", html, re.IGNORECASE)
        ),
        "keyEvents": bool(
            re.search(r"key events|key moments|match development summary", html, re.IGNORECASE)
        ),
        "keywordOwnership": bool(
            re.search(r"keyword ownership|intent lanes|preview lane|live updates lane|result and recap lane", html, re.IGNORECASE)
        ),
        "freshnessSupportLinks": len(
            re.findall(
                r'href=["\']/(cricket-match-preview|cricket-live-updates|cricket-match-report)/',
                html,
                flags=re.IGNORECASE,
            )
        ),
        "mentionsVenue": bool(re.search(r"\bvenue\b", html, re.IGNORECASE)),
        "mentionsToss": bool(re.search(r"\btoss\b", html, re.IGNORECASE)),
        "mentionsPlayingXI": bool(
            re.search(r"playing\s*XI|playing\s*11", html, re.IGNORECASE)
        ),
        "hasJsonLd": bool(re.search(r"application/ld\+json", html, re.IGNORECASE)),
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


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        timestamp = float(value)
        if timestamp > 10**12:
            timestamp = timestamp / 1000.0
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    raw = str(value).strip()
    if not raw:
        return None
    if raw.isdigit():
        return _parse_datetime(int(raw))
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _extract_match_start(match: Dict[str, Any]) -> Optional[datetime]:
    for key in (
        "scheduledStartTime",
        "startTime",
        "matchStartTime",
        "dateTime",
        "match_date",
        "startDate",
    ):
        parsed = _parse_datetime(match.get(key))
        if parsed:
            return parsed
    return None


def _render_start_local(start: Optional[datetime]) -> str:
    if not start:
        return ""
    return start.astimezone(timezone.utc).isoformat()


def _hours_until(start: Optional[datetime]) -> Optional[float]:
    if not start:
        return None
    return round((start - datetime.now(timezone.utc)).total_seconds() / 3600.0, 1)


def _format_timestamp(value: Any) -> str:
    parsed = _parse_datetime(value)
    return parsed.isoformat() if parsed else ""


def _hub_presence(canonical_url: str, base_url: str, hub_html: Dict[str, str]) -> Dict[str, bool]:
    canonical_path = canonical_url.replace(base_url, "", 1)
    presence: Dict[str, bool] = {}
    for path, alias in DISCOVERY_PATHS:
        html = hub_html.get(path, "")
        presence[alias] = canonical_url in html or canonical_path in html
    return presence


def _build_inspection_payload(inspection: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "verdict": inspection.get("verdict", ""),
        "coverageState": inspection.get("coverageState", ""),
        "indexingState": inspection.get("indexingState", ""),
        "robotsTxtState": inspection.get("robotsTxtState", ""),
        "googleCanonical": inspection.get("googleCanonical", ""),
        "userCanonical": inspection.get("userCanonical", ""),
        "lastCrawlTime": inspection.get("lastCrawlTime", ""),
    }


def _inspection_text(row: Dict[str, Any]) -> str:
    inspection = row.get("inspection") or {}
    return " ".join(
        str(inspection.get(key) or "")
        for key in ("verdict", "coverageState", "indexingState")
    ).lower()


def _is_indexed(row: Dict[str, Any]) -> bool:
    if _number(row.get("clicks")) > 0 or _number(row.get("impressions")) > 0:
        return True
    text = _inspection_text(row)
    return "indexed" in text and "not indexed" not in text and "unknown" not in text


def _google_buckets(row: Dict[str, Any]) -> Dict[str, bool]:
    indexed = _is_indexed(row)
    discovered = bool(row.get("inSitemap")) or int(row.get("discoveryHubCount") or 0) > 0
    has_impressions = _number(row.get("impressions")) > 0
    has_clicks = _number(row.get("clicks")) > 0
    inspection_text = _inspection_text(row)
    discovered_but_not_indexed = discovered and not indexed and (
        "not indexed" in inspection_text or "unknown" not in inspection_text
    )
    unknown_to_google = not indexed and not discovered_but_not_indexed and not has_impressions and not has_clicks
    return {
        "indexed": indexed,
        "hasImpressions": has_impressions,
        "hasClicks": has_clicks,
        "discoveredButNotIndexed": discovered_but_not_indexed,
        "unknownToGoogle": unknown_to_google,
    }


def _raw_html_health(row: Dict[str, Any]) -> str:
    html = row.get("html") or {}
    if html.get("status") != 200:
        return "missing"
    if not html.get("canonicalMatches") or html.get("noindex"):
        return "broken"
    if row.get("category") == "upcoming" and not html.get("sportsEvent"):
        return "thin"
    if html.get("h1Count", 0) < 1:
        return "thin"
    return "healthy"


def _freshness_html_health(row: Dict[str, Any]) -> str:
    html = row.get("html") or {}
    if html.get("status") != 200:
        return "missing"
    if not html.get("canonicalMatches") or html.get("noindex") or not html.get("hasJsonLd"):
        return "broken"
    if not html.get("publishedTimestamp") or not html.get("updatedTimestamp"):
        return "thin"
    if not html.get("keywordOwnership"):
        return "thin"
    if row.get("pageType") == "live-updates" and not (html.get("keyEvents") or html.get("liveBlogPosting")):
        return "thin"
    if row.get("pageType") != "preview" and not (html.get("newsArticle") or html.get("liveBlogPosting")):
        return "thin"
    return "healthy"


def _record_first_seen(history: Dict[str, Any], key: str, seen: bool, observed_at: str) -> None:
    if seen and observed_at and not history.get(key):
        history[key] = observed_at


def _apply_history(
    row: Dict[str, Any], state: Dict[str, Any], observed_at: str, in_feed: bool = True
) -> Dict[str, Any]:
    url = row.get("url") or ""
    state_urls = state.setdefault("urls", {})
    history = dict(state_urls.get(url) or {})
    history.setdefault("url", url)
    history.setdefault("slug", row.get("slug") or "")
    history.setdefault("category", row.get("category") or "")
    history.setdefault("firstSeenByMonitorAt", observed_at)
    _record_first_seen(history, "firstSeenInFeedAt", in_feed, observed_at)
    _record_first_seen(history, "firstSeenInSitemapAt", bool(row.get("inSitemap")), observed_at)
    _record_first_seen(history, "firstSeenInHubsAt", int(row.get("discoveryHubCount") or 0) > 0, observed_at)
    _record_first_seen(history, "firstSeenIndexedAt", bool(row.get("indexed")), observed_at)
    history["lastObservedAt"] = observed_at
    if row.get("sitemapLastmod") and not history.get("firstObservedSitemapLastmod"):
        history["firstObservedSitemapLastmod"] = row.get("sitemapLastmod")
    state_urls[url] = history
    row["history"] = history
    return row


def _score_manual_submission_candidate(row: Dict[str, Any]) -> Dict[str, Any]:
    reasons: List[str] = []
    score = 0
    action = "monitor"
    category = row.get("category")
    hours_until = row.get("hoursUntilMatch")
    if category != "upcoming":
        return {"priorityScore": 0, "recommendedAction": action, "queueReasons": reasons}

    if row.get("rawHtmlHealth") != "healthy":
        reasons.append("Fix the page before manual submission")
        return {
            "priorityScore": 0,
            "recommendedAction": "fix_product",
            "queueReasons": reasons,
        }

    if row.get("hasClicks") or row.get("hasImpressions") or row.get("indexed"):
        reasons.append("Already indexed or earning search demand")
        return {
            "priorityScore": 0,
            "recommendedAction": "monitor",
            "queueReasons": reasons,
        }

    if row.get("unknownToGoogle"):
        score += 55
        reasons.append("Still unknown to Google")
    elif row.get("discoveredButNotIndexed"):
        score += 35
        reasons.append("Discovered but not indexed yet")

    if row.get("inSitemap"):
        score += 10
        reasons.append("Already present in sitemap")
    else:
        reasons.append("Missing from sitemap evidence")

    if int(row.get("discoveryHubCount") or 0) > 0:
        score += 10
        reasons.append("Linked from SSR discovery hubs")
    else:
        reasons.append("Missing SSR hub support")

    if isinstance(hours_until, (int, float)):
        if 30 <= hours_until <= 120:
            score += 35
            reasons.append("Inside the target early-submission window (30-120 hours)")
        elif hours_until <= 6:
            score += 12
            reasons.append("Very late catch-up window under 6 hours")
        elif hours_until <= 12:
            score += 18
            reasons.append("Late catch-up window within 12 hours")
        elif hours_until <= 24:
            score += 24
            reasons.append("Catch-up window within 24 hours")
        elif hours_until <= 30:
            score += 28
            reasons.append("Inside the final pre-match catch-up window")
        else:
            score += 8
            reasons.append("Outside the preferred early window but still upcoming")
    else:
        reasons.append("No reliable start time in feed")

    if not row.get("inSitemap") and int(row.get("discoveryHubCount") or 0) == 0:
        action = "fix_product"
    elif score >= 55:
        action = "manual_submit"

    return {
        "priorityScore": score,
        "recommendedAction": action,
        "queueReasons": reasons,
    }


def _summarize_operator_actions(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    return {
        "manualSubmit": sum(1 for row in rows if row.get("recommendedAction") == "manual_submit"),
        "fixProduct": sum(1 for row in rows if row.get("recommendedAction") == "fix_product"),
        "monitor": sum(1 for row in rows if row.get("recommendedAction") == "monitor"),
    }


def _monitor_row(
    match: Dict[str, Any],
    category: str,
    base_url: str,
    sitemap_entries: Dict[str, str],
    hub_html: Dict[str, str],
    page_metrics: Dict[str, Dict[str, Any]],
    gsc: Optional[GscClient],
    should_inspect: bool,
) -> Dict[str, Any]:
    canonical_url = canonical_match_url(match, base_url)
    metrics = page_metrics.get(canonical_url, {})
    discovery_hubs = find_discovery_hubs(canonical_url, base_url, hub_html)
    start = _extract_match_start(match)
    presence = _hub_presence(canonical_url, base_url, hub_html)
    sitemap_lastmod = sitemap_entries.get(canonical_url, "")
    row: Dict[str, Any] = {
        "category": category,
        "slug": canonical_url.split("/")[-1] if canonical_url else "",
        "url": canonical_url,
        "status": match.get("status") or category.upper(),
        "startTime": _render_start_local(start),
        "hoursUntilMatch": _hours_until(start),
        "inSitemap": canonical_url in sitemap_entries,
        "sitemapLastmod": _format_timestamp(sitemap_lastmod),
        "discoveryHubCount": len(discovery_hubs),
        "discoveryHubs": discovery_hubs,
        "linkedFromHomepage": presence.get("homepage", False),
        "linkedFromMatches": presence.get("matches", False),
        "linkedFromSeries": presence.get("series", False),
        "linkedFromLiveCricketScore": presence.get("liveCricketScore", False),
        "linkedFromLiveScore": presence.get("liveScore", False),
        "linkedFromLiveScoreToday": presence.get("liveScoreToday", False),
        "linkedFromScheduleToday": presence.get("scheduleToday", False),
        "clicks": _number(metrics.get("clicks")),
        "impressions": _number(metrics.get("impressions")),
        "ctr": _number(metrics.get("ctr")),
        "position": _number(metrics.get("position")),
    }
    try:
        html = _request_text(canonical_url)
        row["html"] = {"status": 200, "_raw": html, **parse_html_proof(html, canonical_url)}
    except Exception as error:
        row["html"] = {"status": 0, "error": str(error)}

    if gsc and should_inspect:
        try:
            row["inspection"] = _build_inspection_payload(gsc.inspect(canonical_url))
        except Exception as error:
            row["inspection"] = {"error": str(error)}

    row["rawHtmlHealth"] = _raw_html_health(row)
    row.update(_google_buckets(row))
    return row


def _summarize_buckets(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    return {
        "liveMatches": sum(1 for row in rows if row.get("category") == "live"),
        "upcomingMatches": sum(1 for row in rows if row.get("category") == "upcoming"),
        "recentMatches": sum(1 for row in rows if row.get("category") == "recent"),
        "indexed": sum(1 for row in rows if row.get("indexed")),
        "unknownToGoogle": sum(1 for row in rows if row.get("unknownToGoogle")),
        "discoveredButNotIndexed": sum(
            1 for row in rows if row.get("discoveredButNotIndexed")
        ),
        "hasImpressions": sum(1 for row in rows if row.get("hasImpressions")),
        "hasClicks": sum(1 for row in rows if row.get("hasClicks")),
    }


def _monitor_freshness_row(
    canonical_row: Dict[str, Any],
    base_url: str,
    sitemap_entries: Dict[str, str],
    hub_html: Dict[str, str],
) -> Dict[str, Any]:
    page_type = primary_freshness_type(str(canonical_row.get("category") or ""))
    freshness_url = freshness_support_url(canonical_row.get("slug") or "", page_type, base_url)
    freshness_path = freshness_url.replace(base_url, "", 1)
    discovery_hubs = find_discovery_hubs(freshness_url, base_url, hub_html)
    html_text = ""
    row: Dict[str, Any] = {
        "category": canonical_row.get("category"),
        "pageType": page_type,
        "slug": canonical_row.get("slug"),
        "url": freshness_url,
        "canonicalUrl": canonical_row.get("url"),
        "inSitemap": freshness_url in sitemap_entries,
        "sitemapLastmod": _format_timestamp(sitemap_entries.get(freshness_url, "")),
        "discoveryHubCount": len(discovery_hubs),
        "discoveryHubs": discovery_hubs,
        "linkedFromCanonical": False,
        "retainedInArchive": False,
    }
    try:
        html_text = _request_text(freshness_url)
        row["html"] = {"status": 200, **parse_html_proof(html_text, freshness_url)}
    except Exception as error:
        row["html"] = {"status": 0, "error": str(error)}

    canonical_html = canonical_row.get("html") or {}
    canonical_html_text = canonical_html.get("_raw") or ""
    if not canonical_html_text and canonical_row.get("url"):
        try:
            canonical_html_text = _request_text(str(canonical_row["url"]))
        except Exception:
            canonical_html_text = ""

    if canonical_html_text:
        row["linkedFromCanonical"] = freshness_url in canonical_html_text or freshness_path in canonical_html_text

    row["retainedInArchive"] = any(path in ("/live-score/archive", "/series", "/matches") for path in discovery_hubs)
    row["rawHtmlHealth"] = _freshness_html_health(row)
    return row


def collect_dashboard_data(force_refresh: bool = False) -> Dict[str, Any]:
    base_url = os.getenv("SEO_DASHBOARD_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    site_url = os.getenv("GSC_SITE_URL", f"{base_url}/")
    credentials_path = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        str(Path(__file__).resolve().parents[2] / "gsc-service-account.json"),
    )
    days = max(7, int(os.getenv("SEO_DASHBOARD_DAYS", "14")))
    inspection_limit = max(0, int(os.getenv("SEO_DASHBOARD_INSPECT_LIMIT", "1")))
    if force_refresh:
        inspection_limit = max(
            inspection_limit,
            int(os.getenv("SEO_DASHBOARD_FORCE_INSPECT_LIMIT", "12")),
        )
    live_sample_limit = max(1, int(os.getenv("SEO_DASHBOARD_LIVE_SAMPLE_LIMIT", "6")))
    upcoming_sample_limit = max(1, int(os.getenv("SEO_DASHBOARD_UPCOMING_SAMPLE_LIMIT", "6")))
    recent_sample_limit = max(1, int(os.getenv("SEO_DASHBOARD_RECENT_SAMPLE_LIMIT", "4")))
    upcoming_window_min = max(0, int(os.getenv("SEO_DASHBOARD_UPCOMING_MIN_HOURS", "30")))
    upcoming_window_max = max(upcoming_window_min, int(os.getenv("SEO_DASHBOARD_UPCOMING_MAX_HOURS", "120")))
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
        "sampleWindow": {
            "upcomingMinHours": upcoming_window_min,
            "upcomingMaxHours": upcoming_window_max,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        },
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
        "serpbear": _load_serpbear(),
    }

    try:
        indexing = _request_json(f"{base_url}/api/v1/seo/indexing/status")
        data["sources"]["indexing"] = {"ok": True, **indexing}
    except Exception as error:
        data["sources"]["indexing"] = {"ok": False, "error": str(error)}

    sitemap_entries: Dict[str, str] = {}
    try:
        sitemap_data = _load_match_sitemap_entries(base_url)
        sitemap_entries = sitemap_data["urlEntries"]
        data["sources"]["sitemap"] = {
            "ok": True,
            "indexUrlCount": len(sitemap_data["indexEntries"]),
            "matchPartitionCount": len(sitemap_data["matchPartitions"]),
            "matchUrlCount": sum("/cric-live/" in url for url in sitemap_entries),
        }
    except Exception as error:
        data["sources"]["sitemap"] = {"ok": False, "error": str(error)}

    hub_html: Dict[str, str] = {}
    for path, _alias in HUB_PATHS:
        url = f"{base_url}{path}"
        try:
            html = _request_text(url)
            hub_html[path] = html
            proof = parse_html_proof(html, url)
            data["hubHealth"].append({"path": path, "status": 200, **proof})
        except Exception as error:
            data["hubHealth"].append({"path": path, "status": 0, "error": str(error)})

    live_feed: List[Dict[str, Any]] = []
    upcoming_feed: List[Dict[str, Any]] = []
    completed_feed: List[Dict[str, Any]] = []
    try:
        payload = _request_json(f"{base_url}/api/cricket-data/live-matches?_ts=seo-dashboard")
        live_feed = normalize_schedule_payload(payload if not isinstance(payload, list) else payload)
        if isinstance(payload, list):
            live_feed = [row for row in payload if isinstance(row, dict)]
        data["sources"]["liveFeed"] = {"ok": True, "count": len(live_feed)}
    except Exception as error:
        data["sources"]["liveFeed"] = {"ok": False, "count": 0, "error": str(error)}

    try:
        payload = _request_json(f"{base_url}/api/cricket-data/upcoming-matches?_ts=seo-dashboard")
        upcoming_feed = normalize_schedule_payload(payload)
        data["sources"]["upcomingFeed"] = {"ok": True, "count": len(upcoming_feed)}
    except Exception as error:
        data["sources"]["upcomingFeed"] = {"ok": False, "count": 0, "error": str(error)}

    try:
        payload = _request_json(f"{base_url}/api/cricket-data/completed-matches?_ts=seo-dashboard")
        completed_feed = normalize_schedule_payload(payload)
        data["sources"]["completedFeed"] = {"ok": True, "count": len(completed_feed)}
    except Exception as error:
        data["sources"]["completedFeed"] = {"ok": False, "count": 0, "error": str(error)}

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
        hub_paths = {path for path, _alias in HUB_PATHS}
        data["hubPerformance"] = [
            {
                "url": row.get("keys", [""])[0],
                "clicks": _number(row.get("clicks")),
                "impressions": _number(row.get("impressions")),
                "ctr": _number(row.get("ctr")),
                "position": _number(row.get("position")),
            }
            for row in hub_rows
            if any(row.get("keys", [""])[0].rstrip("/").endswith(path) for path in hub_paths)
        ]
        data["sources"]["gsc"] = {"ok": True, "siteUrl": site_url}
    except Exception as error:
        data["sources"]["gsc"] = {"ok": False, "error": str(error)}

    page_metrics = {
        row.get("keys", [""])[0]: row
        for row in page_rows
        if row.get("keys")
    }

    inspection_budget = inspection_limit
    monitored_rows: List[Dict[str, Any]] = []
    observed_at = data["generatedAt"]
    dashboard_state = _load_dashboard_state()

    upcoming_candidates = []
    now_utc = datetime.now(timezone.utc)
    for match in upcoming_feed:
        start_time = _extract_match_start(match)
        if not start_time:
            continue
        hours = (start_time - now_utc).total_seconds() / 3600.0
        if upcoming_window_min <= hours <= upcoming_window_max:
            upcoming_candidates.append(match)
    if not upcoming_candidates:
        upcoming_candidates = upcoming_feed[:upcoming_sample_limit]

    upcoming_sample = sorted(
        upcoming_candidates,
        key=lambda row: _extract_match_start(row) or now_utc,
    )[:upcoming_sample_limit]

    for match in upcoming_sample:
        row = _monitor_row(
            match,
            "upcoming",
            base_url,
            sitemap_entries,
            hub_html,
            page_metrics,
            gsc,
            inspection_budget > 0,
        )
        row = _apply_history(row, dashboard_state, observed_at)
        row.update(_score_manual_submission_candidate(row))
        if inspection_budget > 0:
            inspection_budget -= 1
        data["upcomingMatches"].append(row)
        monitored_rows.append(row)

    for match in live_feed[:live_sample_limit]:
        row = _monitor_row(
            match,
            "live",
            base_url,
            sitemap_entries,
            hub_html,
            page_metrics,
            gsc,
            inspection_budget > 0,
        )
        row = _apply_history(row, dashboard_state, observed_at)
        row.update(_score_manual_submission_candidate(row))
        if inspection_budget > 0:
            inspection_budget -= 1
        data["liveMatches"].append(row)
        monitored_rows.append(row)

    for match in completed_feed[:recent_sample_limit]:
        row = _monitor_row(
            match,
            "recent",
            base_url,
            sitemap_entries,
            hub_html,
            page_metrics,
            gsc,
            inspection_budget > 0,
        )
        row = _apply_history(row, dashboard_state, observed_at)
        row.update(_score_manual_submission_candidate(row))
        if inspection_budget > 0:
            inspection_budget -= 1
        data["recentMatches"].append(row)
        monitored_rows.append(row)

    data["sampleWindow"]["upcomingSampleSlugs"] = [
        row.get("slug") for row in data["upcomingMatches"]
    ]
    data["freshnessPages"] = [
        _monitor_freshness_row(row, base_url, sitemap_entries, hub_html)
        for row in monitored_rows
        if row.get("slug")
    ]
    data["bucketCounts"] = _summarize_buckets(monitored_rows)
    data["operatorActionSummary"] = _summarize_operator_actions(monitored_rows)
    data["manualSubmissionQueue"] = sorted(
        [
            row
            for row in monitored_rows
            if row.get("recommendedAction") == "manual_submit"
        ],
        key=lambda row: (
            -int(row.get("priorityScore") or 0),
            _number(row.get("hoursUntilMatch"), 9999),
        ),
    )[:5]
    for row in monitored_rows:
        if isinstance(row.get("html"), dict):
            row["html"].pop("_raw", None)
    _save_dashboard_state(dashboard_state)
    return data
