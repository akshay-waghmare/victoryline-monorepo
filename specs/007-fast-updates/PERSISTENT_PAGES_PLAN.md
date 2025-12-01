# Feature 007: Persistent Pages Optimization Plan

## Overview

Instead of loading a full page for each scrape cycle (20-30s), keep browser pages open and poll for sV3 updates via JavaScript, reducing update time to **1-3 seconds**.

## Current Architecture (Page-per-Scrape)

```
┌─────────────────────────────────────────────────────┐
│ Per Scrape Cycle (20-30s)                           │
├─────────────────────────────────────────────────────┤
│ 1. Get browser context from pool                    │
│ 2. Create new page                                  │
│ 3. Check localStorage cache (or pre-fetch ~8s)      │
│ 4. Navigate to /live page (5-10s)                   │
│ 5. Wait for sV3 response (5s timeout)               │
│ 6. Extract DOM data                                 │
│ 7. Close page                                       │
│ 8. Push to backend                                  │
└─────────────────────────────────────────────────────┘
```

## Proposed Architecture (Persistent Pages)

```
┌─────────────────────────────────────────────────────┐
│ Initial Setup (Once per match, ~20s)                │
├─────────────────────────────────────────────────────┤
│ 1. Get browser context                              │
│ 2. Create page                                      │
│ 3. Navigate to /live page                           │
│ 4. Store page in persistent pool                    │
│ 5. Setup network interception                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Fast Poll Cycle (Every 2-5s, <1s per update)        │
├─────────────────────────────────────────────────────┤
│ 1. Get existing page from pool                      │
│ 2. Execute JS to trigger sV3 API call               │
│ 3. Wait for sV3 response (intercepted)              │
│ 4. Process data                                     │
│ 5. Push to backend                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Cleanup (When match ends or page stale)             │
├─────────────────────────────────────────────────────┤
│ 1. Close page                                       │
│ 2. Remove from pool                                 │
│ 3. Clear localStorage cache                         │
└─────────────────────────────────────────────────────┘
```

## Resource Impact Analysis

| Metric           | Current (Page-per-Scrape) | Persistent Pages    | Impact              |
|------------------|---------------------------|---------------------|---------------------|
| PIDs per match   | 0 (transient)             | 1 (persistent)      | +7 PIDs for 7 matches |
| Total PIDs       | ~50-100 (fluctuating)     | ~60-110 (stable)    | Slightly higher, more stable |
| Memory per match | 0 (transient)             | ~50-100MB           | +350-700MB for 7 matches |
| Update latency   | 20-30s                    | 1-3s                | **10-20x faster** |
| Browser restarts | Every 6hr                 | Every 6hr           | Same |
| PID leak risk    | Higher (open/close cycles)| Lower (fixed pool)  | **Reduced** |

## Implementation Tasks

### Task 1: Create PersistentPagePool Class
**File:** `apps/scraper/crex_scraper_python/src/core/persistent_page_pool.py`

```python
"""
Persistent Page Pool for fast sV3 polling.
Keeps browser pages open for live matches.
"""
import asyncio
import logging
import time
from typing import Dict, Optional, Set
from playwright.async_api import Page, BrowserContext

logger = logging.getLogger(__name__)

class PersistentPagePool:
    """
    Manages persistent browser pages for live matches.
    
    Each live match gets its own page that stays open until:
    - Match completes
    - Page becomes stale (errors, memory)
    - Manual cleanup triggered
    
    Resource limits:
    - Max pages: configurable (default 15)
    - Max age: 2 hours (force refresh)
    - Memory threshold: trigger page recycle
    """
    
    def __init__(self, max_pages: int = 15, max_age_seconds: int = 7200):
        self._pages: Dict[str, Page] = {}
        self._page_created_at: Dict[str, float] = {}
        self._page_context: Dict[str, BrowserContext] = {}
        self._lock = asyncio.Lock()
        self._max_pages = max_pages
        self._max_age = max_age_seconds
        self._active_polls: Set[str] = set()  # Track active poll operations
    
    async def get_or_create(
        self, 
        match_id: str, 
        context: BrowserContext,
        url: str,
        setup_fn: Optional[callable] = None,
    ) -> Page:
        """
        Get existing page for match or create a new one.
        
        Args:
            match_id: Unique match identifier
            context: Browser context to create page in
            url: URL to navigate to (only used if creating new page)
            setup_fn: Optional async function to call after page creation
                     Signature: async (page: Page) -> None
        
        Returns:
            Page ready for polling
        """
        async with self._lock:
            # Check if page exists and is valid
            if match_id in self._pages:
                page = self._pages[match_id]
                
                # Check if page is still valid
                if not page.is_closed():
                    # Check age
                    age = time.time() - self._page_created_at.get(match_id, 0)
                    if age < self._max_age:
                        logger.debug(f"[POOL] Reusing page for {match_id} (age: {age:.0f}s)")
                        return page
                    else:
                        logger.info(f"[POOL] Page for {match_id} expired (age: {age:.0f}s), recreating")
                
                # Page closed or expired, clean up
                await self._cleanup_page(match_id)
            
            # Check pool size limit
            if len(self._pages) >= self._max_pages:
                # Evict oldest page
                oldest_id = min(self._page_created_at, key=self._page_created_at.get)
                logger.info(f"[POOL] Pool full, evicting {oldest_id}")
                await self._cleanup_page(oldest_id)
            
            # Create new page
            logger.info(f"[POOL] Creating new page for {match_id}")
            page = await context.new_page()
            
            # Navigate to URL
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Run setup function if provided
            if setup_fn:
                await setup_fn(page)
            
            # Store page
            self._pages[match_id] = page
            self._page_created_at[match_id] = time.time()
            self._page_context[match_id] = context
            
            logger.info(f"[POOL] Page created for {match_id}. Pool size: {len(self._pages)}")
            return page
    
    async def _cleanup_page(self, match_id: str):
        """Clean up a single page."""
        if match_id in self._pages:
            page = self._pages.pop(match_id)
            self._page_created_at.pop(match_id, None)
            self._page_context.pop(match_id, None)
            
            if not page.is_closed():
                try:
                    await page.close()
                except Exception as e:
                    logger.warning(f"[POOL] Error closing page {match_id}: {e}")
    
    async def remove(self, match_id: str):
        """Remove and close a match's page."""
        async with self._lock:
            await self._cleanup_page(match_id)
            logger.info(f"[POOL] Removed page for {match_id}. Pool size: {len(self._pages)}")
    
    async def close_all(self):
        """Close all pages (for shutdown)."""
        async with self._lock:
            for match_id in list(self._pages.keys()):
                await self._cleanup_page(match_id)
            logger.info("[POOL] All pages closed")
    
    @property
    def size(self) -> int:
        return len(self._pages)
    
    @property
    def match_ids(self) -> Set[str]:
        return set(self._pages.keys())
    
    def is_page_active(self, match_id: str) -> bool:
        """Check if a page exists and is not closed."""
        if match_id not in self._pages:
            return False
        return not self._pages[match_id].is_closed()
```

### Task 2: Create FastPollService
**File:** `apps/scraper/crex_scraper_python/src/services/fast_poll_service.py`

```python
"""
Fast Polling Service for live matches.
Uses persistent pages to poll sV3 data every few seconds.
"""
import asyncio
import logging
from typing import Dict, Any, Optional, Callable

from ..core.persistent_page_pool import PersistentPagePool
from ..adapters.crex_adapter import CrexAdapter
from ..cache import ScrapeCache
from ..cricket_data_service import CricketDataService

logger = logging.getLogger(__name__)

class FastPollService:
    """
    Service for fast polling of live match data.
    
    Instead of full page loads, keeps pages open and triggers
    sV3 API calls via JavaScript execution.
    """
    
    def __init__(
        self,
        page_pool: PersistentPagePool,
        adapter: CrexAdapter,
        cache: ScrapeCache,
        auth_token_provider: Callable[[], Optional[str]],
        poll_interval: float = 3.0,  # Seconds between polls
    ):
        self._pool = page_pool
        self._adapter = adapter
        self._cache = cache
        self._auth_provider = auth_token_provider
        self._poll_interval = poll_interval
        self._running = False
        self._poll_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_polling(self, match_id: str, url: str, context):
        """Start polling for a specific match."""
        if match_id in self._poll_tasks:
            logger.debug(f"Already polling {match_id}")
            return
        
        self._running = True
        task = asyncio.create_task(self._poll_loop(match_id, url, context))
        self._poll_tasks[match_id] = task
        logger.info(f"[POLL] Started polling for {match_id}")
    
    async def stop_polling(self, match_id: str):
        """Stop polling for a specific match."""
        if match_id in self._poll_tasks:
            self._poll_tasks[match_id].cancel()
            try:
                await self._poll_tasks[match_id]
            except asyncio.CancelledError:
                pass
            del self._poll_tasks[match_id]
            await self._pool.remove(match_id)
            logger.info(f"[POLL] Stopped polling for {match_id}")
    
    async def stop_all(self):
        """Stop all polling."""
        self._running = False
        for match_id in list(self._poll_tasks.keys()):
            await self.stop_polling(match_id)
        await self._pool.close_all()
    
    async def _poll_loop(self, match_id: str, url: str, context):
        """Main polling loop for a single match."""
        logger.info(f"[POLL] Starting poll loop for {match_id}")
        
        # Setup function for new pages
        async def setup_page(page):
            # Setup network interception for sV3
            await self._adapter._setup_network_interception(page, {}, match_id, url)
        
        consecutive_errors = 0
        max_errors = 5
        
        while self._running:
            try:
                # Get or create persistent page
                page = await self._pool.get_or_create(
                    match_id, context, url, setup_fn=setup_page
                )
                
                # Trigger sV3 refresh via JavaScript
                # The crex site likely has a refresh mechanism or we can trigger navigation
                data = await self._trigger_sv3_refresh(page, match_id, url)
                
                if data:
                    # Push to backend
                    token = self._auth_provider()
                    if token:
                        await asyncio.to_thread(
                            CricketDataService.push_match_data,
                            data,
                            token,
                            url
                        )
                    
                    consecutive_errors = 0
                else:
                    consecutive_errors += 1
                
                # Check for match completion
                if self._is_match_completed(data):
                    logger.info(f"[POLL] Match {match_id} completed, stopping poll")
                    break
                
                # Check error threshold
                if consecutive_errors >= max_errors:
                    logger.warning(f"[POLL] Too many errors for {match_id}, recycling page")
                    await self._pool.remove(match_id)
                    consecutive_errors = 0
                
                await asyncio.sleep(self._poll_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[POLL] Error polling {match_id}: {e}")
                consecutive_errors += 1
                await asyncio.sleep(self._poll_interval)
        
        logger.info(f"[POLL] Exiting poll loop for {match_id}")
    
    async def _trigger_sv3_refresh(self, page, match_id: str, url: str) -> Optional[Dict]:
        """
        Trigger sV3 API refresh without full page reload.
        
        Options:
        1. page.reload() - simplest but slower
        2. Execute JS to call API directly
        3. Intercept and re-trigger network request
        
        For now, use simple reload with intercept.
        """
        try:
            data_store = {"api_data": {}}
            sv3_received = asyncio.Event()
            
            async def on_response(response):
                if "sV3" in response.url:
                    try:
                        data_store["api_data"] = await response.json()
                        sv3_received.set()
                    except:
                        pass
            
            page.on("response", on_response)
            
            try:
                # Reload page to trigger fresh sV3 request
                await page.reload(wait_until="domcontentloaded", timeout=10000)
                
                # Wait for sV3 response
                await asyncio.wait_for(sv3_received.wait(), timeout=5.0)
                
                return data_store["api_data"]
            finally:
                page.remove_listener("response", on_response)
                
        except asyncio.TimeoutError:
            logger.warning(f"[POLL] sV3 timeout for {match_id}")
            return None
        except Exception as e:
            logger.error(f"[POLL] Error triggering refresh for {match_id}: {e}")
            return None
    
    def _is_match_completed(self, data: Optional[Dict]) -> bool:
        """Check if match is completed based on data."""
        if not data:
            return False
        
        # Check various completion indicators
        status = str(data.get("status", "")).lower()
        if status in ("completed", "result", "finished", "abandoned"):
            return True
        
        # Check result text
        result = str(data.get("result", "")).lower()
        if any(x in result for x in ["won by", "won the", "draw", "tie", "abandoned"]):
            return True
        
        return False
```

### Task 3: Integrate with CrexScraperService
**File:** `apps/scraper/crex_scraper_python/src/crex_scraper.py`

Add option to use persistent pages:

```python
# In __init__:
self._use_persistent_pages = self.settings.enable_fast_updates and \
                             os.getenv("USE_PERSISTENT_PAGES", "false").lower() == "true"

if self._use_persistent_pages:
    from .core.persistent_page_pool import PersistentPagePool
    from .services.fast_poll_service import FastPollService
    
    self.page_pool = PersistentPagePool(max_pages=15)
    self.fast_poll_service = FastPollService(
        page_pool=self.page_pool,
        adapter=self.registry.get_adapter("crex"),
        cache=self.cache,
        auth_token_provider=lambda: self._auth_token,
        poll_interval=3.0,
    )
```

### Task 4: Add Configuration
**File:** `apps/scraper/crex_scraper_python/src/config.py`

```python
# Add to ScraperSettings:
use_persistent_pages: bool = False  # Enable persistent page pooling
persistent_page_max_count: int = 15  # Max pages in pool
persistent_page_max_age_seconds: int = 7200  # 2 hours
fast_poll_interval_seconds: float = 3.0  # Poll interval when using persistent pages
```

### Task 5: Add Metrics
**File:** Update `apps/scraper/crex_scraper_python/src/metrics.py`

```python
# Add metrics for persistent pages:
persistent_pages_active = Gauge(
    'scraper_persistent_pages_active',
    'Number of active persistent pages'
)

fast_poll_latency = Histogram(
    'scraper_fast_poll_latency_seconds',
    'Time taken for fast poll cycle',
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0]
)

page_recycles = Counter(
    'scraper_page_recycles_total',
    'Number of page recycles (due to errors/age)',
    ['reason']  # 'error', 'age', 'memory', 'manual'
)
```

## Testing Plan

### Unit Tests
1. `test_persistent_page_pool.py`
   - Test page creation and reuse
   - Test page eviction when pool full
   - Test page cleanup on errors
   - Test max age expiration

2. `test_fast_poll_service.py`
   - Test poll loop start/stop
   - Test sV3 refresh trigger
   - Test error handling and retry
   - Test match completion detection

### Integration Tests
1. Test with real crex pages (in Docker)
2. Monitor PID count over time
3. Measure actual update latency
4. Test memory usage under load

## Rollout Plan

1. **Phase 1: Feature Flag**
   - Add `USE_PERSISTENT_PAGES=false` env var
   - Deploy with flag off
   - Monitor baseline metrics

2. **Phase 2: Limited Testing**
   - Enable for 1-2 matches only
   - Monitor PID/memory closely
   - Compare update latency

3. **Phase 3: Gradual Rollout**
   - Enable for 50% of matches
   - Monitor for 24 hours
   - Check for resource leaks

4. **Phase 4: Full Rollout**
   - Enable for all matches
   - Document final performance numbers

## Rollback Plan

If issues are detected:
1. Set `USE_PERSISTENT_PAGES=false`
2. Restart scraper container
3. Falls back to current page-per-scrape approach

## Success Criteria

- [ ] Update latency reduced to <5 seconds
- [ ] PID count stable (no leaks over 24 hours)
- [ ] Memory usage stable (no leaks)
- [ ] No increase in scrape errors
- [ ] Automatic page recycling working
