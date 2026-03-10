"""
CREX schedule parser helpers for upcoming and completed fixtures.
"""

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from playwright.async_api import Page


_COMPLETED_PATTERN = re.compile(
    r"(\bwon\b|\bwon by\b|\bbeat\b|match tied|no result|match abandoned|abandoned|tied)",
    re.IGNORECASE,
)
_LIVE_PATTERN = re.compile(r"\blive\b|in progress|innings break", re.IGNORECASE)
_FORMAT_PATTERN = re.compile(r"\b(test|odi|t20i?|t10)\b", re.IGNORECASE)
_SCORE_PATTERN = re.compile(r"\b\d{1,3}[/-]\d\b|\b\d{1,3}\.\d\b")
_TIME_PATTERN = re.compile(r"\b(\d{1,2}):(\d{2})\s*([AP]M)\b", re.IGNORECASE)


def extract_external_match_key(url: str) -> Optional[str]:
    if not url:
        return None

    parts = [part for part in url.split("/") if part]
    if not parts:
        return None

    last = parts[-1]
    if last.lower() in {"live", "scorecard", "info"} and len(parts) > 1:
        return parts[-2]
    return last


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


def extract_series_name(text: str) -> Optional[str]:
    lines = [normalize_text(line) for line in re.split(r"[\r\n]+", text or "") if normalize_text(line)]
    for line in lines:
        lower = line.lower()
        if " vs " in lower:
            continue
        if _COMPLETED_PATTERN.search(lower):
            continue
        if _SCORE_PATTERN.search(lower):
            continue
        if "schedule" in lower or "fixtures" in lower:
            continue
        if len(line) > 4:
            return line
    return None


async def extract_schedule_matches(page: Page, base_url: str = "https://crex.com") -> List[Dict[str, Any]]:
    raw_cards = await page.evaluate(
        """() => {
            const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
            const cards = [];
            const seen = new Set();
            const scheduleDates = {};
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
                        if (!url || !startDate) {
                            return;
                        }

                        const absoluteUrl = url.startsWith('http')
                            ? url
                            : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

                        scheduleDates[absoluteUrl] = startDate;
                    });
                } catch (error) {
                    // Ignore malformed JSON-LD blocks.
                }
            });
            const anchors = Array.from(document.querySelectorAll("a[href*='/scoreboard/']"));

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
            "seriesName": extract_series_name(card.get("text") or ""),
            "matchFormat": extract_match_format(combined_text),
            "resultSummary": extract_result_summary(card.get("text") or ""),
            "lastStateUpdatedAt": int(datetime.utcnow().timestamp() * 1000),
        }

        matches.append(match_info)

    return matches
