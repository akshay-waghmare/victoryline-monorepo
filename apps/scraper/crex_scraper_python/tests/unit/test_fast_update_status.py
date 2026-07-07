from types import SimpleNamespace

from src.crex_scraper import CrexScraperService


class _Stats:
    def __init__(self, stats):
        self._stats = stats

    def get_stats(self):
        return self._stats


def _service():
    service = CrexScraperService.__new__(CrexScraperService)
    service.settings = SimpleNamespace(
        enable_fast_updates=True,
        enable_immediate_push=True,
        enable_persistent_pages=True,
        persistent_page_max_count=30,
    )
    service._last_live_match_count = 4
    service._last_managed_live_match_count = 2
    service.persistent_page_pool = _Stats({
        "size": 3,
        "max_size": 30,
        "total_errors": 1,
    })
    service.fast_poll_service = _Stats({
        "active_pages": 3,
        "cached_matches": 2,
    })
    return service


def test_fast_update_status_reports_partial_coverage():
    status = _service().get_fast_update_status()

    assert status == {
        "enabled": True,
        "live_matches": 4,
        "managed_live_matches": 2,
        "covered_matches": 3,
        "coverage_ratio": 0.75,
        "capacity": 30,
        "pool_errors": 1,
        "active_interceptors": 3,
        "cached_matches": 2,
    }


def test_fast_update_status_reports_disabled_without_persistent_pages():
    service = _service()
    service.settings.enable_persistent_pages = False
    service.persistent_page_pool = None
    service.fast_poll_service = None

    status = service.get_fast_update_status()

    assert status["enabled"] is False
    assert status["managed_live_matches"] == 2
    assert status["covered_matches"] == 0
    assert status["coverage_ratio"] == 0.0


def test_fast_update_status_falls_back_managed_count_when_missing():
    service = _service()
    del service._last_managed_live_match_count

    status = service.get_fast_update_status()

    assert status["live_matches"] == 4
    assert status["managed_live_matches"] == 4
