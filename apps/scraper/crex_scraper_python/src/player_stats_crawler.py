"""
Separate player stats crawler runtime for low-frequency roster/stats ingestion.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]

from .adapters.rate_limit import TokenBucket
from .cache import ScrapeCache
from .config import get_settings
from .crex_url_utils import (
    ensure_crex_variant,
    extract_crex_api_key,
    extract_crex_match_key,
)
from .cricket_data_service import CricketDataService
from .loggers.adapters import get_logger

logger = get_logger(component="player_stats_crawler")


def select_player_reference(players: List[Dict[str, Any]], requested_name: str) -> Optional[Dict[str, Any]]:
    """Resolve a scorecard display name to the provider's real player link.

    CREX often renders scorecards with initials (for example ``J Ferdous``)
    while the linked playing-XI row contains ``Juairiya Ferdous`` and a stable
    ``/player/...-CODE`` URL. Matching the final surname plus the first initial
    handles that provider presentation difference without guessing an ID from
    a name slug alone.
    """
    requested = re.sub(r"\s+", " ", str(requested_name or "")).strip().lower()
    requested_tokens = re.findall(r"[a-z0-9]+", requested)
    if not requested_tokens:
        return None
    requested_key = "".join(requested_tokens)

    best: Optional[Dict[str, Any]] = None
    best_score = -1
    for player in players or []:
        if not isinstance(player, dict) or not player.get("player_url"):
            continue
        player_url = str(player.get("player_url") or "").strip()
        candidate_name = str(player.get("player_name") or "").strip().lower()
        candidate_tokens = re.findall(r"[a-z0-9]+", candidate_name)
        # The visible card label can be abbreviated or include role text, while
        # the provider URL contains the canonical full name. Use that URL only
        # as a verified alias; never manufacture a player ID from the request.
        url_match = re.search(r"/player/([^/?#]+)", player_url, re.IGNORECASE)
        url_slug = url_match.group(1) if url_match else ""
        url_slug = re.sub(r"-[a-z0-9]{2,5}$", "", url_slug, flags=re.IGNORECASE)
        url_tokens = re.findall(r"[a-z0-9]+", url_slug.lower())
        if not candidate_tokens and not url_tokens:
            continue
        candidate_key = "".join(candidate_tokens)
        url_key = "".join(url_tokens)
        score = 0
        if candidate_key == requested_key:
            score = 100
        elif len(requested_tokens) >= 2 and len(candidate_tokens) >= 2:
            # Compare the surname and the remaining name tokens. The first
            # token may be a single initial on either side.
            if candidate_tokens[-1] == requested_tokens[-1]:
                requested_tail = requested_tokens[1:]
                candidate_tail = candidate_tokens[1:]
                if requested_tail == candidate_tail and requested_tokens[0][0] == candidate_tokens[0][0]:
                    score = 90
                elif requested_tokens[0][0] == candidate_tokens[0][0] and (
                    requested_tail == candidate_tail
                    or requested_tail[-1:] == candidate_tail[-1:]
                ):
                    score = 80
                elif requested_tokens[0][0] == candidate_tokens[0][0]:
                    score = 60
        if score == 0 and (requested_key in candidate_key or candidate_key in requested_key):
            score = 40
        if url_key == requested_key:
            score = max(score, 95)
        elif url_key and (requested_key in url_key or url_key in requested_key):
            score = max(score, 75)
        if score > best_score:
            best = player
            best_score = score

    return best if best_score > 0 else None


@dataclass(order=True)
class PlayerStatsTask:
    priority: int
    match_id: str = field(compare=False)
    match_url: str = field(compare=False)
    task_type: str = field(compare=False)
    scheduled_start_time: Optional[int] = field(compare=False, default=None)
    metadata: Dict[str, Any] = field(compare=False, default_factory=dict)
    timestamp: float = field(compare=False, default_factory=time.time)


@dataclass
class PlayerStatsCandidate:
    match_id: str
    match_url: str
    task_type: str
    scheduled_start_time: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    next_due_at: float = 0.0
    last_attempt_at: float = 0.0
    last_success_at: float = 0.0
    last_error: Optional[str] = None


class PlayerStatsScheduler:
    """Dedicated queue and rate limiter for the player stats crawler."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._queue: Optional[asyncio.PriorityQueue] = None
        self._active_tasks: set[str] = set()
        self._lock: Optional[asyncio.Lock] = None
        self._shutting_down = False
        self.rate_limiter = TokenBucket(
            capacity=self.settings.player_stats_rate_limit_burst,
            refill_rate=self.settings.player_stats_rate_limit_tokens_per_sec,
        )

    async def setup(self) -> None:
        if self._queue is None:
            self._queue = asyncio.PriorityQueue(maxsize=self.settings.player_stats_queue_size)
        if self._lock is None:
            self._lock = asyncio.Lock()

    async def enqueue(self, task: PlayerStatsTask, *, bypass_rate_limit: bool = False) -> bool:
        if self._shutting_down or self._queue is None or self._lock is None:
            return False
        if not bypass_rate_limit and not self.rate_limiter.consume():
            logger.debug("player_stats.scheduler.rate_limited", extra={"match_id": task.match_id})
            return False

        async with self._lock:
            if task.match_id in self._active_tasks:
                return False
            if self._queue.full():
                logger.warning("player_stats.scheduler.queue_full", extra={"match_id": task.match_id})
                return False
            try:
                self._queue.put_nowait(task)
                self._active_tasks.add(task.match_id)
                return True
            except asyncio.QueueFull:
                return False

    async def next_task(self) -> PlayerStatsTask:
        if self._queue is None:
            raise RuntimeError("PlayerStatsScheduler not initialized")
        return await self._queue.get()

    async def task_done(self, task: PlayerStatsTask) -> None:
        if self._lock is None or self._queue is None:
            return
        async with self._lock:
            self._active_tasks.discard(task.match_id)
        self._queue.task_done()

    @property
    def qsize(self) -> int:
        if self._queue is None:
            return 0
        return self._queue.qsize()

    async def shutdown(self) -> None:
        self._shutting_down = True


class PlayerStatsCrawlerService:
    """
    Separate runtime for low-frequency player stats crawling.

    The service keeps its own queue, rate limiter, and scheduling cadence so the
    live polling path remains isolated.
    """

    def __init__(
        self,
        *,
        pool: Any,
        cache: ScrapeCache,
        registry: Any,
        auth_token_provider: Callable[[], Optional[str]],
    ) -> None:
        self.settings = get_settings()
        self.pool = pool
        self.cache = cache
        self.registry = registry
        self._auth_token_provider = auth_token_provider
        self.scheduler = PlayerStatsScheduler()
        self._running = False
        self._workers: list[asyncio.Task] = []
        self._schedule_task: Optional[asyncio.Task] = None
        self._candidate_lock: Optional[asyncio.Lock] = None
        self._candidates: Dict[str, PlayerStatsCandidate] = {}
        self._team_aliases: Dict[str, str] = {}

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._candidate_lock = asyncio.Lock()
        await self.scheduler.setup()
        for worker_id in range(self.settings.player_stats_worker_count):
            self._workers.append(asyncio.create_task(self._worker_loop(worker_id)))
        self._schedule_task = asyncio.create_task(self._schedule_loop())
        logger.info("PlayerStatsCrawlerService started.")

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        if self._schedule_task:
            self._schedule_task.cancel()
        for worker in self._workers:
            worker.cancel()
        if self._schedule_task:
            try:
                await self._schedule_task
            except asyncio.CancelledError:
                pass
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers = []
        await self.scheduler.shutdown()
        logger.info("PlayerStatsCrawlerService stopped.")

    async def update_candidates(self, live_match_urls: list[str], schedule_matches: list[Dict[str, Any]]) -> None:
        if self._candidate_lock is None:
            return

        desired: Dict[str, PlayerStatsCandidate] = {}

        if self.settings.player_stats_include_live_matches:
            for url in live_match_urls or []:
                match_id = self._extract_match_id(url)
                if not match_id:
                    continue
                desired[match_id] = PlayerStatsCandidate(
                    match_id=match_id,
                    match_url=url,
                    task_type="LIVE",
                    metadata={
                        "source": "live_discovery",
                        "_candidate_scope": "match",
                    },
                )

        if self.settings.player_stats_include_upcoming_matches:
            for match in schedule_matches or []:
                status = str(match.get("status") or "").upper()
                if status not in {"UPCOMING", "LIVE", "COMPLETED"}:
                    continue
                url = str(match.get("url") or match.get("matchUrl") or "").strip()
                match_id = self._extract_match_id(url)
                if not url or not match_id:
                    continue
                if status == "LIVE":
                    task_type = "LIVE"
                elif status == "COMPLETED":
                    task_type = "COMPLETED"
                else:
                    task_type = "UPCOMING"
                existing = desired.get(match_id)
                if existing and existing.task_type == "LIVE":
                    existing.metadata.update(match)
                    continue
                desired[match_id] = PlayerStatsCandidate(
                    match_id=match_id,
                    match_url=url,
                    task_type=task_type,
                    scheduled_start_time=match.get("scheduledStartTime"),
                    metadata={
                        "_candidate_scope": "match",
                        **dict(match),
                    },
                )
                self._remember_team_aliases(
                    match.get("team1Name"),
                    match.get("team2Name"),
                )

        async with self._candidate_lock:
            previous = self._candidates
            merged: Dict[str, PlayerStatsCandidate] = {
                candidate_id: candidate
                for candidate_id, candidate in previous.items()
                if self._candidate_scope(candidate) != "match"
            }
            for match_id, candidate in desired.items():
                existing = previous.get(match_id)
                if existing:
                    candidate.next_due_at = existing.next_due_at
                    candidate.last_attempt_at = existing.last_attempt_at
                    candidate.last_success_at = existing.last_success_at
                    candidate.last_error = existing.last_error
                merged[match_id] = candidate
            self._candidates = merged

    async def update_live_candidates(self, live_match_urls: list[str]) -> None:
        if self._candidate_lock is None:
            return

        live_candidates: Dict[str, PlayerStatsCandidate] = {}
        if self.settings.player_stats_include_live_matches:
            for url in live_match_urls or []:
                match_id = self._extract_match_id(url)
                if not match_id:
                    continue
                live_candidates[match_id] = PlayerStatsCandidate(
                    match_id=match_id,
                    match_url=url,
                    task_type="LIVE",
                    metadata={
                        "source": "backend_live_poll",
                        "_candidate_scope": "match",
                    },
                )

        async with self._candidate_lock:
            previous = self._candidates
            merged = {
                match_id: candidate
                for match_id, candidate in previous.items()
                if self._candidate_scope(candidate) != "match" or candidate.task_type.upper() != "LIVE"
            }
            for match_id, candidate in live_candidates.items():
                existing = previous.get(match_id)
                if existing:
                    candidate.next_due_at = existing.next_due_at
                    candidate.last_attempt_at = existing.last_attempt_at
                    candidate.last_success_at = existing.last_success_at
                    candidate.last_error = existing.last_error
                merged[match_id] = candidate
            self._candidates = merged

    async def _schedule_loop(self) -> None:
        logger.info("Player stats scheduler loop started.")
        while self._running:
            try:
                due_candidates = await self._collect_due_candidates()
                if due_candidates:
                    for candidate in due_candidates[: self.settings.player_stats_batch_size]:
                        task = PlayerStatsTask(
                            priority=self._priority_for_candidate(candidate),
                            match_id=candidate.match_id,
                            match_url=candidate.match_url,
                            task_type=candidate.task_type,
                            scheduled_start_time=candidate.scheduled_start_time,
                            metadata=dict(candidate.metadata),
                        )
                        # A first-time standings candidate must not be dropped
                        # by the general reference token bucket. It is the
                        # data source for the series page's primary table.
                        enqueued = await self.scheduler.enqueue(
                            task,
                            bypass_rate_limit=task.priority == 0,
                        )
                        if enqueued:
                            await self._mark_candidate_enqueued(candidate.match_id)
                await asyncio.sleep(min(30.0, max(5.0, self.settings.player_stats_polling_interval_seconds / 4)))
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Player stats scheduler loop error: {exc}")
                await asyncio.sleep(5)

    async def _collect_due_candidates(self) -> list[PlayerStatsCandidate]:
        if self._candidate_lock is None:
            return []
        now = time.time()
        async with self._candidate_lock:
            candidates = [candidate for candidate in self._candidates.values() if candidate.next_due_at <= now]
        candidates.sort(key=lambda item: (self._priority_for_candidate(item), item.next_due_at, item.match_id))
        return candidates

    async def _mark_candidate_enqueued(self, match_id: str) -> None:
        if self._candidate_lock is None:
            return
        now = time.time()
        async with self._candidate_lock:
            candidate = self._candidates.get(match_id)
            if candidate is None:
                return
            candidate.last_attempt_at = now
            candidate.next_due_at = now + self._cooldown_for_candidate(candidate)

    async def _record_candidate_result(self, match_id: str, *, success: bool, error: Optional[str] = None) -> None:
        if self._candidate_lock is None:
            return
        async with self._candidate_lock:
            candidate = self._candidates.get(match_id)
            if candidate is None:
                return
            candidate.last_error = error
            if success:
                candidate.last_success_at = time.time()

    async def _worker_loop(self, worker_id: int) -> None:
        logger.debug(f"Player stats worker {worker_id} started.")
        while self._running:
            try:
                task = await self.scheduler.next_task()
                try:
                    await asyncio.wait_for(
                        self._process_task(task),
                        timeout=self.settings.player_stats_task_timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    await self._record_candidate_result(task.match_id, success=False, error="timeout")
                    logger.warning(f"Player stats task timed out for {task.match_id}")
                except Exception as exc:
                    await self._record_candidate_result(task.match_id, success=False, error=str(exc))
                    logger.warning(f"Player stats task failed for {task.match_id}: {exc}")
                finally:
                    await self.scheduler.task_done(task)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Player stats worker loop error: {exc}")
                await asyncio.sleep(1)

    async def _process_task(self, task: PlayerStatsTask) -> None:
        task_type = task.task_type.upper()
        if task_type in {"LIVE", "UPCOMING", "COMPLETED"}:
            await self._process_match_task(task)
            return
        if task_type == "PLAYER_REFERENCE":
            await self._process_player_reference_task(task)
            return
        if task_type == "TEAM_REFERENCE":
            await self._process_team_reference_task(task)
            return
        if task_type == "SERIES_REFERENCE":
            await self._process_series_reference_task(task)
            return
        if task_type == "SERIES_STANDINGS":
            await self._process_series_standings_task(task)
            return
        if task_type == "TEAM_RANKINGS":
            await self._process_team_rankings_task(task)
            return
        logger.warning("Player stats task skipped because task type is unsupported.", extra={"task_type": task.task_type})
        await self._record_candidate_result(task.match_id, success=False, error="unsupported_task_type")

    async def _process_match_task(self, task: PlayerStatsTask) -> None:
        # Fast path: iV4 API + localStorage (no Playwright)
        seed_payload = await self._fetch_iv4_seed(task.match_url)
        if seed_payload and (seed_payload.get("players") or []):
            logger.info(f"[iV4-FAST] Got seed for {task.match_id} with {len(seed_payload['players'])} players (no browser)")
        else:
            # Fallback: Playwright-based seed fetch
            adapter = self.registry.get_adapter("crex")
            if adapter is None or not hasattr(adapter, "fetch_player_stats_seed"):
                logger.warning("Player stats crawler skipped because CREX adapter seed extraction is unavailable.")
                return
            logger.info(f"[iV4-FALLBACK] Using Playwright seed for {task.match_id}")
            info_url = self._ensure_variant(task.match_url, "info")
            async with self.pool.get_context() as context:
                seed_payload = await adapter.fetch_player_stats_seed(context, info_url)

        await self._discover_reference_candidates(task, seed_payload)

        players = seed_payload.get("players") or []
        if not players:
            await self._record_candidate_result(task.match_id, success=False, error="empty_seed")
            logger.info(f"Player stats seed empty for {task.match_id}; will retry later.")
            return

        token = self._auth_token_provider()
        live_payload = None
        if task.task_type.upper() == "LIVE":
            live_payload = await asyncio.to_thread(CricketDataService.get_last_updated_data, task.match_url, token)

        payload = self._build_ingestion_request(task, seed_payload, live_payload)
        if not payload.get("teams"):
            await self._record_candidate_result(task.match_id, success=False, error="empty_payload")
            logger.info(f"Player stats payload empty for {task.match_id}; will retry later.")
            return

        previous_payload = await self.cache.get_player_stats_seed(task.match_id)
        if previous_payload and self._payload_signature(previous_payload) == self._payload_signature(payload):
            backend_snapshot = await asyncio.to_thread(
                CricketDataService.get_player_stats_match,
                task.match_url,
                payload.get("matchExternalKey"),
                token,
            )
            if backend_snapshot:
                await self.cache.set_player_stats_seed(
                    task.match_id,
                    payload,
                    ttl=self.settings.player_stats_cache_ttl_seconds,
                )
                await self._record_candidate_result(task.match_id, success=True)
                logger.debug(f"Player stats seed unchanged for {task.match_id}; skipping backend push.")
                return
            logger.info(f"Player stats seed unchanged for {task.match_id}, but backend snapshot is missing; pushing again.")

        pushed = await asyncio.to_thread(CricketDataService.push_player_stats, payload, token, task.match_url)
        if pushed:
            await self.cache.set_player_stats_seed(
                task.match_id,
                payload,
                ttl=self.settings.player_stats_cache_ttl_seconds,
            )
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_failed")

    async def _fetch_iv4_seed(self, match_url: str) -> Optional[Dict[str, Any]]:
        """Fetch player/team data via iV4 API + cached localStorage — no browser needed.

        Returns a seed payload in the same format as fetch_player_stats_seed(), or None.
        """
        if httpx is None:
            return None

        api_key = self._extract_api_key(match_url)
        if not api_key:
            logger.debug(f"[iV4] Cannot extract API key from {match_url}")
            return None

        match_id = self._extract_match_id(match_url)
        local_storage: Optional[Dict[str, str]] = None
        if match_id and self.cache:
            try:
                local_storage = await self.cache.get_local_storage(match_id)
            except Exception as exc:
                logger.debug(f"[iV4] localStorage cache miss for {match_id}: {exc}")

        if not local_storage:
            logger.debug(f"[iV4] No localStorage for {match_id}; skipping fast path")
            return None

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(10.0, connect=5.0),
            ) as client:
                resp = await client.get(
                    f"https://api-v1.com/w/iV4.php?key={api_key}",
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                resp.raise_for_status()
                iv4 = resp.json()
        except Exception as exc:
            logger.debug(f"[iV4] API call failed for key={api_key}: {exc}")
            return None

        if not isinstance(iv4, dict) or "tp" not in iv4:
            logger.debug(f"[iV4] Invalid response for key={api_key}")
            return None

        return self._decode_iv4_to_seed(iv4, local_storage, match_url)

    def _decode_iv4_to_seed(
        self,
        iv4: Dict[str, Any],
        local_storage: Dict[str, str],
        match_url: str,
    ) -> Optional[Dict[str, Any]]:
        """Decode an iV4 API response into the seed payload format expected by the crawler."""
        team_codes = iv4.get("t", "").split("-")

        # Build player name lookup from localStorage
        player_names: Dict[str, str] = {}
        for k, v in local_storage.items():
            if k.startswith("p_") and k.endswith("_name"):
                code = k[2:-5]
                player_names[code] = v

        team_names: Dict[str, str] = {}
        for k, v in local_storage.items():
            if k.startswith("t_") and k.endswith("_name"):
                code = k[2:-5]
                team_names[code] = v

        # Parse team players from tp (batting) and tb (bowling)
        tp_teams = iv4.get("tp", "").split("/")
        tb_teams = iv4.get("tb", "").split("/")

        players: List[Dict[str, Any]] = []
        team_links: List[Dict[str, Any]] = []

        for team_idx, team_code in enumerate(team_codes):
            team_name = team_names.get(team_code, team_code)
            team_links.append({
                "name": team_name,
                "url": self._build_crex_entity_url("team", team_name, team_code),
                "externalId": self._build_external_id("team", team_name),
                "teamCode": team_code,
            })

            # Collect all player codes for this team from tp + tb
            seen_codes: Dict[str, bool] = {}
            if team_idx < len(tp_teams):
                for entry in tp_teams[team_idx].split("-"):
                    code = entry.split(".")[0]
                    if code:
                        seen_codes[code] = True  # batting player
            if team_idx < len(tb_teams):
                for entry in tb_teams[team_idx].split("-"):
                    code = entry.split(".")[0]
                    if code and code not in seen_codes:
                        seen_codes[code] = False  # bowling-only player

            for order, (code, is_batter) in enumerate(seen_codes.items(), start=1):
                name = player_names.get(code)
                if not name:
                    continue
                slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                player_url = f"https://crex.live/player/{slug}-{code}"
                players.append({
                    "team_name": team_name,
                    "player_name": name,
                    "player_role": None,
                    "player_url": player_url,
                    "lineup_order": order,
                    "is_captain": False,
                    "is_wicket_keeper": False,
                    "source": "iv4_api",
                })

        if not players:
            return None

        # Series info from localStorage
        series_code = iv4.get("sf") or iv4.get("s") or ""
        series_name = local_storage.get(f"s_{series_code}_name", "")
        venue_code = iv4.get("v", "")
        venue_name = local_storage.get(f"v_{venue_code}_name", "")
        series_url = self._build_crex_entity_url("series", series_name, series_code) if series_name and series_code else None
        series_slug = re.sub(r"[^a-z0-9]+", "-", series_name.lower()).strip("-")

        return {
            "match_name": None,
            "match_date": iv4.get("dt"),
            "start_date": iv4.get("dt"),
            "venue": venue_name or None,
            "toss_info": None,
            "series_name": series_name or None,
            "series_url": series_url,
            "series_external_id": f"series:{series_slug}-{series_code}" if series_slug and series_code else None,
            "team_links": team_links,
            "players": players,
        }

    @staticmethod
    def _extract_api_key(match_url: str) -> Optional[str]:
        """Extract the CREX API key from old scoreboard or new match-updates URLs."""
        return extract_crex_api_key(match_url)

    async def _process_player_reference_task(self, task: PlayerStatsTask) -> None:
        # A match-level squad record is deliberately not enough to satisfy this
        # check: it is written before the player page has been visited.  The
        # player_profile snapshot is the durable completion marker for an
        # on-demand scorecard/lineup profile request.
        # An on-demand hydration request originates from the backend /player
        # endpoint.  Calling that endpoint again here would create a
        # backend -> scraper -> backend cycle and leave the user request
        # waiting for its own completion.  It must fetch and ingest directly.
        on_demand = bool(task.metadata.get("onDemand"))
        player_external_id = str((task.metadata.get("player") or {}).get("externalId") or "").strip()
        if player_external_id and not on_demand:
            persisted_player = await asyncio.to_thread(
                CricketDataService.get_player_stats_player,
                player_external_id,
                self._auth_token_provider(),
            )
            if self._has_persisted_player_profile(persisted_player):
                logger.debug(
                    "player_stats.reference.player.already_persisted",
                    extra={"player_external_id": player_external_id},
                )
                await self._record_candidate_result(task.match_id, success=True)
                return

        adapter = self.registry.get_adapter("crex")
        if adapter is None or not hasattr(adapter, "fetch_player_reference"):
            logger.warning("Player reference task skipped because CREX adapter reference extraction is unavailable.")
            await self._record_candidate_result(task.match_id, success=False, error="missing_adapter")
            return

        async with self.pool.get_context() as context:
            reference_payload = await adapter.fetch_player_reference(context, task.match_url)

        request = self._build_player_reference_request(task, reference_payload)
        if not request.get("snapshots"):
            await self._record_candidate_result(task.match_id, success=False, error="empty_player_reference")
            return

        previous_payload = await self._get_cached_reference_payload(task.match_id)
        if not on_demand and previous_payload and self._payload_signature(previous_payload) == self._payload_signature(request):
            player_external_id = (request.get("player") or {}).get("externalId")
            backend_player = await asyncio.to_thread(
                CricketDataService.get_player_stats_player,
                player_external_id,
                self._auth_token_provider(),
            )
            if backend_player and backend_player.get("stats"):
                await self._set_cached_reference_payload(task.match_id, request)
                await self._record_candidate_result(task.match_id, success=True)
                return
            logger.info(f"Player reference unchanged for {task.match_id}, but backend detail is missing; pushing again.")

        token = self._auth_token_provider()
        pushed = await asyncio.to_thread(
            CricketDataService.push_player_stats_reference,
            request,
            token,
            task.match_url,
        )
        if pushed:
            await self._set_cached_reference_payload(task.match_id, request)
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_reference_failed")

    @staticmethod
    def _has_persisted_player_profile(player_view: Optional[Dict[str, Any]]) -> bool:
        """Return true only after the detailed CREX profile has reached the DB.

        Match ingestion also creates player rows and seed/live snapshots.  Those
        rows must continue through the CREX profile fetch; otherwise scorecard
        and lineup clicks can permanently resolve to an empty detail panel.
        """
        if not isinstance(player_view, dict):
            return False

        for snapshot in player_view.get("stats") or []:
            if isinstance(snapshot, dict) and str(snapshot.get("category") or "").strip().lower() == "player_profile":
                return True
        return False

    async def _process_team_reference_task(self, task: PlayerStatsTask) -> None:
        adapter = self.registry.get_adapter("crex")
        if adapter is None or not hasattr(adapter, "fetch_team_reference"):
            logger.warning("Team reference task skipped because CREX adapter team extraction is unavailable.")
            await self._record_candidate_result(task.match_id, success=False, error="missing_adapter")
            return

        async with self.pool.get_context() as context:
            reference_payload = await adapter.fetch_team_reference(context, task.match_url)

        request = self._build_team_profile_reference_request(task, reference_payload)
        if not request.get("snapshots"):
            await self._record_candidate_result(task.match_id, success=False, error="empty_team_reference")
            return

        previous_payload = await self._get_cached_reference_payload(task.match_id)
        if previous_payload and self._payload_signature(previous_payload) == self._payload_signature(request):
            team_external_id = (request.get("team") or {}).get("externalId")
            backend_team = await asyncio.to_thread(
                CricketDataService.get_player_stats_team,
                team_external_id,
                self._auth_token_provider(),
            )
            if backend_team and backend_team.get("stats"):
                await self._set_cached_reference_payload(task.match_id, request)
                await self._record_candidate_result(task.match_id, success=True)
                return
            logger.info(f"Team reference unchanged for {task.match_id}, but backend detail is missing; pushing again.")

        token = self._auth_token_provider()
        pushed = await asyncio.to_thread(
            CricketDataService.push_player_stats_reference,
            request,
            token,
            task.match_url,
        )
        if pushed:
            await self._set_cached_reference_payload(task.match_id, request)
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_team_reference_failed")

    async def _process_series_reference_task(self, task: PlayerStatsTask) -> None:
        adapter = self.registry.get_adapter("crex")
        if adapter is None or not hasattr(adapter, "fetch_series_reference"):
            logger.warning("Series reference task skipped because CREX adapter series extraction is unavailable.")
            await self._record_candidate_result(task.match_id, success=False, error="missing_adapter")
            return

        async with self.pool.get_context() as context:
            reference_payload = await adapter.fetch_series_reference(context, task.match_url)

        request = self._build_series_profile_reference_request(task, reference_payload)
        if not request.get("snapshots"):
            await self._record_candidate_result(task.match_id, success=False, error="empty_series_reference")
            return

        previous_payload = await self._get_cached_reference_payload(task.match_id)
        if previous_payload and self._payload_signature(previous_payload) == self._payload_signature(request):
            series_external_id = (request.get("series") or {}).get("externalId")
            backend_series = await asyncio.to_thread(
                CricketDataService.get_player_stats_series,
                series_external_id,
                self._auth_token_provider(),
            )
            if backend_series and backend_series.get("stats"):
                await self._set_cached_reference_payload(task.match_id, request)
                await self._record_candidate_result(task.match_id, success=True)
                return
            logger.info(f"Series reference unchanged for {task.match_id}, but backend detail is missing; pushing again.")

        token = self._auth_token_provider()
        pushed = await asyncio.to_thread(
            CricketDataService.push_player_stats_reference,
            request,
            token,
            task.match_url,
        )
        if pushed:
            await self._set_cached_reference_payload(task.match_id, request)
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_series_reference_failed")

    async def _process_series_standings_task(self, task: PlayerStatsTask) -> None:
        adapter = self.registry.get_adapter("crex")
        if adapter is None or not hasattr(adapter, "fetch_standings_reference"):
            logger.warning("Series standings task skipped because CREX adapter standings extraction is unavailable.")
            await self._record_candidate_result(task.match_id, success=False, error="missing_adapter")
            return

        async with self.pool.get_context() as context:
            reference_payload = await adapter.fetch_standings_reference(context, task.match_url)

        series_request, team_requests = self._build_series_reference_requests(task, reference_payload)
        bundle = {
            "series": series_request,
            "teams": team_requests,
        }
        if not series_request.get("snapshots") and not team_requests:
            await self._record_candidate_result(task.match_id, success=False, error="empty_series_reference")
            return

        previous_payload = await self._get_cached_reference_payload(task.match_id)
        if previous_payload and self._payload_signature(previous_payload) == self._payload_signature(bundle):
            await self._set_cached_reference_payload(task.match_id, bundle)
            await self._record_candidate_result(task.match_id, success=True)
            return

        token = self._auth_token_provider()
        push_results = []
        if series_request.get("snapshots"):
            push_results.append(await asyncio.to_thread(
                CricketDataService.push_player_stats_reference,
                series_request,
                token,
                task.match_url,
            ))
        for team_request in team_requests:
            push_results.append(await asyncio.to_thread(
                CricketDataService.push_player_stats_reference,
                team_request,
                token,
                task.match_url,
            ))

        if push_results and all(push_results):
            await self._set_cached_reference_payload(task.match_id, bundle)
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_series_reference_failed")

    async def _process_team_rankings_task(self, task: PlayerStatsTask) -> None:
        adapter = self.registry.get_adapter("crex")
        if adapter is None or not hasattr(adapter, "fetch_standings_reference"):
            logger.warning("Team rankings task skipped because CREX adapter standings extraction is unavailable.")
            await self._record_candidate_result(task.match_id, success=False, error="missing_adapter")
            return

        async with self.pool.get_context() as context:
            reference_payload = await adapter.fetch_standings_reference(context, task.match_url)

        team_requests = self._build_team_rankings_reference_requests(task, reference_payload)
        if not team_requests:
            await self._set_cached_reference_payload(task.match_id, {"teams": []})
            await self._record_candidate_result(task.match_id, success=True)
            return

        bundle = {"teams": team_requests}
        previous_payload = await self._get_cached_reference_payload(task.match_id)
        if previous_payload and self._payload_signature(previous_payload) == self._payload_signature(bundle):
            await self._set_cached_reference_payload(task.match_id, bundle)
            await self._record_candidate_result(task.match_id, success=True)
            return

        token = self._auth_token_provider()
        push_results = [
            await asyncio.to_thread(
                CricketDataService.push_player_stats_reference,
                team_request,
                token,
                task.match_url,
            )
            for team_request in team_requests
        ]
        if push_results and all(push_results):
            await self._set_cached_reference_payload(task.match_id, bundle)
            await self._record_candidate_result(task.match_id, success=True)
        else:
            await self._record_candidate_result(task.match_id, success=False, error="push_team_rankings_failed")

    def _priority_for_candidate(self, candidate: PlayerStatsCandidate) -> int:
        """Priority hierarchy:
        1 = LIVE matches + their standings/player refs (highest)
        2 = Today's upcoming matches + live team rankings + their players
        3 = Completed matches (not yet scraped) + upcoming standings
        4 = Tomorrow's upcoming matches + their players
        5 = Far-future matches / low-priority references
        """
        task_type = candidate.task_type.upper()
        if task_type == "LIVE":
            return 1
        if task_type == "UPCOMING":
            if self._is_within_hours(candidate.scheduled_start_time, 12):
                return 2  # Today's matches
            if self._is_within_hours(candidate.scheduled_start_time, 36):
                return 4  # Tomorrow's matches
            return 5
        if task_type == "COMPLETED":
            if not candidate.last_success_at:
                return 3  # Never scraped completed match
            return 5  # Already scraped
        if task_type in {"PLAYER_REFERENCE", "TEAM_REFERENCE", "SERIES_REFERENCE"}:
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            if source_type == "LIVE":
                return 1  # Live reference data is critical UX
            if source_type == "UPCOMING":
                return 2
            if source_type == "COMPLETED":
                if not candidate.last_success_at:
                    return 3
                return 4
            return 4
        if task_type == "SERIES_STANDINGS":
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            if source_type == "LIVE":
                return 0  # Standings are the primary series surface
            if source_type == "UPCOMING":
                return 0
            if source_type == "COMPLETED" and not candidate.last_success_at:
                return 0
            return 5
        if task_type == "TEAM_RANKINGS":
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            if source_type == "LIVE":
                return 2  # Team stats for live match viewers
            if source_type == "UPCOMING":
                return 3
            return 5
        return 5

    @staticmethod
    def _is_within_hours(scheduled_start_time, hours: int) -> bool:
        """Check if a match is scheduled within the next N hours."""
        if not scheduled_start_time:
            return False
        try:
            start_ms = int(scheduled_start_time)
            now_ms = int(time.time() * 1000)
            return start_ms <= now_ms + hours * 3600 * 1000
        except (TypeError, ValueError):
            return False

    def _cooldown_for_candidate(self, candidate: PlayerStatsCandidate) -> float:
        task_type = candidate.task_type.upper()
        if task_type == "LIVE":
            return float(self.settings.player_stats_live_cooldown_seconds)
        if task_type == "COMPLETED":
            # Completed matches: scrape once then long cooldown
            if not candidate.last_success_at:
                return 30.0
            return 24 * 3600.0
        if task_type in {"PLAYER_REFERENCE", "TEAM_REFERENCE", "SERIES_REFERENCE"}:
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            # First-time scrape: minimal cooldown so we
            # quickly populate stats for live match references
            if not candidate.last_success_at:
                return 30.0
            # Live references refresh on live cadence (lineup can change)
            if source_type == "LIVE":
                return float(self.settings.player_stats_live_cooldown_seconds) * 4
            return max(float(self.settings.player_stats_cache_ttl_seconds), 6 * 3600.0)
        if task_type == "SERIES_STANDINGS":
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            if not candidate.last_success_at:
                return 60.0
            # Live standings must refresh frequently for UX
            if source_type == "LIVE":
                return float(self.settings.player_stats_live_cooldown_seconds)
            return max(float(self.settings.player_stats_upcoming_cooldown_seconds), 1800.0)
        if task_type == "TEAM_RANKINGS":
            source_type = str(candidate.metadata.get("sourceMatchTaskType") or "").upper()
            if not candidate.last_success_at:
                return 60.0
            # Live team rankings refresh on a moderate cadence
            if source_type == "LIVE":
                return float(self.settings.player_stats_live_cooldown_seconds) * 2
            return max(float(self.settings.player_stats_cache_ttl_seconds), 6 * 3600.0)

        cooldown = float(self.settings.player_stats_upcoming_cooldown_seconds)
        if candidate.scheduled_start_time:
            seconds_until_start = max((candidate.scheduled_start_time / 1000.0) - time.time(), 0.0)
            if seconds_until_start > 6 * 3600:
                cooldown = max(cooldown, self.settings.player_stats_upcoming_cooldown_seconds * 2)
        return cooldown

    async def _discover_reference_candidates(self, task: PlayerStatsTask, seed_payload: Dict[str, Any]) -> None:
        if self._candidate_lock is None:
            return

        teams = self._collect_task_teams(task.metadata, seed_payload)
        self._remember_team_aliases(*(team.get("name") for team in teams))

        for team in teams:
            team_url = str(team.get("url") or "").strip()
            team_name = str(team.get("name") or "").strip()
            if not team_url or not team_name:
                continue
            team_external_id = team.get("externalId") or self._build_external_id("team", team_name)
            candidate_id = f"reference:{team_external_id}:profile"
            await self._upsert_reference_candidate(
                candidate_id=candidate_id,
                match_url=team_url,
                task_type="TEAM_REFERENCE",
                metadata={
                    "_candidate_scope": "reference",
                    "sourceMatchTaskType": task.task_type,
                    "team": {
                        "externalId": team_external_id,
                        "name": team_name,
                        "shortName": team.get("shortName") or team.get("teamCode") or self._build_short_name(team_name),
                        "teamCode": team.get("teamCode") or team.get("shortName") or self._build_short_name(team_name),
                    },
                    "sourceMatchUrl": task.match_url,
                },
            )
            if task.task_type.upper() == "LIVE":
                await self._enqueue_candidate_now(candidate_id, bypass_rate_limit=True)

        for player in seed_payload.get("players") or []:
            player_url = str(player.get("player_url") or "").strip()
            player_name = str(player.get("player_name") or "").strip()
            if not player_url or not player_name:
                continue
            external_id = self._extract_external_id(player_url, "player", player_name)
            candidate_id = f"reference:{external_id}"
            await self._upsert_reference_candidate(
                candidate_id=candidate_id,
                match_url=player_url,
                task_type="PLAYER_REFERENCE",
                metadata={
                    "_candidate_scope": "reference",
                    "sourceMatchTaskType": task.task_type,
                    "player": {
                        "externalId": external_id,
                        "name": player_name,
                        "shortName": self._build_short_player_name(player_name),
                        "role": player.get("player_role"),
                        "captain": bool(player.get("is_captain")),
                        "wicketKeeper": bool(player.get("is_wicket_keeper")),
                        "lineupOrder": player.get("lineup_order"),
                    },
                    "sourceMatchUrl": task.match_url,
                    "series": self._build_series_payload(task.metadata, seed_payload),
                    "team": self._build_team_payload(player.get("team_name")),
                },
            )
            if task.task_type.upper() == "LIVE":
                await self._enqueue_candidate_now(candidate_id, bypass_rate_limit=True)

        series_payload = self._build_series_payload(task.metadata, seed_payload)
        series_url = str(seed_payload.get("series_url") or task.metadata.get("seriesUrl") or "").strip()
        if series_url and series_payload:
            series_candidate_id = f"reference:{series_payload['externalId']}:profile"
            await self._upsert_reference_candidate(
                candidate_id=series_candidate_id,
                match_url=series_url,
                task_type="SERIES_REFERENCE",
                metadata={
                    "_candidate_scope": "reference",
                    "sourceMatchTaskType": task.task_type,
                    "series": series_payload,
                    "teams": teams,
                    "sourceMatchUrl": task.match_url,
                },
            )
            if task.task_type.upper() in {"LIVE", "UPCOMING"}:
                await self._enqueue_candidate_now(series_candidate_id, bypass_rate_limit=True)

            standings_candidate_id = f"reference:{series_payload['externalId']}:standings"
            await self._upsert_reference_candidate(
                candidate_id=standings_candidate_id,
                match_url=self._build_series_standings_url(series_url),
                task_type="SERIES_STANDINGS",
                metadata={
                    "_candidate_scope": "reference",
                    "sourceMatchTaskType": task.task_type,
                    "series": series_payload,
                    "teams": teams,
                    "sourceMatchUrl": task.match_url,
                },
            )
            # The table is the primary series surface. Schedule its first
            # scrape immediately; previously it waited behind player/team refs
            # and was frequently rate-limited out of the queue.
            if task.task_type.upper() in {"LIVE", "UPCOMING", "COMPLETED"}:
                await self._enqueue_candidate_now(standings_candidate_id, bypass_rate_limit=True)

        rankings_url = self._build_team_rankings_url(task.metadata, seed_payload)
        if rankings_url and teams:
            scope_key = "women" if "/women/" in rankings_url else "men"
            await self._upsert_reference_candidate(
                candidate_id=f"reference:team-rankings:{scope_key}",
                match_url=rankings_url,
                task_type="TEAM_RANKINGS",
                metadata={
                    "_candidate_scope": "reference",
                    "sourceMatchTaskType": task.task_type,
                    "teams": teams,
                    "sourceMatchUrl": task.match_url,
                },
            )

    async def _upsert_reference_candidate(
        self,
        *,
        candidate_id: str,
        match_url: str,
        task_type: str,
        metadata: Dict[str, Any],
    ) -> None:
        if self._candidate_lock is None:
            return
        async with self._candidate_lock:
            existing = self._candidates.get(candidate_id)
            candidate = PlayerStatsCandidate(
                match_id=candidate_id,
                match_url=match_url,
                task_type=task_type,
                metadata=dict(metadata),
            )
            if existing:
                candidate.next_due_at = existing.next_due_at
                candidate.last_attempt_at = existing.last_attempt_at
                candidate.last_success_at = existing.last_success_at
                candidate.last_error = existing.last_error
                candidate.metadata = self._merge_candidate_metadata(existing.metadata, candidate.metadata)
            self._candidates[candidate_id] = candidate

    async def _enqueue_candidate_now(self, candidate_id: str, *, bypass_rate_limit: bool = False) -> bool:
        if self._candidate_lock is None:
            return False

        async with self._candidate_lock:
            candidate = self._candidates.get(candidate_id)
            if candidate is None:
                return False
            if candidate.next_due_at > time.time():
                return False
            task = PlayerStatsTask(
                priority=self._priority_for_candidate(candidate),
                match_id=candidate.match_id,
                match_url=candidate.match_url,
                task_type=candidate.task_type,
                scheduled_start_time=candidate.scheduled_start_time,
                metadata=dict(candidate.metadata),
            )

        enqueued = await self.scheduler.enqueue(task, bypass_rate_limit=bypass_rate_limit)
        if enqueued:
            await self._mark_candidate_enqueued(candidate_id)
        return enqueued

    @staticmethod
    def _merge_candidate_metadata(existing: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(existing or {})
        for key, value in (incoming or {}).items():
            if key == "teams":
                merged[key] = PlayerStatsCrawlerService._merge_team_lists(merged.get(key), value)
            elif key == "sourceMatchTaskType":
                # Keep the higher-urgency source: LIVE > UPCOMING > other
                _priority = {"LIVE": 0, "UPCOMING": 1}
                old_p = _priority.get(str(merged.get(key) or "").upper(), 99)
                new_p = _priority.get(str(value or "").upper(), 99)
                merged[key] = value if new_p <= old_p else merged.get(key, value)
            elif isinstance(merged.get(key), dict) and isinstance(value, dict):
                nested = dict(merged.get(key) or {})
                nested.update(value)
                merged[key] = nested
            else:
                merged[key] = value
        return merged

    @staticmethod
    def _merge_team_lists(existing: Any, incoming: Any) -> List[Dict[str, Any]]:
        merged: Dict[str, Dict[str, Any]] = {}
        for item in list(existing or []) + list(incoming or []):
            if not isinstance(item, dict):
                continue
            team_id = str(item.get("externalId") or item.get("name") or "").strip().lower()
            if not team_id:
                continue
            prior = merged.get(team_id, {})
            updated = dict(prior)
            updated.update(item)
            merged[team_id] = updated
        return list(merged.values())

    def _build_player_reference_request(self, task: PlayerStatsTask, reference_payload: Dict[str, Any]) -> Dict[str, Any]:
        captured_at = int(time.time() * 1000)
        player_meta = dict(task.metadata.get("player") or {})
        profile = dict(reference_payload.get("profile") or {})
        player_name = str(
            reference_payload.get("player_name")
            or profile.get("name")
            or player_meta.get("name")
            or "Unknown Player"
        ).strip()
        player_url = str(reference_payload.get("url") or task.match_url or "").strip()
        player = {
            "externalId": player_meta.get("externalId") or self._extract_external_id(player_url, "player", player_name),
            "name": player_name,
            "shortName": player_meta.get("shortName") or self._build_short_player_name(player_name),
            "role": profile.get("role") or player_meta.get("role"),
            "battingStyle": profile.get("bats"),
            "bowlingStyle": profile.get("bowls"),
            "country": profile.get("nationality") or profile.get("country"),
            "imageUrl": profile.get("image_url"),
            "captain": player_meta.get("captain"),
            "wicketKeeper": player_meta.get("wicketKeeper"),
            "probable": None,
            "announced": None,
            "lineupOrder": player_meta.get("lineupOrder"),
            "stats": [],
        }
        snapshots: List[Dict[str, Any]] = []
        if profile:
            snapshots.append({
                "category": "player_profile",
                "label": "Profile",
                "capturedAt": captured_at,
                "payload": {
                    "profile": profile,
                    "pageTitle": reference_payload.get("page_title"),
                    "sourceMatchUrl": task.metadata.get("sourceMatchUrl"),
                },
            })

        recent_form = reference_payload.get("recent_form") or {}
        if any(recent_form.get(section) for section in ("batting", "bowling")):
            snapshots.append({
                "category": "recent_form",
                "label": "Recent form",
                "capturedAt": captured_at,
                "payload": recent_form,
            })

        for label, stats in (reference_payload.get("career_stats") or {}).items():
            if not isinstance(stats, dict):
                continue
            rows = stats.get("rows") or []
            if not rows:
                continue
            snapshots.append({
                "category": f"career_{self._slugify(label)}",
                "label": f"Career {self._display_label(label)}",
                "capturedAt": captured_at,
                "payload": stats,
            })

        teams_played_for = reference_payload.get("teams_played_for") or []
        if teams_played_for:
            snapshots.append({
                "category": "teams_played_for",
                "label": "Teams played for",
                "capturedAt": captured_at,
                "payload": teams_played_for,
            })

        return {
            "url": player_url,
            "source": "crex",
            "capturedAt": captured_at,
            "player": player,
            "snapshots": snapshots,
        }

    def _build_series_reference_requests(
        self,
        task: PlayerStatsTask,
        reference_payload: Dict[str, Any],
    ) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
        captured_at = int(time.time() * 1000)
        series = self._build_series_payload(task.metadata, reference_payload)
        sections = reference_payload.get("sections") or []
        series_snapshots: List[Dict[str, Any]] = []
        team_requests: Dict[str, Dict[str, Any]] = {}

        for section in sections:
            label = str(section.get("label") or "Points Table").strip() or "Points Table"
            normalized_rows = self._normalize_team_rows(section.get("rows") or [], fallback_label=label)
            if normalized_rows:
                category = self._build_reference_category("points_table", label)
                series_snapshots.append({
                    "category": category,
                    "label": label,
                    "capturedAt": captured_at,
                    "payload": normalized_rows,
                })
                for row in normalized_rows:
                    team_request = team_requests.setdefault(
                        row["teamExternalId"],
                        self._build_team_reference_request_template(
                            task.match_url,
                            row["teamExternalId"],
                            row["teamName"],
                            row.get("teamCode"),
                            captured_at,
                        ),
                    )
                    team_request["snapshots"].append({
                        "category": self._build_reference_category("series_standings", label),
                        "label": f"{label} standings",
                        "capturedAt": captured_at,
                        "payload": {
                            **row,
                            "seriesExternalId": series.get("externalId") if series else None,
                            "seriesName": series.get("name") if series else None,
                            "sourcePageHeading": reference_payload.get("page_heading"),
                        },
                    })

        if reference_payload.get("page_heading") or reference_payload.get("page_title"):
            series_snapshots.append({
                "category": "series_summary",
                "label": "Series summary",
                "capturedAt": captured_at,
                "payload": {
                    "pageHeading": reference_payload.get("page_heading"),
                    "pageTitle": reference_payload.get("page_title"),
                    "sectionCount": reference_payload.get("section_count"),
                },
            })

        series_request = {
            "url": str(reference_payload.get("url") or task.match_url or "").strip(),
            "source": "crex",
            "capturedAt": captured_at,
            "series": series,
            "snapshots": series_snapshots,
        }
        return series_request, list(team_requests.values())

    def _build_team_profile_reference_request(
        self,
        task: PlayerStatsTask,
        reference_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        captured_at = int(time.time() * 1000)
        team_meta = dict(task.metadata.get("team") or {})
        team_name = str(team_meta.get("name") or reference_payload.get("page_heading") or "").strip()
        team_external_id = team_meta.get("externalId") or self._build_external_id("team", team_name)
        request = self._build_team_reference_request_template(
            str(reference_payload.get("url") or task.match_url or "").strip(),
            team_external_id,
            team_name or team_external_id,
            team_meta.get("teamCode") or team_meta.get("shortName"),
            captured_at,
        )
        request["snapshots"] = self._build_generic_reference_snapshots("team", reference_payload, captured_at)
        return request

    def _build_series_profile_reference_request(
        self,
        task: PlayerStatsTask,
        reference_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        captured_at = int(time.time() * 1000)
        series = self._build_series_payload(task.metadata, reference_payload)
        if series is None:
            series = dict(task.metadata.get("series") or {})
        return {
            "url": str(reference_payload.get("url") or task.match_url or "").strip(),
            "source": "crex",
            "capturedAt": captured_at,
            "series": series,
            "snapshots": self._build_generic_reference_snapshots("series", reference_payload, captured_at),
        }

    def _build_generic_reference_snapshots(
        self,
        prefix: str,
        reference_payload: Dict[str, Any],
        captured_at: int,
    ) -> List[Dict[str, Any]]:
        snapshots: List[Dict[str, Any]] = []
        if reference_payload.get("page_heading") or reference_payload.get("page_title"):
            snapshots.append({
                "category": f"{prefix}_summary",
                "label": f"{self._display_label(prefix)} summary",
                "capturedAt": captured_at,
                "payload": {
                    "pageHeading": reference_payload.get("page_heading"),
                    "pageTitle": reference_payload.get("page_title"),
                    "sectionCount": reference_payload.get("section_count"),
                },
            })

        for section in reference_payload.get("sections") or []:
            label = str(section.get("label") or "Details").strip() or "Details"
            rows = section.get("rows") or []
            if not rows:
                continue
            snapshots.append({
                "category": self._build_reference_category(f"{prefix}_section", label),
                "label": label,
                "capturedAt": captured_at,
                "payload": {
                    "headers": section.get("headers") or [],
                    "rows": rows,
                },
            })

        return snapshots

    def _build_team_rankings_reference_requests(
        self,
        task: PlayerStatsTask,
        reference_payload: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        captured_at = int(time.time() * 1000)
        requested_teams = {
            str(team.get("externalId") or "").strip().lower(): dict(team)
            for team in task.metadata.get("teams") or []
            if isinstance(team, dict) and (team.get("externalId") or team.get("name"))
        }
        requests: Dict[str, Dict[str, Any]] = {}

        for section in reference_payload.get("sections") or []:
            label = str(section.get("label") or "Ranking").strip() or "Ranking"
            rows = self._normalize_team_rows(section.get("rows") or [], fallback_label=label)
            if not rows:
                continue
            for row in rows:
                team_id = str(row["teamExternalId"]).lower()
                if requested_teams and team_id not in requested_teams:
                    continue
                request = requests.setdefault(
                    row["teamExternalId"],
                    self._build_team_reference_request_template(
                        task.match_url,
                        row["teamExternalId"],
                        requested_teams.get(team_id, {}).get("name") or row["teamName"],
                        requested_teams.get(team_id, {}).get("teamCode") or row.get("teamCode"),
                        captured_at,
                    ),
                )
                request["snapshots"].append({
                    "category": self._build_reference_category("team_ranking", label),
                    "label": f"{label} ranking",
                    "capturedAt": captured_at,
                    "payload": {
                        **row,
                        "sourcePageHeading": reference_payload.get("page_heading"),
                        "sourcePageTitle": reference_payload.get("page_title"),
                    },
                })

        return list(requests.values())

    def _build_team_reference_request_template(
        self,
        source_url: str,
        external_id: str,
        team_name: str,
        team_code: Optional[str],
        captured_at: int,
    ) -> Dict[str, Any]:
        resolved_name = self._resolve_team_alias(team_name) or team_name
        short_name = team_code or self._build_short_name(resolved_name)
        return {
            "url": source_url,
            "source": "crex",
            "capturedAt": captured_at,
            "team": {
                "externalId": external_id,
                "name": resolved_name,
                "shortName": short_name,
                "teamCode": short_name,
            },
            "snapshots": [],
        }

    def _normalize_team_rows(self, rows: List[Dict[str, Any]], *, fallback_label: str) -> List[Dict[str, Any]]:
        normalized_rows: List[Dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            team_label = (
                row.get("Team")
                or row.get("Name")
                or row.get("team")
                or row.get("name")
            )
            if not team_label:
                continue
            resolved_name = self._resolve_team_alias(str(team_label))
            display_name = resolved_name or str(team_label).strip()
            external_id = self._build_external_id("team", display_name)
            normalized_rows.append({
                "teamExternalId": external_id,
                "teamName": display_name,
                "teamCode": self._build_short_name(display_name),
                "section": fallback_label,
                **{self._display_label(self._slugify(key)): value for key, value in row.items()},
            })
        return normalized_rows

    def _collect_task_teams(self, metadata: Dict[str, Any], seed_payload: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        names: List[str] = []
        for key in ("team1Name", "team2Name"):
            value = str(metadata.get(key) or "").strip()
            if value:
                names.append(value)
        for player in (seed_payload or {}).get("players") or []:
            value = str(player.get("team_name") or "").strip()
            if value:
                names.append(value)
        deduped: Dict[str, Dict[str, Any]] = {}
        for name in names:
            resolved_name = self._resolve_team_alias(name) or name
            external_id = self._build_external_id("team", resolved_name)
            deduped[external_id] = {
                "externalId": external_id,
                "name": resolved_name,
                "shortName": self._build_short_name(resolved_name),
                "teamCode": self._build_short_name(resolved_name),
            }
        for link in (seed_payload or {}).get("team_links") or []:
            if not isinstance(link, dict):
                continue
            name = str(link.get("name") or "").strip()
            url = str(link.get("url") or "").strip()
            if not name:
                continue
            resolved_name = self._resolve_team_alias(name) or name
            external_id = link.get("externalId") or self._build_external_id("team", resolved_name)
            team_code = link.get("teamCode") or self._build_short_name(resolved_name)
            existing = deduped.get(external_id, {})
            deduped[external_id] = {
                "externalId": external_id,
                "name": existing.get("name") or resolved_name,
                "shortName": existing.get("shortName") or team_code,
                "teamCode": existing.get("teamCode") or team_code,
                "url": url or existing.get("url"),
            }
        return list(deduped.values())

    def _build_team_payload(self, team_name: Any) -> Optional[Dict[str, Any]]:
        normalized = str(team_name or "").strip()
        if not normalized:
            return None
        resolved_name = self._resolve_team_alias(normalized) or normalized
        code = self._build_short_name(resolved_name)
        return {
            "externalId": self._build_external_id("team", resolved_name),
            "name": resolved_name,
            "shortName": code,
            "teamCode": code,
        }

    def _build_series_payload(
        self,
        metadata: Dict[str, Any],
        seed_payload: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        source = seed_payload or {}
        existing_series = metadata.get("series") if isinstance(metadata.get("series"), dict) else {}
        series_name = str(
            source.get("series_name")
            or metadata.get("seriesName")
            or metadata.get("competitionName")
            or existing_series.get("name")
            or ""
        ).strip()
        if not series_name:
            return None
        season_name = str(metadata.get("seasonName") or metadata.get("season") or existing_series.get("seasonName") or "").strip() or None
        short_name = str(metadata.get("seriesShortName") or existing_series.get("shortName") or "").strip() or None
        return {
            "externalId": source.get("series_external_id") or existing_series.get("externalId") or self._build_external_id("series", series_name),
            "name": series_name,
            "shortName": short_name,
            "seasonName": season_name,
        }

    def _build_crex_entity_url(self, scope: str, name: Any, code: Any) -> Optional[str]:
        normalized_code = str(code or "").strip()
        normalized_name = str(name or "").strip()
        if not normalized_code or not normalized_name:
            return None
        slug = re.sub(r"[^a-z0-9]+", "-", normalized_name.lower()).strip("-")
        if not slug:
            return None
        return f"https://crex.live/{scope}/{slug}-{normalized_code}"

    def _build_series_standings_url(self, series_url: str) -> str:
        trimmed = str(series_url or "").strip().rstrip("/")
        if not trimmed:
            return trimmed
        if trimmed.endswith("/points-table") or trimmed.endswith("/standings"):
            return trimmed
        return f"{trimmed}/points-table"

    def _build_team_rankings_url(self, metadata: Dict[str, Any], seed_payload: Optional[Dict[str, Any]] = None) -> Optional[str]:
        source_text = " ".join(
            str(value or "")
            for value in (
                metadata.get("gender"),
                metadata.get("seriesName"),
                metadata.get("competitionName"),
                (seed_payload or {}).get("series_name"),
            )
        ).lower()
        scope = "women" if "women" in source_text else "men"
        return f"https://crex.com/rankings/{scope}/teams"

    def _remember_team_aliases(self, *team_names: Any) -> None:
        for team_name in team_names:
            normalized = str(team_name or "").strip()
            if not normalized:
                continue
            lookup_name = normalized
            self._team_aliases[self._normalize_lookup_key(lookup_name)] = lookup_name
            self._team_aliases[self._normalize_lookup_key(self._build_short_name(lookup_name))] = lookup_name
            for token in re.findall(r"[A-Za-z0-9]+", lookup_name or ""):
                if len(token) <= 4:
                    self._team_aliases.setdefault(self._normalize_lookup_key(token), lookup_name)

    @staticmethod
    def _normalize_lookup_key(value: Any) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())

    def _resolve_team_alias(self, value: Any) -> Optional[str]:
        normalized = str(value or "").strip()
        if not normalized:
            return None
        return self._team_aliases.get(self._normalize_lookup_key(normalized), normalized)

    @staticmethod
    def _candidate_scope(candidate: PlayerStatsCandidate) -> str:
        return str((candidate.metadata or {}).get("_candidate_scope") or "match")

    async def _get_cached_reference_payload(self, resource_id: str) -> Optional[Dict[str, Any]]:
        getter = getattr(self.cache, "get_player_stats_reference", None)
        if callable(getter):
            return await getter(resource_id)
        return await self.cache.get_player_stats_seed(resource_id)

    async def _set_cached_reference_payload(self, resource_id: str, payload: Dict[str, Any]) -> None:
        setter = getattr(self.cache, "set_player_stats_reference", None)
        if callable(setter):
            await setter(resource_id, payload, ttl=max(self.settings.player_stats_cache_ttl_seconds, 21600))
            return
        await self.cache.set_player_stats_seed(
            resource_id,
            payload,
            ttl=max(self.settings.player_stats_cache_ttl_seconds, 21600),
        )

    @staticmethod
    def _slugify(value: Any) -> str:
        return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_") or "unknown"

    @staticmethod
    def _display_label(value: str) -> str:
        words = [word for word in str(value or "").replace("-", "_").split("_") if word]
        return " ".join(word.capitalize() for word in words) or "Unknown"

    def _build_reference_category(self, prefix: str, label: str) -> str:
        slug = self._slugify(label)
        if slug in {"table_1", "points_table"}:
            return prefix
        return f"{prefix}_{slug}"

    @staticmethod
    def _payload_signature(payload: Dict[str, Any]) -> str:
        return json.dumps(PlayerStatsCrawlerService._strip_dynamic_fields(payload), sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _ensure_variant(url: str, variant: str) -> str:
        return ensure_crex_variant(url, variant)

    @staticmethod
    def _extract_match_id(url: str) -> Optional[str]:
        match_key = extract_crex_match_key(url)
        if not match_key:
            return None
        return f"crex:{match_key}"

    def _build_ingestion_request(
        self,
        task: PlayerStatsTask,
        seed_payload: Dict[str, Any],
        live_payload: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        captured_at = int(time.time() * 1000)
        live_batting = self._index_live_entries((live_payload or {}).get("batsman_data") or [])
        live_bowling = self._index_live_entries((live_payload or {}).get("bowler_data") or [])

        teams: Dict[str, Dict[str, Any]] = {}
        for player in seed_payload.get("players") or []:
            team_name = self._resolve_team_name(player, task.metadata)
            team_entry = teams.setdefault(
                team_name,
                {
                    "externalId": self._build_external_id("team", team_name),
                    "name": team_name,
                    "shortName": self._build_short_name(team_name),
                    "teamCode": self._build_short_name(team_name),
                    "squad": [],
                },
            )
            player_name = (player.get("player_name") or "").strip()
            if not player_name:
                continue

            stats: List[Dict[str, Any]] = [
                {
                    "category": "seed_context",
                    "label": "Playing XI seed",
                    "capturedAt": captured_at,
                    "payload": {
                        "taskType": task.task_type,
                        "source": player.get("source"),
                        "playerUrl": player.get("player_url"),
                        "playerRole": player.get("player_role"),
                        "lineupOrder": player.get("lineup_order"),
                        "matchInfo": {
                            "matchName": seed_payload.get("match_name"),
                            "matchDate": seed_payload.get("match_date"),
                            "startDate": seed_payload.get("start_date"),
                            "venue": seed_payload.get("venue"),
                            "tossInfo": seed_payload.get("toss_info"),
                        },
                    },
                }
            ]

            batting_stats = live_batting.get(self._normalize_person_name(player_name))
            if batting_stats:
                stats.append({
                    "category": "live_batting",
                    "label": "Live batting",
                    "capturedAt": captured_at,
                    "payload": batting_stats,
                })

            bowling_stats = live_bowling.get(self._normalize_person_name(player_name))
            if bowling_stats:
                stats.append({
                    "category": "live_bowling",
                    "label": "Live bowling",
                    "capturedAt": captured_at,
                    "payload": bowling_stats,
                })

            team_entry["squad"].append(
                {
                    "externalId": self._extract_external_id(player.get("player_url"), "player", player_name),
                    "name": player_name,
                    "shortName": self._build_short_player_name(player_name),
                    "role": player.get("player_role"),
                    "battingStyle": None,
                    "bowlingStyle": None,
                    "country": None,
                    "imageUrl": None,
                    "captain": bool(player.get("is_captain")),
                    "wicketKeeper": bool(player.get("is_wicket_keeper")),
                    "probable": task.task_type.upper() != "LIVE",
                    "announced": True,
                    "lineupOrder": player.get("lineup_order"),
                    "stats": stats,
                }
            )

        ordered_teams = self._order_teams(list(teams.values()), task.metadata)
        return {
            "url": task.match_url,
            "matchExternalKey": self._extract_match_key(task.match_url),
            "source": "crex",
            "capturedAt": captured_at,
            "series": self._build_series_payload(task.metadata, seed_payload),
            "teams": ordered_teams,
        }

    @staticmethod
    def _index_live_entries(entries: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        indexed: Dict[str, Dict[str, Any]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = PlayerStatsCrawlerService._normalize_person_name(entry.get("name"))
            if name:
                indexed[name] = dict(entry)
        return indexed

    @staticmethod
    def _normalize_person_name(value: Any) -> str:
        normalized = re.sub(r"\s+", " ", str(value or "")).strip().lower()
        normalized = re.sub(r"\s*\((c|wk)\)\s*", "", normalized)
        return normalized

    @staticmethod
    def _build_short_name(team_name: str) -> str:
        words = re.findall(r"[A-Za-z0-9]+", team_name or "")
        if not words:
            return "TBD"
        if len(words) == 1:
            return words[0][:3].upper()
        return "".join(word[0] for word in words[:4]).upper()

    @staticmethod
    def _build_short_player_name(player_name: str) -> str:
        words = re.findall(r"[A-Za-z0-9]+", player_name or "")
        if len(words) >= 2:
            return f"{words[0][0].upper()} {' '.join(words[1:])}".strip()
        if words:
            return words[0]
        return "Unknown Player"

    @staticmethod
    def _build_external_id(prefix: str, value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")
        return f"{prefix}:{slug or 'unknown'}"

    def _extract_external_id(self, player_url: Any, prefix: str, fallback_name: str) -> str:
        raw = str(player_url or "").strip().rstrip("/")
        if raw:
            slug = raw.split("/")[-1]
            slug = slug.split("?")[0]
            if slug:
                return f"{prefix}:{slug}"
        return self._build_external_id(prefix, fallback_name)

    def _resolve_team_name(self, player: Dict[str, Any], metadata: Dict[str, Any]) -> str:
        team_name = (player.get("team_name") or "").strip()
        if team_name:
            resolved_name = self._resolve_team_alias(team_name) or team_name
            self._remember_team_aliases(resolved_name)
            return resolved_name
        for key in ("team1Name", "team2Name"):
            value = str(metadata.get(key) or "").strip()
            if value:
                resolved_name = self._resolve_team_alias(value) or value
                self._remember_team_aliases(resolved_name)
                return resolved_name
        return "Unknown Team"

    def _order_teams(self, teams: List[Dict[str, Any]], metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        preferred_order = []
        for key in ("team1Name", "team2Name"):
            value = str(metadata.get(key) or "").strip()
            if value:
                preferred_order.append(value.lower())

        if not preferred_order:
            return teams

        return sorted(
            teams,
            key=lambda team: preferred_order.index(team["name"].lower()) if team["name"].lower() in preferred_order else len(preferred_order),
        )

    @staticmethod
    def _extract_match_key(match_url: str) -> Optional[str]:
        return extract_crex_match_key(match_url)

    @staticmethod
    def _strip_dynamic_fields(payload: Any) -> Any:
        if isinstance(payload, dict):
            stripped: Dict[str, Any] = {}
            for key, value in payload.items():
                if key in {"capturedAt"}:
                    continue
                stripped[key] = PlayerStatsCrawlerService._strip_dynamic_fields(value)
            return stripped
        if isinstance(payload, list):
            return [PlayerStatsCrawlerService._strip_dynamic_fields(item) for item in payload]
        return payload
