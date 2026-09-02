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
    service._managed_match_last_success = {}
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


def test_discovery_slate_overrides_stale_backend_catalogue():
    service = _build_service()
    service.settings.max_live_matches = 3
    service._discovery_live_urls = ["https://crex.example/active-13C7"]

    backend_matches = [
        {"url": "https://crex.example/stale-12WZ"},
        {"url": "https://crex.example/stale-12X0"},
    ]

    assert service._authoritative_live_urls(backend_matches) == [
        "https://crex.example/active-13C7"
    ]


def test_empty_discovery_slate_does_not_fallback_to_backend_catalogue():
    service = _build_service()
    service.settings.max_live_matches = 3
    service._discovery_live_urls = []

    assert service._authoritative_live_urls([
        {"url": "https://crex.example/stale-12WZ"}
    ]) == []


@pytest.mark.asyncio
async def test_catalogue_callback_updates_authoritative_slate_and_fast_lane():
    service = _build_service()
    service.health = SimpleNamespace(
        set_active_matches=lambda count: setattr(service, "health_count", count),
        record_success=lambda: setattr(service, "health_success", True),
    )
    service.http_sv3_fast_lane = AsyncMock()
    service.player_stats_crawler = AsyncMock()

    await service._on_match_catalog_updated(
        ["https://crex.example/active-13C7", "https://crex.example/active-133D"],
        [],
    )

    assert service._last_managed_live_urls == [
        "https://crex.example/active-13C7",
        "https://crex.example/active-133D",
    ]
    assert service.health_count == 2
    assert service.health_success is True
    service.http_sv3_fast_lane.reconcile.assert_awaited_once_with(service._last_managed_live_urls)
    service.player_stats_crawler.update_candidates.assert_awaited_once_with(
        service._last_managed_live_urls,
        [],
    )


@pytest.mark.asyncio
async def test_catalogue_callback_keeps_provider_team_names_for_prediction_candidates():
    service = _build_service()
    service.health = SimpleNamespace(
        set_active_matches=lambda count: None,
        record_success=lambda: None,
    )
    service.http_sv3_fast_lane = None
    service.player_stats_crawler = None
    selected_url = "https://crex.com/cricket-live-score/dg-vs-rd-10th-match-european-t20-premier-league-2026-match-updates-13F3"

    await service._on_match_catalog_updated(
        [selected_url],
        [{
            "url": selected_url,
            "team1Name": "Dublin Guardians",
            "team2Name": "Rotterdam Dockers",
            "matchFormat": "T20",
        }],
    )

    assert service._discovery_live_matches == [{
        "url": selected_url,
        "team1Name": "Dublin Guardians",
        "team2Name": "Rotterdam Dockers",
        "matchFormat": "T20",
    }]
