# Rollup: Match Surface UX Cleanup, Background SEO, and Skill Harvest

**Date**: 2026-06-19  
**Branch**: `008-match-title-seo`

## Scope

This rollup captures the session that started as a pre-match discovery investigation and then moved into a broad frontend hierarchy cleanup across:

- homepage
- `/matches`
- live-score hubs
- individual `/cric-live/{slug}` pages

The key product goal was to make the surfaces feel closer to CREX, Cricbuzz, and ESPN Cricinfo: match-state first for humans, SEO support still present in the background.

## What We Learned First

### 1. The upcoming canonical URL problem was narrower than expected

The original suspicion was that upcoming canonical URLs were not being created early enough.

The production probe disproved that:

- an upcoming `/cric-live/{slug}` page already existed before match start
- the page returned `200`
- the page self-canonicalized
- the page appeared in the sitemap
- the page already exposed healthy match-page SEO markers

The real gap was weaker raw-HTML discovery before match start, especially outside schedule pages.

### 2. Competitors keep the visible page cleaner than the HTML payload suggests

CREX, Cricbuzz, and ESPN Cricinfo all reinforced the same pattern:

- lead with live state, upcoming state, or results
- keep the first screen compact and decision-friendly
- move metadata, supporting links, and SEO structure into quieter secondary areas
- rely on metadata, JSON-LD, canonicals, breadcrumbs, and lower-priority HTML sections rather than crowding the top of the page

That shaped the Crickzen changes: reduce visual competition without removing SSR-visible support content.

## Frontend Work Delivered

### 1. Spec 026: Match state aware tabs

The individual match page now opens on the most useful tab for the resolved lifecycle state:

- live-like matches default to `Commentary`
- upcoming matches default to `Match Details`
- completed and abandoned matches default to `Scorecard`

The heavy detail/SEO content that used to compete with the hero was also moved under the `Match Details` tab.

Primary files:

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- `apps/frontend/src/app/cricket-odds/components/match-info/*`

### 2. Spec 027: Homepage scoreboard-first reset

The homepage regained a real at-a-glance layer and clearer first-view actions:

- a scoreboard-first hero
- explicit live-score and schedule entry actions
- visible `At a glance` cards for live, upcoming, and results
- deeper discovery content pushed below the main match rail

Primary files:

- `apps/frontend/src/app/home/home.component.ts`
- `apps/frontend/src/app/home/home.component.html`
- `apps/frontend/src/app/home/home.component.css`

### 3. Spec 028: Matches and match-detail hierarchy cleanup

The `/matches` page and match details surface were reworked so users see state first:

- summary cards on `/matches` now explain what is live, what is next, and what just finished
- the actual match list clearly outranks discovery/support sections
- the match details card explicitly behaves as the `At a glance` layer
- the support layer was toned down so it no longer reads like a second hero

Primary files:

- `apps/frontend/src/app/features/matches/pages/matches-list/*`
- `apps/frontend/src/app/cricket-odds/components/match-info/*`
- `apps/frontend/src/app/cricket-odds/*`

### 4. Spec 029: Foreground clean, background SEO

The final pass turned the support-heavy blocks into quieter secondary drawers while preserving crawlable HTML:

- homepage support hubs and direct links moved into `More live score pages`
- `/matches` discovery and direct links moved into `More match pages`
- the individual page's heavy support grid moved into `More match detail`

This completed the intended “clean for humans, still useful for SEO” split.

Primary files:

- `apps/frontend/src/app/home/*`
- `apps/frontend/src/app/features/matches/pages/matches-list/*`
- `apps/frontend/src/app/cricket-odds/*`
- `specs/029-foreground-clean-background-seo/*`

### 5. Supporting frontend logic

Two supporting patterns also landed in the same frontend working set:

- discovery ordering helpers now prioritize the next canonical upcoming fixtures more intentionally
- live hero websocket handling can subscribe to the snapshot topic path as well as legacy paths

Those pieces support cleaner state selection and more reliable match-page behavior without changing canonical policy.

Primary files:

- `apps/frontend/src/app/core/utils/match-utils.ts`
- `apps/frontend/src/app/core/utils/cricket-websocket-topics.ts`
- `apps/frontend/src/app/match-live/services/live-hero-state.service.ts`
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/*`

## Local Verification

The verified local flow for the UX pass was:

```powershell
cd apps/frontend
npx tsc -p src/tsconfig.app.json --noEmit
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build:browser
cd ..
docker compose -f docker-compose.local.yml build frontend
docker compose -f docker-compose.local.yml up -d --force-recreate frontend
```

Raw served HTML checks on `http://localhost:8080` confirmed the intended hierarchy markers:

- homepage: `Match centre at a glance`, `At a glance`, `More live score pages`
- `/matches`: `At a glance`, `Pick the lane you want`, `More match pages`
- individual page: `At a glance`, `More match detail`, `Keep the match snapshot first`
- `/live-score`: `Live now`, `Upcoming live scores`, `Recently completed`
- `/live-score/today`: `Live now`, `Upcoming live scores`, `Recently completed`
- `/cricket-schedule/today`: `Upcoming live scores`, `Recently completed`

The in-app browser automation surface was flaky after restart, so raw HTML and the rebuilt local frontend were treated as the authoritative verification signals.

## Deployment Scope Decision

This session overlapped with broader dirty worktree changes in backend, scraper, and dashboard areas. Those were intentionally kept out of the rollout scope.

The production deployment for this session should stay frontend-only because:

- the user request here was a frontend UX cleanup
- the frontend subset was locally rebuilt and verified
- the broader backend/scraper/dashboard changes were not fully validated as part of this pass
- the repo already has a safer low-blast-radius frontend rollout skill for exactly this case

## Skill Harvest

This session produced one clear reusable repo-local skill:

- `crickzen-match-surface-ux-pass`

Why it was worth extracting:

- the workflow repeated a real pattern rather than a one-off styling change
- the work required repo-specific guardrails around canonicals and SSR HTML
- the same audit loop can recur across homepage, hubs, `/matches`, and individual match pages
- competitor study mattered, but only as structural guidance rather than design copying

The skill captures:

- guardrails for preserving canonical and SSR behavior
- page-by-page hierarchy patterns
- expected file zones
- raw-HTML verification markers
- pairing guidance with `crickzen-frontend-prod-rollout` for production

## Recommended Follow-up

The next good follow-up after this rollout is to continue the pre-match discovery track separately from the UI cleanup:

- keep `/cric-live/{slug}` canonical stable
- strengthen multi-hub upcoming discovery where needed
- keep dashboard and backend monitoring changes on their own verified path
