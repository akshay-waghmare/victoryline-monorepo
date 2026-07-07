import asyncio

from src.core.fast_poll_service import FastPollService


class _FakeResponse:
    def __init__(self, url, body, status=200):
        self.url = url
        self.status = status
        self._body = body

    async def json(self):
        return self._body


def test_fast_poll_service_treats_getsv3_as_sv3_response():
    service = FastPollService()
    captured = []

    async def callback(match_url, data):
        captured.append((match_url, data))

    service._callbacks["crex:test"] = callback

    asyncio.run(
        service._on_response(
            _FakeResponse("https://api.goscorer.com/api/v3/getSV3?key=12KS", {"B": "Players Entering"}),
            "crex:test",
            "https://crex.com/test-match",
        )
    )

    assert len(captured) == 1
    assert captured[0][0] == "https://crex.com/test-match"
    assert captured[0][1]["B"] == "Players Entering"
    assert service.get_stats()["successful_intercepts"] == 1


def test_fast_poll_service_detects_compact_crex_field_changes():
    service = FastPollService()
    match_id = "crex:test"

    assert service._data_changed(match_id, {"B": "Players Entering", "v": "0.0", "R": "58+1"})
    service._last_data[match_id] = {"B": "Players Entering", "v": "0.0", "R": "58+1"}

    assert service._data_changed(match_id, {"B": "Spin Bowler", "v": "0.0", "R": "58+1"})
    assert service._data_changed(match_id, {"B": "Players Entering", "v": "0.1", "R": "58+1"})
    assert service._data_changed(match_id, {"B": "Players Entering", "v": "0.0", "R": "59+1"})
    assert not service._data_changed(match_id, {"B": "Players Entering", "v": "0.0", "R": "58+1"})
