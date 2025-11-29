# Feature 007: Fast Updates - Changelog

## [1.2.0] - 2025-11-29

### Fixed: sV3 Data Race Condition & overs_data Empty Issue

**Problem**: 
- `overs_data`, `team_odds`, `session_odds`, and `runs_on_ball` were not appearing in pushed payloads
- Debug logs showed "Timeout waiting for sV3 response" for all matches
- Overs were being parsed correctly (`[OVERS] Set 4 overs in final_data`) but not making it to the backend

**Root Cause 1: Missing `reliability` attribute**
- `CrexAdapter.__init__()` was not calling `super().__init__()` 
- Base `SourceAdapter` class initializes `self.reliability = ReliabilityTracker()` in its constructor
- This caused `'CrexAdapter' object has no attribute 'reliability'` errors when `crex_scraper.py` tried to call `adapter.reliability.record_success()` or `record_failure()`
- These errors prevented successful scrapes from completing

**Root Cause 2: Async Handler Race Condition**
- `page.on("response", handle_response)` with an async handler creates a "fire and forget" scenario
- `page.wait_for_response()` returns as soon as it sees the HTTP response
- But the async `handle_response` callback that populates `data_store["api_data"]` runs concurrently
- The main flow continued before `api_data` was populated, resulting in empty overs data

**Solution**:
1. Added `super().__init__()` call in `CrexAdapter.__init__()` to properly initialize the reliability tracker
2. Changed sV3 waiting mechanism to use `asyncio.Event`:
   - `_setup_network_interception()` now returns an `asyncio.Event` that signals when sV3 data is fully processed
   - Main flow uses `await asyncio.wait_for(sv3_ready.wait(), timeout=8.0)` to wait for the event
   - Ensures `data_store["api_data"]` is populated before proceeding

**Files Changed**:
- `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`
  - Added `super().__init__()` call in `CrexAdapter.__init__()`
  - Modified `_setup_network_interception()` to return `asyncio.Event`
  - Added `sv3_ready.set()` in handler after processing completes
  - Changed main `fetch_match()` to await the event instead of `wait_for_response()`

**Result**:
All matches now have properly populated:
- `overs_data` with ball-by-ball breakdown
- `team_odds` with back/lay odds and favorite team
- `session_odds` with session betting data  
- `runs_on_ball` for current delivery
- `score_update` for latest ball outcome

---

## [1.1.0] - 2025-11-29

### Added: Prometheus + Grafana Monitoring Stack

**Features**:
- Added Prometheus service to `docker-compose.yml` (port 9090)
- Added Grafana service to `docker-compose.yml` (port 3000)
- Created `apps/scraper/monitoring/prometheus.yml` for scraper metrics scraping
- Created `apps/scraper/monitoring/grafana-datasources.yml` for Prometheus datasource
- Created comprehensive 19-panel Grafana dashboard at `apps/scraper/monitoring/dashboards/scraper-health.json`

**Dashboard Panels**:
- Row 1: Key Stats (Health Score, Active Tasks, Queue Depth, Success Rate)
- Row 2: Trends (Scrape Rate, Scrape Duration)
- Row 3: Failures (Failed Scrapes, Failure Rate)
- Row 4: Freshness (Match Freshness, Staleness)
- Row 5: Fast Updates (Ball Updates, Ball Gaps, Update Latency)
- Row 6: Per-Match (Priority Distribution, Per-Match Staleness, Polling Frequency)

**Fixed**: Health score metric not updating
- Added `self.metrics.health_score.set(summary.score)` in `_monitor_loop()` of `crex_scraper.py`

---

## [1.0.0] - 2025-11-28

### Initial Implementation

**Completed Tasks (22/38)**:
- Phase 1: Setup - All config fields, env variable prefix, feature flags
- Phase 2: Foundational - Reduced polling interval, cache TTL, added callbacks
- Phase 3: US1 Ball-by-Ball - BallEvent model, UpdateSequence, gap detection
- Phase 4: US2 Live Scores - ScoreSnapshot model, score parser, Redis caching
- Phase 5: US3 Scorecard (Partial) - ScorecardState model, sC4 callback
- Phase 6: US4 Resilience (Partial) - Latest-state-wins logic
- Phase 7: US5 High-Action - MatchPhase/MatchImportance enums, MatchPriority
- Phase 8: Observability - All Prometheus metrics, Grafana dashboard
- Phase 9: Testing (Partial) - 31 unit tests passing

**Key Changes**:
- Polling interval reduced from 2.5s to 1.0s (when fast updates enabled)
- Cache TTL reduced from 15s to 5s
- Immediate push of sV3 data via callbacks
- Exponential backoff with jitter for push retries
- FastUpdateManager for coordinating fast update pushes
