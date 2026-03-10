---

description: "Task list for implementing upcoming and completed matches across scraper, backend, and frontend"
---

# Tasks: Upcoming and Completed Matches

**Input**: Design documents from `/specs/010-upcoming-completed-matches/`
**Generated**: 2026-03-10
**Branch**: `010-upcoming-completed-matches`

**Prerequisites**: `spec.md`, `research.md`

**Tests**: Add tests where the spec requires lifecycle correctness, API filtering, and UI state validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after foundational work is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Which user story this task belongs to (`US1`..`US5`)
- Include exact file paths in each task so implementation stays anchored to the current repo structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Introduce the shared schedule/lifecycle primitives needed by all stories.

- [ ] T001 Create explicit backend lifecycle enum in `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/MatchLifecycleStatus.java` for `UPCOMING`, `LIVE`, `INNINGS_BREAK`, `COMPLETED`, `ABANDONED`, and `NO_RESULT`
- [ ] T002 Extend `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/LiveMatch.java` with explicit schedule fields (`status`, `scheduledStartTime`, `seriesName`, `matchFormat`, `resultSummary`, `lastStateUpdatedAt`, canonical external match key) and add supporting indexes
- [ ] T003 [P] Extend `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/LiveMatchRepository.java` with status-aware and time-aware query methods for upcoming, live, and completed retrieval
- [ ] T004 [P] Create schedule response DTOs in `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/ScheduledMatchDTO.java` and `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/ScheduleResponseDTO.java`
- [ ] T005 [P] Extend `apps/frontend/src/app/features/matches/models/match-card.models.ts` with schedule-specific fields (`seriesName`, `format`, `resultSummary`, `completedAt`, `scheduleState`, `countdownLabel`)
- [ ] T006 [P] Add shared schedule parsing helpers in `apps/scraper/crex_scraper_python/src/parsers/crex_schedule_parser.py` for CREX schedule/upcoming/completed card extraction

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the schedule ingestion and API foundation that every story depends on.

**⚠️ CRITICAL**: No story is complete until this phase is in place.

- [ ] T007 [P] Extend `apps/scraper/crex_scraper_python/src/discovery.py` to discover schedule-oriented CREX sources in addition to `https://crex.com/live-matches`
- [ ] T008 [P] Extend `apps/scraper/crex_scraper_python/src/cricket_data_service.py` with backend sync methods for schedule match upserts, not only live-match adds
- [ ] T009 Update `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/LiveMatchService.java` with schedule-focused contracts for upsert/reconcile, `findUpcomingMatches()`, and `findCompletedMatches()`
- [ ] T010 Implement schedule upsert and status reconciliation in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`
- [ ] T011 Add schedule read endpoints to `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` for upcoming/completed retrieval and response freshness metadata
- [ ] T012 Add frontend API methods in `apps/frontend/src/app/component/event-list.service.ts` for upcoming/completed schedule retrieval

**Checkpoint**: Schedule data can be ingested, persisted, and retrieved with explicit lifecycle state.

---

## Phase 3: User Story 1 - Browse Upcoming Fixtures (Priority: P1) 🎯 MVP

**Goal**: Populate the Upcoming tab with real CREX-backed schedule data ordered by nearest start time.

**Independent Test**: Seed or mock future schedule records and verify the Upcoming tab shows upcoming matches with local time and countdown labels, ordered nearest-first.

### Tests for User Story 1

- [ ] T013 [P] [US1] Add scraper integration coverage for upcoming extraction in `apps/scraper/crex_scraper_python/tests/integration/test_schedule_discovery.py`
- [ ] T014 [P] [US1] Add backend controller/service coverage for upcoming retrieval in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/CricketDataControllerUpcomingMatchesTest.java`
- [ ] T015 [P] [US1] Add frontend service coverage for upcoming transformation and sorting in `apps/frontend/src/app/features/matches/services/matches.service.spec.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Implement upcoming fixture extraction in `apps/scraper/crex_scraper_python/src/discovery.py` and `apps/scraper/crex_scraper_python/src/parsers/crex_schedule_parser.py` to capture teams, series, format, and scheduled start time
- [ ] T017 [US1] Persist upcoming fixtures with explicit `UPCOMING` state through `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`
- [ ] T018 [US1] Implement upcoming retrieval in `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` and DTO mapping under `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/`
- [ ] T019 [US1] Add `getUpcomingMatches()` to `apps/frontend/src/app/component/event-list.service.ts`
- [ ] T020 [US1] Update `apps/frontend/src/app/features/matches/services/matches.service.ts` to load, transform, and merge upcoming records into `MatchCardViewModel`
- [ ] T021 [US1] Update time formatting and sorting helpers in `apps/frontend/src/app/core/utils/match-utils.ts` and `apps/frontend/src/app/features/matches/models/match-status.ts` for nearest-first upcoming ordering and countdown labels
- [ ] T022 [US1] Update `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts` to populate the Upcoming tab from schedule-aware data rather than the live-only feed

**Checkpoint**: The Upcoming tab works end-to-end with real future fixtures.

---

## Phase 4: User Story 2 - Review Completed Results (Priority: P1)

**Goal**: Populate the Completed tab with recent final results and explicit terminal-state summaries.

**Independent Test**: Seed or mock recently completed matches and verify the Completed tab shows final result summaries with newest results first.

### Tests for User Story 2

- [ ] T023 [P] [US2] Add scraper integration coverage for completed schedule/result extraction in `apps/scraper/crex_scraper_python/tests/integration/test_completed_schedule_sync.py`
- [ ] T024 [P] [US2] Add backend controller/service coverage for completed retrieval in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/CricketDataControllerCompletedMatchesTest.java`
- [ ] T025 [P] [US2] Add frontend service/component coverage for completed result summaries in `apps/frontend/src/app/features/matches/services/matches.service.spec.ts` and `apps/frontend/src/app/features/matches/components/match-card/match-card.component.spec.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Extend schedule parsing in `apps/scraper/crex_scraper_python/src/parsers/crex_schedule_parser.py` to capture completed terminal states and one-line result summaries
- [ ] T027 [US2] Persist completed records and result summaries via `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`
- [ ] T028 [US2] Implement completed retrieval and newest-first ordering in `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` and `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/LiveMatchRepository.java`
- [ ] T029 [US2] Add `getCompletedMatches()` to `apps/frontend/src/app/component/event-list.service.ts`
- [ ] T030 [US2] Update `apps/frontend/src/app/features/matches/services/matches.service.ts` to transform completed records into card-ready result summaries and completion recency labels
- [ ] T031 [US2] Update `apps/frontend/src/app/core/utils/match-utils.ts` so completed cards prefer persisted result-summary text over score-derived fallback logic when available

**Checkpoint**: The Completed tab works end-to-end with recent result browsing.

---

## Phase 5: User Story 3 - Trust the Match Lifecycle (Priority: P1)

**Goal**: Ensure a single canonical record moves cleanly from upcoming -> live -> completed without duplicates.

**Independent Test**: Simulate a match lifecycle transition and verify the same canonical match moves between tabs without duplicate cards or contradictory states.

### Tests for User Story 3

- [ ] T032 [P] [US3] Add backend lifecycle reconciliation tests in `apps/backend/spring-security-jwt/src/test/java/com/devglan/service/LiveMatchServiceLifecycleTest.java`
- [ ] T033 [P] [US3] Add scraper unit coverage for canonical match reconciliation rules in `apps/scraper/crex_scraper_python/tests/unit/test_match_lifecycle_reconciliation.py`
- [ ] T034 [P] [US3] Add frontend service coverage for deduped tab assignment in `apps/frontend/src/app/features/matches/services/matches.service.spec.ts`

### Implementation for User Story 3

- [ ] T035 [US3] Introduce canonical identity matching and status transition rules in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`
- [ ] T036 [US3] Extend `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/LiveMatchRepository.java` and custom lookup logic so schedule and live discovery reconcile to one record
- [ ] T037 [US3] Update `apps/scraper/crex_scraper_python/src/discovery.py` and `apps/scraper/crex_scraper_python/src/crex_scraper.py` so completion/live transitions sync explicit lifecycle states back to the backend
- [ ] T038 [US3] Replace delete-driven UI assumptions in `apps/frontend/src/app/features/matches/services/matches.service.ts` with explicit lifecycle-state handling
- [ ] T039 [US3] Update match-status change notifications in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java` so SEO/websocket events reflect lifecycle transitions instead of treating completion as generic deletion

**Checkpoint**: Lifecycle transitions are deterministic and duplicate-free.

---

## Phase 6: User Story 4 - Scan Schedule Cards Efficiently (Priority: P2)

**Goal**: Make upcoming and completed cards scannable with schedule context, countdowns, and result summaries.

**Independent Test**: On desktop and mobile, users can identify teams, context, start/result state, and key timing information directly from the card list.

### Tests for User Story 4

- [ ] T040 [P] [US4] Add component coverage for schedule-specific match card rendering in `apps/frontend/src/app/features/matches/components/match-card/match-card.component.spec.ts`
- [ ] T041 [P] [US4] Add list-page coverage for grouped/sorted schedule rendering in `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.spec.ts`

### Implementation for User Story 4

- [ ] T042 [US4] Extend `apps/frontend/src/app/features/matches/models/match-card.models.ts` and `apps/frontend/src/app/features/matches/services/matches.service.ts` to expose series/format context, countdown labels, result summaries, and completion recency
- [ ] T043 [US4] Update `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`, `match-card.component.ts`, and `match-card.component.css` to render upcoming and completed schedule metadata cleanly
- [ ] T044 [US4] Update `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`, `matches-list.component.ts`, and `matches-list.component.css` to support contextual grouping or section labeling by date/series where data is available
- [ ] T045 [US4] Refine schedule display helpers in `apps/frontend/src/app/core/utils/match-utils.ts` to provide placeholder-safe labels for partially populated schedule records

**Checkpoint**: Upcoming and completed cards are fast to scan and resilient to partial data.

---

## Phase 7: User Story 5 - Recover Gracefully from Schedule Gaps (Priority: P2)

**Goal**: Distinguish zero-state, stale-state, and failed schedule states so users understand why a tab is empty.

**Independent Test**: Simulate successful-empty, stale, and failed schedule responses and verify the UI presents the correct explanation and retry behavior.

### Tests for User Story 5

- [ ] T046 [P] [US5] Add backend response-state coverage for schedule freshness metadata in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/CricketDataControllerScheduleStateTest.java`
- [ ] T047 [P] [US5] Add frontend service/list-page coverage for empty, stale, and failed schedule states in `apps/frontend/src/app/features/matches/services/matches.service.spec.ts` and `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.spec.ts`

### Implementation for User Story 5

- [ ] T048 [US5] Extend schedule response metadata in `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/ScheduleResponseDTO.java` and `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java` with last-updated/freshness context
- [ ] T049 [US5] Update `apps/frontend/src/app/component/event-list.service.ts` and `apps/frontend/src/app/features/matches/services/matches.service.ts` to distinguish empty data from stale/failed responses
- [ ] T050 [US5] Update `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`, `matches-list.component.ts`, and `matches-list.component.css` to show tab-specific zero states, stale/error messaging, and retry affordances
- [ ] T051 [US5] Add schedule freshness logging/monitoring hooks in `apps/scraper/crex_scraper_python/src/discovery.py` and `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`

**Checkpoint**: Users can tell the difference between no fixtures and missing data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature across the stack and capture any spec-adjacent artifacts needed for handoff.

- [ ] T052 [P] Document the finalized lifecycle/data model in `specs/010-upcoming-completed-matches/data-model.md`
- [ ] T053 [P] Add API contract examples for schedule retrieval in `specs/010-upcoming-completed-matches/contracts/`
- [ ] T054 Run scraper validation with `pytest` from `apps/scraper/crex_scraper_python`
- [ ] T055 Run backend validation with `mvn test` from `apps/backend/spring-security-jwt`
- [ ] T056 Run frontend validation with `npm run test` from `apps/frontend`
- [ ] T057 Perform manual QA for upcoming -> live -> completed transitions and record findings in `specs/010-upcoming-completed-matches/research.md` or a follow-up validation artifact in the same spec folder

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Phase 1 and blocks all user stories
- **User Stories (Phases 3-7)**: all depend on Phase 2 completion
- **Polish (Phase 8)**: depends on the desired story phases being complete

### User Story Dependencies

- **US1** depends on the shared schedule ingestion and API foundation from Phase 2
- **US2** depends on US1's schedule path but remains independently testable once completed retrieval is wired
- **US3** depends on both US1 and US2 data flows because lifecycle reconciliation spans upcoming, live, and completed states
- **US4** depends on US1 and US2 because card rendering needs schedule metadata and result summaries
- **US5** depends on US1 and US2 response handling, but can proceed before all visual polish in US4 is complete

### Parallel Opportunities

- Phase 1 tasks marked `[P]` can run in parallel across backend, frontend, and scraper
- Phase 2 tasks T007 and T008 can run in parallel while backend service/controller work starts once contracts are agreed
- Tests within each user story marked `[P]` can run in parallel before implementation
- Frontend card/list tasks in US4 can be split between component and page work once service transformations are stable

---

## Implementation Strategy

### MVP First

1. Finish Phases 1-2
2. Deliver US1 so Upcoming works end-to-end
3. Deliver US2 so Completed works end-to-end
4. Validate lifecycle correctness in US3 before broad rollout

### Incremental Delivery

1. Upcoming browseability
2. Completed browseability
3. Lifecycle correctness
4. Card/list UX refinement
5. Empty/stale/error-state clarity

### Notes

- Prefer explicit lifecycle state over implicit `isDeleted` behavior
- Preserve current live-match behavior while expanding schedule support
- Keep tasks anchored to existing files unless a new file is explicitly named above
