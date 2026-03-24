# Implementation Plan: Decoupled Player Stats Crawler

**Branch**: `011-player-stats-crawler` | **Date**: 2026-03-24 | **Spec**: `specs/011-player-stats-crawler/spec.md`  
**Input**: Feature specification and research from `specs/011-player-stats-crawler/`

## Summary

Deliver a **separate** player stats crawler for live and upcoming matches that reuses VictoryLine's current canonical match catalog but does **not** participate in the current fast-update path. The implementation introduces a dedicated player-stats worker in the Python scraper app, new backend persistence and read APIs for match-scoped player snapshots, and an optional ESPN enrichment adapter that stays disabled by default and runs only asynchronously or on demand. The core design principle is failure isolation: player stats must degrade independently and must never slow or destabilize the existing live performance pipeline.

## Technical Context

**Language/Version**: Python 3.x + Flask/Playwright stack (scraper), Java 8/11 + Spring Boot 2.x (backend), TypeScript/Angular consumer support optional later  
**Primary Dependencies**: existing Playwright browser pool patterns, existing scraper config/health/metrics infrastructure, Spring MVC + Spring Data JPA, Redis cache already used by scraper  
**Storage**: MySQL-backed backend persistence for match-scoped player snapshots and enrichment metadata; Redis for worker leases, queue state, negative cache, and freshness aids  
**Testing**: pytest for worker/parser/safety tests, JUnit/Spring tests for backend persistence and API contracts  
**Target Platform**: monorepo multi-service deployment with backend, primary scraper, and a new player-stats worker  
**Project Type**: cross-service data ingestion and read-model feature  
**Performance Goals**:
- preserve current live fast-update latency and health targets
- live player stats visible within ~20 seconds of a scorecard change
- upcoming player snapshots refreshed on a lower cadence and only inside configured windows
- ESPN enrichment fully asynchronous and non-blocking  
**Constraints**:
- must be feature-flagged
- must use separate scheduling/rate limiting
- must not reuse or alter the live fast-update queue/cadence
- ESPN cannot be primary live/upcoming source
- current backend remains system of record for canonical matches  
**Scale/Scope**: daily live + upcoming cricket fixture volumes with low default concurrency and gradual rollout

## Constitution Check

*Pre-Implementation Gate (PASS)*

- **I. Real-Time Data Accuracy**: PASS — the design preserves current real-time live-score behavior and introduces a slower, isolated player-stats path rather than adding work to the fast loop.
- **II. Monorepo Architecture Standards**: PASS — scraper continues to gather upstream data, backend owns persistence/API delivery, and consumers read via backend APIs.
- **III. REST API Design Standards**: PASS — new sync and read endpoints extend `CricketDataController` or adjacent services without bypassing current service boundaries.
- **IV. Testing Requirements**: PASS — plan includes parser, worker-isolation, load-shedding, repository, and API tests.
- **V. Performance Standards for Live Updates**: PASS — player stats run on independent cadence and must pause before live health degrades.
- **VI. Frontend UI/UX Standards**: PASS — frontend changes are optional here, but the backend contract includes freshness/provenance fields needed for safe future UI use.

*Post-Design Guardrails*

- The player stats worker must remain disabled by default until baseline comparison proves no live-path regression.
- The worker must be able to stop independently by deployment or flag change.
- ESPN enrichment must remain off in the first production rollout.

## Architectural Decisions

### 1. Separate worker topology

The player stats crawler will be implemented as a **dedicated worker entrypoint** under the scraper app, with its own event loop, queue, browser-pool budget, and health metrics. The recommended production deployment is a separate container/service such as `scraper-player-stats`.

This is the primary mechanism that enforces the "must not slow live" requirement.

### 2. Backend remains the canonical candidate source

The new worker should not rediscover live/upcoming matches independently. It should read candidates from the backend's existing canonical catalog:

- `GET /cricket-data/live-matches`
- `GET /cricket-data/upcoming-matches`

This keeps player-stat work aligned with current `LiveMatch`, `externalMatchKey`, and lifecycle logic.

### 3. CREX is the primary extractor; ESPN is enrichment only

CREX remains the authoritative source for:

- live scorecard player rows
- upcoming squads / lineup context
- match-scoped player references tied to current match identity

ESPN is introduced as a separate enrichment adapter for optional metadata or recent-form fields and is never used as the first source of truth for live or upcoming match presence.

### 4. Match-scoped identity first, canonical identity second

The first version should store reliable match-scoped player keys even when cross-provider identity is uncertain. Canonical player linking should be additive and confidence-scored rather than blocking base snapshot persistence.

### 5. Safety-first load shedding

When the environment is under pressure, the worker should degrade in this order:

1. pause ESPN enrichment jobs
2. defer upcoming jobs
3. slow live player-stat cadence
4. pause the player-stats worker entirely

The worker must never borrow capacity from the fast-update path.

### 6. Observability is part of MVP

Because the main risk is unintended interference, rollout requires explicit metrics, pause reasons, freshness stats, and before/after comparisons against the live path.

## Project Structure

### Documentation (this feature)

```text
specs/011-player-stats-crawler/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
├── data-model.md
└── quickstart.md
```

### Proposed Source Code Shape

```text
apps/
├── scraper/
│   └── crex_scraper_python/
│       ├── src/
│       │   ├── app.py
│       │   ├── config.py
│       │   ├── cricket_data_service.py
│       │   ├── player_stats_app.py                    [NEW]
│       │   ├── player_stats_service.py                [NEW]
│       │   ├── player_stats_scheduler.py              [NEW]
│       │   ├── player_stats_models.py                 [NEW]
│       │   ├── player_stats_health.py                 [NEW]
│       │   ├── player_stats_cache.py                  [NEW or cache extension]
│       │   ├── adapters/
│       │   │   └── player_stats/
│       │   │       ├── base.py                        [NEW]
│       │   │       ├── crex_player_stats_adapter.py   [NEW]
│       │   │       └── espn_enrichment_adapter.py     [NEW]
│       │   └── parsers/
│       │       ├── crex_schedule_parser.py
│       │       ├── crex_player_scorecard_parser.py    [NEW]
│       │       └── crex_upcoming_squad_parser.py      [NEW]
│       └── tests/
│           ├── unit/
│           └── integration/
├── backend/
│   └── spring-security-jwt/
│       └── src/main/java/com/devglan/
│           ├── controller/
│           │   └── CricketDataController.java
│           ├── dao/
│           │   ├── PlayerStatsSyncDTO.java            [NEW]
│           │   ├── PlayerStatsResponseDTO.java        [NEW]
│           │   └── PlayerEnrichmentRequestDTO.java    [NEW]
│           ├── model/
│           │   ├── PlayerMatchStats.java              [NEW]
│           │   ├── PlayerEnrichmentSnapshot.java      [NEW]
│           │   └── PlayerIdentityLink.java            [NEW]
│           ├── repository/
│           │   ├── PlayerMatchStatsRepository.java    [NEW]
│           │   └── PlayerEnrichmentRepository.java    [NEW]
│           └── service/
│               ├── PlayerStatsService.java            [NEW]
│               └── impl/PlayerStatsServiceImpl.java   [NEW]
```

**Structure Decision**: Add a new worker path under the existing scraper app rather than modifying `CrexScraperService` or `FastUpdateManager` to perform player-stat crawling. That keeps the blast radius small and makes deployment isolation explicit.

## Data and API Strategy

### Worker candidate intake

The worker periodically loads:

- **live candidates** from `GET /cricket-data/live-matches`
- **upcoming candidates** from `GET /cricket-data/upcoming-matches`
- **primary scraper health** from a configurable status URL such as `PRIMARY_SCRAPER_STATUS_URL=http://127.0.0.1:5000/status`

Recommended default cadence:

- live candidate refresh: every **15 seconds**
- upcoming candidate refresh: every **2 minutes**
- primary scraper health check: every **30 seconds**

### Crawl cadence

Recommended safe defaults for initial rollout:

- live player-stat crawl: every **20 seconds**
- upcoming crawl inside window: every **10 minutes**
- upcoming crawl when lineup/toss is near or detected: every **2 minutes**
- ESPN enrichment: on-demand only, no background sweep in v1

### Backend contracts

Recommended new backend endpoints:

- `POST /cricket-data/player-stats/sync`  
  idempotent upsert of one match snapshot or batch of snapshots
- `GET /cricket-data/player-stats/match/{externalMatchKey}`  
  latest match-scoped player stats, freshness, coverage, and provenance
- `POST /cricket-data/player-stats/enrich`  
  enqueue async enrichment for a match/player when the ESPN flag is enabled
- `GET /cricket-data/player-stats/status/{externalMatchKey}`  
  optional convenience endpoint for freshness / enrichment state

### Merge rules

1. CREX match-scoped live/upcoming fields win for match-specific facts.
2. ESPN can fill optional profile or recent-form fields only.
3. Low-confidence ESPN matches do not overwrite anything.
4. All merged fields keep source metadata.

### Storage strategy

Persist latest match snapshots in backend MySQL and use Redis for:

- job leases
- dedupe hashes
- negative-cache entries
- freshness shortcuts
- queued enrichment requests

This avoids burdening the fast-update Redis keys or existing live snapshot namespaces.

## Safety and Rollout Strategy

### Feature flags

Planned config keys:

- `ENABLE_PLAYER_STATS_CRAWLER=false`
- `ENABLE_PLAYER_STATS_LIVE=true`
- `ENABLE_PLAYER_STATS_UPCOMING=true`
- `ENABLE_PLAYER_STATS_ESPN_ENRICHMENT=false`
- `PLAYER_STATS_PRIMARY_SCRAPER_STATUS_URL=http://127.0.0.1:5000/status`
- `PLAYER_STATS_LIVE_INTERVAL_SECONDS=20`
- `PLAYER_STATS_UPCOMING_INTERVAL_SECONDS=600`
- `PLAYER_STATS_UPCOMING_NEAR_START_INTERVAL_SECONDS=120`
- `PLAYER_STATS_PREMATCH_WINDOW_HOURS=24`
- `PLAYER_STATS_MAX_CONCURRENCY=2`
- `PLAYER_STATS_RATE_LIMIT_TOKENS_PER_SEC=0.5`
- `PLAYER_STATS_RATE_LIMIT_BURST=2`
- `PLAYER_STATS_QUEUE_MAX=100`
- `PLAYER_STATS_PAUSE_ON_PRIMARY_DEGRADED=true`

### Pause / shed rules

The worker pauses or sheds work when any of these apply:

- primary scraper status is not healthy
- primary scraper PID count exceeds configured safety threshold
- worker backlog exceeds queue max
- local browser/PID budget is exceeded
- repeated `429` or source/network errors trigger exponential backoff

### Deployment recommendation

For production and staging:

1. deploy `scraper-player-stats` as a separate service/container;
2. keep ESPN enrichment off;
3. enable live player stats for a small allowlist of matches if needed;
4. enable upcoming jobs after stability is proven;
5. enable ESPN only after CREX-only capture is validated.

## Delivery Phases

## Phase 0 – Research (COMPLETE)

- Verified current live path already has fast-update and scorecard responsibilities that must remain isolated.
- Verified backend already exposes canonical live and upcoming match endpoints suitable for candidate intake.
- Confirmed current codebase already uses feature flags in `config.py`, making progressive rollout consistent with existing patterns.

## Phase 1 – Contracts, Flags, and Data Model

**Goal**: make the feature safe to introduce without touching the fast path.

1. Add feature-flag and worker-budget settings to scraper config.
2. Define job, snapshot, identity, and enrichment models.
3. Add backend DTOs/entities/repositories for player stats.
4. Define response shape for per-match player stats retrieval.

## Phase 2 – Worker Foundation and Safety Guardrails

**Goal**: stand up the separate worker and its safety controls.

1. Create a dedicated player-stats worker entrypoint.
2. Add independent scheduler, queue, and rate-limiter.
3. Add primary-scraper health polling and pause rules.
4. Add Redis-backed dedupe, leases, and negative-cache helpers.

## Phase 3 – CREX Live and Upcoming Extraction

**Goal**: collect useful base player data without ESPN.

1. Implement CREX live scorecard parsing for player stat lines.
2. Implement CREX upcoming squad/lineup parsing.
3. Schedule live and upcoming jobs on separate cadences.
4. Push snapshots idempotently to backend.

## Phase 4 – Backend Persistence and Read APIs

**Goal**: make snapshots consumable to other app layers.

1. Persist latest player snapshots and enrichment metadata.
2. Expose `GET /cricket-data/player-stats/match/{externalMatchKey}`.
3. Include freshness, coverage state, and provenance in responses.
4. Add tests for upsert, retrieval, and idempotency.

## Phase 5 – Optional ESPN Enrichment

**Goal**: add value without creating a new dependency risk.

1. Implement an ESPN enrichment adapter behind a disabled-by-default flag.
2. Add on-demand enrichment enqueue endpoint.
3. Add confidence scoring and negative caching.
4. Merge enrichment fields only into optional slots.

## Phase 6 – Observability, Soak Testing, and Rollout

**Goal**: prove the feature is operationally safe.

1. Emit player-stats-specific metrics, pause reasons, and freshness data.
2. Run worker soak tests alongside the live scraper.
3. Compare before/after live-path health and freshness.
4. Document rollout and fallback steps.

## Story-to-Implementation Mapping

| User Story | Core Implementation Focus |
|-----------|----------------------------|
| **US1** Retrieve Live Player Stats Safely | separate worker, live scorecard parser, idempotent live snapshot sync |
| **US2** Capture Upcoming Match Player Context | pre-match windowing, upcoming parser, partial coverage states |
| **US3** Trigger ESPN Enrichment Only When Needed | async enrichment queue, confidence gating, negative caching |
| **US4** Preserve Live Pipeline Stability | independent queue/rate limits, pause rules, soak validation |
| **US5** Expose Provenance and Freshness Clearly | response DTOs, source metadata, coverage/freshness fields |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Worker accidentally shares live-path resources | Live performance regression | Separate entrypoint/container, separate budgets, separate config names |
| Player snapshots become too heavy for frequent live updates | Queue buildup and stale data | Snapshot diffing, moderate cadence, live-first shedding rules |
| Upcoming squads are often unavailable | Thin data for upcoming matches | Explicit partial states and refresh windows rather than hard failure |
| ESPN enrichment produces false matches | Incorrect player metadata | Confidence thresholds, manual/on-demand trigger, negative caching |
| Operational state is invisible | Hard to prove safety | Dedicated health, metrics, queue depth, and pause-reason instrumentation |

## Definition of Done

- Player stats can be enabled independently from the existing live scraper.
- Live and upcoming candidate intake uses backend canonical match lists.
- CREX-derived live and upcoming player snapshots are persisted and readable via backend API.
- ESPN enrichment is optional, asynchronous, and off by default.
- Queueing, rate limiting, and pause behavior are independent from the live fast-update path.
- Soak and failure testing show no unacceptable live-path regression.

## Complexity Tracking

No constitution violations identified. The feature is cross-service, but the explicit separation into a dedicated worker keeps complexity localized and directly addresses the main operational risk.
