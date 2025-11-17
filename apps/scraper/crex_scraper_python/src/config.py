"""Central configuration loader for the scraper service."""

from __future__ import annotations

import os
import threading
import uuid
from dataclasses import dataclass, field
from typing import Mapping, Optional

_NUMBER_TYPES = (int, float)


def _coerce_bool(value: object, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "no", "n", "off"}:
        return False
    if default is not None:
        return default
    raise ValueError(f"Cannot coerce {value!r} into boolean")


def _coerce_int(value: object, default: int, *, minimum: Optional[int] = None) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, _NUMBER_TYPES):
        result = int(value)
    else:
        result = int(str(value).strip())
    if minimum is not None and result < minimum:
        raise ValueError(f"Expected integer >= {minimum}, got {result}")
    return result


def _coerce_float(value: object, default: float, *, minimum: Optional[float] = None) -> float:
    if value is None:
        return default
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, _NUMBER_TYPES):
        result = float(value)
    else:
        result = float(str(value).strip())
    if minimum is not None and result < minimum:
        raise ValueError(f"Expected float >= {minimum}, got {result}")
    return result


def _coerce_str(value: object, default: str) -> str:
    if value is None:
        return default
    return str(value)


@dataclass(frozen=True)
class ScraperSettings:
    """Typed scraper configuration."""

    scraper_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    profile: str = "standard"
    max_lifetime_hours: float = 6.0
    memory_soft_limit_mb: int = 1536
    memory_hard_limit_mb: int = 2048
    polling_interval_seconds: float = 2.5
    # Reduced default staleness threshold from 300s (5 min) to 60s (1 min)
    # Rationale: Faster detection of stalled scrapers prevents multi‑hour data freezes
    staleness_threshold_seconds: int = 60
    max_queue_size: int = 1000
    max_queue_size_mb: int = 10
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout_seconds: int = 60
    circuit_breaker_success_threshold: int = 5
    retry_max_attempts: int = 5
    retry_base_delay_seconds: float = 1.0
    retry_max_delay_seconds: float = 16.0
    retry_jitter_seconds: float = 0.3
    memory_restart_grace_seconds: int = 60
    pid_soft_limit: int = 500
    pid_restart_threshold: int = 500
    enable_prometheus_metrics: bool = True
    prometheus_host: str = "0.0.0.0"
    prometheus_port: int = 9090
    health_check_enabled: bool = True
    log_level: str = "INFO"
    log_format: str = "json"
    batch_size: int = 20
    batch_flush_interval_seconds: float = 5.0
    sqlite_db_path: str = "url_state.db"
    sqlite_pool_min_size: int = 1
    sqlite_pool_max_size: int = 5
    sqlite_timeout_seconds: float = 30.0
    memory_check_interval_seconds: float = 30.0
    graceful_shutdown_timeout_seconds: int = 30
    max_consecutive_errors: int = 10
    degraded_error_threshold: int = 3
    failing_error_threshold: int = 6
    degraded_staleness_seconds: int = 120
    orphan_cleanup_interval_seconds: int = 1800
    pid_restart_threshold: int = 500  # New: restart scrapers if observed chrome/playwright PIDs exceed this
    container_restart_interval_minutes: int = 10  # Periodic container restart interval to prevent resource leaks

    @property
    def is_tiny_profile(self) -> bool:
        return self.profile.lower() == "tiny"

    @property
    def max_lifetime_seconds(self) -> float:
        return self.max_lifetime_hours * 3600

    def to_dict(self) -> dict[str, object]:
        """Convert settings to dictionary (needed for dataclass compatibility with tests)."""
        return {
            "scraper_id": self.scraper_id,
            "profile": self.profile,
            "max_lifetime_hours": self.max_lifetime_hours,
            "memory_soft_limit_mb": self.memory_soft_limit_mb,
            "memory_hard_limit_mb": self.memory_hard_limit_mb,
            "polling_interval_seconds": self.polling_interval_seconds,
            "staleness_threshold_seconds": self.staleness_threshold_seconds,
            "max_queue_size": self.max_queue_size,
            "max_queue_size_mb": self.max_queue_size_mb,
            "circuit_breaker_threshold": self.circuit_breaker_threshold,
            "circuit_breaker_timeout_seconds": self.circuit_breaker_timeout_seconds,
            "circuit_breaker_success_threshold": self.circuit_breaker_success_threshold,
            "retry_max_attempts": self.retry_max_attempts,
            "retry_base_delay_seconds": self.retry_base_delay_seconds,
            "retry_max_delay_seconds": self.retry_max_delay_seconds,
            "retry_jitter_seconds": self.retry_jitter_seconds,
            "memory_restart_grace_seconds": self.memory_restart_grace_seconds,
            "pid_soft_limit": self.pid_soft_limit,
            "pid_restart_threshold": self.pid_restart_threshold,
            "enable_prometheus_metrics": self.enable_prometheus_metrics,
            "prometheus_host": self.prometheus_host,
            "prometheus_port": self.prometheus_port,
            "health_check_enabled": self.health_check_enabled,
            "log_level": self.log_level,
            "log_format": self.log_format,
            "batch_size": self.batch_size,
            "batch_flush_interval_seconds": self.batch_flush_interval_seconds,
            "sqlite_db_path": self.sqlite_db_path,
            "sqlite_pool_min_size": self.sqlite_pool_min_size,
            "sqlite_pool_max_size": self.sqlite_pool_max_size,
            "sqlite_timeout_seconds": self.sqlite_timeout_seconds,
            "memory_check_interval_seconds": self.memory_check_interval_seconds,
            "graceful_shutdown_timeout_seconds": self.graceful_shutdown_timeout_seconds,
            "max_consecutive_errors": self.max_consecutive_errors,
            "degraded_error_threshold": self.degraded_error_threshold,
            "failing_error_threshold": self.failing_error_threshold,
            "degraded_staleness_seconds": self.degraded_staleness_seconds,
            "orphan_cleanup_interval_seconds": self.orphan_cleanup_interval_seconds,
            "container_restart_interval_minutes": self.container_restart_interval_minutes,
        }

    @classmethod
    def from_env(cls, env: Mapping[str, object]) -> "ScraperSettings":
        profile = _coerce_str(env.get("SCRAPER_PROFILE"), "standard").lower()
        max_lifetime_hours = _coerce_float(env.get("SCRAPER_MAX_LIFETIME_HOURS"), 6.0, minimum=0.1)
        memory_soft_limit_mb = _coerce_int(env.get("MEMORY_SOFT_LIMIT_MB"), 1536, minimum=128)
        memory_hard_limit_mb = _coerce_int(env.get("MEMORY_HARD_LIMIT_MB"), 2048, minimum=256)
        polling_interval_seconds = _coerce_float(env.get("POLLING_INTERVAL_SECONDS"), 2.5, minimum=0.1)
        # Minimum kept at 30s to avoid hyper‑aggressive restart loops
        staleness_threshold_seconds = _coerce_int(env.get("STALENESS_THRESHOLD_SECONDS"), 60, minimum=30)
        max_queue_size = _coerce_int(env.get("MAX_QUEUE_SIZE"), 1000, minimum=10)
        max_queue_size_mb = _coerce_int(env.get("MAX_QUEUE_SIZE_MB"), 10, minimum=1)
        circuit_breaker_threshold = _coerce_int(env.get("CIRCUIT_BREAKER_THRESHOLD"), 5, minimum=1)
        circuit_breaker_timeout_seconds = _coerce_int(env.get("CIRCUIT_BREAKER_TIMEOUT_SECONDS"), 60, minimum=1)
        circuit_breaker_success_threshold = _coerce_int(env.get("CIRCUIT_BREAKER_SUCCESS_THRESHOLD"), 5, minimum=1)
        retry_max_attempts = _coerce_int(env.get("RETRY_MAX_ATTEMPTS"), 5, minimum=1)
        retry_base_delay_seconds = _coerce_float(env.get("RETRY_BASE_DELAY_SECONDS"), 1.0, minimum=0)
        retry_max_delay_seconds = _coerce_float(env.get("RETRY_MAX_DELAY_SECONDS"), 16.0, minimum=retry_base_delay_seconds)
        retry_jitter_seconds = _coerce_float(env.get("RETRY_JITTER_SECONDS"), 0.3, minimum=0.0)
        memory_restart_grace_seconds = _coerce_int(env.get("SCRAPER_RESTART_GRACE_SECONDS"), 60, minimum=10)
        pid_soft_limit = _coerce_int(env.get("PID_SOFT_LIMIT"), 360, minimum=100)
        pid_restart_threshold = _coerce_int(env.get("PID_RESTART_THRESHOLD"), pid_soft_limit, minimum=100)
        enable_prometheus_metrics = _coerce_bool(env.get("ENABLE_PROMETHEUS_METRICS"), True)
        prometheus_host = _coerce_str(env.get("PROMETHEUS_HOST"), "0.0.0.0")
        prometheus_port = _coerce_int(env.get("PROMETHEUS_PORT"), 9090, minimum=1)
        health_check_enabled = _coerce_bool(env.get("HEALTH_CHECK_ENABLED"), True)
        log_level = _coerce_str(env.get("LOG_LEVEL"), "INFO").upper()
        log_format = _coerce_str(env.get("LOG_FORMAT"), "json").lower()
        batch_size_default = 15 if profile == "tiny" else 20
        batch_size = _coerce_int(env.get("SCRAPER_BATCH_SIZE"), batch_size_default, minimum=1)
        batch_flush_interval_seconds = _coerce_float(env.get("SCRAPER_BATCH_FLUSH_INTERVAL_SECONDS"), 5.0, minimum=0.5)
        sqlite_db_path = _coerce_str(env.get("SCRAPER_DB_PATH"), "url_state.db")
        pool_min_default = 1 if profile == "standard" else 1
        pool_max_default = 5 if profile == "standard" else 3
        sqlite_pool_min_size = _coerce_int(env.get("SCRAPER_DB_POOL_MIN"), pool_min_default, minimum=1)
        sqlite_pool_max_size = _coerce_int(env.get("SCRAPER_DB_POOL_MAX"), pool_max_default, minimum=sqlite_pool_min_size)
        sqlite_timeout_seconds = _coerce_float(env.get("SCRAPER_DB_TIMEOUT_SECONDS"), 30.0, minimum=1.0)
        memory_check_interval_seconds = _coerce_float(env.get("SCRAPER_MEMORY_CHECK_INTERVAL_SECONDS"), 30.0, minimum=1.0)
        graceful_shutdown_timeout_seconds = _coerce_int(env.get("SCRAPER_SHUTDOWN_TIMEOUT_SECONDS"), 30, minimum=1)
        max_consecutive_errors = _coerce_int(env.get("SCRAPER_MAX_CONSECUTIVE_ERRORS"), 10, minimum=1)
        degraded_error_threshold = _coerce_int(env.get("SCRAPER_DEGRADED_ERROR_THRESHOLD"), 3, minimum=1)
        failing_error_threshold = _coerce_int(env.get("SCRAPER_FAILING_ERROR_THRESHOLD"), 6, minimum=degraded_error_threshold)
        degraded_staleness_seconds = _coerce_int(env.get("SCRAPER_DEGRADED_STALENESS_SECONDS"), 120, minimum=30)
        orphan_cleanup_interval_seconds = _coerce_int(env.get("ORPHAN_CLEANUP_INTERVAL_SECONDS"), 1800, minimum=60)
        container_restart_interval_minutes = _coerce_int(env.get("CONTAINER_RESTART_INTERVAL_MINUTES"), 10, minimum=1)
        scraper_id = _coerce_str(env.get("SCRAPER_ID"), str(uuid.uuid4()))

        if memory_soft_limit_mb > memory_hard_limit_mb:
            raise ValueError("MEMORY_SOFT_LIMIT_MB cannot be greater than MEMORY_HARD_LIMIT_MB")
        if failing_error_threshold < degraded_error_threshold:
            raise ValueError("SCRAPER_FAILING_ERROR_THRESHOLD cannot be less than SCRAPER_DEGRADED_ERROR_THRESHOLD")
        if max_consecutive_errors < failing_error_threshold:
            raise ValueError("SCRAPER_MAX_CONSECUTIVE_ERRORS cannot be less than SCRAPER_FAILING_ERROR_THRESHOLD")

        return cls(
            scraper_id=scraper_id,
            profile=profile,
            max_lifetime_hours=max_lifetime_hours,
            memory_soft_limit_mb=memory_soft_limit_mb,
            memory_hard_limit_mb=memory_hard_limit_mb,
            polling_interval_seconds=polling_interval_seconds,
            staleness_threshold_seconds=staleness_threshold_seconds,
            max_queue_size=max_queue_size,
            max_queue_size_mb=max_queue_size_mb,
            circuit_breaker_threshold=circuit_breaker_threshold,
            circuit_breaker_timeout_seconds=circuit_breaker_timeout_seconds,
            circuit_breaker_success_threshold=circuit_breaker_success_threshold,
            retry_max_attempts=retry_max_attempts,
            retry_base_delay_seconds=retry_base_delay_seconds,
            retry_max_delay_seconds=retry_max_delay_seconds,
            retry_jitter_seconds=retry_jitter_seconds,
            memory_restart_grace_seconds=memory_restart_grace_seconds,
            pid_soft_limit=pid_soft_limit,
            pid_restart_threshold=pid_restart_threshold,
            enable_prometheus_metrics=enable_prometheus_metrics,
            prometheus_host=prometheus_host,
            prometheus_port=prometheus_port,
            health_check_enabled=health_check_enabled,
            log_level=log_level,
            log_format=log_format,
            batch_size=batch_size,
            batch_flush_interval_seconds=batch_flush_interval_seconds,
            sqlite_db_path=sqlite_db_path,
            sqlite_pool_min_size=sqlite_pool_min_size,
            sqlite_pool_max_size=sqlite_pool_max_size,
            sqlite_timeout_seconds=sqlite_timeout_seconds,
            memory_check_interval_seconds=memory_check_interval_seconds,
            graceful_shutdown_timeout_seconds=graceful_shutdown_timeout_seconds,
            max_consecutive_errors=max_consecutive_errors,
            degraded_error_threshold=degraded_error_threshold,
            failing_error_threshold=failing_error_threshold,
            degraded_staleness_seconds=degraded_staleness_seconds,
            orphan_cleanup_interval_seconds=orphan_cleanup_interval_seconds,
            container_restart_interval_minutes=container_restart_interval_minutes,
        )


_settings_lock = threading.Lock()
_cached_settings: Optional[ScraperSettings] = None


def load_settings(env: Optional[Mapping[str, object]] = None) -> ScraperSettings:
    """Load settings from env or the process environment."""
    source: Mapping[str, object]
    if env is None:
        source = os.environ
    else:
        source = env
    return ScraperSettings.from_env(source)


def get_settings() -> ScraperSettings:
    """Return cached settings (loading them on first access)."""
    global _cached_settings
    with _settings_lock:
        if _cached_settings is None:
            _cached_settings = load_settings()
        return _cached_settings


def reload_settings(env: Optional[Mapping[str, object]] = None) -> ScraperSettings:
    """Force a settings reload, optionally from the provided mapping."""
    global _cached_settings
    settings = load_settings(env)
    with _settings_lock:
        _cached_settings = settings
    return settings


__all__ = [
    "ScraperSettings",
    "get_settings",
    "load_settings",
    "reload_settings",
]


# Legacy Config class for backward compatibility
class Config:
    """Legacy configuration settings."""
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///url_state.db')
    LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'DEBUG')
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:5000')
    SCRAPING_INTERVAL = int(os.getenv('SCRAPING_INTERVAL', 60))
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')
    SCRAPER_LOG_FORMAT = os.getenv('SCRAPER_LOG_FORMAT', 'json')
    SCRAPER_DEBUG_MODE = os.getenv('SCRAPER_DEBUG_MODE', 'False') == 'True'
    SCRAPER_ARTIFACT_ROOT = os.getenv('SCRAPER_ARTIFACT_ROOT', 'artifacts')
    SCRAPER_ARTIFACT_RETENTION_DAYS = int(os.getenv('SCRAPER_ARTIFACT_RETENTION_DAYS', 14))
    
    # Feature 005: Upcoming Matches configuration
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:8080')
    SCRAPER_TIMEOUT = int(os.getenv('SCRAPER_TIMEOUT', 10))

    @staticmethod
    def init_app(app):
        pass