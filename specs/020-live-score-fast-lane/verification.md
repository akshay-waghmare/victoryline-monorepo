# Verification: Live Score Fast Lane

**Date**: 2026-06-10  
**Status**: Deployed to production on 2026-06-11

## Research Evidence

- Production Compose previously defaulted `ENABLE_FAST_UPDATES` and `ENABLE_PERSISTENT_PAGES` to `false`.
- Production inspection showed `ENABLE_PERSISTENT_PAGES=false` and `scraper_persistent_pool_size 0`.
- Repeated reads of the named live-match API remained unchanged for more than 30 seconds.
- The local `betx21.live` project uses a hot upstream stream, immediately emits a merged per-match snapshot on change, and keeps slower detail refresh separate.

## Implemented

- Production Compose defaults fast updates, immediate push, and persistent pages to `true`.
- Scraper `/health` now reports fast-lane enabled state, live-match coverage, capacity, errors, interceptors, and cached matches.
- Backend publishes `/topic/cricket.match.{matchId}.snapshot` before relational persistence, then retains all legacy field broadcasts.
- Live hero subscribes to the merged snapshot plus legacy field topics and normalizes Java DTO camelCase aliases.
- Periodic full scrape, lifecycle reconciliation, persistent-page capacity, and PID restart protection remain active.
- Scraper `/health` now degrades safely even if fast-lane status collection fails.
- Persistent-page pool stats now snapshot defensively so the request thread does not race live pool mutation.

## Verification Results

- Local focused validation:
  - `docker compose -f docker-compose.prod.yml config`: PASS; all three fast-lane flags resolve to `true`.
- Focused scraper health contracts: PASS; 6 tests.
- Fast-update scraper model/integration suite: PASS; 43 tests.
- Backend `CricketDataServiceTest`: PASS.
- Backend compile with tests skipped: PASS.
- Frontend production build: PASS.
- `git diff --check`: PASS.
- Local runtime proof:
  - fast lane observed a real `matches.push_immediate.success` after fixing case-insensitive `getSV3` interception
  - local health reported `fast_updates.enabled=true`, `active_interceptors=1`, `covered_matches=1`
  - local sampling advanced ahead of prod during the same live match window
- Production rollout proof on 2026-06-11:
  - backend image pin: `victoryline-backend:fastlane-25ce9c0-20260611-010636`
  - scraper image pin: `victoryline-scraper:fastlane-health-25ce9c0-20260611-012653`
  - feature flags: `ENABLE_FAST_UPDATES=true`, `ENABLE_PERSISTENT_PAGES=true`
  - `victoryline-backend`, `victoryline-scraper`, and `victoryline-frontend` all reported healthy after rollout
  - prod scraper `/health` returned `200` with `fast_updates.enabled=true`, `coverage_ratio=1.0`, `active_interceptors=1`, `cached_matches=1`, `pids=90`
  - prod scraper logs showed repeated `matches.push_immediate.success` entries, including a 20 ms push for the live `can-vs-ned-112th-match-mens-cwc-league-2-2023-27-match-updates-12KS` match
  - public API advanced to `score=34-4`, `over=10.5`, `current_ball=Caught Out` during verification

## Known Test-Runner Constraints

- The full Angular test runner is blocked by existing unrelated failures: a missing `ScrapingServiceService` export, missing `axe-core`/dynamic-import support, and missing `projects/route/tsconfig.spec.json`.
- `CricketDataControllerTest` cannot start under the module's old Mockito version on Java 17 because Mockito cannot define the mocked service class. The new broadcast-before-persistence ordering test compiles and remains as a regression guard for a compatible test runtime.

## Production Drift Found During Rollout

- Production `docker-compose.prod.yml` bind-mounts `/home/administrator/victoryline-monorepo/apps/scraper/crex_scraper_python/src/crex_scraper.py` into the scraper container.
- The first prod rollout used a correct image, but `/health` still returned `500` because the mounted server-side `crex_scraper.py` was older and did not include `get_fast_update_status()`.
- The final fix synced the mounted `crex_scraper.py` from the local repo, rebuilt the scraper image with the health guardrails, and restarted only the scraper.

## Final Production Gate

This slice is only considered complete when all of the following remain true on prod:

1. `/health.data.fast_updates.enabled` is `true`.
2. `covered_matches` reaches `live_matches`.
3. PID and memory levels remain below restart thresholds.
4. A live-match score/over changes through the snapshot topic without waiting for persistence.
5. Any scraper bind-mounted source files match the local fix or are intentionally removed from the prod compose path.
