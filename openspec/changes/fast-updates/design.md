# Fast Updates Technical Design

## Current Architecture Analysis

### Production System Uses Async Scraper
The production scraper now uses the **async architecture** (`CrexScraperService` in `src/app.py`), NOT the legacy sync scraper. Key components:

| Component | File | Description |
|-----------|------|-------------|
| Entry Point | `src/app.py` | Flask app with async scraper in background thread |
| Core Service | `src/crex_scraper.py` | `CrexScraperService` with async workers |
| Browser Pool | `src/browser_pool.py` | `AsyncBrowserPool` with `async_playwright` |
| Adapter | `src/adapters/crex_adapter.py` | `CrexAdapter.fetch_match()` async method |
| Scheduler | `src/scheduler.py` | `AsyncScheduler` with priority queue |
| Cache | `src/cache.py` | Redis-backed `ScrapeCache` |

### What's Already Async ✅
1. **Browser Pool** - Uses `async_playwright` with context pooling
2. **Worker Loop** - `_worker_loop()` processes tasks concurrently
3. **Scheduler** - Async priority queue with rate limiting
4. **Cache** - Async Redis operations
5. **Backend Push** - Uses `asyncio.to_thread()` for HTTP calls

### Remaining Bottlenecks 🔴

#### 1. Polling Interval Still 2.5 Seconds
**Location**: `src/config.py:75`
```python
polling_interval_seconds: float = 2.5
```
The `_poll_loop()` in `crex_scraper.py` uses this setting:
```python
await asyncio.sleep(self.settings.polling_interval_seconds)
```

#### 2. No Immediate Push on sV3 Response
**Location**: `src/adapters/crex_adapter.py:88-92`
```python
# Wait for sV3 response (which triggers sC4)
try:
    await page.wait_for_response(lambda res: "sV3" in res.url, timeout=5000)
    await asyncio.sleep(2)  # Wait for sC4
except Exception:
    logger.warning(f"Timeout waiting for sV3 response")
```
The adapter waits for sV3 but doesn't immediately push data - it collects everything then returns.

#### 3. sC4 Not Continuously Polled
Scorecard (sC4) is fetched once per scrape cycle, not continuously. If scrape cycle is slow, scorecard becomes stale.

#### 4. Cache TTL May Cause Stale Reads
**Location**: `src/config.py:120`
```python
cache_live_ttl: int = 15  # seconds
```
15-second TTL is reasonable, but combined with 2.5s polling, effective staleness can be 17+ seconds.

## Architecture Decisions

### Decision 1: Reduce Polling to 1 Second
**Context**: Current 2.5s polling causes missed ball events when balls occur in quick succession.

**Decision**: Reduce `polling_interval_seconds` to 1.0 second for live matches.

**Implementation**: Update `src/config.py`:
```python
polling_interval_seconds: float = 1.0  # Was 2.5
```

**Tradeoffs**:
- Pro: 2.5x higher update frequency
- Con: ~2.5x more browser operations
- Mitigated by: AsyncBrowserPool handles concurrency, rate limiter prevents overload

### Decision 2: Stream sV3 Data via Network Interception
**Context**: The adapter already intercepts sV3 responses but doesn't push immediately.

**Decision**: Modify `_setup_network_interception()` to push data immediately to backend.

**Implementation**: In `crex_adapter.py`, add immediate push in response handler:
```python
async def _setup_network_interception(self, page: Page, data_store: Dict):
    async def handle_response(response: Response):
        if "sV3" in response.url:
            try:
                api_data = await response.json()
                data_store["api_data"] = api_data
                
                # NEW: Immediate push to backend
                if self.settings.push_on_api_response:
                    await self._push_live_update(api_data, data_store)
            except Exception as e:
                logger.warning(f"sV3 parse error: {e}")
    
    page.on("response", handle_response)
```

### Decision 3: Add Continuous sC4 Polling Task
**Context**: Scorecard data becomes stale between scrape cycles.

**Decision**: Add a dedicated async task in `CrexScraperService` that polls sC4 every 5 seconds.

**Implementation**: Add to `crex_scraper.py`:
```python
async def _scorecard_poll_loop(self):
    """Dedicated scorecard polling for freshness."""
    while self._running:
        try:
            for match_id in self._active_matches:
                await self._fetch_and_push_scorecard(match_id)
            await asyncio.sleep(self.settings.scorecard_polling_interval_seconds)
        except asyncio.CancelledError:
            break
```

## Data Flow

### Current Flow (Async but Batched)
```
Scheduler → Worker → Adapter.fetch_match() → Wait for DOM + sV3 + sC4 → Return all data → Push to backend
```
Total latency: 5-10 seconds (page load + wait + push)

### Proposed Flow (Event-Driven)
```
┌─────────────────────────────────────────────────────────────────────┐
│                         AsyncScheduler                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Worker (async task)                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ CrexAdapter.fetch_match()                                    │   │
│   │   ├── page.on("response") → sV3 detected                     │   │
│   │   │                              │                           │   │
│   │   │                    ┌─────────▼─────────┐                 │   │
│   │   │                    │ IMMEDIATE PUSH    │ ◄── NEW!        │   │
│   │   │                    │ (ball, batsmen,   │                 │   │
│   │   │                    │  bowler, odds)    │                 │   │
│   │   │                    └───────────────────┘                 │   │
│   │   │                                                          │   │
│   │   ├── Wait for DOM + sC4                                     │   │
│   │   └── Return full data → Push full snapshot                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Scorecard Poller (async task)                      │ ◄── NEW!
│   └── Every 5s: Fetch sC4 → Push to backend                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuration Schema

```python
@dataclass(frozen=True)
class ScraperSettings:
    # ... existing fields ...
    
    # Modify existing
    polling_interval_seconds: float = 1.0  # Was 2.5
    
    # Add new fast updates settings
    scorecard_polling_interval_seconds: float = 5.0
    push_on_api_response: bool = True
    enable_delta_updates: bool = True
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Source rate limiting | Existing `TokenBucket` rate limiter in scheduler |
| Increased backend load | Use delta updates, batch non-critical data |
| Browser context exhaustion | `AsyncBrowserPool` already handles semaphore limiting |
| Race conditions | Use async locks, Redis atomic operations |
| Memory growth | Existing memory limits in `ScraperContext` |
