"""Pure selection rules for the bounded pre-match model handoff.

This is deliberately separate from :mod:`live_match_selection`: a fixture in
the opening window is useful to the opening model, but must never consume the
live scraper's browser budget or become a live prediction candidate.
"""

from __future__ import annotations

import time
from typing import Any, Iterable, List


PREMATCH_MIN_LEAD_SECONDS = 12 * 60 * 60
PREMATCH_MAX_LEAD_SECONDS = 48 * 60 * 60
PREMATCH_MAX_CANDIDATES = 3


def _value(match: Any, *keys: str) -> Any:
    if not isinstance(match, dict):
        return None
    for key in keys:
        value = match.get(key)
        if value is not None and str(value).strip():
            return value
    return None


def _scheduled_at_seconds(match: Any) -> float | None:
    value = _value(match, "scheduledStartTime", "scheduled_start_time")
    try:
        timestamp = float(value)
    except (TypeError, ValueError):
        return None
    # Backend records are epoch milliseconds; tolerate seconds in unit tests
    # and older records without making a timezone assumption.
    return timestamp / 1000 if timestamp >= 100_000_000_000 else timestamp


def _is_supported_t20(match: Any) -> bool:
    value = _value(match, "matchFormat", "match_format", "format")
    normalized = str(value or "").strip().lower().replace(" ", "")
    return "t20" in normalized and "t10" not in normalized


def _is_upcoming(match: Any) -> bool:
    status = str(_value(match, "status", "matchStatus", "match_status") or "").strip().upper()
    return status in {"UPCOMING", "SCHEDULED"}


def select_prematch_candidates(
    matches: Iterable[Any],
    *,
    now: float | None = None,
    limit: int = PREMATCH_MAX_CANDIDATES,
) -> List[dict[str, Any]]:
    """Return exact source records eligible for opening-model evaluation.

    The contract accepts only scheduled backend records inside the 12--48 hour
    window and keeps the original URL untouched.  It intentionally has no
    dependency on the live selector or scraper state.
    """
    if limit <= 0:
        return []
    reference = time.time() if now is None else now
    eligible: List[tuple[float, dict[str, Any]]] = []
    for match in matches or []:
        if not isinstance(match, dict) or not _is_upcoming(match) or not _is_supported_t20(match):
            continue
        url = _value(match, "url", "matchUrl", "match_url")
        scheduled_at = _scheduled_at_seconds(match)
        if not isinstance(url, str) or not url.strip() or scheduled_at is None:
            continue
        lead_seconds = scheduled_at - reference
        if not PREMATCH_MIN_LEAD_SECONDS <= lead_seconds <= PREMATCH_MAX_LEAD_SECONDS:
            continue
        eligible.append((scheduled_at, match))

    eligible.sort(key=lambda item: (item[0], str(_value(item[1], "url", "matchUrl", "match_url"))))
    return [match for _, match in eligible[:limit]]
