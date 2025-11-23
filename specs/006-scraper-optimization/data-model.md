# Phase 1: Data Model & State Machines

**Feature**: 006-scraper-optimization  
**Date**: 2025-11-22  
**Status**: Draft

## Entity Definitions

### 1. Match Monitoring Record

**Purpose**: Track scraping state, freshness, and health per match.

**Schema**:
```python
@dataclass
class MatchMonitoringRecord:
    match_id: str                    # Unique identifier (e.g., "crex_12345")
    domain_id: str                   # Source domain ("crex", "espn", "cricinfo")
    last_update_time: float          # Unix timestamp of last successful scrape
    freshness_age_seconds: float     # Computed: time.time() - last_update_time
    priority_state: MatchPriority    # Enum: LIVE, IMMINENT, COMPLETED
    consecutive_failure_count: int   # Reset to 0 on success
    paused: bool                     # True if exceeds failure threshold
    pause_until: Optional[float]     # Unix timestamp when pause expires
    total_scrapes: int               # Lifetime scrape count for this match
    total_failures: int              # Lifetime failure count
    created_at: float                # Record creation timestamp
    metadata: dict                   # Extensible (e.g., match_title, teams)
```

**Storage**:
- **Redis Key**: `match_monitor:{match_id}` (JSON serialized)
- **Redis Sorted Set**: `freshness_index` (score=last_update_time, member=match_id) for O(log N) staleness queries
- **Redis Set**: `paused_matches` for O(1) pause checks

**Lifecycle**:
1. Created when match first discovered
2. Updated after each scrape attempt (success or failure)
3. Moved to `paused_matches` if `consecutive_failure_count >= PAUSE_THRESHOLD (default: 5)`
4. Evicted when `priority_state == COMPLETED` AND `freshness_age_seconds > ARCHIVE_TTL (24h)`

**Indexes**:
- By freshness: `ZRANGE freshness_index 0 -1` → matches sorted by stalest first
- By priority + freshness: Application-level filtering on `priority_state`

---

### 2. Scrape Request (Task Record)

**Purpose**: Represent queued scraping task with priority and retry state.

**Schema**:
```python
@dataclass(order=True)  # Enable priority queue comparison
class ScrapeRequest:
    priority: int = field(compare=True)       # 0=LIVE, 1=IMMINENT, 2=COMPLETED (lower wins)
    match_id: str = field(compare=False)
    domain_id: str = field(compare=False)
    attempt_number: int = field(default=0, compare=False)
    scheduled_at: float = field(default_factory=time.time, compare=False)
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()), compare=False)
    resource_type: str = field(default="scorecard", compare=False)  # "scorecard", "commentary", "stats"
    metadata: dict = field(default_factory=dict, compare=False)
```

**Storage**:
- **In-Memory**: `asyncio.PriorityQueue` (ephemeral, lost on restart)
- **Persistence (Optional Future)**: Redis List `task_queue:{priority}` for durability

**Lifecycle**:
1. Created by `AsyncScheduler.schedule(match_id, priority)`
2. Enqueued to `PriorityQueue`
3. Dequeued by worker; `attempt_number` incremented if retry
4. Discarded after max attempts (3) or success

**Priority Mapping**:
```python
class MatchPriority(Enum):
    LIVE = 0        # In-progress match
    IMMINENT = 1    # Starts within 1 hour
    COMPLETED = 2   # Historical/archived
```

---

### 3. Cached Snapshot

**Purpose**: Store normalized match data for freshness tracking, delta computation, and failover.

**Schema**:
```python
@dataclass
class CachedSnapshot:
    match_id: str
    domain_id: str
    normalized_payload: dict         # Match data in unified schema
    created_at: float                # Scrape timestamp
    sequence_number: int             # Monotonic counter per match (detect missed updates)
    provenance: dict                 # Field-level source attribution (for multi-domain reconciliation)
    checksum: str                    # SHA256 hash for deduplication
```

**Storage**:
- **Redis Key**: `match_latest:{match_id}` (TTL=15s for live, 24h for completed)
- **Redis List**: `match_history:{match_id}` (LPUSH latest, LTRIM 0 4) → rolling buffer of 5 snapshots

**Provenance Example**:
```python
{
    "score": {"source": "crex", "confidence": 0.9, "timestamp": 1700000000.0},
    "overs": {"source": "espn", "confidence": 1.0, "timestamp": 1700000001.0}
}
```

**TTL Strategy**:
- Live match: 15s (refreshed each cycle)
- Completed match: 24h (archival grace period before eviction)
- Static data (roster): 12h-24h (separate key pattern `roster:{team_id}`)

**Delta Computation**:
```python
async def get_delta(match_id: str, current: dict) -> dict:
    previous = await cache.get_snapshot(match_id)
    if not previous:
        return {"_diff_type": "initial", **current}
    
    delta = {}
    for key, value in current.items():
        if previous["normalized_payload"].get(key) != value:
            delta[key] = value
    
    delta["_diff_type"] = "update"
    delta["_sequence_delta"] = current["sequence_number"] - previous["sequence_number"]
    return delta
```

---

### 4. Health Summary

**Purpose**: Aggregate health metrics for `/status` endpoint and alerting.

**Schema**:
```python
@dataclass
class HealthSummary:
    grade: HealthGrade               # Enum: HEALTHY, DEGRADED, FAILING, RECOVERING
    freshness_stats: FreshnessStats  # Median, p95, max, count
    queue_depth: int                 # Tasks waiting in PriorityQueue
    active_tasks: int                # Currently executing scrapes
    failure_ratio: float             # failures / total_attempts (rolling window)
    paused_matches: List[str]        # Match IDs currently paused
    last_success_time: float         # Most recent successful scrape (any match)
    config_snapshot: dict            # Current thresholds (CONCURRENCY_CAP, etc.)
    audit_entries: List[AuditEntry]  # Recent recoveries/recycles (last 10)
    generated_at: float              # Snapshot timestamp

@dataclass
class FreshnessStats:
    median: float
    p50: float  # Same as median (redundant for clarity)
    p95: float
    max: float
    count: int
    samples: List[float]  # Raw freshness ages (for percentile calculation)

class HealthGrade(Enum):
    HEALTHY = "healthy"       # All thresholds within normal
    DEGRADED = "degraded"     # Median or p95 >= 60s
    FAILING = "failing"       # Any match >= 120s OR stall >= 90s
    RECOVERING = "recovering" # Post-recycle state (until first success)
```

**Storage**:
- **Redis Key**: `health_summary` (TTL=5s, cached for /status queries)
- **Computed On-Demand**: Aggregate from `freshness_index`, `paused_matches`, scheduler state

**State Transitions**:
```
HEALTHY --> DEGRADED (median >= 60s OR p95 >= 60s)
DEGRADED --> FAILING (any match >= 120s OR stall >= 90s)
FAILING --> RECOVERING (recycle triggered)
RECOVERING --> HEALTHY (first successful scrape post-recycle)
DEGRADED --> HEALTHY (freshness back within thresholds)
```

---

### 5. Recovery Audit Entry

**Purpose**: Log automated recovery actions for compliance and debugging.

**Schema**:
```python
@dataclass
class RecoveryAuditEntry:
    entry_id: str                    # UUID
    timestamp: float                 # Unix timestamp
    action_type: RecoveryAction      # Enum: BROWSER_RECYCLE, SOFT_RESTART, MANUAL_TRIGGER
    trigger_condition: str           # Human-readable reason (e.g., "PID count > 200")
    outcome: RecoveryOutcome         # Enum: SUCCESS, PARTIAL, FAILED
    duration_seconds: float          # Time taken for recovery action
    metadata: dict                   # Additional context (PIDs before/after, etc.)

class RecoveryAction(Enum):
    BROWSER_RECYCLE = "browser_recycle"       # Scheduled 6h recycle
    SOFT_RESTART = "soft_restart"             # Watchdog-triggered restart
    MANUAL_TRIGGER = "manual_trigger"         # Admin /admin/recycle POST
    CONTEXT_POOL_RESET = "context_pool_reset" # Emergency context drain

class RecoveryOutcome(Enum):
    SUCCESS = "success"       # Health returned to HEALTHY within 120s
    PARTIAL = "partial"       # Health improved but still DEGRADED
    FAILED = "failed"         # Health still FAILING after recovery
```

**Storage**:
- **Redis List**: `audit_log` (LPUSH new entries, LTRIM 0 99) → last 100 entries
- **Long-term (Optional)**: Write to file `audit.log` for persistent record

**Example Entry**:
```json
{
    "entry_id": "a1b2c3d4-...",
    "timestamp": 1700000000.0,
    "action_type": "browser_recycle",
    "trigger_condition": "uptime_exceeded:6h",
    "outcome": "success",
    "duration_seconds": 12.3,
    "metadata": {
        "pids_before": 142,
        "pids_after": 87,
        "browser_uptime_hours": 6.02,
        "task_count": 9847
    }
}
```

---

### 6. Domain Adapter Descriptor

**Purpose**: Configure multi-domain scraping behavior and precedence.

**Schema**:
```python
@dataclass
class DomainAdapterDescriptor:
    domain_id: str                   # "crex", "espn", "cricinfo"
    enabled: bool                    # Toggle via config without restart
    precedence_weight: int           # Higher = preferred for reconciliation (0-100)
    rate_limits: RateLimitConfig
    last_discovery_time: float       # Most recent /matches list fetch
    adapter_class: str               # Fully qualified class name (e.g., "adapters.crex.CrexAdapter")
    metadata: dict                   # API keys, base URLs, selectors config

@dataclass
class RateLimitConfig:
    max_concurrent_contexts: int     # Per-domain concurrency cap
    min_interval_seconds: float      # Minimum delay between requests
    burst_allowance: int             # Max requests in burst window
```

**Storage**:
- **Config File**: `config/sources.yaml` (loaded at startup)
- **Runtime Override**: Redis `domain_config:{domain_id}` for dynamic enable/disable

**Example YAML**:
```yaml
sources:
  - domain_id: crex
    enabled: true
    precedence_weight: 100
    rate_limits:
      max_concurrent_contexts: 30
      min_interval_seconds: 0.5
      burst_allowance: 50
    adapter_class: adapters.crex_adapter.CrexAdapter
    metadata:
      base_url: "https://crex.live"
      requires_js: true
  
  - domain_id: espn
    enabled: false  # Future expansion
    precedence_weight: 80
    rate_limits:
      max_concurrent_contexts: 20
      min_interval_seconds: 1.0
      burst_allowance: 30
    adapter_class: adapters.espn_adapter.EspnAdapter
    metadata:
      base_url: "https://espncricinfo.com"
      requires_js: false
```

---

## State Machines

### 1. Match Lifecycle State Machine

**States**: `DISCOVERED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`

**Transitions**:
```
DISCOVERED --> ACTIVE (first successful scrape)
ACTIVE --> PAUSED (consecutive_failure_count >= 5)
PAUSED --> ACTIVE (cooldown expires + successful retry)
ACTIVE --> COMPLETED (match status = "finished" from source)
COMPLETED --> ARCHIVED (freshness_age > 24h)
PAUSED --> COMPLETED (match finishes while paused)
```

**Transition Actions**:
- `DISCOVERED -> ACTIVE`: Create `MatchMonitoringRecord`, add to `freshness_index`
- `ACTIVE -> PAUSED`: Add to `paused_matches` set, log warning
- `PAUSED -> ACTIVE`: Remove from `paused_matches`, reset `consecutive_failure_count`
- `ACTIVE -> COMPLETED`: Update priority to `COMPLETED`, reduce scrape frequency (every 5min)
- `COMPLETED -> ARCHIVED`: Delete from `freshness_index`, retain snapshot with 24h TTL

---

### 2. Health Grade State Machine

**States**: `HEALTHY`, `DEGRADED`, `FAILING`, `RECOVERING`

**Transitions**:
```
HEALTHY --> DEGRADED (median >= 60s OR p95 >= 60s)
DEGRADED --> FAILING (max >= 120s OR stall_duration >= 90s)
FAILING --> RECOVERING (browser_recycle() called)
RECOVERING --> HEALTHY (first successful scrape)
DEGRADED --> HEALTHY (freshness back < 60s for 2 consecutive intervals)
FAILING --> DEGRADED (partial improvement: max < 120s but median still high)
```

**Transition Actions**:
- `HEALTHY -> DEGRADED`: Log warning, send Prometheus alert
- `DEGRADED -> FAILING`: Log critical, trigger watchdog check
- `FAILING -> RECOVERING`: Execute `browser_pool.recycle()`, create `AuditEntry`
- `RECOVERING -> HEALTHY`: Log info, clear alerts

**Evaluation Frequency**: Every 15 seconds (monitoring interval)

---

### 3. Task Retry State Machine

**States**: `PENDING`, `EXECUTING`, `SUCCESS`, `FAILED`, `ABANDONED`

**Transitions**:
```
PENDING --> EXECUTING (worker dequeues task)
EXECUTING --> SUCCESS (scrape completes, data valid)
EXECUTING --> FAILED (exception, timeout, invalid data)
FAILED --> PENDING (retry if attempt_number < MAX_RETRIES)
FAILED --> ABANDONED (attempt_number >= MAX_RETRIES)
SUCCESS --> [end state]
ABANDONED --> [end state]
```

**Retry Policy**:
- **Max Attempts**: 3
- **Backoff**: Exponential with full jitter
  - Attempt 1: immediate
  - Attempt 2: 2s + jitter(0-2s)
  - Attempt 3: 4s + jitter(0-4s)
- **Timeout**: 15s per navigation, 45s total scrape

**Transition Actions**:
- `EXECUTING -> SUCCESS`: Update `MatchMonitoringRecord`, reset `consecutive_failure_count`
- `EXECUTING -> FAILED`: Increment `consecutive_failure_count`, log error
- `FAILED -> PENDING`: Re-enqueue with incremented `attempt_number`, add backoff delay
- `FAILED -> ABANDONED`: Log critical, trigger pause check

---

## Cache Key Patterns

| Pattern | Example | TTL | Purpose |
|---------|---------|-----|---------|
| `match_latest:{id}` | `match_latest:crex_12345` | 15s (live) / 24h (completed) | Latest normalized snapshot |
| `match_history:{id}` | `match_history:crex_12345` | 1h | Rolling buffer (5 snapshots) |
| `match_monitor:{id}` | `match_monitor:crex_12345` | Persistent | Monitoring record |
| `roster:{team_id}` | `roster:india_t20` | 12h | Static team roster |
| `freshness_index` | - | Persistent | Sorted set (score=last_update_time) |
| `paused_matches` | - | Persistent | Set of paused match IDs |
| `health_summary` | - | 5s | Cached health snapshot for /status |
| `audit_log` | - | Persistent (LTRIM 100) | Recovery audit entries |
| `domain_config:{id}` | `domain_config:espn` | Persistent | Runtime adapter config override |
| `negative_cache:{id}` | `negative_cache:upcoming_67890` | 60s | "Match not found" marker |

---

## Normalization Schema

**Purpose**: Unified match data format across all domains (Crex, ESPN, Cricinfo).

**Core Fields**:
```python
{
    "match_id": "crex_12345",
    "domain_id": "crex",
    "title": "India vs Australia - 3rd T20I",
    "status": "live",  # "upcoming", "live", "completed", "abandoned"
    "teams": {
        "team_a": {"name": "India", "short_name": "IND"},
        "team_b": {"name": "Australia", "short_name": "AUS"}
    },
    "score": {
        "team_a": {"runs": 187, "wickets": 5, "overs": 20.0},
        "team_b": {"runs": 95, "wickets": 3, "overs": 12.3}
    },
    "current_innings": 2,
    "toss": {"winner": "India", "decision": "bat"},
    "venue": "MCG, Melbourne",
    "start_time": "2025-11-22T14:00:00Z",
    "last_event": {
        "type": "wicket",  # "runs", "wicket", "over_complete"
        "description": "Smith c Kohli b Bumrah 42 (28)",
        "timestamp": "2025-11-22T15:23:45Z"
    },
    "metadata": {
        "series": "India tour of Australia 2025",
        "match_type": "T20I",
        "weather": "Clear, 28°C"
    }
}
```

**Provenance Annotation** (Multi-Domain):
```python
{
    "score": {
        "_source": "crex",
        "_confidence": 0.95,
        "_timestamp": 1700000000.0
    }
}
```

---

## Reconciliation Rules (Multi-Domain)

**Scenario**: Same match available from Crex (precedence=100) and ESPN (precedence=80).

**Field-Level Reconciliation**:
1. **Prefer Higher Precedence**: If both domains provide `score`, use Crex.
2. **Fallback on Missing**: If Crex missing `toss`, use ESPN.
3. **Timestamp Freshness**: If precedence equal, use most recent `_timestamp`.
4. **Confidence Threshold**: Reject fields with `_confidence < 0.5`.

**Example**:
```python
crex_data = {"score": {"runs": 187, "_confidence": 0.9, "_timestamp": 1700000005}}
espn_data = {"score": {"runs": 186, "_confidence": 0.85, "_timestamp": 1700000010}}

# Reconciled: Use Crex (higher precedence) despite ESPN being newer
final_score = crex_data["score"]
```

**Conflict Logging**: Log to `reconciliation.log` when fields differ by >5% (runs, wickets).

---

## Metrics Schema (Prometheus)

**Gauge Metrics** (point-in-time values):
```
scraper_pids_current{instance="scraper-1"} 112
scraper_contexts_active{instance="scraper-1"} 38
scraper_pages_open{instance="scraper-1"} 5
scraper_browser_uptime_seconds{instance="scraper-1"} 18432
scraper_queue_depth{priority="live"} 3
scraper_queue_depth{priority="imminent"} 12
scraper_queue_depth{priority="completed"} 47
```

**Histogram Metrics** (distribution):
```
scraper_freshness_seconds_bucket{le="10"} 45
scraper_freshness_seconds_bucket{le="30"} 89
scraper_freshness_seconds_bucket{le="60"} 94
scraper_freshness_seconds_bucket{le="+Inf"} 100
scraper_freshness_seconds_sum 2847.3
scraper_freshness_seconds_count 100

scraper_scrape_duration_seconds_bucket{domain="crex",le="1"} 23
scraper_scrape_duration_seconds_bucket{domain="crex",le="3"} 87
scraper_scrape_duration_seconds_bucket{domain="crex",le="+Inf"} 100
```

**Counter Metrics** (monotonic):
```
scraper_scrapes_total{domain="crex",status="success"} 10234
scraper_scrapes_total{domain="crex",status="failure"} 47
scraper_navigation_failures_total{domain="crex"} 12
scraper_recycles_total{reason="uptime"} 4
scraper_recycles_total{reason="task_count"} 1
scraper_recycles_total{reason="manual"} 0
```

**Summary Metrics** (quantiles):
```
scraper_data_staleness_seconds{quantile="0.5"} 28.3
scraper_data_staleness_seconds{quantile="0.95"} 54.7
scraper_data_staleness_seconds{quantile="0.99"} 87.2
scraper_data_staleness_seconds_sum 5638.9
scraper_data_staleness_seconds_count 200
```

---

*End Phase 1 Data Model*
