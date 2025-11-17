"""
Scraper Health Tracker for Upcoming Matches
Feature 005: Upcoming Matches Feed

Monitors scraper health including PID count, memory usage, and staleness.
"""

import logging
import psutil
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status levels"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILING = "failing"


class ScraperHealthTracker:
    """
    Tracks scraper health metrics and determines overall health status
    
    Monitors:
    - PID count (prevent thread leaks)
    - Memory usage
    - Data staleness
    - Scraper run success rate
    - Backend connectivity
    """
    
    # Thresholds per incident documentation
    PID_WARNING_THRESHOLD = 200
    PID_CRITICAL_THRESHOLD = 400
    STALENESS_WARNING_SECONDS = 60
    STALENESS_CRITICAL_SECONDS = 300
    MEMORY_WARNING_MB = 512
    MEMORY_CRITICAL_MB = 1024
    SUCCESS_RATE_WARNING = 70.0  # percent
    SUCCESS_RATE_CRITICAL = 50.0  # percent
    
    def __init__(self, scheduler=None, api_client=None):
        """
        Initialize health tracker
        
        Args:
            scheduler: FixtureScraperScheduler instance
            api_client: UpcomingMatchApiClient instance
        """
        self.scheduler = scheduler
        self.api_client = api_client
        self.process = psutil.Process(os.getpid())

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status
        
        Returns:
            Health status dictionary with metrics and overall status
        """
        # Collect metrics
        pid_count = self._get_pid_count()
        memory_mb = self._get_memory_usage_mb()
        staleness_seconds = self._get_data_staleness_seconds()
        success_rate = self._get_success_rate()
        backend_healthy = self._check_backend_health()
        
        # Determine issues
        issues = []
        warnings = []
        
        # PID checks
        if pid_count >= self.PID_CRITICAL_THRESHOLD:
            issues.append(f"Critical PID count: {pid_count} (threshold: {self.PID_CRITICAL_THRESHOLD})")
        elif pid_count >= self.PID_WARNING_THRESHOLD:
            warnings.append(f"High PID count: {pid_count} (warning threshold: {self.PID_WARNING_THRESHOLD})")
        
        # Memory checks
        if memory_mb >= self.MEMORY_CRITICAL_MB:
            issues.append(f"Critical memory usage: {memory_mb}MB (threshold: {self.MEMORY_CRITICAL_MB}MB)")
        elif memory_mb >= self.MEMORY_WARNING_MB:
            warnings.append(f"High memory usage: {memory_mb}MB (warning threshold: {self.MEMORY_WARNING_MB}MB)")
        
        # Staleness checks
        if staleness_seconds is not None:
            if staleness_seconds >= self.STALENESS_CRITICAL_SECONDS:
                issues.append(f"Critical data staleness: {staleness_seconds}s (threshold: {self.STALENESS_CRITICAL_SECONDS}s)")
            elif staleness_seconds >= self.STALENESS_WARNING_SECONDS:
                warnings.append(f"Data staleness: {staleness_seconds}s (warning threshold: {self.STALENESS_WARNING_SECONDS}s)")
        
        # Success rate checks
        if success_rate is not None:
            if success_rate < self.SUCCESS_RATE_CRITICAL:
                issues.append(f"Critical success rate: {success_rate:.1f}% (threshold: {self.SUCCESS_RATE_CRITICAL}%)")
            elif success_rate < self.SUCCESS_RATE_WARNING:
                warnings.append(f"Low success rate: {success_rate:.1f}% (warning threshold: {self.SUCCESS_RATE_WARNING}%)")
        
        # Backend checks
        if not backend_healthy:
            issues.append("Backend API unreachable")
        
        # Determine overall status
        if issues:
            overall_status = HealthStatus.FAILING
        elif warnings:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Build response
        return {
            "status": overall_status.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "pid_count": pid_count,
                "memory_mb": memory_mb,
                "staleness_seconds": staleness_seconds,
                "success_rate_percent": success_rate,
                "backend_healthy": backend_healthy
            },
            "thresholds": {
                "pid_warning": self.PID_WARNING_THRESHOLD,
                "pid_critical": self.PID_CRITICAL_THRESHOLD,
                "staleness_warning": self.STALENESS_WARNING_SECONDS,
                "staleness_critical": self.STALENESS_CRITICAL_SECONDS,
                "memory_warning_mb": self.MEMORY_WARNING_MB,
                "memory_critical_mb": self.MEMORY_CRITICAL_MB,
                "success_rate_warning": self.SUCCESS_RATE_WARNING,
                "success_rate_critical": self.SUCCESS_RATE_CRITICAL
            },
            "issues": issues,
            "warnings": warnings,
            "scheduler": self.scheduler.get_status() if self.scheduler else None
        }

    def _get_pid_count(self) -> int:
        """
        Get total PID count for scraper process and children
        Critical for detecting thread/process leaks
        """
        try:
            # Count main process + all children
            children = self.process.children(recursive=True)
            total = 1 + len(children)  # +1 for main process
            
            logger.debug(f"PID count: {total} (1 main + {len(children)} children)")
            return total
        except Exception as e:
            logger.warning(f"Error counting PIDs: {e}")
            return 0

    def _get_memory_usage_mb(self) -> float:
        """Get memory usage in MB"""
        try:
            mem_info = self.process.memory_info()
            mb = mem_info.rss / (1024 * 1024)  # Convert bytes to MB
            logger.debug(f"Memory usage: {mb:.2f}MB")
            return round(mb, 2)
        except Exception as e:
            logger.warning(f"Error getting memory usage: {e}")
            return 0.0

    def _get_data_staleness_seconds(self) -> Optional[int]:
        """
        Calculate data staleness in seconds
        Returns None if no data has been scraped yet
        """
        if not self.scheduler or not self.scheduler.last_run_time:
            return None
        
        try:
            now = datetime.now(timezone.utc)
            last_run = self.scheduler.last_run_time
            
            # Ensure last_run is timezone-aware
            if last_run.tzinfo is None:
                last_run = last_run.replace(tzinfo=timezone.utc)
            
            staleness = (now - last_run).total_seconds()
            logger.debug(f"Data staleness: {staleness:.0f}s")
            return int(staleness)
        except Exception as e:
            logger.warning(f"Error calculating staleness: {e}")
            return None

    def _get_success_rate(self) -> Optional[float]:
        """Get scraper success rate as percentage"""
        if not self.scheduler or self.scheduler.total_runs == 0:
            return None
        
        try:
            rate = (self.scheduler.successful_runs / self.scheduler.total_runs) * 100
            return round(rate, 1)
        except Exception as e:
            logger.warning(f"Error calculating success rate: {e}")
            return None

    def _check_backend_health(self) -> bool:
        """Check if backend API is healthy"""
        if not self.api_client:
            return True  # Assume healthy if no client configured
        
        try:
            return self.api_client.health_check()
        except Exception as e:
            logger.warning(f"Backend health check error: {e}")
            return False

    def should_restart(self) -> bool:
        """
        Determine if scraper should be restarted based on health
        
        Returns:
            True if restart is recommended
        """
        status = self.get_health_status()
        
        # Restart if failing
        if status["status"] == HealthStatus.FAILING.value:
            logger.warning("Health check recommends restart (FAILING status)")
            return True
        
        # Restart if specific critical thresholds exceeded
        metrics = status["metrics"]
        if metrics["pid_count"] >= self.PID_CRITICAL_THRESHOLD:
            logger.warning(f"Health check recommends restart (PID count: {metrics['pid_count']})")
            return True
        
        if metrics["staleness_seconds"] and metrics["staleness_seconds"] >= self.STALENESS_CRITICAL_SECONDS:
            logger.warning(f"Health check recommends restart (staleness: {metrics['staleness_seconds']}s)")
            return True
        
        return False
