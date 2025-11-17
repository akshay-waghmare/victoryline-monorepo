"""
Crex Fixture Scraper
Feature 005: Upcoming Matches Feed

Scrapes upcoming cricket match fixtures from Crex.live.
Supports both HTTP+BeautifulSoup (preferred) and Playwright fallback.
"""

import logging
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import List, Optional
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.upcoming_match import UpcomingMatch, MatchStatus
from crex_scraper_python.src.config import Config

logger = logging.getLogger(__name__)


class CrexFixtureScraper:
    """
    Scraper for upcoming cricket fixtures from Crex.live
    
    Implements resilient scraping with:
    - HTTP + BeautifulSoup (primary method)
    - Playwright browser automation (fallback)
    - Exponential backoff retry logic
    - Browser cleanup tracking
    """
    
    BASE_URL = "https://crex.live"
    FIXTURES_PATH = "/fixtures"
    
    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Retry configuration (from clarification decision)
        self.retry_initial_delay = 2.0  # seconds
        self.retry_multiplier = 2.0
        self.retry_max_delay = 5.0
        self.max_retries = 3
        
        self._browser_launched = False
        self._browser = None
        self._playwright = None

    def scrape_fixtures(self) -> List[UpcomingMatch]:
        """
        Scrape upcoming match fixtures
        
        Returns:
            List of UpcomingMatch dataclass instances
        """
        logger.info("Starting fixture scrape from Crex.live")
        
        try:
            # Try HTTP + BeautifulSoup first
            html = self._fetch_with_http()
            if html:
                matches = self._parse_fixtures(html)
                logger.info(f"HTTP scrape successful: {len(matches)} matches found")
                return matches
            
            # Fallback to Playwright
            logger.warning("HTTP scrape failed, falling back to Playwright")
            html = self._fetch_with_playwright()
            if html:
                matches = self._parse_fixtures(html)
                logger.info(f"Playwright scrape successful: {len(matches)} matches found")
                return matches
            
            logger.error("Both HTTP and Playwright scraping failed")
            return []
            
        except Exception as e:
            logger.error(f"Unexpected error during scrape: {e}", exc_info=True)
            return []
        finally:
            self._cleanup_browser()

    def _fetch_with_http(self) -> Optional[str]:
        """
        Fetch fixtures page using HTTP + requests
        
        Returns:
            HTML content or None if failed
        """
        url = f"{self.BASE_URL}{self.FIXTURES_PATH}"
        delay = self.retry_initial_delay
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.debug(f"HTTP fetch attempt {attempt}/{self.max_retries}")
                response = self.session.get(url, timeout=10)
                
                if response.status_code == 200:
                    return response.text
                
                logger.warning(f"HTTP fetch returned status {response.status_code}")
                
                if response.status_code in [500, 502, 503, 504]:
                    # Server error - retry with backoff
                    if attempt < self.max_retries:
                        logger.info(f"Retrying in {delay}s...")
                        import time
                        time.sleep(delay)
                        delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                        continue
                
                # Client error (4xx) - don't retry
                return None
                
            except requests.RequestException as e:
                logger.warning(f"HTTP fetch attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    import time
                    time.sleep(delay)
                    delay = min(delay * self.retry_multiplier, self.retry_max_delay)
                else:
                    return None
        
        return None

    def _fetch_with_playwright(self) -> Optional[str]:
        """
        Fetch fixtures page using Playwright browser automation
        CRITICAL: Must cleanup browser resources properly
        
        Returns:
            HTML content or None if failed
        """
        try:
            # Use context manager for automatic cleanup
            with sync_playwright() as playwright:
                self._playwright = playwright
                
                browser = playwright.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage']
                )
                self._browser = browser
                self._browser_launched = True
                
                page = browser.new_page()
                url = f"{self.BASE_URL}{self.FIXTURES_PATH}"
                
                logger.debug(f"Playwright navigating to {url}")
                page.goto(url, wait_until='networkidle', timeout=15000)
                
                html = page.content()
                
                # Explicit cleanup
                page.close()
                browser.close()
                self._browser_launched = False
                self._browser = None
                self._playwright = None
                
                return html
                
        except PlaywrightTimeout:
            logger.error("Playwright timeout waiting for page load")
            return None
        except Exception as e:
            logger.error(f"Playwright error: {e}", exc_info=True)
            return None
        finally:
            # Ensure cleanup even if exception occurs
            self._cleanup_browser()

    def _cleanup_browser(self):
        """
        Force cleanup of browser resources
        CRITICAL: Prevents thread/PID leak per incident SCRAPER_THREAD_LEAK_INCIDENT.md
        """
        if self._browser_launched and self._browser:
            try:
                logger.debug("Forcing browser cleanup")
                self._browser.close()
            except Exception as e:
                logger.warning(f"Error during browser cleanup: {e}")
            finally:
                self._browser = None
                self._browser_launched = False
                self._playwright = None

    def _parse_fixtures(self, html: str) -> List[UpcomingMatch]:
        """
        Parse HTML and extract upcoming match data
        
        Args:
            html: HTML content from fixtures page
            
        Returns:
            List of UpcomingMatch instances
        """
        matches = []
        soup = BeautifulSoup(html, 'html.parser')
        
        logger.debug("Parsing fixtures HTML from Crex.live")
        
        try:
            # Find all fixture cards (li with class match-card-container)
            fixture_cards = soup.find_all('li', class_='match-card-container')
            logger.info(f"Found {len(fixture_cards)} fixture cards")
            
            for card in fixture_cards:
                try:
                    match = self._parse_fixture_card(card)
                    if match:
                        matches.append(match)
                except Exception as e:
                    logger.warning(f"Error parsing fixture card: {e}")
                    continue
            
            logger.info(f"Successfully parsed {len(matches)} fixtures")
            
        except Exception as e:
            logger.error(f"Error parsing fixtures HTML: {e}", exc_info=True)
        
        return matches

    def _parse_fixture_card(self, card) -> Optional[UpcomingMatch]:
        """
        Parse single fixture card HTML element from Crex.live
        
        Args:
            card: BeautifulSoup element for fixture card (li.match-card-container)
            
        Returns:
            UpcomingMatch instance or None if parsing fails
        """
        try:
            # Find the link element which contains match URL
            link = card.find('a', class_='match-card-wrapper')
            if not link:
                logger.warning("No link found in fixture card")
                return None
            
            # Extract source key from href (e.g., /scoreboard/XHL/20K/1st-T20/...)
            href = link.get('href', '')
            source_key = href.replace('/scoreboard/', '').replace('/info', '').replace('/live', '')
            
            # Skip live matches (they're already in progress)
            if card.find('div', class_='result live'):
                logger.debug(f"Skipping live match: {source_key}")
                return None
            
            # Extract team names (there are 2 span.team-name elements)
            team_names = card.find_all('span', class_='team-name')
            if len(team_names) < 2:
                logger.warning("Could not find both team names")
                return None
            
            team_a_name = team_names[0].text.strip()
            team_b_name = team_names[1].text.strip()
            
            # Extract match time from div.start-text
            time_elem = card.find('div', class_='start-text')
            if not time_elem:
                logger.warning("Could not find start time element")
                return None
            
            time_text = time_elem.text.strip()
            
            # Extract series info from p.time element
            series_elem = card.find('p', class_='time')
            series_text = ""
            match_format = "Match"
            
            if series_elem:
                # Extract text content, handling match number and format
                series_full = series_elem.text.strip()
                # Example: "1st T20, BAH vs INDO 2025"
                parts = series_full.split(',', 1)
                if len(parts) >= 2:
                    match_format = parts[0].strip()  # "1st T20"
                    series_text = parts[1].strip()    # "BAH vs INDO 2025"
                else:
                    series_text = series_full
            
            # Parse the match time with context of today's date
            start_time = self._parse_match_time(time_text, series_text)
            
            if not start_time:
                logger.warning(f"Could not parse match time: {time_text}")
                return None
            
            # Create UpcomingMatch instance
            match = UpcomingMatch(
                source="crex",
                source_key=source_key if source_key else f"crex-{team_a_name}-{team_b_name}",
                series_name=series_text if series_text else "Unknown Series",
                match_title=f"{team_a_name} vs {team_b_name}",
                team_a_name=team_a_name,
                team_b_name=team_b_name,
                start_time_utc=start_time,
                last_scraped_at=datetime.now(timezone.utc),
                status=MatchStatus.SCHEDULED
            )
            
            logger.debug(f"Parsed match: {match.match_title} at {start_time}")
            return match
            
        except Exception as e:
            logger.warning(f"Error parsing fixture card: {e}", exc_info=True)
            return None

    def _parse_match_time(self, time_str: str, context: str = "") -> Optional[datetime]:
        """
        Parse match time string to datetime from Crex.live format
        
        Args:
            time_str: Time string from HTML (e.g., "7:00 AM", "1:40 PM")
            context: Additional context like series name for date inference
            
        Returns:
            datetime in UTC or None if parsing fails
        """
        try:
            from datetime import timedelta
            import re
            
            # Clean up the time string
            time_str = time_str.strip()
            
            # Crex.live shows times like "7:00 AM", "1:40 PM"
            # We need to combine with today's date or infer from fixture page date grouping
            
            # For now, assume times are in IST (India Standard Time, UTC+5:30)
            # and apply to today or tomorrow based on current time
            
            # Parse time using basic regex
            time_match = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str, re.IGNORECASE)
            if not time_match:
                logger.warning(f"Could not parse time format: {time_str}")
                return None
            
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            period = time_match.group(3).upper()
            
            # Convert to 24-hour format
            if period == 'PM' and hour != 12:
                hour += 12
            elif period == 'AM' and hour == 12:
                hour = 0
            
            # Get current time in IST
            ist_tz = timezone(timedelta(hours=5, minutes=30))
            now_ist = datetime.now(ist_tz)
            
            # Create datetime for match (assume today in IST)
            match_time_ist = now_ist.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # If match time is in the past, assume it's tomorrow
            if match_time_ist < now_ist:
                match_time_ist += timedelta(days=1)
            
            # Convert IST to UTC
            match_time_utc = match_time_ist.astimezone(timezone.utc)
            
            # Return as naive datetime (remove timezone info for consistency with entity)
            return match_time_utc.replace(tzinfo=None)
            
        except Exception as e:
            logger.warning(f"Error parsing time '{time_str}': {e}", exc_info=True)
            return None
