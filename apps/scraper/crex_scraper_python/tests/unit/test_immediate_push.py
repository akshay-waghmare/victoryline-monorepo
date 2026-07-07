import asyncio

from src.core.persistent_page_pool import PersistentPagePool
from src.cricket_data_service import CricketDataService


class _Response:
    def raise_for_status(self):
        return None


def test_immediate_push_uses_non_persistent_live_patch_endpoint(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["payload"] = kwargs["json"]
        return _Response()

    monkeypatch.setenv("SERVICE_URL", "http://backend:8099/cricket-data/")
    monkeypatch.setattr("src.cricket_data_service.requests.post", fake_post)

    assert CricketDataService.push_immediate_sv3({"v": "4.2", "B": "1"}, "token", "match-url")
    assert captured["url"] == "http://backend:8099/cricket-data/live-patch"
    assert captured["payload"]["url"] == "match-url"
    assert captured["payload"]["over"] == 4.2


def test_persistent_page_pool_capacity_remains_bounded():
    pool = PersistentPagePool(max_pages=3)

    asyncio.run(pool.ensure_capacity(12))

    assert pool.get_stats()["max_size"] == 3
