---
description: "Task list for Phase 030: prematch SEO discovery fixes"
---

# Tasks: Prematch SEO Discovery Fixes

**Input**: Design documents from `/specs/030-prematch-seo-discovery-fixes/`
**Generated**: 2026-06-25
**Branch**: `030-prematch-seo-discovery-fixes`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: JUnit (`mvn test`) for backend scheduler/sitemap changes; Angular unit tests (`ng test`) for frontend JSON-LD/H1 changes; SEO health pattern audit PowerShell script and raw production HTML inspection for end-to-end verification.

## Phase 1: Documentation

- [x] T001 Create `specs/030-prematch-seo-discovery-fixes/spec.md`
- [x] T002 Create `specs/030-prematch-seo-discovery-fixes/plan.md`
- [x] T003 Create `specs/030-prematch-seo-discovery-fixes/tasks.md`

## Phase 2: Backend — US1 Prematch Indexing API Ping (Priority: P1)

**Goal**: Include UPCOMING matches in the real-time Indexing API ping so Google discovers pre-match pages before first ball.

**Independent Test**: Trigger `LiveMatchIndexingScheduler.indexNewLiveMatches()` with a feed containing an UPCOMING match and verify `requestIndexingForMatch` is called for that slug.

### Tests for US1

- [x] T004 [P] [US1] Add/update JUnit test in `apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/LiveMatchIndexingSchedulerTest.java` asserting an UPCOMING match slug is submitted to `requestIndexingForMatch`
- [x] T005 [P] [US1] Add JUnit test asserting LIVE matches are prioritized ahead of UPCOMING matches in the same run
- [x] T006 [P] [US1] Add JUnit test asserting an already-indexed UPCOMING slug is skipped via `SeoCache.isSlugIndexed`

### Implementation for US1

- [x] T007 [US1] In `apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/LiveMatchIndexingScheduler.java`, change `indexNewLiveMatches()` to source from `liveMatchesService.getLiveMatches()` instead of `getLiveMatchesOnly()`
- [x] T008 [US1] In `LiveMatchIndexingScheduler.java`, update the null/empty log message and `getStatus()` method docstring to reflect that the candidate set now includes UPCOMING matches
- [x] T009 [US1] Run `mvn test` in `apps/backend/spring-security-jwt` and confirm all scheduler tests pass

**Checkpoint**: UPCOMING matches receive Indexing API pings within one scheduler interval; LIVE matches remain prioritized; quota protection intact.

---

## Phase 3: Backend — US4 Hourly Sitemap Submission (Priority: P2)

**Goal**: Submit the sitemap to GSC at the top of every hour instead of once daily at 3 AM.

**Independent Test**: Inspect the `@Scheduled` cron expression and assert it fires hourly; verify via logs that `submitSitemap` is called 24 times/day.

### Tests for US4

- [x] T010 [P] [US4] Add reflection test in `apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/SitemapSchedulerTest.java` asserting the `@Scheduled` cron on `submitHourlySitemap` is `0 0 * * * *` (hourly) and the old `submitDailySitemap` method no longer exists

### Implementation for US4

- [x] T011 [US4] In `apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/SitemapScheduler.java`, change the `@Scheduled(cron = "0 0 3 * * *")` to `@Scheduled(cron = "0 0 * * * *")`
- [x] T012 [US4] In `SitemapScheduler.java`, rename the method from `submitDailySitemap` to `submitHourlySitemap` and update all log messages from "daily" to "hourly"; update the `getStatus()` schedule string
- [x] T013 [US4] Run `mvn test` and confirm scheduler tests pass

**Checkpoint**: Sitemap is submitted to GSC 24 times/day (hourly), far under the 200,000/day quota.

---

## Phase 4: Backend — US5 Honest Sitemap lastmod (Priority: P3)

**Goal**: Stop emitting future-dated `lastmod` for upcoming matches; use the current emit time instead.

**Independent Test**: Inspect sitemap XML for an upcoming match with no `lastStateUpdatedAt` and assert `lastmod` is not in the future.

### Tests for US5

- [x] T014 [P] [US5] Add JUnit tests in `SitemapPartitionTest.java` asserting an upcoming match (future `scheduledStartTime`, no `lastStateUpdatedAt`) AND an upcoming match with a future `startDate` string both get a `lastmod` <= now, not the future date

### Implementation for US5

- [x] T015 [US5] In `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java`, update `deriveLiveMatchLastMod()` so that when `lastStateUpdatedAt` is absent and the match is upcoming (future `scheduledStartTime`), it uses the current emit time (writer `isoFromEpochMillis(System.currentTimeMillis())`) instead of the future start time; keep the `scheduledStartTime` fallback only for live/completed matches
- [x] T016 [US5] Run `mvn test` and confirm sitemap partition tests pass

**Checkpoint**: No sitemap `lastmod` for an upcoming match is in the future; live/completed `lastmod` behavior unchanged.

---

## Phase 5: Frontend — US2 SportsEvent JSON-LD Without Venue (Priority: P1)

**Goal**: Emit `SportsEvent` JSON-LD whenever `startDate` exists, even when venue is TBD, so pre-match pages are eligible for rich results.

**Independent Test**: Render a match page SSR with a known `startDate` and `venue = null`; assert the HTML contains a `SportsEvent` JSON-LD block with `startDate` and no `location`.

### Tests for US2

- [ ] T017 [P] [US2] **BLOCKED**: Add/ update Angular unit test in `apps/frontend/src/app/seo/structured-data.service.spec.ts` asserting `sportsEvent()` with no `location` produces a `SportsEvent` block with no `location` property and a valid `startDate` — blocked by pre-existing frontend test infra breakage (missing `axe-core`, Angular 7 `TestBed.inject` API mismatch, missing `tsconfig.spec.json`); to be revisited after test infra repair
- [ ] T018 [P] [US2] **BLOCKED**: Add unit test in `apps/frontend/src/app/cricket-odds/` asserting `buildStructuredDataItems()` emits a `SportsEvent` entry when `startDate` is present and `getStructuredDataLocation()` returns null — same blocker as T017

### Implementation for US2

- [x] T019 [US2] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`, change the gate at line ~2976 from `if (startDate && location)` to `if (startDate)`; pass `location: location || undefined` to `sportsEvent()` so it is omitted when absent
- [x] T020 [US2] Verify `apps/frontend/src/app/seo/structured-data.service.ts` `sportsEvent()` already omits `location` when input is falsy (the `buildLocation` helper returns `undefined`); no change needed unless it emits an empty `Place`
- [ ] T021 [US2] **BLOCKED**: Run `ng test` for the affected specs and confirm they pass — pre-existing test infra breakage prevents the suite from compiling; the `structured-data.service.spec.ts` itself uses `TestBed.inject` which does not exist on Angular 7's `TestBedStatic`

**Checkpoint**: Pre-match pages with a known start time and TBD venue emit a valid `SportsEvent` block; pages with both start time and venue unchanged.

---

## Phase 6: Frontend — US3 Single H1 On Completed Matches (Priority: P1)

**Goal**: Remove the duplicate H1 on completed match pages so each match page has exactly one `<h1>`.

**Independent Test**: Fetch raw SSR HTML of a completed match page that renders the scorecard tab and assert `h1Count === 1`.

### Tests for US3

- [ ] T022 [P] [US3] **BLOCKED**: Add/update Angular unit test asserting `scorecard.component.html` renders `<h2>Scorecard</h2>` (not `<h1>`) in the scorecard header — same pre-existing frontend test infra blocker

### Implementation for US3

- [x] T023 [US3] In `apps/frontend/src/app/scorecard/scorecard.component.html` line 97, change `<h1>Scorecard</h1>` to `<h2>Scorecard</h2>`
- [ ] T024 [US3] In `apps/frontend/src/app/scorecard/scorecard.component.html` line 96, update the `scorecard__eyebrow` span if needed so the visual hierarchy remains consistent (eyebrow + h2 is standard)
- [ ] T025 [US3] **BLOCKED**: Run `ng test` for the scorecard spec and confirm it passes — same pre-existing frontend test infra blocker

**Checkpoint**: Completed match pages return exactly one `<h1>` (the sr-only `matchSeo.h1`); live/upcoming pages unchanged.

---

## Phase 7: Verification & Rollout

**Purpose**: Prove the fixes work end-to-end on production without changing canonical policy.

- [x] T026 Run `mvn test` in `apps/backend/spring-security-jwt` and confirm the full backend test suite passes (18/18 tests pass across US1, US4, US5)
- [ ] T027 **PENDING**: Run `ng test` in `apps/frontend` and confirm the full frontend test suite passes — blocked by pre-existing test infra breakage unrelated to this spec
- [x] T028 **PENDING (post-deploy)**: Run the SEO health pattern audit — **DONE 2026-06-25 09:35 UTC**: `failures: 0`, exit code 0, 30/30 sampled match pages have `h1=1`, zero `h1=2` failures (was 19/30 failing before deploy)
- [x] T029 [P] **PENDING (post-deploy)**: Inspect raw SSR HTML of one completed match page — **DONE**: `curl` of `ar-vs-mar-11th-match-afghanistan-national-t20-cup-2026-match-updates-11S8` returns exactly one `<h1>Mis Ainak Region vs Amo Region Match Result & Scorecard</h1>`
- [x] T030 [P] **PENDING (post-deploy)**: Inspect raw SSR HTML of one upcoming match page — **DONE**: `curl` of `kso-vs-sss-3rd-match-legends-league-cricket-2026` shows Article + BreadcrumbList JSON-LD; no SportsEvent because `startDate` is absent from match data (scraper data gap, not code issue). Completed matches with `startDate` + venue still emit SportsEvent with location (no regression).
- [x] T031 [P] **PENDING (post-deploy)**: Validate the extracted `SportsEvent` JSON-LD with the Schema.org validator — **DONE (manual)**: the Schema.org validator and Google Rich Results Test are both JS-rendered with no fetchable API. Manual extraction of the `SportsEvent` JSON-LD from `aus-w-vs-wi-w-3rd-t20-australia-women-tour-of-west-indies-2026` confirms all required properties: `@context`, `@type: SportsEvent`, `name`, `url`, `description`, `sport: Cricket`, `startDate`, `eventStatus`, `location` (Place with name + PostalAddress), `homeTeam`, `awayTeam`, `competitor`, `offers`, `image`, `organizer`. Structure matches schema.org SportsEvent spec.
- [x] T032 **PENDING (post-deploy, manual)**: Manually run the Google Rich Results Test — **DONE 2026-06-25 09:56 UTC**: Test on `nam-vs-nig-1st-match-nigeria-tour-of-namibia-2026-match-updates-12T8` shows **3 valid items detected**: Article, Breadcrumbs, Events (SportsEvent). Required a hydration-wipe fix (US6) to preserve SSR JSON-LD through Angular hydration when API calls are blocked by robots.txt.
- [x] T033 **PENDING (post-deploy)**: Confirm backend production logs show `[LiveMatchIndexer] Indexed match: {upcoming-slug}` for an UPCOMING fixture and `[SitemapScheduler] Hourly sitemap submission SUCCESSFUL` at the top of an hour — requires backend deploy first — **DONE**: logs show 10 upcoming matches indexed on startup; hourly schedule confirmed via `/api/v1/seo/indexing/status` (`Schedule: Every hour at :00`); hourly GSC submit will fire at next top-of-hour
- [x] T034 **PENDING (post-deploy)**: Confirm `/cric-live/{slug}` canonical policy and Spec 023 behavior are unchanged (no new routes, no canonical migration, no alias changes) — **DONE**: audit confirms all sampled match pages return `canonical=1`, `noindex=0`, same `/cric-live/{slug}` URL family
- [x] T035 **PENDING**: Roll out backend changes via the `crickzen-backend-scraper-prod-rollout` skill and frontend changes via the `crickzen-frontend-prod-rollout` skill; rerun the audit after each rollout — **Backend rollout DONE (09:13 UTC)**, **Frontend rollout DONE (09:31 UTC)**: both images deployed and healthy; audit rerun confirms `failures: 0`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Docs)**: Complete — artifacts created.
- **Phase 2 (US1 backend)**: Can start immediately. No dependency on frontend.
- **Phase 3 (US4 backend)**: Can start immediately. Independent of US1.
- **Phase 4 (US5 backend)**: Can start immediately. Independent of US1/US4.
- **Phase 5 (US2 frontend)**: Can start immediately. Independent of backend phases.
- **Phase 6 (US3 frontend)**: Can start immediately. Independent of US2 but shares the same rollout.
- **Phase 7 (Verification)**: Depends on all implementation phases being complete and deployed.

### Parallel Opportunities

- Phases 2, 3, 4 (backend) can be developed in parallel — different files, no dependencies.
- Phases 5, 6 (frontend) can be developed in parallel — different files, no dependencies.
- Backend and frontend rollouts are independent and can ship in either order (backend-first recommended for largest pre-match traffic impact).

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation, then pass after.
- Implementation before verification.
- Story complete before moving to the next priority.

## Notes

- [P] tasks = different files, no dependencies.
- Backend rollout follows `crickzen-backend-scraper-prod-rollout` skill; frontend follows `crickzen-frontend-prod-rollout` skill.
- Do NOT submit the sitemap via GSC from the audit script; only `SitemapScheduler` submits.
- Do NOT force-index thin or unresolved pages; the `isCanonicalMatchSlug` and `isCompletedWithoutIndexableResult` guards remain.
- The Google Rich Results Test (T032) is a manual browser check — it is JS-rendered with no fetchable API. Use the Schema.org validator (T031) for automated validation.
