"""Durable ownership for the scraper's bounded live-match slate.

The provider can reorder its live carousel between discovery cycles. Selection
must therefore be sticky: once a match owns a scraper slot, it keeps that slot
until terminal evidence is available. The state file lives on the persistent
scraper volume so a container restart does not silently swap matches.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, List, Optional, Set

from .crex_url_utils import extract_crex_api_key, extract_crex_match_key, normalize_crex_url
from .live_match_selection import select_live_matches, _looks_terminal


DEFAULT_MANAGED_LIVE_SLATE_PATH = "/app/storage/managed_live_slate.json"


def _identity(url: str) -> str:
    normalized = normalize_crex_url(url)
    return (
        extract_crex_api_key(normalized)
        or extract_crex_match_key(normalized)
        or normalized.lower()
    )


def has_terminal_evidence(match: Any) -> bool:
    """Share the live-selection terminal rule with snapshot reconciliation."""
    return _looks_terminal(match)


def reconcile_managed_live_slate(
    discovered_urls: Iterable[str],
    previous_urls: Iterable[str],
    max_matches: int,
    terminal_urls: Optional[Iterable[str]] = None,
) -> List[str]:
    """Keep previous live owners and fill only genuinely free slots.

    A previous owner may be absent from one provider discovery response. It is
    retained unless the caller supplies terminal evidence for that match. This
    protects a live match from carousel reordering and transient discovery
    gaps while preserving the configured concurrency cap.
    """
    if max_matches <= 0:
        return []

    discovered: List[str] = []
    discovered_by_identity = {}
    for value in discovered_urls or []:
        normalized = normalize_crex_url(value)
        if not normalized:
            continue
        key = _identity(normalized)
        if key not in discovered_by_identity:
            discovered_by_identity[key] = normalized
            discovered.append(normalized)

    terminal_keys: Set[str] = {
        _identity(value) for value in (terminal_urls or []) if normalize_crex_url(value)
    }

    retained: List[str] = []
    retained_keys: Set[str] = set()
    for value in previous_urls or []:
        normalized = normalize_crex_url(value)
        if not normalized:
            continue
        key = _identity(normalized)
        if key in terminal_keys or key in retained_keys:
            continue
        # Prefer the provider's current canonical URL when the stable CREX key
        # survived under a different slug/alias.
        retained.append(discovered_by_identity.get(key, normalized))
        retained_keys.add(key)
        if len(retained) >= max_matches:
            return retained

    # A provider can leave a finished card on its live page for several
    # discovery cycles. Do not immediately re-admit a URL we just proved
    # terminal, or the sticky slate will remain permanently full of finished
    # matches.
    available = [
        value
        for value in discovered
        if _identity(value) not in retained_keys and _identity(value) not in terminal_keys
    ]
    open_slots = max_matches - len(retained)
    if open_slots <= 0:
        return retained[:max_matches]

    for candidate in select_live_matches(available, open_slots):
        normalized = normalize_crex_url(candidate)
        key = _identity(normalized)
        if normalized and key not in retained_keys:
            retained.append(normalized)
            retained_keys.add(key)
        if len(retained) >= max_matches:
            break

    return retained[:max_matches]


class ManagedLiveSlateStore:
    """Small atomic JSON store backed by the scraper's persistent volume."""

    def __init__(self, path: Optional[str] = None) -> None:
        configured = path or os.getenv("MANAGED_LIVE_SLATE_PATH", DEFAULT_MANAGED_LIVE_SLATE_PATH)
        self.path = Path(configured)
        self._lock = threading.RLock()

    def load(self) -> List[str]:
        with self._lock:
            try:
                payload = json.loads(self.path.read_text(encoding="utf-8"))
            except FileNotFoundError:
                return []
            except (OSError, json.JSONDecodeError, TypeError) as exc:
                # A corrupt checkpoint must not prevent the scraper from
                # discovering a fresh slate.
                print(f"[MANAGED-SLATE] Ignoring unreadable state: {exc}", flush=True)
                return []

            values = payload.get("matches", []) if isinstance(payload, dict) else payload
            if not isinstance(values, list):
                return []
            return [normalize_crex_url(value) for value in values if isinstance(value, str) and normalize_crex_url(value)]

    def save(self, urls: Iterable[str]) -> None:
        normalized: List[str] = []
        seen: Set[str] = set()
        for value in urls or []:
            url = normalize_crex_url(value)
            key = _identity(url) if url else ""
            if url and key not in seen:
                normalized.append(url)
                seen.add(key)

        payload = {
            "version": 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "matches": normalized,
        }

        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary_path: Optional[str] = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w",
                    encoding="utf-8",
                    dir=str(self.path.parent),
                    prefix=f".{self.path.name}.",
                    suffix=".tmp",
                    delete=False,
                ) as handle:
                    temporary_path = handle.name
                    json.dump(payload, handle, ensure_ascii=False, indent=2)
                    handle.write("\n")
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temporary_path, self.path)
            finally:
                if temporary_path:
                    try:
                        Path(temporary_path).unlink(missing_ok=True)
                    except OSError:
                        pass


__all__ = [
    "DEFAULT_MANAGED_LIVE_SLATE_PATH",
    "ManagedLiveSlateStore",
    "has_terminal_evidence",
    "reconcile_managed_live_slate",
]
