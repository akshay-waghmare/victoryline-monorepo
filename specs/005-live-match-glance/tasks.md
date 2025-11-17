---

description: "Task list for implementing the Live Match Glance Layout hero"
---

# Tasks: Live Match Glance Layout

**Input**: Design documents from `/specs/005-live-match-glance/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Only add tests when required by individual tasks (none mandated by the spec).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature scaffolding and shared tokens

- [x] T001 Create match-live feature scaffolding (match-live.module.ts and index.ts) under apps/frontend/src/app/match-live/
- [x] T002 Add or extend hero design token definitions in apps/frontend/src/app/shared/ui/tokens/live-hero.tokens.ts using existing brand palette variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and models required by all hero stories

- [x] T003 Create hero view model definitions in apps/frontend/src/app/match-live/services/live-hero.models.ts
- [x] T004 Implement snapshot-to-view adapter in apps/frontend/src/app/match-live/services/live-hero-data.adapter.ts
- [x] T005 Implement LiveHeroStateService combining MatchLiveFacade, MatchApiService, and MatchFallbackService in apps/frontend/src/app/match-live/services/live-hero-state.service.ts

---

## Phase 3: User Story 1 - Instant Match Snapshot (Priority: P1) 🎯 MVP

**Goal**: Deliver the no-scroll hero band showing scoreline, chase context, and odds

**Independent Test**: Load `/cric-live/:slug` and confirm score, innings context, target/required rate, and odds render above the fold without vertical scroll.

- [x] T006 [P] [US1] Implement reusable hero pod shell (hero-pod.component.ts|html|scss) under apps/frontend/src/app/match-live/components/hero-pod/
- [x] T007 [US1] Implement LiveHeroComponent (ts/html/scss) for score, chase context, and odds in apps/frontend/src/app/match-live/components/live-hero/
- [x] T008 [US1] Register LiveHeroComponent and HeroPodComponent in apps/frontend/src/app/match-live/match-live.module.ts and re-export from apps/frontend/src/app/match-live/index.ts
- [x] T009 [US1] Embed <app-live-hero [matchId]="matchId"> in apps/frontend/src/app/cricket-odds/cricket-odds.component.html and remove legacy live-score/odds blocks from that template
- [x] T010 [US1] Update apps/frontend/src/app/cricket-odds/cricket-odds.component.ts to pass matchId to the hero component and drop redundant live-score state fields

---

## Phase 4: User Story 2 - Current Participants Highlight (Priority: P2)

**Goal**: Surface active batters, partnership, and current bowler within the hero band

**Independent Test**: With live data, confirm striker/non-striker pods show runs/balls/strike rate, partnership summary renders, and bowler pod updates on bowling changes without shifting layout.

- [ ] T011 [P] [US2] Create batter pod component (ts/html/scss) in apps/frontend/src/app/match-live/components/batter-card/
- [ ] T012 [P] [US2] Create bowler pod component (ts/html/scss) in apps/frontend/src/app/match-live/components/bowler-card/
- [ ] T013 [US2] Extend LiveHeroComponent template/logic to render batter pods, partnership summary, and bowler card
- [ ] T014 [US2] Enhance live-hero-data.adapter.ts and live-hero-state.service.ts to hydrate batters/bowler from MatchApiService scorecard when snapshot fields are missing
- [ ] T015 [US2] Refine apps/frontend/src/app/match-live/components/live-hero/live-hero.component.scss grid to keep hero within 720px height at 1366×768 and 1024×768 while reusing brand color variables
- [ ] T016 [US2] Retire legacy batsman/bowler tables from apps/frontend/src/app/cricket-odds/cricket-odds.component.html now covered by hero pods
- [ ] T017 [US2] Remove unused batsman/bowler state from apps/frontend/src/app/cricket-odds/cricket-odds.component.ts and rely on LiveHeroStateService outputs

---

## Phase 5: User Story 3 - Trustworthy Live State (Priority: P3)

**Goal**: Communicate freshness, provide sticky condensed hero, and instrument analytics

**Independent Test**: Age snapshot timestamps to trigger warning/error tiers, navigate via quick links while condensed hero stays visible, and verify odds placeholder/analytics events fire when data is missing.

- [x] T018 [US3] Implement HeroCondensedComponent (ts/html/scss) in apps/frontend/src/app/match-live/components/hero-condensed/
- [x] T019 [US3] Add scroll/intersection logic in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.ts to toggle condensed hero and preserve key data
- [x] T020 [US3] Add quick link CTA bar in LiveHeroComponent and wire anchor targets in apps/frontend/src/app/cricket-odds/cricket-odds.component.ts for commentary, scorecard, and info sections
- [x] T021 [US3] Surface staleness tiers and manual retry control in LiveHeroComponent using LiveHeroStateService retry hooks
- [ ] T022 [US3] Display jurisdiction-aware odds placeholder with timestamp/provider metadata in LiveHeroComponent when odds.jurisdictionEnabled is false (DEFERRED)
- [x] T023 [US3] Emit AnalyticsService events (hero_view, staleness_warning, odds_placeholder) from apps/frontend/src/app/match-live/services/live-hero-state.service.ts
- [x] T024 [US3] Guard hero animations with `prefers-reduced-motion` and fine-tune transitions in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.scss

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and validation

- [x] T025 Update specs/005-live-match-glance/quickstart.md with condensed hero checks and quick-link validation steps
- [x] T026 Execute the quickstart hero validation checklist and document results in specs/005-live-match-glance/quickstart.md
- [x] T027 Remove obsolete snapshot header component files in apps/frontend/src/app/cricket-odds/components/snapshot-header/
- [x] T028 Run `npm run lint` and `ng test --watch=false` in apps/frontend, capturing results in specs/005-live-match-glance/quickstart.md
- [x] T029 Audit hero SCSS for brand color consistency (light/dark themes) and document confirmations in specs/005-live-match-glance/quickstart.md

---

## Phase 7: Mobile Responsiveness (Priority: P2) 📱

**Goal**: Transform the live match page for 375px-768px viewports with touch-optimized layout

**Independent Test**: Open `/cric-live/:slug` on Chrome DevTools mobile emulation (iPhone SE, Pixel 5) and confirm sticky header renders, compact score card displays, stats tables scroll horizontally, and quick links are touch-friendly (44px minimum).

**Known Limitations**: 
- No commentary API available → Commentary section deferred
- No partnership data in MatchDTO → Partnership display deferred

- [x] T030 [P] [Mobile] Create mobile-first CSS media queries in apps/frontend/src/app/cricket-odds/cricket-odds.component.css targeting 375px-768px viewports
- [ ] T031 [Mobile] Implement sticky header with back button and match title for mobile in apps/frontend/src/app/cricket-odds/cricket-odds.component.html (DEFERRED - Not in current wireframe scope)
- [x] T032 [Mobile] Create compact score card variant with live status badge (reduce hero height from 25vh to 15vh on mobile) in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css
- [x] T033 [Mobile] Optimize batsman/bowler stats tables for mobile display - hide non-essential columns, use fixed table layout (NO horizontal scroll) in apps/frontend/src/app/cricket-odds/cricket-odds.component.css
- [x] T034 [Mobile] Add touch-friendly quick links navigation bar (44px minimum tap target) in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css
- [ ] T035 [Mobile] Test responsive layout on Chrome DevTools device emulation (iPhone SE 375px, Pixel 5 393px, iPad Mini 768px) and document results in specs/005-live-match-glance/quickstart.md
- [x] T036 [Mobile] Hide odds by default on mobile viewports (leverage existing showOdds toggle, set initial state based on viewport width) in apps/frontend/src/app/cricket-odds/cricket-odds.component.ts
- [ ] T037 [Mobile] Add hamburger menu consideration for future navigation (document pattern in specs/005-live-match-glance/plan.md) (DEFERRED - Future enhancement)
- [x] T038 [Mobile] Fix horizontal viewport overflow - ensure hero and all containers fit within 100vw with proper padding and no horizontal scroll in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css and cricket-odds.component.css
- [x] T039 [Mobile] Fix mobile content visibility - increase font sizes, fix hero data display, make batsman names readable, implement edge-to-edge layout for full width utilization
- [x] T040 [Mobile] Constrain hero component height - limit to 25vh max-height (was taking 70% of screen), reduce padding/gaps, optimize font sizes to fit
- [x] T041 [Mobile] Implement 2-column hero layout - current ball (left) + score (right), hide redundant 'last 6 balls', show chase summary instead, maximize width with 1px edge spacing
- [x] T042 [Mobile] Remove max-height constraint and overflow:hidden from hero to prevent content clipping on mobile
- [x] T043 [Mobile] Make main container and hero edge-to-edge (100vw) like footer for maximum space utilization
- [x] T044 [Mobile] Replace text labels with icons only - match info (location icon), timestamp (clock icon) for space saving
- [x] T045 [Mobile] Ensure hero pods stay visible on <=768px by using grid template areas and removing extra-small max-height clamps in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css
- [x] T046 [Mobile] Make mat-card/main containers span 100vw with zero padding/margins (edge-to-edge layout) in apps/frontend/src/app/cricket-odds/cricket-odds.component.css

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)** → required before foundational work
2. **Foundational (Phase 2)** → blocks all user stories
3. **User Stories (Phases 3–5)** → execute in priority order (US1 → US2 → US3); US2 and US3 may run in parallel once their prerequisites are satisfied
4. **Polish (Phase 6)** → after desired user stories are complete
5. **Mobile Responsiveness (Phase 7)** → depends on Phase 3 (US1) completion; requires hero shell and score card components to be in place

### User Story Dependencies

- **US1** depends on Phase 2 completion; unlocks MVP
- **US2** depends on US1 (shares hero shell/styling) and Phase 2
- **US3** depends on US1 (hero shell) and Phase 2; can overlap with US2 once hero layout stable
- **Mobile (Phase 7)** depends on US1 (hero layout and score card); can proceed without US2/US3

### Parallel Opportunities

- T006 and T011/T012 can run in parallel once foundational work is finished (distinct components)
- Analytics (T023) and styling refinements (T024) can proceed concurrently after US3 data hooks exist
- Cleanup tasks (T025–T029) can be distributed after core phases finish
- Mobile tasks (T030-T037) can run independently once Phase 3 (US1) is complete; T030-T034 can be worked in parallel by different developers (distinct SCSS files)

---

## Implementation Strategy

### MVP Scope

- Complete Phases 1–3 (through T010) to ship the glanceable score/chase/odds hero.

### Incremental Delivery

1. MVP (US1) deployed for initial feedback
2. Layer US2 for participant context (DEFERRED)
3. Finish with US3 trust signals and analytics, then run polish tasks
4. Add mobile responsiveness (Phase 7) for 375px-768px viewports

### Parallel Team Strategy

- Developer A: US1 hero shell + integration
- Developer B: US2 participant pods (DEFERRED)
- Developer C: US3 freshness/condensed behavior
- Developer D: Mobile responsiveness (T030-T037)
- Shared polish tasks split once feature-complete

### Current Status (2025-11-15)

- **Completed**: Phases 1-3 (US1 MVP), Phase 5 (US3), Phase 6 (Polish) ✅
- **Deferred**: Phase 4 (US2) - Awaiting partnership data in MatchDTO
- **In Progress**: Phase 7 (Mobile Responsiveness) - Planning complete, implementation pending
- **Known Limitations**: 
  - Commentary API not available → Commentary section deferred
  - Partnership data not in MatchDTO → Partnership display deferred
