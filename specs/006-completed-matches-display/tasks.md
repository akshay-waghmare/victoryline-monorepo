# Tasks: Completed Matches Display

**Feature**: 006-completed-matches-display  
**Branch**: `006-completed-matches-display`  
**Input**: Design documents from `/specs/006-completed-matches-display/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with:
- Backend: `apps/backend/spring-security-jwt/`
- Frontend: `apps/frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database setup

- [ ] T001 Verify existing Match and Series entities in `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/Match.java` and `Series.java`
- [ ] T002 Create database migration script to add index `idx_status_completion` on matches table: `CREATE INDEX idx_status_completion ON matches (status, completion_date DESC);`
- [ ] T003 [P] Configure Redis caching in `apps/backend/spring-security-jwt/src/main/resources/application.properties` with TTL 300 seconds
- [ ] T004 [P] Add Spring Boot Cache dependencies to `apps/backend/spring-security-jwt/pom.xml` (spring-boot-starter-cache, spring-boot-starter-data-redis)

**Checkpoint**: Database and caching infrastructure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create CompletedMatchDTO in `apps/backend/spring-security-jwt/src/main/java/com/devglan/dto/CompletedMatchDTO.java` with fields: matchId, teamA, teamB, scoreA, scoreB, result, seriesName, format, completionDate, venue
- [ ] T006 Add custom query method to MatchRepository in `apps/backend/spring-security-jwt/src/main/java/com/devglan/repository/MatchRepository.java`: `@Query("SELECT m FROM Match m JOIN FETCH m.series s WHERE m.status = :status ORDER BY m.completionDate DESC") List<Match> findTop20ByStatusOrderByCompletionDateDesc(@Param("status") String status, Pageable pageable);`
- [ ] T007 Create TypeScript interface CompletedMatch in `apps/frontend/src/app/models/match.model.ts` matching CompletedMatchDTO structure
- [ ] T008 Create TypeScript interface CompletedMatchesResponse in `apps/frontend/src/app/models/match.model.ts` for API response wrapper

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Completed Matches (Priority: P1) 🎯 MVP

**Goal**: Display the 20 most recently completed cricket matches with series names in the Completed sub-tab

**Independent Test**: Navigate to Matches tab → Click Completed sub-tab → Verify 20 matches displayed with series names, ordered by completion date (most recent first)

### Backend Implementation for User Story 1

- [ ] T009 [P] [US1] Implement getCompletedMatches() method in MatchService in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/MatchService.java`:
  - Call repository.findTop20ByStatusOrderByCompletionDateDesc("COMPLETED", PageRequest.of(0, 20))
  - Map Match entities to CompletedMatchDTO
  - Handle null series names with "Series information unavailable"
  - Handle null scores/results with appropriate placeholders
  - Add @Cacheable annotation with key "completed_matches:20" and TTL 300 seconds

- [ ] T010 [US1] Add GET /api/v1/matches/completed endpoint to MatchController in `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/MatchController.java`:
  - Call matchService.getCompletedMatches()
  - Return standard response format: {success: true, data: [...], error: null, timestamp: ..., count: X}
  - Add @PreAuthorize for JWT authentication
  - Handle optional query param 'limit' (default 20, max 50)
  - Add error handling with try-catch returning 500 on database errors

- [ ] T011 [US1] Add input validation for limit parameter in MatchController:
  - Validate limit is between 1 and 50
  - Return 400 Bad Request with error code "VALIDATION_ERROR" if invalid
  - Include field name in error response

### Frontend Implementation for User Story 1

- [ ] T012 [P] [US1] Add getCompletedMatches() method to MatchService in `apps/frontend/src/app/services/match.service.ts`:
  - Create HTTP GET request to `/api/v1/matches/completed?limit=20`
  - Include JWT Bearer token from auth service
  - Return Observable<CompletedMatchesResponse>
  - Handle HTTP errors with RxJS catchError

- [ ] T013 [P] [US1] Create CompletedMatchesComponent in `apps/frontend/src/app/components/matches/completed-matches.component.ts`:
  - Inject MatchService
  - Implement OnInit to call matchService.getCompletedMatches()
  - Store matches in component state
  - Implement loading state (isLoading boolean)
  - Implement error state (errorMessage string)
  - Handle empty state (<20 matches)

- [ ] T014 [P] [US1] Create CompletedMatchesComponent template in `apps/frontend/src/app/components/matches/completed-matches.component.html`:
  - Show loading skeleton while isLoading is true
  - Display match list when data loaded
  - Each match shows: teams, score, result, series name, format, date, venue
  - Use CSS Grid for responsive layout (1 column mobile, 2 columns tablet, 3 columns desktop)
  - Show error message if API fails with retry button
  - Show "No completed matches yet" if data array is empty
  - Format completion date with Angular date pipe: {{ match.completionDate | date:'medium' }}

- [ ] T015 [US1] Add CSS styling for CompletedMatchesComponent in `apps/frontend/src/app/components/matches/completed-matches.component.css`:
  - Use CSS custom properties for theming (--color-primary, --spacing-md, etc.)
  - Follow 8px grid system for spacing
  - Mobile-first responsive design with breakpoints at 768px and 1024px
  - Card-based layout for each match
  - Hover effects on cards (subtle shadow/lift)
  - Loading skeleton animation (shimmer effect)

- [ ] T016 [US1] Add accessibility features to CompletedMatchesComponent template:
  - Add role="list" to matches container
  - Add role="listitem" to each match card
  - Add aria-label to each match: "Match: {{teamA}} vs {{teamB}}, Series: {{seriesName}}, Date: {{date}}"
  - Add aria-live="polite" to matches container for dynamic updates
  - Ensure focus indicators are visible (2px solid outline)
  - Test keyboard navigation (Tab through matches)

### Backend Tests for User Story 1

- [ ] T017 [P] [US1] Write unit tests for MatchService.getCompletedMatches() in `apps/backend/spring-security-jwt/src/test/java/com/devglan/service/MatchServiceTest.java`:
  - Test with 20+ completed matches returns exactly 20
  - Test with <20 completed matches returns all available
  - Test matches are ordered by completion date DESC
  - Test null series name is replaced with placeholder
  - Test null scores are replaced with placeholder
  - Mock repository with @MockBean

- [ ] T018 [P] [US1] Write integration test for GET /api/v1/matches/completed in `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/MatchControllerTest.java`:
  - Use @SpringBootTest and @AutoConfigureMockMvc
  - Test 200 OK response with valid JWT token
  - Test 401 Unauthorized without JWT token
  - Test response structure matches OpenAPI spec
  - Test limit parameter works (custom limit like 10)
  - Test 400 Bad Request for invalid limit (0, 51, -1)
  - Use H2 in-memory database with test data

### Frontend Tests for User Story 1

- [ ] T019 [P] [US1] Write unit tests for CompletedMatchesComponent in `apps/frontend/src/app/components/matches/completed-matches.component.spec.ts`:
  - Test component renders loading state initially
  - Test component displays matches after API success
  - Test component shows error message on API failure
  - Test component shows empty state when no matches
  - Test retry button calls API again
  - Mock MatchService with jasmine.createSpyObj
  - Use Angular TestBed and ComponentFixture

- [ ] T020 [P] [US1] Write service tests for MatchService.getCompletedMatches() in `apps/frontend/src/app/services/match.service.spec.ts`:
  - Test HTTP GET request to correct endpoint
  - Test JWT token included in Authorization header
  - Test response mapping to CompletedMatch[]
  - Test error handling returns Observable error
  - Use HttpTestingController to mock HTTP calls

**Checkpoint**: User Story 1 (MVP) is fully functional - users can view 20 completed matches with series names

---

## Phase 4: User Story 2 - Navigate Between Match Tabs (Priority: P2)

**Goal**: Enable seamless navigation between the 4 sub-tabs in Matches tab, including the new Completed tab

**Independent Test**: Click through all 4 sub-tabs → Verify Completed tab retains state → Switch away and back → Verify data still displayed

### Frontend Implementation for User Story 2

- [ ] T021 [US2] Update MatchesTabComponent template in `apps/frontend/src/app/components/matches/matches-tab.component.html`:
  - Add fourth tab button/link for "Completed" sub-tab
  - Use Angular Material mat-tab-group or Bootstrap nav-tabs
  - Ensure tab selection persists with [(selectedIndex)] binding
  - Add active state styling for selected tab

- [ ] T022 [US2] Update MatchesTabComponent logic in `apps/frontend/src/app/components/matches/matches-tab.component.ts`:
  - Add route/state management for 4 tabs (Live, Upcoming, Recent, Completed)
  - Implement lazy loading for CompletedMatchesComponent using Angular router loadChildren or *ngIf
  - Store selected tab index in component state
  - Add route parameter ?tab=completed for deep linking

- [ ] T023 [US2] Add keyboard navigation for tabs:
  - Implement Arrow Left/Right to switch tabs
  - Add role="tablist", role="tab", role="tabpanel" ARIA attributes
  - Ensure Tab key navigates between tab buttons
  - Add aria-selected="true" to active tab

### Frontend Tests for User Story 2

- [ ] T024 [P] [US2] Write integration test for tab navigation in `apps/frontend/src/app/components/matches/matches-tab.component.spec.ts`:
  - Test clicking Completed tab switches to Completed view
  - Test switching to another tab and back preserves Completed data
  - Test all 4 tabs are rendered
  - Test tab selection persists in component state
  - Test keyboard navigation (Arrow keys)

- [ ] T025 [P] [US2] Write E2E test for tab navigation in `apps/frontend/e2e/src/matches-tab.e2e-spec.ts`:
  - Navigate to /matches page
  - Click each of 4 tabs sequentially
  - Verify Completed tab displays matches
  - Verify switching tabs works smoothly
  - Use Protractor browser.get() and element() selectors

**Checkpoint**: User Story 2 complete - users can navigate between all match status tabs

---

## Phase 5: User Story 3 - Identify Match Context (Priority: P3)

**Goal**: Enhance match display to clearly show series information and make it easy to identify matches from the same series

**Independent Test**: View Completed matches → Verify series name is prominently displayed → Identify multiple matches from same series visually

### Frontend Implementation for User Story 3

- [ ] T026 [P] [US3] Add series name prominence to match card template in `apps/frontend/src/app/components/matches/completed-matches.component.html`:
  - Display series name in larger, bold font above match details
  - Use color coding or icons for different formats (TEST, ODI, T20)
  - Group matches by series visually (optional: add series headers)
  - Add series name to card title/header section

- [ ] T027 [P] [US3] Enhance CSS styling for series identification in `apps/frontend/src/app/components/matches/completed-matches.component.css`:
  - Series name: font-size 1.125rem (18px), font-weight bold
  - Use accent color (--color-accent) for series name
  - Add series icon/badge showing format (TEST/ODI/T20)
  - Add subtle background color grouping for matches of same series (optional)
  - Ensure series name has sufficient color contrast (4.5:1 ratio)

- [ ] T028 [US3] Add visual format indicators to match cards:
  - Create format badge component or CSS class (.format-badge)
  - Show format icon: 🏏 for TEST, ⚡ for T20, 🎯 for ODI (or use custom SVG icons)
  - Position badge in top-right corner of match card
  - Add aria-label for screen readers: "Format: ODI"

### Frontend Tests for User Story 3

- [ ] T029 [P] [US3] Write visual regression test for series prominence in `apps/frontend/src/app/components/matches/completed-matches.component.spec.ts`:
  - Test series name has correct font size and weight
  - Test series name is rendered before match details
  - Test format badge is displayed
  - Test accessibility labels for series and format
  - Verify color contrast meets WCAG 2.1 AA (4.5:1)

**Checkpoint**: User Story 3 complete - users can easily identify match series context

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, performance optimization, documentation

- [ ] T030 [P] Add caching headers to backend response in MatchController:
  - Add @CacheControl annotation with max-age=300 (5 minutes)
  - Add ETag support for conditional requests
  - Add Last-Modified header based on latest match completion time

- [ ] T031 [P] Add performance monitoring to frontend:
  - Add performance.mark() before/after API call
  - Log render time to console in development mode
  - Add error tracking (Sentry or similar) for production
  - Monitor Time to Interactive (TTI) target <2 seconds

- [ ] T032 [P] Add loading skeleton animation in `apps/frontend/src/app/components/matches/completed-matches.component.html`:
  - Create skeleton card matching real card dimensions
  - Add shimmer animation using CSS @keyframes
  - Show 20 skeleton cards while loading
  - Fade transition when real data appears

- [ ] T033 [P] Add error boundary/fallback UI:
  - Implement retry mechanism with exponential backoff (1s, 2s, 4s)
  - Show last successful data with staleness warning if refresh fails
  - Add "Refresh" button that calls API again
  - Log errors to backend monitoring service

- [ ] T034 Update API documentation in `specs/006-completed-matches-display/contracts/completed-matches-api.yaml`:
  - Add rate limiting documentation (if applicable)
  - Add caching behavior documentation
  - Add example curl commands
  - Verify all response codes are documented (200, 400, 401, 500)

- [ ] T035 Add feature documentation to `specs/006-completed-matches-display/quickstart.md`:
  - Document component usage and props
  - Add screenshots of completed matches UI
  - Document accessibility features
  - Add troubleshooting section for common issues

- [ ] T036 Run full test suite and verify coverage:
  - Backend: mvn test (target >80% coverage)
  - Frontend: ng test (target >70% coverage)
  - E2E: ng e2e (all critical paths)
  - Fix any failing tests before merge

- [ ] T037 Performance testing:
  - Test API response time <200ms (use Apache Bench or JMeter)
  - Test frontend render time <2s (use Lighthouse CI)
  - Test with 1000 concurrent users (load testing)
  - Verify caching reduces database load (monitor Redis hit rate >90%)

- [ ] T038 Accessibility audit:
  - Run axe-core accessibility tests
  - Test with NVDA screen reader (Windows) or VoiceOver (Mac)
  - Verify keyboard navigation works (no mouse required)
  - Test focus indicators are visible
  - Verify color contrast meets WCAG 2.1 AA
  - Test with prefers-reduced-motion enabled

**Checkpoint**: Feature is production-ready with excellent performance and accessibility

---

## Task Dependencies & Execution Order

### Critical Path (Must be completed in order)

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (Polish)
```

### User Story Dependencies

- **US1 (View Completed Matches)**: No dependencies - can start immediately after foundational phase ✅ MVP
- **US2 (Navigate Between Tabs)**: Depends on US1 (needs completed matches component to navigate to)
- **US3 (Identify Match Context)**: Depends on US1 (enhances existing match display)

### Parallel Execution Opportunities

**Within Phase 2 (Foundational)**:
- T005 (CompletedMatchDTO) can run in parallel with T007, T008 (TypeScript interfaces)

**Within Phase 3 (US1 Backend)**:
- T009 (MatchService) must complete before T010 (MatchController)

**Within Phase 3 (US1 Frontend)**:
- T012 (MatchService), T013 (Component logic), T014 (Template), T015 (CSS) can all run in parallel
- T016 (Accessibility) must wait for T014 (Template) to complete

**Within Phase 3 (US1 Tests)**:
- T017, T018 (Backend tests) can run in parallel
- T019, T020 (Frontend tests) can run in parallel
- All tests can run in parallel with implementation (TDD approach)

**Within Phase 4 (US2)**:
- T021 (Template) and T022 (Logic) can run in parallel
- T024, T025 (Tests) can run in parallel

**Within Phase 5 (US3)**:
- T026, T027, T028 (All UI enhancements) can run in parallel

**Within Phase 6 (Polish)**:
- T030, T031, T032, T033, T034, T035 can all run in parallel
- T036, T037, T038 must run after implementation is complete

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phase 1 + Phase 2 + Phase 3 (User Story 1 only)** = MVP

This delivers:
✅ Display 20 most recent completed matches  
✅ Show series name for each match  
✅ Proper ordering by completion date  
✅ Backend API with caching  
✅ Frontend component with responsive design  
✅ Accessibility features  
✅ Error handling  
✅ Test coverage  

**Estimated effort**: 3-4 days for MVP

### Incremental Delivery

1. **Week 1**: MVP (Phase 1-3) → Deploy to staging → User testing
2. **Week 2**: US2 (Tab navigation) → Deploy to staging → Integration testing
3. **Week 3**: US3 (Series context) + Polish → Deploy to staging → Final QA
4. **Week 4**: Production deployment → Monitoring → Bug fixes

---

## Task Summary

**Total Tasks**: 38

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 4 tasks (BLOCKING)
- Phase 3 (US1 - MVP): 12 tasks (5 backend, 5 frontend, 2 tests)
- Phase 4 (US2): 5 tasks
- Phase 5 (US3): 4 tasks
- Phase 6 (Polish): 9 tasks

**By User Story**:
- US1 (P1): 12 tasks - Core completed matches display
- US2 (P2): 5 tasks - Tab navigation
- US3 (P3): 4 tasks - Series context enhancement

**Parallel Opportunities**: 18 tasks marked with [P] can run in parallel

**Test Tasks**: 6 tasks (T017-T020 for US1, T024-T025 for US2, T029 for US3)

**MVP Tasks**: 20 tasks (Phase 1 + Phase 2 + Phase 3)

---

## Format Validation ✅

All tasks follow required checklist format:
- ✅ Checkbox: `- [ ]` prefix
- ✅ Task ID: Sequential T001-T038
- ✅ [P] marker: 18 parallelizable tasks identified
- ✅ [Story] label: All user story tasks labeled (US1, US2, US3)
- ✅ File paths: All implementation tasks include exact file paths
- ✅ Clear descriptions: Each task has specific, actionable description

---

## Next Steps

1. **Review this task list** with team for feedback
2. **Prioritize MVP** (Phases 1-3) for first sprint
3. **Assign tasks** to developers (consider parallel opportunities)
4. **Set up tracking** in project management tool (Jira, GitHub Projects, etc.)
5. **Begin implementation** starting with Phase 1 Setup
6. **Daily standups** to track progress and unblock dependencies

**Ready to implement!** 🚀
