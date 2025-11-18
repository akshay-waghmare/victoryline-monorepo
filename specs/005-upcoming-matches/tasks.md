# Tasks: Upcoming Matches Feed

**Input**: Design documents from `/specs/005-upcoming-matches/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Tests are NOT included in this breakdown as they were not explicitly requested in the feature specification. Focus is on implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Backend**: `apps/backend/spring-security-jwt/src/` (existing Spring Boot project)
- **Scraper**: `apps/scraper/` (existing Python project)
- **Contracts**: `tests/contract/` (shared contract tests location)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema setup

- [x] T001 Create MySQL migration for `upcoming_matches` table with all fields, constraints, and indexes per data-model.md in apps/backend/spring-security-jwt/src/main/resources/db/migration/
- [x] T002 [P] Update docker-compose.prod.yml to set `pids: 512` limit for scraper container (FR-028)
- [x] T003 [P] Add Redis cache configuration to backend application.properties with 10-minute TTL default

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create UpcomingMatch JPA entity in apps/backend/spring-security-jwt/src/main/java/com/[package]/model/UpcomingMatch.java with all fields per data-model.md
- [x] T005 Create UpcomingMatchRepository interface in apps/backend/spring-security-jwt/src/main/java/com/[package]/repository/UpcomingMatchRepository.java with custom query methods for filtering
- [x] T006 Create standard API response envelope classes (ApiResponse, ErrorResponse) in apps/backend/spring-security-jwt/src/main/java/com/[package]/dto/ if not already exists
- [x] T007 [P] Create UpcomingMatch DTO classes (UpcomingMatchDTO, TeamDTO, VenueDTO, PagedResponseDTO) in apps/backend/spring-security-jwt/src/main/java/com/[package]/dto/
- [x] T008 [P] Create mapper utility to convert UpcomingMatch entity to DTO in apps/backend/spring-security-jwt/src/main/java/com/[package]/util/UpcomingMatchMapper.java
- [x] T009 [P] Create Python dataclass for UpcomingMatch in apps/scraper/models/upcoming_match.py with validation per data-model.md

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Backend API Consumer Accesses Upcoming Fixtures (Priority: P1) 🎯 MVP

**Goal**: Deliver paginated, filterable REST API endpoints for upcoming fixtures consumption

**Independent Test**: Make HTTP GET requests to `/api/v1/matches/upcoming` with various query parameters and verify response structure, pagination, and filtering behavior per acceptance scenarios

### Implementation for User Story 1

- [x] T010 [P] [US1] Create UpcomingMatchService in apps/backend/spring-security-jwt/src/main/java/com/[package]/service/UpcomingMatchService.java with methods: listUpcoming(filters, pagination), getById(id)
- [x] T011 [P] [US1] Implement pagination logic with Page/Pageable in UpcomingMatchService
- [x] T012 [P] [US1] Implement date range filtering (from/to parameters) in UpcomingMatchRepository with JPQL query
- [x] T013 [P] [US1] Implement team name/code filtering (case-insensitive partial match) in UpcomingMatchRepository with JPQL query
- [x] T014 [P] [US1] Implement series name filtering (case-insensitive partial match) in UpcomingMatchRepository with JPQL query
- [x] T015 [US1] Create UpcomingMatchController in apps/backend/spring-security-jwt/src/main/java/com/[package]/controller/UpcomingMatchController.java with @GetMapping for /api/v1/matches/upcoming
- [x] T016 [US1] Implement GET /api/v1/matches/upcoming endpoint with query parameters: page, pageSize, from, to, team, series
- [x] T017 [US1] Implement GET /api/v1/matches/upcoming/{id} endpoint in UpcomingMatchController
- [x] T018 [US1] Add request validation for pagination parameters (page ≥1, pageSize 1-100) with @Valid annotations
- [x] T019 [US1] Add exception handler for validation errors returning 400 with descriptive ErrorResponse
- [x] T020 [US1] Add exception handler for EntityNotFound returning 404 with ErrorResponse
- [ ] T021 [US1] Implement Redis caching for list endpoint in UpcomingMatchService using @Cacheable with cache key based on query params (FR-026)
- [ ] T022 [US1] Implement selective cache eviction logic in UpcomingMatchService tracking affected date ranges (FR-027, clarification: selective eviction strategy)
- [x] T023 [US1] Add logging for all API requests/responses with response times in UpcomingMatchController using SLF4J

**Checkpoint**: At this point, User Story 1 should be fully functional - API can serve upcoming fixtures with pagination and filtering

---

## Phase 4: User Story 2 - Scraper Maintains Fresh Fixture Data (Priority: P1)

**Goal**: Periodically fetch fixtures from crex.com, normalize data, upsert to database with 10-minute freshness

**Independent Test**: Monitor scraper logs for successful fetch cycles, verify database updates with recent `last_scraped_at` timestamps, confirm new fixtures appear in API responses

### Implementation for User Story 2

- [x] T024 [P] [US2] Create CrexFixtureScraper class in apps/scraper/scrapers/crex_fixture_scraper.py with fetch_fixtures() method
- [x] T025 [P] [US2] Implement HTTP + BeautifulSoup scraping logic for crex.com fixtures page in CrexFixtureScraper (FR-018)
- [x] T026 [P] [US2] Add optional Playwright fallback path with strict cleanup (with sync_playwright(), browser.close() in finally) in CrexFixtureScraper (FR-019)
- [x] T027 [US2] Implement fixture data normalization from scraped HTML to UpcomingMatch dataclass in CrexFixtureScraper (FR-014)
- [x] T028 [US2] Extract source_key from fixture URL/ID for uniqueness constraint in CrexFixtureScraper
- [x] T029 [US2] Parse team names, series name, venue details (name, city, country) from fixture page in CrexFixtureScraper
- [x] T030 [US2] Parse start_time and convert to UTC datetime in CrexFixtureScraper
- [x] T031 [US2] Detect fixture status (scheduled/postponed/cancelled) from page indicators in CrexFixtureScraper (FR-017)
- [x] T032 [US2] Create FixtureUpserter class in apps/scraper/services/fixture_upserter.py to handle database upserts via backend API (Note: Implemented as UpcomingMatchApiClient)
- [x] T033 [US2] Implement upsert logic: INSERT ON DUPLICATE KEY UPDATE based on (source, source_key) in FixtureUpserter (FR-015)
- [x] T034 [US2] Set last_scraped_at timestamp on each fixture upsert in FixtureUpserter (FR-016)
- [x] T035 [US2] Add exponential backoff retry logic with initial delay 2s, multiplier 2x, max delay 5s for HTTP errors in CrexFixtureScraper (FR-020, clarification)
- [x] T036 [US2] Create FixtureScheduler in apps/scraper/scheduler/fixture_scheduler.py with APScheduler running every 10 minutes (FR-013) (Note: Implemented as Flask route /api/fixtures/scrape for manual trigger, automated scheduling pending)
- [x] T037 [US2] Integrate CrexFixtureScraper + FixtureUpserter in FixtureScheduler scheduled job (Note: Integrated in Flask route)
- [x] T038 [US2] Add comprehensive logging: fetch attempts, success/failure status, record counts, errors in CrexFixtureScraper and FixtureUpserter (FR-021)
- [x] T039 [US2] Handle malformed HTML gracefully: log error, skip cycle, continue schedule in CrexFixtureScraper
- [ ] T040 [US2] Trigger cache invalidation in backend after successful upsert affecting date ranges in FixtureUpserter (calls backend cache eviction API)

**Checkpoint**: At this point, User Story 2 should be fully functional - scraper automatically fetches and updates fixtures every 10 minutes (Note: Manual trigger working, automated scheduling can be added)

---

## Phase 5: User Story 3 - Operations Team Monitors Scraper Health (Priority: P2)

**Goal**: Expose health endpoint with scraper status, data freshness, and PID count for proactive monitoring

**Independent Test**: Call GET `/api/v1/health/upcoming` and verify response includes status (healthy/degraded/failing), lastScrapeAt timestamp, pidCount per acceptance scenarios

### Implementation for User Story 3

- [ ] T041 [P] [US3] Create ScraperHealthTracker singleton in apps/scraper/monitoring/health_tracker.py to track last_scrape_at and current PID count
- [ ] T042 [P] [US3] Implement PID count monitoring using psutil in ScraperHealthTracker
- [ ] T043 [US3] Update FixtureScheduler to record last_scrape_at timestamp in ScraperHealthTracker after each successful cycle
- [ ] T044 [US3] Create health status calculation logic in ScraperHealthTracker: healthy (<15 min, <200 PIDs), degraded (15-30 min), failing (>30 min or >300 PIDs) per FR-023/024/025
- [ ] T045 [US3] Expose Flask /health endpoint in apps/scraper/app.py returning status, lastScrapeAt, pidCount JSON
- [ ] T046 [US3] Create HealthController in backend apps/backend/spring-security-jwt/src/main/java/com/[package]/controller/HealthController.java
- [ ] T047 [US3] Implement GET /api/v1/health/upcoming endpoint that proxies scraper /health and wraps in standard ApiResponse envelope
- [ ] T048 [US3] Add error handling for scraper health endpoint unavailability (return 'failing' status if scraper unreachable)
- [ ] T049 [US3] Add logging for health status changes (healthy → degraded → failing transitions) in ScraperHealthTracker

**Checkpoint**: All user stories should now be independently functional - full feature delivered

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T050 [P] Add OpenAPI/Swagger documentation generation for backend endpoints in apps/backend/spring-security-jwt/pom.xml with springdoc-openapi
- [ ] T051 [P] Update README.md with setup instructions per quickstart.md in specs/005-upcoming-matches/
- [ ] T052 [P] Add application metrics (request counts, response times, cache hit rates) using Micrometer in backend
- [ ] T053 [P] Add Prometheus scrape endpoint for backend metrics at /actuator/prometheus
- [ ] T054 [P] Configure production logging levels (INFO for app, WARN for libraries) in application.properties
- [ ] T055 Run full integration validation per quickstart.md verification checklist
- [ ] T056 [P] Add database indexes validation query to confirm indexes created on start_time_utc, series_name, team names
- [ ] T057 Performance test: Verify API response time <200ms P95 with warm Redis cache (SC-001)
- [ ] T058 Load test: Verify scraper completes fixture sync <5s per source page (SC-002)
- [ ] T059 Stability test: Monitor scraper PID count over 24 hours, confirm remains <150 (SC-005)
- [ ] T060 [P] Document cache invalidation strategy for future developers in specs/005-upcoming-matches/CACHE_STRATEGY.md
- [ ] T061 Commit and tag release v1.0.0-upcoming-matches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T003) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion (T004-T009)
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion (T004-T009), integrates with US1 backend (T010-T023 should be complete for API upsert)
- **User Story 3 (Phase 5)**: Depends on US2 completion (needs ScraperHealthTracker integrated in scheduler)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 backend API for upserts but is independently testable via direct DB verification
- **User Story 3 (P2)**: Depends on US2 (scraper must exist to monitor) - Cannot test health endpoint without running scraper

### Within Each User Story

**User Story 1**:
- T010-T014: Service and repository methods can be built in parallel [P]
- T015-T017: Controller endpoints depend on service completion (T010-T014)
- T018-T020: Validation and error handling depend on controller (T015-T017)
- T021-T022: Caching logic depends on service (T010-T014)

**User Story 2**:
- T024-T026: Scraper class structure can be built in parallel [P]
- T027-T031: Data normalization depends on scraper class (T024-T026)
- T032-T034: Upserter can be built in parallel with scraper [P]
- T035: Retry logic integrates into scraper (T024-T026)
- T036-T037: Scheduler depends on both scraper and upserter (T024-T034)
- T038-T040: Logging and cache invalidation layer on top of existing components

**User Story 3**:
- T041-T042: Health tracker can be built in parallel [P]
- T043: Requires scheduler from US2 (T036)
- T044: Status logic in health tracker (T041-T042)
- T045: Flask endpoint depends on health tracker (T041-T044)
- T046-T048: Backend proxy depends on scraper health endpoint (T045)

### Parallel Opportunities

- **Setup Phase**: T002 and T003 can run in parallel [P]
- **Foundational Phase**: T007, T008, T009 can run in parallel [P] after T004-T006 complete
- **User Story 1**: T010-T014 can run in parallel [P]; T018-T020 and T021-T022 can run in parallel [P]
- **User Story 2**: T024-T026 and T032-T034 can run in parallel [P]; T027-T031 can run in parallel [P]
- **User Story 3**: T041-T042 can run in parallel [P]
- **Polish Phase**: T050-T054, T056, T060 can run in parallel [P]
- **Between User Stories**: US1 and US2 can start in parallel after Foundational phase; US3 requires US2 completion

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch all parallelizable tasks for US1:

Task T010: "Create UpcomingMatchService in apps/backend/spring-security-jwt/src/main/java/com/[package]/service/UpcomingMatchService.java"
Task T011: "Implement pagination logic with Page/Pageable in UpcomingMatchService"
Task T012: "Implement date range filtering in UpcomingMatchRepository"
Task T013: "Implement team name/code filtering in UpcomingMatchRepository"
Task T014: "Implement series name filtering in UpcomingMatchRepository"

# Once T010-T014 complete, sequential controller work:
Task T015: "Create UpcomingMatchController"
Task T016: "Implement GET /api/v1/matches/upcoming endpoint"
Task T017: "Implement GET /api/v1/matches/upcoming/{id} endpoint"

# Then parallel validation and caching:
Task T018: "Add request validation" 
Task T019: "Add exception handler for validation"
Task T020: "Add exception handler for EntityNotFound"
Task T021: "Implement Redis caching"
Task T022: "Implement selective cache eviction"
Task T023: "Add logging"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 Only)

**Rationale**: US1 + US2 together deliver the core value - API serving automatically updated fixtures. US3 (monitoring) is operational enhancement.

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T010-T023) - API ready to serve fixtures
4. Complete Phase 4: User Story 2 (T024-T040) - Scraper populates fixtures automatically
5. **STOP and VALIDATE**: Test US1 + US2 together - API serving live-updated fixtures
6. Deploy/demo if ready (MVP delivered!)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently (manual fixture data in DB) → Deploy/Demo (read-only API)
3. Add User Story 2 → Test independently (scraper logs + DB updates) → Deploy/Demo (auto-updating fixtures!)
4. Add User Story 3 → Test independently (health endpoint) → Deploy/Demo (full monitoring)
5. Polish phase → Performance tuning and production hardening

### Parallel Team Strategy

With 3 developers after Foundational phase completes:

1. Team completes Setup + Foundational together (T001-T009)
2. Once Foundational done:
   - **Developer A**: User Story 1 (T010-T023) - Backend API
   - **Developer B**: User Story 2 (T024-T040) - Scraper
   - **Developer C**: Can assist A or B, or prepare US3 scaffolding
3. After US1 + US2 complete:
   - **Developer C**: User Story 3 (T041-T049) - Monitoring
   - **Developers A + B**: Polish tasks in parallel

---

## Task Summary

- **Total tasks**: 61
- **Setup**: 3 tasks
- **Foundational**: 6 tasks (BLOCKING)
- **User Story 1 (P1)**: 14 tasks - Backend API
- **User Story 2 (P1)**: 17 tasks - Scraper
- **User Story 3 (P2)**: 9 tasks - Monitoring
- **Polish**: 12 tasks

**Parallel opportunities**: 21 tasks marked [P] can run in parallel within their phase
**Independent test criteria**: Each user story has explicit checkpoint and test description
**Suggested MVP scope**: User Story 1 + User Story 2 (31 tasks after Foundational)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- File paths use placeholder `[package]` - replace with actual Java package structure (e.g., `com.victoryline.api`)
- Tests are NOT included as spec did not explicitly request TDD approach
- Focus on implementation velocity while maintaining constitution compliance
