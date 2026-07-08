---
description: "Task list for Phase 031: match page CLS / LCP Core Web Vitals fix"
---

# Tasks: Match Page CLS / LCP Core Web Vitals Fix

**Input**: Design documents from `/specs/031-match-page-cls-lcp-core-web-vitals/`
**Generated**: 2026-06-25
**Branch**: `031-match-page-cls-lcp-core-web-vitals`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Angular unit tests (`ng test`) for the `TransferState` guard and hero reserved-height logic; raw SSR HTML inspection (`curl` + grep) for head CSS/JS and TransferState blob; Lighthouse mobile run on a sample `/cric-live/*` URL for CLS/LCP; SEO health pattern audit rerun for canonical/H1/JSON-LD regression.

## Phase 1: Documentation

- [x] T001 Create `specs/031-match-page-cls-lcp-core-web-vitals/spec.md`
- [x] T002 Create `specs/031-match-page-cls-lcp-core-web-vitals/plan.md`
- [x] T003 Create `specs/031-match-page-cls-lcp-core-web-vitals/tasks.md`

## Phase 2: US1 Reserve Hero Height (Priority: P1)

**Goal**: Give `.live-hero` a reserved min-height per breakpoint so the loading state and the populated state occupy the same footprint (within 8%), eliminating the largest single CLS shift.

**Independent Test**: Render a `/cric-live/*` page with the hero in the loading state and assert the hero container has a non-zero reserved height equal to the populated hero height (within 8% on mobile).

### Tests for US1

- [x] T004 [P] [US1] Add Angular unit test asserting the loading-state hero container has a reserved min-height on mobile (≤768px), tablet, and desktop breakpoints
- [x] T005 [P] [US1] Add unit test asserting the populated live-layout hero height and the completed-layout hero height both fit within the reserved min-height (within 8%)

### Implementation for US1

- [x] T006 [US1] In `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.css`, set a per-breakpoint `min-height` on `.live-hero` (mobile/tablet/desktop) that matches the populated hero height; apply the same reservation to the `#loadingState` container (`.live-hero--loading`)
- [x] T007 [US1] In `apps/frontend/src/app/match-live/components/live-hero/live-hero.component.html`, update the `#loadingState` template to fill the reserved box (stretch the loader to the reserved height) so the loading and populated states occupy the same footprint
- [x] T008 [US1] Verify the completed-match 3-column layout (`live-hero.component.html:45-63`) fits within the reserved height on the relevant breakpoint; adjust the completed-layout reservation if it differs from the live layout
- [x] T009 [US1] Run `ng test` and confirm hero reserved-height tests pass

**Checkpoint**: Loading-state and populated-state hero occupy the same height on all breakpoints; the largest single CLS shift is eliminated.

---

## Phase 3: US3 Defer Render-Blocking Head CSS/JS (Priority: P1)

**Goal**: Eliminate render-blocking third-party CSS/JS in `<head>` so first paint and the LCP element do not wait on Font Awesome, Material Icons, Roboto, Bootstrap, or `prebid.js`.

**Independent Test**: Diff `index.html` and assert no third-party stylesheet blocks first paint, `prebid.js` is out of the critical path, and fonts use `font-display=swap` with a size-adjust fallback.

### Tests for US3

- [x] T010 [P] [US3] Add a static assertion (grep/test) that `index.html` contains no `<link rel="stylesheet">` for Font Awesome / Material Icons / Roboto / Bootstrap without `font-display=swap` or preload+onload media swap
- [x] T011 [P] [US3] Add a static assertion that `assets/prebid.js` is not referenced in `<head>` with `defer` on the match page path (moved to idle-load or removed)

### Implementation for US3

- [x] T012 [US3] In `apps/frontend/src/index.html`, convert Font Awesome + Material Icons + Roboto + Bootstrap CSS to non-blocking loading: `rel="preload" as="style" onload="this.rel='stylesheet'"` (with `noscript` fallback), and add `&display=swap` to the Google Fonts URL
- [x] T013 [US3] Move `assets/prebid.js` out of `<head>`: load via `requestIdleCallback` after hydration, or remove from match pages if confirmed unused (verify AdSense/prebid usage on `/cric-live/*` first)
- [x] T014 [US3] Confirm jQuery + Popper + Bootstrap JS (`index.html:123-127`) are `defer` and not required for the hero; if unused on the match page, document and consider removing
- [x] T015 [US3] In `apps/frontend/src/styles.css`, resolve the Poppins reference (lines 148, 646): either load Poppins with `font-display=swap` and a `size-adjust`/matching-metrics fallback, or drop the reference in favor of the system font stack used by `--font-family`
- [x] T016 [US3] Verify the scoreline text does not re-flow on font swap (use a matching fallback metric or `size-adjust`)
- [x] T017 [US3] Run the static assertions (T010/T011) and a local SSR `curl` to confirm no blocking head CSS without `font-display=swap`

**Checkpoint**: First paint no longer waits on third-party fonts/ads/Bootstrap; LCP element paints at SSR time.

---

## Phase 4: US5 Sidebar Branding Image Dimensions (Priority: P2)

**Goal**: Add explicit `width`/`height` to the sidebar branding images so they do not cause a layout shift when they load.

**Independent Test**: Inspect `sidebar.component.html` and assert both branding `<img>` elements have explicit `width` and `height` attributes matching their intrinsic dimensions.

### Implementation for US5

- [x] T018 [US5] In `apps/frontend/src/app/component/sidebar/sidebar.component.html`, add explicit `width` and `height` attributes to `branding_logo-img.png` and `branding_logo-txt.png` matching their intrinsic dimensions; keep `data-critical` and add `loading="eager"` (above-the-fold on desktop)
- [x] T019 [US5] Verify the sidebar is `display:none` on mobile (so the images do not contribute to CLS there) or that the reserved dimensions prevent a shift

**Checkpoint**: Sidebar branding images contribute zero CLS on all 29 URLs.

---

## Phase 5: US2 TransferState for Hero Snapshot (Priority: P1)

**Goal**: Serialize the SSR-resolved match snapshot into the page via `TransferState` so the client hydrates the hero from SSR data and does not re-fetch on first boot, making SSR paint the LCP and removing the second CLS shift.

**Independent Test**: Render a `/cric-live/*` page via SSR, inspect the HTML for a serialized `TransferState` key carrying the match snapshot, and assert the client does not issue a redundant `fetchMatchInfo`/`fetchCricketData` on first boot.

### Tests for US2

- [x] T020 [P] [US2] Add Angular unit test asserting `cricket-odds.component` writes the match snapshot to `TransferState` on the server (`isPlatformServer`)
- [x] T021 [P] [US2] Add unit test asserting the client consumes the transferred state and skips the blocking `fetchMatchInfo`/`fetchCricketData` on first boot when state is present
- [x] T022 [P] [US2] Add unit test asserting the client falls back to the existing fetch path when `TransferState` is absent (shell fallback / timeout)

### Implementation for US2

- [x] T023 [US2] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`, inject `TransferState` and `PLATFORM_ID`; define `makeStateKey` for the match snapshot (e.g. `MATCH_SNAPSHOT_<slug>`)
- [x] T024 [US2] On the server (`isPlatformServer`), after `fetchMatchInfo`/`fetchCricketData` resolve during SSR, write the combined snapshot (`matchInfo` + hero view) to `TransferState`
- [x] T025 [US2] On the client (`isPlatformBrowser`), in `ngOnInit` read the transferred state first; if present, seed `matchInfo` and the hero view from it and skip the blocking `fetchMatchInfo`/`fetchCricketData` on first boot
- [x] T026 [US2] Keep the background refresh loop (WebSocket + poll) intact so the hero continues to update after hydration; treat the transferred snapshot as a hint and reconcile on the next refresh
- [x] T027 [US2] Guard the fallback: if `TransferState` is absent (shell fallback, SSR timeout, stale state), run the existing fetch path with no regression
- [x] T028 [US2] Verify `server.js` SSR render path supports `TransferState` (it does via `ngExpressEngine`); no server.js change expected
- [x] T029 [US2] Run `ng test` and confirm the `TransferState` tests pass; run a local SSR `curl` and assert the serialized state blob is present in the HTML

**Checkpoint**: LCP element (hero scoreline) is stable at SSR paint time; client does not re-render the hero on first boot; live refresh continues after hydration.

---

## Phase 6: US4 Below-the-Fold Containment (Priority: P2)

**Goal**: Reserve space for below-the-fold content (commentary, scorecard, announcement, odds sidebar) so populating them does not shift above-the-fold elements.

**Independent Test**: Load a `/cric-live/*` page on mobile, scroll to commentary, and assert the commentary container has a reserved min-height or `content-visibility: auto` with `contain-intrinsic-size` before entries stream in.

### Tests for US4

- [x] T030 [P] [US4] Add unit/CSS test asserting the commentary container has a reserved min-height (skeleton) or `content-visibility: auto` + `contain-intrinsic-size` before entries populate
- [x] T031 [P] [US4] Add assertion that the scorecard tab uses `content-visibility: auto` (or is not laid out) when off-screen / not active

### Implementation for US4

- [x] T032 [US4] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`, wrap the commentary list (`commentaryEntries`) in a container with a reserved min-height skeleton so an empty-to-populated transition does not shift the hero/tab bar
- [x] T033 [US4] Apply `content-visibility: auto` with `contain-intrinsic-size` to the scorecard tab and any long below-the-fold section so the browser skips layout until scroll
- [x] T034 [US4] Reserve a slot for the announcement bar (`matchAnnouncement`) so its late appearance does not push the hero; render it below the fold or in a fixed-height slot
- [x] T035 [US4] Reserve a min-height for the odds sidebar column so populating it does not reflow the commentary column
- [x] T036 [US4] Run `ng test` and a local Lighthouse run; confirm above-the-fold CLS contribution from below-the-fold population is < 8%

**Checkpoint**: Populating commentary/scorecard/announcement/odds does not shift above-the-fold content.

---

## Phase 7: US6 Bundle Split + Budgets (Priority: P3)

**Goal**: Reduce and budget the match page's initial JS payload so hydration completes faster and the LCP element stabilizes sooner.

**Independent Test**: Build the app and assert the match route's initial JS (main + runtime + polyfills + critical lazy chunk) is below the defined budget, with the giant `4.*.js` chunk split or deferred.

### Tests for US6

- [x] T037 [P] [US6] Add a build assertion (or `angular.json` budget) that the match route initial JS payload (compressed) is below the defined budget (target ≤ 1.2 MB compressed total for main + runtime + polyfills + first lazy chunk)

### Implementation for US6

- [x] T038 [US6] In `apps/frontend/angular.json`, add `budgets` for the build: `initial` threshold appropriate for the match route
- [x] T039 [US6] Set `vendorChunk: true` and `namedChunks: true` to separate vendor into a cached chunk and improve chunk naming for debugging
- [x] T040 [US6] Ensure the hero-critical path (live-hero + cricket-odds core) is in the initial bundle and non-hero feature chunks are lazy-loaded
- [ ] T041 [US6] (Optional) Extend `apps/frontend/prerender-sidecar` to prerender `/cric-live/*` shell if a prerendered shell proves faster than on-demand SSR; respect `max-age=5` freshness for live scores
- [x] T042 [US6] Run `npm run build:ssr` and verify the initial JS payload is below the budget; confirm the hero still hydrates correctly from `TransferState`

**Checkpoint**: Match route initial JS below budget; hydration faster; LCP stabilizes sooner.

---

## Phase 8: End-to-End Verification

- [x] T043 Run `ng test` in `apps/frontend` and confirm all unit tests pass (hero reserved-height, TransferState, below-the-fold containment)
- [x] T044 Run `npm run build:ssr` and start the local SSR server; `curl` a sample `/cric-live/*` URL and assert: (a) hero container has a reserved min-height, (b) `TransferState` blob is present, (c) no blocking head CSS without `font-display=swap`, (d) sidebar branding images have explicit `width`/`height`
- [ ] T045 Run Lighthouse mobile (`.lighthouserc.json`) against a sample `/cric-live/*` URL; assert CLS < 0.1 and LCP < 4s (target < 2.5s)
- [ ] T046 Open a live `/cric-live/*` page in a browser; confirm the hero score, recent balls, and batsman/bowler tables continue to update after hydration (no live-refresh regression)
- [ ] T047 Rerun the SEO health pattern audit (`Audit-CrickzenSeoHealth.ps1`); assert no regression in canonical, H1, or JSON-LD checks on `/cric-live/*` (Spec 023 / Spec 030 intact)
- [ ] T048 Roll out to production via the `crickzen-frontend-prod-rollout` skill; verify raw production SSR HTML and a production Lighthouse run
- [ ] T049 Monitor the GSC "Page Experience" report over the 28-day field window for the 29 URLs; document the CLS/LCP issue count drop (lagging indicator, not a gate)

## Change Log

| Date       | Version | Description                         | Author |
|------------|---------|-------------------------------------|--------|
| 2026-06-25 | 0.1     | Initial draft from spec/plan.       | opencode |
