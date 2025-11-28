# Scraper Internal API Contract

**Version**: 1.0.0  
**Feature**: 007-fast-updates  
**Date**: 2025-11-28

## Overview

This contract defines the internal APIs for the fast-updates feature within the scraper service. These are not external HTTP endpoints but rather internal Python interfaces and callback signatures.

---

## Callback Interfaces

### OnUpdateCallback

Called immediately when sV3 API response is intercepted.

```python
from typing import Callable, Awaitable

OnUpdateCallback = Callable[[str, dict], Awaitable[None]]
# Parameters:
#   match_id: str - Unique match identifier
#   data: dict - Parsed sV3 response data
# Returns: None (async)
```

**Usage**:
```python
async def handle_score_update(match_id: str, data: dict) -> None:
    """Push score update to backend immediately."""
    score = parse_score_snapshot(data)
    await cricket_data_service.push_score(match_id, score)

adapter = CrexAdapter(on_update=handle_score_update)
```

---

### Priority Calculator Interface

```python
from dataclasses import dataclass
from enum import Enum

class MatchPhase(Enum):
    TOSS = "toss"
    START = "start"
    POWERPLAY = "powerplay"
    MIDDLE = "middle"
    DEATH = "death"
    FINAL_OVER = "final_over"
    SUPER_OVER = "super_over"

class MatchImportance(Enum):
    CLUB = "club"
    DOMESTIC = "domestic"
    FRANCHISE = "franchise"
    INTERNATIONAL = "international"

@dataclass
class MatchPriorityInput:
    match_id: str
    viewer_count: int
    phase: MatchPhase
    importance: MatchImportance

def calculate_priority(input: MatchPriorityInput) -> float:
    """
    Calculate match priority score for scheduling.
    
    Returns: float - Priority score (higher = more important)
    
    Formula: viewer_count × phase_weight × importance_weight
    
    Phase weights:
        - super_over: 4.0
        - final_over: 3.0
        - death: 2.5
        - powerplay: 2.0
        - middle: 2.0
        - start: 1.0
        - toss: 0.5
    
    Importance weights:
        - international: 3.0
        - franchise: 2.5
        - domestic: 2.0
        - club: 1.0
    """
```

---

## Configuration Schema

### ScraperSettings (updated)

```python
from pydantic import BaseSettings

class ScraperSettings(BaseSettings):
    # Polling configuration
    polling_interval_seconds: float = 1.0  # Changed from 2.5
    scorecard_polling_interval_seconds: float = 10.0  # New
    
    # Cache configuration
    cache_live_ttl: int = 5  # Changed from 15
    cache_scorecard_ttl: int = 8  # New
    
    # Backoff configuration
    backoff_base_seconds: float = 1.0
    backoff_max_seconds: float = 30.0
    backoff_factor: float = 2.0
    backoff_jitter_seconds: float = 0.2
    
    # Concurrency
    concurrency_cap: int = 10
    max_matches_per_worker: int = 5
    
    # Metrics
    metrics_enabled: bool = True
    metrics_port: int = 9090
    
    class Config:
        env_prefix = "SCRAPER_"
```

---

## Metrics Endpoints

### Prometheus Metrics (port 9090)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `update_latency_seconds` | Histogram | `match_id` | Time from sV3 response to backend push |
| `missed_balls_total` | Counter | `match_id` | Count of detected ball gaps |
| `rate_limit_events_total` | Counter | `source` | HTTP 429 responses received |
| `active_matches_count` | Gauge | - | Currently polling matches |
| `scorecard_staleness_seconds` | Gauge | `match_id` | Time since last sC4 update |
| `priority_score` | Gauge | `match_id` | Current priority score |

**Endpoint**: `GET /metrics`

---

## Error Handling

### Rate Limit Response

When HTTP 429 is received:

```python
@dataclass
class RateLimitEvent:
    match_id: str
    source: str  # "crex_sv3" or "crex_sc4"
    timestamp: datetime
    retry_after_seconds: float  # From response header or calculated
    attempt: int  # Current backoff attempt number

# Backoff calculation:
# delay = min(base * (factor ** attempt) + random.uniform(-jitter, jitter), max_delay)
```

### Gap Detection Alert

When ball gap is detected:

```python
@dataclass
class GapDetectionAlert:
    match_id: str
    expected_ball: float
    actual_ball: float
    gap_size: int  # Number of balls missed
    timestamp: datetime
    severity: str  # "warning" (1 ball) or "error" (2+ balls)
```

---

## Internal Service Communication

### Scraper → Backend Push

The scraper continues to use the existing `cricket_data_service.py` to push updates to the backend. The only change is **when** it pushes (immediately on intercept vs. waiting for poll cycle).

**Existing Endpoint** (no changes):
```
POST /api/v1/matches/{match_id}/score
Content-Type: application/json

{
  "score": { ... ScoreSnapshot ... },
  "timestamp": "2025-11-28T12:34:56.789Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "received": true },
  "timestamp": "2025-11-28T12:34:56.800Z"
}
```
