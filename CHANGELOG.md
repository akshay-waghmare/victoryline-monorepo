# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### CREX-Inspired UI Redesign (`fec9702`)

A complete visual overhaul of the homepage and matches page, modeled after competitor analysis of crex.live and cricbuzz.com.

**Homepage — Unified Tabbed Carousel:**
- Three-tab carousel: **Live**, **Upcoming**, **Results**
- Horizontal scrollable match cards with smooth snap scrolling
- Tab badges showing count of matches per category
- Auto-selects the first non-empty tab on load

**Match Card — CREX-Style Layout:**
- Vertical team layout: avatar + name on top row, score on the row below
- Colored circle avatars with team initials (deterministic color from team name hash)
- Bold runs/wickets with lighter parenthesized overs: `189/6 (20.0 ov)`
- Status pill (Live/Upcoming/Completed) with color-coded backgrounds
- Series name header, venue/time footer
- Score update animations (scale pulse on change)
- Responsive breakpoints for mobile (≤640px), tablet (768px+), desktop (1024px+)

**Matches List Page (`/matches`):**
- Clean vertical card list at `max-width: 900px`
- Consistent card styling with homepage carousel
- Updated skeleton loading cards to match new structure

**Files Changed:**
- `apps/frontend/src/app/home/home.component.html` — tabbed carousel
- `apps/frontend/src/app/home/home.component.css` — carousel styles
- `apps/frontend/src/app/home/home.component.ts` — tab logic
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.css`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.css`
- `apps/frontend/src/app/features/matches/components/skeleton-card/skeleton-card.component.html`
- `apps/frontend/src/app/features/matches/components/skeleton-card/skeleton-card.component.css`

---

#### RapidAPI Cricket News Integration (`3b0f943`)

Full-stack integration of a cricket news feed using the RapidAPI Cricket Live Line Advance API, displayed in a Cricbuzz-style layout on the homepage.

**Backend (Spring Boot):**
- `CricketNews` JPA entity — stores newsId, title, body, mediaUrl, newsUrl, credit, publishedAt
- `CricketNewsRepository` — JPA repository with `findTop20ByOrderByPublishedAtDesc()`
- `CricketNewsService` — fetches from RapidAPI using OkHttp, parses JSON with Jackson, deduplicates by newsId, persists to DB
- `NewsScheduler` — `@Scheduled(cron = "0 0 */4 * * *")` runs every 4 hours (6 req/day within 100 req/day free tier)
- `CricketDataController` — added `GET /cricket-data/news` endpoint returning latest 20 articles

**Frontend (Angular):**
- `NewsService` — HTTP client for `/cricket-data/news`
- Homepage news section — featured card (large image + title) + compact list rows
- Responsive layout: stacks on mobile, side-by-side on desktop
- External links open in new tabs, image fallback on error

**Configuration:**
- `RAPIDAPI_KEY` environment variable added to `docker-compose.local.yml` and `docker-compose.prod.yml`
- API: `cricket-live-line-advance.p.rapidapi.com/seasons/2025/news?paged=1&per_page=20`

**Files Changed:**
- `apps/backend/.../model/CricketNews.java`
- `apps/backend/.../repository/CricketNewsRepository.java`
- `apps/backend/.../service/CricketNewsService.java`
- `apps/backend/.../scheduler/NewsScheduler.java`
- `apps/backend/.../controller/CricketDataController.java`
- `apps/frontend/src/app/core/services/news.service.ts`
- `apps/frontend/src/app/home/home.component.html`
- `apps/frontend/src/app/home/home.component.css`
- `apps/frontend/src/app/home/home.component.ts`
- `docker-compose.local.yml`, `docker-compose.prod.yml`

---

### Fixed

#### Match Tab Categorization — Live vs Completed (`3553917`)

**Problem:** Live matches were appearing in the "Results" tab and completed matches were shown as live.

**Root Cause 1:** `parseMatchStatus()` allowed scorecard status strings (e.g., "Day 1 completed") to override the source endpoint status. A match fetched from the live-matches endpoint could be re-categorized as COMPLETED.

**Root Cause 2:** `transformScheduleMatches()` only applied fallback status when `!match.status`, allowing stale API status to persist.

**Fix:**
- `getLiveMatches()` now forces `MatchStatus.LIVE` on every match after transformation
- `transformScheduleMatches()` always overwrites `match.status` with the source endpoint status before transformation
- Added `RAIN_DELAY` to `filterLiveMatches()` so rain-delayed matches stay in the Live tab
- Restored news scheduler to every 4 hours (6 req/day)

**Files Changed:**
- `apps/frontend/src/app/features/matches/services/matches.service.ts` — forced status overrides
- `apps/frontend/src/app/core/utils/match-utils.ts` — RAIN_DELAY in live filter

---

#### Match Card Score Display — Concatenated Scores (`b7ac7bd`, `c22c6ca`, `5ddb820`)

**Problem:** Completed match cards showed `189/620.0` instead of `189/6 (20.0 ov)` because the backend stores `resultSummary` as a concatenated string without separators.

**Root Cause:** The `parseScore()` method requires structured scorecard data, which is unavailable for completed/schedule matches. The `resultSummary` field contains raw concatenated text like `"CDE 189/620.0 CDE Won 10thT20, Tillo T20 Cup 2026 NOD 11916.3"`.

**Fix — Two-Pass Regex Score Parser (`enrichScoresFromResultSummary`):**

*Pass 1 — Slash format:* Regex `([A-Za-z]...)\s+(\d+)\/(\d{1,2}?)\s*\(?(\d+\.\d+)\)?` with lazy wickets quantifier correctly splits `189/620.0` into runs=189, wickets=6, overs=20.0.

*Pass 2 — All-out format (no slash):* For scores like `NOD 11916.3` where the team was all out (no `/` separator), a heuristic splits the concatenated digits: take the last 2 digits before the decimal as whole overs (if ≤ 50), remainder as runs, wickets defaults to 10.
- `11916.3` → runs=119, overs=16.3, wickets=10 ✓
- `11430.4` → runs=114, overs=30.4, wickets=10 ✓
- `7121.2` → runs=71, overs=21.2, wickets=10 ✓

**Files Changed:**
- `apps/frontend/src/app/features/matches/services/matches.service.ts` — `enrichScoresFromResultSummary()`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` — `extractFallbackScore()` (same 2-pass logic)

---

#### Match Card Result Text — Clean Winner Display (`5ddb820`)

**Problem:** The result row showed the full raw `resultSummary` including embedded scores (e.g., `"CDE 189/620.0 CDE Won 10thT20..."`), which was redundant now that scores are displayed separately.

**Fix:** `getMatchResultSummary()` now extracts only the "Team Won" portion via regex `([A-Za-z]...)\s+Won[^,]*`, falling back to "Match Draw/Tied/Abandoned" or computed margin.

**File Changed:**
- `apps/frontend/src/app/core/utils/match-utils.ts`

---

#### Match Card Layout — Vertical Team Stacking (`c22c6ca`)

**Problem:** Horizontal team layout cramped scores next to team names, especially on mobile.

**Fix:** Restructured to CREX-style vertical layout:
```
[Avatar] TeamName          TeamName [Avatar]
         189/6 (20.0)           119/10 (16.3)
              CDE Won by 70 runs
```

Each team is a flex column: header row (avatar + name) and score line below, with indentation aligned under the avatar.

**Files Changed:**
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.css`

---

#### Upcoming Match Pill Visibility (`b7ac7bd`)

**Problem:** The "Upcoming" status pill was invisible because its blue text blended with the blue background.

**Fix:** Added explicit `!important` blue background with white text to the upcoming pill CSS.

---

#### Match Detail Hero — 3-Column Completed Layout (`c22c6ca`, `5ddb820`)

**Problem:** Completed match detail page showed only one team's score on the left, with raw concatenated text. The user wanted both teams' scores side-by-side with the result centered.

**Fix:** Added a `completedScores` field to `LiveHeroViewModel` and a new 3-column template section:
```
Team1Name    |  Result Text  |  Team2Name
189/6        |   CDE Won     |  119/10
(20.0 ov)    |               |  (16.3 ov)
```

- `buildHeroFallbackView()` populates `completedScores` from `extractFallbackScore().allScores`
- Conditional `*ngIf="view.completedScores"` switches between completed and live layouts
- Responsive: stacks vertically on mobile (≤480px), horizontal on tablet/desktop

**Files Changed:**
- `apps/frontend/src/app/match-live/services/live-hero.models.ts` — added `completedScores` to `LiveHeroViewModel`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` — populate completedScores
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html` — 3-column template
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css` — completed layout styles

---

#### Hero Stats Area — Hide Empty Tables (`5ddb820`)

**Problem:** For completed matches, the Batter/Bowler stats headers ("Batter R B 4s 6s SR", "Bowler O M R W ECO") showed even with no data rows.

**Fix:** Added `*ngIf` guards to the stats-area div and both stats-group divs, hiding them when `batsmanDataList` and `bowlerDataList` are empty.

**File Changed:**
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html`

### Fixed

#### Live Ball Display — Current Ball Widget & Recent Ball Circles

A comprehensive overhaul of how all possible Crex API ball outcome codes are decoded, themed, and displayed in the live-hero widget. This fix spans the scraper adapter, frontend adapter, component logic, and CSS.

**Root cause of `resolveCurrentBall` priority bug** (`live-hero-state.service.ts`):
- `resolveCurrentBall()` unconditionally returned `runs_on_ball` first. Because `runs_on_ball` persists in the WebSocket state from the previous delivery, transient special codes — `"Ball Start"`, `"Wide"`, `"Over"`, `"Ball In Air"`, etc. — were silently overridden and never reached the UI.
- **Fix**: Non-numeric `current_ball` values now always take priority over `runs_on_ball`. Numeric outcomes (`"0"`–`"9"`) still defer to `runs_on_ball` as the fresher live-ball signal.

**Scraper: `crex_adapter.py`** — expanded `special_codes` mapping for the `B` (current ball) API field:
- Added `^5` → `"Stumped"`, `^6` → `"Hit Wicket"`, `^7` → `"LBW"`, `fh` → `"Free Hit"`, `ba` → `"Ball In Air"`, `e` → `"Player Entering"`
- Added `elif raw_b.startswith('^'):` catch-all that maps any unknown dismissal code to `"Wicket"`, preventing raw codes like `"^3"` from stripping to the digit `"3"`

**Frontend: `match-utils.ts`** — `getRecentBallDisplay()` in recent ball circle rendering:
- Extended `extraMatch` IIFE to recognise both prefix-first (`"lb1"`, `"b2"`, `"wd"`) and number-first (`"1b"`, `"2lb"`) bye/wide/no-ball formats from different Crex API fields
- Extended `wicketLabelMap` with `^5`–`^7`, `"stumped"`, `"lbw"`, `"hit wicket"`
- Added `lower.startsWith('^')` catch-all before the number check so any unrecognised dismissal code displays as `"W"` (wicket) rather than a raw digit

**Frontend: `live-hero.component.ts`** — new private `normalizeBallCode(ball)` helper drives all four public methods (`getCurrentBallKind`, `isCurrentBallImpact`, `isCurrentBallFreeHit`, `getCurrentBallDisplay`):
- Handles both **raw Crex API codes** (`"B"`, `"wd"`, `"nb"`, `"fh"`, `"^N"`) and their **translated strings** (`"Ball Start"`, `"Wide"`, `"No Ball"`, `"Free Hit"`, `"Bowled"`, …) from either scraper code path
- Bye detection via regex: matches `b\d+` and `\d+b` (e.g. `"b1"` and `"1b"`)
- Leg-bye detection: `lb\d+` and `\d+lb`
- All `^N` dismissal codes and their translated strings collapse to `kind='wicket'`
- `getCurrentBallDisplay()` returns human-readable labels: `●` (ball start), `End` (over), `Wd` (wide), `NB` (no ball), `FH` (free hit), `W` (wicket), `B1`/`By` (bye), `LB1`/`LB` (leg-bye), `↑` (ball in air), `?` (boundary check)

**Frontend: `live-hero.component.html`**:
- Bound `[attr.data-kind]`, `[class.current-ball--animate]` on the current-ball `<div>`
- Added `<span class="current-ball__badge">Free Hit</span>` shown conditionally via `*ngIf="isCurrentBallFreeHit(...)"`

**Frontend: `live-hero.component.css`** — per-kind current-ball themes:

| `data-kind` | Colour | Notes |
|---|---|---|
| `six` | Orange gradient | `@keyframes current-ball-impact` animation |
| `four` | Blue gradient | `current-ball-impact` animation |
| `wicket` | Red gradient | `current-ball-impact` animation |
| `freehit` | Amber | Free Hit badge, separate `-webkit-text-fill-color` override |
| `wide` | Amber/yellow | |
| `noball` | Rose/pink | |
| `ballstart` | Slate | `@keyframes ball-running-pulse` animation |
| `over` | Teal | |
| `bye` | Indigo | |
| `legbye` | Violet | |
| `air` | Sky-blue | `ball-running-pulse` animation |
| `check` | Grey | Boundary check/review |

- Added `[data-kind]` colour rules inside `@media (max-width: 767px)` for the recent-ball circles (previously absent, causing mobile circles to render without colour)

**Frontend: `cricket-odds.component.ts`** — commentary ball icons:
- `getCommentaryClass()` now returns `"commentary-six"` (amber/orange) vs `"commentary-boundary"` (blue) by checking `entry.runs === 6` or `entry.highlights.includes('SIX')`
- `getCommentaryIcon()` was hardcoded to `'4'`; now returns `'6'` for sixes

**Frontend: `cricket-odds.component.css`**:
- Added `.commentary-six` and `.commentary-six:hover` CSS classes (amber/orange border + background)

- **Scorecard Scraping**: Hardened Crex scorecard decoding by waiting for sufficiently populated `localStorage` before extracting player/team mappings, ignoring incomplete cached mappings, and caching only validated player/team data in [apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py](apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py).
- **Frontend Production Build**:
  - Deferred `prebid.js` loading from [apps/frontend/src/index.html](apps/frontend/src/index.html) to avoid Angular 7 production minification failures on modern syntax.
  - Added frontend TypeScript exclusions and `skipLibCheck` safeguards in [apps/frontend/src/tsconfig.app.json](apps/frontend/src/tsconfig.app.json) and [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json) so legacy/orphan component files no longer break production builds.

### Added

- **Crex API Debug Script** (`debug_crex_api.py`): Playwright-based live match capture tool that intercepts `sV3`, `sC4`, and `getBallFeed` API calls for any Crex match URL and dumps all ball-related fields (`B`, `A`, `l`, `m`, `n`, `rb[].u`) to a JSON file. Used to confirm raw API encoding of ball-start (`"B"`), ball-in-air (`"ba"`), wide (`"wd"`), bye (`"lb1"`, `"b1"`), and dismissal codes (`"^N"`). Run as: `python debug_crex_api.py [MATCH_URL]`. Output JSON is git-ignored.

### Changed
- **Live Match UI**: Compressed the live hero and odds layouts, moved active batter/bowler context into the hero, and added an odds/probability toggle across [apps/frontend/src/app/cricket-odds/cricket-odds.component.html](apps/frontend/src/app/cricket-odds/cricket-odds.component.html), [apps/frontend/src/app/cricket-odds/cricket-odds.component.css](apps/frontend/src/app/cricket-odds/cricket-odds.component.css), [apps/frontend/src/app/cricket-odds/cricket-odds.component.ts](apps/frontend/src/app/cricket-odds/cricket-odds.component.ts), and the live hero components under [apps/frontend/src/app/match-live/components/live-hero](apps/frontend/src/app/match-live/components/live-hero).
- **Theme Consistency**: Replaced remaining purple gradients with design-token-based blue gradients across several frontend components, including [apps/frontend/src/app/scorecard/scorecard.component.css](apps/frontend/src/app/scorecard/scorecard.component.css), [apps/frontend/src/app/home/home.component.css](apps/frontend/src/app/home/home.component.css), and related match-detail components.

### Notes
- Live end-to-end scorecard validation is still pending a fresh live match window. The scraper fix was rebuilt and the scraper container returned to a healthy state, but no final live backfill verification was possible once live matches ended.

## [1.2.1] - 2026-01-30

### Fixed
- **Scraper Timeouts**: Increased `BACKEND_TIMEOUT` from 2s to 30s to prevent timeouts on slow backend responses.
- **Live Match Discovery**: 
  - Added `isFinishedText()` filter to exclude completed matches ("won by", "match tied", "no result", "match abandoned").
  - Added `isLive()` helper to check for `div.live` class presence.
  - Combined selector with 20s timeout: `li.live-card, div.live-card, a[href*='/scoreboard/']`.
  - 3-strategy extraction for robust match discovery.

### Changed
- **Docker Compose**: Added volume mounts for `cricket_data_service.py` and `discovery.py` for hot-reload during debugging.
- **Docker Compose**: Removed `pids_limit: 512` constraint (was causing issues).

### Deployed Images
| Service | Image Tag | Digest |
|---------|-----------|--------|
| **Scraper** | `macubex/victoryline-scraper:v1.2.1` | `sha256:98eb0259...` |
| **Backend** | `macubex/victoryline-backend:v1.2.1` | `sha256:0ced94d3...` |
| **Frontend** | `macubex/victoryline-frontend:v1.2.1` | `sha256:b85cf12f...` |
| **Prerender** | `macubex/victoryline-prerender:v1.2.1` | `sha256:82bbd784...` |
| **MySQL** | `mysql:8.0` | - |
| **Redis** | `redis:7-alpine` | - |

### Deployment Commands
```bash
# Pull all images on server
docker pull macubex/victoryline-scraper:v1.2.1
docker pull macubex/victoryline-backend:v1.2.1
docker pull macubex/victoryline-frontend:v1.2.1
docker pull macubex/victoryline-prerender:v1.2.1

# Update docker-compose.prod.yml with new tags and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## [1.1.4] - 2025-11-26

### Fixed
- **Scraper Resilience**: Resolved critical `EAGAIN` / PID exhaustion error.
  - Increased Docker container PID limit from 350 to 512.
  - Lowered `STALENESS_THRESHOLD_SECONDS` from 180s to 60s for faster failure detection.
  - Verified process cleanup in `crex_adapter.py` and `browser_pool.py`.
- **Deployment**: Updated `docker-compose.prod.yml` to include Redis service and correct backend/redis URLs for the scraper.

### Changed
- **Configuration**: Switched production Caddy configuration to use `Caddyfile.local` temporarily for local testing of production stack.
- **Env**: Updated `.env.production.example` with optimized resilience settings.

### Deployed Images
| Service | Image Tag |
|---------|-----------|
| **Scraper** | `macubex/victoryline-scraper:v1.1.4` |
| **Backend** | `macubex/victoryline-backend:v1.0.0` |
| **Frontend** | `macubex/victoryline-frontend:v1.0.1` |
| **Prerender** | `macubex/victoryline-prerender:v1.0.0` |
| **MySQL** | `mysql:8.0` |
| **Redis** | `redis:7-alpine` |

## [1.1.3] - 2025-11-25

### Fixed
- **Data Extraction**: Fixed `localStorage` timing issue to ensure complete player data extraction.
- **Scorecard**: Achieved 100% scorecard coverage by pre-fetching storage from Scorecard/Info tabs.

## [1.1.2] - 2025-11-24

### Added
- **Resilience**: Implemented periodic container restart policy to mitigate long-running thread/PID leaks.

## [1.1.0] - 2025-11-20

### Added
- **Scraper Resilience**:
  - Automatic restart capabilities.
  - Memory limits (Soft/Hard).
  - Health monitoring endpoints.

## [1.0.1] - 2025-11-15

### Added
- **UI**: Live Match Glance enhancements.
  - Responsive design updates.
  - Chase summary and current ball display.

## [1.0.0] - 2025-11-01

### Added
- **SEO**: Initial SEO Optimization release.
- **Backend**: Spring Boot backend with H2 database.
- **Frontend**: Angular frontend with SSR/Prerender support.
