# Frontend Deployed From Local Report

Date: 2026-07-08 IST
Repo: `victoryline-monorepo`
Branch inspected: `008-match-title-seo`
Current local `HEAD`: `e9822fc`

## Executive summary

The last frontend slice confirmed as deployed from local is commit `34c1325` using image:

- `macubex/victoryline-frontend:20260708-024508-34c1325`

That deployed frontend slice is the July 8 homepage restore and upcoming-tab stabilization rollout. The current local frontend worktree is ahead of that deployed slice and still contains a substantial set of modified and untracked frontend files that are not yet represented in the last confirmed deployed frontend image.

## Last confirmed deployed frontend from local

Source of truth:

- `docs/ROLLUP_20260708_HOMEPAGE_RESTORE_AND_FRONTEND_PROD_SYNC.md`
- `docs/ROLLUP_20260708_BACKEND_IMAGE_CATCHUP.md`

Confirmed deployed frontend commit:

- `34c1325` `fix(frontend): restore homepage and stabilize upcoming tabs`

Confirmed deployed frontend image:

- `FRONTEND_IMAGE=macubex/victoryline-frontend:20260708-024508-34c1325`

## What that deployed frontend slice included

The July 8 frontend rollout explicitly covered:

- restoring the older Crickzen homepage after the newer homepage changes broke the live surface
- keeping the upcoming-match tabs visible on `/cric-live/{slug}`
- preventing the scorecard tab from showing a misleading loading state before innings data exists

Primary files touched by the deployed frontend commit `34c1325`:

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.lifecycle.spec.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/home/home.component.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.ts`
- `apps/frontend/src/styles.css`

## Local frontend drift after the deployed slice

Comparison used:

- local frontend worktree versus deployed frontend commit `34c1325`

Current local frontend drift count:

- 32 modified frontend files
- 12 untracked frontend files

### Modified tracked frontend files not yet in the last confirmed deployed frontend image

- `apps/frontend/angular.json`
- `apps/frontend/scripts/prerender.js`
- `apps/frontend/server.js`
- `apps/frontend/src/app/app.component.spec.ts`
- `apps/frontend/src/app/app.component.ts`
- `apps/frontend/src/app/component/sidebar/sidebar.component.html`
- `apps/frontend/src/app/core/utils/match-utils.spec.ts`
- `apps/frontend/src/app/core/utils/match-utils.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.discovery.spec.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- `apps/frontend/src/app/features/matches/services/matches.service.ts`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.css`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.html`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.css`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.html`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.module.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.ts`
- `apps/frontend/src/app/scrape-control/scraping-service.service.spec.ts`
- `apps/frontend/src/app/seo/accessibility.spec.ts`
- `apps/frontend/src/app/seo/structured-data.service.spec.ts`
- `apps/frontend/src/app/seo/structured-data.service.ts`
- `apps/frontend/src/app/shared/components/footer/footer.component.ts`
- `apps/frontend/src/app/shared/models/match.models.ts`
- `apps/frontend/src/index.html`

### Untracked frontend files not yet in the last confirmed deployed frontend image

- `apps/frontend/src/app/about-us/about-us.component.ts`
- `apps/frontend/src/app/contact-us/contact-us.component.ts`
- `apps/frontend/src/app/corrections-policy/corrections-policy.component.ts`
- `apps/frontend/src/app/cric-live/cric-live.module.ts`
- `apps/frontend/src/app/cric-live/cric-live.routing.ts`
- `apps/frontend/src/app/editorial-policy/editorial-policy.component.ts`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.css`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.html`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.ts`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.discovery.spec.ts`
- `apps/frontend/src/app/seo/live-update-heuristics.spec.ts`
- `apps/frontend/src/app/seo/live-update-heuristics.ts`

## Local-only frontend drift grouped by area

### SSR, prerender, and app bootstrap

- `apps/frontend/angular.json`
- `apps/frontend/scripts/prerender.js`
- `apps/frontend/server.js`
- `apps/frontend/src/app/app.component.ts`
- `apps/frontend/src/app/app.component.spec.ts`
- `apps/frontend/src/index.html`

### Match discovery and match-list surfaces

- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.discovery.spec.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- `apps/frontend/src/app/features/matches/services/matches.service.ts`
- `apps/frontend/src/app/core/utils/match-utils.ts`
- `apps/frontend/src/app/core/utils/match-utils.spec.ts`

### Live match and score surfaces

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html`
- `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.ts`
- `apps/frontend/src/app/shared/models/match.models.ts`

### Series and stats surfaces

- `apps/frontend/src/app/features/stats/series-page/series-page.component.css`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.html`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.ts`
- `apps/frontend/src/app/features/stats/series-page/series-page.component.discovery.spec.ts`

### SEO and structured-data work

- `apps/frontend/src/app/seo/accessibility.spec.ts`
- `apps/frontend/src/app/seo/structured-data.service.ts`
- `apps/frontend/src/app/seo/structured-data.service.spec.ts`
- `apps/frontend/src/app/seo/live-update-heuristics.ts`
- `apps/frontend/src/app/seo/live-update-heuristics.spec.ts`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.css`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.html`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.ts`

### Layout, navigation, and static-information pages

- `apps/frontend/src/app/component/sidebar/sidebar.component.html`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.css`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.component.html`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.module.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- `apps/frontend/src/app/shared/components/footer/footer.component.ts`
- `apps/frontend/src/app/about-us/about-us.component.ts`
- `apps/frontend/src/app/contact-us/contact-us.component.ts`
- `apps/frontend/src/app/corrections-policy/corrections-policy.component.ts`
- `apps/frontend/src/app/editorial-policy/editorial-policy.component.ts`
- `apps/frontend/src/app/cric-live/cric-live.module.ts`
- `apps/frontend/src/app/cric-live/cric-live.routing.ts`

## Deployment interpretation

As of this report, the safest statement is:

- production frontend is confirmed at the July 8 local-built image `macubex/victoryline-frontend:20260708-024508-34c1325`
- local frontend source is ahead of that deployed slice
- the current local frontend worktree should not be treated as fully deployed

## Recommended next reporting/deploy shape

Before the next frontend rollout, split the local drift into smaller deployable slices:

1. SSR and routing slice
2. match discovery and list UX slice
3. live hero and score surfaces slice
4. structured data and SEO slice
5. static-info pages and layout slice

That will make it much easier to answer the follow-up question "which exact frontend changes are live now" without mixing unrelated frontend work into one deployment story.
