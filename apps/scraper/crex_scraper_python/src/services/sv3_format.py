"""Normalize match-format metadata carried by CREX sV3 responses."""

import re
from typing import Any, Dict, Optional


_FORMAT_PATTERNS = (
    ("t20", re.compile(r"\bt\s*20\b|\btwenty20\b|\b20\s*overs?\b", re.I)),
    ("odi", re.compile(r"\bodi\b|\bone\s*day\b|\b50\s*overs?\b", re.I)),
    ("test", re.compile(r"\btest\b", re.I)),
    ("first_class", re.compile(r"\bfirst\s*class\b", re.I)),
    ("list_a", re.compile(r"\blist\s*a\b", re.I)),
)


def _optional_int(value: Any) -> Optional[int]:
    try:
        return int(value) if value is not None and str(value).strip() else None
    except (TypeError, ValueError):
        return None


def normalize_sv3_format(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return stable format metadata from raw sV3 fields.

    ``fo`` is retained as the authoritative upstream label. The normalized
    ``format_type`` is deliberately conservative and may be ``unknown`` when
    the provider sends a new label.
    """
    raw_label = data.get("fo")
    if raw_label is None or not str(raw_label).strip():
        return None

    label = str(raw_label).strip()
    format_type = "unknown"
    for candidate, pattern in _FORMAT_PATTERNS:
        if pattern.search(label):
            format_type = candidate
            break

    variant = None
    lowered = label.casefold()
    if "youth" in lowered:
        variant = "youth"
    elif "women" in lowered or "women's" in lowered:
        variant = "women"

    metadata: Dict[str, Any] = {
        "label": label,
        "type": format_type,
        "variant": variant,
        "days": _optional_int(data.get("numDays")),
        "follow_on_runs": _optional_int(data.get("followOnRuns")),
    }
    return {key: value for key, value in metadata.items() if value is not None}
