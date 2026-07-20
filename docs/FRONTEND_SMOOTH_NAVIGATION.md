# Frontend Smooth Navigation

## Problem

Match pages could briefly refresh or show loading behavior during initial route activation. The page was being initialized from `ngOnInit`, then initialized again when the first `NavigationEnd` event arrived.

## Change

`CricketOddsComponent` now tracks the last route key it fetched. If the initial setup and the first router event refer to the same match, the second fetch is skipped. The duplicate `fetchMatchInfo` call was also removed; match information is requested through the single `fetchCricketData` path.

The existing stale-while-revalidate services remain responsible for showing cached match data immediately and refreshing it in the background. This keeps live updates fresh without replacing visible content with a loading state during revalidation.

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` passes.
- The local homepage remains available at `http://localhost:8080/Home`.

