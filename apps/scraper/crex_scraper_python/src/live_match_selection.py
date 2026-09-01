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

_TERMINAL_STATUS_MARKERS = (
    "completed",
    "finished",
    "abandoned",
    "no_result",
    "no result",
    "match tied",
    "drawn",
)

_TERMINAL_TEXT_RE = re.compile(
    r"\b(?:won\s+by|won\s+the\s+match|match\s+(?:finished|completed|tied)|"
    r"(?:match\s+)?(?:abandoned|no\s+result|drawn|finished|completed))\b",
    re.IGNORECASE,
)
_SCORE_RE = re.compile(r"\b\d+\s*/\s*\d+(?:\.\d+)?\b")


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


def _looks_terminal(match: Any) -> bool:
    """Return whether a catalogue row contains strong terminal evidence.

    The backend live catalogue is a persisted snapshot and can outlive the
    provider's live card.  Do not send rows with a result back through the
    live sync path: that endpoint intentionally marks every incoming URL as
    LIVE.  ``Stumps`` and ``INNINGS_BREAK`` remain valid multi-day states; only
    explicit result/status evidence is rejected here.
    """
    if not isinstance(match, dict):
        return False

    status = _value(match, "status", "lifecycleStatus", "lifecycle_status").strip().lower()
    if status.replace("-", "_") in _TERMINAL_STATUS_MARKERS:
        return True

    evidence = " ".join(
        str(match.get(key))
        for key in (
            "lastKnownState",
            "last_known_state",
            "resultSummary",
            "result_summary",
            "scoreUpdate",
            "score_update",
            "currentBall",
            "current_ball",
            "finalResultText",
            "final_result_text",
        )
        if match.get(key)
    )
    if not evidence:
        return False

    if _TERMINAL_TEXT_RE.search(evidence):
        return True

    # Some provider snapshots put the winner between two innings scores (for
    # example ``TEAM 83/68.2 TEAM Won ... OTHER 172/620.0``) without the words
    # ``won by``.  Treat that shape as terminal, while leaving a live "won the
    # toss" message alone.
    return bool(re.search(r"\bwon\b", evidence, re.IGNORECASE) and len(_SCORE_RE.findall(evidence)) >= 2)


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

    eligible = [match for match in matches if not _looks_terminal(match)]
    ordered = sorted(eligible, key=lambda match: 0 if _is_international(match) else 1)
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
