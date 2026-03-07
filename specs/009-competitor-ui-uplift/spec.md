# Feature Specification: Competitor-Informed UI Uplift

**Feature Branch**: `009-competitor-ui-uplift`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: Competitive analysis of Crex.com and Cricbuzz.com versus current Crickzen UI

---

## Executive Summary

After a detailed competitive audit of **Crex.com** and **Cricbuzz.com** — the two dominant cricket platforms — compared against the current Crickzen frontend, this spec identifies **critical UI gaps** and proposes targeted improvements to bring the platform to competitive parity and beyond. The current frontend suffers from legacy debt (Angular 7, dual style systems, sidebar/navbar collision) while competitors deliver polished, content-dense, fast-loading experiences. This spec addresses the most impactful visual and UX gaps.

---

## Competitive Analysis Summary

### Crex.com — Key Design Patterns

| Pattern | Description |
|---------|-------------|
| **Horizontal match carousel** | Top-of-page scrollable strip showing all live/upcoming/recent matches with team flags, scores, series badge, and countdown timers. Each card links directly to scorecard. |
| **Series-grouped matches** | Matches are labeled by series (e.g., "T20 WC 2026 →") with a clickable series link, creating clear context hierarchy. |
| **Scorecard page layout** | Tab bar (Match Info / Live / Scorecard) directly under the match header. Sub-sections: Batting table, Bowling table, Fall of Wickets, Partnerships (with visual run contribution bars), Yet to bat (player cards with avatars and averages). |
| **Series listing page** | Month-grouped series list with horizontal series flag carousel at top. Filter dropdowns (Format, Series Type). Pagination. |
| **Navigation** | Minimal top navbar: Logo, Home, Series, Teams, Fixtures, Stats Corner. No sidebar. Clean single-level nav. |
| **Team flags/logos** | Country flags displayed prominently on every match card — instant visual recognition. |
| **Player of the Match** | Shown directly on completed match cards in the carousel. |
| **Countdown timers** | Upcoming matches show "Starting In 03h : 31m" or "Tomorrow" relative timestamps. |
| **News integration** | Homepage splits into match carousel (top) + news feed (bottom) with image thumbnails, timestamps, and entity tags (player/team/series). |
| **Footer** | Minimal footer with About/Contact/Privacy links and brand. |
| **Stats Corner** | Dedicated stats section linked from navbar (Most Runs, Most Wickets by tournament). |
| **Fantasy integration** | Subtle fantasy branding without polluting the core cricket experience. |

### Cricbuzz.com — Key Design Patterns

| Pattern | Description |
|---------|-------------|
| **Match strip** | Persistent scrollable match ticker at top: series label, team names with flag icons, scores, match status, quick-link tabs (Forecast/Table/Schedule). |
| **Deep match tabs** | Info / Live / Scorecard / Squads / Points Table / Overs / Highlights / Full Commentary / News — comprehensive tab navigation per match. |
| **Ball-by-ball commentary** | Rich text commentary below match header with over-by-over summary strip ("20: W 1 1 6 Wd 6 6 (22 runs)"). |
| **Post-match content** | Player of the Match card, match videos gallery, captain quotes embedded directly in the match page. |
| **Featured Videos** | Homepage includes video thumbnails with duration badges (e.g., "6:08"). |
| **Top Stories feed** | Editorially curated news with category labels (T20 WORLD CUP, IPL 2026, etc.), hero images, timestamps. |
| **Bottom tab bar (mobile)** | Five-icon mobile nav: Home, Matches, Series, Videos, News. |
| **Browse hierarchy** | Menu includes: Browse Series, Browse Team, Browse Player, Schedule, Archives, Auction Tracker, Photos, ICC Rankings, Records. |
| **Points Table integration** | Quick-access Points Table links from match cards and series pages. |
| **Premium tier** | "Go ad-free" CTA, premium subscription path. |
| **Multi-format coverage** | T20I, ODI, Test, FC (Sheffield Shield etc.) all in one unified interface. |

### Current Crickzen — Gaps Identified

| Gap | Severity | Detail |
|-----|----------|--------|
| **No team logos/flags** | 🔴 Critical | Competitors show country flags on every match card. Crickzen shows only text team names. |
| **No series context on match cards** | 🔴 Critical | Crex groups matches by series ("T20 WC 2026 →"). Crickzen shows matches in a flat list without series hierarchy. |
| **No ball-by-ball commentary** | 🟡 Major | Cricbuzz's core differentiator. Crickzen has no commentary feature. |
| **No news/content section** | 🟡 Major | Both competitors have rich news feeds. Crickzen has a basic blog section. |
| **No match sub-tabs** | 🟡 Major | Competitors offer 6-10 tabs per match. Crickzen has Info/Live/Scorecard only. |
| **No countdown timers** | 🟡 Major | Crex shows relative countdowns ("Starting In 03h : 31m"). Crickzen shows absolute times only. |
| **No Player of the Match** | 🟡 Major | Both competitors surface POTM on match cards. Crickzen does not. |
| **No partnership visualization** | 🟡 Major | Crex shows partnership run bars with player contribution splits. Crickzen scorecard is plain tables. |
| **No stats section** | 🟡 Major | Crex has a dedicated Stats Corner. Cricbuzz has ICC Rankings + Records. |
| **Legacy sidebar clutters layout** | 🟠 Moderate | Dual nav (sidebar + navbar) wastes space and confuses hierarchy. Competitors use simple top navbar only. |
| **No mobile bottom tab bar** | 🟠 Moderate | Cricbuzz uses a persistent bottom nav on mobile. Crickzen uses a hamburger-only pattern. |
| **Inconsistent color system** | 🟠 Moderate | Purple gradients in scorecard/odds vs blue design tokens creates visual incoherence. Competitors use consistent brand colors. |
| **No video content** | 🟡 Major | Cricbuzz heavily features video thumbnails. Crickzen has no video integration. |
| **No points table access** | 🟠 Moderate | Both competitors surface points tables from match cards. Crickzen does not. |
| **No "Yet to bat" section** | 🟠 Moderate | Crex shows remaining batsmen with avatars and averages. Crickzen omits this. |
| **Fall of wickets missing** | 🟠 Moderate | Both competitors show fall of wickets timeline. Crickzen's scorecard lacks this. |
| **Angular 7 / Material 7** | 🔴 Critical | 2018-era framework — missing security patches, performance improvements, a11y fixes. Competitors use modern frameworks. |

---

## User Scenarios & Testing

### User Story 1 — Match Card with Series Context & Team Flags (Priority: P1)

Users landing on the homepage or matches page need to immediately recognize which teams are playing in which tournament, with visual team flags and series badges — matching the information density of Crex and Cricbuzz's match strips.

**Why this priority**: The match card is the single most-viewed UI element. Every user sees it on every visit. Team flags and series context are table-stakes features that every competitor provides. Without them, Crickzen looks amateurish.

**Independent Test**: Can be tested by loading the homepage and matches page and verifying team flags, series names, countdown timers, and POTM badges appear on match cards.

**Acceptance Scenarios**:

1. **Given** a user lands on the homepage, **When** live/upcoming/recent matches load, **Then** each match card shows team flag icons (country flag images) next to team names
2. **Given** a match belongs to a series, **When** the card renders, **Then** a series badge (e.g., "T20 WC 2026") appears at the top of the card with a clickable link to the series page
3. **Given** a match is upcoming, **When** it has a start time, **Then** the card shows a relative countdown timer ("Starting in 2h 15m" or "Tomorrow 7:00 PM") that updates in real-time
4. **Given** a completed match, **When** the card renders, **Then** it shows "Player of the Match: [Name]" at the bottom of the card
5. **Given** a match has an active "favorite" indicator, **When** the odds data is available, **Then** the card shows a subtle favorite badge (like Crex's "Favourite IND" indicator)

---

### User Story 2 — Enhanced Scorecard with Partnerships & Fall of Wickets (Priority: P1)

Users viewing a completed or live match scorecard need the full cricket story — not just batting/bowling tables, but partnership breakdowns, fall of wickets timeline, and yet-to-bat player cards — matching Crex's comprehensive scorecard layout.

**Why this priority**: The scorecard is the second most-visited page. Users compare scorecards across platforms. A bare scorecard without partnerships and FOW makes Crickzen feel incomplete.

**Independent Test**: Can be tested by navigating to any completed match scorecard and verifying partnership bars, FOW timeline, and yet-to-bat sections render below the bowling table.

**Acceptance Scenarios**:

1. **Given** a user views a scorecard, **When** the batting table loads, **Then** a "Fall of Wickets" section appears below it showing wicket number, score at fall, over, and batsman dismissed
2. **Given** a user views a scorecard, **When** scrolling past the bowling table, **Then** a "Partnerships" section shows each partnership with a horizontal bar showing each batsman's contribution (runs and balls) with proportional width
3. **Given** a match is in progress with batsmen yet to bat, **When** the scorecard renders, **Then** a "Yet to Bat" section shows remaining batsmen as mini-cards with player name, avatar/silhouette, and batting average
4. **Given** partnership data loads, **When** the bars render, **Then** each bar shows Batter 1 name/runs on the left, Batter 2 name/runs on the right, with a color-split bar proportional to runs scored
5. **Given** a batsman is dismissed, **When** the dismissal text renders in the batting table, **Then** it shows the full dismissal string (e.g., "c Patel b Pandya") with fielder and bowler names as clickable links to player profiles

---

### User Story 3 — Eliminate Legacy Sidebar, Unified Top Navigation (Priority: P1)

Users navigating the app encounter a confusing dual-navigation pattern (legacy sidebar + modern navbar). Competitors use a clean single-level top navbar. The sidebar needs to be eliminated and its functionality merged into the navbar and match pages.

**Why this priority**: Navigation confusion directly causes user drop-off. The sidebar wastes 260px of horizontal space on desktop. It's the most visible legacy debt in the UI.

**Independent Test**: Can be tested by navigating through all pages and verifying no sidebar appears, the top navbar contains all necessary links, and mobile uses a bottom tab bar.

**Acceptance Scenarios**:

1. **Given** a user visits any page on desktop, **When** the page loads, **Then** only the top navbar is visible — no sidebar panel appears
2. **Given** the sidebar previously showed live match links, **When** those matches are live, **Then** they appear in a scrollable match ticker strip below the navbar (Crex/Cricbuzz pattern)
3. **Given** a user is on mobile (< 768px), **When** the page loads, **Then** a persistent bottom tab bar appears with icons for Home, Matches, Series, and More
4. **Given** a user taps the "More" tab on mobile, **When** the menu opens, **Then** it shows Players, Teams, Stats, Settings (theme toggle), and About links
5. **Given** the legacy sidebar component existed, **When** this story is complete, **Then** the `SidebarComponent` is removed from the codebase and `AdminLayoutsComponent` renders content full-width

---

### User Story 4 — Series-Aware Pages & Series Listing (Priority: P2)

Users browsing the platform need a dedicated series listing page and series-grouped views — matching Crex's month-organized series calendar with format filters and Cricbuzz's series browsing hierarchy.

**Why this priority**: Series browsing is the third-highest navigation action on cricket platforms. Without it, users cannot discover upcoming tournaments or find matches within a series context.

**Independent Test**: Can be tested by navigating to /series and verifying month-grouped series list, format filters, and series detail pages with match fixtures load correctly.

**Acceptance Scenarios**:

1. **Given** a user navigates to /series, **When** the page loads, **Then** series are grouped by month (e.g., "March 2026", "April 2026") with series name, date range, and series flag/logo
2. **Given** the series list is showing, **When** a user clicks a format filter (All / T20 / ODI / Test), **Then** the list filters to show only series of that format
3. **Given** a user clicks on a series name, **When** the series detail page loads, **Then** it shows all matches in that series as a fixture list with match cards
4. **Given** a series has a points table, **When** the user views the series page, **Then** a "Points Table" tab/section is available showing team standings
5. **Given** the homepage match carousel shows matches, **When** matches from the same series appear, **Then** they are visually grouped under a series header (e.g., "T20 WC 2026 →") with a link to the full series page

---

### User Story 5 — Match Detail Page Enhancement (Priority: P2)

Users viewing a specific match need deeper tabs and richer content — matching Cricbuzz's tab system (Info / Live / Scorecard / Squads / Points Table / Overs / Highlights / Commentary / News) and Crex's ball-by-ball view.

**Why this priority**: Match detail dwell time is the longest of any page. Richer content increases engagement and reduces the need for users to visit competitor sites for the same match.

**Independent Test**: Can be tested by navigating to any match detail page and verifying the tab bar shows all available tabs, each tab loads its content, and the over-by-over summary renders.

**Acceptance Scenarios**:

1. **Given** a user navigates to a match detail page, **When** the page loads, **Then** a horizontal tab bar appears with tabs: Info, Live, Scorecard, Squads, Overs, Commentary (tabs enabled/disabled based on data availability)
2. **Given** the "Overs" tab is selected, **When** over data is available, **Then** an over-by-over summary strip shows each over with ball results (e.g., "20: W 1 1 6 Wd 6 6 (22 runs)") color-coded by event type
3. **Given** the "Squads" tab is selected, **When** squad data is available, **Then** both playing XIs are shown side-by-side with player name, role badge (BAT/BOWL/AR/WK), and photo/silhouette
4. **Given** a match is completed, **When** the match header renders, **Then** it shows Player of the Match with photo, name, and key stat
5. **Given** a live match, **When** the ball-by-ball commentary is enabled, **Then** the "Commentary" tab shows text commentary for each ball with over number, bowler-to-batsman text, and event description (boundary highlighted in green, wicket in red)
6. **Given** the "Info" tab is selected, **When** it renders, **Then** it shows: Series name, Venue (with ground link), Date & Time, Toss result, Umpires, Match Referee

---

### User Story 6 — Consistent Visual Design & Color Unification (Priority: P2)

Users experience visual incoherence because the scorecard uses purple gradients while the rest of the app uses blue design tokens. The legacy `styles.css` and modern `styles.scss` define competing variable systems. All components need to converge on the unified design token system.

**Why this priority**: Visual consistency is a baseline quality signal. Inconsistent colors make the app feel like a patchwork of different projects. Competitors maintain strict brand consistency.

**Independent Test**: Can be tested by navigating through all pages and verifying no hardcoded purple gradients, no legacy `--primary-color` variables, and all components use `--color-*` design tokens.

**Acceptance Scenarios**:

1. **Given** a user views the scorecard page, **When** the page renders, **Then** the accent color uses `--color-primary` (blue: #1976d2) instead of the purple gradient (#667eea → #764ba2)
2. **Given** a user navigates from homepage to scorecard to match detail, **When** they observe the color palette, **Then** the primary, secondary, success, warning, and error colors are identical across all pages
3. **Given** the `styles.css` legacy file exists, **When** this story is complete, **Then** all legacy CSS custom properties (`--primary-color`, `--accent-color`, etc.) are replaced with their `--color-*` equivalents from `styles.scss`
4. **Given** the `cricket-odds.component.css` has 2657 lines with hardcoded colors, **When** this story is complete, **Then** all hardcoded hex colors are replaced with CSS custom properties
5. **Given** any component uses `!important` for color overrides, **When** this story is complete, **Then** `!important` usage is reduced by at least 50% through proper cascade management

---

### User Story 7 — Mobile Bottom Tab Bar & Touch-Optimized Navigation (Priority: P2)

Mobile users need a persistent bottom tab bar (like Cricbuzz's Home/Matches/Series/Videos/News) for thumb-friendly navigation instead of relying solely on the hamburger menu.

**Why this priority**: Mobile accounts for 70%+ of cricket traffic. A bottom tab bar is the standard mobile navigation pattern in 2026. The hamburger menu hides navigation options and increases interaction cost.

**Independent Test**: Can be tested by viewing the app on a mobile viewport and verifying the bottom tab bar appears, tabs navigate correctly, and the bar respects safe area insets.

**Acceptance Scenarios**:

1. **Given** a user is on a mobile device (< 768px), **When** any page loads, **Then** a fixed bottom tab bar is visible with icons and labels for: Home, Matches, Series, More
2. **Given** the user taps the "Matches" tab, **When** navigation occurs, **Then** the matches list page loads and the "Matches" tab is visually highlighted as active
3. **Given** the user is on the match detail page, **When** they scroll down through commentary, **Then** the bottom tab bar remains fixed at the bottom (does not scroll away)
4. **Given** the bottom tab bar renders on iOS, **When** it positions itself, **Then** it accounts for `env(safe-area-inset-bottom)` to avoid the home indicator
5. **Given** a user is on desktop (≥ 768px), **When** any page loads, **Then** the bottom tab bar is NOT visible (desktop uses top navbar)

---

### User Story 8 — Stats Section & Player Stats Visualization (Priority: P3)

Users want a dedicated stats section where they can explore tournament leaders (most runs, most wickets, best economy, highest strike rate) — matching Crex's "Stats Corner" with filterable leaderboards.

**Why this priority**: Stats engagement is high during tournaments but is a discovery/retention feature, not a core daily-use feature. Worth implementing after core experience gaps are closed.

**Independent Test**: Can be tested by navigating to /stats and verifying tournament leaderboards render with sortable columns and series/format filters.

**Acceptance Scenarios**:

1. **Given** a user navigates to /stats, **When** the page loads, **Then** a default leaderboard shows "Most Runs" for the current active tournament with columns: Rank, Player, Team, Matches, Innings, Runs, Average, SR, 50s, 100s
2. **Given** the stats page is showing, **When** a user clicks "Most Wickets" tab, **Then** the leaderboard switches to show wicket-takers with: Rank, Player, Team, Matches, Innings, Wickets, Average, Economy, SR, 5W
3. **Given** a tournament filter is available, **When** a user selects a different series (e.g., "IPL 2026"), **Then** the leaderboard updates to show stats for that series
4. **Given** a user clicks on a player name in the leaderboard, **When** navigation occurs, **Then** they are taken to the player profile page with career stats

---

### User Story 9 — Match Ticker Strip (Priority: P2)

Users on any page of the site need a persistent, horizontally scrollable match ticker (like Crex/Cricbuzz's top strip) showing all live and recently completed matches, enabling quick navigation without returning to the homepage.

**Why this priority**: Both major competitors feature a persistent match ticker. It's the single most visible feature at the top of every page and provides constant match awareness. Without it, the experience feels disconnected from live action.

**Independent Test**: Can be tested by navigating to any non-homepage page and verifying a scrollable ticker appears below the navbar showing live/recent matches with scores.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** the page loads, **Then** a horizontally scrollable match ticker strip appears below the main navbar showing all live + recently completed matches
2. **Given** live matches exist, **When** the ticker renders, **Then** live matches show: team flags + abbreviated team names, current scores, match status badge (green "LIVE" indicator), and are positioned first (leftmost)
3. **Given** a user clicks on a match in the ticker, **When** the click handles, **Then** they navigate to that match's detail page
4. **Given** the ticker has more matches than visible width, **When** the user swipes/scrolls horizontally, **Then** additional matches are revealed with smooth scrolling and optional left/right arrow buttons on desktop
5. **Given** scores update for a live match, **When** WebSocket data arrives, **Then** the ticker score updates with a brief highlight animation (background flash or number color change)

---

## Technical Architecture

### New Components (to be created)

| Component | Path | Purpose |
|-----------|------|---------|
| `MatchTickerComponent` | `app/shared/components/match-ticker/` | Persistent scrollable match strip below navbar |
| `MatchTickerCardComponent` | `app/shared/components/match-ticker/ticker-card/` | Individual match mini-card in ticker |
| `BottomTabBarComponent` | `app/core/layout/bottom-tab-bar/` | Mobile persistent bottom navigation |
| `SeriesListComponent` | `app/features/series/pages/series-list/` | Month-grouped series listing page |
| `SeriesDetailComponent` | `app/features/series/pages/series-detail/` | Series fixture list with points table |
| `PartnershipBarComponent` | `app/features/matches/components/partnership-bar/` | Horizontal partnership contribution bar |
| `FallOfWicketsComponent` | `app/features/matches/components/fall-of-wickets/` | FOW timeline table |
| `YetToBatComponent` | `app/features/matches/components/yet-to-bat/` | Remaining batsmen mini-cards |
| `OverSummaryComponent` | `app/features/matches/components/over-summary/` | Over-by-over result strip |
| `CommentaryComponent` | `app/features/matches/components/commentary/` | Ball-by-ball text commentary view |
| `SquadViewComponent` | `app/features/matches/components/squad-view/` | Side-by-side playing XI display |
| `StatsLeaderboardComponent` | `app/features/stats/pages/stats-leaderboard/` | Sortable tournament leaderboard |
| `CountdownTimerComponent` | `app/shared/components/countdown-timer/` | Relative time countdown (reusable pipe or component) |
| `SeriesBadgeComponent` | `app/shared/components/series-badge/` | Series label chip with link |
| `TeamFlagComponent` | `app/shared/components/team-flag/` | Country flag image with fallback |

### Components to Modify

| Component | Change |
|-----------|--------|
| `MatchCardComponent` | Add team flags, series badge, countdown timer, POTM display |
| `ScorecardComponent` | Add FOW, partnerships, yet-to-bat sections; remove purple gradients |
| `CricketOddsComponent` | Refactor to use design tokens; add match tabs (Info/Live/Scorecard/Squads/Overs/Commentary) |
| `NavbarComponent` | Add match ticker integration slot; ensure no sidebar dependency |
| `AdminLayoutsComponent` | Remove sidebar; render content full-width |
| `AppComponent` | Add match ticker below navbar; conditional bottom tab bar on mobile |
| `HomeComponent` | Group matches by series in carousel; add series headers with arrows |

### Components to Remove

| Component | Reason |
|-----------|--------|
| `SidebarComponent` | Replaced by unified top navbar + match ticker + bottom tab bar |

### New Services

| Service | Path | Purpose |
|---------|------|---------|
| `SeriesService` | `app/core/services/series.service.ts` | Fetch series list, series detail, points table |
| `StatsService` | `app/core/services/stats.service.ts` | Fetch tournament leaderboards |
| `CommentaryService` | `app/core/services/commentary.service.ts` | Fetch ball-by-ball commentary data |
| `TeamAssetService` | `app/core/services/team-asset.service.ts` | Resolve team flag URLs with caching and fallback |
| `CountdownService` | `app/core/services/countdown.service.ts` | Manage countdown timer intervals efficiently (shared observable) |

### New Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/series` | `SeriesListComponent` | — |
| `/series/:seriesSlug` | `SeriesDetailComponent` | — |
| `/stats` | `StatsLeaderboardComponent` | — |
| `/match/:matchId/commentary` | `CommentaryComponent` | — |
| `/match/:matchId/squads` | `SquadViewComponent` | — |
| `/match/:matchId/overs` | `OverSummaryComponent` | — |

### Backend API Requirements

These new frontend features require backend API support:

| Endpoint | Method | Purpose | Backend Spec Needed |
|----------|--------|---------|---------------------|
| `/api/series` | GET | List all series with filters (format, status, month) | Yes |
| `/api/series/{id}` | GET | Series detail with fixtures | Yes |
| `/api/series/{id}/points-table` | GET | Points table for a series | Yes |
| `/api/match/{id}/partnerships` | GET | Partnership data for scorecard | Yes (or extend existing scorecard API) |
| `/api/match/{id}/fall-of-wickets` | GET | FOW data for scorecard | Yes (or extend existing scorecard API) |
| `/api/match/{id}/commentary` | GET | Ball-by-ball commentary (paginated) | Yes |
| `/api/match/{id}/squads` | GET | Playing XI data | Yes |
| `/api/stats/leaderboard` | GET | Tournament leaderboard (runs, wickets, etc.) with filters | Yes |
| `/api/teams/{id}/flag` | GET | Team flag/logo image URL | May use CDN directly |

### Asset Requirements

| Asset | Source | Notes |
|-------|--------|-------|
| Team flag images | Country flag icon set (e.g., `flag-icons` npm package or custom sprite sheet) | Need ~20 ICC full-member flags + 80+ associate flags |
| Player silhouette | Generic player avatar SVG | Fallback when no player photo available |
| Series logos | Scraped from Crex CDN or manually curated | IPL, T20 WC, etc. branding |

---

## Design Tokens — Unified Color System

All components MUST use these tokens. No hardcoded hex colors.

```scss
// Primary palette (replace ALL purple gradients)
--color-primary: #1976d2;        // Blue — links, buttons, active states
--color-primary-light: #42a5f5;  // Hover states
--color-primary-dark: #1565c0;   // Pressed/active states

// Match status (keep existing — these match competitor patterns)
--color-match-live: #4caf50;     // Green pulse indicator
--color-match-upcoming: #2196f3; // Blue upcoming badge
--color-match-completed: #757575;// Gray completed badge

// Scorecard-specific (NEW — replace purple)
--color-scorecard-header: var(--color-primary);
--color-scorecard-row-hover: rgba(25, 118, 210, 0.04);
--color-partnership-batter1: #1976d2;
--color-partnership-batter2: #ff9800;
--color-wicket-highlight: #f44336;
--color-boundary-highlight: #4caf50;

// Series badge
--color-series-badge-bg: rgba(25, 118, 210, 0.08);
--color-series-badge-text: var(--color-primary);
```

---

## Migration Plan

### Phase 1 — Foundation (Week 1-2)
1. Create `TeamFlagComponent` with flag icon set
2. Create `SeriesBadgeComponent` and `CountdownTimerComponent`
3. Upgrade `MatchCardComponent` with flags, series badge, countdown, POTM
4. Unify color system — eliminate all purple gradients and legacy CSS variables
5. Remove `SidebarComponent` and update `AdminLayoutsComponent` to full-width

### Phase 2 — Scorecard & Match Detail (Week 3-4)
1. Create `PartnershipBarComponent`, `FallOfWicketsComponent`, `YetToBatComponent`
2. Enhance `ScorecardComponent` with new sub-components
3. Create match detail tab system (Info/Live/Scorecard/Squads/Overs)
4. Create `OverSummaryComponent` for over-by-over view
5. Create `MatchTickerComponent` for persistent top strip

### Phase 3 — Navigation & Series (Week 5-6)
1. Create `BottomTabBarComponent` for mobile
2. Create `SeriesListComponent` and `SeriesDetailComponent`
3. Update routes and navbar links
4. Add series-grouped match display on homepage

### Phase 4 — Stats & Commentary (Week 7-8)
1. Create `StatsLeaderboardComponent` with sortable tables
2. Create `CommentaryComponent` for ball-by-ball text
3. Create `SquadViewComponent` for playing XI display
4. Polish, cross-browser testing, Lighthouse audit

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Lighthouse Performance (Mobile) | TBD | ≥ 85 | Lighthouse CI |
| Lighthouse Accessibility | TBD | ≥ 95 | Lighthouse CI |
| Visual feature parity with Crex | ~40% | ≥ 85% | Feature checklist audit |
| Visual feature parity with Cricbuzz | ~30% | ≥ 70% | Feature checklist audit |
| Average pages/session | TBD | +30% | Analytics |
| Mobile bounce rate | TBD | -20% | Analytics |
| `!important` count in CSS | 29+ | < 10 | CSS audit |
| Hardcoded hex colors | 100+ | 0 | CSS audit |

---

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend APIs not ready for new features | Blocks series, stats, commentary | Define API contracts upfront; use mock data for frontend development |
| Angular 7 → 15+ migration needed for some features | Blocks modern Material components | Can implement most features on Angular 7; prioritize migration separately |
| Team flag images licensing | May not be able to use certain flag icons | Use open-source flag icon set (e.g., `circle-flags`) or country code fallback |
| Scraper doesn't provide partnership/FOW data | Blocks scorecard enhancement | Check scraper data first; may need scraper updates |
| Large CSS refactor risk | May break existing styles | Incremental migration; visual regression testing with screenshots |

---

## Out of Scope (for this spec)

- Angular framework upgrade (7 → 15+) — separate spec
- Video content integration — requires CDN/hosting infrastructure
- Premium/subscription tier — separate business decision
- Fantasy cricket features — separate product spec
- News/editorial content system — requires CMS infrastructure
- Player photos — requires photo rights/licensing
