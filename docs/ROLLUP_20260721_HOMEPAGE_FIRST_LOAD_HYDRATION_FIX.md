# Homepage First-Load Card Hydration Fix

Date: 2026-07-21  
Scope: local frontend and local Docker runtime only  
Production: not deployed and not committed in this pass

## Symptom

On the first visit to `/Home`, match cards rendered briefly and then disappeared. A manual browser reload made them appear again. The same first-load path also affected the reliability of the homepage news block.

## Root cause

Three SSR/client boundaries interacted:

1. The SSR transfer-state payload was emitted after the Angular browser bundles, so the first client component initialization could not reliably read it.
2. Serialized `startTime` and `lastUpdated` values arrived in the browser as ISO strings. Homepage filters expect `Date` objects, so hydrated upcoming matches were filtered out.
3. The first live refresh could return an empty snapshot while the backend was warming up. That empty response replaced the already-rendered SSR cards with the quiet scoreboard state.

## Change made

### `apps/frontend/src/app/home/home.component.ts`

- Added browser transfer-state fallback parsing for the existing `crickzen-app-state` payload.
- Deferred the first browser hydration read until the SSR state script is available.
- Normalized hydrated match dates back to `Date` objects.
- Preserved visible hydrated cards when a transient first refresh returns an empty list.
- Applied the same transfer-state path to homepage news and retained the blog fallback.

### `apps/frontend/server.js`

- Added `moveTransferStateBeforeBundles()`.
- SSR now places `crickzen-app-state` before the Angular runtime script, making the transfer-state read deterministic on a fresh visit.

## Local verification

The active local stack was updated and checked at:

```text
http://localhost:8080/Home
```

Fresh browser visit result:

| Check | Result |
|---|---:|
| Match cards at first observation | 6 |
| Cards after 500 ms | 6 |
| Cards after 1.5 s | 6 |
| Cards after 3.5 s | 6 |
| Cards after 6 s | 6 |
| Empty-state visible | No |
| Error-state visible | No |
| Browser TypeScript check | Passed |
| Browser production build | Passed |

The local Docker frontend container was restarted after syncing the successful browser bundle and SSR wrapper. No production service was changed.

## Rollout note

Before production deployment, rebuild the frontend image through the normal frontend rollout procedure, then verify the public homepage on a fresh browser context—not only after a reload. Confirm that cards and news remain present through the first client refresh.
