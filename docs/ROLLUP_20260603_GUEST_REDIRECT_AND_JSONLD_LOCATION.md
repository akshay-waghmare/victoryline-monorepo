# ROLLUP 2026-06-03: Match Page Guest Redirect Fix and JSON-LD Location Hardening

## Summary

This rollout documented and shipped two production-facing fixes for Crickzen match pages:

1. public match viewers were being redirected away from live pages to `/login`
2. match-page `SportsEvent` JSON-LD could be emitted without a valid `location`, causing rich-result validation issues

Both fixes were deployed as frontend-only image rollouts on branch `008-match-title-seo`.

## Problem 1: Guest users redirected off public match pages

### User-facing symptom

- users could be reading a public `/cric-live/*` page and later see a redirect to `/login`
- after the SEO 404 hardening work, that redirect path could surface as a visible broken experience

### Root cause

- `apps/frontend/src/app/auth.service.ts` started a browser timer for every visitor
- every 60 seconds, if `tokenStorage.isLoggedIn()` was false, the app navigated to `login`
- public match pages instantiate code paths that inject `AuthService`, so anonymous visitors were affected too

### Fix

- removed the global guest redirect timer from `AuthService`
- added a real `/login` frontend route so intentional auth navigation resolves cleanly
- broadened match route handling so legacy or messy `/cric-live/...` variants stay inside the match component instead of falling into the wildcard 404 route
- updated SSR known-route handling for `/login` and broader `/cric-live/*` paths

### Files changed

- `apps/frontend/src/app/auth.service.ts`
- `apps/frontend/src/app/app.routing.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/server.js`

### Commit

- `121af46` - `fix frontend guest redirect on match pages`

### Production rollout

- image tag: `victoryline-frontend:guest-redirect-121af46-20260603`

### Verification

- sampled production match page returned `200`
- `/login` returned `200` and rendered `app-login`
- bad routes still returned `404`
- player-stats crawler endpoint still returned plain backend `404` when no stats existed, but no longer triggered guest redirect behavior

## Problem 2: Invalid match structured data due to missing location

### User-facing / SEO symptom

- Google rich-result validation reported `Missing field 'location'`
- invalid items were not eligible for Event rich results

### Root cause

- `StructuredDataService.sportsEvent()` only emitted `location` when a venue string was available
- some match pages had rich `SportsEvent` JSON-LD without a `location`
- other surfaces carried venue-like values that were not reliable venue names and should not be emitted as fake places

### Fix

- extended the frontend structured-data layer to accept either:
  - a plain venue string, or
  - a structured place object with address metadata
- added match-page venue extraction that prefers real `matchInfo.venue`
- allowed real object-shaped venue data with `city`, `state/region`, `country`, and address fields
- rejected placeholder or noisy values such as:
  - `Venue TBD`
  - `Venue not available`
  - match-title-like strings containing `match updates`
  - ordinal match labels like `3rd Match ...`
- kept breadcrumb JSON-LD in place
- added audit coverage so future SEO checks fail fast if a `SportsEvent` is emitted without `location`

### Files changed

- `apps/frontend/src/app/seo/structured-data.service.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `scripts/Audit-MatchSeo.ps1`

### Commit

- `84bb547` - `fix match structured data location`

### Production rollout

- image tag: `victoryline-frontend:seo-location-84bb547-20260603`

### Verification

- sampled live prod HTML contained:
  - `SportsEvent`
  - `location.@type = Place`
  - `location.name = The Rose Bowl, Southampton`
- updated audit output showed:
  - `JsonLd = 2`
  - `SportsEvents = 1`
  - no flags

## Commands / checks used

### Local build / compile validation

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build:ssr
.\node_modules\.bin\tsc.cmd -p .\src\tsconfig.app.json --noEmit
.\node_modules\.bin\tsc.cmd -p .\tsconfig.server.json --noEmit
```

### Production spot checks

```powershell
curl.exe -i "https://www.crickzen.com/cric-live/ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX"
curl.exe -i "https://www.crickzen.com/login"
curl.exe -i "https://www.crickzen.com/not-a-real-page"
curl.exe -i "https://www.crickzen.com/api/crawler/player-stats/match?externalMatchKey=ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX"
```

### JSON-LD verification

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Audit-MatchSeo.ps1 -UrlList <list>
```

## Final state

- production frontend commit: `84bb547`
- current documented frontend image: `victoryline-frontend:seo-location-84bb547-20260603`
- public match pages no longer force anonymous viewers to `/login`
- match-page `SportsEvent` JSON-LD now includes a real `location` when trustworthy venue data exists
- audit tooling now checks for missing event locations proactively
