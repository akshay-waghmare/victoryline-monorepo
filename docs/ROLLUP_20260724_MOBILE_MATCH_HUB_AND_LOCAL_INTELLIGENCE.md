# Mobile match hub and local intelligence checkpoint — 2026-07-24

## Scope

This checkpoint groups the current uncommitted worktree into one local-product slice:

- mobile match-hub navigation, tab routing, and viewport restoration;
- embedded Match Intelligence rendering and prediction-feed access;
- local Angular development build acceleration;
- scorecard and series catalogue resilience;
- on-demand CREX player-profile hydration.

It intentionally includes the backend, scraper, frontend, local Docker overlay, and diagnostic artifacts that were present in the worktree when the user requested a full checkpoint commit.

## Match hub and mobile behavior

- Match Intelligence is an in-hub tab at `/cric-live/{slug}/match-intelligence`; the standalone `/match-intelligence/{slug}` surface remains available for direct links.
- The hub refreshes its requested child-route path on navigation and derives tab selection from that path, avoiding stale tab-index comparisons after a route change.
- Tab navigation resets the viewport at navigation time and again after Angular/router rendering settles. This prevents a reused mobile route from restoring the prior footer position.
- Phone-width tab labels are shortened visually to `Live`, `Details`, `Score`, `XI`, and `Intel`, while explicit full accessible labels remain attached to their corresponding tabs.
- Match Intelligence suppresses its standalone breadcrumb/back action when embedded so it stays inside the parent match reading flow.
- The app module declaration issue that prevented direct mobile match-route rendering was corrected by declaring `AdminLayoutsComponent` in its owning module.

## Prediction and graph handoff

- The local prediction dashboard is a separate service on port `8000`; it is not owned by `docker-compose.local.yml`.
- The hot Angular proxy now forwards `/prediction-api` to `host.docker.internal:8000`, so the embedded Match Intelligence panel receives `/api/public/matches` in local development.
- The active scraper candidate contract and dashboard public feed were checked for the LS–MSG match. The feed returned a live `T20 all-gender v2` row with a probability and prediction history.
- Embedded Match Intelligence now reloads when the parent supplies its canonical `matchSlug`. This prevents an early empty input from leaving the panel permanently unavailable.
- The Chart.js probability graph now follows the dashboard's plotting contract: cricket `over.ball` positions are converted to ball positions, corrected duplicate ball snapshots replace earlier values, the current innings is plotted on its own 0–20/50 over axis, and probability/over axes plus point markers are visible. This avoids a chase appearing halfway across an arbitrary two-innings canvas.

## Scorecard and series catalogue

- The direct backend scorecard endpoint for the active LS–MSG match returned in roughly 364 ms during this checkpoint. The slow perceived scorecard state was therefore frontend lifecycle/proxy related rather than a slow scraper response.
- The discovery catalogue timeout was raised from 5 seconds to 12 seconds. Through the hot local proxy, catalogue lanes had been taking 2–7 seconds even though direct backend calls were quick; the lower limit left `/series` empty when one lane timed out.
- The current backend catalogue contains a live match and multiple upcoming fixtures. Series grouping continues to normalise transient CREX score/time text before rendering competition labels.

## Player profile fallback

- Player stats no longer depend solely on asynchronous preloading. If a stored player record does not contain a durable `player_profile` snapshot, the scraper fetches the profile on demand from CREX and pushes the result to the backend for persistence.
- The rebuilt scraper container contained the new on-demand path, and `tests/unit/test_player_stats_crawler.py` passed with `39 passed` when run with the scraper package on `PYTHONPATH`.

## Local build workflow

- The frontend Dockerfile uses Node 12.22.12 because the legacy `node-sass` dependency has a compatible Alpine binary there; Node 14 Alpine attempted an unsupported native build.
- The opt-in `docker-compose.frontend-hot.yml` keeps a mounted Angular source tree and dependency volume. It replaces repeated production SSR image builds during local iteration with the Angular watch server.
- Production SSR images are still required for a release artifact; the hot overlay is strictly the local iteration path.

## Verification recorded in this checkpoint

- `docker exec -w /app victoryline-monorepo-frontend-1 sh -lc "npx tsc -p src/tsconfig.app.json --noEmit"` passed after the Match Intelligence lifecycle/chart changes.
- The hot frontend compiled with warnings after the proxy and chart update.
- `http://localhost:4200/prediction-api/api/public/matches` returned the LS–MSG prediction through the frontend proxy, including its model label and history.
- Scraper health was green after its targeted image rebuild.

## Follow-up gate before production

1. Build the real SSR frontend image and verify its reverse proxy has the equivalent prediction API path; the hot proxy configuration alone is a local-development contract.
2. Perform a fresh browser pass at phone width after the final hot compile: all five tabs, top-of-page restore, visible scorecard, and populated Match Intelligence chart.
3. Do not promote this checkpoint to production without a route-level public verification of the prediction proxy and chart behavior.
