import pytest

from src.config import load_settings, reload_settings


def test_default_settings_standard_profile():
    settings = load_settings({})
    assert settings.profile == "standard"
    assert settings.batch_size == 20
    assert settings.max_lifetime_hours == 6.0
    assert settings.memory_soft_limit_mb == 1536
    assert settings.memory_hard_limit_mb == 2048
    assert settings.polling_interval_seconds == 0.8
    assert settings.enable_prometheus_metrics is True
    assert settings.memory_restart_grace_seconds == 60
    assert settings.persistent_page_max_count == 30
    assert settings.fast_poll_reconcile_interval_seconds == 0.8
    assert settings.live_match_rescrape_interval_seconds == 15.0
    assert settings.enable_http_sv3_fast_lane is False
    assert settings.http_sv3_base_interval_seconds == 5.0
    assert settings.http_sv3_fallback_scrape_seconds == 45.0
    assert settings.enable_player_stats_crawler is False
    assert settings.player_stats_worker_count == 3


def test_tiny_profile_adjustments():
    env = {
        "SCRAPER_PROFILE": "tiny",
    }
    settings = load_settings(env)
    assert settings.is_tiny_profile is True
    assert settings.batch_size == 15
    assert settings.sqlite_pool_max_size == 3


def test_overrides_and_types():
    env = {
        "SCRAPER_MAX_LIFETIME_HOURS": "7.5",
        "MEMORY_SOFT_LIMIT_MB": "1024",
        "MEMORY_HARD_LIMIT_MB": "1500",
        "POLLING_INTERVAL_SECONDS": "3",
        "RETRY_MAX_ATTEMPTS": "7",
        "ENABLE_PROMETHEUS_METRICS": "false",
        "SCRAPER_DB_POOL_MAX": "8",
        "SCRAPER_DB_TIMEOUT_SECONDS": "45",
        "SCRAPER_BATCH_SIZE": "50",
        "SCRAPER_ID": "test-id",
        "SCRAPER_MAX_CONSECUTIVE_ERRORS": "12",
        "SCRAPER_DEGRADED_ERROR_THRESHOLD": "4",
        "SCRAPER_FAILING_ERROR_THRESHOLD": "8",
        "SCRAPER_DEGRADED_STALENESS_SECONDS": "150",
        "SCRAPER_RESTART_GRACE_SECONDS": "90",
        "ENABLE_PLAYER_STATS_CRAWLER": "true",
        "PLAYER_STATS_BATCH_SIZE": "3",
        "PLAYER_STATS_QUEUE_SIZE": "9",
        "PLAYER_STATS_WORKER_COUNT": "2",
        "PLAYER_STATS_RATE_LIMIT_TOKENS_PER_SEC": "0.2",
        "PLAYER_STATS_LIVE_COOLDOWN_SECONDS": "180",
        "FAST_POLL_RECONCILE_INTERVAL_SECONDS": "0.6",
        "LIVE_MATCH_RESCRAPE_INTERVAL_SECONDS": "12",
        "ENABLE_HTTP_SV3_FAST_LANE": "true",
        "HTTP_SV3_MAX_REQUESTS_PER_MINUTE": "36",
    }
    settings = load_settings(env)
    assert settings.max_lifetime_hours == 7.5
    assert settings.memory_soft_limit_mb == 1024
    assert settings.memory_hard_limit_mb == 1500
    assert settings.polling_interval_seconds == 3.0
    assert settings.retry_max_attempts == 7
    assert settings.enable_prometheus_metrics is False
    assert settings.sqlite_pool_max_size == 8
    assert settings.sqlite_timeout_seconds == 45.0
    assert settings.batch_size == 50
    assert settings.scraper_id == "test-id"
    assert settings.max_consecutive_errors == 12
    assert settings.degraded_error_threshold == 4
    assert settings.failing_error_threshold == 8
    assert settings.degraded_staleness_seconds == 150
    assert settings.memory_restart_grace_seconds == 90
    assert settings.enable_player_stats_crawler is True
    assert settings.player_stats_batch_size == 3
    assert settings.player_stats_queue_size == 9
    assert settings.player_stats_worker_count == 2
    assert settings.player_stats_rate_limit_tokens_per_sec == 0.2
    assert settings.player_stats_live_cooldown_seconds == 180
    assert settings.fast_poll_reconcile_interval_seconds == 0.6
    assert settings.live_match_rescrape_interval_seconds == 12.0
    assert settings.enable_http_sv3_fast_lane is True
    assert settings.http_sv3_max_requests_per_minute == 36


@pytest.mark.parametrize(
    "env,key",
    [
        ({"MEMORY_SOFT_LIMIT_MB": "4096", "MEMORY_HARD_LIMIT_MB": "1024"}, "soft_gt_hard"),
        ({"RETRY_MAX_DELAY_SECONDS": "2", "RETRY_BASE_DELAY_SECONDS": "4"}, "max_delay_lt_base"),
        ({"SCRAPER_FAILING_ERROR_THRESHOLD": "2", "SCRAPER_DEGRADED_ERROR_THRESHOLD": "5"}, "failing_lt_degraded"),
        ({"SCRAPER_MAX_CONSECUTIVE_ERRORS": "4", "SCRAPER_FAILING_ERROR_THRESHOLD": "5"}, "max_error_lt_failing"),
        ({"SCRAPER_RESTART_GRACE_SECONDS": "5"}, "restart_grace_too_low"),
        ({"PLAYER_STATS_BATCH_SIZE": "5", "PLAYER_STATS_QUEUE_SIZE": "2"}, "player_stats_batch_gt_queue"),
    ],
)
def test_invalid_values_raise(env, key):
    with pytest.raises(ValueError):
        load_settings(env)


def test_reload_settings_updates_cache(monkeypatch):
    monkeypatch.delenv("SCRAPER_PROFILE", raising=False)
    initial = reload_settings({"SCRAPER_PROFILE": "standard"})
    assert initial.profile == "standard"
    updated = reload_settings({"SCRAPER_PROFILE": "tiny"})
    assert updated.profile == "tiny"
    assert updated.is_tiny_profile is True


@pytest.fixture(autouse=True)
def _reset_cached_settings():
    # Ensure cached settings do not leak between tests
    reload_settings({})
    yield
    reload_settings({})
