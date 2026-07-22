"""
CREX schedule parser helpers for upcoming and completed fixtures.
"""

import asyncio
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from playwright.async_api import Page

from ..crex_url_utils import extract_crex_match_key, get_crex_details_url, get_crex_live_url, get_crex_scorecard_url


_COMPLETED_PATTERN = re.compile(
    r"(\bwon\b|\bwon by\b|\bbeat\b|match tied|no result|match abandoned|abandoned|tied)",
    re.IGNORECASE,
)
_LIVE_PATTERN = re.compile(r"\blive\b|in progress|innings break", re.IGNORECASE)
_FORMAT_PATTERN = re.compile(r"\b(test|odi|t20i?|t10)\b", re.IGNORECASE)
_SCORE_PATTERN = re.compile(r"\b\d{1,3}[/-]\d\b|\b\d{1,3}\.\d\b")
_TIME_PATTERN = re.compile(r"\b(\d{1,2}):(\d{2})\s*([AP]M)\b", re.IGNORECASE)
_TEAM_SPLIT_PATTERN = re.compile(r"\s+vs\.?\s+", re.IGNORECASE)
_MAX_MATCH_NAME_ENRICHMENTS = 12


def extract_external_match_key(url: str) -> Optional[str]:
    return extract_crex_match_key(url)


def classify_match_status(text: str) -> str:
    normalized = normalize_text(text).lower()
    if not normalized:
        return "UPCOMING"
    if _LIVE_PATTERN.search(normalized):
        return "LIVE"
    if _COMPLETED_PATTERN.search(normalized):
        if "abandoned" in normalized or "no result" in normalized:
            return "ABANDONED"
        return "COMPLETED"
    return "UPCOMING"


def normalize_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def parse_epoch_millis(raw_value: Optional[str]) -> Optional[int]:
    normalized = normalize_text(raw_value)
    if not normalized:
        return None

    iso_candidate = normalized.replace("Z", "+00:00")
    try:
        return int(datetime.fromisoformat(iso_candidate).timestamp() * 1000)
    except ValueError:
        return None


def extract_time_label(text: str) -> Optional[str]:
    normalized = normalize_text(text)
    match = _TIME_PATTERN.search(normalized)
    if not match:
        return None

    hour = int(match.group(1))
    minutes = match.group(2)
    meridiem = match.group(3).upper()
    return f"{hour}:{minutes} {meridiem}"


def parse_clock_minutes(time_label: str) -> Optional[int]:
    match = _TIME_PATTERN.search(normalize_text(time_label))
    if not match:
        return None

    hour = int(match.group(1)) % 12
    if match.group(3).upper() == "PM":
        hour += 12
    return hour * 60 + int(match.group(2))


def infer_scheduled_start(
    time_label: Optional[str],
    now: datetime,
    current_date: datetime,
    previous_minutes: Optional[int],
) -> Optional[Dict[str, Any]]:
    if not time_label:
        return None

    minutes = parse_clock_minutes(time_label)
    if minutes is None:
        return None

    schedule_date = current_date
    if previous_minutes is None:
        candidate = schedule_date.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=minutes)
        if candidate < now - timedelta(hours=6):
            schedule_date = schedule_date + timedelta(days=1)
    elif minutes < previous_minutes:
        schedule_date = schedule_date + timedelta(days=1)

    scheduled_start = schedule_date.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=minutes)
    return {
        "scheduled_start": scheduled_start,
        "minutes": minutes,
        "current_date": schedule_date,
    }

def extract_match_format(text: str) -> Optional[str]:
    match = _FORMAT_PATTERN.search(text or "")
    return match.group(1).upper() if match else None


def extract_result_summary(text: str) -> Optional[str]:
    normalized = normalize_text(text)
    if not normalized:
        return None

    for fragment in re.split(r"(?<=[.!?])\s+|\s{2,}", normalized):
        if _COMPLETED_PATTERN.search(fragment):
            return normalize_text(fragment)

    if _COMPLETED_PATTERN.search(normalized):
        return normalized
    return None


def extract_series_name(*texts: Optional[str]) -> Optional[str]:
    """Extract only a competition name, never a score/status card label."""
    for text in texts:
        normalized = normalize_text(text)
        if not normalized:
            continue

        # JSON-LD event names retain the series after the match descriptor:
        # ``India U19 vs Sri Lanka U19, 2nd Test, India U19 Tour..., 2026``.
        # Prefer this structured fragment over the rendered card, which joins
        # teams, score and toss text into a single misleading string.
        parts = [normalize_text(part) for part in normalized.split(",") if normalize_text(part)]
        for index, part in enumerate(parts):
            if not _FORMAT_PATTERN.search(part) or index + 1 >= len(parts):
                continue
            series = normalize_text(", ".join(parts[index + 1:]))
            lower = series.lower()
            if (
                len(series) > 4
                and " vs " not in lower
                and not _COMPLETED_PATTERN.search(lower)
                and not _SCORE_PATTERN.search(lower)
                and "toss delayed" not in lower
                and "yet to bat" not in lower
            ):
                return series

        lines = [normalize_text(line) for line in re.split(r"[\r\n]+", normalized) if normalize_text(line)]
        for line in lines:
            lower = line.lower()
            if " vs " in lower:
                continue
            if _COMPLETED_PATTERN.search(lower):
                continue
            if _SCORE_PATTERN.search(lower):
                continue
            if "schedule" in lower or "fixtures" in lower or "toss delayed" in lower or "yet to bat" in lower:
                continue
            if len(line) > 4:
                return line
    return None


def _clean_team_fragment(fragment: str) -> str:
    normalized = normalize_text(fragment)
    if not normalized:
        return ""

    normalized = re.split(
        r"(?:,\s*|\s+\d{4}\b|\s+\d{1,2}(?:st|nd|rd|th)\b|\s+\b(?:test|odi|t20i?|t10|match|live|fixtures?)\b|\s+\d{1,2}:\d{2}\s*[AP]M\b)",
        normalized,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    return normalize_text(normalized.strip(" -,:;|"))


def extract_team_names(*candidates: Optional[str]) -> Dict[str, Optional[str]]:
    for candidate in candidates:
        normalized = normalize_text(candidate)
        if " vs " not in normalized.lower():
            continue

        parts = _TEAM_SPLIT_PATTERN.split(normalized, maxsplit=1)
        if len(parts) != 2:
            continue

        team1 = _clean_team_fragment(parts[0])
        team2 = _clean_team_fragment(parts[1])
        if team1 and team2:
            return {"team1Name": team1, "team2Name": team2}

    return {"team1Name": None, "team2Name": None}


def _normalize_team_lookup_key(value: Optional[str]) -> str:
    return normalize_text(value).lower()


def _looks_like_short_team_name(value: Optional[str]) -> bool:
    normalized = normalize_text(value)
    if not normalized:
        return False

    compact = re.sub(r"[\s.-]", "", normalized)
    return len(compact) <= 6 and re.fullmatch(r"[A-Z0-9\s.-]+", normalized) is not None


def build_team_name_lookup(local_storage: Dict[str, str]) -> Dict[str, str]:
    lookup: Dict[str, str] = {}
    if not local_storage:
        return lookup

    for key, short_name in local_storage.items():
        if not (key.startswith("t_") and key.endswith("_short")):
            continue

        team_code = key[2:-6]
        full_name = normalize_text(local_storage.get(f"t_{team_code}_name"))
        normalized_short = _normalize_team_lookup_key(short_name)
        if normalized_short and full_name:
            lookup[normalized_short] = full_name

    return lookup


def expand_team_names(team_names: Dict[str, Optional[str]], team_name_lookup: Dict[str, str]) -> Dict[str, Optional[str]]:
    if not team_name_lookup:
        return team_names

    expanded = dict(team_names)
    for key in ("team1Name", "team2Name"):
        team_name = team_names.get(key)
        if not _looks_like_short_team_name(team_name):
            continue

        replacement = team_name_lookup.get(_normalize_team_lookup_key(team_name))
        if replacement:
            expanded[key] = replacement

    return expanded


def _get_team_names_local_storage_script() -> str:
    return """() => {
        const keys = Object.keys(localStorage || {});
        const teamNames = keys.filter((key) => key.startsWith('t_') && key.endsWith('_name')).length;
        return teamNames >= 2;
    }"""


async def _extract_local_storage(page: Page) -> Dict[str, str]:
    return await page.evaluate(
        "() => Object.fromEntries(Object.entries(localStorage || {}).map(([key, value]) => [key, value]))"
    )


async def _wait_for_team_name_cache(page: Page) -> Dict[str, str]:
    try:
        await page.wait_for_load_state("networkidle", timeout=7000)
    except Exception:
        await page.wait_for_timeout(2000)

    try:
        await page.wait_for_function(_get_team_names_local_storage_script(), timeout=5000)
    except Exception:
        await page.wait_for_timeout(2000)

    return await _extract_local_storage(page)


def _match_page_candidates(url: str) -> List[str]:
    normalized = get_crex_live_url(normalize_text(url))
    if not normalized:
        return []

    candidates = [
        get_crex_details_url(normalized),
        get_crex_scorecard_url(normalized),
        normalized,
    ]

    deduped: List[str] = []
    for candidate in candidates:
        if candidate and candidate not in deduped:
            deduped.append(candidate)
    return deduped


async def _enrich_match_names_from_page(page: Page, match_info: Dict[str, Any]) -> None:
    team_names = {
        "team1Name": match_info.get("team1Name"),
        "team2Name": match_info.get("team2Name"),
    }

    for candidate_url in _match_page_candidates(match_info.get("url", "")):
        try:
            await page.goto(candidate_url, timeout=20000)
        except Exception:
            continue

        try:
            local_storage = await _wait_for_team_name_cache(page)
        except Exception:
            continue

        expanded = expand_team_names(team_names, build_team_name_lookup(local_storage or {}))
        if expanded != team_names:
            match_info["team1Name"] = expanded["team1Name"]
            match_info["team2Name"] = expanded["team2Name"]
            return


async def _enrich_schedule_matches(page: Page, matches: List[Dict[str, Any]]) -> None:
    unresolved_matches = [
        match for match in matches
        if match.get("status") == "UPCOMING"
        and (
            _looks_like_short_team_name(match.get("team1Name"))
            or _looks_like_short_team_name(match.get("team2Name"))
        )
    ][: _MAX_MATCH_NAME_ENRICHMENTS]

    if not unresolved_matches:
        return

    semaphore = asyncio.Semaphore(4)

    async def enrich(match_info: Dict[str, Any]) -> None:
        async with semaphore:
            match_page = await page.context.new_page()
            try:
                await _enrich_match_names_from_page(match_page, match_info)
            finally:
                await match_page.close()

    await asyncio.gather(*(enrich(match_info) for match_info in unresolved_matches))


async def extract_schedule_matches(page: Page, base_url: str = "https://crex.com") -> List[Dict[str, Any]]:
    local_storage = await _wait_for_team_name_cache(page)
    team_name_lookup = build_team_name_lookup(local_storage or {})

    raw_cards = await page.evaluate(
        """() => {
            const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
            const cards = [];
            const seen = new Set();
            const scheduleDates = {};
            const scheduleEventNames = {};
            const scheduleDateScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

            scheduleDateScripts.forEach((script) => {
                try {
                    const parsed = JSON.parse(script.textContent || '{}');
                    const items = parsed && parsed.mainEntity && Array.isArray(parsed.mainEntity.itemListElement)
                        ? parsed.mainEntity.itemListElement
                        : [];

                    items.forEach((entry) => {
                        const event = entry && entry.item ? entry.item : null;
                        const url = event && event.url ? event.url : '';
                        const startDate = event && event.startDate ? event.startDate : '';
                        const eventName = event && event.name ? event.name : '';
                        if (!url || !startDate) {
                            return;
                        }

                        const absoluteUrl = url.startsWith('http')
                            ? url
                            : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

                        scheduleDates[absoluteUrl] = startDate;
                        if (eventName) {
                            scheduleEventNames[absoluteUrl] = normalize(eventName);
                        }
                    });
                } catch (error) {
                    // Ignore malformed JSON-LD blocks.
                }
            });
            const anchors = Array.from(document.querySelectorAll("a[href*='/scoreboard/'], a[href*='/cricket-live-score/']"));

            anchors.forEach((anchor) => {
                const href = anchor.getAttribute('href');
                if (!href) {
                    return;
                }

                const absoluteUrl = href.startsWith('http')
                    ? href
                    : `${window.location.origin}${href.startsWith('/') ? '' : '/'}${href}`;

                if (seen.has(absoluteUrl)) {
                    return;
                }

                const card = anchor.closest('li, article, section, div') || anchor;
                const text = normalize(card.innerText || anchor.innerText || '');
                if (!text) {
                    return;
                }

                const timeNode = card.querySelector('time, [datetime], [data-time], [data-start-time], [data-timestamp]');
                const timeValue = timeNode
                    ? normalize(
                        timeNode.getAttribute('datetime') ||
                        timeNode.getAttribute('data-time') ||
                        timeNode.getAttribute('data-start-time') ||
                        timeNode.getAttribute('data-timestamp') ||
                        timeNode.textContent ||
                        ''
                    )
                    : '';

                cards.push({
                    url: absoluteUrl,
                    text,
                    title: normalize(anchor.innerText || ''),
                    eventName: scheduleEventNames[absoluteUrl] || '',
                    timeValue,
                    startDate: scheduleDates[absoluteUrl] || ''
                });

                seen.add(absoluteUrl);
            });

            return cards;
        }"""
    )

    matches: List[Dict[str, Any]] = []
    now = datetime.utcnow()
    upcoming_date_cursor = now
    previous_upcoming_minutes: Optional[int] = None
    for card in raw_cards:
        url = normalize_text(card.get("url"))
        if not url:
            continue

        combined_text = " ".join(
            part for part in [card.get("title"), card.get("text")] if normalize_text(part)
        )
        team_names = expand_team_names(
            extract_team_names(card.get("eventName"), card.get("title"), card.get("text"), combined_text),
            team_name_lookup,
        )
        status = classify_match_status(combined_text)
        if status == "LIVE":
            continue

        scheduled_start_time = parse_epoch_millis(card.get("startDate")) or parse_epoch_millis(card.get("timeValue"))
        if scheduled_start_time is None and status == "UPCOMING":
            inferred_schedule = infer_scheduled_start(
                extract_time_label(combined_text),
                now,
                upcoming_date_cursor,
                previous_upcoming_minutes,
            )
            if inferred_schedule is not None:
                scheduled_start_time = int(inferred_schedule["scheduled_start"].timestamp() * 1000)
                upcoming_date_cursor = inferred_schedule["current_date"]
                previous_upcoming_minutes = inferred_schedule["minutes"]

        match_info = {
            "url": url if url.startswith("http") else f"{base_url}{url}",
            "externalMatchKey": extract_external_match_key(url),
            "status": status,
            "scheduledStartTime": scheduled_start_time,
            "team1Name": team_names["team1Name"],
            "team2Name": team_names["team2Name"],
            "seriesName": extract_series_name(card.get("eventName"), card.get("text")),
            "matchFormat": extract_match_format(combined_text),
            "resultSummary": extract_result_summary(card.get("text") or ""),
            "lastStateUpdatedAt": int(datetime.utcnow().timestamp() * 1000),
        }

        matches.append(match_info)

    await _enrich_schedule_matches(page, matches)

    return matches
