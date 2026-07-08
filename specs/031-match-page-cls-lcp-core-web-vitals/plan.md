# Implementation Plan: Match Page CLS / LCP Core Web Vitals Fix

**Branch**: `031-match-page-cls-lcp-core-web-vitals` | **Date**: 2026-06-25 | **Spec**: `specs/031-match-page-cls-lcp-core-web-vitals/spec.md`
**Input**: Feature specification from `/specs/031-match-page-cls-lcp-core-web-vitals/spec.md`

## Summary

Fix the six correlated root causes behind the 29 `/cric-live/*` URLs reported by Google Search Console with CLS > 0.25 (mobile) and LCP > 4s (mobile): (C1) hero has no reserved height while loading, (L3/C2) SSR hero data is re-fetched on the client with no `TransferState`, (L1/L2) render-blocking third-party head CSS/JS, (C3/C6) below-the-fold content populates with no reserved space, (C4) sidebar branding images lack dimensions, and (L4) the JS bundle is oversized and under-split. The fixes are ordered by impact-to-risk ratio: cheap high-impact CSS/HTML fixes first (US1, US3, US5), then the `TransferState` hydration fix (US2), then below-the-fold containment (US4), and finally the build/bundle split (US6).

## Technical Context

**Language/Version**: TypeScript 3.2.x (Angular 7.2.x), Angular Universal SSR (`@nguniversal/express-engine` 7.1.1), Express 4
**Primary Dependencies**: `@angular/platform-server`, `@nguniversal/module-map-ngfactory-loader`, `TransferState` (`@angular/platform-browser`), `domino` (SSR DOM shim), `helmet`, `http-proxy-middleware`
**Storage**: No storage changes. Redis/MySQL untouched. State is in-page (`TransferState` blob serialized into SSR HTML).
**Testing**: Angular unit tests (`ng test`) for the `TransferState` guard and hero reserved-height logic; raw SSR HTML inspection (`curl` + grep) for the head CSS/JS and TransferState blob; Lighthouse mobile run on a sample `/cric-live/*` URL for CLS/LCP; SEO health pattern audit rerun for canonical/H1/JSON-LD regression.
**Target Platform**: `apps/frontend` (Angular SSR) — `apps/frontend/src/index.html`, `apps/frontend/src/app/cricket-odds/`, `apps/frontend/src/app/match-live/components/live-hero/`, `apps/frontend/src/app/component/sidebar/`, `apps/frontend/src/styles.css`, `apps/frontend/angular.json`, `apps/frontend/server.js`
**Project Type**: Monorepo web app (frontend-only changes)
**Performance Goals**: CLS < 0.1 and LCP < 4s (target < 2.5s) on mobile for `/cric-live/*`; match route initial JS below the budget in FR-010.
**Constraints**: Do NOT change `/cric-live/{slug}` canonical policy, route shape, or JSON-LD (Spec 023 / Spec 030 intact). Do NOT break the live-refresh loop (WebSocket + poll). Do NOT remove monetization scripts from non-match pages. Do NOT block first paint on third-party fonts. SSR timeout fallback (8s) must still work.
**Scale/Scope**: Edits across ~7 frontend files plus `index.html` and `angular.json`; ~200–300 lines of change total. Affects all 29 reported URLs and every future `/cric-live/*` page.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | `TransferState` carries the SSR snapshot as a hint; the background refresh loop keeps live data accurate. No freshness regression. |
| II. Monorepo Architecture Standards | PASS | All edits stay in `apps/frontend`; no backend or scraper changes. |
| III. REST API Design Standards | PASS | No public API contract changes. The frontend consumes the existing match-info / cricket-data endpoints. |
| IV. Testing Requirements | PASS | Angular unit tests for the `TransferState` guard and hero reserved-height; raw SSR HTML inspection and Lighthouse run for end-to-end verification. |
| V. Performance Standards for Live Updates | PASS | The hero reserves its height and uses transferred state so the live snapshot paints at SSR time; the refresh loop continues after hydration. |
| VI. Frontend UI/UX Standards | PASS | Reserved hero height and font-display swap improve perceived stability without changing visual design. |

## Project Structure

### Documentation (this feature)

```text
specs/031-match-page-cls-lcp-core-web-vitals/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/frontend/
├── src/
│   ├── index.html                                    # US3: defer head CSS/JS, font-display=swap, prebid out of head
│   ├── styles.css                                    # US3/US7: resolve Poppins reference + size-adjust fallback
│   ├── app/
│   │   ├── cricket-odds/
│   │   │   └── cricket-odds.component.ts             # US2: TransferState serialize/consume, skip redundant fetch
│   │   ├── match-live/components/live-hero/
│   │   │   ├── live-hero.component.html              # US1: reserved-height loading placeholder
│   │   │   ├── live-hero.component.css               # US1: min-height per breakpoint; US4: content-visibility for off-screen
│   │   │   └── live-hero.component.ts                # US2: read transferred hero view
│   │   ├── component/sidebar/
│   │   │   └── sidebar.component.html                # US5: explicit width/height on branding images
│   │   └── cricket-odds/
│   │       └── cricket-odds.component.html           # US4: reserved min-height for commentary/announcement/odds slots
│   └── environments/                                 # (no change)
├── angular.json                                      # US6: bundle budgets + per-route code splitting
├── server.js                                         # (verify only) SSR render path + TransferState support
└── prerender-sidecar/                                # (optional US6) extend to /cric-live if prerender chosen
```

**Structure Decision**: All changes are frontend-only and deployed via the `crickzen-frontend-prod-rollout` skill. The fixes are layered so US1 (hero height), US3 (head CSS/JS), and US5 (sidebar images) can ship together as a first low-risk rollout; US2 (`TransferState`) ships as a second rollout after verification; US4 (below-the-fold containment) and US6 (bundle split) ship as a third.

## Execution Order

1. **US1 (frontend, P1)** — Reserve hero height. In `live-hero.component.css` set a per-breakpoint `min-height` on `.live-hero` (and the loading-state container) that matches the populated hero height; update `live-hero.component.html` `#loadingState` to fill that reserved box. No logic change.
2. **US3 (frontend, P1)** — Defer render-blocking head CSS/JS. In `index.html`: convert Font Awesome / Material Icons / Roboto / Bootstrap CSS to `preload` + `onload` media swap (or `font-display=swap` for fonts); move `prebid.js` out of `<head>` to idle-load after hydration (or remove from match pages if unused); confirm jQuery/Popper/Bootstrap JS are `defer` and not needed for first paint. Resolve the Poppins reference in `styles.css` (load with `font-display=swap` + size-adjust, or drop for system stack).
3. **US5 (frontend, P2)** — Add explicit `width`/`height` to the two sidebar branding `<img>` tags in `sidebar.component.html` (and a `loading="eager"` since they are above-the-fold on desktop).
4. **US2 (frontend, P1)** — `TransferState` for the hero snapshot. In `cricket-odds.component.ts`: inject `TransferState`, define `makeStateKey` for the match snapshot, write the resolved `matchInfo` + hero view on the server (`isPlatformServer`), and on the client consume the state to seed the hero without a blocking `fetchMatchInfo`/`fetchCricketData` on first boot. Guard the fallback so the existing fetch path runs when state is absent. Keep the background refresh loop intact.
5. **US4 (frontend, P2)** — Below-the-fold containment. In `cricket-odds.component.html` add reserved min-height skeletons (or `content-visibility: auto` + `contain-intrinsic-size`) for the commentary list, scorecard tab, and announcement slot so populating them does not shift above-the-fold content.
6. **US6 (frontend, P3)** — Bundle split + budgets. In `angular.json` add `budgets` for the match route initial JS; re-enable `vendorChunk` or split the giant lazy `4.*.js` chunk; lazy-load non-hero feature chunks (charts, odds sidebar, scorecard) after hydration. Optionally extend `prerender-sidecar` to `/cric-live/*` if a prerendered shell proves faster than on-demand SSR.
7. **Verification** — `ng test` (frontend unit tests); `curl` raw SSR HTML of a sample `/cric-live/*` URL (TransferState blob present, hero reserved height present, no blocking head CSS without `font-display=swap`); Lighthouse mobile run on a sample `/cric-live/*` URL (CLS < 0.1, LCP < 4s); SEO health pattern audit rerun (no canonical/H1/JSON-LD regression); manual check that the live-refresh loop still updates the hero after hydration.

## Verification Approach

Lighthouse Core Web Vitals can be run locally via the existing `.lighthouserc.json` (which already budgets CLS ≤ 0.1 and LCP ≤ 2.5s for `/match/`) against the local SSR stack, and against production via PageSpeed Insights for field-data confirmation. Verification uses:

1. **Raw SSR HTML inspection** — `curl` a `/cric-live/*` page from the local SSR server and from production; assert the hero container has a reserved min-height, a `TransferState` blob is present, and no third-party `<link rel="stylesheet">` in `<head>` lacks `font-display=swap` / preload swap.
2. **Lighthouse mobile run** — run `.lighthouserc.json` against the local stack for a sample `/cric-live/*` URL; assert CLS < 0.1 and LCP < 4s (target < 2.5s).
3. **Network panel / analytics log** — confirm the client does not issue a redundant `fetchMatchInfo`/`fetchCricketData` on first boot when `TransferState` is populated.
4. **SEO health pattern audit** — rerun `Audit-CrickzenSeoHealth.ps1`; assert no regression in canonical, H1, or JSON-LD checks on `/cric-live/*` (Spec 023 / Spec 030 intact).
5. **Manual live-refresh check** — open a live `/cric-live/*` page in a browser and confirm the hero score, recent balls, and batsman/bowler tables continue to update after hydration (no regression in the WebSocket + poll loop).
6. **GSC field data** — after deploy, monitor the Search Console "Page Experience" report for the 29 URLs; expect the CLS and LCP issue counts to drop over the 28-day field window. This is a lagging indicator and is documented as a post-deploy monitoring task, not a gate.

## Definition of Done

- A Lighthouse mobile run on a sample `/cric-live/*` URL reports CLS < 0.1 and LCP < 4s (target < 2.5s).
- Raw SSR HTML of a `/cric-live/*` page contains a `TransferState` blob with the match snapshot and a hero container with a reserved min-height.
- No third-party stylesheet in `<head>` blocks first paint without `font-display=swap` / preload swap; `prebid.js` is out of the critical path on match pages.
- Sidebar branding images render with explicit `width`/`height` and contribute zero CLS.
- The client does not issue a redundant `fetchMatchInfo`/`fetchCricketData` on first boot when `TransferState` is populated.
- The live-refresh loop continues to update the hero after hydration with no regression.
- The match route's initial JS payload is below the budget defined in `angular.json`.
- A SEO health pattern audit rerun shows no canonical/H1/JSON-LD regression on `/cric-live/*`.
- `/cric-live/{slug}` canonical policy and Spec 023 / Spec 030 behavior are unchanged.
