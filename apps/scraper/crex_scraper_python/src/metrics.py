"""
Prometheus Metrics Collector for Scraper.
"""

import logging
from typing import Dict
from prometheus_client import Counter, Gauge, Histogram, CollectorRegistry

logger = logging.getLogger(__name__)

class MetricsCollector:
    """
    Centralized metrics collection for the scraper service.
    """

    def __init__(self, registry: CollectorRegistry = None):
        self.registry = registry or CollectorRegistry(auto_describe=True)
        
        # Freshness
        self.freshness = Gauge(
            'scraper_freshness_seconds',
            'Time since last successful scrape per match',
            ['match_id', 'domain'],
            registry=self.registry
        )

        # Queue & Concurrency
        self.queue_depth = Gauge(
            'scraper_queue_depth',
            'Number of tasks waiting in the scheduler queue',
            registry=self.registry
        )
        self.active_tasks = Gauge(
            'scraper_active_tasks',
            'Number of tasks currently being processed',
            registry=self.registry
        )

        # Counters
        self.scrapes_total = Counter(
            'scraper_scrapes_total',
            'Total number of scrape attempts',
            ['domain', 'status'], # status: success, failure, timeout
            registry=self.registry
        )
        self.domain_failures = Counter(
            'scraper_domain_failures_total',
            'Total number of domain-specific failures',
            ['domain', 'error_type'],
            registry=self.registry
        )

        # Latency
        self.scrape_duration = Histogram(
            'scraper_scrape_duration_seconds',
            'Time taken to complete a scrape task',
            ['domain'],
            buckets=(1, 2.5, 5, 7.5, 10, 15, 20, 30, 60),
            registry=self.registry
        )
        
        # Health
        self.health_score = Gauge(
            'scraper_health_score',
            'Current health score of the scraper (0-100)',
            registry=self.registry
        )
        
        # Resources
        self.browser_restarts = Counter(
            'scraper_browser_restarts_total',
            'Total number of browser/context restarts',
            ['reason'],
            registry=self.registry
        )

    def record_scrape_result(self, domain: str, status: str, duration: float):
        """Record the outcome of a scrape attempt."""
        self.scrapes_total.labels(domain=domain, status=status).inc()
        self.scrape_duration.labels(domain=domain).observe(duration)

    def update_freshness(self, match_id: str, domain: str, age_seconds: float):
        """Update freshness gauge for a match."""
        self.freshness.labels(match_id=match_id, domain=domain).set(age_seconds)

    def set_queue_metrics(self, depth: int, active: int):
        """Update queue depth and active task counts."""
        self.queue_depth.set(depth)
        self.active_tasks.set(active)
