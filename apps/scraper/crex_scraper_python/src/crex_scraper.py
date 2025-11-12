from __future__ import annotations

import time
from contextlib import ExitStack, contextmanager
from dataclasses import replace
from typing import Any, Callable, Iterator, TypeVar

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Error as PlaywrightError,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)
from requests import RequestException
from src.logging.adapters import get_logger
from src.logging.diagnostics import capture_html_snapshot

from src.monitoring import record_scraper_retry
from crex_scraper_python.parsers import (
    SelectorResolutionError,
    extract_match_href,
    select_all,
)
from crex_scraper_python.retry_utils import RetryConfig, RetryError, retryable

logger = get_logger(component="crex_scraper")

T = TypeVar("T")

_RETRYABLE_ERRORS = (
    RequestException,
    PlaywrightTimeoutError,
    PlaywrightError,
)


class ScrapeError(Exception):
    pass


class NetworkError(ScrapeError):
    pass


class DOMChangeError(ScrapeError):
    pass


@contextmanager
def managed_browser(playwright, **launch_kwargs) -> Iterator[Browser]:
    browser = playwright.chromium.launch(**launch_kwargs)
    try:
        yield browser
    finally:
        _close_safely(browser, "browser")


@contextmanager
def managed_context(browser: Browser, **context_kwargs) -> Iterator[BrowserContext]:
    context = browser.new_context(**context_kwargs)
    try:
        yield context
    finally:
        _close_safely(context, "browser_context")


@contextmanager
def managed_page(context: BrowserContext, **page_kwargs) -> Iterator[Page]:
    page = context.new_page(**page_kwargs)
    try:
        yield page
    finally:
        _close_safely(page, "page")


def _close_safely(resource, resource_name: str) -> None:
    try:
        close = getattr(resource, "close", None)
        if callable(close):
            close()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning(
            "playwright.close_error",
            metadata={
                "resource": resource_name,
                "error": str(exc),
                "error_type": type(exc).__name__,
            },
        )


def _run_with_retry(operation: str, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    base_config = RetryConfig.from_settings(overrides={"retry_exceptions": _RETRYABLE_ERRORS})

    def _log_retry(payload: dict[str, Any]) -> None:
        logger.warning("retry.attempt", metadata={"operation": operation, **payload})

    config = replace(base_config, logger=_log_retry)

    def _on_retry(attempt: int, exc: Exception, delay: float) -> None:
        record_scraper_retry(operation)

    wrapped = retryable(config=config, on_retry=_on_retry)(lambda: func(*args, **kwargs))
    return wrapped()


def scrape(url: str) -> list[str]:
    start_time = time.time()
    stage_timings: dict[str, float] = {}

    logger.info("scrape.start", metadata={"url": url})
    try:
        with sync_playwright() as playwright:
            with ExitStack() as stack:
                browser = stack.enter_context(managed_browser(playwright, headless=True))
                context = stack.enter_context(managed_context(browser))
                page = stack.enter_context(managed_page(context))

                nav_start = time.time()
                logger.info("navigation.start", metadata={"url": url})
                try:
                    _run_with_retry("page.goto", page.goto, url)
                except RetryError as exc:
                    raise NetworkError(f"Navigation retries exhausted for {url}") from exc

                page.wait_for_timeout(5000)
                stage_timings["navigation"] = time.time() - nav_start
                logger.info(
                    "navigation.complete",
                    metadata={
                        "url": url,
                        "duration_ms": int(stage_timings["navigation"] * 1000),
                    },
                )

                dom_start = time.time()
                logger.info("dom.check", metadata={"selector_key": "live_match_badge"})
                try:
                    live_badges = select_all(
                        page,
                        "live_match_badge",
                        log_context={"url": url},
                        required=True,
                    )
                except SelectorResolutionError as exc:
                    html_content = page.content()
                    artifact_path = capture_html_snapshot(html_content)
                    logger.warning(
                        "dom.selector.missing",
                        metadata={
                            "selector_key": exc.selector_key,
                            "selectors": list(exc.selectors),
                            "url": url,
                            "artifact": str(artifact_path),
                            "remediation": "Check if site markup changed or selector fallback needs update",
                        },
                    )
                    raise DOMChangeError(
                        f"Cannot locate essential selector set '{exc.selector_key}'"
                    ) from exc

                stage_timings["dom_eval"] = time.time() - dom_start
                logger.info(
                    "dom.ready",
                    metadata={
                        "duration_ms": int(stage_timings["dom_eval"] * 1000),
                        "candidate_count": len(live_badges),
                    },
                )

                extract_start = time.time()
                logger.info("extraction.start")
                data: list[str] = []
                for idx, live_badge in enumerate(live_badges):
                    log_context = {"url": url, "badge_index": idx}
                    try:
                        item_url = extract_match_href(live_badge, log_context=log_context)
                    except SelectorResolutionError as exc:
                        html_content = page.content()
                        artifact_path = capture_html_snapshot(html_content)
                        logger.error(
                            "extraction.selector_failure",
                            metadata={
                                "selector_key": exc.selector_key,
                                "selectors": list(exc.selectors),
                                "url": url,
                                "badge_index": idx,
                                "artifact": str(artifact_path),
                            },
                        )
                        raise DOMChangeError(
                            "Unable to resolve match link for live match badge"
                        ) from exc

                    data.append(item_url)

                stage_timings["extraction"] = time.time() - extract_start
                total_duration = time.time() - start_time

                logger.info(
                    "extraction.complete",
                    metadata={
                        "url_count": len(data),
                        "duration_ms": int(stage_timings["extraction"] * 1000),
                        "total_duration_ms": int(total_duration * 1000),
                        "stage_timings": {k: int(v * 1000) for k, v in stage_timings.items()},
                    },
                )
                return data

    except NetworkError as exc:
        logger.error("network.error", metadata={"error": str(exc), "url": url})
        raise
    except DOMChangeError as exc:
        logger.error("dom.change_error", metadata={"error": str(exc), "url": url})
        raise
    except RetryError as exc:
        logger.error("scrape.retry_error", metadata={"error": str(exc), "url": url})
        raise NetworkError(str(exc)) from exc
    except Exception as exc:
        logger.error("scrape.error", metadata={"error": str(exc), "url": url})
        raise ScrapeError(f"Error during scraping: {exc}") from exc


fetchData = scrape


__all__ = [
    "scrape",
    "fetchData",
    "managed_browser",
    "managed_context",
    "managed_page",
    "_run_with_retry",
]