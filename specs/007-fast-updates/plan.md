# Implementation Plan: Fast Ball-by-Ball and Score Updates

**Branch**: `007-fast-updates` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-fast-updates/spec.md`

## Summary

Reduce live cricket update latency from 5-17+ seconds to <3 seconds (p95) by optimizing the async scraper polling interval (2.5s → 1s), implementing immediate push on API intercept, and adding dedicated scorecard polling. This eliminates ball-skipping issues (9.3 → 9.6) and ensures real-time score propagation.

## Technical Context

**Language/Version**: Python 3.9+ (Scraper), Java 8/11 (Backend Spring Boot)  
**Primary Dependencies**: Flask 2.2.2, async Playwright 1.40.0, Redis, prometheus_client, backoff  
**Storage**: Redis (caching layer), MySQL (Backend persistence via Spring Boot)  
**Testing**: pytest + pytest-asyncio (Scraper), JUnit (Backend)  
**Target Platform**: Linux Docker containers (production), Windows (development)
**Project Type**: web (monorepo with frontend, backend, scraper services)  
**Performance Goals**: <3s p95 latency, 100 concurrent live matches, <100ms internal processing  
**Constraints**: 1s minimum poll interval, 5s cache TTL, adaptive backoff on rate limits  
**Scale/Scope**: 50-100 concurrent live matches, thousands of WebSocket clients

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Real-Time Data Accuracy** | ✅ PASS | Spec targets <3s latency (exceeds 5s requirement), includes staleness indicators |
| **II. Monorepo Architecture** | ✅ PASS | Changes isolated to Scraper service, communicates via REST API to Backend |
| **III. REST API Design** | ✅ PASS | Uses existing API patterns, no new endpoints required |
| **IV. Testing Requirements** | ✅ PASS | Spec includes unit tests, integration tests, load tests for scraper |
| **V. Performance Standards** | ✅ PASS | Targets align with constitution (60s scrape → 1s poll for live matches) |
| **VI. Frontend UI/UX Standards** | ✅ N/A | Explicitly out of scope (scraper-only feature) |

**Gate Result**: ✅ PASSED - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/007-fast-updates/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (already exists)
```

### Source Code (repository root)

```text
apps/scraper/crex_scraper_python/
├── src/
│   ├── config.py              # Settings (polling_interval, cache_ttl) - MODIFY
│   ├── crex_scraper.py        # Main async scraper service - MODIFY
│   ├── app.py                 # Flask entry point
│   ├── adapters/
│   │   └── crex_adapter.py    # sV3/sC4 interception - MODIFY
│   ├── services/
│   │   └── cricket_data_service.py  # Push to backend - MODIFY
│   └── scheduler/
│       └── async_scheduler.py # Priority queue - MODIFY
├── tests/
│   ├── unit/                  # New unit tests
│   ├── integration/           # New integration tests
│   └── load/                  # New load tests
└── monitoring/
    └── dashboards/            # New Grafana dashboard
```

**Structure Decision**: Changes are isolated to `apps/scraper/crex_scraper_python/`. No new services or cross-service modifications required. This follows the monorepo architecture principle.

## Complexity Tracking

No violations requiring justification. All changes fit within existing architecture.
