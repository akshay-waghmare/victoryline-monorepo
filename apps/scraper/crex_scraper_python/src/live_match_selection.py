"""Selection policy for the live scraper's finite browser budget."""

import re
from typing import Any, Iterable, List


_INTERNATIONAL_MARKERS = (
    "test-match",
    "test-series",
    "test-cricket",
    "odi",
    "t20i",
    "world-cup",
    "world-cup-league",
    "cwc-league",
    "champions-trophy",
    "international",
    "bilateral-series",
)


def _value(match: Any, *keys: str) -> str:
    if isinstance(match, dict):
        for key in keys:
            value = match.get(key)
            if value:
                return str(value)
    return ""


def _url(match: Any) -> str:
    if isinstance(match, str):
        return match
    return _value(match, "url", "matchUrl", "match_url")


def _is_international(match: Any) -> bool:
    text = " ".join(
        (
            _value(match, "seriesName", "series_name"),
            _value(match, "matchFormat", "match_format", "format"),
            _url(match),
        )
    ).lower()
    return any(marker in text for marker in _INTERNATIONAL_MARKERS)


def _series_key(match: Any) -> str:
    explicit = _value(match, "seriesExternalId", "series_external_id", "seriesName", "series_name")
    if explicit:
        return explicit.strip().lower()

    url = _url(match).lower()
    slug_match = re.search(r"/cricket-live-score/([^/?#]+)", url)
    slug = slug_match.group(1) if slug_match else url
    slug = re.sub(r"-match-updates-[^-/?#]+$", "", slug)
    # CREX live slugs generally begin with team-vs-team and a match ordinal.
    slug = re.sub(r"^.+?-vs-.+?-\d+(?:st|nd|rd|th)-match-", "", slug)
    return slug or url


def select_live_matches(
    matches: Iterable[Any],
    max_matches: int,
    per_series_cap: int = 3,
) -> List[Any]:
    """Return international-first live matches with a per-series cap.

    Original ordering is retained within the priority groups, making the
    selection deterministic while allowing the catalog's ordering to decide
    ties. Entries without a URL are retained only if they already look like a
    valid match object; downstream URL extraction will ignore unusable values.
    """
    if max_matches <= 0:
        return list(matches)
    if per_series_cap <= 0:
        raise ValueError("per_series_cap must be positive")

    ordered = sorted(list(matches), key=lambda match: 0 if _is_international(match) else 1)
    selected: List[Any] = []
    series_counts = {}
    for match in ordered:
        series = _series_key(match)
        if series_counts.get(series, 0) >= per_series_cap:
            continue
        selected.append(match)
        series_counts[series] = series_counts.get(series, 0) + 1
        if len(selected) >= max_matches:
            break
    return selected
