"""
Main Scraper Service.
Coordinates browser pool, scheduler, cache, and adapters.
"""

import asyncio
import logging
import os
import signal
import threading
import time
from typing import Optional, Dict, Any

from .config import get_settings
from .browser_pool import AsyncBrowserPool
from .scheduler import AsyncScheduler, ScrapeTask
from .cache import ScrapeCache
from .metrics import MetricsCollector
from .health import HealthGrader
from .adapters.registry import AdapterRegistry
from .crex_url_utils import extract_crex_match_key, get_crex_details_url
from .cricket_data_service import CricketDataService
from .discovery import LiveMatchDiscoverer
from .player_stats_crawler import PlayerStatsCrawlerService

logger = logging.getLogger(__name__)

class CrexScraperService:
    """
    High-reliability async scraper service.
    """

    def __init__(self):
        self.settings = get_settings()
        self.pool = AsyncBrowserPool()
        self.scheduler = AsyncScheduler()
        self.cache = ScrapeCache()
        self.metrics = MetricsCollector()
        self.health = HealthGrader()
        self._running = False
        self._workers = []
        self._monitor_task: Optional[asyncio.Task] = None
        self._poll_task: Optional[asyncio.Task] = None
        self._fast_poll_task: Optional[asyncio.Task] = None  # Persistent pages poll loop
        self._auth_token: Optional[str] = None
        self._last_full_live_scrape_at: Dict[str, float] = {}
        self._restart_lock = threading.Lock()
        self._container_restart_scheduled = False
        self._last_live_match_count = 0
        
        # Persistent page pool and fast poll service (Feature 007 - Phase 2)
        self.persistent_page_pool = None
        self.fast_poll_service = None
        self._active_match_ids: set = set()  # Track matches being polled
        
        if self.settings.enable_persistent_pages:
            from .core.persistent_page_pool import PersistentPagePool
            from .core.fast_poll_service import FastPollService
            
            self.persistent_page_pool = PersistentPagePool(
                max_pages=self.settings.persistent_page_max_count,
                max_age_seconds=self.settings.persistent_page_max_age_seconds,
                max_errors=self.settings.persistent_page_max_errors,
            )
            self.fast_poll_service = FastPollService(
                poll_interval_ms=self.settings.fast_poll_interval_ms,
                timeout_ms=5000,
            )
            logger.info("Persistent pages feature enabled")
        
        # Fast update manager (Feature 007)
        # Must be initialized before registry so we can wire callbacks
        self.fast_update_manager = None
        on_sv3_callback = None
        on_sc4_callback = None
        
        if self.settings.enable_fast_updates:
            from .core.fast_update_manager import FastUpdateManager
            self.fast_update_manager = FastUpdateManager(
                metrics=self.metrics,
            )
            on_sv3_callback = self.fast_update_manager.on_sv3_update
            on_sc4_callback = self.fast_update_manager.on_sc4_update
        
        # Create registry with callbacks wired and auth token provider for immediate push
        # Also pass cache for localStorage caching (Feature 007)
        self.registry = AdapterRegistry(
            on_sv3_update=on_sv3_callback,
            on_sc4_update=on_sc4_callback,
            auth_token_provider=lambda: self._auth_token,  # Provide current token for immediate pushes
            cache=self.cache,  # Pass cache for localStorage caching
        )
        self.player_stats_crawler = None
        if self.settings.enable_player_stats_crawler:
            self.player_stats_crawler = PlayerStatsCrawlerService(
                pool=self.pool,
                cache=self.cache,
                registry=self.registry,
                auth_token_provider=lambda: self._auth_token,
            )

        self.discovery = LiveMatchDiscoverer(
            self.pool,
            on_match_catalog_updated=self._on_match_catalog_updated,
        )

    async def start(self):
        """Start the scraper service."""
        logger.info("Starting CrexScraperService...")
        self._running = True
        
        # Initialize components
        await self.cache.connect()
        await self.scheduler.setup()
        await self.pool.setup()
        # Fetch initial auth token
        try:
            self._auth_token = await asyncio.to_thread(CricketDataService.get_bearer_token)
            if self._auth_token:
                logger.info("Initial auth token obtained.")
            else:
                logger.warning("Failed to obtain initial auth token.")
        except Exception as e:
            logger.error(f"Auth token fetch failed: {e}")

        if self.player_stats_crawler:
            await self.player_stats_crawler.start()
            logger.info("PlayerStatsCrawlerService started.")

        # Start worker tasks
        for i in range(self.settings.concurrency_cap):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
            
        # Start monitor task
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        # Start poll task
        self._poll_task = asyncio.create_task(self._poll_loop())
        
        # Start fast poll task for persistent pages (Feature 007 - Phase 2)
        if self.persistent_page_pool and self.fast_poll_service:
            self._fast_poll_task = asyncio.create_task(self._fast_poll_loop())
            logger.info("Fast poll loop started for persistent pages")

        # Start discovery task
        await self.discovery.start()
        
        # Start fast update manager (Feature 007)
        if self.fast_update_manager:
            await self.fast_update_manager.start()
            logger.info("FastUpdateManager started.")
            
        logger.info(f"Started {len(self._workers)} worker tasks.")

    async def stop(self):
        """Stop the scraper service."""
        logger.info("Stopping CrexScraperService...")
        self._running = False
        
        if self._monitor_task:
            self._monitor_task.cancel()
        
        if self._poll_task:
            self._poll_task.cancel()
        
        if self._fast_poll_task:
            self._fast_poll_task.cancel()

        await self.discovery.stop()

        if self.player_stats_crawler:
            await self.player_stats_crawler.stop()
            logger.info("PlayerStatsCrawlerService stopped.")
        
        # Stop fast update manager (Feature 007)
        if self.fast_update_manager:
            await self.fast_update_manager.stop()
            logger.info("FastUpdateManager stopped.")
        
        # Stop persistent page pool and fast poll service (Feature 007 - Phase 2)
        if self.fast_poll_service:
            await self.fast_poll_service.stop_all()
            logger.info("FastPollService stopped.")
        if self.persistent_page_pool:
            await self.persistent_page_pool.close_all()
            logger.info("PersistentPagePool closed.")

        try:
            if self._monitor_task: await self._monitor_task
            if self._poll_task: await self._poll_task
            if self._fast_poll_task: await self._fast_poll_task
        except asyncio.CancelledError:
            pass

        await self.scheduler.shutdown()
        await self.pool.shutdown()
        await self.cache.close()
        
        # Cancel workers
        for worker in self._workers:
            worker.cancel()
        
        await asyncio.gather(*self._workers, return_exceptions=True)
        logger.info("CrexScraperService stopped.")

    async def recycle_browser_pool(self, reason: str) -> None:
        """Recycle the browser pool."""
        await self.pool.recycle()
        self.metrics.browser_restarts.labels(reason=reason).inc()
        self.health.add_audit_log(
            "recovery_executed",
            {"action": "browser_recycle", "reason": reason},
            level="WARNING",
        )

    def get_restart_condition(self, summary: Optional[Any] = None) -> Optional[Dict[str, Any]]:
        """Return a hard-restart reason when in-process recovery is no longer enough."""
        summary = summary or self.health.get_summary()
        seconds_since_last_scrape = max(time.time() - summary.last_scrape_timestamp, 0.0)
        stale_restart_threshold = max(
            float(self.settings.staleness_threshold_seconds),
            float(self.settings.memory_restart_grace_seconds),
        )

        if summary.pids_count >= self.settings.pid_restart_threshold:
            return {
                "reason": "pid_threshold_exceeded",
                "metadata": {
                    "pids": summary.pids_count,
                    "pid_restart_threshold": self.settings.pid_restart_threshold,
                },
            }

        if summary.active_matches > 0 and seconds_since_last_scrape >= stale_restart_threshold:
            return {
                "reason": "stale_live_data",
                "metadata": {
                    "active_matches": summary.active_matches,
                    "seconds_since_last_scrape": round(seconds_since_last_scrape, 2),
                    "staleness_threshold_seconds": self.settings.staleness_threshold_seconds,
                    "restart_after_seconds": round(stale_restart_threshold, 2),
                },
            }

        return None

    def schedule_container_restart(
        self,
        reason: str,
        *,
        metadata: Optional[Dict[str, Any]] = None,
        delay_seconds: float = 5.0,
    ) -> bool:
        """Exit the scraper process so Docker restarts the container."""
        payload = dict(metadata or {})

        with self._restart_lock:
            if self._container_restart_scheduled:
                return False
            self._container_restart_scheduled = True

        self.health.add_audit_log(
            "container_restart_scheduled",
            {"reason": reason, "delay_seconds": delay_seconds, **payload},
            level="ERROR",
        )
        logger.critical(
            "Scheduling scraper container restart: reason=%s metadata=%s",
            reason,
            payload,
        )

        if delay_seconds <= 0:
            logger.critical(
                "Exiting scraper process immediately for container restart: reason=%s metadata=%s",
                reason,
                payload,
            )
            os._exit(1)

        def delayed_exit() -> None:
            time.sleep(max(delay_seconds, 0.0))
            logger.critical(
                "Exiting scraper process for container restart: reason=%s metadata=%s",
                reason,
                payload,
            )
            os._exit(1)

        threading.Thread(
            target=delayed_exit,
            daemon=False,
            name="ScraperContainerRestart",
        ).start()
        return True

    async def _poll_loop(self):
        """Periodic backend polling loop."""
        logger.info("Backend poller started.")
        self._poll_iteration = 0
        while self._running:
            try:
                # Refresh token if needed
                if not self._auth_token:
                     self._auth_token = await asyncio.to_thread(CricketDataService.get_bearer_token)

                matches = await asyncio.to_thread(CricketDataService.get_live_matches, self._auth_token)
                live_urls = []
                
                for match in matches:
                    # Handle both dict (from JSON) and string (if backend returns list of strings)
                    url = None
                    if isinstance(match, dict):
                        url = match.get('url') or match.get('matchUrl')
                    elif isinstance(match, str):
                        url = match
                    
                    if url:
                        live_urls.append(url)
                        match_id = self._extract_match_id(url) or url
                        if self._should_submit_live_task(match_id):
                            if await self.submit_task(match_id, url, "LIVE"):
                                self._last_full_live_scrape_at[match_id] = time.monotonic()

                self._last_live_match_count = len(live_urls)
                self.health.set_active_matches(self._last_live_match_count)

                if self.player_stats_crawler:
                    await self.player_stats_crawler.update_live_candidates(live_urls)

                    # Seed full schedule candidates from backend every 5 iterations
                    # or immediately on first iteration (so candidates aren't empty after restart)
                    if self._poll_iteration % 5 == 0:
                        try:
                            all_matches = await asyncio.to_thread(
                                CricketDataService.get_all_matches, self._auth_token
                            )
                            if all_matches:
                                await self.player_stats_crawler.update_candidates(
                                    live_urls, all_matches
                                )
                                logger.info(f"poll.schedule_candidates_seeded count={len(all_matches)}")
                        except Exception as e:
                            logger.warning(f"poll.schedule_seed_error: {e}")

                self._poll_iteration += 1
                await asyncio.sleep(self.settings.polling_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Poll loop error: {e}")
                await asyncio.sleep(5)

    async def _on_match_catalog_updated(self, live_urls: list[str], schedule_matches: list[dict]) -> None:
        if not self.player_stats_crawler:
            return
        await self.player_stats_crawler.update_candidates(live_urls, schedule_matches)

    async def _fast_poll_loop(self):
        """
        Fast poll loop for persistent pages (Feature 007 - Phase 2).
        
        For each live match:
        1. Get or create persistent page
        2. Poll sV3 data via JavaScript fetch
        3. Push data to backend immediately on change
        """
        logger.info("Fast poll loop started.")
        
        while self._running:
            try:
                if not self._auth_token:
                    await asyncio.sleep(1)
                    continue
                
                # Get current live matches from backend
                matches = await asyncio.to_thread(
                    CricketDataService.get_live_matches, 
                    self._auth_token
                )
                
                current_match_urls = set()
                await self.persistent_page_pool.ensure_capacity(len(matches))
                
                for match in matches:
                    url = None
                    if isinstance(match, dict):
                        url = match.get('url') or match.get('matchUrl')
                    elif isinstance(match, str):
                        url = match
                    
                    if not url:
                        continue
                    
                    current_match_urls.add(url)
                    
                    # Extract match ID from URL
                    match_id = self._extract_match_id(url)
                    if not match_id:
                        continue
                    
                    # Check if we already have a persistent page with interceptor
                    if self.persistent_page_pool.is_page_active(match_id):
                        # Page already active with network interceptor - no action needed
                        # sV3 updates come automatically via response listener
                        continue
                    else:
                        # Create new persistent page and attach interceptor
                        try:
                            async with self.pool.get_context() as context:
                                page = await self.persistent_page_pool.get_or_create(
                                    match_id=match_id,
                                    context=context,
                                    url=url,
                                )
                                # Attach network interceptor - sV3 updates flow via callback
                                await self.fast_poll_service.attach_to_page(
                                    page=page,
                                    match_id=match_id,
                                    match_url=url,
                                    on_data=self._on_sv3_intercepted,
                                )
                                logger.info(f"[FASTPOLL] Attached interceptor to {match_id}")
                        except Exception as e:
                            logger.error(f"[FASTPOLL] Failed to create page for {match_id}: {e}")
                
                # Clean up pages for matches that are no longer live
                pool_match_ids = self.persistent_page_pool.match_ids.copy()
                for match_id in pool_match_ids:
                    # Match ID is like "crex:karb-vs-sial-final-quaid-e-azam-trophy-2025"
                    # URL contains the slug like "/karb-vs-sial-final-quaid-e-azam-trophy-2025/"
                    # Extract slug from match_id (remove "crex:" prefix)
                    slug = match_id.replace("crex:", "") if match_id.startswith("crex:") else match_id
                    still_live = any(slug in url for url in current_match_urls)
                    if not still_live:
                        logger.debug(f"[FASTPOLL] Match {match_id} slug={slug} not found in {len(current_match_urls)} URLs")
                        logger.info(f"[FASTPOLL] Match {match_id} no longer live, removing page")
                        self.fast_poll_service.detach(match_id)
                        await self.persistent_page_pool.remove(match_id)
                        self._last_full_live_scrape_at.pop(match_id, None)
                    else:
                        logger.debug(f"[FASTPOLL] Match {match_id} still live")
                
                # Log pool stats periodically
                if self.persistent_page_pool.size > 0:
                    stats = self.persistent_page_pool.get_stats()
                    poll_stats = self.fast_poll_service.get_stats()
                    logger.debug(f"[FASTPOLL] Pool: {stats}, Intercepts: {poll_stats}")
                
                # Wait before checking for new matches (interceptors run passively)
                await asyncio.sleep(self.settings.fast_poll_reconcile_interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[FASTPOLL] Fast poll loop error: {e}")
                await asyncio.sleep(2)
    
    async def _on_sv3_intercepted(self, match_url: str, data: Dict):
        """Callback when sV3 data is intercepted from a persistent page."""
        try:
            match_id = self._extract_match_id(match_url) or match_url
            
            # Record success metric
            self.metrics.record_fast_poll(match_id, "success", 0, "intercept")
            
            # Get cached localStorage for team name decoding (Feature 007)
            local_storage = None
            if match_id:
                try:
                    local_storage = await self.cache.get_local_storage(match_id)
                    if local_storage:
                        logger.debug(f"[FASTPOLL] Got localStorage for {match_id}: {len(local_storage)} items")
                    else:
                        logger.debug(f"[FASTPOLL] No localStorage cached for {match_id}")
                except Exception as e:
                    logger.debug(f"Failed to get localStorage for {match_id}: {e}")
            
            # Push to backend
            if self._auth_token:
                push_success = await asyncio.to_thread(
                    CricketDataService.push_immediate_sv3,
                    data,
                    self._auth_token,
                    match_url,  # source_url parameter
                    local_storage,  # Pass localStorage for team name decoding
                )
                if push_success:
                    logger.info(f"[FASTPOLL] Pushed intercepted sV3 for {match_id}")
                    self.metrics.record_scrape_result("crex_fastpoll", "success", 0.001)
                else:
                    logger.warning(f"[FASTPOLL] Failed to push sV3 for {match_id}")
                    self.metrics.record_persistent_page_error(match_id, "push_failed")
            
            # Update pool metrics
            self.metrics.update_pool_size(self.persistent_page_pool.size)
            
        except Exception as e:
            logger.error(f"[FASTPOLL] Error in sV3 callback: {e}")
    
    async def _poll_and_push_DEPRECATED(self, match_id: str, page):
        """DEPRECATED: Replaced by network interception approach."""
        pass
    
    def _extract_match_id(self, url: str) -> Optional[str]:
        """Extract match ID from URL in the same format as crex_adapter.
        
        Expected: /scoreboard/{codes}/{codes}/{match-type}/{codes}/{codes}/{slug}/live
        Returns: crex:{slug}
        """
        match_key = extract_crex_match_key(url)
        if not match_key:
            return None
        return f"crex:{match_key}"

    async def _monitor_loop(self):
        """Periodic health monitoring loop."""
        logger.info("Health monitor started.")
        while self._running:
            try:
                # Check for stalls
                if self.health.check_stall():
                    logger.warning("Stall detected by monitor.")
                
                # Check for recovery trigger
                if self.health.should_trigger_recovery():
                    logger.warning("Triggering automated recovery...")
                    self.health.record_recovery_attempt()
                    try:
                        await self.recycle_browser_pool("stall_recovery")
                    except Exception as e:
                        logger.error(f"Recovery failed: {e}")
                        self.health.add_audit_log("recovery_failed", {"error": str(e)}, level="ERROR")

                # Update health score metric for Prometheus
                summary = self.health.get_summary()
                restart_condition = self.get_restart_condition(summary)
                if restart_condition:
                    self.schedule_container_restart(
                        restart_condition["reason"],
                        metadata=restart_condition["metadata"],
                        delay_seconds=0,
                    )
                self.metrics.health_score.set(summary.score)

                await asyncio.sleep(5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                await asyncio.sleep(5)

    async def _worker_loop(self, worker_id: int):
        """Main worker loop processing tasks from scheduler."""
        logger.debug(f"Worker {worker_id} started.")
        while self._running:
            try:
                task = await self.scheduler.next_task()
                self.metrics.queue_depth.set(self.scheduler.qsize)
                self.metrics.active_tasks.inc()
                
                try:
                    await self._process_task(task)
                except Exception as e:
                    logger.error(f"Worker {worker_id} failed task {task.match_id}: {e}")
                    self.health.record_failure(str(e))
                    self.metrics.domain_failures.labels(domain="crex", error_type=type(e).__name__).inc()
                    
                    # Record adapter failure if we can determine the adapter
                    # For now assuming crex
                    adapter = self.registry.get_adapter("crex")
                    if adapter:
                        adapter.reliability.record_failure()
                finally:
                    await self.scheduler.task_done(task)
                    self.metrics.active_tasks.dec()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} loop error: {e}")
                await asyncio.sleep(1)

    async def _process_task(self, task: ScrapeTask):
        """Process a single scrape task."""
        start_time = asyncio.get_running_loop().time()
        fetch_timeout_seconds = max(float(self.settings.circuit_breaker_timeout_seconds), 45.0)
        
        # Determine adapter (hardcoded to crex for now, logic can be expanded)
        adapter = self.registry.get_adapter("crex")
        if not adapter:
            logger.warning("Adapter 'crex' not available/enabled")
            return

        # Check negative cache
        canonical_id = adapter.get_canonical_id(task.match_id)
        if await self.cache.is_negative_cached(canonical_id):
            logger.info(f"Skipping {canonical_id} (negative cache)")
            return

        logger.info(f"scrape.task.start match_id={canonical_id} url={task.url} timeout={fetch_timeout_seconds:.0f}s")

        async with self.pool.get_context() as context:
            try:
                data = await asyncio.wait_for(
                    adapter.fetch_match(context, task.url),
                    timeout=fetch_timeout_seconds,
                )
            except asyncio.TimeoutError as exc:
                logger.warning(f"scrape.task.timeout match_id={canonical_id} url={task.url} timeout={fetch_timeout_seconds:.0f}s")
                raise TimeoutError(f"Timed out scraping {canonical_id} after {fetch_timeout_seconds:.0f}s") from exc
            
            # Check validity (if only metadata exists, assume scrape failed/empty)
            if len(data) <= 2: # source_url + adapter
                logger.warning(f"Match {canonical_id} returned no content, setting negative cache")
                await self.cache.set_negative_cache(canonical_id, ttl=60)
                return

            # Fetch match info if not present in cache
            previous_snapshot = await self.cache.get_snapshot(canonical_id)
            match_info = previous_snapshot.get("match_info") if previous_snapshot else None
            match_info_fetched_now = False
            info_url = None
            
            # Check persistent cache for match info if not in snapshot
            # This handles cases where snapshot expired but we still have the static info
            if not match_info:
                match_info = await self.cache.get_match_info(canonical_id)

            if not match_info:
                try:
                    # Construct info URL (assuming standard Crex URL structure)
                    # e.g. .../live -> .../info
                    info_url = get_crex_details_url(task.url)
                         
                    logger.info(f"Fetching match info for {canonical_id} from {info_url}")
                    match_info = await adapter.fetch_match_info(context, info_url)
                    if match_info:
                        match_info_fetched_now = True
                        # Persist match info separately with long TTL
                        await self.cache.set_match_info(canonical_id, match_info)
                except Exception as e:
                    logger.error(f"Failed to fetch match info for {canonical_id}: {e}")
            
            if match_info:
                data["match_info"] = match_info

            # Overs Data Caching Logic
            # If current scrape has overs, cache them.
            # If current scrape has NO overs, try to retrieve from cache.
            current_overs = data.get("overs_data")
            if current_overs and isinstance(current_overs, list) and len(current_overs) > 0:
                await self.cache.set_latest_overs(canonical_id, current_overs)
            elif not current_overs:
                cached_overs = await self.cache.get_latest_overs(canonical_id)
                if cached_overs:
                    data["overs_data"] = cached_overs
                    logger.info(f"Used cached overs_data for {canonical_id} (fallback)")

            # Canonical ID check
            # canonical_id already computed above
            if canonical_id != task.match_id:
                logger.warning(f"ID mismatch: task={task.match_id} canonical={canonical_id}")

            # Cache result
            # previous_snapshot already fetched above
            
            status = str(data.get("status", "")).lower()
            is_completed = status in ("completed", "result", "finished", "abandoned")

            if is_completed:
                logger.info(f"Match {canonical_id} completed ({status}), archiving.")
                await self.cache.push_history(canonical_id, data)
                await self.cache.archive_match(canonical_id)
            else:
                await self.cache.set_snapshot(canonical_id, data, ttl=self.settings.cache_live_ttl)
                await self.cache.push_history(canonical_id, data)
                await self.cache.update_freshness(canonical_id, start_time)
            
            # Delta emission
            if previous_snapshot:
                delta = self.cache.compute_delta(previous_snapshot, data)
                if delta:
                    logger.debug(f"Delta for {canonical_id}: {list(delta.keys())}")
            
            # Push to Backend (Task 8.4)
            # We push even if no delta, to ensure backend is in sync (or we could optimize to only push on delta)
            # For now, push every successful scrape to match legacy behavior
            if self._auth_token:
                # Run in thread to avoid blocking loop
                push_success = await asyncio.to_thread(
                    CricketDataService.push_match_data, 
                    data, 
                    self._auth_token, 
                    task.url
                )
                if not push_success:
                    logger.warning(f"Failed to push data for {canonical_id}")
                
                # Push match info if newly fetched
                # Also re-push cached match info periodically to handle cache-DB desync
                # (e.g., backend rebuilt but Redis still has cached info)
                if match_info:
                     # Use info_url if available, else derive it again
                     if not info_url:
                        info_url = get_crex_details_url(task.url)

                     await asyncio.to_thread(
                        CricketDataService.push_match_info,
                        match_info,
                        self._auth_token,
                        info_url
                     )
                
                # Push sC4 stats if available
                if data.get("match_stats"):
                     logger.info(f"Pushing sC4 stats for {canonical_id}. Data keys: {list(data['match_stats'].keys()) if isinstance(data['match_stats'], dict) else 'Not a dict'}")
                     await asyncio.to_thread(
                        CricketDataService.push_sc4_stats,
                        data["match_stats"],
                        self._auth_token,
                        task.url
                     )
            else:
                logger.warning(f"Skipping push for {canonical_id} (no auth token)")

            # Metrics & Health
            duration = asyncio.get_running_loop().time() - start_time
            self.metrics.record_scrape_result("crex", "success", duration)
            self.metrics.update_freshness(canonical_id, "crex", 0) # 0s age immediately after scrape
            self.health.record_success()
            self.health.record_freshness(0.0)
            adapter.reliability.record_success()
            
            logger.info(f"Scraped {canonical_id} in {duration:.2f}s")

    async def submit_task(self, match_id: str, url: str, task_type: str = "LIVE") -> bool:
        """Submit a task to the scheduler."""
        # Ensure canonical ID usage if possible, or rely on caller
        result = await self.scheduler.enqueue(match_id, url, task_type)
        self.metrics.queue_depth.set(self.scheduler.qsize)
        return result

    def _should_submit_live_task(self, match_id: str) -> bool:
        """Use the heavy full scrape path sparingly once a match is already covered by a persistent page."""
        if not self.persistent_page_pool or not self.persistent_page_pool.is_page_active(match_id):
            return True

        last_full_scrape = self._last_full_live_scrape_at.get(match_id)
        if last_full_scrape is None:
            return True

        return (time.monotonic() - last_full_scrape) >= self.settings.live_match_rescrape_interval_seconds
