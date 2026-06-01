# Incident Report: Scorecard Bowler Details Missing on Prod

## Summary

On production, clicking a batter in the scorecard opened player details, but clicking a bowler often did nothing.

The frontend scorecard was using the raw `bowlers_stats` object key as the clickable player identity. That is brittle because CREX scorecard payloads also provide a canonical `player_name` field on each row, and some scorecards can be keyed by a short code or non-display token instead of the real player name.

## Evidence

Prod scorecard payloads include a canonical player name per bowler row:

```json
"bowlers_stats": {
  "Linsey Smith": {
    "overs": 3.0,
    "runs": 9,
    "wickets": 1,
    "player_name": "Linsey Smith"
  }
}
```

The scorecard frontend was wiring bowler clicks from the raw key:

- label: `{{ bowlerKey }}`
- click payload: `selectPlayer(bowlerKey)`
- details availability check: `canInspectPlayer(bowlerKey)`

That meant bowler detail resolution could fail whenever the scorecard key was not the same string as the canonical player identity used by the stats explorer lookup.

## Root Cause

The scorecard component treated scorecard map keys as stable player identifiers.

That assumption is unsafe for both:

- `bowlers_stats`
- `batsman_stats`

because the payload already provides `player_name`, which is the correct user-facing and lookup-safe value.

## Fix

Updated `apps/frontend/src/app/scorecard/scorecard.component.ts` and `apps/frontend/src/app/scorecard/scorecard.component.html` so the scorecard now:

- resolves display names from `stats.player_name` first
- emits the resolved player name for details clicks
- uses the resolved player name for `canInspectPlayer(...)`
- uses resolved names in the "Yet to bat" row as well

Added focused regression coverage in `apps/frontend/src/app/scorecard/scorecard.component.spec.ts` for:

- bowler display/click identity preferring `player_name`
- yet-to-bat names preferring `player_name`

## Changed Files

- `apps/frontend/src/app/scorecard/scorecard.component.ts`
- `apps/frontend/src/app/scorecard/scorecard.component.html`
- `apps/frontend/src/app/scorecard/scorecard.component.spec.ts`

## What Changed In Code

### `apps/frontend/src/app/scorecard/scorecard.component.ts`

- added `getBatterDisplayName(...)`
- added `getBowlerDisplayName(...)`
- added `getYetToBatDisplayNames(...)`
- added `getResolvedPlayerName(...)`
- changed scorecard display and click resolution to prefer `stats.player_name`

### `apps/frontend/src/app/scorecard/scorecard.component.html`

- batter buttons now use `getBatterDisplayName(...)`
- bowler buttons now use `getBowlerDisplayName(...)`
- "Yet to bat" now renders canonical display names instead of raw object keys

### `apps/frontend/src/app/scorecard/scorecard.component.spec.ts`

- added regression coverage for bowler identity/display using `player_name`
- added regression coverage for "Yet to bat" display using `player_name`

## Verification

### Prod payload check

Use a live match URL:

```powershell
$url = [System.Uri]::EscapeDataString('https://crex.com/cricket-live-score/eng-w-vs-nz-w-3rd-t20-new-zealand-women-tour-of-england-2026-match-updates-W9Q')
Invoke-WebRequest -UseBasicParsing -Uri ('https://www.crickzen.com/api/cricket-data/sC4-stats/get?url=' + $url) | Select-Object -ExpandProperty Content
```

### Frontend build

This Angular 7 app needs the legacy OpenSSL provider on current Node:

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build
```

Result during this fix: build passed.

### Frontend tests

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm test -- --watch=false --browsers=ChromeHeadless
```

Result during this fix: the suite is still blocked by unrelated repo issues outside this scorecard change:

- stale spec import in `scrape-control/scraping-service.service.spec.ts`
- missing `axe-core`
- unsupported dynamic import in `src/app/seo/accessibility.spec.ts`
- missing `projects/route/tsconfig.spec.json`

These failures existed at suite level and prevented clean test execution for the whole frontend test run.

## Deployment

### Deployed Frontend Image

- previous running frontend image: `victoryline-frontend:deploy-3c522be-20260518-1920`
- deployed frontend image: `victoryline-frontend:scorecardfix-20260525-201336`

### Why This Was Built Outside The Prod Repo Checkout

The prod repo checkout at `/home/administrator/victoryline-monorepo` was already dirty with unrelated changes and backup files. To avoid rebuilding from a dirty server tree, the frontend image was built from a temporary upload under `/tmp`, then only `FRONTEND_IMAGE` in prod `.env` was changed.

### Deployment Steps Used

1. Built the frontend locally with:

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build
```

2. Archived `apps/frontend` without `node_modules` or `dist`
3. Uploaded the archive to `/tmp` on prod
4. Built the Docker image on prod from `/tmp/victoryline-frontend-scorecardfix-20260525-201336`
5. Updated `/home/administrator/victoryline-monorepo/.env`:

```text
FRONTEND_IMAGE=victoryline-frontend:scorecardfix-20260525-201336
```

6. Recreated only the frontend service:

```bash
docker compose -f docker-compose.prod.yml up -d frontend
```

### Deployment Safety Notes

- prod `.env` backup created:
  - `/home/administrator/victoryline-monorepo/.env.bak.frontend-scorecardfix-20260525-201336`
- temporary build artifacts were removed from `/tmp` after the rollout

### Post-Deploy Verification

- `docker inspect victoryline-frontend` reported:
  - image: `victoryline-frontend:scorecardfix-20260525-201336`
  - health: `healthy`
- `https://www.crickzen.com/` returned `200`
- `https://www.crickzen.com/matches` returned `200`

## Repo Sync

After deployment, the deployed source files and this incident note were copied into the prod repo checkout so the relevant local and remote repo files match for this fix:

- `apps/frontend/src/app/scorecard/scorecard.component.ts`
- `apps/frontend/src/app/scorecard/scorecard.component.html`
- `apps/frontend/src/app/scorecard/scorecard.component.spec.ts`
- `docs/INCIDENT_20260525_SCORECARD_BOWLER_DETAILS.md`

This sync was limited to the scorecard-fix files and documentation. It intentionally did not rewrite unrelated dirty files already present in either checkout.

## Deployment Note

This repo change fixes the frontend source. Production still needs the normal frontend deployment flow after merge.
