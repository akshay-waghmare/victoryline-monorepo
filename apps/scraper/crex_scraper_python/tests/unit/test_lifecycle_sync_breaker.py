from src import cricket_data_service
from src.cricket_data_service import CricketDataService


class _Response:
    def raise_for_status(self):
        return None


def test_live_catalog_sync_is_not_blocked_by_general_api_breaker(monkeypatch):
    cricket_data_service._api_breaker.reset()
    cricket_data_service._live_catalog_breaker.reset()
    for _ in range(cricket_data_service._api_breaker.failure_threshold):
        cricket_data_service._api_breaker.record_failure()

    calls = []
    monkeypatch.setattr(
        cricket_data_service.requests,
        "post",
        lambda *args, **kwargs: calls.append((args, kwargs)) or _Response(),
    )

    assert CricketDataService.add_live_matches(["https://crex.com/match/live"], None) is True
    assert len(calls) == 1


def test_live_catalog_sync_reports_failure_when_lifecycle_breaker_is_open():
    cricket_data_service._live_catalog_breaker.reset()
    for _ in range(cricket_data_service._live_catalog_breaker.failure_threshold):
        cricket_data_service._live_catalog_breaker.record_failure()

    assert CricketDataService.add_live_matches(["https://crex.com/match/live"], None) is False


def test_schedule_breaker_does_not_block_live_catalog_sync(monkeypatch):
    cricket_data_service._schedule_lifecycle_breaker.reset()
    cricket_data_service._live_catalog_breaker.reset()
    for _ in range(cricket_data_service._schedule_lifecycle_breaker.failure_threshold):
        cricket_data_service._schedule_lifecycle_breaker.record_failure()

    monkeypatch.setattr(cricket_data_service.requests, "post", lambda *args, **kwargs: _Response())

    assert CricketDataService.add_live_matches(["https://crex.com/match/live"], None) is True
