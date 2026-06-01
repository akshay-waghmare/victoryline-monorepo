# Rollup: Home Match Surface and Local Data Recovery

**Date**: 2026-06-02  
**Branch**: `008-match-title-seo`

## Scope

This rollout bundles the home-page UX pass, match-surface cleanup, live-hero stability work, and local scraper recovery needed to validate the updated match experience with real data.

## What Changed

### 1. Homepage UX was simplified and made more task-first

The home page was reworked to reduce redundant framing and help users get to matches faster.

- Removed redundant intro copy and oversized hero framing
- Tightened typography and spacing to keep the page feeling compact without becoming hard to read
- Improved tab counts and badge clarity
- Reworked the match lanes and news section to feel more intentional
- Adjusted large-screen behavior so the featured news treatment stays cleaner

Primary files:

- `apps/frontend/src/app/home/home.component.html`
- `apps/frontend/src/app/home/home.component.css`
- `apps/frontend/src/app/home/home.component.ts`
- `specs/014-homepage-humanized-ux/*`

### 2. Carousel cards were cleaned up for scan speed

The compact match cards were updated so they read more like product UI and less like raw scraped output.

- Reduced repeated metadata and noisy series strings
- Improved score hierarchy and team-name wrapping
- Calmed status treatment and microcopy density
- Improved compact-card layout and readability across viewport sizes

Primary files:

- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.css`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.spec.ts`
- `specs/013-match-surface-polish/*`

### 3. Match-detail surfaces were modernized

The match page shell, scorecard, and match-info areas were improved so completed and live states feel more deliberate and less cramped.

- Updated match info presentation and styling
- Improved scorecard presentation and supporting layout
- Refined the main match page shell and tab treatment
- Added support code for better hero/fallback handling

Primary files:

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.*`
- `apps/frontend/src/app/cricket-odds/components/match-info/*`
- `apps/frontend/src/app/cricket-odds/components/scorecard/*`
- `apps/frontend/src/app/scorecard/*`
- `apps/frontend/src/app/shared/components/tab-nav/tab-nav.component.css`
- `apps/frontend/src/styles.scss`

### 4. Live hero websocket reliability was improved

The live hero previously stalled even while backend data stayed fresh. That work was documented and fixed in code.

- Replaced fragile wildcard topic assumptions with explicit topic handling
- Added hero retry/subscription resilience
- Added regression coverage for hero state wiring

Primary files:

- `apps/frontend/src/app/core/utils/cricket-websocket-topics.ts`
- `apps/frontend/src/app/match-live/services/live-hero-state.service.ts`
- `apps/frontend/src/app/match-live/services/live-hero-state.service.spec.ts`
- `docs/INCIDENT_20260526_LIVE_HERO_WS_STALL.md`

### 5. Local scraper recovery was fixed for schedule-only periods

After restart, local data stayed empty whenever CREX had no live cards because discovery returned early before schedule parsing.

- Fixed scraper discovery to continue into schedule parsing even when `live-matches` has no live cards
- Rebuilt and restarted local services
- Verified schedule and completed matches repopulate local backend/homepage again

Primary file:

- `apps/scraper/crex_scraper_python/src/discovery.py`

## Completed-Match Mismatch Fix

One completed-match bug was diagnosed and partially fixed:

- The completed card state was correct
- The match page could still show stale live hero content because `last-updated-data` returns `404` once a match leaves the live set
- The frontend cache kept serving the older live snapshot

Fixes applied:

- Clear cached live snapshot on `404` from `last-updated-data`
- Prefer completed fallback hero view over stale live hero state
- Hide live-only recent-ball and batter/bowler sections for completed matches

Primary files:

- `apps/frontend/src/app/cricket-odds/cricket-odds.service.ts`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.ts`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.spec.ts`

## Local Verification

Local Docker verification used:

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

Checked endpoints:

- `http://localhost:8080/Home`
- `http://localhost:8080/cric-live/ire-w-vs-wi-w-4th-match-ireland-womens-t20i-tri-series-2026-match-updates-11BW`
- `http://localhost:8099/cricket-data/upcoming-matches`
- `http://localhost:8099/cricket-data/completed-matches`
- `http://localhost:5000/health`

Verified outcomes:

- Local homepage renders upcoming and completed cards again after restart
- Scraper health returned to healthy after the discovery fix
- Completed match route no longer shows the stale chase text
- Completed hero now renders as a completed state in a fresh browser session

## Remaining Gap

One issue remains intentionally documented for follow-up:

- `sC4-stats/get` for some completed matches can still remain stale even after manual hydration
- The match page hero now avoids showing stale live state, but the underlying stored scorecard record may still lag behind CREX's final result banner

This should be treated as a separate scorecard-source follow-up, not as a homepage or hero regression.
