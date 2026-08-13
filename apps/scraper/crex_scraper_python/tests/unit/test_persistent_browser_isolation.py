import asyncio
from types import SimpleNamespace

from src.browser_pool import AsyncBrowserPool


class _Context:
    async def route(self, *_args):
        return None


class _Browser:
    def __init__(self):
        self.contexts = 0
        self.closed = 0

    async def new_context(self, **_kwargs):
        self.contexts += 1
        return _Context()

    async def close(self):
        self.closed += 1


class _Chromium:
    def __init__(self, browser):
        self.browser = browser

    async def launch(self, **_kwargs):
        return self.browser


class _Playwright:
    def __init__(self, browser):
        self.chromium = _Chromium(browser)


class _Starter:
    def __init__(self, playwright):
        self.playwright = playwright

    async def start(self):
        return self.playwright


def test_persistent_context_uses_an_isolated_browser_that_normal_recycle_keeps(monkeypatch):
    normal_browser = _Browser()
    persistent_browser = _Browser()
    persistent_playwright = _Playwright(persistent_browser)
    pool = AsyncBrowserPool.__new__(AsyncBrowserPool)
    pool.settings = SimpleNamespace(concurrency_cap=1)
    pool._playwright = _Playwright(normal_browser)
    pool._browser = normal_browser
    pool._persistent_playwright = None
    pool._persistent_browser = None
    pool._semaphore = asyncio.Semaphore(1)
    pool._lock = asyncio.Lock()
    pool._shutting_down = False
    pool._active_contexts = []
    pool._context_pool = []

    monkeypatch.setattr("src.browser_pool.async_playwright", lambda: _Starter(persistent_playwright))

    async def scenario():
        await pool.create_persistent_context()
        await pool.recycle()

    asyncio.run(scenario())

    assert persistent_browser.contexts == 1
    assert persistent_browser.closed == 0
    assert normal_browser.closed == 1
