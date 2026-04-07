import time
from types import SimpleNamespace
from unittest.mock import MagicMock

from crex_scraper_python.src.crex_scraper import CrexScraperService


def _build_service():
    service = CrexScraperService.__new__(CrexScraperService)
    service.settings = SimpleNamespace(live_match_rescrape_interval_seconds=15.0)
    service.persistent_page_pool = MagicMock()
    service._last_full_live_scrape_at = {}
    return service


def test_should_submit_live_task_when_persistent_page_inactive():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = False

    assert service._should_submit_live_task("crex:test-match") is True


def test_should_skip_live_task_when_fast_page_is_already_hot():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = True
    service._last_full_live_scrape_at["crex:test-match"] = time.monotonic()

    assert service._should_submit_live_task("crex:test-match") is False


def test_should_submit_live_task_after_rescrape_interval_expires():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = True
    service._last_full_live_scrape_at["crex:test-match"] = (
        time.monotonic() - service.settings.live_match_rescrape_interval_seconds - 1
    )

    assert service._should_submit_live_task("crex:test-match") is True
