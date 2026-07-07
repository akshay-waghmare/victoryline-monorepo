"""
Persistent Page Pool for fast sV3 polling.
Keeps browser pages open for live matches.

Feature: 007-fast-updates
"""
import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Dict, Optional, Set, Callable, Awaitable
from playwright.async_api import Page, BrowserContext

logger = logging.getLogger(__name__)


async def _is_page_alive(page: Page, timeout: float = 2.0) -> bool:
    """Lightweight health check — returns True if the page can evaluate JS."""
    if page.is_closed():
        return False
    try:
        await asyncio.wait_for(page.evaluate("1"), timeout=timeout)
        return True
    except Exception:
        return False


_MATCH_PRIORITY_KEYWORDS = {
    "international": 6,
    "odi": 5,
    "t20i": 5,
    "test": 5,
    "t20": 3,
    "league": 2,
    "qualifier": 4,
    "semi-final": 4,
    "semi final": 4,
    "final": 4,
    "eliminator": 3,
    "playoff": 3,
}


def _estimate_match_priority(url: str) -> int:
    """Score a match URL by estimated importance for intelligent eviction."""
    lower = url.lower()
    score = 0
    for keyword, value in _MATCH_PRIORITY_KEYWORDS.items():
        if keyword in lower:
            score = max(score, value)
    return score


@dataclass
class PageEntry:
    """Metadata for a persistent page."""
    page: Page
    context: BrowserContext
    created_at: float
    last_used_at: float
    url: str
    error_count: int = 0
    priority: int = 0


class PersistentPagePool:
    """
    Manages persistent browser pages for live matches.
    
    Each live match gets its own page that stays open until:
    - Match completes
    - Page becomes stale (errors, memory)
    - Max age exceeded
    - Manual cleanup triggered
    
    Resource limits:
    - Max pages: configurable (default 15)
    - Max age: 2 hours (force refresh)
    - Error threshold: recycle after N errors
    
    Benefits over page-per-scrape:
    - Update latency: 20-30s → 1-3s
    - Reduced PID churn (fewer open/close cycles)
    - More stable resource usage
    """
    
    def __init__(
        self, 
        max_pages: int = 15, 
        max_age_seconds: int = 7200,
        max_errors: int = 5,
    ):
        self._entries: Dict[str, PageEntry] = {}
        self._lock = asyncio.Lock()
        self._max_pages = max_pages
        self._max_age = max_age_seconds
        self._max_errors = max_errors
        logger.info(f"[POOL] Initialized with max_pages={max_pages}, max_age={max_age_seconds}s")
    
    async def get_or_create(
        self, 
        match_id: str, 
        context: BrowserContext,
        url: str,
        setup_fn: Optional[Callable[[Page], Awaitable[None]]] = None,
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
            if match_id in self._entries:
                entry = self._entries[match_id]
                
                # Check if page is still valid
                if not entry.page.is_closed():
                    age = time.time() - entry.created_at
                    
                    # Check age limit
                    if age < self._max_age:
                        # Check error threshold
                        if entry.error_count < self._max_errors:
                            entry.last_used_at = time.time()
                            logger.debug(f"[POOL] Reusing page for {match_id} (age: {age:.0f}s, errors: {entry.error_count})")
                            return entry.page
                        else:
                            logger.info(f"[POOL] Page for {match_id} exceeded error threshold ({entry.error_count}), recreating")
                    else:
                        logger.info(f"[POOL] Page for {match_id} expired (age: {age:.0f}s), recreating")
                else:
                    logger.info(f"[POOL] Page for {match_id} was closed, recreating")
                
                # Page invalid, clean up
                await self._cleanup_entry(match_id)
            
            # Check pool size limit
            if len(self._entries) >= self._max_pages:
                # Evict oldest/least recently used page
                await self._evict_one()
            
            # Create new page
            logger.info(f"[POOL] Creating new page for {match_id}")
            page = await context.new_page()
            
            try:
                # Navigate to URL
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                
                # Wait for initial content to load
                try:
                    await page.wait_for_selector(".match-header", timeout=5000)
                except Exception:
                    pass  # Continue even if selector not found
                
                # Run setup function if provided
                if setup_fn:
                    await setup_fn(page)
                
                # Store entry
                now = time.time()
                self._entries[match_id] = PageEntry(
                    page=page,
                    context=context,
                    created_at=now,
                    last_used_at=now,
                    url=url,
                    error_count=0,
                    priority=_estimate_match_priority(url),
                )
                
                logger.info(f"[POOL] Page created for {match_id}. Pool size: {len(self._entries)}")
                return page
                
            except Exception as e:
                # Clean up on failure — close page and its dedicated context
                if not page.is_closed():
                    await page.close()
                try:
                    await context.close()
                except Exception:
                    pass
                logger.error(f"[POOL] Failed to create page for {match_id}: {e}")
                raise
    
    async def _evict_one(self):
        """Evict the lowest-priority page (tie-break: LRU)."""
        if not self._entries:
            return
        target = self._find_lowest_priority_entry()
        if target is None:
            return
        logger.info(f"[POOL] Evicting page: {target}")
        await self._cleanup_entry(target)
    
    async def _cleanup_entry(self, match_id: str):
        """Clean up a single page entry — closes page AND its dedicated context."""
        if match_id not in self._entries:
            return
            
        entry = self._entries.pop(match_id)
        
        if not entry.page.is_closed():
            try:
                await entry.page.close()
                logger.debug(f"[POOL] Closed page for {match_id}")
            except Exception as e:
                logger.warning(f"[POOL] Error closing page {match_id}: {e}")

        # Close the dedicated context that was created for this page
        try:
            await entry.context.close()
            logger.debug(f"[POOL] Closed context for {match_id}")
        except Exception as e:
            logger.warning(f"[POOL] Error closing context for {match_id}: {e}")
    
    def record_error(self, match_id: str):
        """Record an error for a page (for threshold tracking)."""
        if match_id in self._entries:
            self._entries[match_id].error_count += 1
            logger.debug(f"[POOL] Error count for {match_id}: {self._entries[match_id].error_count}")
    
    def reset_errors(self, match_id: str):
        """Reset error count for a page (on success)."""
        if match_id in self._entries:
            self._entries[match_id].error_count = 0
    
    async def remove(self, match_id: str):
        """Remove and close a match's page."""
        async with self._lock:
            await self._cleanup_entry(match_id)
            logger.info(f"[POOL] Removed page for {match_id}. Pool size: {len(self._entries)}")
    
    async def close_all(self):
        """Close all pages (for shutdown)."""
        async with self._lock:
            match_ids = list(self._entries.keys())
            for match_id in match_ids:
                await self._cleanup_entry(match_id)
            logger.info("[POOL] All pages closed")
    
    def get_page(self, match_id: str) -> Optional[Page]:
        """Get page for match if exists (without creating)."""
        if match_id in self._entries and not self._entries[match_id].page.is_closed():
            return self._entries[match_id].page
        return None
    
    @property
    def size(self) -> int:
        """Number of pages in pool."""
        return len(self._entries)
    
    @property
    def match_ids(self) -> Set[str]:
        """Set of match IDs with active pages."""
        return set(self._entries.keys())
    
    async def is_page_active(self, match_id: str) -> bool:
        """Check if a page exists and is still alive (not closed + can evaluate JS)."""
        if match_id not in self._entries:
            return False
        return await _is_page_alive(self._entries[match_id].page)

    async def ensure_capacity(self, min_pages: int):
        """Evict excess pages when live matches exceed the pool capacity.

        Uses priority-based eviction: lower-importance matches are closed first.
        """
        async with self._lock:
            while len(self._entries) > self._max_pages and self._entries:
                target = self._find_lowest_priority_entry()
                if target is None:
                    break
                logger.warning(
                    f"[POOL] Evicting {target} (pool capped at {self._max_pages}, "
                    f"live matches={min_pages})"
                )
                await self._cleanup_entry(target)

    def _find_lowest_priority_entry(self) -> Optional[str]:
        """Find the entry with lowest priority (tie-break: least recently used)."""
        if not self._entries:
            return None
        worst_id = None
        worst_priority = float("inf")
        worst_used = float("inf")
        for mid, entry in self._entries.items():
            if entry.priority < worst_priority:
                worst_id = mid
                worst_priority = entry.priority
                worst_used = entry.last_used_at
            elif entry.priority == worst_priority and entry.last_used_at < worst_used:
                worst_id = mid
                worst_used = entry.last_used_at
        return worst_id
    
    def get_stats(self) -> Dict:
        """Get pool statistics for monitoring."""
        now = time.time()
        try:
            entries = list(self._entries.values())
            match_ids = list(self._entries.keys())
        except RuntimeError:
            # The health endpoint runs in Flask's request thread while the
            # scraper loop may mutate the pool from another thread.
            snapshot = dict(self._entries)
            entries = list(snapshot.values())
            match_ids = list(snapshot.keys())

        ages = [now - e.created_at for e in entries]
        errors = [e.error_count for e in entries]
        
        return {
            "size": len(entries),
            "max_size": self._max_pages,
            "oldest_age_seconds": max(ages) if ages else 0,
            "avg_age_seconds": sum(ages) / len(ages) if ages else 0,
            "total_errors": sum(errors),
            "match_ids": match_ids,
        }
