# Fast Updates - Quick Start Guide

**Feature**: 007-fast-updates  
**Date**: 2025-11-28  
**Estimated Time**: 30 minutes to implement Phase 1

## Problem Summary

Live cricket updates are slow and missing balls:
- Ball-by-ball skips from 9.3 → 9.6 (missing 9.4, 9.5)
- Score updates take 5-17+ seconds instead of < 3 seconds
- Scorecard data (batting/bowling) stale by 30+ seconds

## Root Causes

| Issue | Current Value | Target | File |
|-------|--------------|--------|------|
| Polling interval | 2.5 seconds | 1.0 second | `config.py:75` |
| Cache TTL | 15 seconds | 5 seconds | `config.py:120` |
| sV3 push | Wait for poll cycle | Immediate on intercept | `crex_adapter.py:88-92` |
| sC4 (scorecard) | Tied to scrape cycle | Dedicated loop (10s) | New code |

## Prerequisites

- Python 3.9+ installed
- Redis running (`docker-compose -f docker-compose.redis.yml up -d`)
- Access to scraper codebase

## Phase 1: Quick Wins (5 minutes)

### Step 1: Reduce Polling Interval

```bash
# File: apps/scraper/crex_scraper_python/src/config.py
# Line 75: Change polling_interval_seconds
```

```python
# Before
polling_interval_seconds: float = 2.5

# After
polling_interval_seconds: float = 1.0
```

### Step 2: Reduce Cache TTL

```bash
# File: apps/scraper/crex_scraper_python/src/config.py
# Line 120: Change cache_live_ttl
```

```python
# Before
cache_live_ttl: int = 15

# After
cache_live_ttl: int = 5
```

### Step 3: Add Environment Variable Overrides

```bash
# File: apps/scraper/crex_scraper_python/src/config.py
# Add to ScraperSettings class:
```

```python
class Config:
    env_prefix = "SCRAPER_"
    # Enables: SCRAPER_POLLING_INTERVAL_SECONDS=1.0
    # Enables: SCRAPER_CACHE_LIVE_TTL=5
```

## Phase 2: Immediate Push (15 minutes)

### Step 4: Add Push Callback to Adapter

```bash
# File: apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py
```

```python
# Add callback parameter to __init__
def __init__(
    self,
    browser_pool: AsyncBrowserPool,
    on_update: Optional[Callable[[str, dict], Awaitable[None]]] = None
):
    self._on_update = on_update
    # ... existing code ...

# In _setup_network_interception(), after capturing sV3:
async def _on_response(response: Response) -> None:
    if "sV3" in response.url:
        data = await response.json()
        self._sv3_data = data
        
        # NEW: Immediate push
        if self._on_update:
            await self._on_update(self._match_id, data)
```

### Step 5: Remove 2-Second Sleep

```bash
# File: apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py
# Lines 88-92: Remove the asyncio.sleep(2)
```

```python
# Before
await asyncio.sleep(2)  # Wait for additional data

# After
# Removed - push immediately, don't wait
```

## Phase 3: Dedicated Scorecard Loop (10 minutes)

### Step 6: Add Scorecard Polling Task

```bash
# File: apps/scraper/crex_scraper_python/src/crex_scraper.py
```

```python
async def _scorecard_poll_loop(self, match_id: str) -> None:
    """Dedicated loop for scorecard (sC4) updates."""
    interval = self.settings.scorecard_polling_interval_seconds  # 10s
    
    while self._running and match_id in self._active_matches:
        try:
            scorecard = await self._adapter.fetch_scorecard(match_id)
            await self._cache.set(
                f"live:{match_id}:scorecard",
                scorecard,
                ttl=self.settings.cache_scorecard_ttl
            )
        except Exception as e:
            logger.warning(f"Scorecard fetch failed for {match_id}: {e}")
        
        await asyncio.sleep(interval)
```

## Validation

### Test Locally

```powershell
cd apps/scraper/crex_scraper_python
python -m pytest tests/ -v
docker-compose up scraper
# Open live match and verify ball sequence
```

### Success Criteria

- [ ] Ball sequence has no gaps (check logs for `ball_number` continuity)
- [ ] Score updates in < 2 seconds (check `update_latency_seconds` metric)
- [ ] Scorecard updates in < 10 seconds

## Key Files

| File | Purpose |
|------|---------|
| `apps/scraper/crex_scraper_python/src/config.py` | Settings |
| `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py` | sV3/sC4 interception |
| `apps/scraper/crex_scraper_python/src/crex_scraper.py` | Main scraper service |
| `apps/scraper/crex_scraper_python/src/services/cricket_data_service.py` | Push to backend |

## Metrics to Watch

After deployment, monitor these in Grafana:

```promql
# Update latency (p95 should be < 3s)
histogram_quantile(0.95, rate(update_latency_seconds_bucket[5m]))

# Missed balls (should be 0)
increase(missed_balls_total[1h])

# Rate limiting (should be rare)
increase(rate_limit_events_total[1h])

# Scraper health
up{job="scraper"}
```

## Rollback

If issues arise, revert to conservative settings:

```bash
# Environment variables (no code change needed)
export SCRAPER_POLLING_INTERVAL_SECONDS=2.5
export SCRAPER_CACHE_LIVE_TTL=15
docker-compose restart scraper
```

## Next Steps

After Phase 1-3 complete:
1. Add sequence tracking (Phase 4 in tasks.md)
2. Add observability metrics (Phase 5 in tasks.md)
3. Create Grafana dashboard
4. Run load tests with 100 concurrent matches
