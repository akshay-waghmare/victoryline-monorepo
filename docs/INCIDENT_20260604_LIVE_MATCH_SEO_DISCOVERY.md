# Live Match SEO Discovery Incident - 2026-06-04

## Match URL

- `https://www.crickzen.com/cric-live/sl-vs-wi-1st-odi-sri-lanka-tour-of-west-indies-2026-match-updates-11EH`

## Symptom

The Sri Lanka vs West Indies live match page was live on Crickzen, but an exact Google search did not show the Crickzen result.

## Findings

- The match page itself was crawlable and indexable:
  - HTTP `200`
  - self-canonical: `https://www.crickzen.com/cric-live/sl-vs-wi-1st-odi-sri-lanka-tour-of-west-indies-2026-match-updates-11EH`
  - `robots=index,follow`
  - one `h1`
  - `application/ld+json` present
  - `SportsEvent` JSON-LD present
- The URL was present in the generated child sitemap:
  - `https://www.crickzen.com/sitemaps/sitemap-matches-0019.xml`
  - `changefreq=hourly`
  - `priority=0.9`
- Sitemap submission to Google Search Console succeeded.
- Direct Indexing API submission failed with Google `429 Too Many Requests`.
- The prod status endpoint showed:
  - `GSC Initialized: true`
  - `Indexing API Initialized: true`
  - `Already Indexed (today): 236`
  - `Daily Budget: 180`
  - Redis persistence enabled.
- The homepage and `/live-cricket-score` SSR HTML initially rendered match cards as clickable Angular `div`s, but not real crawlable `/cric-live/...` anchors.

## Why Quota Was Gone At 3 AM India Time

Google's Indexing API default publish quota is `200` requests per project per day, and Google resets that quota at midnight Pacific Time, not midnight India time.

At roughly `3:00 AM IST` on `2026-06-04`, the Google quota day was still `2026-06-03` in Pacific/UTC terms. The quota had not reset yet.

The earlier production indexer had already observed `236` submitted URLs for the active quota window before Redis persistence was fixed. We seeded Redis with `predeploy-observed-*` placeholders to preserve that observed count and prevent the restarted backend from submitting even more URLs after restart. Google's `429` response confirmed the external quota really was exhausted.

Root causes for the fast burn:

- Before the previous backend SEO fix, the live-match indexer could pull from the broad match feed instead of strictly live/imminent matches.
- Before the Redis host fix, the quota counter could reset on backend restart because the backend was trying `localhost` Redis instead of the compose service name.
- Google quota reset is Pacific Time, so India early morning is still the prior quota window.

## Fix Applied

Changed match cards from SSR-invisible clickable `div`s to real anchors:

- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.css`

The card still emits the Angular click event for normal app navigation, but SSR now outputs:

```html
<a class="match-card ..." href="/cric-live/sl-vs-wi-1st-odi-sri-lanka-tour-of-west-indies-2026-match-updates-11EH">
```

This gives Googlebot a direct internal crawl path from the homepage and match-centre page to the live match page, even when the Indexing API quota is exhausted.

## Deployment

- Branch: `008-match-title-seo`
- Commit: `b8eace6` - `Expose match cards as crawlable links`
- Frontend image: `victoryline-frontend:seo-crawllinks-b8eace6-20260604-0310`
- Backend image left unchanged: `victoryline-backend:seo-redisquota-50a7a60-20260603-210123`
- Scraper image left unchanged: `victoryline-scraper:scraper-hotfix-753ff67-20260519-1640`
- Prod env backup: `.env.bak.seo-crawllinks-b8eace6-20260604-0310`
- Prod checkout after rollout: `b8eace6`

Only the frontend container was rebuilt/recreated.

## Verification

- Local checks passed:
  - `tsc -p apps/frontend/src/tsconfig.app.json --noEmit`
  - `tsc -p apps/frontend/tsconfig.server.json --noEmit`
  - `git diff --check` for changed match-card files
- Prod frontend container:
  - image `victoryline-frontend:seo-crawllinks-b8eace6-20260604-0310`
  - status `healthy`
- `https://www.crickzen.com/` SSR now contains:
  - `href="/cric-live/sl-vs-wi-1st-odi-sri-lanka-tour-of-west-indies-2026-match-updates-11EH"`
- `https://www.crickzen.com/live-cricket-score` SSR now contains:
  - `href="/cric-live/sl-vs-wi-1st-odi-sri-lanka-tour-of-west-indies-2026-match-updates-11EH"`
- Match page audit after deploy:
  - `200`
  - self-canonical
  - `robots=index,follow`
  - one `h1`
  - word count `2769`
  - JSON-LD count `2`
  - SportsEvent count `1`
- Sitemap submission after deploy:
  - `{"success":true,"message":"Sitemap submitted successfully"}`

## Repeatable Live Match SEO Strategy

1. When a live match appears, verify the exact `/cric-live/<slug>` URL returns `200`, self-canonical, `index,follow`, one `h1`, and JSON-LD.
2. Verify the URL is present in one child sitemap partition under `/sitemaps/sitemap-matches-*.xml`.
3. Verify homepage and `/live-cricket-score` SSR contain real `<a href="/cric-live/<slug>">` links for the match.
4. Submit the sitemap through `/api/v1/seo/indexing/sitemap/submit`.
5. Use direct Indexing API only as an accelerator when quota is available; do not rely on it as the primary path.
6. Track quota using Redis and keep the daily budget below Google's default `200` publish requests.
7. Prioritize live and imminent matches only. Do not spend quota on completed/stale/archive URLs during the live window.
8. Re-check Google visibility, but treat ranking/indexing as asynchronous after the technical path is clean.

## Remaining Caveat

Google can still take time to crawl, index, and rank the page. The current state is technically eligible and discoverable; immediate search appearance cannot be forced once the Indexing API quota is exhausted.

Also, Google documents the Indexing API as limited to pages with `JobPosting` or `BroadcastEvent` embedded in a `VideoObject`. Our live cricket match pages should therefore not depend on direct Indexing API submission as the only discovery path. The safer long-term strategy is fast sitemap inclusion plus strong SSR internal links, with Indexing API used only when quota and eligibility allow.
