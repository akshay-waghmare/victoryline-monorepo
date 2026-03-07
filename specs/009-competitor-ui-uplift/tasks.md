# Tasks: Competitor-Informed UI Uplift

**Input**: Design documents from `specs/009-competitor-ui-uplift/`  
**Generated**: 2026-03-07  
**Branch**: `009-competitor-ui-uplift`

**Prerequisites**: ✅ spec.md, ✅ research.md

**Organization**: Tasks grouped by user story and phase. [P] = parallelizable, [US#] = user story reference.

---

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundation & Match Card Uplift (Week 1-2)

### 1A. Team Flags & Shared Components

- [ ] T001 [P] [US1] Install `circle-flags` SVG package via npm in `apps/frontend/package.json`
- [ ] T002 [P] [US1] Create `TeamFlagComponent` at `apps/frontend/src/app/shared/components/team-flag/team-flag.component.ts` — input: teamCode, size (sm/md/lg); renders SVG flag with fallback to 2-letter abbreviation badge
- [ ] T003 [P] [US1] Create team-code-to-flag mapping service at `apps/frontend/src/app/core/services/team-asset.service.ts` — map team abbreviations to ISO country codes
- [ ] T004 [P] [US1] Create `SeriesBadgeComponent` at `apps/frontend/src/app/shared/components/series-badge/series-badge.component.ts` — input: seriesName, seriesSlug; renders clickable chip with series name and arrow icon
- [ ] T005 [P] [US1] Create `CountdownTimerComponent` at `apps/frontend/src/app/shared/components/countdown-timer/countdown-timer.component.ts` — input: targetDate; displays "Starting in Xh Ym" with real-time countdown using RxJS interval; shows "Tomorrow HH:MM" if > 24h; shows "Live" if in past

### 1B. Match Card Enhancement

- [ ] T006 [US1] Add team flag display to `MatchCardComponent` template at `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html` — place `<app-team-flag>` next to each team name
- [ ] T007 [US1] Add series badge to `MatchCardComponent` template — place `<app-series-badge>` at top of card above match type
- [ ] T008 [US1] Add countdown timer to `MatchCardComponent` for upcoming matches — replace static time with `<app-countdown-timer>` for matches with status "upcoming"
- [ ] T009 [US1] Add Player of the Match display to `MatchCardComponent` — show POTM name and key stat at bottom of completed match cards
- [ ] T010 [US1] Add favorite indicator to `MatchCardComponent` — subtle badge showing predicted winner when odds data available
- [ ] T011 [US1] Update `MatchCardComponent` CSS to accommodate new elements — adjust grid layout, ensure team flags align, series badge fits in card header
- [ ] T012 [US1] Update `MatchCardComponent` data model — extend match interface to include `seriesName`, `seriesSlug`, `potmName`, `potmStat`, `team1FlagCode`, `team2FlagCode`

### 1C. Color System Unification

- [ ] T013 [P] [US6] Replace purple gradient in `apps/frontend/src/app/scorecard/scorecard.component.css` — change `#667eea → #764ba2` to `var(--color-primary)` throughout
- [ ] T014 [P] [US6] Audit and replace hardcoded hex colors in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css` — replace all color literals with `--color-*` custom properties (2657 lines)
- [ ] T015 [P] [US6] Migrate legacy CSS variables in `apps/frontend/src/styles.css` — replace `--primary-color`, `--accent-color`, `--background-color`, `--muted-color` with `--color-primary`, `--color-warning`, `--color-background`, `--color-text-secondary`
- [ ] T016 [P] [US6] Reduce `!important` overrides in `apps/frontend/src/styles.css` — refactor mobile overrides to use proper specificity instead of `!important` (target: from 29+ to <10)
- [ ] T017 [US6] Verify angular.json loads `styles.scss` as primary — check if `styles.css` can be consolidated into `styles.scss` or if both need to coexist

---

## Phase 2: Scorecard Enhancement (Week 3-4)

### 2A. Scorecard Sub-Components

- [ ] T018 [P] [US2] Create `FallOfWicketsComponent` at `apps/frontend/src/app/features/matches/components/fall-of-wickets/fall-of-wickets.component.ts` — input: fowData array; renders table with columns: Batsman, Score-Wicket, Over
- [ ] T019 [P] [US2] Create `PartnershipBarComponent` at `apps/frontend/src/app/features/matches/components/partnership-bar/partnership-bar.component.ts` — input: partnershipData; renders horizontal bar with proportional color split, batter names and runs on each side
- [ ] T020 [P] [US2] Create `YetToBatComponent` at `apps/frontend/src/app/features/matches/components/yet-to-bat/yet-to-bat.component.ts` — input: playerList; renders horizontal row of mini player cards with avatar/silhouette, name, and batting average

### 2B. Scorecard Integration

- [ ] T021 [US2] Integrate `FallOfWicketsComponent` into `ScorecardComponent` template — add below bowling table per innings
- [ ] T022 [US2] Integrate `PartnershipBarComponent` into `ScorecardComponent` template — add below fall of wickets as "Partnerships" section
- [ ] T023 [US2] Integrate `YetToBatComponent` into `ScorecardComponent` template — add below partnerships for live matches
- [ ] T024 [US2] Update `ScorecardComponent` data model — extend scorecard interface to include `fallOfWickets[]`, `partnerships[]`, `yetToBat[]`
- [ ] T025 [US2] Add clickable player names in batting table dismissal strings — wrap fielder/bowler names in `routerLink` to player profiles
- [ ] T026 [US2] Style scorecard sub-components using unified design tokens — ensure all new sections use `--color-*` variables, not hardcoded colors

---

## Phase 3: Navigation Overhaul (Week 5-6)

### 3A. Sidebar Removal

- [ ] T027 [US3] Remove `SidebarComponent` from `AdminLayoutsComponent` template at `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.html`
- [ ] T028 [US3] Update `AdminLayoutsComponent` CSS — remove sidebar width offset, make content container full-width
- [ ] T029 [US3] Remove sidebar toggle logic from `AdminLayoutsComponent` TypeScript
- [ ] T030 [US3] Remove `SidebarComponent` declaration from `ComponentsModule` at `apps/frontend/src/app/component/components.module.ts`
- [ ] T031 [US3] Remove sidebar-related global CSS from `apps/frontend/src/styles.css` (sidebar hide/show rules, width offsets)

### 3B. Match Ticker Strip

- [ ] T032 [P] [US9] Create `MatchTickerCardComponent` at `apps/frontend/src/app/shared/components/match-ticker/ticker-card/ticker-card.component.ts` — compact match card showing: team flags + abbreviated names, scores, status badge, series label
- [ ] T033 [US9] Create `MatchTickerComponent` at `apps/frontend/src/app/shared/components/match-ticker/match-ticker.component.ts` — horizontal scrollable container with left/right nav arrows on desktop, swipe on mobile
- [ ] T034 [US9] Integrate `MatchTickerComponent` into `AppComponent` template — position below navbar, above router-outlet
- [ ] T035 [US9] Connect `MatchTickerComponent` to matches service — subscribe to live + recent matches, sort live first
- [ ] T036 [US9] Add WebSocket score update handling to ticker — animate score changes on live match updates

### 3C. Mobile Bottom Tab Bar

- [ ] T037 [P] [US7] Create `BottomTabBarComponent` at `apps/frontend/src/app/core/layout/bottom-tab-bar/bottom-tab-bar.component.ts` — fixed bottom nav with icons: Home (🏠), Matches (🏏), Series (📋), More (⋯)
- [ ] T038 [US7] Add `BottomTabBarComponent` to `AppComponent` template — conditionally show only on mobile (< 768px) using CSS or `BreakpointObserver`
- [ ] T039 [US7] Implement "More" menu in bottom tab bar — slide-up panel with links: Players, Teams, Stats, Settings, About
- [ ] T040 [US7] Add safe area inset support to bottom tab bar — `env(safe-area-inset-bottom)` padding
- [ ] T041 [US7] Add route-based active state to bottom tab bar — highlight active tab based on current route

---

## Phase 4: Series Pages (Week 5-6, parallel)

- [ ] T042 [P] [US4] Create `SeriesService` at `apps/frontend/src/app/core/services/series.service.ts` — methods: getSeriesList(filters), getSeriesDetail(slug), getPointsTable(seriesId)
- [ ] T043 [P] [US4] Create series data models at `apps/frontend/src/app/core/models/series.models.ts` — interfaces: Series, SeriesFilter, PointsTableEntry
- [ ] T044 [US4] Create `SeriesListComponent` at `apps/frontend/src/app/features/series/pages/series-list/series-list.component.ts` — month-grouped list with format/type filter dropdowns
- [ ] T045 [US4] Create `SeriesDetailComponent` at `apps/frontend/src/app/features/series/pages/series-detail/series-detail.component.ts` — fixture list + points table tabs
- [ ] T046 [US4] Add routes for `/series` and `/series/:slug` in routing module
- [ ] T047 [US4] Add "Series" link to navbar nav items
- [ ] T048 [US4] Add series-grouped match headers to homepage carousel — group matches by series with "T20 WC 2026 →" headers

---

## Phase 5: Match Detail Enhancement (Week 7-8)

### 5A. Match Tab System

- [ ] T049 [US5] Create match detail tab bar in `CricketOddsComponent` (or new `MatchDetailComponent`) — horizontal tabs: Info, Live, Scorecard, Squads, Overs, Commentary
- [ ] T050 [P] [US5] Create `OverSummaryComponent` at `apps/frontend/src/app/features/matches/components/over-summary/over-summary.component.ts` — grid/list of overs showing ball results with color coding (green=boundary, red=wicket, blue=dot)
- [ ] T051 [P] [US5] Create `CommentaryComponent` at `apps/frontend/src/app/features/matches/components/commentary/commentary.component.ts` — scrollable ball-by-ball text with over headers and event highlighting
- [ ] T052 [P] [US5] Create `SquadViewComponent` at `apps/frontend/src/app/features/matches/components/squad-view/squad-view.component.ts` — side-by-side playing XI with role badges (BAT/BOWL/AR/WK)
- [ ] T053 [US5] Create `CommentaryService` at `apps/frontend/src/app/core/services/commentary.service.ts` — fetch paginated commentary data
- [ ] T054 [US5] Add POTM display to match header in match detail page — photo/avatar, name, key performance stat

### 5B. Info Tab

- [ ] T055 [US5] Create or enhance "Info" tab content — display: Series name, Venue, Date/Time, Toss, Umpires, Match Referee, Weather conditions

---

## Phase 6: Stats Section (Week 7-8, parallel)

- [ ] T056 [P] [US8] Create `StatsService` at `apps/frontend/src/app/core/services/stats.service.ts` — methods: getLeaderboard(type, seriesId, format)
- [ ] T057 [P] [US8] Create stats data models at `apps/frontend/src/app/core/models/stats.models.ts` — interfaces: LeaderboardEntry, StatsFilter
- [ ] T058 [US8] Create `StatsLeaderboardComponent` at `apps/frontend/src/app/features/stats/pages/stats-leaderboard/stats-leaderboard.component.ts` — tabs: Most Runs, Most Wickets, Best Economy, Highest SR; table with sorting
- [ ] T059 [US8] Add route for `/stats` in routing module
- [ ] T060 [US8] Add "Stats" link to navbar nav items
- [ ] T061 [US8] Add series/tournament filter to stats page — dropdown to select tournament

---

## Phase 7: Polish & Integration Testing (Week 8)

- [ ] T062 Cross-browser testing — Chrome, Firefox, Safari, Edge on desktop and mobile
- [ ] T063 Lighthouse audit — target Performance ≥ 85, Accessibility ≥ 95
- [ ] T064 Visual regression screenshot comparison — before/after for all modified pages
- [ ] T065 Mobile responsiveness audit — test on 320px, 375px, 414px, 768px, 1024px, 1440px viewports
- [ ] T066 Dark theme verification — navigate all new pages/components in dark mode and verify no hardcoded colors
- [ ] T067 WebSocket integration test — verify ticker and match cards update in real-time
- [ ] T068 Remove dead code — clean up unused sidebar CSS, legacy component imports, orphaned files

---

## Summary

| Phase | Tasks | Dependencies | Parallelism |
|-------|-------|-------------|-------------|
| Phase 1 | T001-T017 | None | High (many parallel) |
| Phase 2 | T018-T026 | Phase 1 (color tokens) | Moderate |
| Phase 3 | T027-T041 | Phase 1 (match card) | High |
| Phase 4 | T042-T048 | Phase 1 (series badge) | High (parallel with Phase 3) |
| Phase 5 | T049-T055 | Phase 2 (scorecard), Phase 3 (nav) | Moderate |
| Phase 6 | T056-T061 | Phase 1 (design tokens) | High (parallel with Phase 5) |
| Phase 7 | T062-T068 | All phases | Sequential |

**Total tasks**: 68  
**Estimated duration**: 8 weeks  
**Critical path**: Phase 1 → Phase 2/3 → Phase 5 → Phase 7
