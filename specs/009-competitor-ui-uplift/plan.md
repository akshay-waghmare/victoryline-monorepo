# Implementation Plan: Competitor-Informed UI Uplift

**Feature Branch**: `009-competitor-ui-uplift`  
**Created**: 2026-03-07

---

## Priority Summary

| Priority | Story | Impact | Effort |
|----------|-------|--------|--------|
| **P1** | US1: Match Card with Flags & Series Context | 🔴 Critical — every user sees match cards | Medium (12 tasks) |
| **P1** | US2: Enhanced Scorecard | 🔴 Critical — second most-visited page | Medium (9 tasks) |
| **P1** | US3: Remove Sidebar, Unified Nav | 🔴 Critical — fixes navigation confusion | Low (5 tasks) |
| **P2** | US4: Series Pages | 🟡 High — enables series browsing | Medium (7 tasks) |
| **P2** | US5: Match Detail Tabs | 🟡 High — increases engagement | Medium (7 tasks) |
| **P2** | US6: Unified Colors | 🟠 Moderate — visual consistency | Medium (5 tasks) |
| **P2** | US7: Mobile Bottom Tab Bar | 🟡 High — mobile UX standard | Low (5 tasks) |
| **P2** | US9: Match Ticker Strip | 🟡 High — competitor table-stakes | Medium (5 tasks) |
| **P3** | US8: Stats Section | 🟠 Moderate — discovery feature | Medium (6 tasks) |

---

## Week-by-Week Plan

### Week 1: Foundation
**Goal**: Ship match cards with team flags and series context

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | T001 (install flags), T002 (TeamFlagComponent), T003 (TeamAssetService) | Flag rendering works in isolation |
| Tue | T004 (SeriesBadgeComponent), T005 (CountdownTimerComponent) | Shared components ready |
| Wed | T006-T008 (integrate into MatchCard) | Match cards show flags + series + countdown |
| Thu | T009-T011 (POTM, favorite indicator, CSS) | Complete match card redesign |
| Fri | T012 (data model), integration testing | Match card fully enhanced |

### Week 2: Color System & Sidebar Removal
**Goal**: Eliminate visual inconsistency and legacy sidebar

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | T013 (scorecard purple), T015 (legacy CSS vars) | Scorecard uses blue, no legacy vars |
| Tue | T014 (cricket-odds 2657 lines) — big task | Cricket-odds color migration (50%+) |
| Wed | T014 continued, T016 (!important reduction) | Most hardcoded colors eliminated |
| Thu | T027-T029 (sidebar removal) | Sidebar gone, content full-width |
| Fri | T030-T031 (cleanup), T017 (verify styles) | Clean navigation, unified colors |

### Week 3: Scorecard Enhancement
**Goal**: Ship partnerships, FOW, yet-to-bat on scorecard

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | T018 (FOW component), T019 (Partnership bar) | Sub-components render in isolation |
| Tue | T020 (YetToBat), T026 (design token styling) | All sub-components complete |
| Wed | T021-T023 (integrate into Scorecard) | Scorecard shows all new sections |
| Thu | T024 (data model), T025 (clickable players) | Scorecard fully enhanced |
| Fri | Testing, responsive checks | Scorecard matches Crex quality |

### Week 4: Match Ticker & Bottom Tab Bar
**Goal**: Add persistent match awareness and mobile navigation

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | T032 (TickerCard), T033 (MatchTicker) | Ticker component complete |
| Tue | T034-T036 (integrate, connect, WebSocket) | Live ticker on all pages |
| Wed | T037 (BottomTabBar), T038 (integrate) | Bottom tabs visible on mobile |
| Thu | T039-T041 (More menu, safe area, active state) | Bottom tabs fully functional |
| Fri | Cross-device testing | Navigation overhaul complete |

### Week 5-6: Series Pages & Match Detail
**Goal**: Add series browsing and richer match detail

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1-2 | T042-T043 (SeriesService, models) | Series data plumbing ready |
| Day 3-4 | T044-T045 (SeriesList, SeriesDetail) | Series pages render |
| Day 5 | T046-T048 (routes, navbar, homepage grouping) | Series fully integrated |
| Day 6-7 | T049 (match tabs), T050-T052 (Overs, Commentary, Squads) | Match detail components |
| Day 8-9 | T053-T055 (commentary service, POTM, info tab) | Match detail complete |
| Day 10 | Integration testing | Series + Match detail verified |

### Week 7: Stats Section
**Goal**: Add tournament leaderboards

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1-2 | T056-T057 (StatsService, models) | Stats data plumbing |
| Day 3-4 | T058-T059 (Leaderboard, route) | Stats page renders |
| Day 5 | T060-T061 (navbar, filter) | Stats fully integrated |

### Week 8: Polish & Ship
**Goal**: Quality assurance, performance, cleanup

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1 | T062 (cross-browser) | All browsers verified |
| Day 2 | T063 (Lighthouse audit) | Performance ≥ 85, a11y ≥ 95 |
| Day 3 | T064 (visual regression) | No regressions |
| Day 4 | T065-T066 (responsive, dark theme) | All viewports + dark mode verified |
| Day 5 | T067-T068 (WebSocket test, dead code) | Clean ship |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Backend APIs not ready for series/stats/commentary | Create mock data services with realistic data; swap to real API when available |
| 2657-line CSS refactor introduces visual regressions | Make incremental changes, test each page after every batch of color replacements |
| Sidebar removal breaks admin features | Audit all sidebar links first; ensure admin routes remain accessible via navbar "More" menu |
| Circle-flags package doesn't have all team codes | Create fallback to 2-letter abbreviation badge for unknown teams |
| Angular 7 limits component features | Use custom implementations (no reliance on Angular 14+ features) |

---

## Definition of Done

- [ ] All match cards show team flags, series badge, countdown (upcoming), POTM (completed)
- [ ] Scorecard shows FOW, partnerships, yet-to-bat sections
- [ ] No sidebar visible on any page
- [ ] Match ticker strip visible below navbar on all pages
- [ ] Bottom tab bar visible on mobile (< 768px)
- [ ] Series listing page accessible at /series with month grouping
- [ ] Stats leaderboard accessible at /stats
- [ ] Match detail page has 6+ tabs (Info/Live/Scorecard/Squads/Overs/Commentary)
- [ ] Zero hardcoded purple gradients in CSS
- [ ] Zero legacy CSS custom properties (--primary-color etc.)
- [ ] `!important` count < 10 across all CSS
- [ ] Lighthouse Performance ≥ 85 (mobile)
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Dark theme works on all new components
- [ ] All new components follow BEM naming convention
