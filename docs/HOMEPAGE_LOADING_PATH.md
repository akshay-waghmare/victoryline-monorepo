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
2. Treat scorecard data as optional enrichment for scores, venue, and other details.
3. Keep scorecard enrichment bounded to 2.5 seconds per request.
4. If enrichment fails, keep the already-rendered live cards and do not block the page.
5. Combine live, upcoming, and completed streams so the initial live snapshot is not held behind enrichment.

This keeps the first view responsive while preserving scorecard updates when the upstream responds in time.

## Implementation

- `apps/frontend/src/app/features/matches/services/matches.service.ts`
  - emits an initial live-card snapshot before scorecard requests complete;
  - uses `combineLatest` for the aggregate match stream;
  - reduces the optional scorecard timeout from 8 seconds to 2.5 seconds.

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` — passed.
- Frontend and Caddy containers force-recreated with the local Docker stack.
- Backend, frontend, scraper, Redis, and Caddy were running; backend/frontend/scraper healthy.
- Eight requests to `http://localhost:8080/Home` returned HTTP 200 in 0.23–0.94 seconds after startup settled.
