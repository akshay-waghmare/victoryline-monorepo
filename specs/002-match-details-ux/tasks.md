# Tasks — Match Details UI/UX Redesign (Feature 002)

This plan is organized by phases and user stories. Each task is independently actionable and follows the required checklist format.

## Phase 1: Setup

- [X] T001 Ensure feature branch checked out: 002-match-details-ux
- [X] T002 Verify WebSocket channel/topic names and endpoints used by existing services (MatchService/EventListService) and document in specs/002-match-details-ux/contracts/openapi.yaml
- [X] T003 Add .gitignore rules for local DB artifacts if missing (apps/backend/spring-security-jwt/testdb.mv.db)
- [X] T004 Prepare enhancement plan for existing match detail page at apps/frontend/src/app/cricket-odds/cricket-odds.component.{ts,html,css} (no new module)
- [X] T005 Create shared WebSocket client/facade skeleton leveraging existing services in apps/frontend/src/app/cricket-odds/match-live.facade.ts
- [X] T006 Create REST client service skeleton mapping contracts in apps/frontend/src/app/cricket-odds/match-api.service.ts
- [X] T007 Add a11y testing script placeholder (axe) docs reference in apps/frontend/docs/features/002-match-details-ux/README.md

## Phase 2: Foundational

- [ ] T008 Confirm existing route to match detail page ('cric-live/:path') in apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts
- [ ] T009 [P] Refactor base layout of apps/frontend/src/app/cricket-odds/cricket-odds.component.html to include ARIA landmarks and tab structure (Summary, Commentary, Scorecard, Lineups, Info)
- [ ] T010 Implement reduced motion CSS custom properties & utility classes (no SCSS) in apps/frontend/src/styles.css
- [ ] T011 [P] Implement StalenessIndicator component in apps/frontend/src/app/shared/components/staleness-indicator/staleness-indicator.{ts,html,css}
- [ ] T012 Define types/interfaces from data-model.md in apps/frontend/src/app/shared/models/match.models.ts
- [ ] T013 [P] Implement WebSocket connection management (connect/reconnect/backoff) in apps/frontend/src/app/cricket-odds/match-live.facade.ts
- [ ] T014 Implement polling fallback (≤5s) behind feature flag in apps/frontend/src/app/cricket-odds/match-fallback.service.ts
- [ ] T015 Add analytics event hooks (tab_change, commentary_load_more, snapshot_refresh) in apps/frontend/src/app/cricket-odds/analytics.service.ts

## Phase 3: User Story 1 — Live Match Snapshot (P1)

- [ ] T016 [US1] Create SnapshotHeader component in apps/frontend/src/app/cricket-odds/components/snapshot-header/snapshot-header.{ts,html,css}
- [ ] T017 [P] [US1] Bind WebSocket snapshot stream to SnapshotHeader via facade in apps/frontend/src/app/cricket-odds/match-live.facade.ts
- [ ] T018 [US1] Render CRR/RRR, score, overs, wickets, teams, recent balls per spec in snapshot-header.html
- [ ] T019 [US1] Integrate StalenessIndicator into SnapshotHeader with tiers from constitution in snapshot-header.ts
- [ ] T020 [P] [US1] Unit tests for SnapshotHeader rendering states in apps/frontend/src/app/cricket-odds/components/snapshot-header/snapshot-header.spec.ts

## Phase 4: User Story 2 — Commentary Narrative (P2)

- [ ] T021 [US2] Create CommentaryList component in apps/frontend/src/app/cricket-odds/components/commentary-list/commentary-list.{ts,html,css}
- [ ] T022 [P] [US2] Implement latest-first render and visual highlights (wicket/boundary) in commentary-list.html
- [ ] T023 [US2] WebSocket subscription for new commentary entries and prepend strategy in apps/frontend/src/app/cricket-odds/match-live.facade.ts
- [ ] T024 [US2] Implement Load More (pageSize=30) via REST contract in apps/frontend/src/app/cricket-odds/match-api.service.ts
- [ ] T025 [P] [US2] Virtualize long list (≥200 entries) using Angular CDK Virtual Scroll in commentary-list.ts
- [ ] T026 [US2] Accessible semantics: list roles, non-color cues, live region polite updates in commentary-list.ts

## Phase 5: User Story 3 — Detailed Scorecard (P3)

- [ ] T027 [US3] Create Scorecard view with tabs per innings in apps/frontend/src/app/cricket-odds/components/scorecard/scorecard.{ts,html,css}
- [ ] T028 [P] [US3] Render batting table with accessible headers and SR calc in scorecard.html
- [ ] T029 [US3] Render bowling table and economy calc in scorecard.html
- [ ] T030 [US3] Render extras and fall-of-wickets ordered list in scorecard.html
- [ ] T031 [P] [US3] Fetch scorecard via REST contract in apps/frontend/src/app/cricket-odds/match-api.service.ts

## Phase 6: User Story 4 — Team Lineups & Roles (P4)

- [ ] T032 [US4] Create Lineups view in apps/frontend/src/app/cricket-odds/components/lineups/lineups.{ts,html,css}
- [ ] T033 [P] [US4] Role indicators with accessible legend in lineups.html
- [ ] T034 [US4] Highlight current striker/non-striker and active bowler in live mode in lineups.ts
- [ ] T035 [US4] Fetch lineups via REST contract in apps/frontend/src/app/cricket-odds/match-api.service.ts

## Phase 7: User Story 5 — Match Context (P5)

- [ ] T036 [US5] Create MatchInfo view in apps/frontend/src/app/cricket-odds/components/match-info/match-info.{ts,html,css}
- [ ] T037 [P] [US5] Display venue, toss, officials, format, series in match-info.html
- [ ] T038 [US5] Fetch match info via REST contract in apps/frontend/src/app/cricket-odds/match-api.service.ts

## Phase 8: User Story 6 — Mobile Interaction (P6)

- [ ] T039 [US6] Implement sticky condensed header on scroll threshold in apps/frontend/src/app/cricket-odds/cricket-odds.component.ts
- [ ] T040 [P] [US6] Add collapsible sections for small screens with keyboard operability in apps/frontend/src/app/cricket-odds/cricket-odds.component.html

## Phase 9: User Story 7 — Accessibility & Reduced Motion (P7)

- [ ] T041 [US7] Ensure keyboard traversal order across page, tabs, lists in apps/frontend/src/app/cricket-odds/cricket-odds.component.html
- [ ] T042 [P] [US7] Add :focus-visible styles and non-color cues in apps/frontend/src/styles.css
- [ ] T043 [US7] Respect prefers-reduced-motion in component animations (CSS media query) in apps/frontend/src/styles.css

## Phase 10: User Story 8 — Data Freshness Feedback (P8)

- [ ] T044 [US8] Display last updated time and live/warn/error tiers in SnapshotHeader in snapshot-header.ts
- [ ] T045 [P] [US8] Manual refresh action (when fallback polling active) in snapshot-header.html

## Final Phase: Polish & Cross-Cutting

- [ ] T046 Add analytics for latency metrics vs server timestamp in apps/frontend/src/app/shared/services/analytics.service.ts
- [ ] T047 [P] Lighthouse & axe CI docs update in apps/frontend/docs/features/002-match-details-ux/README.md
- [ ] T048 Scroll performance audit for commentary (avoid layout shift) in apps/frontend/src/app/cricket-odds/components/commentary-list/commentary-list.ts
- [ ] T049 Error states with retry across views in apps/frontend/src/app/cricket-odds/cricket-odds.component.html
- [ ] T050 Update Constitution compliance notes in specs/002-match-details-ux/plan.md

## Dependencies (User Story Graph)

- US1 → US2 → US3/US4/US5 (parallel) → US6/US7/US8 (can be parallel after US1 shell)

## Parallel Execution Examples

- T009, T011, T013 can run in parallel (different files)
- US3 (T028–T031) and US4 (T032–T035) can run in parallel once US1/US2 base is done
- A11y and Motion tasks (T042, T043) parallel to polish tasks

## Implementation Strategy

- MVP: Complete US1 (SnapshotHeader) with WebSocket live updates, staleness indicators, and route shell.
- Incrementally add US2 commentary with virtualization and paging; then US3/US4/US5 in parallel.
- Ensure a11y and reduced motion compliance before final polish.
