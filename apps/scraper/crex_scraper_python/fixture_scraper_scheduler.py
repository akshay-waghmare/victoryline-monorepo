"""
Fixture Scraper Scheduler
Feature 005: Upcoming Matches Feed

Schedules and manages periodic fixture scraping.
"""

import logging
import threading
import time
from datetime import datetime, timezone
from typing import Optional

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crex_scraper_python.crex_fixture_scraper import CrexFixtureScraper
from crex_scraper_python.upcoming_match_api_client import UpcomingMatchApiClient
from crex_scraper_python.src.config import Config

logger = logging.getLogger(__name__)


class FixtureScraperScheduler:
    """
    Scheduler for periodic fixture scraping
    
    Features:
    - Runs scraper every 10 minutes
    - Tracks last run time and status
    - Handles errors gracefully
    - Thread-safe operation
    """
    
    def __init__(self, config: Config):
        """
        Initialize scheduler
        
        Args:
            config: Application configuration
        """
        self.config = config
        self.scraper = CrexFixtureScraper(config)
        self.api_client = UpcomingMatchApiClient(
            base_url=config.BACKEND_URL,
            timeout=config.SCRAPER_TIMEOUT
        )
        
        # Scheduling configuration
        self.interval_seconds = 600  # 10 minutes
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
        # Statistics
        self.last_run_time: Optional[datetime] = None
        self.last_run_status: str = "not_started"  # not_started, success, error
        self.last_run_matches_count: int = 0
        self.last_error: Optional[str] = None
        self.total_runs: int = 0
        self.successful_runs: int = 0
        self.failed_runs: int = 0

    def start(self):
        """Start the scheduler in a background thread"""
        if self.running:
            logger.warning("Scheduler already running")
            return
        
        logger.info(f"Starting fixture scraper scheduler (interval: {self.interval_seconds}s)")
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True, name="FixtureScheduler")
        self.thread.start()
        logger.info("Scheduler started successfully")

    def stop(self):
        """Stop the scheduler"""
        if not self.running:
            logger.warning("Scheduler not running")
            return
        
        logger.info("Stopping fixture scraper scheduler...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=30)
        logger.info("Scheduler stopped")

    def _run_loop(self):
        """Main scheduler loop - runs in background thread"""
        logger.info("Scheduler loop started")
        
        # Run immediately on startup
        self._run_scraper()
        
        while self.running:
            try:
                # Sleep in small intervals to allow quick shutdown
                for _ in range(self.interval_seconds):
                    if not self.running:
                        break
                    time.sleep(1)
                
                if self.running:
                    self._run_scraper()
                    
            except Exception as e:
                logger.error(f"Unexpected error in scheduler loop: {e}", exc_info=True)
                time.sleep(10)  # Brief pause before continuing
        
        logger.info("Scheduler loop exited")

    def _run_scraper(self):
        """Execute single scraper run"""
        run_start = datetime.now(timezone.utc)
        self.total_runs += 1
        
        logger.info(f"Starting scraper run #{self.total_runs}")
        
        try:
            # Check backend health first
            if not self.api_client.health_check():
                raise Exception("Backend API health check failed")
            
            # Scrape fixtures
            matches = self.scraper.scrape_fixtures()
            
            if not matches:
                logger.warning("No matches found during scrape")
                self.last_run_status = "success"
                self.last_run_matches_count = 0
                self.last_run_time = run_start
                self.last_error = None
                self.successful_runs += 1
                return
            
            logger.info(f"Scraped {len(matches)} matches, upserting to backend...")
            
            # Upsert to backend (use batch for efficiency)
            results = self.api_client.upsert_matches_batch(matches)
            
            if results is None:
                raise Exception("Failed to upsert matches to backend")
            
            # Success
            self.last_run_status = "success"
            self.last_run_matches_count = len(results)
            self.last_run_time = run_start
            self.last_error = None
            self.successful_runs += 1
            
            duration = (datetime.now(timezone.utc) - run_start).total_seconds()
            logger.info(f"Scraper run completed successfully: {len(results)} matches upserted in {duration:.2f}s")
            
        except Exception as e:
            self.last_run_status = "error"
            self.last_run_time = run_start
            self.last_error = str(e)
            self.failed_runs += 1
            
            logger.error(f"Scraper run failed: {e}", exc_info=True)

    def get_status(self) -> dict:
        """
        Get current scheduler status
        
        Returns:
            Status dictionary with statistics
        """
        return {
            "running": self.running,
            "interval_seconds": self.interval_seconds,
            "last_run_time": self.last_run_time.isoformat() if self.last_run_time else None,
            "last_run_status": self.last_run_status,
            "last_run_matches_count": self.last_run_matches_count,
            "last_error": self.last_error,
            "total_runs": self.total_runs,
            "successful_runs": self.successful_runs,
            "failed_runs": self.failed_runs,
            "success_rate": f"{(self.successful_runs / self.total_runs * 100):.1f}%" if self.total_runs > 0 else "N/A"
        }

    def trigger_immediate_run(self):
        """Trigger an immediate scraper run (outside normal schedule)"""
        if not self.running:
            logger.warning("Cannot trigger run - scheduler not running")
            return
        
        logger.info("Triggering immediate scraper run")
        threading.Thread(target=self._run_scraper, daemon=True, name="FixtureScraperManual").start()
