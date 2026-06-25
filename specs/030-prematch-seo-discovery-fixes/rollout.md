# Spec 030 Rollout Report — Prematch SEO Discovery Fixes

**Date**: 2026-06-25
**Branch**: `008-match-title-seo`
**Commits**: `cd54fc2`, `5f264e9`
**Spec**: `specs/030-prematch-seo-discovery-fixes/`

## Problem Statement

Crickzen had good SEO impressions for only 4 days (May 26-29, 2026) then saw a drop. Pre-match traffic for live matches was not arriving despite extensive SEO work. The user asked for a thorough investigation and fixes to ensure SEO before every live match.

## Investigation Findings (5 root causes)

### Finding 1 — Pre-match matches never received Indexing API pings (P1)
`LiveMatchIndexingScheduler` sourced from `getLiveMatchesOnly()` which filtered with `isLiveLike()` = `LIVE || INNINGS_BREAK || RAIN_DELAY`. `UPCOMING` was excluded. A fixture scheduled for tonight got its first real-time Indexing API push only **after** it went LIVE.

### Finding 2 — SportsEvent JSON-LD dropped when venue was TBD (P1)
`cricket-odds.component.ts:2976` gated the entire `SportsEvent` block on `if (startDate && location)`. Many upcoming fixtures have unknown venues, so they got zero event markup — no `startDate`, no `eventStatus`, no rich-result eligibility.

### Finding 3 — Duplicate H1 on completed match pages (P1)
19 of 30 sampled match pages had `h1=2`. `cricket-odds.component.html:16` rendered the canonical H1; `scorecard.component.html:97` rendered a second `<h1>Scorecard</h1>` for completed matches.

### Finding 4 — GSC sitemap ping was daily 3 AM only (P2)
`SitemapScheduler.java:55` cron `0 0 3 * * *`. A fixture discovered at 10 AM wouldn't prompt a sitemap resubmission until 3 AM next day. Search Console API quota is 200 req/100s and 200,000/day — hourly submission (24/day) is ~0.01% of the ceiling.

### Finding 5 — Future-dated lastmod for upcoming matches (P3)
`SitemapService.deriveLiveMatchLastMod()` fell back to `scheduledStartTime` (a future timestamp) when no `lastStateUpdatedAt` existed. Google ignores future-dated lastmod, weakening the freshness signal right when pre-match discovery matters most.

### Finding 6 (discovered during verification) — Angular hydration wiped SSR JSON-LD (P1)
The Google Rich Results Test showed only Article + BreadcrumbList, not SportsEvent — even though curl saw it in SSR HTML. Root cause: `setPageSchemas()` called `clearPageSchemas()` unconditionally during hydration, wiping SSR-injected JSON-LD. The client-side rebuild then failed because `/api/` is blocked by robots.txt in Google's renderer, so `startDate` was null and SportsEvent was not rebuilt. Only Article + BreadcrumbList survived (they don't need API data).

## Fixes Implemented

### US1 — Include UPCOMING matches in Indexing API ping (backend)
**File**: `LiveMatchIndexingScheduler.java`
- Changed data source from `getLiveMatchesOnly()` to `getLiveMatches()` (all matches)
- Added `isIndexableForPing()` filter that excludes only terminal states (COMPLETED/ABANDONED/FINISHED)
- LIVE matches remain prioritized ahead of UPCOMING via `prioritySortValue()`
- Quota protection (daily budget, max-per-run, already-indexed skip) unchanged
**Tests**: 3 JUnit tests in `LiveMatchIndexingSchedulerTest.java`

### US2 — Emit SportsEvent JSON-LD whenever startDate exists (frontend)
**File**: `cricket-odds.component.ts`
- Changed gate from `if (startDate && location)` to `if (startDate)`
- Pass `location: location || undefined` so it's omitted when absent
**File**: `structured-data.service.ts` — no change needed (`buildLocation` already returns `undefined` for falsy input)

### US3 — Single H1 on completed match pages (frontend)
**File**: `scorecard.component.html`
- Changed `<h1>Scorecard</h1>` to `<h2>Scorecard</h2>`
- The sr-only `<h1>{{ matchSeo.h1 }}</h1>` in `cricket-odds.component.html` remains the single page-level H1

### US4 — Hourly sitemap GSC submission (backend)
**File**: `SitemapScheduler.java`
- Changed cron from `0 0 3 * * *` to `0 0 * * * *`
- Renamed method from `submitDailySitemap` to `submitHourlySitemap`
- Updated all log messages and `getStatus()` schedule string
**Tests**: 2 reflection tests in `SitemapSchedulerTest.java`

### US5 — Honest lastmod for upcoming matches (backend)
**File**: `SitemapService.java`
- `deriveLiveMatchLastMod()` now uses current emit time (`now`) when `lastStateUpdatedAt` is absent and the match is upcoming (future `scheduledStartTime` OR future parsed `startDate` string)
- Both the `scheduledStartTime` branch and the `parseLiveMatchStartDate()` fallback are guarded
**Tests**: 2 JUnit tests in `SitemapPartitionTest.java` (one per branch)

### US6 — Preserve SSR SportsEvent JSON-LD during hydration (frontend, discovered during verification)
**File**: `cricket-odds.component.ts`
- `updateStructuredData()` now checks: if running in the browser and the rebuild doesn't include a SportsEvent, but the SSR HTML already has one → skip the clear+rebuild, keep the SSR schemas
- Also skips `clearPageSchemas()` when items are null but SSR schemas exist
**File**: `structured-data.service.ts`
- Added `getPageSchemas()` method to read existing JSON-LD blocks from the DOM

## Production Rollout

### Backend rollout (2026-06-25 09:13 UTC)
- Image: `victoryline-backend:030-prematch-seo`
- Env backup: `.env.backup-030-*`
- Restart: `docker compose -f docker-compose.prod.yml up -d backend`
- Proof:
  - `[LiveMatchIndexer] Indexed match: arg-vs-sur-8th-match-mens-t20-wc-americas-sub-regional-qualifier-b-2026` + 9 more upcoming fixtures
  - `Completed: 10 indexed, 5 skipped (already indexed), 0 failed`
  - `/api/v1/seo/indexing/status` returns `Schedule: Every hour at :00`
  - Sitemap lastmod for upcoming = `2026-06-25T09:13:48Z` (now), not future dates

### Frontend rollout (2026-06-25 09:31 UTC)
- Image: `victoryline-frontend:030-prematch-seo`
- Restart: `docker compose -f docker-compose.prod.yml up -d --no-deps frontend`
- Proof:
  - SEO health audit: `failures: 0`, exit code 0, 30/30 sampled match pages have `h1=1`
  - `curl` of completed match page: exactly one `<h1>Mis Ainak Region vs Amo Region Match Result & Scorecard</h1>`

### Hydration fix rollout (2026-06-25 09:56 UTC)
- Image: `victoryline-frontend:030-hydration-fix`
- Proof:
  - Google Rich Results Test on `nam-vs-nig-1st-match-nigeria-tour-of-namibia-2026-match-updates-12T8`:
  - **3 valid items detected**: Article, Breadcrumbs, **Events (SportsEvent)** ✅
  - `startDate: "2026-06-25T07:30:00.000Z"`, `eventStatus: "https://schema.org/EventScheduled"`
  - API XHRs still blocked by robots.txt (correct), but SSR JSON-LD preserved through hydration

## Test Results

- Backend: **18/18 JUnit tests pass** (3 US1 + 13 US5 + 2 US4)
- Frontend: pre-existing test infra breakage (missing `axe-core`, Angular 7 `TestBed.inject`, missing `tsconfig.spec.json`) — not caused by these changes
- SEO health audit: **0 failures**, exit code 0 (was 19/30 with `h1=2`)
- Google Rich Results Test: **3 valid items** including SportsEvent (was 2, missing SportsEvent)

## Canonical Policy

- `/cric-live/{slug}` canonical route policy unchanged
- Spec 023 behavior unchanged
- No new routes, no canonical migration, no alias changes
- All sampled match pages return `canonical=1`, `noindex=0`

## Remaining Items

- T032: Google Rich Results Test is a manual browser check (JS-rendered, no API) — completed manually for one URL
- Frontend unit tests blocked by pre-existing infra breakage (T017-T018, T021-T022, T025)
- Monitor GSC impressions over the next 7-14 days to measure pre-match traffic improvement
