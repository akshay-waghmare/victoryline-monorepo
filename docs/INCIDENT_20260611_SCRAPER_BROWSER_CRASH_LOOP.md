# Incident: Scraper Browser Pool Crash-Loop With Stale Live Data

**Date**: 2026-06-11  
**Severity**: High — 7 of 8 live matches had stale or missing detail data; scraper had 32 container restarts  
**Status**: Resolved with code fixes across 4 scraper modules + prod restart

---

## Symptom

- Most live match scores on the site were frozen (17 min to 3.5 hours stale)
- 2 out of 8 live matches returned `404` on `/last-updated-data`
- Only 1 match had fresh data (updated within 2 minutes)
- Scraper container had restarted **32 times**
- Scraper `/health` showed `state: "failing"` with `19 consecutive_failures`

---

## What prod showed

### Stale public data

```text
Simhadri Vizag Lions vs Amaravati Royals:     SVL 125-6 (Ovs 15)  - 1s ago
Chota Nagpur Royals vs Dhanbad Diamonds:      CNR 11-0  (Ovs 1.1) - 1119s ago
Mumbai Marines vs Southern Spartans:          404
Ujjain Falcons vs Jabalpur Royal Lions:        404
Bangladesh vs Australia:                      AUS 187-8 (Ovs 42) - 11431s ago
India A vs Afghanistan A:                     IND-A 349-9 (Ovs 49) - 12549s ago
```

### Scraper health

```json
{"state": "failing", "consecutive_failures": 19, "uptime": 238.59,
 "fast_updates": {"active_interceptors": 1, "covered_matches": 1,
 "coverage_ratio": 0.2, "live_matches": 5, "pool_errors": 0}}
```

### Scraper logs

```
[DISCOVERY] Error: Target page, context or browser has been closed
[COMMENTARY] Error during scroll-for-commentary: Target page, context or browser has been closed
[SCROLL-DISCOVERY] ... status=200 (read failed)
```

---

## Root Cause

**Primary: Persistent pages outlive their browser context.**

The `_fast_poll_loop()` created persistent pages inside an `async with self.pool.get_context() as context:` block. When that block exited, the context was returned to the shared pool and could be:
- Reused by another task (with cookies cleared via `context.clear_cookies()`)
- Closed if the pool was full

But the persistent page (stored in `PersistentPagePool`) still referenced this now-invalid context. Any subsequent operation on that page threw `"Target page, context or browser has been closed"`.

**Scale amplification:** With `concurrency_cap=10` and 8+ live matches, the semaphore forced faster context recycling. More matches = faster recycling = more crashes. The `max_live_matches=5` cap on the slow poll loop further masked the discrepancy: the slow loop reported 5 matches to health, but the fast loop tracked all 8 from the uncapped backend catalog.

**Contributing bugs:**

1. **Listener leak** — `FastPollService.detach()` never called `page.remove_listener("response", handler)`. Orphaned listeners continued firing on dead pages.

2. **Narrow error detection** — `browser_pool.py` only checked for `"Target closed"` or `"Connection closed"` in exception strings. Playwright's actual error messages (`"Target page, context or browser has been closed"`, `"net::ERR_ABORTED; maybe frame was detached?"`, `"Execution context was destroyed"`) did not match, so the browser invalidation logic never fired.

3. **No page-level health checking** — `PersistentPagePool.is_page_active()` only checked `page.is_closed()` (a synchronous boolean). A hung-but-not-closed page was considered healthy.

4. **Recreate flow leaked contexts** — When `is_page_active()` detected a dead page, the code fell through to create a new dedicated context, but `get_or_create()` could still return the old broken page (because it only checked `is_closed()`). The new dedicated context was then orphaned.

5. **Eviction was LRU-only** — `_evict_one()` always evicted the least-recently-used page regardless of match importance. Priority-based eviction existed in `ensure_capacity()` but not in the admission path.

---

## Fix Applied

### `src/browser_pool.py`

- **`create_dedicated_context()`** — New method that creates a context NOT managed by the shared pool. The caller owns it and must close it explicitly. Used by persistent pages.
- **`_is_playwright_fatal_error()`** — Replaced narrow string matching with a broad regex covering all known Playwright fatal error patterns.
- **`_is_page_alive()`** — New async helper that does a lightweight `page.evaluate("1")` check with a 2s timeout to verify the page is actually responsive.

### `src/core/persistent_page_pool.py`

- **Context lifecycle in `_cleanup_entry()`** — Now closes the dedicated context when cleaning up a page entry.
- **Context lifecycle in `get_or_create()` except block** — Closes both the page and its dedicated context on creation failure.
- **`is_page_active()`** — Changed to async; uses `_is_page_alive()` for a real JS health check instead of just `page.is_closed()`.
- **`_evict_one()`** — Now uses priority-based eviction via `_find_lowest_priority_entry()` instead of raw LRU.
- **`ensure_capacity()`** — Actually evicts excess pages using priority-based selection.
- **Priority scoring** — New `_estimate_match_priority()` function scores match URLs by importance (international > ODI/T20I > qualifier/final > T20 > league).

### `src/core/fast_poll_service.py`

- **Listener cleanup in `detach()`** — Now calls `page.remove_listener("response", handler)` before cleaning up internal state.
- **Handler reference tracking** — Added `_handlers` dict to store listener references for proper removal.

### `src/crex_scraper.py`

- **Dedicated context in `_fast_poll_loop()`** — Uses `pool.create_dedicated_context()` instead of `async with pool.get_context()`. The context is passed to `persistent_page_pool.get_or_create()` and cleaned up on page eviction.
- **Clean up dead page before recreate** — When `is_page_active()` returns False, explicitly calls `fast_poll_service.detach()` and `persistent_page_pool.remove()` before creating the new context.
- **Context safety on exception** — `context` is initialized to `None` before the try block; the except block closes it if non-None.
- **`_should_submit_live_task()`** — Changed from sync to async to properly `await is_page_active()`.
- **`live_matches` vs `managed_live_matches`** — Split the health reporting: `live_matches` is the authoritative backend catalog count (uncapped), while `managed_live_matches` reflects the capped heavy full-scrape count. This prevents the health check from masking the discrepancy.
- **URL normalization via `_extract_live_urls()`** — Static method that normalizes backend responses into URLs, ensuring both poll loops count matches the same way.

---

## Verification Checklist

Use this when live data looks frozen and the scraper may be crash-looping:

### 1. Public data freshness

```powershell
$resp = Invoke-RestMethod https://www.crickzen.com/api/cricket-data/live-matches
$now = Get-Date
$resp | ForEach-Object {
    $age = $now - (Get-Date -UnixTimeSeconds ($_.lastStateUpdatedAt/1000))
    Write-Host "$($_.team1Name) vs $($_.team2Name): $([math]::Round($age.TotalSeconds))s ago"
}
```

### 2. Scraper health

```bash
curl -s http://localhost:5000/health | python -m json.tool
```

Key fields: `state`, `consecutive_failures`, `uptime`, `fast_updates.enabled`, `fast_updates.coverage_ratio`.

### 3. Container restarts

```bash
docker inspect victoryline-scraper --format '{{.RestartCount}}'
```

### 4. Scraper logs for page-crash errors

```bash
docker logs victoryline-scraper --since 10m 2>&1 | grep -iE "Target.*closed|ERR_ABORTED|detached|context.*closed"
```

### 5. Matches being pushed

```bash
docker logs victoryline-scraper --since 10m 2>&1 | grep -i "matches.push"
```

---

## Durable Lessons

- **Persistent pages must own their browser context.** A borrowed context that can be recycled will crash the page that references it. Use `create_dedicated_context()` instead of the shared pool for any task that creates a long-lived page.
- **Listeners must be removed when detaching.** Every `page.on("response", handler)` needs a matching `page.remove_listener("response", handler)` in the teardown path.
- **Page health checks must test JS execution.** `page.is_closed()` is not enough — a page can be technically open but completely hung. Use `page.evaluate("1")` with a timeout.
- **Health reporting must distinguish the scrape path.** When two different loops (slow full-scrape vs fast persistent-page) operate on different subsets of matches, `/health` must report both counts so drift is visible.
- **Error pattern matching must cover all Playwright failure modes.** Playwright has many distinct error strings and new ones are added in each version. Use a broad regex, not narrow string matching.

## Skill Harvest

This incident produced a reusable skill pattern:

- diagnosing a scraper browser pool crash-loop
- verifying live data freshness from public APIs
- checking fast-lane coverage ratio in `/health`
- fixing priority-based eviction, context lifecycle, and listener leaks

That pattern is now captured in `.agents/skills/crickzen-scraper-browser-crash-loop/SKILL.md`.
