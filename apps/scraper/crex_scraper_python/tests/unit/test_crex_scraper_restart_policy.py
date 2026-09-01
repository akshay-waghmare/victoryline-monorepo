import time

from crex_scraper_python.src.crex_scraper import CrexScraperService
from crex_scraper_python.src.health import HealthState, HealthSummary


def build_summary(**overrides) -> HealthSummary:
    data = {
        "state": HealthState.HEALTHY,
        "score": 100,
        "uptime_seconds": 60.0,
        "pids_count": 50,
        "memory_usage_mb": 100.0,
        "last_scrape_timestamp": time.time(),
        "active_matches": 0,
        "details": {},
    }
    data.update(overrides)
    return HealthSummary(**data)


def test_get_restart_condition_triggers_for_stale_live_data():
    service = CrexScraperService()
    object.__setattr__(service.settings, "staleness_threshold_seconds", 60)
    object.__setattr__(service.settings, "memory_restart_grace_seconds", 30)

    summary = build_summary(
        state=HealthState.DEGRADED,
        score=70,
        active_matches=4,
        last_scrape_timestamp=time.time() - 61,
    )

    condition = service.get_restart_condition(summary)

    assert condition is not None
    assert condition["reason"] == "stale_live_data"
    assert condition["metadata"]["active_matches"] == 4


def test_get_restart_condition_does_not_trigger_without_live_matches():
    service = CrexScraperService()
    object.__setattr__(service.settings, "staleness_threshold_seconds", 60)

    summary = build_summary(
        state=HealthState.FAILING,
        score=30,
        active_matches=0,
        last_scrape_timestamp=time.time() - 600,
    )

    assert service.get_restart_condition(summary) is None


def test_get_restart_condition_triggers_for_pid_threshold():
    service = CrexScraperService()
    object.__setattr__(service.settings, "pid_restart_threshold", 260)

    summary = build_summary(
        state=HealthState.DEGRADED,
        score=70,
        pids_count=275,
        active_matches=2,
    )

    condition = service.get_restart_condition(summary)

    assert condition is not None
    assert condition["reason"] == "pid_threshold_exceeded"
    assert condition["metadata"]["pids"] == 275


def test_get_restart_condition_triggers_when_one_managed_match_is_stale():
    service = CrexScraperService()
    object.__setattr__(service.settings, "staleness_threshold_seconds", 60)
    object.__setattr__(service.settings, "memory_restart_grace_seconds", 30)
    url = "https://crex.com/cricket-live-score/team-a-vs-team-b-1st-match-cup-2026-match-updates-ABC"
    match_id = service._extract_match_id(url)
    service._last_managed_live_urls = [url]
    service._managed_match_last_success[match_id] = time.time() - 61

    condition = service.get_restart_condition(build_summary(active_matches=1))

    assert condition is not None
    assert condition["reason"] == "stale_managed_live_match"
    assert condition["metadata"]["stale_matches"][0]["match_id"] == match_id
