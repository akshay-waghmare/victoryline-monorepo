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

- [ ] T018 [US3] Implement HeroCondensedComponent (ts/html/scss) in apps/frontend/src/app/match-live/components/hero-condensed/
- [ ] T019 [US3] Add scroll/intersection logic in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.ts to toggle condensed hero and preserve key data
- [ ] T020 [US3] Add quick link CTA bar in LiveHeroComponent and wire anchor targets in apps/frontend/src/app/cricket-odds/cricket-odds.component.ts for commentary, scorecard, and info sections
- [ ] T021 [US3] Surface staleness tiers and manual retry control in LiveHeroComponent using LiveHeroStateService retry hooks
- [ ] T022 [US3] Display jurisdiction-aware odds placeholder with timestamp/provider metadata in LiveHeroComponent when odds.jurisdictionEnabled is false
- [ ] T023 [US3] Emit AnalyticsService events (hero_view, staleness_warning, odds_placeholder) from apps/frontend/src/app/match-live/services/live-hero-state.service.ts
- [ ] T024 [US3] Guard hero animations with `prefers-reduced-motion` and fine-tune transitions in apps/frontend/src/app/match-live/components/live-hero/live-hero.component.scss

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and validation

- [ ] T025 Update specs/005-live-match-glance/quickstart.md with condensed hero checks and quick-link validation steps
- [ ] T026 Execute the quickstart hero validation checklist and document results in specs/005-live-match-glance/quickstart.md
- [ ] T027 Remove obsolete snapshot header component files in apps/frontend/src/app/cricket-odds/components/snapshot-header/
- [ ] T028 Run `npm run lint` and `ng test --watch=false` in apps/frontend, capturing results in specs/005-live-match-glance/quickstart.md
- [ ] T029 Audit hero SCSS for brand color consistency (light/dark themes) and document confirmations in specs/005-live-match-glance/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)** → required before foundational work
2. **Foundational (Phase 2)** → blocks all user stories
3. **User Stories (Phases 3–5)** → execute in priority order (US1 → US2 → US3); US2 and US3 may run in parallel once their prerequisites are satisfied
4. **Polish (Phase 6)** → after desired user stories are complete

### User Story Dependencies

- **US1** depends on Phase 2 completion; unlocks MVP
- **US2** depends on US1 (shares hero shell/styling) and Phase 2
- **US3** depends on US1 (hero shell) and Phase 2; can overlap with US2 once hero layout stable

### Parallel Opportunities

- T006 and T011/T012 can run in parallel once foundational work is finished (distinct components)
- Analytics (T023) and styling refinements (T024) can proceed concurrently after US3 data hooks exist
- Cleanup tasks (T025–T028) can be distributed after core phases finish

---

## Implementation Strategy

### MVP Scope

- Complete Phases 1–3 (through T010) to ship the glanceable score/chase/odds hero.

### Incremental Delivery

1. MVP (US1) deployed for initial feedback
2. Layer US2 for participant context
3. Finish with US3 trust signals and analytics, then run polish tasks

### Parallel Team Strategy

- Developer A: US1 hero shell + integration
- Developer B: US2 participant pods
- Developer C: US3 freshness/condensed behavior
- Shared polish tasks split once feature-complete
