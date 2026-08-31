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
from .crex_url_utils import extract_crex_api_key, normalize_crex_url
from .cricket_data_service import CricketDataService
from .managed_live_slate import (
    ManagedLiveSlateStore,
    has_terminal_evidence,
    reconcile_managed_live_slate,
)
from .parsers.crex_schedule_parser import extract_schedule_matches

logger = logging.getLogger(__name__)

# CREX initially renders the current fixture date. One bounded advance exposes
# the next date as well, which is required for the separate 12--48 hour
# opening-model handoff. Do not turn this into unbounded schedule crawling.
SCHEDULE_LOOKAHEAD_DAYS = 1


async def extract_schedule_window(page: Page, base_url: str) -> List[dict]:
    """Collect the visible schedule plus a bounded next-date look-ahead.

    The opening-model selector still owns format, exact-source, lead-time and
    coverage checks. This helper only makes next-day source records visible;
    it never feeds the live scraper slate.
    """
    matches = await extract_schedule_matches(page, base_url)
    seen_urls = {str(match.get("url") or "").strip() for match in matches}

    for _ in range(SCHEDULE_LOOKAHEAD_DAYS):
        try:
            # CREX's accessible label is not stable between headed and
            # headless Chromium, but the visible date-control text is.
            next_button = page.locator("button", has_text="Next >")
            if await next_button.count() != 1:
                break
            await next_button.click()
            # This control updates its fixture list in place. A short bounded
            # render wait prevents parsing the still-visible prior date.
            await page.wait_for_timeout(750)
            next_matches = await extract_schedule_matches(page, base_url)
        except Exception as exc:
            logger.warning("schedule.lookahead.skipped", extra={"error": str(exc)})
            break

        for match in next_matches:
            url = str(match.get("url") or "").strip()
            if not url or url in seen_urls:
                continue
            matches.append(match)
            seen_urls.add(url)

    return matches

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
        self._managed_slate_store = ManagedLiveSlateStore()
        self._managed_live_urls = self._managed_slate_store.load()

    @property
    def managed_live_urls(self) -> List[str]:
        """Return the last durable slate for startup handoff."""
        return list(self._managed_live_urls)

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
        live_discovery_succeeded = False
        
        try:
            async with self.pool.get_context() as context:
                page = None
                urls = []
                try:
                    page = await context.new_page()
                    # Use the specific live matches URL
                    target_url = "https://crex.com/live-matches"
                    logger.info(f"Navigating to {target_url} for discovery...")
                    print(f"[DISCOVERY] Navigating to {target_url}...", flush=True)
                    
                    await page.goto(target_url, timeout=60000)
                    
                    # Wait for content to load - try multiple selectors
                    live_cards_found = True
                    try:
                        # Try a broad selector for any match link or card
                        await page.wait_for_selector("li.live-card, div.live-card, a[href*='/scoreboard/'], a[href*='/cricket-live-score/']", timeout=20000)
                        live_discovery_succeeded = True
                        print("[DISCOVERY] Found match elements.", flush=True)
                    except Exception:
                        live_cards_found = False
                        logger.warning("No live cards found on live-matches page (timeout); continuing with schedule discovery.")
                        print("[DISCOVERY] No live cards found (timeout); continuing to schedule discovery.", flush=True)

                    if (live_cards_found):
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

                            // Helper: extract the match link from a card element.
                            // Prefers a[href*="/cricket-live-score/"] or a[href*="/scoreboard/"]
                            // over the first <a> (which may be the series/header link).
                            const getMatchLink = (element) => {
                                return element.querySelector(
                                    'a[href*="/cricket-live-score/"], a[href*="/scoreboard/"]'
                                );
                            };

                            // Helper to check if card is actually live.
                            // Uses tag-agnostic class selector (.live) so it works regardless
                            // of whether the element is a div, span, or other tag.
                            const isLive = (element) => {
                                return element.querySelector('.live, .liveTag, [class*="live-indicator"]') !== null;
                            };

                            // Strategy 1: Look for li.live-card (current crex.com structure)
                            const listItems = document.querySelectorAll('li.live-card');
                            if (listItems.length > 0) {
                                listItems.forEach(li => {
                                    if (isLive(li) && !isFinishedText(li.innerText)) {
                                        // Prefer a direct match link; fall back to first <a> if needed
                                        const a = getMatchLink(li) || li.querySelector('a');
                                        if (a) {
                                            const href = a.getAttribute('href');
                                            if (href && (href.includes('/scoreboard/') || href.includes('/cricket-live-score/'))) {
                                                urls.push(href);
                                            }
                                        }
                                    }
                                });
                            }

                            // Strategy 2: Look for div.live-card (alternative structure)
                            if (urls.length === 0) {
                                const divItems = document.querySelectorAll('div.live-card');
                                if (divItems.length > 0) {
                                    divItems.forEach(div => {
                                        if (isLive(div) && !isFinishedText(div.innerText)) {
                                            // Use targeted link selector to avoid picking up the series link
                                            const a = getMatchLink(div);
                                            if (a) {
                                                const href = a.getAttribute('href');
                                                if (href && (href.includes('/scoreboard/') || href.includes('/cricket-live-score/'))) {
                                                    urls.push(href);
                                                }
                                            }
                                        }
                                    });
                                }
                            }

                            // Strategy 3: Fallback – any match link inside a live-indicator context
                            if (urls.length === 0) {
                                const links = document.querySelectorAll(
                                    'a[href*="/cricket-live-score/"], a[href*="/scoreboard/"]'
                                );
                                links.forEach(a => {
                                    const href = a.getAttribute('href');
                                    if (!href) return;
                                    const textToCheck = a.innerText + " " +
                                        (a.parentElement ? a.parentElement.innerText : "");
                                    // Only include if nearest ancestor has a live indicator
                                    // and the match is not finished
                                    if (!isFinishedText(textToCheck)) {
                                        const ancestor = a.closest('.live-card, .live-card-wrapper, li[class*="live"]');
                                        if (ancestor && isLive(ancestor)) {
                                            urls.push(href);
                                        }
                                    }
                                });
                            }

                            return [...new Set(urls)];
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
                    await schedule_page.wait_for_selector("a[href*='/scoreboard/'], a[href*='/cricket-live-score/']", timeout=20000)
                    schedule_matches = await extract_schedule_window(schedule_page, self.base_url)
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
                valid_urls.append(normalize_crex_url(url))
        
        # Remove duplicates
        valid_urls = list(dict.fromkeys(valid_urls))

        if not live_discovery_succeeded:
            # A selector timeout is a discovery failure, not proof that every
            # previously managed match finished. Keep the durable slate and do
            # not send an empty authoritative sync to the backend.
            logger.warning(
                "Live discovery did not produce a trustworthy catalogue; retaining managed slate=%s",
                self._managed_live_urls,
            )
            print("[DISCOVERY] Live catalogue unavailable; retaining managed slate.", flush=True)
            return

        terminal_urls = await self._find_terminal_absent_matches(valid_urls)
        selected_urls = reconcile_managed_live_slate(
            valid_urls,
            self._managed_live_urls,
            self.settings.max_live_matches,
            terminal_urls=terminal_urls,
        )
        self._managed_live_urls = selected_urls
        self._managed_slate_store.save(selected_urls)
        valid_urls = list(selected_urls)

        logger.info(
            "Discovered live matches selected=%s policy=sticky-until-terminal,international-first-fill,series-cap-3: %s",
            len(valid_urls),
            valid_urls,
        )
        print(f"[DISCOVERY] Selected {len(valid_urls)} matches: {valid_urls}", flush=True)

        if self._on_match_catalog_updated:
            callback_result = self._on_match_catalog_updated(valid_urls, schedule_matches)
            if inspect.isawaitable(callback_result):
                await callback_result
        
        # Always reconcile the live catalog, even when CREX currently has zero live matches.
        # Otherwise stale LIVE rows remain in the backend forever because nothing tells it
        # the authoritative live set is now empty.
        token = await asyncio.to_thread(CricketDataService.get_bearer_token)
        live_synced = await asyncio.to_thread(CricketDataService.add_live_matches, valid_urls, token)
        if live_synced:
            logger.info("Synced live matches with backend.")
        else:
            logger.error("Live match lifecycle sync failed; retrying next discovery cycle.")

        if schedule_matches:
            schedule_synced = await asyncio.to_thread(CricketDataService.add_schedule_matches, schedule_matches, token)
            if schedule_synced:
                logger.info("Synced schedule matches with backend.")
            else:
                logger.error("Schedule lifecycle sync failed; retrying next discovery cycle.")

        print("[DISCOVERY] Backend sync cycle completed.", flush=True)

    async def _find_terminal_absent_matches(self, discovered_urls: List[str]) -> List[str]:
        """Release locked slots only when the stored snapshot proves completion."""
        discovered_keys = {
            (extract_crex_api_key(url) or str(url).rsplit("-", 1)[-1]).lower()
            for url in discovered_urls
            if url
        }
        absent_urls = [
            url for url in self._managed_live_urls
            if (extract_crex_api_key(url) or str(url).rsplit("-", 1)[-1]).lower() not in discovered_keys
        ]
        if not absent_urls:
            return []

        token = await asyncio.to_thread(CricketDataService.get_bearer_token)
        terminal_urls: List[str] = []
        for url in absent_urls:
            snapshot = await asyncio.to_thread(CricketDataService.get_last_updated_data, url, token)
            if isinstance(snapshot, dict) and has_terminal_evidence({"url": url, **snapshot}):
                terminal_urls.append(url)
                logger.info("managed_slate.release_terminal_match url=%s", url)
        return terminal_urls

