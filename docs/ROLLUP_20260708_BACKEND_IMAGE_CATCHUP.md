# Backend Image Catch-Up

Date: 2026-07-08 IST
Branch: `008-match-title-seo`
Backend image tag: `20260708-031940-backend-nocache-war`
Prod host: `administrator@204.12.199.137`

## Why this rollout was needed

The deployed backend image on prod was behind the local backend code even though the frontend and scraper had already been checked against production state.

The local backend WAR and the deployed backend image WAR were compared directly at the class level. These classes did not match before rollout:

- `CricketDataController`
- `LiveMatchIndexingScheduler`
- `LiveMatchServiceImpl`
- `SitemapService`
- `CricketDataService`
- `FreshnessEventDTO`
- `FreshnessSummaryDTO`
- `MatchFreshnessSummaryService`

That meant the current backend prod image was missing the local freshness, sitemap, indexing, and live-patch work.

## What was deployed

An intermediate backend image built from the repo Dockerfile was not trustworthy enough because the resulting WAR still did not match the local backend WAR at the class level, even after a no-cache rebuild.

The final deployable backend artifact was packaged from the verified local WAR into a runtime-only image.

Built and pushed from local:

- `macubex/victoryline-backend:20260708-031940-backend-nocache-war`

Updated prod:

- `BACKEND_IMAGE=macubex/victoryline-backend:20260708-031940-backend-nocache-war`

Unchanged in this step:

- `FRONTEND_IMAGE=macubex/victoryline-frontend:20260708-024508-34c1325`
- `SCRAPER_IMAGE=macubex/victoryline-scraper:20260708-031940-scraper-nocache`

## Main backend behavior now present on prod

- `POST /cricket-data/live-patch`
- `GET /cricket-data/freshness-summary`
- websocket snapshot publishing via `sendCricketSnapshot(...)`
- cache-only live patch updates via `cacheLastUpdatedData(...)`
- upcoming-aware live match indexing windows
- freshness support sitemap paths and freshness-aware `lastmod`

## Verification

### Container health

Verified:

- `victoryline-backend` running with image `macubex/victoryline-backend:20260708-031940-backend-nocache-war`
- backend health `healthy`
- `victoryline-scraper` running with image `macubex/victoryline-scraper:20260708-031940-scraper-nocache`
- scraper health `healthy`

### Boot and runtime proof

Observed in backend logs:

- Tomcat started on port `8099`
- application started successfully
- live match indexing scheduler started
- live match indexing activity resumed after boot

### Public proof

Verified:

- `https://www.crickzen.com/api/cricket-data/freshness-summary?url=https://www.crickzen.com/cric-live/demo-match-seo-check&pageType=preview`
  - returned `200`
- `https://www.crickzen.com/api/cricket-data/upcoming-matches?_ts=backend-final-check`
  - returned `200`

## Sync conclusion

After this rollout:

- frontend prod matches the intended local frontend state for the homepage restore and upcoming-tab fix
- scraper prod matches local logically, and the final no-cache scraper image plus the two runtime bind-mounted files were both confirmed against local
- backend prod is now caught up to the local backend WAR that was previously ahead of prod
