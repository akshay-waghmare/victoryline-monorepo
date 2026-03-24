"""
Live Match Discovery Service.
Periodically scrapes the main page to find new live matches and syncs them with the backend.
"""

import asyncio
import inspect
import logging
from typing import Any, Awaitable, Callable, List, Optional

from playwright.async_api import Page

from .config import get_settings
from .browser_pool import AsyncBrowserPool
from .cricket_data_service import CricketDataService
from .parsers.crex_schedule_parser import extract_schedule_matches

logger = logging.getLogger(__name__)

class LiveMatchDiscoverer:
    """
    Discovers live matches from the main listing page.
    """

    def __init__(
        self,
        pool: AsyncBrowserPool,
        on_match_catalog_updated: Optional[Callable[[List[str], List[dict]], Any]] = None,
    ):
        self.pool = pool
        self.settings = get_settings()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.base_url = "https://crex.com"
        self._on_match_catalog_updated = on_match_catalog_updated

    async def start(self):
        """Start the discovery loop."""
        self._running = True
        self._task = asyncio.create_task(self._discovery_loop())
        logger.info("LiveMatchDiscoverer started.")

    async def stop(self):
        """Stop the discovery loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("LiveMatchDiscoverer stopped.")

    async def _discovery_loop(self):
        """Periodic discovery loop."""
        while self._running:
            try:
                await self._discover_and_sync()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Discovery loop error: {e}")
                print(f"[DISCOVERY] Error: {e}", flush=True)
                
                if "Connection closed" in str(e) or "Target closed" in str(e):
                    print("[DISCOVERY] Critical browser error detected. Pool should auto-recover on next cycle.", flush=True)
                
                # If we hit a connection error here, it might be transient or fatal for the browser
                # The pool should handle invalidation, but we should back off a bit
                await asyncio.sleep(10)
            
            # Wait for next cycle (default 60s)
            await asyncio.sleep(60)

    async def _discover_and_sync(self):
        """Scrape main page and sync live plus schedule matches."""
        logger.info("Starting live match discovery...")
        print("[DISCOVERY] Starting live match discovery cycle...", flush=True)
        urls = []
        schedule_matches = []
        
        try:
            async with self.pool.get_context() as context:
                page = None
                try:
                    page = await context.new_page()
                    # Use the specific live matches URL
                    target_url = "https://crex.com/live-matches"
                    logger.info(f"Navigating to {target_url} for discovery...")
                    print(f"[DISCOVERY] Navigating to {target_url}...", flush=True)
                    
                    await page.goto(target_url, timeout=60000)
                    
                    # Wait for content to load - try multiple selectors
                    try:
                        # Try a broad selector for any match link or card
                        await page.wait_for_selector("li.live-card, div.live-card, a[href*='/scoreboard/']", timeout=20000)
                        print("[DISCOVERY] Found match elements.", flush=True)
                    except Exception:
                        logger.warning("No live cards found on live-matches page (timeout).")
                        print("[DISCOVERY] No live cards found (timeout).", flush=True)
                        await page.close()
                        return

                    # Extract URLs using robust logic based on provided HTML
                    urls = await page.evaluate("""() => {
                        const urls = [];

                        // Helper to check if text indicates a finished match
                        const isFinishedText = (text) => {
                            const t = (text || "").toLowerCase();
                            return t.includes("won by") || 
                                   t.includes("match tied") || 
                                   t.includes("no result") || 
                                   t.includes("match abandoned");
                        };

                        // Helper to check if card is actually live
                        const isLive = (element) => {
                            // Check for the "live" class div inside the card
                            return element.querySelector('div.live') !== null;
                        };

                        // Strategy 1: Look for li.live-card (New structure)
                        const listItems = document.querySelectorAll('li.live-card');
                        if (listItems.length > 0) {
                            listItems.forEach(li => {
                                if (isLive(li) && !isFinishedText(li.innerText)) {
                                    const a = li.querySelector('a');
                                    if (a) {
                                        const href = a.getAttribute('href');
                                        if (href && href.includes('/scoreboard/')) {
                                            urls.push(href);
                                        }
                                    }
                                }
                            });
                        }

                        // Strategy 2: Look for div.live-card (Legacy structure)
                        if (urls.length === 0) {
                            const divItems = document.querySelectorAll('div.live-card');
                            if (divItems.length > 0) {
                                divItems.forEach(div => {
                                    if (isLive(div) && !isFinishedText(div.innerText)) {
                                        const a = div.querySelector('a');
                                        if (a) {
                                            const href = a.getAttribute('href');
                                            if (href && href.includes('/scoreboard/')) {
                                                urls.push(href);
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        // Strategy 3: Fallback - Look for any scoreboard links
                        if (urls.length === 0) {
                            const links = document.querySelectorAll('a[href*="/scoreboard/"]');
                            links.forEach(a => {
                                // Check the link text itself or its parent text
                                const textToCheck = a.innerText + " " + (a.parentElement ? a.parentElement.innerText : "");
                                if (!isFinishedText(textToCheck)) {
                                    // For fallback, we might want to be stricter or check for live indicator nearby
                                    // But if strategies 1 & 2 failed, we might just take what we can get, 
                                    // or skip fallback if we want to be strict about "live" class.
                                    // Let's skip fallback if we want to enforce "live" class presence.
                                }
                            });
                        }

                        return urls;
                    }""")
                finally:
                    if page:
                        try:
                            await page.close()
                        except Exception:
                            pass

                schedule_page = None
                try:
                    schedule_page = await context.new_page()
                    schedule_url = "https://crex.com/schedule"
                    logger.info(f"Navigating to {schedule_url} for schedule discovery...")
                    print(f"[DISCOVERY] Navigating to {schedule_url}...", flush=True)

                    await schedule_page.goto(schedule_url, timeout=60000)
                    await schedule_page.wait_for_selector("a[href*='/scoreboard/']", timeout=20000)
                    schedule_matches = await extract_schedule_matches(schedule_page, self.base_url)
                    print(f"[DISCOVERY] Parsed {len(schedule_matches)} schedule matches.", flush=True)
                except Exception as schedule_error:
                    logger.warning(f"Schedule discovery skipped due to error: {schedule_error}")
                    print(f"[DISCOVERY] Schedule discovery skipped: {schedule_error}", flush=True)
                finally:
                    if schedule_page:
                        try:
                            await schedule_page.close()
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"Discovery failed: {e}")
            raise e
                
        # Clean and format URLs
        valid_urls = []
        for url in urls:
            if url:
                if not url.startswith("http"):
                    url = "https://crex.com" + url
                valid_urls.append(url)
        
        # Remove duplicates
        valid_urls = list(set(valid_urls))
        
        logger.info(f"Discovered {len(valid_urls)} live matches: {valid_urls}")
        print(f"[DISCOVERY] Found {len(valid_urls)} matches: {valid_urls}", flush=True)

        if self._on_match_catalog_updated:
            callback_result = self._on_match_catalog_updated(valid_urls, schedule_matches)
            if inspect.isawaitable(callback_result):
                await callback_result
        
        if valid_urls or schedule_matches:
            # Sync with backend
            token = await asyncio.to_thread(CricketDataService.get_bearer_token)
            if valid_urls:
                await asyncio.to_thread(CricketDataService.add_live_matches, valid_urls, token)
                logger.info("Synced live matches with backend.")
            if schedule_matches:
                await asyncio.to_thread(CricketDataService.add_schedule_matches, schedule_matches, token)
                logger.info("Synced schedule matches with backend.")
            print("[DISCOVERY] Synced with backend.", flush=True)
        else:
            print("[DISCOVERY] No valid URLs or schedule matches found to sync.", flush=True)

