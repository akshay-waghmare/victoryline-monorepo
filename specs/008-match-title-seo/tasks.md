# Tasks: Match Page Title SEO Optimization

**Input**: Design documents from `/specs/008-match-title-seo/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: NOT included - feature specification does not explicitly request test generation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/backend/`, `apps/frontend/`
- Backend: `apps/backend/src/main/java/com/victoryline/backend/`
- Frontend: `apps/frontend/src/`, `apps/frontend/server.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment setup and prerequisite validation

- [x] T001 Verify Feature 003 (SEO Optimization) is deployed with SSR infrastructure in `apps/frontend/server.ts`
- [ ] T002 Verify Backend API endpoint `/api/matches/{id}` returns team names and status fields
- [ ] T003 [P] Create Google Cloud Project and enable Search Console API v1
- [ ] T004 [P] Create service account for GSC API access with JSON key credentials
- [x] T005 [P] Add Maven dependency `google-api-services-searchconsole v1` to `apps/backend/pom.xml`
- [ ] T006 [P] Store GSC service account key in `apps/backend/src/main/resources/gsc-service-account.json` (gitignored)
- [x] T007 Configure GSC API credentials in `apps/backend/src/main/resources/application.properties` (property: gsc.service-account-path)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create `fetchMatchData()` async function in `apps/frontend/server.ts` to call Backend `/api/matches/{id}` with 200ms timeout
- [x] T009 Create `generateMatchTitle()` helper function in `apps/frontend/server.ts` implementing FR-001 (team-based titles) with 60-char truncation (FR-012)
- [x] T010 Create `generateMatchDescription()` helper function in `apps/frontend/server.ts` implementing FR-013 (CTR-optimized descriptions) with 155-char limit
- [x] T011 Implement status-aware title variations (FR-014) in `generateMatchTitle()` with suffix mapping: live → "Live Score Ball by Ball", completed → "Final Score | Full Scorecard", abandoned → "Match Scorecard"
- [x] T012 Add special character escaping (FR-011) in `generateMatchTitle()` and `generateMatchDescription()` (HTML entity encoding)
- [x] T013 Add fallback handling for failed API calls in `fetchMatchData()` returning {homeTeam: 'TBD', awayTeam: 'TBD', status: 'scheduled'}

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search Discovery (Priority: P1) 🎯 MVP

**Goal**: Enable cricket fans to discover match pages via Google Search for specific match queries (e.g., "Bangladesh vs Afghanistan live score")

**Independent Test**: Search "site:victoryline.live [team A] vs [team B]" in Google → match page appears with team-based title in SERP

### Implementation for User Story 1

- [x] T014 [US1] Update `/cric-live/:id` route in `apps/frontend/server.ts` to call `fetchMatchData()` and inject dynamic title
- [x] T015 [US1] Update `/match/:id` route in `apps/frontend/server.ts` to call `fetchMatchData()` and inject dynamic title
- [x] T016 [US1] Replace placeholder `<title>Match ${id}</title>` with `<title>${generateMatchTitle(...)}</title>` in SSR HTML template
- [x] T017 [US1] Replace placeholder meta description with `<meta name="description" content="${generateMatchDescription(...)}"/>` in SSR HTML template
- [x] T018 [US1] Verify canonical URL generation in `apps/frontend/server.ts` uses correct format `/cric-live/${id}` (not `/match/${id}`) per FR-007
- [x] T019 [US1] Add cache-control headers in SSR routes: `Cache-Control: public, max-age=60, stale-while-revalidate=300` per FR-016 (60-second freshness)
- [ ] T020 [US1] Test SSR output locally: `curl http://localhost:4000/cric-live/[id] | grep '<title>'` → verify team names appear
- [ ] T021 [US1] Deploy Phase 1A to production (dynamic titles only, ship immediately per deployment strategy)

**Checkpoint**: At this point, User Story 1 should be fully functional - match pages have team-based titles visible in HTML source and search results

---

## Phase 4: User Story 2 - Social Sharing (Priority: P2)

**Goal**: Enable users to share match pages on social media with rich previews showing team names and match status

**Independent Test**: Share victoryline.live/cric-live/[id] on Twitter/Facebook → preview card shows team-based title and description

### Implementation for User Story 2

- [x] T022 [P] [US2] Update Open Graph title in SSR HTML template: `<meta property="og:title" content="${generateMatchTitle(...)}"/>` in `apps/frontend/server.ts`
- [x] T023 [P] [US2] Update Open Graph description in SSR HTML template: `<meta property="og:description" content="${generateMatchDescription(...)}"/>` in `apps/frontend/server.ts`
- [x] T024 [P] [US2] Update Twitter Card title in SSR HTML template: `<meta name="twitter:title" content="${generateMatchTitle(...)}"/>` in `apps/frontend/server.ts`
- [x] T025 [P] [US2] Update Twitter Card description in SSR HTML template: `<meta name="twitter:description" content="${generateMatchDescription(...)}"/>` in `apps/frontend/server.ts`
- [x] T026 [US2] Verify Open Graph image URL is set correctly: `<meta property="og:image" content="https://victoryline.live/assets/og-cricket.png"/>` (existing image from Feature 003)
- [ ] T027 [US2] Test social sharing previews using Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) with live match URL
- [ ] T028 [US2] Test social sharing previews using Twitter Card Validator (https://cards-dev.twitter.com/validator) with live match URL
- [ ] T029 [US2] Verify mobile sharing preview renders correctly on iOS/Android native share sheets

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - match pages discoverable via search AND shareable with rich previews

---

## Phase 5: User Story 3 - Admin Monitoring (Priority: P3)

**Goal**: Enable site admins to monitor search performance metrics and validate indexing status via automated Google Search Console integration

**Independent Test**: Check GSC dashboard for victoryline.live → sitemap submitted automatically, match pages indexed, impressions/clicks data available

### Implementation for User Story 3

- [x] T030 [P] [US3] Create `GoogleSearchConsoleService.java` in `apps/backend/src/main/java/com/devglan/service/seo/`
- [x] T031 [P] [US3] Implement `authenticateWithServiceAccount()` method in `GoogleSearchConsoleService.java` loading credentials from `gsc-service-account.json`
- [x] T032 [US3] Implement `submitSitemap(String sitemapUrl)` method in `GoogleSearchConsoleService.java` calling GSC API `sites.sitemaps.submit()` endpoint
- [x] T033 [US3] Add error handling for GSC API failures (rate limits, auth errors) with exponential backoff retry strategy
- [x] T034 [P] [US3] Create `SitemapScheduler.java` in `apps/backend/src/main/java/com/devglan/scheduler/`
- [x] T035 [US3] Add `@Scheduled(cron = "0 0 3 * * *")` annotation to `submitDailySitemap()` method in `SitemapScheduler.java` (runs at 3 AM daily)
- [x] T036 [US3] Wire `GoogleSearchConsoleService` into `SitemapScheduler` via constructor injection
- [x] T037 [US3] Call `googleSearchConsoleService.submitSitemap("https://victoryline.live/sitemap.xml")` in scheduled job
- [x] T038 [US3] Add logging for GSC API calls: INFO for successful submissions, ERROR for failures with response body
- [ ] T039 [US3] Test scheduled job locally: manually trigger `submitDailySitemap()` → verify GSC API receives sitemap submission
- [ ] T040 [US3] Deploy Phase 1B to production (GSC automation, per deployment strategy)
- [ ] T041 [US3] Verify GSC dashboard shows sitemap submitted after first daily job run (next morning)
- [ ] T042 [US3] Validate indexed pages increase in GSC Coverage Report over 7-day period

**Checkpoint**: All user stories should now be independently functional - search discovery (US1) + social sharing (US2) + admin monitoring (US3) complete

---

## Phase 6: Client-Side Updates (Phase 2 - Week 2)

**Goal**: Update browser tab title during SPA navigation without full page reload (FR-003)

**Purpose**: Improvements for single-page application navigation experience

- [x] T043 [P] Inject Angular `Title` service into `CricketOddsComponent` in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [x] T044 [P] Inject Angular `Title` service into `MatchesListComponent` in `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- [x] T045 Call `this.titleService.setTitle(generateMatchTitle(...))` in `CricketOddsComponent.fetchMatchInfo()` after match data loads
- [ ] T046 Call `this.titleService.setTitle(generateMatchTitle(...))` in `MatchesListComponent` for each match card hover/click interaction (optional enhancement)
- [ ] T047 Create `TitleGeneratorService` in `apps/frontend/src/app/seo/title-generator.service.ts` with reusable `generateMatchTitle()` and `generateMatchDescription()` methods
- [ ] T048 Refactor `CricketOddsComponent` and `MatchesListComponent` to use `TitleGeneratorService` instead of inline logic
- [ ] T049 Test SPA navigation: click match card → navigate to `/cric-live/[id]` → verify browser tab title updates immediately without page reload
- [ ] T050 Deploy Phase 2 client-side updates to production

**Checkpoint**: Browser tab titles update dynamically during SPA navigation, enhancing user experience

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T051 [P] Update `docs/SEO_GUIDE.md` with section on dynamic title generation format and GSC integration setup
- [ ] T052 [P] Update `README.md` in `apps/frontend/` with SSR environment variables for Backend API URL
- [ ] T053 [P] Update `README.md` in `apps/backend/` with GSC API setup instructions and service account configuration
- [ ] T054 Code cleanup: Extract title/description generation logic into `apps/frontend/src/utils/seo-helpers.ts` for reusability
- [ ] T055 Add error monitoring for SSR API fetch failures: track rate of `fetchMatchData()` errors in application logs
- [ ] T056 Add performance monitoring: log SSR response times for `/cric-live/:id` routes before and after changes (validate <50ms overhead)
- [ ] T057 Run quickstart.md validation: follow Phase 1A, 1B, and 2 steps → verify all manual tests pass
- [ ] T058 Update `.github/copilot-instructions.md` with new GSC API integration patterns (already done in Phase 0 research)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T007) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion (T008-T013)
  - User Story 1 (P1) can proceed independently after Phase 2
  - User Story 2 (P2) can proceed in parallel with US1 (different meta tags)
  - User Story 3 (P3) can proceed in parallel with US1/US2 (Backend-only changes)
- **Client-Side Updates (Phase 6)**: Depends on User Story 1 completion (needs SSR titles working first)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses same title generation functions as US1 but updates different meta tags (OG/Twitter)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent Backend work, no frontend dependencies

### Within Each User Story

- **US1**: SSR route updates (T014-T017) must happen before deployment (T021)
- **US2**: All meta tag updates (T022-T025) can run in parallel, then validation (T026-T029) in sequence
- **US3**: Service creation (T030-T033) before scheduler creation (T034-T039), then deployment (T040) before validation (T041-T042)

### Parallel Opportunities

- **Setup Phase**: T003-T007 all run in parallel (different setup tasks)
- **User Story 2**: T022-T025 all run in parallel (updating different meta tags in same file)
- **User Story 3**: T030-T031 (service class) can run in parallel with T034 (scheduler class creation)
- **Phase 6**: T043-T044 run in parallel (different Angular components)
- **Polish**: T051-T053 documentation updates run in parallel

### Critical Path (Fastest Delivery to Production)

**Week 1 - Phase 1A (Priority US1)**:
1. T001-T007 (Setup) → 1-2 hours
2. T008-T013 (Foundational) → 2-3 hours
3. T014-T021 (User Story 1 implementation + deploy) → 2-3 hours
4. **SHIP TO PRODUCTION** ← First value delivery

**Week 1-2 - Phase 1B (Priority US3)**:
5. T030-T042 (User Story 3 GSC automation) → 4-6 hours
6. **DEPLOY GSC AUTOMATION** ← Operational comfort

**Week 2 - Phase 2 (Nice-to-have)**:
7. T043-T050 (Client-side SPA updates) → 3-4 hours
8. T051-T058 (Polish) → 2-3 hours

**User Story 2 can be slotted anywhere after Phase 2** - it's P2 priority but quick to implement (T022-T029 → 1-2 hours total)

---

## Parallel Example: Efficient Week 1 Execution

If you have multiple developers or want to parallelize:

```bash
# Developer 1: Critical path (User Story 1)
git checkout 008-match-title-seo
# Complete T001-T007 (Setup)
# Complete T008-T013 (Foundational)
# Complete T014-T021 (US1 implementation)
git commit -m "feat: dynamic team-based titles (US1 - search discovery)"
git push
# Deploy Phase 1A immediately

# Developer 2: GSC Integration (User Story 3) - can start in parallel
git checkout 008-match-title-seo
git pull  # Get foundational code from Dev 1
# Complete T030-T033 (GoogleSearchConsoleService)
# Complete T034-T039 (SitemapScheduler)
git commit -m "feat: automated GSC sitemap submission (US3 - admin monitoring)"
git push
# Deploy Phase 1B after Phase 1A

# Developer 3: Social meta tags (User Story 2) - can start anytime after Phase 2
git checkout 008-match-title-seo
git pull
# Complete T022-T029 (OG/Twitter meta tags)
git commit -m "feat: social sharing rich previews (US2 - social distribution)"
git push
# Deploy alongside Phase 1B or separately
```

---

## Validation Checklist

After all phases complete, verify these success criteria from spec.md:

- [ ] SC-001: Search "site:victoryline.live Bangladesh vs Afghanistan" shows match pages with team names in title
- [ ] SC-002: All live match page titles follow exact format "{Team A} vs {Team B} Live Score Ball by Ball"
- [ ] SC-003: Completed match titles use format "{Team A} vs {Team B} Final Score | Full Scorecard"
- [ ] SC-004: Twitter/Facebook share previews show team-based titles and descriptions
- [ ] SC-005: Google Search Console shows sitemap submitted automatically (daily job logs)
- [ ] SC-006: SPA navigation updates browser tab title without page reload
- [ ] SC-007: SSR response time <500ms P95 (no degradation from baseline)
- [ ] SC-008: Titles ≤60 characters (test with long team names)
- [ ] SC-009: Meta descriptions ≤155 characters
- [ ] SC-010: Canonical URLs use `/cric-live/` format (not `/match/`)

---

## Estimated Effort

- **Phase 1 (Setup)**: 1-2 hours
- **Phase 2 (Foundational)**: 2-3 hours
- **Phase 3 (US1 - P1)**: 2-3 hours
- **Phase 4 (US2 - P2)**: 1-2 hours
- **Phase 5 (US3 - P3)**: 4-6 hours
- **Phase 6 (Client-Side)**: 3-4 hours
- **Phase 7 (Polish)**: 2-3 hours

**Total**: 15-23 hours (across 2 weeks per deployment strategy)

**Week 1 Minimum (Phase 1A + 1B)**: 9-14 hours  
**Week 2 Optional (Phase 2 + Polish)**: 6-9 hours
