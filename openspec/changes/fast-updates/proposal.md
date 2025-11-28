# Change Proposal: Fast Ball-by-Ball & Score Updates

## Status
Draft

## Problem Statement

The current scraper architecture has significant latency issues preventing real-time ball-by-ball updates:

### Observed Issues
1. **Ball updates skipping** - Updates jump from ball 9.3 to 9.6, missing intermediate balls
2. **Score updates delayed** - Score changes don't propagate quickly to frontend
3. **Scorecard stale for extended periods** - Full scorecard (batsman/bowler stats) not updating in sync with live play

### Root Cause Analysis

After thorough code review of the scraper architecture, the following bottlenecks were identified:

> **Note**: The production scraper uses the **async `CrexScraperService`** (`src/app.py` → `src/crex_scraper.py`), NOT the legacy sync scraper. The async refactor addressed some issues but key bottlenecks remain.

#### 1. Polling Interval Still 2.5 Seconds (Critical)
**Location**: `apps/scraper/crex_scraper_python/src/config.py:75`
```python
polling_interval_seconds: float = 2.5
```
Used by `_poll_loop()` in `crex_scraper.py`:
```python
await asyncio.sleep(self.settings.polling_interval_seconds)
```
- Cricket balls occur every 15-30 seconds on average
- With 2.5s polling + page load time, total cycle is 5-10 seconds
- This can cause missed balls during fast play sequences

#### 2. No Immediate Push on sV3 Response
**Location**: `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py:88-92`
```python
# Wait for sV3 response (which triggers sC4)
try:
    await page.wait_for_response(lambda res: "sV3" in res.url, timeout=5000)
    await asyncio.sleep(2)  # Wait for sC4 to complete
except Exception:
    pass
```
- The adapter intercepts sV3 but doesn't push immediately
- Instead, it waits for DOM + sC4 then returns all data at once
- This adds 2-7 seconds of unnecessary latency for live ball data

#### 3. sC4 (Scorecard) Not Continuously Polled
**Location**: `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py:90`
- Scorecard fetch is tied to each `fetch_match()` cycle
- No dedicated polling for scorecard freshness
- If scrape cycle slows down, scorecard becomes stale

#### 4. Cache TTL Creates Staleness Window
**Location**: `apps/scraper/crex_scraper_python/src/config.py:120`
```python
cache_live_ttl: int = 15  # seconds
```
- 15-second TTL is good, but combined with 2.5s polling
- Effective staleness can reach 17+ seconds in worst case

#### ✅ What's Already Fixed by Async Refactor
- **Browser Pool**: Uses `async_playwright` with context pooling
- **Worker Concurrency**: Multiple workers process tasks concurrently
- **Non-blocking I/O**: Uses `asyncio.to_thread()` for HTTP calls
- **Rate Limiting**: Token bucket rate limiter in scheduler

## Proposed Solution

### Phase 1: Quick Wins (1-2 days)
1. **Reduce polling interval to 1 second** - Change `polling_interval_seconds` in config.py
2. **Immediate push on sV3 response** - Modify `crex_adapter.py` to push in response handler
3. **Add `push_on_api_response` config flag** - Control immediate push behavior

### Phase 2: Dedicated Scorecard Polling (2-3 days)
1. **Add `_scorecard_poll_loop()` task** in `CrexScraperService`
2. **Independent sC4 polling every 5 seconds** - Not tied to main scrape cycle
3. **Cache scorecard with shorter TTL** - Ensure freshness

### Phase 3: WebSocket Streaming (Optional, 5-7 days)
1. **Replace HTTP POST with WebSocket** for backend communication
2. **Delta updates** - Only send changed fields
3. **Server-Sent Events fallback** for simpler clients

## Success Criteria

1. ✅ Ball updates arrive within 2 seconds of occurrence
2. ✅ No skipped balls (9.3 → 9.4 → 9.5 → 9.6 sequence preserved)
3. ✅ Score updates within 1.5 seconds of ball completion
4. ✅ Scorecard (batsman/bowler stats) updates within 10 seconds
5. ✅ No regression in system stability or resource usage

## References

- Existing Issue: Ball updates skipping from 9.3 to 9.6
- Related Spec: `specs/006-scraper-optimization/` - Scraper optimization work
- Incident: `SCRAPER_THREAD_LEAK_INCIDENT.md` - Resource management learnings
