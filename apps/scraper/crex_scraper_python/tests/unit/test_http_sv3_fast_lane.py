import asyncio
from types import SimpleNamespace

from src.core.http_sv3_fast_lane import HttpSv3FastLane


MATCH_URL = "https://crex.com/cricket-live-score/can-vs-sco-127th-match-mens-cwc-league-2-2023-27-match-updates-1372"
IDENTITY = {
    "t_10_name": "Scotland", "t_10_short": "SCO",
    "t_82T_name": "Canada", "t_82T_short": "CAN",
}


class _Cache:
    def __init__(self, mapping=None):
        self.mapping = mapping

    async def get_local_storage(self, _match_id):
        return self.mapping


class _Response:
    def __init__(self, payload, status_code=200):
        self.payload, self.status_code = payload, status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(self.status_code)

    def json(self):
        return self.payload


class _Client:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = 0

    async def get(self, *_args, **_kwargs):
        self.calls += 1
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


def _settings(**overrides):
    values = dict(
        http_sv3_base_interval_seconds=5.0,
        http_sv3_active_interval_seconds=3.0,
        http_sv3_max_requests_per_minute=40,
        http_sv3_breaker_failure_threshold=3,
        http_sv3_breaker_cooldown_seconds=300.0,
    )
    values.update(overrides)
    return SimpleNamespace(**values)


def test_http_lane_requires_complete_identity_before_fetching():
    async def scenario():
        client = _Client([_Response({"A": "1"})])
        lane = HttpSv3FastLane(_settings(), _Cache({"t_10_name": "Scotland"}), lambda *_: None, client=client, jitter=lambda *_: 0)
        await lane.reconcile([MATCH_URL])
        await lane.tick()
        assert client.calls == 0
        assert lane.get_stats()["identity_waiting"] == 1

    asyncio.run(scenario())


def test_http_lane_pushes_only_changed_payload_and_removes_unselected_match():
    async def scenario():
        pushed = []

        async def on_update(url, payload, mapping):
            pushed.append((url, payload, mapping))
            return True

        clock = [0.0]
        client = _Client([_Response({"A": "1", "rb": []}), _Response({"A": "1", "rb": []}), _Response({"A": "2", "rb": []})])
        lane = HttpSv3FastLane(_settings(), _Cache(IDENTITY), on_update, client=client, clock=lambda: clock[0], jitter=lambda *_: 0)
        await lane.reconcile([MATCH_URL])
        await lane.tick()
        clock[0] = 3.0
        await lane.tick()
        clock[0] = 8.0
        await lane.tick()
        assert len(pushed) == 2
        assert pushed[0][2]["t_10_name"] == "Scotland"
        await lane.reconcile([])
        assert lane.get_stats()["selected_matches"] == 0

    asyncio.run(scenario())


def test_http_lane_opens_circuit_immediately_for_upstream_block():
    async def scenario():
        clock = [0.0]
        client = _Client([_Response({}, status_code=429)])
        lane = HttpSv3FastLane(_settings(), _Cache(IDENTITY), lambda *_: None, client=client, clock=lambda: clock[0], jitter=lambda *_: 0)
        await lane.reconcile([MATCH_URL])
        await lane.tick()
        assert lane.get_stats()["circuit_open"] is True
        assert lane.get_stats()["blocked"] == 1
        await lane.tick()
        assert client.calls == 1

    asyncio.run(scenario())


def test_http_lane_opens_circuit_after_malformed_response_burst():
    async def scenario():
        clock = [0.0]
        client = _Client([_Response([]), _Response([]), _Response([])])
        lane = HttpSv3FastLane(_settings(http_sv3_base_interval_seconds=1.0), _Cache(IDENTITY), lambda *_: None, client=client, clock=lambda: clock[0], jitter=lambda *_: 0)
        await lane.reconcile([MATCH_URL])
        for moment in (0.0, 1.0, 2.0):
            clock[0] = moment
            await lane.tick()
        assert lane.get_stats()["errors"] == 3
        assert lane.get_stats()["circuit_open"] is True

    asyncio.run(scenario())


def test_http_lane_opens_circuit_after_timeout_burst():
    async def scenario():
        clock = [0.0]
        client = _Client([RuntimeError("timeout"), RuntimeError("timeout"), RuntimeError("timeout")])
        lane = HttpSv3FastLane(_settings(http_sv3_base_interval_seconds=1.0), _Cache(IDENTITY), lambda *_: None, client=client, clock=lambda: clock[0], jitter=lambda *_: 0)
        await lane.reconcile([MATCH_URL])
        for moment in (0.0, 1.0, 2.0):
            clock[0] = moment
            await lane.tick()
        assert lane.get_stats()["errors"] == 3
        assert lane.get_stats()["circuit_open"] is True

    asyncio.run(scenario())
