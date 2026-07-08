---
name: crickzen-scraper-browser-crash-loop
description: Diagnose and repair a Crickzen scraper browser pool crash-loop. Use when live data is stale, scraper has many container restarts, /health shows "failing" state with high consecutive_failures, or fast_updates.coverage_ratio is below 1.0.
---

# Crickzen Scraper Browser Pool Crash-Loop

## Triage

### 1. Check public data freshness

```powershell
$resp = Invoke-RestMethod https://www.crickzen.com/api/cricket-data/live-matches
$now = Get-Date
$resp | ForEach-Object {
    $age = $now - (Get-Date -UnixTimeSeconds ($_.lastStateUpdatedAt/1000))
    $status = if ($age.TotalSeconds -gt 900) { "STALE" } else { "OK" }
    Write-Host "[$status] $($_.team1Name) vs $($_.team2Name): $([math]::Round($age.TotalSeconds))s ago"
}
```

Also check individual match detail endpoints:
```powershell
$url = "<match-slug>"
$resp = Invoke-RestMethod "https://www.crickzen.com/api/cricket-data/last-updated-data?url=$url" -ErrorAction SilentlyContinue
if (-not $resp) { Write-Host "404 - No detail data" }
```

### 2. Check scraper health

SSH to prod:
```powershell
& "C:\Program Files\OpenSSH\ssh.exe" 204.12.199.137 "curl -s http://localhost:5000/health"
```

Key signals:
- `state`: must be `"healthy"`, not `"failing"` or `"degraded"`
- `consecutive_failures`: should be `0`; anything above `6` triggers `failing` state
- `fast_updates.coverage_ratio`: should be `1.0`; lower means the fast lane isn't covering all matches
- `fast_updates.live_matches` vs `fast_updates.managed_live_matches`: should be in sync; drift means the slow poll loop cap is masking the real count

### 3. Check container restart count

```bash
docker inspect victoryline-scraper --format '{{.RestartCount}}'
```

Anything above `5` in a 24h window indicates a crash-loop.

### 4. Check scraper logs for browser crash signatures

```bash
docker logs victoryline-scraper --since 30m 2>&1 | grep -iE \
  "Target.*closed|ERR_ABORTED|detached|context.*closed|Traceback|error|exception"
```

### 5. Check matches.push activity

```bash
docker logs victoryline-scraper --since 10m 2>&1 | grep -i "matches.push"
```

Each match should have repeated `matches.push_immediate.success` entries. If only 1-2 matches show pushes despite 6+ live matches, the fast lane is undershooting.

---

## Root Cause Patterns

### Pattern A: Persistent page outlives its context (most common)

**Symptoms:** `"Target page, context or browser has been closed"` errors; restart count climbs; coverage ratio < 1.0.

**Mechanism:** The `_fast_poll_loop()` creates a persistent page inside `async with pool.get_context()`. When the block exits, the context is returned to the pool and may be reused/closed. The persistent page still references it.

**Fix:** Use `pool.create_dedicated_context()` instead of `async with pool.get_context()`. The dedicated context is owned by the persistent page and lives until the page is evicted.

### Pattern B: Listener leak

**Symptoms:** Orphaned response listeners on dead pages; errors from callbacks that reference cleaned-up state.

**Mechanism:** `FastPollService.detach()` removes the match from internal dicts but never calls `page.remove_listener("response", handler)`. The orphaned listener continues firing.

**Fix:** Store the handler reference in `_handlers[match_id]` and call `page.remove_listener("response", handler)` on detach.

### Pattern C: Hung-but-not-closed pages evade health checks

**Symptoms:** `is_page_active()` returns True but the page produces no data; `matches.push` empty for that match.

**Mechanism:** `PersistentPagePool.is_page_active()` only checks `page.is_closed()` — a hung page passes.

**Fix:** Use `_is_page_alive(page)` which does `page.evaluate("1")` with a 2s timeout. Make `is_page_active()` async and use the JS health check.

### Pattern D: Recreate flow leaks dedicated context

**Symptoms:** PID count climbs steadily even after restart; memory grows.

**Mechanism:** When `is_page_active()` detects a dead page, the code creates a new dedicated context, but `get_or_create()` can still return the old broken page (because it only checks `is_closed()`). `attach_to_page()` sees the old listener and returns early. The new context is orphaned.

**Fix:** Before creating the new context, explicitly `detach()` and `remove()` the old entry. Initialize `context = None` and close it in the except block.

### Pattern E: Count drift between poll loops

**Symptoms:** `/health` shows a healthy count but fast lane doesn't cover all live matches.

**Mechanism:** The slow `_poll_loop()` caps matches to `max_live_matches`, then publishes that capped count into health. The fast `_fast_poll_loop()` follows the uncapped backend catalog. Health reporting hides the discrepancy.

**Fix:** Track two separate counts: `live_matches` (authoritative catalog) and `managed_live_matches` (capped heavy-scrape count). Normalize URLs with a shared helper so both loops count identically.

---

## Fix Steps

### Phase 1: Context lifecycle

**Files:** `browser_pool.py`, `persistent_page_pool.py`, `crex_scraper.py`

1. Add `create_dedicated_context()` to `AsyncBrowserPool` — creates a context NOT managed by the shared pool
2. In `PersistentPagePool._cleanup_entry()`, close the stored context in addition to the page
3. In `PersistentPagePool.get_or_create()` except block, close the context on failure
4. In `CrexScraperService._fast_poll_loop()`, call `pool.create_dedicated_context()` instead of `async with pool.get_context()`

### Phase 2: Listener cleanup

**File:** `fast_poll_service.py`

1. Add `_handlers` dict to store listener references
2. In `attach_to_page()`, store the handler before calling `page.on("response", handler)`
3. In `detach()`, call `page.remove_listener("response", handler)` before cleaning up

### Phase 3: Broad error detection

**File:** `browser_pool.py`

1. Add `_PLAYWRIGHT_FATAL_PATTERNS` regex covering all known Playwright fatal error strings
2. Add `_is_playwright_fatal_error()` helper
3. Use it in `get_context()` error handling
4. Add `_is_page_alive()` for JS-based health checks

### Phase 4: Priority-based eviction

**File:** `persistent_page_pool.py`

1. Add `_estimate_match_priority()` — scores URLs by importance
2. Add `_find_lowest_priority_entry()` — finds the worst page to evict
3. Change `_evict_one()` to use priority instead of LRU
4. Make `ensure_capacity()` actually evict (not just warn)

### Phase 5: Count sync

**File:** `crex_scraper.py`

1. Add `_extract_live_urls()` static method for URL normalization
2. Track `_last_live_match_count` (uncapped) vs `_last_managed_live_match_count` (capped)
3. Report both in `get_fast_update_status()`
4. Update `_should_submit_live_task()` to async

---

## Verification

### After fix

```powershell
# 1. All live matches have fresh data
$resp = Invoke-RestMethod https://www.crickzen.com/api/cricket-data/live-matches
$now = Get-Date
$stale = 0
$resp | ForEach-Object {
    $age = $now - (Get-Date -UnixTimeSeconds ($_.lastStateUpdatedAt/1000))
    if ($age.TotalSeconds -gt 300) { $stale++ }
}
Write-Host "Stale matches: $stale"
```

```bash
# 2. Scraper health shows full coverage
curl -s http://localhost:5000/health | python -c "import json,sys; d=json.load(sys.stdin)['data']; print(f\"state={d['state']} consecutive_failures={d['details']['consecutive_failures']} coverage_ratio={d['fast_updates']['coverage_ratio']}\")"
```

```bash
# 3. No page-crash errors in logs
docker logs victoryline-scraper --since 10m 2>&1 | grep -c "Target.*closed"
# Should be 0
```

```bash
# 4. Container restart count stabilized
docker inspect victoryline-scraper --format '{{.RestartCount}}'
# Check again after 10 minutes — should not have incremented
```

### Key health fields

| Field | Healthy | Failing |
|-------|---------|---------|
| `state` | `healthy` | `failing` |
| `consecutive_failures` | `0` | `>= 6` |
| `score` | `100` | `< 50` |
| `fast_updates.coverage_ratio` | `1.0` | `< 0.8` |
| `fast_updates.live_matches` | matches backend | mismatches backend |
| Container restarts | stable | climbing |

---

## Reference Incident

- `docs/INCIDENT_20260611_SCRAPER_BROWSER_CRASH_LOOP.md`
