# Tasks: Completed Matches Functionality

**Feature**: 008-completed-matches  
**Input**: Design documents from `/specs/008-completed-matches/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Test tasks are included per Constitution Principle IV (Testing Requirements: >80% backend, >70% frontend coverage)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `apps/backend/spring-security-jwt/`
- **Frontend**: `apps/frontend/`
- **Tests**: `apps/backend/spring-security-jwt/src/test/` (backend), `apps/frontend/src/` (frontend)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [ ] T001 Verify feature branch `008-completed-matches` exists and is checked out
- [ ] T002 [P] Verify backend Spring Boot application runs successfully at `apps/backend/spring-security-jwt/`
- [ ] T003 [P] Verify frontend Angular application runs successfully at `apps/frontend/`
- [ ] T004 [P] Verify H2 Console is accessible at http://localhost:8099/h2-console
- [ ] T005 [P] Confirm existing LIVE_MATCH table has `isDeleted`, `lastKnownState`, `updatedAt` columns

**Checkpoint**: Development environment ready - all services start successfully

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Review existing LiveMatch entity at `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/LiveMatch.java` - confirm no changes needed
- [ ] T007 [P] Review existing MatchController at `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/MatchController.java` - understand routing structure
- [ ] T008 [P] Review existing MatchesService at `apps/frontend/src/app/features/matches/services/matches.service.ts` - understand HTTP call patterns
- [ ] T009 [P] Review API response format standard from Constitution (success, data, error, timestamp structure)
- [ ] T010 [P] Review contracts/completed-matches-api.yaml OpenAPI specification

**Checkpoint**: Foundation understood - user story implementation can now begin

---

## Phase 3: User Story 1 - View Completed Matches (Priority: P1) 🎯 MVP

**Goal**: Enable the existing "Completed" tab to display up to 20 recently completed matches

**Independent Test**: Navigate to Matches page, click "Completed" tab, verify list of completed matches displays with team names, scores, and results in reverse chronological order

### Backend Implementation for User Story 1

- [X] T011 [P] [US1] Add `findCompletedMatches(Pageable pageable)` method to LiveMatchRepository at `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/LiveMatchRepository.java` with query `SELECT m FROM LiveMatch m WHERE m.isDeleted = true ORDER BY m.updatedAt DESC`
- [X] T012 [P] [US1] Add `getCompletedMatches()` method to MatchService at `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/MatchService.java` that calls repository with `PageRequest.of(0, 20)`
- [X] T013 [US1] Add `GET /api/v1/matches/completed` endpoint to MatchController at `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/MatchController.java` that returns ApiResponse with completed matches (depends on T012)
- [X] T014 [US1] Add error handling to completed endpoint for database exceptions - return 500 with error message (depends on T013)

### Backend Tests for User Story 1

- [X] T015 [P] [US1] Create MatchServiceTest at `apps/backend/spring-security-jwt/src/test/java/com/devglan/service/MatchServiceTest.java` - test `getCompletedMatches()` returns max 20 matches
- [X] T016 [P] [US1] Add test to MatchServiceTest - verify completed matches are ordered by updatedAt DESC
- [X] T017 [P] [US1] Add test to MatchServiceTest - verify only isDeleted=true matches returned
- [X] T018 [P] [US1] Create MatchControllerTest at `apps/backend/spring-security-jwt/src/test/java/com/devglan/controller/MatchControllerTest.java` - test GET /api/v1/matches/completed returns 200 OK
- [X] T019 [P] [US1] Add test to MatchControllerTest - verify response format matches ApiResponse standard (success, data, error, timestamp)
- [ ] T020 [P] [US1] Add test to MatchControllerTest - verify endpoint requires authentication (401 without JWT)
- [X] T021 [P] [US1] Add test to MatchControllerTest - verify max 20 matches returned even if more exist in DB

### Frontend Implementation for User Story 1

- [X] T022 [P] [US1] Add `getCompletedMatches(): Observable<Match[]>` method to MatchesService at `apps/frontend/src/app/features/matches/services/matches.service.ts` that calls GET /api/v1/matches/completed
- [X] T023 [P] [US1] Add error handling to MatchesService.getCompletedMatches() using catchError operator
- [X] T024 [US1] Add `loadCompletedMatches()` method to matches-list.component.ts at `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts` that calls service (depends on T022)
- [X] T025 [US1] Wire Completed tab click event to call `loadCompletedMatches()` in matches-list.component.ts (depends on T024)
- [X] T026 [US1] Add loading state handling (`this.loading = true/false`) during API call in matches-list.component.ts (depends on T024)
- [X] T027 [US1] Add error state handling with user-friendly message "Unable to load completed matches. Tap to retry" in matches-list.component.ts (depends on T024)
- [X] T028 [US1] Add retry action that calls `loadCompletedMatches()` again when user taps retry button (depends on T027)
- [ ] T029 [US1] Verify empty state displays "No matches found" when completedMatches array is empty (existing functionality)

### Frontend Tests for User Story 1

- [X] T030 [P] [US1] Add test to matches.service.spec.ts at `apps/frontend/src/app/features/matches/services/matches.service.spec.ts` - verify getCompletedMatches() makes GET request to correct URL
- [X] T031 [P] [US1] Add test to matches.service.spec.ts - verify response is mapped correctly from ApiResponse.data
- [X] T032 [P] [US1] Add test to matches.service.spec.ts - verify error handling returns observable error
- [X] T033 [P] [US1] Add test to matches-list.component.spec.ts at `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.spec.ts` - verify Completed tab click triggers loadCompletedMatches()
- [X] T034 [P] [US1] Add test to matches-list.component.spec.ts - verify loading state is set during API call
- [X] T035 [P] [US1] Add test to matches-list.component.spec.ts - verify error message displays on API failure
- [X] T036 [P] [US1] Add test to matches-list.component.spec.ts - verify retry button calls loadCompletedMatches() again
- [X] T037 [P] [US1] Add test to matches-list.component.spec.ts - verify empty state shows when no matches returned

**Checkpoint**: User Story 1 is complete - Completed tab displays matches, handles loading, errors, and empty states

---

## Phase 4: User Story 2 - Automatic Match Completion (Priority: P1)

**Goal**: Verify existing scraper mechanism automatically populates completed matches (no new code - verification only)

**Independent Test**: Monitor a live match until scraper sets isDeleted=true, verify it appears in Completed tab within reasonable time

### Verification Tasks for User Story 2

- [ ] T038 [US2] Document scraper behavior in quickstart.md - confirm scraper already sets isDeleted=true when matches complete (no code changes needed)
- [ ] T039 [US2] Add H2 Console query to quickstart.md for verifying match completion: `SELECT * FROM LIVE_MATCH WHERE isDeleted = true ORDER BY updatedAt DESC LIMIT 20`
- [ ] T040 [US2] Test end-to-end flow: Wait for a live match to complete, check H2 Console for isDeleted=true, verify match appears in Completed tab
- [ ] T041 [US2] Verify LIMIT 20 clause works correctly - if >20 completed matches exist in DB, only 20 most recent returned by API

**Checkpoint**: User Story 2 verified - Scraper integration works, matches automatically appear in Completed tab

---

## Phase 5: User Story 3 - Completed Match Card Display (Priority: P2)

**Goal**: Ensure completed match cards display comprehensive information (winner highlight, result text, team logos)

**Independent Test**: View completed matches and verify each card shows complete information with visual winner indication

### Frontend Enhancement for User Story 3

- [ ] T042 [P] [US3] Verify existing match card component at `apps/frontend/src/app/features/matches/components/match-card/` supports MatchStatus.COMPLETED enum
- [ ] T043 [US3] Add conditional CSS class for winner highlighting in match card when match.isDeleted=true (if not already present)
- [ ] T044 [US3] Verify lastKnownState result text is displayed prominently on completed match cards (e.g., "India won by 7 wickets")
- [ ] T045 [US3] Verify team logos display with lazy loading (loading="lazy" attribute) on match cards
- [ ] T046 [US3] Verify fallback to team abbreviations when logo fails to load (existing error handling)
- [ ] T047 [US3] Test mobile responsiveness - verify touch targets are minimum 44x44px on completed match cards
- [ ] T048 [US3] Test on various screen sizes (320px, 768px, 1024px, 1440px) to confirm responsive layout

### Frontend Tests for User Story 3

- [ ] T049 [P] [US3] Add test to match-card.component.spec.ts - verify winner team is visually highlighted when match is completed
- [ ] T050 [P] [US3] Add test to match-card.component.spec.ts - verify result text from lastKnownState is displayed
- [ ] T051 [P] [US3] Add test to match-card.component.spec.ts - verify team logos render with lazy loading attribute
- [ ] T052 [P] [US3] Add test to match-card.component.spec.ts - verify fallback logic when logo fails to load

**Checkpoint**: User Story 3 complete - Completed match cards display rich information with winner highlights and result text

---

## Phase 6: User Story 4 - Completed Tab Count Display (Priority: P2)

**Goal**: Show accurate count badge on Completed tab matching number of completed matches available

**Independent Test**: View Matches page tab navigation, verify Completed tab shows correct count badge (up to 20)

### Frontend Enhancement for User Story 4

- [ ] T053 [US4] Verify `completedMatchesCount` getter exists in matches-list.component.ts at `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- [ ] T054 [US4] Update `completedMatchesCount` getter to return `this.completedMatches?.length || 0` in matches-list.component.ts
- [ ] T055 [US4] Verify tab count badge in matches-list.component.html uses `completedMatchesCount` and displays correctly
- [ ] T056 [US4] Ensure tab count updates after `loadCompletedMatches()` completes successfully
- [ ] T057 [US4] Verify count badge shows "0" or is hidden when no completed matches exist (check existing tab component behavior)
- [ ] T058 [US4] Test auto-refresh behavior - verify tab count updates if matches-list auto-refreshes and new matches complete

### Frontend Tests for User Story 4

- [ ] T059 [P] [US4] Add test to matches-list.component.spec.ts - verify completedMatchesCount returns correct count
- [ ] T060 [P] [US4] Add test to matches-list.component.spec.ts - verify tab badge displays matching count after API call
- [ ] T061 [P] [US4] Add test to matches-list.component.spec.ts - verify count is 0 when completedMatches array is empty
- [ ] T062 [P] [US4] Add test to matches-list.component.spec.ts - verify count updates after successful loadCompletedMatches() call

**Checkpoint**: User Story 4 complete - Tab count badge accurately reflects available completed matches

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, and quality checks

- [X] T063 [P] Run full backend test suite with `mvn test` at `apps/backend/spring-security-jwt/` - ensure >80% coverage
- [X] T064 [P] Run full frontend test suite with `ng test` at `apps/frontend/` - ensure >70% coverage
- [ ] T065 [P] Test API endpoint manually with H2 Console - verify query returns expected results
- [ ] T066 [P] Test complete user journey: Start app, login, navigate to Matches, click Completed tab, see matches
- [ ] T067 [P] Test error scenarios: Stop backend, verify frontend shows retry message; restart backend, verify retry works
- [ ] T068 [P] Test empty state: Clear all isDeleted=true records in H2, verify "No matches found" displays
- [ ] T069 [P] Test performance: Verify API response time <200ms for completed matches query
- [ ] T070 [P] Test mobile responsiveness: Open on mobile device/emulator, verify Completed tab works correctly
- [X] T071 [P] Update README.md at `apps/backend/spring-security-jwt/README.md` with new /api/v1/matches/completed endpoint documentation
- [X] T072 [P] Update README.md at `apps/frontend/README.md` with Completed tab functionality description
- [X] T073 [P] Review code for console.log statements - remove debug logging from production code
- [X] T074 [P] Review Constitution compliance - confirm all 6 principles are satisfied
- [ ] T075 [P] Code review preparation: Create PR with clear description linking to spec.md and plan.md
- [ ] T076 Final manual QA checklist: Test all 4 user stories end-to-end on dev environment

**Checkpoint**: Feature complete and ready for code review and merge

**Note**: Tasks T065-T070, T075-T076 require manual testing/review and cannot be automated in this session.

---

## Task Summary

**Total Tasks**: 76

**By User Story**:
- Setup: 5 tasks
- Foundational: 5 tasks
- User Story 1 (View Completed Matches - P1): 27 tasks (MVP)
- User Story 2 (Automatic Completion - P1): 4 tasks
- User Story 3 (Card Display - P2): 11 tasks
- User Story 4 (Tab Count - P2): 10 tasks
- Polish: 14 tasks

**Parallel Opportunities**: 44 tasks marked with [P] can be executed in parallel

**Test Coverage**:
- Backend Tests: 7 tasks (T015-T021)
- Frontend Tests: 20 tasks (T030-T037, T049-T052, T059-T062)
- Total Test Tasks: 27 tasks (~35% of total)

---

## Dependencies & Execution Order

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1) ← MVP - Can be delivered independently
    ↓
Phase 4 (US2) ← Verification only, depends on US1 being functional
    ↓
Phase 5 (US3) ← Enhancement, depends on US1 completing
    ↓
Phase 6 (US4) ← Enhancement, depends on US1 completing
    ↓
Phase 7 (Polish)
```

### Within-Story Parallelization

**User Story 1** (27 tasks):
- **Parallel Group 1** (can start immediately after Foundational phase):
  - T011 (Repository method)
  - T012 (Service method) 
  - T015-T021 (All backend tests)
  - T022-T023 (Frontend service methods)
  - T030-T032 (Frontend service tests)
- **Sequential Group** (must follow T013):
  - T013 (Controller endpoint) requires T012
  - T014 (Error handling) requires T013
  - T024-T029 (Component integration) requires T022
  - T033-T037 (Component tests) can start after T024

**User Story 2** (4 tasks):
- All tasks can run in parallel (verification/documentation only)

**User Story 3** (11 tasks):
- T042 (Verify component) first
- T043-T048 (Enhancement tasks) can run in parallel after T042
- T049-T052 (Tests) can run in parallel

**User Story 4** (10 tasks):
- T053-T058 (Implementation) sequential
- T059-T062 (Tests) can run in parallel

---

## MVP Delivery Strategy

**Minimum Viable Product (MVP)** = User Story 1 only

**MVP Scope**:
- Backend API endpoint returning completed matches ✅
- Frontend Completed tab displaying matches ✅
- Loading and error states ✅
- Empty state handling ✅

**MVP Delivers**:
- Core value: Users can view completed matches
- Independently testable
- Production-ready (with tests)

**Post-MVP Increments**:
1. User Story 2: Verification (1-2 hours)
2. User Story 3: Enhanced card display (3-4 hours)
3. User Story 4: Tab count badges (2-3 hours)

**Total Estimated Effort**:
- MVP (US1): 8-10 hours
- Full Feature (US1-4): 12-16 hours
- With Polish: 14-18 hours

---

## Parallel Execution Examples

### Example 1: Backend Developer (US1)
```
Start: T011 (Repository) + T012 (Service) in parallel
    ↓
Then: T013 (Controller) [sequential, needs T012]
    ↓
Then: T014 (Error handling) [sequential, needs T013]
    ↓
Parallel: T015-T021 (All tests together)
```

### Example 2: Frontend Developer (US1)
```
Start: T022 + T023 (Service methods) in parallel
    ↓
Parallel: T030-T032 (Service tests)
    ↓
Then: T024-T029 (Component integration) [sequential]
    ↓
Parallel: T033-T037 (Component tests)
```

### Example 3: Full Team (US1)
```
Backend Dev: T011, T012, T013, T014, T015-T021
Frontend Dev: T022, T023, T024-T029, T030-T037
    ↓
Both merge when complete (US1 done)
```

---

## Testing Checklist

### Backend Tests (>80% coverage target)
- [ ] Repository query returns only isDeleted=true matches
- [ ] Repository query orders by updatedAt DESC
- [ ] Service returns max 20 matches
- [ ] Controller endpoint returns 200 OK with data
- [ ] Controller endpoint requires JWT authentication (401 without)
- [ ] Response format matches ApiResponse standard
- [ ] Error handling returns 500 with proper error structure

### Frontend Tests (>70% coverage target)
- [ ] Service makes GET request to correct endpoint
- [ ] Service maps ApiResponse.data correctly
- [ ] Service handles errors with catchError
- [ ] Component calls service when Completed tab clicked
- [ ] Component shows loading state during API call
- [ ] Component shows error message on failure
- [ ] Component provides retry action
- [ ] Component shows empty state when no matches
- [ ] Tab count badge displays correct number
- [ ] Match cards display winner highlights
- [ ] Match cards show result text from lastKnownState

---

## Manual QA Checklist

Before marking feature complete, verify:

- [ ] Backend server starts without errors
- [ ] Frontend app starts without errors
- [ ] H2 Console shows LIVE_MATCH table with test data
- [ ] Login works and JWT token is issued
- [ ] Navigate to Matches page successfully
- [ ] Click Completed tab - loading state shows briefly
- [ ] Completed matches display in cards (if test data exists)
- [ ] Match cards show team names and result text
- [ ] Click match card - navigates to match details page
- [ ] Tab count badge shows correct number (or 0)
- [ ] Stop backend - error message displays with retry
- [ ] Click retry - loading state shows again
- [ ] Start backend - retry succeeds and displays matches
- [ ] No completed matches - empty state shows "No matches found"
- [ ] Mobile view (320px) - cards are touch-friendly
- [ ] Tablet view (768px) - layout responsive
- [ ] Desktop view (1024px+) - optimal layout
- [ ] Console has no errors in browser DevTools
- [ ] Network tab shows correct API calls
- [ ] API response time <200ms (check Network tab)
- [ ] All tests pass: `mvn test` and `ng test`

---

## Format Validation

✅ All tasks follow strict checklist format:
- Checkbox: `- [ ]`
- Task ID: T001-T076 sequential
- [P] marker: 44 tasks parallelizable
- [Story] label: US1, US2, US3, US4 (where applicable)
- Description: Clear action + exact file path
- No missing required components

✅ Organization by user story enables:
- Independent implementation per story
- Independent testing per story
- MVP delivery (US1 only)
- Incremental feature delivery

✅ Dependencies clearly documented:
- Foundational phase MUST complete first
- User stories build on each other
- Within-story parallelization opportunities identified

---

**Ready to implement!** Start with Phase 1 (Setup), then Phase 2 (Foundational), then proceed with User Story 1 for MVP delivery.
