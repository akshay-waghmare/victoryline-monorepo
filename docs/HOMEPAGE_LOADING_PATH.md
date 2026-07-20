# Homepage loading path

Updated: 2026-07-20

## Problem

The homepage match rail waited for every active match's CREX scorecard request before it could leave the loading state. A slow `/api/cricket-data/sC4-stats/get` request could therefore delay the complete homepage by up to eight seconds and produce browser errors such as:

```text
Error fetching scorecard ... TimeoutError: Timeout has occurred
```

The live-match endpoint already provides the lifecycle and identity data needed for the first useful render, but it does not always include scores.

## Loading contract

1. Render the live rail immediately from the backend live-match feed.
2. Keep scorecard data on the selected-match detail surface, not in the catalog refresh loop.
3. If a detail request fails, keep the catalog cards and do not block the page.
4. Combine live, upcoming, and completed metadata streams without per-match upstream fan-out.
5. Match Intelligence loads its route-specific match info and snapshot directly, rather than loading the full catalog first.

This keeps the first view responsive while preserving full scorecard requests for users who explicitly open a match.

## Implementation

- `apps/frontend/src/app/features/matches/services/matches.service.ts`
- `apps/frontend/src/app/features/match-intelligence/match-intelligence-data.service.ts`
  - loads route-specific match info, live data, and public prediction data in parallel;
  - bounds optional intelligence inputs so one slow source cannot hold the surface indefinitely.

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` — passed.
- Frontend and Caddy containers force-recreated with the local Docker stack.
- Backend, frontend, scraper, Redis, and Caddy were running; backend/frontend/scraper healthy.
- Eight requests to `http://localhost:8080/Home` returned HTTP 200 in 0.23–0.94 seconds after startup settled.
- Follow-up verification: `/Home` returned HTTP 200 in 0.53–1.56 seconds and Match Intelligence returned HTTP 200 in 0.42 seconds.
- The served bundle no longer contains the catalog scorecard error or verbose score-parsing debug strings; fresh frontend logs had no scorecard timeout or unhandled-error markers.
