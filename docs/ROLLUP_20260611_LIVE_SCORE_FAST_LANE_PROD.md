# Rollup: Live Score Fast Lane Production Rollout

## Summary

The fast-lane live score work is now live on production.

The main speed improvement came from splitting the update path in two:

- scraper intercepts `getSV3` quickly and pushes a merged live patch immediately
- backend broadcasts the live patch immediately instead of waiting for slower relational persistence

The rollout also exposed a production drift trap: the scraper container was still bind-mounting `crex_scraper.py` from the server repo, so an older host file overrode the new image and broke `/health` until the mounted file was synced.

## Root Cause

The original slow path waited for the normal save cycle before the frontend saw score and commentary changes.

After the fast lane was implemented, local testing proved the new path worked, but production still had two operational risks:

1. fast-lane feature flags were disabled in prod
2. the scraper service bind-mounted `apps/scraper/crex_scraper_python/src/crex_scraper.py` from the server checkout, which can silently override the image contents

That second issue caused the first prod scraper restart to come up with working live pushes but a broken `/health` endpoint because the mounted host file did not yet contain `get_fast_update_status()`.

## Deployed Artifacts

- backend image: `victoryline-backend:fastlane-25ce9c0-20260611-010636`
- scraper image: `victoryline-scraper:fastlane-health-25ce9c0-20260611-012653`
- frontend image left unchanged: `victoryline-frontend:seo-recovery-1d5ad5a-20260610-1500`

## Production Changes Applied

### `.env`

- `BACKEND_IMAGE=victoryline-backend:fastlane-25ce9c0-20260611-010636`
- `SCRAPER_IMAGE=victoryline-scraper:fastlane-health-25ce9c0-20260611-012653`
- `ENABLE_FAST_UPDATES=true`
- `ENABLE_PERSISTENT_PAGES=true`

### Server-side file sync

- synced `apps/scraper/crex_scraper_python/src/crex_scraper.py` into `/home/administrator/victoryline-monorepo/...`
- backup created on prod:
  - `apps/scraper/crex_scraper_python/src/crex_scraper.py.bak.fastlane-health-25ce9c0-20260611-012653`

## Rollout Flow Used

1. Built backend and scraper images locally.
2. Streamed images to prod with `docker save | ssh ... docker load`.
3. Backed up and updated prod `.env` instead of rebuilding from the server tree.
4. Restarted backend first and waited for health.
5. Restarted scraper after backend was healthy.
6. Observed `/health` `500` on the first scraper restart.
7. Traced the failure to the bind-mounted `crex_scraper.py` overriding the image.
8. Synced the mounted file, rebuilt the scraper image with defensive health handling, and restarted only the scraper.

## Verification

### Internal service proof

- `victoryline-backend`: healthy on `victoryline-backend:fastlane-25ce9c0-20260611-010636`
- `victoryline-scraper`: healthy on `victoryline-scraper:fastlane-health-25ce9c0-20260611-012653`
- scraper `/health`: `200`
- scraper `/health.data.fast_updates`:
  - `enabled=true`
  - `live_matches=1`
  - `covered_matches=1`
  - `coverage_ratio=1.0`
  - `active_interceptors=1`
  - `cached_matches=1`
  - `pids=90`

### Log proof

- repeated `matches.push_immediate.success` entries after rollout
- measured push times included low-latency pushes around `20-40 ms`
- `schedule.sync.success` continued during the same verification window

### Public API proof

Verified against:

- `https://www.crickzen.com/api/cricket-data/live-matches`
- `https://www.crickzen.com/api/cricket-data/last-updated-data?url=can-vs-ned-112th-match-mens-cwc-league-2-2023-27-match-updates-12KS`

Observed live state during final verification:

- `score=34-4`
- `over=10.5`
- `current_ball=Caught Out`

## Durable Lessons

- Do not trust a healthy new image alone when prod compose bind-mounts source files into the container.
- For backend+scraper rollouts, backend must come up healthy before scraper starts discovery and token fetches.
- Fast-lane success should be verified from three angles:
  - public live-match freshness
  - scraper `/health.data.fast_updates`
  - scraper log lines like `matches.push_immediate.success`

## Skill Harvest

This rollout produced a reusable skill pattern:

- low-blast-radius backend+scraper prod rollout
- image transfer without rebuilding from the server tree
- backend-first restart ordering
- bind-mount drift detection before trusting runtime behavior
- final proof from `/health`, logs, and public live APIs

That pattern is now captured in `.agents/skills/crickzen-backend-scraper-prod-rollout/SKILL.md`.
