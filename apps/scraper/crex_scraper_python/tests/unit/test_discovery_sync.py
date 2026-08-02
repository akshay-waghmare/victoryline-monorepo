import pytest

from src.discovery import LiveMatchDiscoverer, extract_schedule_window


class _FakePage:
    def __init__(self, evaluate_result=None):
        self._evaluate_result = evaluate_result if evaluate_result is not None else []

    async def goto(self, url, timeout=0):
        return None

    async def wait_for_selector(self, selector, timeout=0):
        return None

    async def evaluate(self, script):
        return self._evaluate_result

    async def close(self):
        return None


class _FakeContext:
    def __init__(self, pages):
        self._pages = list(pages)

    async def new_page(self):
        return self._pages.pop(0)


class _FakeContextManager:
    def __init__(self, context):
        self._context = context

    async def __aenter__(self):
        return self._context

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakePool:
    def __init__(self, context):
        self._context = context

    def get_context(self):
        return _FakeContextManager(self._context)


class _FakeNextButton:
    def __init__(self):
        self.clicks = 0

    async def count(self):
        return 1

    async def click(self):
        self.clicks += 1


class _FakeSchedulePage:
    def __init__(self):
        self.next_button = _FakeNextButton()

    def locator(self, selector, has_text):
        assert selector == "button"
        assert has_text == "Next >"
        return self.next_button

    async def wait_for_timeout(self, timeout):
        assert timeout == 750


@pytest.mark.asyncio
async def test_schedule_window_merges_one_next_date_without_duplicate_urls(monkeypatch):
    page = _FakeSchedulePage()
    snapshots = [
        [{"url": "https://crex.com/cricket-live-score/today"}],
        [
            {"url": "https://crex.com/cricket-live-score/today"},
            {"url": "https://crex.com/cricket-live-score/tomorrow"},
        ],
    ]

    async def fake_extract(_page, _base_url):
        return snapshots.pop(0)

    monkeypatch.setattr("src.discovery.extract_schedule_matches", fake_extract)

    matches = await extract_schedule_window(page, "https://crex.com")

    assert [match["url"] for match in matches] == [
        "https://crex.com/cricket-live-score/today",
        "https://crex.com/cricket-live-score/tomorrow",
    ]
    assert page.next_button.clicks == 1


@pytest.mark.asyncio
async def test_discovery_reconciles_empty_live_catalog(monkeypatch):
    live_page = _FakePage(evaluate_result=[])
    schedule_page = _FakePage()
    pool = _FakePool(_FakeContext([live_page, schedule_page]))
    discoverer = LiveMatchDiscoverer(pool)

    live_calls = []
    schedule_calls = []

    async def empty_schedule(page, base_url):
        return []

    monkeypatch.setattr('src.discovery.extract_schedule_matches', empty_schedule)
    monkeypatch.setattr('src.discovery.CricketDataService.get_bearer_token', lambda: None)
    monkeypatch.setattr(
        'src.discovery.CricketDataService.add_live_matches',
        lambda urls, token: live_calls.append((list(urls), token)) or True
    )
    monkeypatch.setattr(
        'src.discovery.CricketDataService.add_schedule_matches',
        lambda matches, token: schedule_calls.append((list(matches), token)) or True
    )

    await discoverer._discover_and_sync()

    assert live_calls == [([], None)]
    assert schedule_calls == []
