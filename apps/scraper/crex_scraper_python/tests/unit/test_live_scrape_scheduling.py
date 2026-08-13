import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from crex_scraper_python.src.crex_scraper import CrexScraperService


def _build_service():
    service = CrexScraperService.__new__(CrexScraperService)
    service.settings = SimpleNamespace(
        live_match_rescrape_interval_seconds=15.0,
        http_sv3_fallback_scrape_seconds=45.0,
    )
    service.persistent_page_pool = AsyncMock()
    service._last_full_live_scrape_at = {}
    service._http_sv3_fallback_next_at = 0.0
    service.http_sv3_fast_lane = None
    return service


@pytest.mark.asyncio
async def test_should_submit_live_task_when_persistent_page_inactive():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = False

    assert await service._should_submit_live_task("crex:test-match") is True


@pytest.mark.asyncio
async def test_should_skip_live_task_when_fast_page_is_already_hot():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = True
    service._last_full_live_scrape_at["crex:test-match"] = time.monotonic()

    assert await service._should_submit_live_task("crex:test-match") is False


@pytest.mark.asyncio
async def test_should_submit_live_task_after_rescrape_interval_expires():
    service = _build_service()
    service.persistent_page_pool.is_page_active.return_value = True
    service._last_full_live_scrape_at["crex:test-match"] = (
        time.monotonic() - service.settings.live_match_rescrape_interval_seconds - 1
    )

    assert await service._should_submit_live_task("crex:test-match") is True


def test_http_sv3_fallbacks_are_staggered_across_selected_matches(monkeypatch):
    service = _build_service()
    service.http_sv3_fast_lane = object()
    clock = [100.0]
    monkeypatch.setattr("crex_scraper_python.src.crex_scraper.time.monotonic", lambda: clock[0])

    assert service._should_enqueue_http_sv3_fallback(3) is True
    assert service._should_enqueue_http_sv3_fallback(3) is False

    clock[0] = 114.9
    assert service._should_enqueue_http_sv3_fallback(3) is False
    clock[0] = 115.0
    assert service._should_enqueue_http_sv3_fallback(3) is True
