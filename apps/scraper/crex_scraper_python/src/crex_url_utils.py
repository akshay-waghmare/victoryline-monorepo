"""
Shared CREX URL helpers for old scoreboard and new cricket-live-score formats.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple
from urllib.parse import parse_qs, urlsplit, urlunsplit

DEFAULT_CREX_ORIGIN = "https://crex.com"

_OLD_VARIANTS = {"live", "scorecard", "info"}
_NEW_VARIANTS = {"match-scorecard", "match-details"}
_MATCH_UPDATES_SUFFIX = re.compile(r"^(?P<slug>.+)-match-updates-(?P<api_key>[A-Za-z0-9]+)$", re.IGNORECASE)


@dataclass(frozen=True)
class CrexUrlParts:
    normalized_url: str
    origin: str
    format: str
    base_segments: Tuple[str, ...]
    variant: Optional[str]
    slug: Optional[str]
    match_key: Optional[str]
    api_key: Optional[str]

    @property
    def base_url(self) -> str:
        if not self.base_segments:
            return self.normalized_url
        return f"{self.origin}/{'/'.join(self.base_segments)}"


def normalize_crex_url(url: Optional[str], default_origin: str = DEFAULT_CREX_ORIGIN) -> str:
    trimmed = (url or "").strip()
    if not trimmed:
        return ""

    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        split = urlsplit(trimmed)
    elif trimmed.startswith("/"):
        split = urlsplit(f"{default_origin}{trimmed}")
    else:
        split = urlsplit(f"{default_origin}/{trimmed.lstrip('/')}")

    path = split.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")

    return urlunsplit((split.scheme, split.netloc, path, split.query, ""))


def parse_crex_url(url: Optional[str]) -> CrexUrlParts:
    normalized = normalize_crex_url(url)
    if not normalized:
        return CrexUrlParts("", DEFAULT_CREX_ORIGIN, "unknown", tuple(), None, None, None, None)

    split = urlsplit(normalized)
    origin = f"{split.scheme}://{split.netloc}"
    query_key = parse_qs(split.query).get("key", [None])[0]
    segments = tuple(segment for segment in split.path.split("/") if segment)

    if not segments:
        return CrexUrlParts(normalized, origin, "unknown", tuple(), None, None, None, query_key)

    if segments[0] == "scoreboard":
        variant = segments[-1] if segments[-1] in _OLD_VARIANTS else None
        base_segments = segments[:-1] if variant else segments
        tail = base_segments[1:]
        api_key = query_key or (tail[0] if tail else None)
        slug = tail[-1] if tail else None
        match_key = slug or api_key
        return CrexUrlParts(normalized, origin, "scoreboard", base_segments, variant, slug, match_key, api_key)

    if segments[0] == "cricket-live-score":
        variant = segments[-1] if segments[-1] in _NEW_VARIANTS else None
        base_segments = segments[:-1] if variant else segments
        slug = base_segments[-1] if len(base_segments) >= 2 else None
        api_key = query_key
        match_key = slug
        if slug:
            match = _MATCH_UPDATES_SUFFIX.match(slug)
            if match:
                api_key = api_key or match.group("api_key")
        return CrexUrlParts(normalized, origin, "cricket-live-score", base_segments, variant, slug, match_key, api_key)

    if segments[0] == "match":
        variant = segments[-1] if segments[-1] in _OLD_VARIANTS else None
        base_segments = segments[:-1] if variant else segments
        match_key = base_segments[1] if len(base_segments) > 1 else None
        return CrexUrlParts(normalized, origin, "legacy-match", base_segments, variant, match_key, match_key, query_key)

    return CrexUrlParts(normalized, origin, "unknown", segments, None, segments[-1], segments[-1], query_key)


def detect_crex_url_format(url: Optional[str]) -> str:
    return parse_crex_url(url).format


def is_old_crex_url(url: Optional[str]) -> bool:
    return parse_crex_url(url).format in {"scoreboard", "legacy-match"}


def is_new_crex_url(url: Optional[str]) -> bool:
    return parse_crex_url(url).format == "cricket-live-score"


def extract_crex_slug(url: Optional[str]) -> Optional[str]:
    return parse_crex_url(url).slug


def extract_crex_match_key(url: Optional[str]) -> Optional[str]:
    return parse_crex_url(url).match_key


def extract_crex_api_key(url: Optional[str]) -> Optional[str]:
    return parse_crex_url(url).api_key


def get_crex_base_url(url: Optional[str]) -> str:
    return parse_crex_url(url).base_url


def ensure_crex_variant(url: Optional[str], variant: str) -> str:
    requested = (variant or "").strip().lower()
    if not requested:
        return normalize_crex_url(url)

    parts = parse_crex_url(url)
    if not parts.normalized_url:
        return ""

    if parts.format == "cricket-live-score":
        if requested in {"live", "match-updates"}:
            return parts.base_url
        if requested in {"scorecard", "match-scorecard"}:
            return f"{parts.base_url}/match-scorecard"
        if requested in {"details", "info", "match-details"}:
            return f"{parts.base_url}/match-details"
    elif parts.format in {"scoreboard", "legacy-match"}:
        if requested in {"live", "match-updates"}:
            return f"{parts.base_url}/live"
        if requested in {"scorecard", "match-scorecard"}:
            return f"{parts.base_url}/scorecard"
        if requested in {"details", "info", "match-details"}:
            return f"{parts.base_url}/info"

    trimmed = parts.normalized_url.rstrip("/")
    for existing_variant in ("/live", "/scorecard", "/info", "/match-scorecard", "/match-details"):
        if trimmed.endswith(existing_variant):
            trimmed = trimmed[: -len(existing_variant)]
            break

    suffix = {
        "live": "/live",
        "match-updates": "",
        "scorecard": "/scorecard",
        "match-scorecard": "/match-scorecard",
        "details": "/info",
        "info": "/info",
        "match-details": "/match-details",
    }.get(requested, f"/{requested}")
    return trimmed if not suffix else f"{trimmed}{suffix}"


def get_crex_live_url(url: Optional[str]) -> str:
    return ensure_crex_variant(url, "live")


def get_crex_scorecard_url(url: Optional[str]) -> str:
    return ensure_crex_variant(url, "scorecard")


def get_crex_details_url(url: Optional[str]) -> str:
    return ensure_crex_variant(url, "details")
