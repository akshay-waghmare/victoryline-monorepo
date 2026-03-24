---

description: "Task list for implementing a decoupled player stats crawler for live and upcoming matches"
---

# Tasks: Decoupled Player Stats Crawler

**Input**: Design documents from `/specs/011-player-stats-crawler/`  
**Generated**: 2026-03-24  
**Branch**: `011-player-stats-crawler`

**Prerequisites**: `spec.md`, `research.md`, `data-model.md`

**Tests**: Add pytest and Spring tests for parser correctness, snapshot upsert behavior, safety guardrails, and feature-flag behavior. Validate that the existing live pipeline remains unaffected when the worker is enabled.

**Organization**: Tasks are grouped by user story and operational dependency so the feature can be built incrementally while preserving the live fast-update path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Which user story this task belongs to (`US1`..`US5`)
- Include exact file paths so implementation stays anchored to the current repo structure

---

## Phase 1: Setup (Shared Safety Infrastructure)

**Purpose**: Introduce the flags, worker scaffolding, and backend contracts required before any crawl logic is written.

- [ ] T001 Add player-stats feature flags and worker budget settings to `apps/backend/spring-security-jwt/src/main/resources/application.properties` and `apps/scraper/crex_scraper_python/src/config.py`
- [ ] T002 Create a dedicated worker entrypoint in `apps/scraper/crex_scraper_python/src/player_stats_app.py` that does not bootstrap the existing live scraper background thread
- [ ] T003 [P] Create worker models in `apps/scraper/crex_scraper_python/src/player_stats_models.py` for jobs, snapshots, stat lines, and coverage states
- [ ] T004 [P] Create backend DTOs in `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/PlayerStatsSyncDTO.java`, `PlayerStatsResponseDTO.java`, and `PlayerEnrichmentRequestDTO.java`
- [ ] T005 [P] Create backend entities in `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/PlayerMatchStats.java`, `PlayerEnrichmentSnapshot.java`, and `PlayerIdentityLink.java`
- [ ] T006 [P] Create repositories in `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/PlayerMatchStatsRepository.java` and `PlayerEnrichmentRepository.java`
- [ ] T007 [P] Define or update deployment wiring for a separate player-stats worker in `docker-compose.yml`, `docker-compose.local.yml`, and `docker-compose.prod.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the isolated worker runtime, candidate intake, and safety guardrails that all user stories rely on.

**⚠️ CRITICAL**: No story is complete unless the worker is isolated from the live fast-update path.

- [ ] T008 [P] Implement `PlayerStatsScheduler` in `apps/scraper/crex_scraper_python/src/player_stats_scheduler.py` with its own queue, priorities, leases, and retry policy
- [ ] T009 [P] Implement player-stats cache helpers in `apps/scraper/crex_scraper_python/src/player_stats_cache.py` or extend `cache.py` with a separate namespace for queue leases, hashes, and negative-cache entries
- [ ] T010 Extend `apps/scraper/crex_scraper_python/src/cricket_data_service.py` with methods to fetch live/upcoming candidate matches and push player-stat snapshots to the backend
- [ ] T011 Extend `apps/scraper/crex_scraper_python/src/player_stats_service.py` to read candidate matches from backend endpoints instead of rediscovering them from CREX pages
- [ ] T012 Add primary-scraper health polling and pause logic in `apps/scraper/crex_scraper_python/src/player_stats_health.py` and wire it into `player_stats_service.py`
- [ ] T013 Add backend service contracts in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/PlayerStatsService.java` and `impl/PlayerStatsServiceImpl.java` for snapshot upsert, retrieval, and enrichment requests
- [ ] T014 Add controller endpoints to `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` for `/player-stats/sync`, `/player-stats/match/{externalMatchKey}`, and `/player-stats/enrich`

**Checkpoint**: The player-stats worker can run independently, can see canonical candidates, and can pause itself without affecting the live scraper.

---

## Phase 3: User Story 1 - Retrieve Live Player Stats Safely (Priority: P1) 🎯 MVP

**Goal**: Collect live player batting/bowling stats from CREX with a slower cadence and no live-path coupling.

**Independent Test**: Enable live player stats for a controlled match set, verify snapshots are stored and retrievable, and verify the current live fast-update metrics are unchanged.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add parser unit coverage in `apps/scraper/crex_scraper_python/tests/unit/test_crex_player_scorecard_parser.py`
- [ ] T016 [P] [US1] Add worker integration coverage for live scheduling and idempotent sync in `apps/scraper/crex_scraper_python/tests/integration/test_live_player_stats_worker.py`
- [ ] T017 [P] [US1] Add backend controller/service coverage for live match snapshot retrieval in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/PlayerStatsControllerLiveTest.java`

### Implementation for User Story 1

- [ ] T018 [US1] Implement a CREX live player-scorecard parser in `apps/scraper/crex_scraper_python/src/parsers/crex_player_scorecard_parser.py`
- [ ] T019 [US1] Implement a CREX live player-stats adapter in `apps/scraper/crex_scraper_python/src/adapters/player_stats/crex_player_stats_adapter.py`
- [ ] T020 [US1] Add live match job creation and 20-second cadence handling in `apps/scraper/crex_scraper_python/src/player_stats_service.py`
- [ ] T021 [US1] Add snapshot diffing / dedupe logic in `apps/scraper/crex_scraper_python/src/player_stats_cache.py` so unchanged scorecards do not cause redundant backend writes
- [ ] T022 [US1] Persist live player snapshots via `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/PlayerStatsServiceImpl.java`
- [ ] T023 [US1] Return latest live player snapshot data from `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` and `dao/PlayerStatsResponseDTO.java`

**Checkpoint**: Live player stats are available through the backend and collected independently from the fast-update manager.

---

## Phase 4: User Story 2 - Capture Upcoming Match Player Context (Priority: P1)

**Goal**: Populate partial or full player context for upcoming matches without aggressive crawling.

**Independent Test**: Crawl upcoming fixtures inside the configured pre-match window and verify `coverageState` transitions between `NOT_AVAILABLE`, `SQUAD_ONLY`, and `PLAYING_XI`.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add parser unit coverage for upcoming squads/lineups in `apps/scraper/crex_scraper_python/tests/unit/test_crex_upcoming_squad_parser.py`
- [ ] T025 [P] [US2] Add integration coverage for pre-match window scheduling in `apps/scraper/crex_scraper_python/tests/integration/test_upcoming_player_stats_worker.py`
- [ ] T026 [P] [US2] Add backend coverage for partial upcoming snapshots in `apps/backend/spring-security-jwt/src/test/java/com/devglan/service/PlayerStatsUpcomingCoverageTest.java`

### Implementation for User Story 2

- [ ] T027 [US2] Implement an upcoming squad/lineup parser in `apps/scraper/crex_scraper_python/src/parsers/crex_upcoming_squad_parser.py`
- [ ] T028 [US2] Extend `apps/scraper/crex_scraper_python/src/adapters/player_stats/crex_player_stats_adapter.py` to extract pre-match player context from CREX info/squad pages
- [ ] T029 [US2] Add pre-match window and near-start cadence rules to `apps/scraper/crex_scraper_python/src/player_stats_service.py`
- [ ] T030 [US2] Persist partial upcoming snapshots with explicit `coverageState` through `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/PlayerStatsServiceImpl.java`
- [ ] T031 [US2] Ensure backend retrieval surfaces upcoming roster states and timestamps through `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/PlayerStatsResponseDTO.java`

**Checkpoint**: Upcoming matches return partial or complete player-context snapshots without over-polling.

---

## Phase 5: User Story 3 - Trigger ESPN Enrichment Only When Needed (Priority: P2)

**Goal**: Add a secondary enrichment path that remains optional, asynchronous, and safe.

**Independent Test**: Verify zero ESPN calls when disabled and successful queued enrichment when enabled and requested.

### Tests for User Story 3

- [ ] T032 [P] [US3] Add unit coverage for ESPN identity matching and merge rules in `apps/scraper/crex_scraper_python/tests/unit/test_espn_enrichment_adapter.py`
- [ ] T033 [P] [US3] Add backend controller/service coverage for enrichment request handling in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/PlayerStatsEnrichmentControllerTest.java`
- [ ] T034 [P] [US3] Add negative-cache coverage in `apps/scraper/crex_scraper_python/tests/integration/test_espn_negative_cache.py`

### Implementation for User Story 3

- [ ] T035 [US3] Implement the ESPN adapter in `apps/scraper/crex_scraper_python/src/adapters/player_stats/espn_enrichment_adapter.py`
- [ ] T036 [US3] Add enrichment job scheduling and separate rate limits in `apps/scraper/crex_scraper_python/src/player_stats_scheduler.py`
- [ ] T037 [US3] Implement backend enqueue handling in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/PlayerStatsServiceImpl.java`
- [ ] T038 [US3] Merge enrichment fields with provenance in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/PlayerStatsServiceImpl.java` and `model/PlayerEnrichmentSnapshot.java`
- [ ] T039 [US3] Record negative-cache and confidence results in `apps/scraper/crex_scraper_python/src/player_stats_cache.py`

**Checkpoint**: ESPN remains optional and enriches only when explicitly requested and enabled.

---

## Phase 6: User Story 4 - Preserve Live Pipeline Stability (Priority: P1)

**Goal**: Prove the new worker cannot destabilize the existing live pipeline.

**Independent Test**: Simulate worker backlog, rate limits, and partial failures while monitoring the live scraper's health and latency.

### Tests for User Story 4

- [ ] T040 [P] [US4] Add unit coverage for pause and shedding rules in `apps/scraper/crex_scraper_python/tests/unit/test_player_stats_safety_guards.py`
- [ ] T041 [P] [US4] Add integration coverage for pause-on-primary-degraded behavior in `apps/scraper/crex_scraper_python/tests/integration/test_player_stats_pause_on_primary_health.py`
- [ ] T042 [P] [US4] Add a comparative validation test or script in `apps/scraper/crex_scraper_python/tests/integration/test_player_stats_no_live_regression.py`

### Implementation for User Story 4

- [ ] T043 [US4] Implement explicit pause reasons, backlog shedding, and degraded-mode cadence changes in `apps/scraper/crex_scraper_python/src/player_stats_service.py`
- [ ] T044 [US4] Expose player-stats-specific health and metrics in `apps/scraper/crex_scraper_python/src/player_stats_app.py` and `player_stats_health.py`
- [ ] T045 [US4] Ensure the worker never instantiates or mutates `apps/scraper/crex_scraper_python/src/core/fast_update_manager.py`
- [ ] T046 [US4] Add environment-specific rollout defaults so the player-stats worker is disabled by default in deployment manifests and compose files

**Checkpoint**: The feature has enforceable safeguards and measurable evidence that the live path remains isolated.

---

## Phase 7: User Story 5 - Expose Provenance and Freshness Clearly (Priority: P2)

**Goal**: Make the data trustworthy for backend consumers and future frontend consumers.

**Independent Test**: Fetch a mixed CREX + ESPN snapshot and confirm per-snapshot freshness, coverage, and provenance are present and correct.

### Tests for User Story 5

- [ ] T047 [P] [US5] Add backend response-shape coverage in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/PlayerStatsResponseMetadataTest.java`
- [ ] T048 [P] [US5] Add repository/service coverage for latest-snapshot selection in `apps/backend/spring-security-jwt/src/test/java/com/devglan/service/PlayerStatsLatestSnapshotTest.java`

### Implementation for User Story 5

- [ ] T049 [US5] Populate response freshness and provenance fields in `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/PlayerStatsResponseDTO.java`
- [ ] T050 [US5] Add canonical-match lookup and latest-snapshot selection logic in `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/PlayerMatchStatsRepository.java`
- [ ] T051 [US5] Persist identity confidence and provider provenance in `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/PlayerIdentityLink.java`

**Checkpoint**: Consumers can tell how complete the data is and where it came from.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate the end-to-end feature and capture rollout artifacts.

- [ ] T052 [P] Finalize the storage/API documentation in `specs/011-player-stats-crawler/data-model.md`
- [ ] T053 [P] Finalize the operator workflow in `specs/011-player-stats-crawler/quickstart.md`
- [ ] T054 Run scraper validation with `pytest` from `apps/scraper/crex_scraper_python`
- [ ] T055 Run backend validation with `mvn test` from `apps/backend/spring-security-jwt`
- [ ] T056 Perform a side-by-side soak comparison with the player-stats worker disabled and enabled, and record findings back into `specs/011-player-stats-crawler/research.md`
- [ ] T057 Verify rollback behavior by disabling `ENABLE_PLAYER_STATS_CRAWLER` and confirming live updates continue normally

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Phase 1 and blocks all user stories
- **US1 / US2 / US3 / US4 / US5**: all depend on Phase 2
- **Polish (Phase 8)**: depends on the selected user-story phases being complete

### User Story Dependencies

- **US1** depends on the isolated worker, backend sync endpoint, and CREX live parsing
- **US2** depends on the same worker foundation plus schedule-aware candidate intake
- **US3** depends on base snapshot persistence from US1/US2
- **US4** spans all stories because operational safety must hold across live, upcoming, and enrichment paths
- **US5** depends on snapshot persistence and enrichment merge rules

### Parallel Opportunities

- Phase 1 backend DTO/entity work can run in parallel with scraper worker scaffolding
- Parser tests and backend controller tests within each story can run in parallel before implementation
- Upcoming parsing and ESPN enrichment can progress independently once the base worker foundation exists
- Response-metadata work in US5 can run in parallel with soak testing once snapshot persistence is stable

---

## Implementation Strategy

### MVP First

1. Complete Phases 1-2
2. Deliver US1 (live player stats, safely)
3. Deliver US2 (upcoming player context)
4. Deliver US4 (guardrails and non-regression evidence)

### Incremental Delivery

1. Separate worker and safety guardrails
2. CREX live player stats
3. CREX upcoming player context
4. Backend read model and freshness metadata
5. Optional ESPN enrichment

### Notes

- Do not extend `FastUpdateManager` with player-stat responsibilities.
- Prefer match-scoped identity over risky global matching in the first iteration.
- Keep ESPN off in the first production rollout.
