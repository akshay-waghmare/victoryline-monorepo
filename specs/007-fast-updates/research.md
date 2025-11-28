# Research: Fast Ball-by-Ball Updates

**Feature**: 007-fast-updates  
**Date**: 2025-11-28  
**Status**: Complete

## Research Tasks

### 1. Optimal Polling Interval for Live Cricket

**Decision**: 1-second polling interval with adaptive backoff

**Rationale**:
- Cricket balls are bowled approximately every 30-45 seconds during active play
- With 2.5s polling, consecutive rapid deliveries (boundary followed by quick single) can be missed
- 1-second polling ensures no ball is missed even during super overs (6 balls in ~90 seconds)
- Adaptive backoff protects against rate limiting without sacrificing normal operation

**Alternatives Considered**:
- 0.5s polling: Rejected due to unnecessary load on Crex API and diminishing returns
- WebSocket to Crex: Not available; they only provide HTTP polling
- 2s polling: Still risks missing rapid consecutive deliveries

**Implementation Notes**:
- Use `asyncio.sleep(1.0)` in poll loop
- Implement exponential backoff (base=1s, max=30s) on HTTP 429 responses
- Add jitter (±200ms) to prevent thundering herd with multiple matches

---

### 2. Immediate Push on sV3 Response

**Decision**: Intercept sV3 API response and push immediately via callback

**Rationale**:
- Current implementation waits for poll cycle to complete before pushing
- Adding 2-second sleep after intercept adds unnecessary latency
- Immediate push reduces end-to-end latency by 2-3 seconds

**Alternatives Considered**:
- SSE stream from backend: Adds complexity, backend already has WebSocket
- Kafka queue: Overkill for this use case, adds infrastructure dependency
- Direct WebSocket from scraper: Violates monorepo architecture (scraper → backend → frontend)

**Implementation Notes**:
- Add `on_update: Callable[[str, dict], Awaitable[None]]` callback to `CrexAdapter`
- Remove `asyncio.sleep(2)` after sV3 capture in `crex_adapter.py:88-92`
- Call callback immediately when sV3 response is intercepted
- Backend already handles WebSocket push; scraper just needs to POST faster

---

### 3. Dedicated Scorecard (sC4) Polling Loop

**Decision**: Separate async task for sC4 with 10-second interval

**Rationale**:
- Scorecard data (sC4) is less time-sensitive than live score (sV3)
- Tying sC4 to sV3 cycle meant scorecard staleness tracked worst-case poll gap
- Dedicated loop with 10s interval ensures max staleness of 10s (vs current 30s+)
- Decoupling allows independent failure handling

**Alternatives Considered**:
- Fetch sC4 on every sV3 poll: Doubles API calls, minimal benefit for scorecard UX
- Single combined payload: Crex API doesn't support; sV3 and sC4 are separate endpoints
- 5s interval: Too aggressive for data that changes less frequently

**Implementation Notes**:
- Create `_scorecard_poll_loop()` method in `CrexScraperService`
- Run as separate `asyncio.create_task()` per live match
- Use `asyncio.gather()` for parallel sV3 and sC4 tasks
- Independent error handling; sC4 failure doesn't affect sV3 updates

---

### 4. Sequence Tracking and Gap Detection

**Decision**: Track `last_ball_number` per match with float comparison

**Rationale**:
- Ball numbers follow cricket format: `over.ball` (e.g., 9.3, 9.4, 9.5, 10.0)
- Detecting gaps (9.3 → 9.6) requires storing last seen ball per match
- Alerting on gaps enables debugging and potential backfill

**Alternatives Considered**:
- Integer sequence numbers: Crex API doesn't provide; would need custom tracking
- Timestamp-based detection: Doesn't capture ball number gaps, only time gaps
- Ignore gaps: Violates FR-004 (guarantee in-order delivery)

**Implementation Notes**:
- Store `Dict[str, float]` mapping `match_id → last_ball_number`
- Parse ball number from sV3 response (format: `"currentOver": "9.4"`)
- Expected next ball: if `ball % 1 < 0.5` then `ball + 0.1` else `floor(ball) + 1.0`
- Log warning with match ID, expected ball, actual ball when gap detected
- Increment `missed_balls_total` Prometheus counter

---

### 5. Backpressure Handling (Latest-State-Wins)

**Decision**: Drop stale updates, always send current state

**Rationale**:
- Users care about current score, not queue of historical updates
- Queuing updates risks memory growth with slow clients
- Reconnecting clients should see current state immediately

**Alternatives Considered**:
- Bounded queue (100 items): Still risks stale data display
- Client-side throttling: Can't control all clients
- Disconnect slow clients: Poor UX, punishes mobile users

**Implementation Notes**:
- Backend WebSocket handler already uses latest-state pattern
- Scraper side: If POST to backend fails, log and continue (don't retry stale data)
- Frontend: On reconnect, fetch current state via REST, then subscribe to WebSocket

---

### 6. Match Priority Scoring

**Decision**: Weighted score = `viewer_count × phase_weight × importance_weight`

**Rationale**:
- Ensures high-engagement matches get priority during resource contention
- Phase weight prioritizes final overs (highest tension)
- Importance weight prioritizes international matches (largest audience)

**Weight Definitions**:
- `phase_weight`: `{final_over: 3, death_overs: 2.5, middle: 2, powerplay: 2, start: 1, toss: 0.5}`
- `importance_weight`: `{international: 3, franchise: 2.5, domestic: 2, club: 1}`

**Alternatives Considered**:
- Viewer count only: Ignores match phase importance
- Phase only: Ignores actual engagement data
- Static priority: Doesn't adapt to real-time conditions

**Implementation Notes**:
- Add `calculate_priority(match: MatchState) -> float` to scheduler
- Track `viewer_count` from backend API (already available)
- Derive `phase` from overs remaining and match format
- Update priority every poll cycle; re-sort task queue

---

### 7. Rate Limit Handling with Exponential Backoff

**Decision**: Exponential backoff with jitter (base=1s, max=30s, factor=2)

**Rationale**:
- Crex rate limits are unknown; assume they exist
- Exponential backoff is industry standard for rate limit handling
- Jitter prevents synchronized retries across matches

**Backoff Formula**:
```python
delay = min(base * (factor ** attempt) + random.uniform(-jitter, jitter), max_delay)
```

**Alternatives Considered**:
- Fixed delay: Doesn't adapt to severity of rate limiting
- Linear backoff: Too slow to recover after limits lift
- No backoff: Risks getting blocked entirely

**Implementation Notes**:
- Use `backoff` library with `@backoff.on_exception` decorator
- Target HTTP 429 responses specifically
- Log rate limit events with match ID and delay
- Add `rate_limit_events_total` Prometheus counter
- Alert if rate limiting sustained for >5 minutes

---

## Technology Best Practices

### Async Playwright Pooling (Already Implemented)
- `AsyncBrowserPool` manages browser contexts
- Context reuse reduces startup overhead
- Graceful shutdown cleans up all contexts

### Redis Caching Strategy
- Key pattern: `live:{match_id}:score`, `live:{match_id}:scorecard`
- TTL: 5 seconds for live data (reduced from 15s)
- Use `SET ... EX 5` for atomic write with expiry

### Prometheus Metrics
- Histogram for latency: `update_latency_seconds`
- Counter for missed balls: `missed_balls_total`
- Gauge for active matches: `active_matches_count`
- Gauge for scorecard staleness: `scorecard_staleness_seconds`

---

## Summary

All NEEDS CLARIFICATION items resolved. No blocking unknowns remain.

| Item | Resolution |
|------|------------|
| Polling interval | 1 second with adaptive backoff |
| Immediate push | Callback on sV3 intercept |
| Scorecard loop | Dedicated 10s interval task |
| Gap detection | Float-based ball number tracking |
| Backpressure | Latest-state-wins pattern |
| Match priority | Weighted composite score |
| Rate limits | Exponential backoff with jitter |
