"""
Debug script: intercept raw crex API calls (sV3, sC4, getBallFeed) and dump
all relevant fields (B, u, rb, l, m, n, A) to a JSON file for analysis.

Usage:
    python debug_crex_api.py [CREX_MATCH_URL]

If no URL provided, uses the first live match from env DEFAULT_URL.
"""

import asyncio
import json
import sys
import os
import time
from datetime import datetime
from playwright.async_api import async_playwright

DEFAULT_URLS = [
    "https://crex.com/scoreboard/10R3/2F2/6th-Match/1EM/1EJ/jps-vs-neh-6th-match-tillo-t20-cup-2026/live",
    "https://crex.com/scoreboard/10U4/2F9/1st-T20/1F7/IM/bot-vs-les-1st-t20-lesotho-tour-of-botswana-2026/live",
]

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "debug_crex_api_output.json")

# All captured API snapshots
captures = []

def extract_ball_fields(data: dict, label: str) -> dict:
    """Pull every ball-related field from an sV3/sC4 response."""
    if not isinstance(data, dict):
        return {}
    interesting = {}
    # Current ball
    for key in ("B", "b", "current_ball"):
        if key in data:
            interesting[f"field_{key}"] = data[key]
    # Over summary strings
    for key in ("A", "l", "m", "n"):
        if key in data:
            interesting[f"field_{key}"] = data[key]
    # Recent balls / rb array
    if "rb" in data:
        rb = data["rb"]
        interesting["field_rb_type"] = type(rb).__name__
        if isinstance(rb, list) and len(rb) > 0:
            interesting["field_rb_sample"] = rb[-3:]   # last 3 overs
    # Nested: check first level of unknown keys for dict children
    for key, val in data.items():
        if isinstance(val, dict):
            nested = extract_ball_fields(val, f"{label}.{key}")
            if nested:
                interesting[f"nested_{key}"] = nested
    return interesting


async def capture_match(url: str, duration_secs: int = 90):
    print(f"\n{'='*60}")
    print(f"[DEBUG] Capturing: {url}")
    print(f"[DEBUG] Duration: {duration_secs}s")
    print(f"{'='*60}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()

        sv3_count = 0
        sc4_count = 0
        ball_feed_count = 0

        async def handle_response(response):
            nonlocal sv3_count, sc4_count, ball_feed_count
            resp_url = response.url

            # ── sV3 (main live data) ──────────────────────────────────────
            if "sV3" in resp_url:
                sv3_count += 1
                try:
                    body = await response.json()
                    ts = datetime.utcnow().isoformat()
                    ball_fields = extract_ball_fields(body, "sV3")
                    entry = {
                        "type": "sV3",
                        "seq": sv3_count,
                        "ts": ts,
                        "url": resp_url,
                        "ball_fields": ball_fields,
                        # Raw B field (current ball) — the key field to debug
                        "B_raw": body.get("B"),
                        # Full A field (over summary, e.g. "1.wd.6.W")
                        "A_raw": body.get("A"),
                        # l/m/n fields (recent over strings)
                        "l_raw": body.get("l"),
                        "m_raw": body.get("m"),
                        "n_raw": body.get("n"),
                        # Full top-level keys for discovery
                        "top_level_keys": list(body.keys()) if isinstance(body, dict) else [],
                    }
                    # rb field - sample last over balls
                    if "rb" in body:
                        rb = body["rb"]
                        if isinstance(rb, list) and len(rb) > 0:
                            last_over = rb[-1] if isinstance(rb[-1], dict) else None
                            entry["rb_last_over"] = last_over
                            if last_over and isinstance(last_over.get("b"), list):
                                # Each ball object - dump the u field
                                entry["rb_last_over_u_values"] = [
                                    b.get("u") if isinstance(b, dict) else b
                                    for b in last_over["b"]
                                ]
                        entry["rb_type"] = type(rb).__name__
                        entry["rb_len"] = len(rb) if isinstance(rb, list) else None

                    captures.append(entry)
                    print(f"[sV3 #{sv3_count}] B={body.get('B')!r:12}  A={str(body.get('A',''))[:40]!r}  keys={len(body)}")

                except Exception as e:
                    print(f"[sV3] parse error: {e}")

            # ── sC4 (scorecard) ───────────────────────────────────────────
            elif "sC4" in resp_url:
                sc4_count += 1
                try:
                    body = await response.json()
                    ts = datetime.utcnow().isoformat()
                    entry = {
                        "type": "sC4",
                        "seq": sc4_count,
                        "ts": ts,
                        "url": resp_url,
                        "top_level_keys": list(body.keys()) if isinstance(body, dict) else [],
                    }
                    captures.append(entry)
                    print(f"[sC4 #{sc4_count}] keys={list(body.keys()) if isinstance(body, dict) else 'non-dict'}")
                except Exception as e:
                    print(f"[sC4] parse error: {e}")

            # ── getBallFeed (commentary) ───────────────────────────────────
            elif "getBallFeed" in resp_url or "crickapi.com/commentary" in resp_url:
                ball_feed_count += 1
                try:
                    body = await response.json()
                    ts = datetime.utcnow().isoformat()
                    # body is a list of ball entries
                    sample = []
                    if isinstance(body, list):
                        for entry_item in body[-10:]:   # last 10 entries
                            if isinstance(entry_item, dict):
                                sample.append({
                                    "u": entry_item.get("u"),       # outcome
                                    "r": entry_item.get("r"),       # runs
                                    "t": entry_item.get("t"),       # type (B=ball, O=over, W=wicket)
                                    "b": entry_item.get("b"),       # ball number
                                    "o": entry_item.get("o"),       # over number
                                    "keys": list(entry_item.keys()),
                                })
                    entry = {
                        "type": "getBallFeed",
                        "seq": ball_feed_count,
                        "ts": ts,
                        "url": resp_url,
                        "total_entries": len(body) if isinstance(body, list) else None,
                        "last_10_sample": sample,
                    }
                    captures.append(entry)
                    print(f"[getBallFeed #{ball_feed_count}] entries={len(body) if isinstance(body, list) else '?'}")
                    # Print each sample ball
                    for s in sample:
                        print(f"    u={s.get('u')!r:10} r={s.get('r')!r:5} t={s.get('t')!r:5} keys={s.get('keys')}")
                except Exception as e:
                    print(f"[getBallFeed] parse error: {e}")

            # ── Broad: any api-v1.com endpoint we haven't seen ────────────
            elif "api-v1.com" in resp_url and response.status == 200:
                try:
                    body = await response.json()
                    print(f"[API-DISCOVERY] {resp_url[:80]} keys={list(body.keys()) if isinstance(body, dict) else type(body).__name__}")
                except Exception:
                    pass

        page.on("response", handle_response)

        print(f"[DEBUG] Loading page...")
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print(f"[DEBUG] goto warning: {e}")

        print(f"[DEBUG] Waiting {duration_secs}s for API calls (watching sV3 updates)...")
        deadline = time.time() + duration_secs
        while time.time() < deadline:
            remaining = int(deadline - time.time())
            if sv3_count > 0 and remaining % 10 == 0:
                print(f"[DEBUG] {remaining}s left | sV3={sv3_count} sC4={sc4_count} ballFeed={ball_feed_count}")
            await asyncio.sleep(1)

        await browser.close()

    print(f"\n[DEBUG] Done. Captured {len(captures)} API responses.")


async def main():
    urls = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_URLS[:1]
    for url in urls:
        await capture_match(url.strip(), duration_secs=90)

    # Write output
    output = {
        "captured_at": datetime.utcnow().isoformat(),
        "total_captures": len(captures),
        "captures": captures,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\n[DEBUG] Output written to: {OUTPUT_FILE}")

    # Print summary of all B field values seen
    b_vals = [c.get("B_raw") for c in captures if c.get("type") == "sV3"]
    print(f"\n[SUMMARY] Unique B (current_ball) values seen: {sorted(set(str(v) for v in b_vals if v is not None))}")
    a_vals = [c.get("A_raw") for c in captures if c.get("type") == "sV3" and c.get("A_raw")]
    print(f"[SUMMARY] Sample A (over summary) values: {a_vals[-5:]}")


if __name__ == "__main__":
    asyncio.run(main())
