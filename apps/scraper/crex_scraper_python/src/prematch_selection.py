"""Pure selection rules for the bounded pre-match model handoff.

This is deliberately separate from :mod:`live_match_selection`: a fixture in
the opening window is useful to the opening model, but must never consume the
live scraper's browser budget or become a live prediction candidate.
"""

from __future__ import annotations

import re
import time
from typing import Any, Iterable, List


PREMATCH_MIN_LEAD_SECONDS = 12 * 60 * 60
PREMATCH_MAX_LEAD_SECONDS = 48 * 60 * 60
PREMATCH_MAX_CANDIDATES = 3
_NESTED_CREX_MATCH_FRAGMENT = re.compile(r"/cricket-live-score/vs-", re.IGNORECASE)


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


def _normalized_t20_format(match: Any) -> str | None:
    """Return the explicit T20 marker supplied by the schedule record.

    A few backend catalogue rows omit ``matchFormat`` even though their
    source-facing series descriptor or canonical CREX URL explicitly includes
    a match type such as ``4thT20`` or ``-t20-``.  That is sufficient to
    recover the known format, but only for an explicit T20/T20I marker;
    generic competition-name inference is deliberately out of scope.
    """
    values = (
        _value(match, "matchFormat", "match_format", "format"),
        _value(match, "seriesName", "series_name", "label"),
        _value(match, "url", "matchUrl", "match_url"),
    )
    for value in values:
        normalized = str(value or "").strip().casefold().replace(" ", "")
        if "t10" in normalized or "hundred" in normalized:
            continue
        if re.search(r"(?:^|[^a-z0-9])t20i?(?:$|[^a-z0-9])", normalized):
            return "T20"
        # CREX sometimes joins the ordinal and format (for example ``4thT20``).
        if re.search(r"\d+(?:st|nd|rd|th)t20i?(?:$|[^a-z0-9])", normalized):
            return "T20"
    return None


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
        if not isinstance(match, dict) or not _is_upcoming(match):
            continue
        match_format = _normalized_t20_format(match)
        if match_format is None:
            continue
        url = _value(match, "url", "matchUrl", "match_url")
        scheduled_at = _scheduled_at_seconds(match)
        if not isinstance(url, str) or not url.strip() or scheduled_at is None:
            continue
        # The schedule parser already validates full canonical URLs. This
        # extra boundary guard quarantines a malformed record retained from a
        # prior parser cycle without tightening the public test contract.
        if _NESTED_CREX_MATCH_FRAGMENT.search(url.strip()):
            continue
        lead_seconds = scheduled_at - reference
        if not PREMATCH_MIN_LEAD_SECONDS <= lead_seconds <= PREMATCH_MAX_LEAD_SECONDS:
            continue
        # Keep the upstream record untouched while ensuring the public
        # handoff preserves the exact supported format used for selection.
        normalized_match = dict(match)
        if not _value(normalized_match, "matchFormat", "match_format", "format"):
            normalized_match["matchFormat"] = match_format
        eligible.append((scheduled_at, normalized_match))

    eligible.sort(key=lambda item: (item[0], str(_value(item[1], "url", "matchUrl", "match_url"))))
    return [match for _, match in eligible[:limit]]
