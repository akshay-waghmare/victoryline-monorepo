# Implementation Plan: High-Reliability Scraper Optimization

**Branch**: `006-scraper-optimization` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-scraper-optimization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Redesign the Python scraper service to eliminate uncontrolled process growth (PID leaks), enforce resource caps, provide caching for continuity and performance, expose comprehensive operational metrics, support multi-domain extensibility, and implement graceful degradation with automated recovery. Primary technical approach: migrate from sync Playwright + threads to `async_playwright` + `asyncio` with pooled browser contexts, introduce priority task scheduler with backpressure, integrate Redis caching layer, and add Prometheus-compatible metrics endpoint with structured health grading.

## Technical Context

**Language/Version**: Python 3.9+ (current scraper codebase)  
**Primary Dependencies**: Flask 2.2.2, Playwright 1.40.0 (sync → async migration), requests 2.31.0, redis-py (async), prometheus_client, backoff/tenacity (retry policies)  
**Storage**: Redis (ephemeral cache for snapshots, freshness, metrics); MySQL (authoritative match data persistence via Backend API); no direct scraper DB writes  
**Testing**: pytest (existing), pytest-asyncio (new for async tests), pytest-playwright, faker/factory_boy (fixtures)  
**Target Platform**: Docker container (Linux), deployed via docker-compose.prod.yml with `pids_limit: 512`  
**Project Type**: Backend service (Flask REST API); monorepo architecture (scraper communicates with Backend API only)  
**Performance Goals**: 
  - Freshness: median <30s, p95 <60s, no match >120s
  - Scrape latency: avg <3s, worst <15s per match
  - Concurrency: sustain 40 simultaneous tasks without degradation
  - Cache hit rate: ≥85% for live match snapshot requests
  - Metrics lag: <5s between internal state and `/metrics` exposure  
**Constraints**: 
  - Must not exceed `pids_limit: 512` (Docker)
  - Browser recycle every 6h or 10k tasks (whichever first)
  - No unbounded task queue growth
  - O(1) cache operations (non-blocking scheduler)
  - Zero data loss during recycling (preserve freshness timestamps)  
**Scale/Scope**: 
  - ~10-50 concurrent live matches during peak
  - ~200-500 scrape requests/min peak load
  - Expand to 2-5 domains within 6 months (multi-site readiness)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Real-Time Data Accuracy ✅ PASS
- **Requirement**: Live match data accurate within 5 seconds of actual events.
- **Compliance**: This feature IMPROVES accuracy via:
  - Freshness targets: median <30s, p95 <60s (better than existing 300s threshold)
  - Automated stall detection and recovery
  - Health grading surfaces degradation before critical failure
  - No changes to core scraping logic that could introduce accuracy regressions

### Principle II: Monorepo Architecture Standards ✅ PASS
- **Requirement**: Three independent services (Frontend, Backend, Scraper) communicate via REST APIs only.
- **Compliance**: 
  - Changes confined to Scraper service only
  - Scraper continues exposing Flask REST API for Backend consumption
  - No direct database access from Scraper (Backend owns MySQL writes)
  - Multi-domain adapters remain internal to Scraper (not exposed as separate service)
  - No new services introduced

### Principle III: REST API Design Standards ✅ PASS
- **Requirement**: Consistent REST conventions, standard status codes, JSON response format.
- **Compliance**:
  - Existing scraper API endpoints unchanged (`/health`, `/matches`, etc.)
  - New `/metrics` endpoint follows Prometheus text format (industry standard for metrics)
  - New `/status` endpoint returns JSON with success/data/error/timestamp structure
  - No breaking changes to existing contracts

### Principle IV: Testing Requirements ⚠️ PARTIAL (Addressed in Phase 1)
- **Requirement**: >75% code coverage, unit + integration tests, pytest.
- **Current Gap**: Async migration requires new test patterns (pytest-asyncio).
- **Mitigation Plan**:
  - Phase 1: Add async test fixtures and helpers
  - Resource leak test: run 200 scrape cycles, assert stable PID count
  - Integration test: simulate multi-match load, verify freshness SLA
  - Contract test: validate `/metrics` Prometheus format, `/status` schema
  - Target coverage: maintain >75% after migration

### Principle V: Performance Standards for Live Updates ✅ PASS (IMPROVED)
- **Requirement**: Scrape every 60s, async/parallel scraping (max 10 concurrent), fail fast (10s timeout).
- **Compliance**:
  - IMPROVES concurrency limit from 10 → 40 (with backpressure enforcement)
  - IMPROVES fail-fast with 15s navigation timeout + 45s total scrape timeout
  - Adds priority scheduling (live > imminent > completed)
  - Maintains 60s scrape interval for live matches (configurable per priority)
  - Async migration IMPROVES efficiency (cooperative I/O vs blocking threads)

### Principle VI: Frontend UI/UX Standards ✅ N/A
- **Requirement**: Accessibility, responsive design, component architecture.
- **Compliance**: Not applicable (no frontend changes in this feature)

### Summary: ✅ CONSTITUTIONAL (Partial test gap addressed in Phase 1)
All principles satisfied or not applicable. Testing principle gap will be resolved during Phase 1 design (test strategy document).

## Project Structure

### Documentation (this feature)

```text
specs/006-scraper-optimization/
├── plan.md                     # This file (implementation plan)
├── spec.md                     # Feature specification (tech-agnostic requirements)
├── checklists/
│   └── requirements.md         # Spec quality checklist
├── research.md                 # Phase 0: Technology evaluation & patterns (TO BE GENERATED)
├── data-model.md               # Phase 1: Entities, cache schema, state machines (TO BE GENERATED)
├── quickstart.md               # Phase 1: Local dev setup, testing guide (TO BE GENERATED)
└── contracts/                  # Phase 1: API schemas for /metrics, /status (TO BE GENERATED)
    ├── metrics-endpoint.yaml
    └── status-endpoint.yaml
```

### Source Code (Existing + New Modules)

```text
apps/scraper/                          # Existing scraper service
├── crex_scraper_python/               # Main package (existing)
│   ├── src/
│   │   ├── config.py                  # [MODIFY] Add new config values
│   │   ├── app.py                     # [MODIFY] Add /metrics, /status endpoints
│   │   ├── crex_scraper.py            # [REFACTOR] Migrate to async
│   │   ├── browser_pool.py            # [NEW] AsyncBrowserPool + ContextPool
│   │   ├── scheduler.py               # [NEW] AsyncScheduler with priority queue
│   │   ├── cache.py                   # [NEW] ScrapeCache (Redis integration)
│   │   ├── metrics.py                 # [NEW] Prometheus metrics collector
│   │   ├── health.py                  # [NEW] HealthGrader + watchdog
│   │   ├── adapters/                  # [NEW] Multi-domain source adapters
│   │   │   ├── base.py                # SourceAdapter interface
│   │   │   ├── crex_adapter.py        # Current domain (Crex) implementation
│   │   │   └── registry.py            # Adapter registry + precedence rules
│   │   ├── models/                    # [NEW] Dataclasses for entities
│   │   │   ├── match_record.py        # Match Monitoring Record
│   │   │   ├── task.py                # Task Record (ScrapeRequest)
│   │   │   ├── snapshot.py            # Cached Snapshot
│   │   │   └── health_summary.py      # Health Summary + Audit Entry
│   │   └── utils/
│   │       ├── retry.py               # [NEW] Backoff retry decorator
│   │       └── watchdog.py            # [NEW] Orphan PID cleanup
│   ├── tests/                         # [EXPAND] Add async tests
│   │   ├── unit/
│   │   │   ├── test_browser_pool.py   # [NEW]
│   │   │   ├── test_scheduler.py      # [NEW]
│   │   │   ├── test_cache.py          # [NEW]
│   │   │   └── test_adapters.py       # [NEW]
│   │   ├── integration/
│   │   │   ├── test_resource_leak.py  # [NEW] 200-cycle PID stability test
│   │   │   ├── test_freshness_sla.py  # [NEW] Simulate load, verify SLA
│   │   │   └── test_recovery.py       # [NEW] Induce stall, verify watchdog
│   │   └── contract/
│   │       ├── test_metrics_format.py # [NEW] Validate Prometheus format
│   │       └── test_status_schema.py  # [NEW] Validate JSON schema
│   ├── requirements.txt               # [MODIFY] Add redis, prometheus_client, backoff
│   ├── Dockerfile                     # [MODIFY] Async entrypoint
│   └── docker-compose.prod.yml        # [MODIFY] Add pids_limit: 512
├── monitoring/                        # [EXPAND] Prometheus/Grafana configs
│   ├── prometheus.yml                 # [MODIFY] Add scraper /metrics target
│   └── dashboards/
│       └── scraper-health.json        # [NEW] Grafana dashboard for freshness, PIDs, queue
└── specs/                             # [EXISTING] Architecture & monitoring docs
    ├── ARCHITECTURE.md                # [UPDATE] Document async migration
    └── MONITORING_GUIDE.md            # [UPDATE] Add new metrics & alerts
```

**Structure Decision**: Monorepo web application pattern (existing). All changes confined to `apps/scraper/` service. No new top-level services or packages. New modules organized by concern: pooling (`browser_pool.py`), scheduling (`scheduler.py`), caching (`cache.py`), metrics (`metrics.py`), health (`health.py`), adapters (`adapters/`). Tests mirror source structure. Documentation updates in-place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No constitutional violations.** All requirements satisfied within existing architecture. Testing principle partially satisfied; gap addressed in Phase 1 test strategy.

| Complexity Item | Justification | Mitigation |
|-----------------|---------------|------------|
| Async migration (sync → async Playwright) | Required to eliminate thread-based concurrency causing PID leaks; async enables cooperative I/O for 40+ concurrent tasks without process overhead | Incremental migration: keep sync fallback wrappers initially; comprehensive async test suite; rollback plan if >20% performance regression |
| Redis dependency | Required for O(1) cache operations (FR-034); in-memory insufficient for multi-container scaling (future); negative caching prevents endpoint hammering | Redis optional degradation: scraper functional without cache (slower freshness); document Redis setup in quickstart.md; local dev uses Redis in docker-compose |
| Multi-domain adapters | Required for future multi-site expansion (FR-026); prevents vendor lock-in; supports redundancy/failover | Keep adapters simple (no complex crawling framework); single active domain initially; registry pattern allows A/B testing new sources |

## Match DOM Coverage (Phase 2 Preparation)

The async migration MUST preserve all existing per-match data extraction semantics. The following selector inventory (HTML/CSS) enumerates required DOM elements currently scraped in synchronous implementation (sources: `crex_match_data_scraper.py`, `asd.py`). Tests will ensure presence & parsing before/after async refactor.

### Selector Inventory
- Odds Toggle Button: `.odds-view-btn .view:nth-child(2)`
- Result Box Spans: `.result-box span`
- Current Run Rate: `.team-run-rate .data`
- Final Result Banner: `.final-result.m-none`
- Team Blocks: `.team-content`
  - Team Name: `.team-content .team-name`
  - Team Runs (score): `.team-content .runs span:nth-child(1)`
  - Team Overs: `.team-content .runs span:nth-child(2)`
- Over Slider Container: `div#slideOver .overs-slide`
  - Over Number: `div#slideOver .overs-slide span`
  - Over Balls: `div#slideOver .overs-slide .over-ball`
  - Over Total: `div#slideOver .overs-slide .total`
- Fav Odds Blocks: `.fav-odd .d-flex`
  - Fav Team Name: `.fav-odd .d-flex .team-name span`
  - Odds Values: `.fav-odd .d-flex .odd div`
- ESPN Team Name Elements: `span.ds-text-title-xs.ds-font-bold.ds-capitalize`
- ESPN Player Section Container: `div.ds-w-full.ds-bg-fill-content-prime.ds-overflow-hidden.ds-rounded-xl.ds-border.ds-border-line.ds-mb-4`
- Venue Link: `a[href*="cricket-grounds"]`
- Over Details Panel: `div.ds-px-4.ds-pb-3 p`
- Live Forecast Spans: `div.ds-px-4.ds-pb-3 span`
- Win Probability Spans: `div.ds-text-tight-s.ds-font-bold.ds-ml-1`

### Coverage Strategy
1. Introduce parser module `dom_match_extract.py` with `REQUIRED_SELECTORS` list and helper `extract_match_dom_fields(html)`.
2. Unit test (`test_match_dom_extraction.py`) builds synthetic HTML fixture containing all selectors; asserts:
   - No missing selectors (`get_missing_selectors(...) == []`).
   - Parsed structure includes keys: `teams`, `overs`, `odds`, `result`, `run_rate`, `venue`.
   - Each team has `name`, `runs`, `overs` non-empty.
3. Add second test with one intentionally removed selector to verify failure path (missing reported).
4. Async refactor reuses parser (decoupled from Playwright) by passing `page.content()` HTML.

### Risks & Mitigations
- Risk: Selector changes on source site → false negatives. Mitigation: Provide mapping layer and allow configurable alias list.
- Risk: nth-child selectors fragile. Mitigation: Fall back to positional extraction when direct CSS fails.
- Risk: Mixed domain pages (multi-site) diverge. Mitigation: Domain-specific selector profiles.

### Success Condition
All selectors accounted and tests green before beginning asynchronous Playwright refactor of per-match scraping.
