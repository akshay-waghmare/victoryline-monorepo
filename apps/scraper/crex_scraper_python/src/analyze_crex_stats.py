#!/usr/bin/env python3
"""Analyze CREX player pages, standings pages, and crawler payloads."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable

from playwright.async_api import async_playwright

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.crex_stats_analysis import (  # noqa: E402
    analyze_crawler_payload,
    analyze_player_page_html,
    analyze_standings_html,
)

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inspect CREX player pages, standings/rankings pages, and crawler payload JSON.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_page_source_arguments(page_parser: argparse.ArgumentParser) -> None:
        source_group = page_parser.add_mutually_exclusive_group(required=True)
        source_group.add_argument("--url", help="Fetch a rendered CREX page with Playwright before parsing.")
        source_group.add_argument("--html", help="Analyze a saved HTML file instead of fetching a live page.")
        page_parser.add_argument(
            "--timeout-ms",
            type=int,
            default=30000,
            help="Navigation timeout for --url mode (default: %(default)s).",
        )
        page_parser.add_argument(
            "--settle-seconds",
            type=float,
            default=1.5,
            help="Extra wait after selectors appear in --url mode (default: %(default)s).",
        )

    player_parser = subparsers.add_parser("player", help="Analyze a CREX player profile page.")
    add_page_source_arguments(player_parser)

    standings_parser = subparsers.add_parser(
        "standings",
        help="Analyze a CREX points table or rankings page.",
    )
    add_page_source_arguments(standings_parser)

    payload_parser = subparsers.add_parser(
        "payload",
        help="Summarize crawler/debug payload JSON.",
    )
    payload_parser.add_argument("--json", required=True, help="Path to a JSON payload file.")

    return parser


async def fetch_rendered_html(
    url: str,
    wait_selectors: Iterable[str],
    timeout_ms: int,
    settle_seconds: float,
) -> str:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(user_agent=DEFAULT_USER_AGENT)
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            for selector in wait_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=min(8000, timeout_ms))
                    break
                except Exception:
                    continue
            if settle_seconds > 0:
                await asyncio.sleep(settle_seconds)
            return await page.content()
        finally:
            await browser.close()


async def load_page_html(args: argparse.Namespace, selectors: Iterable[str]) -> str:
    if args.html:
        return Path(args.html).read_text(encoding="utf-8")
    return await fetch_rendered_html(
        url=args.url,
        wait_selectors=selectors,
        timeout_ms=args.timeout_ms,
        settle_seconds=args.settle_seconds,
    )


def write_result(result: Dict[str, Any]) -> int:
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


async def async_main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "player":
        html = await load_page_html(
            args,
            selectors=["table", "h2", "[href*='/scoreboard/']"],
        )
        return write_result(analyze_player_page_html(html, source_url=args.url))

    if args.command == "standings":
        html = await load_page_html(
            args,
            selectors=["table", "h2", "h3"],
        )
        return write_result(analyze_standings_html(html))

    if args.command == "payload":
        payload = json.loads(Path(args.json).read_text(encoding="utf-8"))
        return write_result(analyze_crawler_payload(payload))

    parser.error(f"Unsupported command: {args.command}")
    return 2


def main() -> int:
    return asyncio.run(async_main(sys.argv[1:]))


if __name__ == "__main__":
    sys.exit(main())
