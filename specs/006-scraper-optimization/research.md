# Phase 0: Research & Technology Evaluation

**Feature**: 006-scraper-optimization  
**Date**: 2025-11-22  
**Status**: Draft

## Problem Analysis

### Current State (Sync Playwright + Threads)
- **Architecture**: Flask app spawns threads; each thread creates Playwright browser instance
- **Resource Growth**: Each browser = 1 parent + ~15-30 Chromium subprocesses (PIDs)
- **Observed Failure**: 4,613 PIDs after 20 hours → thread exhaustion → "can't start new thread" error
- **Data Staleness**: 2.6+ hours stale data during PID saturation
- **Cleanup Gaps**: `browser.close()` not always reached (exceptions, race conditions on shutdown)
- **Lifecycle**: No systematic browser recycling; runs until crash or manual restart

### Root Causes
1. **No PID Ceiling**: Docker container lacks `pids_limit`; unlimited growth
2. **Sync Concurrency Model**: Threads block on I/O; harder cleanup (GIL contention, exception propagation)
3. **Per-Match Browser Anti-Pattern**: N matches → N browsers → N*30 PIDs
4. **Missing Watchdog**: No orphan process detection or forced cleanup
5. **Weak Lifecycle**: No uptime/task-count-based recycling triggers
6. **Insufficient Metrics**: PIDs not tracked; staleness threshold too high (300s)

## Technology Evaluation

### 1. Async Playwright vs Sync Playwright

| Criterion | Sync (Current) | Async (Proposed) | Winner |
|-----------|----------------|------------------|--------|
| **Concurrency Model** | Threads (OS-scheduled) | Cooperative (event loop) | **Async** |
| **Resource Overhead** | ~8MB stack per thread | ~50KB per coroutine | **Async** |
| **Cleanup Reliability** | Exceptions skip `finally` blocks if thread killed | Controlled cancellation with cleanup hooks | **Async** |
| **I/O Efficiency** | Blocking (wasted CPU cycles) | Non-blocking (multiplexed) | **Async** |
| **PID Count** | N threads × (1 browser × 30 PIDs) = 30N | 1 browser × 30 PIDs (contexts reused) | **Async** |
| **Backpressure** | Hard to enforce (thread spawn cheap until OS limit) | Natural (semaphore blocks `await`) | **Async** |
| **Learning Curve** | Familiar | Requires async/await understanding | Sync (but mitigated by async becoming Python standard) |

**Decision**: Migrate to `async_playwright`. Async model solves root cause (uncontrolled resource growth) and enables efficient 40+ concurrent tasks with single browser instance.

### 2. Browser Pooling Strategies

| Strategy | Approach | PIDs | Complexity | Cleanup Risk |
|----------|----------|------|------------|--------------|
| **Browser per Match** (current) | `N` browsers | 30N | Low | **High** (N cleanup points) |
| **Browser per Thread** | `T` browsers (T=thread count) | 30T | Low | **High** |
| **Single Browser + Context Pool** (proposed) | 1 browser, M contexts | **30 + M×2** | Medium | **Low** (1 browser cleanup) |
| **Process Pool + Browsers** | P processes × B browsers | 30×P×B | **High** | **High** (cross-process coordination) |

**Decision**: Single browser + context pool. Chromium already multi-process; contexts share browser process overhead. M=40 contexts → ~30 (browser) + 80 (contexts) = **~110 PIDs stable** vs current 4,613.

### 3. Caching Layer: Redis vs In-Memory

| Criterion | Redis | In-Memory (dict/LRU) | Winner |
|-----------|-------|----------------------|--------|
| **Persistence** | Survives restart | Lost on restart | **Redis** |
| **Multi-Container** | Shared across replicas | Isolated per instance | **Redis** |
| **Performance** | Network RTT (~1ms local) | Instant (nanoseconds) | In-Memory (but negligible for scraper use case) |
| **TTL Management** | Native (automatic expiry) | Manual (timers/sweeps) | **Redis** |
| **Atomic Operations** | Yes (INCR, ZADD, etc.) | Requires locks | **Redis** |
| **Operational Overhead** | Separate service | None | In-Memory |

**Decision**: Redis. Multi-container readiness essential for future scaling. TTL and atomic ops simplify implementation. Operational overhead acceptable (already using Redis for backend sessions).

### 4. Metrics Exposure: Prometheus vs StatsD vs Custom

| Criterion | Prometheus (pull) | StatsD (push) | Custom JSON | Winner |
|-----------|-------------------|---------------|-------------|--------|
| **Ecosystem** | Grafana native | Requires aggregator | DIY dashboards | **Prometheus** |
| **Format** | Text (simple) | UDP packets | JSON | **Prometheus** |
| **Reliability** | HTTP (retries) | UDP (lossy) | HTTP | Prometheus/Custom |
| **Cardinality** | Labels (flexible) | Fixed buckets | Flexible | **Prometheus** |
| **Learning Curve** | Industry standard | DevOps familiarity | None | Tie |

**Decision**: Prometheus. Industry standard; Grafana integration; label-based queries (filter by `domain`, `priority`). Add `/metrics` endpoint returning Prometheus text format.

### 5. Retry Library: backoff vs tenacity vs manual

| Criterion | backoff | tenacity | Manual | Winner |
|-----------|---------|----------|--------|--------|
| **Jitter Support** | Yes (full/equal) | Yes | DIY | backoff/tenacity |
| **Decorator API** | Yes (`@backoff.on_exception`) | Yes (`@retry`) | N/A | backoff/tenacity |
| **Async Support** | Yes | Yes | N/A | backoff/tenacity |
| **Wait Strategies** | Exponential, linear, constant | Exponential, fixed, random | DIY | **tenacity** (more options) |
| **Stop Strategies** | Max tries, max time | Max tries, max time, never | DIY | Tie |
| **Simplicity** | Minimal config | More config | Simplest | **backoff** |

**Decision**: `backoff`. Simpler API for common case (exponential + jitter + max attempts). Example:
```python
@backoff.on_exception(backoff.expo, playwright.Error, max_tries=3, jitter=backoff.full_jitter)
async def fetch_match(context, match_id):
    ...
```

### 6. Scheduler Pattern: Priority Queue vs Work Stealing vs Celery

| Pattern | Fit | Complexity | Operational Overhead |
|---------|-----|------------|---------------------|
| **Priority Heap (asyncio.PriorityQueue)** | Perfect (in-process, priority-driven) | Low | None |
| **Work Stealing** | Overkill (multi-worker pattern, not needed) | High | None |
| **Celery** | Overkill (distributed task queue, heavy) | High | RabbitMQ/Redis broker |

**Decision**: `asyncio.PriorityQueue` with `dataclass(order=True)` for task priority. Simple, efficient, no external dependencies.

### 7. Multi-Domain Architecture: Adapters vs Scrapy vs Crawlee

| Option | Fit | Learning Curve | Rewrite Effort | Multi-Language |
|--------|-----|----------------|----------------|----------------|
| **Adapter Pattern (Python)** | Good (future-proof, keeps existing parsing) | Low | Low (incremental) | No |
| **Scrapy Migration** | Good (mature, breadth-first crawling) | Medium | **High** (full rewrite) | No |
| **Crawlee (Node.js)** | Poor (different runtime, duplication) | High | **Very High** | **Yes** (operational complexity) |

**Decision**: Adapter pattern. Keep Python; add `SourceAdapter` interface; implement `CrexAdapter` wrapping existing scraper; future adapters (ESPN, Cricinfo) follow same interface. Defer Scrapy/Crawlee unless scale demands (>15 domains, >500k requests/day).

## Architectural Patterns

### 1. Browser Lifecycle Management

**Pattern**: Singleton Browser + Bounded Context Pool

```python
class AsyncBrowserPool:
    _browser: Optional[Browser] = None
    _playwright: Optional[AsyncPlaywright] = None
    _launch_time: float = 0
    _task_count: int = 0
    
    async def get_browser(self) -> Browser:
        if not self._browser or self._should_recycle():
            await self._recycle()
        return self._browser
    
    def _should_recycle(self) -> bool:
        uptime = time.time() - self._launch_time
        return uptime > RECYCLE_UPTIME or self._task_count > RECYCLE_TASK_COUNT
    
    async def _recycle(self):
        if self._browser:
            await self._browser.close()
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(...)
        self._launch_time = time.time()
        self._task_count = 0

class ContextPool:
    def __init__(self, max_contexts: int):
        self._semaphore = asyncio.Semaphore(max_contexts)
    
    async def acquire(self) -> BrowserContext:
        await self._semaphore.acquire()
        browser = await browser_pool.get_browser()
        return await browser.new_context()
    
    async def release(self, context: BrowserContext):
        try:
            await context.close()
        finally:
            self._semaphore.release()
```

**Benefits**: Single browser cleanup point; automatic recycle; semaphore enforces concurrency cap.

### 2. Priority Scheduling

**Pattern**: Dataclass-based Priority Queue

```python
@dataclass(order=True)
class ScrapeRequest:
    priority: int  # Lower = higher priority (0=live, 1=imminent, 2=completed)
    match_id: str = field(compare=False)
    domain_id: str = field(compare=False)
    attempts: int = field(default=0, compare=False)
    scheduled_at: float = field(default_factory=time.time, compare=False)

class AsyncScheduler:
    def __init__(self):
        self._queue = asyncio.PriorityQueue()
        self._active_tasks: Set[asyncio.Task] = set()
        self._semaphore = asyncio.Semaphore(CONCURRENCY_CAP)
    
    async def schedule(self, request: ScrapeRequest):
        if self._queue.qsize() > MAX_QUEUE_DEPTH:
            if request.priority > 0:  # Drop low-priority
                logger.warning(f"Queue full, dropping {request}")
                return
        await self._queue.put(request)
    
    async def worker_loop(self):
        while True:
            request = await self._queue.get()
            async with self._semaphore:
                task = asyncio.create_task(self._execute(request))
                self._active_tasks.add(task)
                task.add_done_callback(self._active_tasks.discard)
```

**Benefits**: Native priority sorting; backpressure via semaphore; queue depth monitoring; graceful low-priority drops.

### 3. Caching Strategy

**Pattern**: Layered Cache (Hot + Persistent)

```python
class ScrapeCache:
    def __init__(self, redis_client):
        self._redis = redis_client
        self._hot_cache: dict = {}  # In-memory LRU for ultra-fast reads
    
    async def get_snapshot(self, match_id: str) -> Optional[dict]:
        # Check hot cache first
        if match_id in self._hot_cache:
            return self._hot_cache[match_id]
        # Fallback to Redis
        raw = await self._redis.get(f"match_latest:{match_id}")
        if raw:
            data = json.loads(raw)
            self._hot_cache[match_id] = data  # Warm hot cache
            return data
        return None
    
    async def set_snapshot(self, match_id: str, data: dict, ttl: int = 15):
        self._hot_cache[match_id] = data
        await self._redis.set(f"match_latest:{match_id}", json.dumps(data), ex=ttl)
    
    async def get_delta(self, match_id: str, current: dict) -> dict:
        previous = await self.get_snapshot(match_id)
        if not previous:
            return current  # First scrape
        return self._compute_diff(previous, current)
    
    def _compute_diff(self, old: dict, new: dict) -> dict:
        # Simplified: return fields that changed
        delta = {k: v for k, v in new.items() if old.get(k) != v}
        delta["_diff_timestamp"] = time.time()
        return delta
```

**Benefits**: O(1) reads; hot cache reduces Redis RTT; delta computation enables bandwidth optimization.

### 4. Health Grading

**Pattern**: State Machine with Threshold Rules

```python
class HealthGrade(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILING = "failing"
    RECOVERING = "recovering"

class HealthGrader:
    def __init__(self):
        self._freshness_data: deque = deque(maxlen=100)  # Rolling window
        self._last_success: float = time.time()
    
    def compute_grade(self) -> HealthGrade:
        if not self._freshness_data:
            return HealthGrade.RECOVERING
        
        median = statistics.median(self._freshness_data)
        p95 = statistics.quantiles(self._freshness_data, n=20)[18]  # 95th percentile
        max_age = max(self._freshness_data)
        stall_duration = time.time() - self._last_success
        
        if max_age >= 120 or stall_duration >= 90:
            return HealthGrade.FAILING
        if median >= 60 or p95 >= 60:
            return HealthGrade.DEGRADED
        return HealthGrade.HEALTHY
    
    def record_freshness(self, age_seconds: float):
        self._freshness_data.append(age_seconds)
        self._last_success = time.time()
```

**Benefits**: Clear state transitions; percentile-based (robust to outliers); observable via `/status`.

### 5. Watchdog for Orphan Cleanup

**Pattern**: Periodic Scan + Kill

```python
class OrphanWatchdog:
    def __init__(self, browser_pool: AsyncBrowserPool):
        self._pool = browser_pool
        self._tracked_pids: Set[int] = set()
    
    async def start(self):
        while True:
            await asyncio.sleep(300)  # Every 5 minutes
            self._cleanup_orphans()
    
    def _cleanup_orphans(self):
        browser_pid = self._pool._browser._impl_obj._connection._transport.get_extra_info("peername")  # Playwright internals
        current_pids = self._get_child_pids(browser_pid)
        orphans = self._tracked_pids - current_pids
        
        for pid in orphans:
            try:
                os.kill(pid, signal.SIGKILL)
                logger.warning(f"Killed orphan PID {pid}")
            except ProcessLookupError:
                pass
        
        self._tracked_pids = current_pids
    
    def _get_child_pids(self, parent_pid: int) -> Set[int]:
        # Use psutil or parse /proc
        import psutil
        parent = psutil.Process(parent_pid)
        return {child.pid for child in parent.children(recursive=True)}
```

**Benefits**: Catches leaked Chromium subprocesses; runs in background; logs kills for audit.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Async migration breaks existing scraping logic | Medium | High | Incremental migration; keep sync fallback initially; comprehensive integration tests before cutover |
| Redis unavailable → cache misses → hammering endpoints | Low | Medium | Graceful degradation: scraper functional without Redis (slower); circuit breaker on Redis connection failures |
| Browser recycle causes brief data gap | Medium | Low | Pre-warm new browser before closing old; overlap period (5s) where both browsers active |
| Context pool exhaustion (40 → all busy) | Medium | Medium | Backpressure: new tasks wait (don't fail); queue depth alerts at 80% capacity |
| Metrics endpoint becomes bottleneck (many scrapers) | Low | Low | Cache metrics snapshot for 5s; /metrics returns cached values (O(1) response time) |
| Multi-domain precedence misconfigured | Low | Medium | Document precedence rules; add precedence validation test; expose provenance in /status for audit |

## Performance Projections

### Before (Sync + Threads)
- **PIDs**: 30N (N=matches) → 4,613 observed
- **Concurrency**: ~10 threads (hardcoded limit)
- **Freshness**: Median 45s, P95 120s, worst-case 2.6h (during failure)
- **Crash Frequency**: Every ~20 hours (thread exhaustion)

### After (Async + Pooling + Caching)
- **PIDs**: ~110 stable (30 browser + 80 contexts) ✅ 97% reduction
- **Concurrency**: 40 tasks (enforced semaphore) ✅ 4x increase
- **Freshness**: Median <30s, P95 <60s, worst-case <120s (before FAILING) ✅ Meets SLA
- **Crash Frequency**: Zero (recycle every 6h prevents drift) ✅ 100% uptime improvement
- **Cache Hit Rate**: 85%+ (reduces redundant scrapes) ✅ New capability

## Alternative Approaches Considered

### 1. Stay Sync + Add PID Limit Only
**Rejected**: Band-aid fix. Doesn't address root cause (inefficient concurrency model). Hit PID limit → scraper stalls → same failure mode, just bounded.

### 2. Process Pool (multiprocessing) + Sync Playwright
**Rejected**: Processes heavier than coroutines (8MB vs 50KB). Cross-process coordination complex (shared state). Doesn't solve per-match browser anti-pattern.

### 3. Full Scrapy Migration
**Rejected**: High rewrite cost (1-2 months). Existing parsing logic works. Scrapy's breadth-first model overkill for structured cricket APIs. Defer until >15 domains.

### 4. Serverless (AWS Lambda) per Match
**Rejected**: Cold start latency unacceptable for <5s freshness SLA. Chromium in Lambda requires layers (250MB+). Cost spike during tournaments (1000s of invocations/min).

## Proof of Concept

**Recommended PoC Before Full Implementation**:
1. Minimal async scraper: single match, async Playwright, Redis cache
2. Load test: 40 concurrent matches for 1 hour
3. Metrics: Track PIDs every 10s, measure freshness distribution
4. Success Criteria: PIDs stable <150, median freshness <30s, zero crashes

**Timeline**: 2-3 days

## Next Steps (Phase 1)

1. **Data Model**: Define `MatchMonitoringRecord`, `Task`, `Snapshot`, `HealthSummary` schemas
2. **Contracts**: Document `/metrics` Prometheus format, `/status` JSON schema
3. **Quickstart**: Local dev setup (Redis, Playwright, pytest-asyncio)
4. **Re-evaluate Constitution**: Confirm test strategy addresses Principle IV gap

---

*End Phase 0 Research*
