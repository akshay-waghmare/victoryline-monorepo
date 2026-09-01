"""Bounded, direct HTTP CREX sV3 updates (Spec 053).

This service deliberately owns only rapid score deltas. Browser scraping remains
the source for identity-cache hydration and rich match data.
"""
import asyncio
from collections import deque
import json
import logging
import random
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional

import httpx

from ..crex_url_utils import extract_crex_api_key, extract_crex_match_key

logger = logging.getLogger(__name__)


@dataclass
class _MatchState:
    match_id: str
    url: str
    api_key: str
    next_poll_at: float = 0.0
    last_payload: Optional[Dict[str, Any]] = None
    active: bool = False
    last_success_at: Optional[float] = None


class HttpSv3FastLane:
    """One-client, host-budgeted sV3 poller that fails closed on block signals."""

    ENDPOINT = "https://api.goscorer.com/api/v3/getSV3"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://crex.com/",
    }

    def __init__(self, settings: Any, cache: Any, on_update: Callable[[str, Dict[str, Any], Dict[str, str]], Awaitable[bool]], *, client: Any = None, clock=time.monotonic, jitter=random.uniform):
        self.settings, self.cache, self.on_update = settings, cache, on_update
        self._client, self._clock, self._jitter = client, clock, jitter
        self._owned_client = client is None
        self._matches: Dict[str, _MatchState] = {}
        self._request_times = deque()
        self._failures = 0
        self._circuit_open_until = 0.0
        self._stats = {"fetches": 0, "changes": 0, "pushes": 0, "errors": 0, "blocked": 0, "identity_waiting": 0, "last_success_at": None}

    async def start(self) -> None:
        if self._client is None:
            self._client = httpx.AsyncClient(headers=self.HEADERS, timeout=httpx.Timeout(5.0, connect=3.0), follow_redirects=True)

    async def stop(self) -> None:
        if self._owned_client and self._client:
            await self._client.aclose()
        self._client = None

    async def reconcile(self, urls: list[str]) -> None:
        wanted = {}
        for url in urls:
            key = extract_crex_api_key(url)
            match_key = extract_crex_match_key(url)
            if key and match_key:
                wanted[f"crex:{match_key}"] = (url, key)
        for match_id in list(self._matches):
            if match_id not in wanted:
                self._matches.pop(match_id, None)
        for match_id, (url, key) in wanted.items():
            state = self._matches.get(match_id)
            if state is None:
                self._matches[match_id] = _MatchState(match_id, url, key)
            else:
                state.url, state.api_key = url, key

    async def tick(self) -> None:
        now = self._clock()
        if now < self._circuit_open_until or not self._budget_available(now):
            return
        for state in list(self._matches.values()):
            if now < state.next_poll_at or not self._budget_available(now):
                continue
            mapping = await self.cache.get_local_storage(state.match_id)
            if not self._has_complete_identity(mapping):
                state.active = False
                self._stats["identity_waiting"] += 1
                state.next_poll_at = now + self.settings.http_sv3_base_interval_seconds
                continue
            await self._poll_one(state, mapping, now)

    async def _poll_one(self, state: _MatchState, mapping: Dict[str, str], now: float) -> None:
        self._request_times.append(now)
        self._stats["fetches"] += 1
        try:
            response = await self._client.get(self.ENDPOINT, params={"key": state.api_key})
            if response.status_code in (403, 429):
                self._stats["blocked"] += 1
                self._open_circuit("upstream_block")
                return
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("sV3 response is not an object")
            self._failures = 0
            success_at = time.time()
            self._stats["last_success_at"] = success_at
            state.last_success_at = success_at
            state.active = True
            changed = self._changed(state.last_payload, payload)
            state.last_payload = payload
            interval = self.settings.http_sv3_active_interval_seconds if changed else self.settings.http_sv3_base_interval_seconds
            state.next_poll_at = now + interval + self._jitter(0.0, min(0.5, interval * 0.1))
            if changed:
                self._stats["changes"] += 1
                if await self.on_update(state.url, payload, mapping):
                    self._stats["pushes"] += 1
        except Exception as exc:
            self._stats["errors"] += 1
            self._failures += 1
            state.active = False
            state.next_poll_at = now + self.settings.http_sv3_base_interval_seconds
            logger.warning("http_sv3.fetch_error match=%s error=%s", state.match_id, exc)
            if self._failures >= self.settings.http_sv3_breaker_failure_threshold:
                self._open_circuit("error_burst")

    def _budget_available(self, now: float) -> bool:
        while self._request_times and now - self._request_times[0] >= 60:
            self._request_times.popleft()
        return len(self._request_times) < self.settings.http_sv3_max_requests_per_minute

    def _open_circuit(self, reason: str) -> None:
        self._circuit_open_until = self._clock() + self.settings.http_sv3_breaker_cooldown_seconds
        logger.warning("http_sv3.circuit_open reason=%s cooldown=%s", reason, self.settings.http_sv3_breaker_cooldown_seconds)

    @staticmethod
    def _has_complete_identity(mapping: Optional[Dict[str, str]]) -> bool:
        if not mapping:
            return False
        teams = [key[2:-5] for key in mapping if key.startswith("t_") and key.endswith("_name") and mapping.get(key)]
        return len(teams) >= 2 and all(mapping.get(f"t_{team}_short") for team in teams[:2])

    @staticmethod
    def _changed(old: Optional[Dict[str, Any]], new: Dict[str, Any]) -> bool:
        return old is None or json.dumps(old, sort_keys=True, separators=(",", ":")) != json.dumps(new, sort_keys=True, separators=(",", ":"))

    def get_stats(self) -> Dict[str, Any]:
        now = self._clock()
        match_health = {
            match_id: {
                "url": state.url,
                "active": state.active,
                "last_success_at": state.last_success_at,
                "seconds_since_success": None if state.last_success_at is None else max(0.0, round(time.time() - state.last_success_at, 2)),
            }
            for match_id, state in self._matches.items()
        }
        return {**self._stats, "enabled": True, "selected_matches": len(self._matches), "covered_matches": sum(1 for item in self._matches.values() if item.active), "match_health": match_health, "circuit_open": now < self._circuit_open_until, "circuit_open_for_seconds": max(0, round(self._circuit_open_until - now, 2)), "requests_last_minute": len(self._request_times)}
