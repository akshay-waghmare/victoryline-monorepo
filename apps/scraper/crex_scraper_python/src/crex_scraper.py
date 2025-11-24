"""
Main Scraper Service.
Coordinates browser pool, scheduler, cache, and adapters.
"""

import asyncio
import logging
import signal
from typing import Optional

from .config import get_settings
from .browser_pool import AsyncBrowserPool
from .scheduler import AsyncScheduler, ScrapeTask
from .cache import ScrapeCache
from .metrics import MetricsCollector
from .health import HealthGrader
from .adapters.registry import AdapterRegistry
from .cricket_data_service import CricketDataService
from .discovery import LiveMatchDiscoverer

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
        self.registry = AdapterRegistry()
        self.discovery = LiveMatchDiscoverer(self.pool)
        self._running = False
        self._workers = []
        self._monitor_task: Optional[asyncio.Task] = None
        self._poll_task: Optional[asyncio.Task] = None
        self._auth_token: Optional[str] = None

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

        # Start worker tasks
        for i in range(self.settings.concurrency_cap):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
            
        # Start monitor task
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        # Start poll task
        self._poll_task = asyncio.create_task(self._poll_loop())

        # Start discovery task
        await self.discovery.start()
            
        logger.info(f"Started {len(self._workers)} worker tasks.")

    async def stop(self):
        """Stop the scraper service."""
        logger.info("Stopping CrexScraperService...")
        self._running = False
        
        if self._monitor_task:
            self._monitor_task.cancel()
        
        if self._poll_task:
            self._poll_task.cancel()

        await self.discovery.stop()

        try:
            if self._monitor_task: await self._monitor_task
            if self._poll_task: await self._poll_task
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

    async def _poll_loop(self):
        """Periodic backend polling loop."""
        logger.info("Backend poller started.")
        while self._running:
            try:
                # Refresh token if needed
                if not self._auth_token:
                     self._auth_token = await asyncio.to_thread(CricketDataService.get_bearer_token)

                matches = await asyncio.to_thread(CricketDataService.get_live_matches, self._auth_token)
                
                for match in matches:
                    # Handle both dict (from JSON) and string (if backend returns list of strings)
                    url = None
                    if isinstance(match, dict):
                        url = match.get('url') or match.get('matchUrl')
                    elif isinstance(match, str):
                        url = match
                    
                    if url:
                        # Use URL as ID or extract it. For now URL is unique enough.
                        match_id = url 
                        await self.submit_task(match_id, url, "LIVE")
                
                await asyncio.sleep(self.settings.polling_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Poll loop error: {e}")
                await asyncio.sleep(5)

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
                        await self.pool.recycle()
                        self.metrics.browser_restarts.labels(reason="stall_recovery").inc()
                        self.health.add_audit_log("recovery_executed", {"action": "browser_recycle"}, level="WARNING")
                    except Exception as e:
                        logger.error(f"Recovery failed: {e}")
                        self.health.add_audit_log("recovery_failed", {"error": str(e)}, level="ERROR")

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

        async with self.pool.get_context() as context:
            data = await adapter.fetch_match(context, task.url)
            
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
            
            if not match_info:
                try:
                    # Construct info URL (assuming standard Crex URL structure)
                    # e.g. .../live -> .../info
                    info_url = task.url.replace("/live", "/info").replace("/scorecard", "/info")
                    # If URL didn't change (no /live or /scorecard), append /info if not present
                    if info_url == task.url and "/info" not in info_url:
                         info_url = task.url.rstrip("/") + "/info"
                         
                    logger.info(f"Fetching match info for {canonical_id} from {info_url}")
                    match_info = await adapter.fetch_match_info(context, info_url)
                    if match_info:
                        match_info_fetched_now = True
                except Exception as e:
                    logger.error(f"Failed to fetch match info for {canonical_id}: {e}")
            
            if match_info:
                data["match_info"] = match_info

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
                if match_info_fetched_now and match_info:
                     # Use info_url if available, else derive it again
                     if not info_url:
                        info_url = task.url.replace("/live", "/info").replace("/scorecard", "/info")
                        if info_url == task.url and "/info" not in info_url:
                             info_url = task.url.rstrip("/") + "/info"

                     await asyncio.to_thread(
                        CricketDataService.push_match_info,
                        match_info,
                        self._auth_token,
                        info_url
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
