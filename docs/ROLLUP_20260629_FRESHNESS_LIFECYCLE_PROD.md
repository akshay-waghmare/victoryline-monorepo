# Freshness Lifecycle SEO Prod Rollout

Date: 2026-06-29 IST
Tag: `20260629-010604-seo040`
Prod host: `administrator@204.12.199.137`

## Scope

Rolled out the freshness-lifecycle SEO work across backend and frontend, including:

- backend freshness summary API and sitemap freshness support
- frontend freshness lifecycle pages
  - `/cricket-match-preview/:slug`
  - `/cricket-live-updates/:slug`
  - `/cricket-match-report/:slug`
- homepage and hub support work already included in the freshness slice

## Why this rollout used an isolated snapshot

The local repo was dirty with many unrelated backend, frontend, scraper, docs, and skill changes. To avoid shipping unrelated work, the rollout used a clean `git archive HEAD` snapshot and overlaid only the intended freshness files plus the dependency files discovered during isolated builds.

## Files that had to be included for the deployable slice

Backend:

- `apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/CricketDataController.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/MatchFreshnessSummaryService.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/FreshnessEventDTO.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/FreshnessSummaryDTO.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/websocket/service/CricketDataService.java`

Frontend:

- `apps/frontend/server.js`
- `apps/frontend/src/app/seo/structured-data.service.ts`
- `apps/frontend/src/app/seo/match-freshness-links.ts`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/*`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.module.ts`
- `apps/frontend/src/app/home/home.component.ts`
- `apps/frontend/src/app/home/home.component.html`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- `apps/frontend/src/app/cric-live/cric-live.module.ts`
- `apps/frontend/src/app/cric-live/cric-live.routing.ts`

## Deploy issues found and fixed during rollout

### 1. Backend isolated build dependency gap

`CricketDataController` depended on websocket helper methods that were not in the first rollout slice. Added:

- `apps/backend/spring-security-jwt/src/main/java/com/devglan/websocket/service/CricketDataService.java`

### 2. Backend prod boot failure

`SitemapService` had multiple constructors and this Spring Boot generation would not select one automatically. Fix applied:

- added `@Autowired` to the three-argument `SitemapService` constructor

Without this fix the backend restarted, then failed with:

- `No default constructor found`
- bean creation failure for `sitemapService`

### 3. Frontend isolated build dependency gap

Angular could not resolve `CricketOddsComponent` and related match-detail components from the first slice. Added:

- `apps/frontend/src/app/cric-live/cric-live.module.ts`
- `apps/frontend/src/app/cric-live/cric-live.routing.ts`

### 4. Frontend SSR route recognition gap

`server.js` did not recognize the new freshness lifecycle routes as known SSR routes, so direct requests could fall through as unknown routes. Fix applied:

- added route patterns for preview, live-updates, and report paths
- extended live-cache headers to `/cricket-live-updates/*`

## Image pins deployed

- `BACKEND_IMAGE=victoryline-backend:20260629-010604-seo040`
- `FRONTEND_IMAGE=victoryline-frontend:20260629-010604-seo040`
- scraper unchanged:
  - `SCRAPER_IMAGE=victoryline-scraper:fastlane-health-25ce9c0-20260611-012653`

## Verification

### Container state

Verified on prod after restart:

- `victoryline-backend:20260629-010604-seo040`
- `victoryline-frontend:20260629-010604-seo040`
- backend and frontend both reported healthy in `docker compose -f docker-compose.prod.yml ps`

### Backend boot proof

Verified in backend logs:

- `Tomcat started on port(s): 8099`
- `Started Application`
- `Mapped "{[/cricket-data/freshness-summary],methods=[GET]}"`

### Public route proof

Verified public responses:

- `https://www.crickzen.com/cricket-live-updates/demo-match-seo-check` returned `200`
- `https://www.crickzen.com/cricket-match-report/demo-match-seo-check` returned `200`
- `https://www.crickzen.com/cricket-match-preview/demo-match-seo-check` returned `200`
- `https://www.crickzen.com/sitemap.xml` returned `200`

### Public title proof

Observed:

- `/cricket-match-report/demo-match-seo-check`
  - specific title rendered:
  - `Demo Match Seo Check Result, Highlights & Full Scorecard Follow-up | Crickzen`
- `/cricket-live-updates/demo-match-seo-check`
  - route served successfully but title fell back to the generic site title
- `/cricket-match-preview/demo-match-seo-check`
  - route served successfully but title fell back to the generic site title

## Residual gaps

1. Preview and live-updates routes are now live, but synthetic-slug SSR still falls back to the generic site title.
2. Public proof confirms route availability, but not yet real-match freshness text or JSON-LD on an active fixture.
3. Frontend logs previously showed API fetch failures during SSR while backend was booting. Re-check this on a real live or upcoming match slug after the next data window.

## Recommended next verification window

Use one real upcoming or live slug and verify all of the following together:

- SSR title
- H1/body freshness copy
- `application/ld+json`
- `/cricket-data/freshness-summary`
- sitemap inclusion with `lastmod`
- live hub internal link visibility

## Commands used

Core rollout flow:

```powershell
scp <snapshot>.tar.gz administrator@204.12.199.137:/home/administrator/
ssh administrator@204.12.199.137
docker build -t victoryline-backend:20260629-010604-seo040 apps/backend/spring-security-jwt
docker build -t victoryline-frontend:20260629-010604-seo040 apps/frontend
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

Public proof:

```powershell
Invoke-WebRequest https://www.crickzen.com/cricket-live-updates/demo-match-seo-check -SkipHttpErrorCheck
Invoke-WebRequest https://www.crickzen.com/cricket-match-report/demo-match-seo-check -SkipHttpErrorCheck
Invoke-WebRequest https://www.crickzen.com/sitemap.xml
```
