# Tasks: Long-Tail Match SEO Recovery

**Input**: Design documents from `/specs/015-long-tail-match-seo/`
**Prerequisites**: `plan.md`, `spec.md`

**Tests**: Targeted tests and HTML audit are required because this is Search Console recovery work.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish baseline evidence and shared helpers before changing page behavior.

- [ ] T001 Create baseline SEO audit sample list in `specs/015-long-tail-match-seo/audit-samples.txt`
- [ ] T002 [P] Add initial `scripts/Audit-MatchSeo.ps1` that accepts URL list and reports status, title, description, canonical, robots, H1 count, word count, OG/Twitter, JSON-LD count, and sitemap hit
- [ ] T003 [P] Add slug/title normalization fixtures for small matches in `apps/frontend/src/app/seo/match-seo.fixtures.ts`
- [ ] T004 Run baseline audit against prod and save output in `specs/015-long-tail-match-seo/baseline-audit.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared metadata/indexability primitives that all user stories depend on.

**CRITICAL**: No user story work should ship until this phase is complete.

- [ ] T005 Implement canonical tag create/update/remove helpers in `apps/frontend/src/app/seo/meta-tags.service.ts`
- [ ] T006 Implement robots tag helper and single-canonical enforcement in `apps/frontend/src/app/seo/meta-tags.service.ts`
- [ ] T007 Implement match slug parser and title-safe formatter in `apps/frontend/src/app/seo/url-utils.ts`
- [ ] T008 Add frontend unit tests for slug parsing, title length, and noisy suffix removal in `apps/frontend/src/app/seo/url-utils.spec.ts`
- [ ] T009 Add `MatchSeoViewModel` interface in `apps/frontend/src/app/seo/match-seo.models.ts`
- [ ] T010 Implement match SEO decision builder in `apps/frontend/src/app/seo/match-seo.service.ts`
- [ ] T011 Add unit tests for indexable/noindex/not-found decisions in `apps/frontend/src/app/seo/match-seo.service.spec.ts`

**Checkpoint**: Metadata/indexability helpers are ready for route integration.

---

## Phase 3: User Story 1 - Google Sees One Canonical Match URL (Priority: P1) MVP

**Goal**: Valid match pages self-canonicalize and expose unique SSR metadata.

**Independent Test**: Fetch a sampled `/cric-live/{slug}` URL and verify exactly one canonical equal to that URL plus unique title/description/social tags.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add SSR metadata regression test for valid match canonical in `apps/frontend/src/app/cricket-odds/cricket-odds.component.spec.ts`
- [ ] T013 [P] [US1] Add audit assertion for single canonical and canonical-not-home in `scripts/Audit-MatchSeo.ps1`

### Implementation for User Story 1

- [ ] T014 [US1] Remove or neutralize static root canonical in `apps/frontend/src/index.html`
- [ ] T015 [US1] Wire `MatchSeoService` into `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T016 [US1] Update match page metadata in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` to set title, description, canonical, robots, OG, and Twitter in one call
- [ ] T017 [US1] Ensure SSR renders metadata before response completion in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T018 [US1] Verify `/cric-live/pak-w-vs-wi-w-2nd-match-ireland-womens-t20i-tri-series-2026-match-updates-11BU` canonical is self-referencing using `scripts/Audit-MatchSeo.ps1`

**Checkpoint**: User Story 1 is complete when sampled valid pages no longer canonicalize to `/`.

---

## Phase 4: User Story 2 - Thin or Unknown Match URLs Do Not Become Soft 404s (Priority: P1)

**Goal**: Unknown/fallback URLs are not indexed as generic cricket pages.

**Independent Test**: Fetch `/cric-live/445` and verify it is `404` or `noindex,follow` and does not use `Team A vs Team B` indexable metadata.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add fallback/noindex tests in `apps/frontend/src/app/seo/match-seo.service.spec.ts`
- [ ] T020 [P] [US2] Add audit assertion that `Team A` or `Team B` pages cannot be indexable in `scripts/Audit-MatchSeo.ps1`

### Implementation for User Story 2

- [ ] T021 [US2] Detect unresolved numeric routes in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T022 [US2] Add noindex fallback rendering state in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T023 [US2] Set `robots=noindex,follow` for unresolved fallback pages in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T024 [US2] Optionally return HTTP 404 for clearly invalid match routes via SSR response token in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T025 [US2] Verify `/cric-live/445` no longer appears as an indexable generic page using `scripts/Audit-MatchSeo.ps1`

**Checkpoint**: User Story 2 is complete when unresolved URLs cannot create soft-404 indexable pages.

---

## Phase 5: User Story 3 - Smaller Matches Get Search-Relevant Content (Priority: P2)

**Goal**: Small domestic/qualifier pages have useful long-tail copy in initial SSR HTML.

**Independent Test**: Fetch small-match examples and verify H1/body include teams, league, match number, format, status, score/result, and commentary/scorecard wording.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add match copy builder tests for Afghanistan One Day Cup, T20 Blast, UP T10, and women’s tri-series examples in `apps/frontend/src/app/seo/match-seo.service.spec.ts`
- [ ] T027 [P] [US3] Add audit assertion for H1 count and minimum match-specific word count in `scripts/Audit-MatchSeo.ps1`

### Implementation for User Story 3

- [ ] T028 [US3] Add visible H1 for all match pages in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T029 [US3] Add crawlable match context summary section in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T030 [US3] Populate match context summary from `MatchSeoViewModel` in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T031 [US3] Normalize `ODI`, `T20I`, `T20`, match number, and league labels in `apps/frontend/src/app/seo/url-utils.ts`
- [ ] T032 [US3] Verify `BR vs SGR`, `GLCS vs GLM`, and `AA vs GG` sample titles/body copy using `scripts/Audit-MatchSeo.ps1`

**Checkpoint**: User Story 3 is complete when small-match pages read like intentional match pages, not scraper fallback shells.

---

## Phase 6: User Story 4 - Crawl Paths Point Toward Canonical Match Pages (Priority: P2)

**Goal**: Google can discover and follow canonical match pages from site surfaces and sitemap.

**Independent Test**: Crawl home/matches/match pages and verify incoming/outgoing `<a href>` links plus sitemap canonical alignment.

### Tests for User Story 4

- [ ] T033 [P] [US4] Add sitemap canonical filter tests in `apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/SitemapCanonicalFilterTest.java`
- [ ] T034 [P] [US4] Add frontend anchor rendering tests for match cards in `apps/frontend/src/app/features/matches/components/match-card/match-card.component.spec.ts`

### Implementation for User Story 4

- [ ] T035 [US4] Render match card navigation as crawlable anchors in `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- [ ] T036 [US4] Ensure home page match links are crawlable anchors in `apps/frontend/src/app/home/home.component.html`
- [ ] T037 [US4] Add outgoing links from match pages to `/matches` and `/live-cricket-score` in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T038 [US4] Exclude unresolved numeric aliases and non-canonical URLs in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java`
- [ ] T039 [US4] Verify sitemap URLs are self-canonical using `scripts/Audit-MatchSeo.ps1`

**Checkpoint**: User Story 4 is complete when sitemap and internal links point only to canonical match pages.

---

## Phase 7: User Story 5 - Structured Data Is Valid and Useful (Priority: P3)

**Goal**: JSON-LD reflects real match data and stops using placeholders.

**Independent Test**: Parse JSON-LD for sampled match pages and verify no fake team/stadium/URL values.

### Tests for User Story 5

- [ ] T040 [P] [US5] Add structured data tests in `apps/frontend/src/app/seo/structured-data.service.spec.ts`
- [ ] T041 [P] [US5] Add backend structured data regression tests in `apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/StructuredDataControllerTest.java`

### Implementation for User Story 5

- [ ] T042 [US5] Update `apps/frontend/src/app/seo/structured-data.service.ts` to omit undefined optional fields instead of emitting placeholders
- [ ] T043 [US5] Render match JSON-LD from `MatchSeoViewModel` in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T044 [US5] Remove fake `Cricket Stadium`, `Home Team`, and `Away Team` values from `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/StructuredDataController.java`
- [ ] T045 [US5] Align breadcrumb JSON-LD URLs with `/cric-live/{slug}` canonical URLs in `apps/frontend/src/app/seo/structured-data.service.ts`
- [ ] T046 [US5] Verify JSON-LD validity for sampled pages using `scripts/Audit-MatchSeo.ps1`

**Checkpoint**: User Story 5 is complete when sampled JSON-LD has no placeholder validation errors.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T047 Run `NODE_OPTIONS=--openssl-legacy-provider npm run build` in `apps/frontend`
- [ ] T048 Run focused backend SEO tests in `apps/backend/spring-security-jwt`
- [ ] T049 Run `scripts/Audit-MatchSeo.ps1` against baseline sample URLs locally
- [ ] T050 Deploy frontend/backend safely from clean commit/image pins, avoiding prod dirty tree rebuilds
- [ ] T051 Run `scripts/Audit-MatchSeo.ps1` against production URLs and save output in `specs/015-long-tail-match-seo/prod-audit.md`
- [ ] T052 Submit Search Console validation only after prod audit shows canonical/H1/soft-404 fixes
- [ ] T053 Document deployment image tags, env backups, and remaining GSC lag expectations in `specs/015-long-tail-match-seo/rollout.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks user story work.
- **US1 and US2 (P1)**: Start after Foundational; both required for MVP.
- **US3 and US4 (P2)**: Start after US1 metadata helpers are stable.
- **US5 (P3)**: Start after `MatchSeoViewModel` is stable.
- **Polish**: Depends on selected user stories.

### MVP Scope

MVP is **US1 + US2**:
1. Fix self-canonical match pages.
2. Prevent unresolved/thin fallback URLs from being indexable.
3. Run audit against GSC examples before revalidation.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T008, T011, T012, T013, T019, T020, T026, T027, T033, T034, T040, and T041 are parallelizable test tasks.
- US3 content and US4 sitemap/internal-link work can run in parallel after US1.

## Implementation Strategy

1. Fix canonical correctness before trying to grow content; otherwise sitemap/internal links point to pages Google still consolidates away.
2. Fix soft-404/noindex handling before adding more match URLs; otherwise more crawlable URLs can worsen GSC coverage.
3. Add long-tail copy and internal links after indexability is trustworthy.
4. Clean structured data last so schema reflects final canonical/content model.
