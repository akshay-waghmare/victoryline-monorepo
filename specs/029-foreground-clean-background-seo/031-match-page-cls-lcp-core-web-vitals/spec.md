# Feature Specification: Match Page CLS / LCP Core Web Vitals Fix

**Feature Branch**: `031-match-page-cls-lcp-core-web-vitals`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Google Search Console reports 29 URLs with CLS issue: more than 0.25 (mobile) and LCP issue: longer than 4s (mobile) — Poor page experience, Not Started. Generate a specific spec plan and tasks to solve this, with a thorough codebase analysis and root cause first."

## Current Evidence

A source audit on 2026-06-25 of the affected URL set — the 29 `/cric-live/{slug}` match pages rendered by `CricketOddsComponent` inside `AdminLayoutsComponent` (with `app-sidebar` + `app-banner`) — found six correlated root causes for the CLS > 0.25 and LCP > 4s (mobile) reports. The same template and loading path serve all 29 URLs, so a single fix set resolves the whole cohort.

### LCP root causes (LCP > 4s mobile)

- **L1. Render-blocking third-party CSS in `<head>`.** `apps/frontend/src/index.html:110-118` loads Font Awesome, Material Icons, Roboto, and Bootstrap as blocking `<link rel="stylesheet">` from `maxcdn.bootstrapcdn.com` / `fonts.googleapis.com` with no `font-display=swap`, no `media` swap, and no preconnect-to-fetch ordering beyond what is already declared. First paint cannot complete until these stylesheets download on a mobile connection.
- **L2. Heavy head JavaScript competing with the main bundle.** `index.html:24-27` loads `gtag/js` (async), `adsbygoogle.js` (async, third-party round trip), and `assets/prebid.js` (248,634 bytes) with `defer` in the `<head>`. `index.html:123-127` adds jQuery + Popper + Bootstrap JS from CDN with `defer`. Although `defer`/`async` avoid hard blocking, all of these contend for network/CPU on mobile and delay hydration — which is when the hero scoreline becomes the stable LCP element.
- **L3. No `TransferState` — the hero re-fetches on the client after hydration.** `cricket-odds.component.ts:238` (`ngOnInit`) calls `fetchCricketData()` and `fetchMatchInfo()` unconditionally; there is no `TransferState`, `makeStateKey`, or `isPlatformBrowser` guard around the initial fetch. The SSR HTML renders the hero from a route-hint fallback, then the client re-fetches the real snapshot and re-renders. The LCP timestamp is therefore the client-paint time, not the SSR-paint time.
- **L4. Oversized, under-split JavaScript bundles.** `apps/frontend/dist/id-card-app/` ships `main.*.js` (827,253 bytes) and a single lazy chunk `4.51e8e5e0ab677cbf163e.js` (1,581,467 bytes). `angular.json:48` sets `vendorChunk: false` and there are no per-route budgets. The match page parses ~2.4 MB of JS on mobile before hydration completes and the hero stabilizes.
- **L5. No prerender for `/cric-live/*`.** `apps/frontend/prerender-sidecar` exists but only prerenders hub/listing routes; live match pages go through Node SSR on every request (`server.js:117` sets `max-age=5, stale-while-revalidate=55` for `/cric-live/`). Cold renders are slow and fall back to the bare shell after the 8s `SSR_RENDER_TIMEOUT_MS`, which itself produces a blank-then-pop LCP.

### CLS root causes (CLS > 0.25 mobile)

- **C1. Hero has no reserved min-height while loading.** `live-hero.component.css:10-22` defines `.live-hero { height: auto; min-height: 0 }`, and the `#loadingState` template (`live-hero.component.html:162-173`) renders only a one-line "Loading live hero…" label. When `view$` resolves, the hero expands from ~40px to ~300px in a single frame — the largest single shift on the page.
- **C2. SSR/client data mismatch from no TransferState.** Because the server renders the route-hint fallback view and the client re-fetches the real snapshot (see L3), the hero is painted at one height and then re-painted at a different height — a second shift that compounds C1.
- **C3. Below-hero content populates after hydration with no reserved space.** `cricket-odds.component.html` injects the commentary list (`commentaryEntries`), `last6Balls`, batsman/bowler tables, the announcement bar (`matchAnnouncement`), and the odds sidebar after WS/API resolves. None of these containers have a reserved min-height or skeleton, so each population event pushes layout downward.
- **C4. Sidebar branding images have no explicit dimensions.** `sidebar.component.html:5-6` renders `branding_logo-img.png` and `branding_logo-txt.png` without `width`/`height` attributes. The sidebar is part of `AdminLayoutsComponent`, which wraps every `/cric-live/*` page, so these images contribute a shift on every affected URL when they finish loading.
- **C5. Web font swap on the scoreline.** `styles.css:148,646` references `'Poppins', sans-serif` for hero/scoreline text, but Poppins is never loaded via a `<link>` in `index.html`. The browser falls back to Roboto/sans-serif and then re-flows when Material Icons / Roboto finally swap in from the render-blocking CSS in L1.
- **C6. No CSS containment on below-the-fold sections.** The commentary list and the scorecard tab have no `content-visibility: auto` / `contain-intrinsic-size`, so the browser lays out the entire long commentary list during initial render and re-layouts when entries stream in.

### Why all 29 URLs share the same defects

`admin-layouts.routing.ts:83-84` routes every `/cric-live/{slug}` and `/cric-live/:path` to `CricketOddsComponent`, wrapped by `AdminLayoutsComponent` (`admin-layouts.component.html` loads `app-sidebar` + `app-banner` + `<router-outlet>`). The 29 GSC-flagged URLs are a sample of this one route family; the defects are structural to the template, not URL-specific.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hero reserves its space before data arrives (Priority: P1)

As a mobile visitor, I want the live hero to occupy its final height from the first paint so the score does not push the page downward when it loads.

**Why this priority**: C1 is the single largest layout shift on the page and the dominant CLS contributor. Reserving the hero footprint fixes it in one frame.

**Independent Test**: Render a `/cric-live/*` page with the hero in the loading state and assert the rendered hero container has a non-zero reserved height equal to the populated hero height (within 8% on mobile).

**Acceptance Scenarios**:
1. **Given** the hero is in the loading state, **When** the page is painted, **Then** `.live-hero` (or its placeholder) has a reserved min-height that matches the populated hero height on the current breakpoint.
2. **Given** the hero data resolves, **When** the populated hero replaces the loading state, **Then** the visible height delta is less than 8% of the reserved height (no large shift).
3. **Given** a completed match renders the 3-column completed layout, **When** it replaces the loading state, **Then** the reserved height accounts for the completed layout height, not the live layout height.

---

### User Story 2 - SSR hero data is transferred to the client (no re-fetch flash) (Priority: P1)

As a mobile visitor, I want the hero scoreline painted by SSR to be the same data the client hydrates with, so the LCP element is stable at SSR paint time and does not re-render.

**Why this priority**: L3 + C2 are why the LCP timestamp is the client-paint time and why the hero shifts a second time. `TransferState` makes SSR paint the LCP.

**Independent Test**: Render a `/cric-live/*` page via SSR, inspect the HTML for a serialized `TransferState` key carrying the match snapshot, and assert the client does not issue a redundant `fetchMatchInfo`/`fetchCricketData` call for that key on first boot.

**Acceptance Scenarios**:
1. **Given** the server resolves the match snapshot during SSR, **When** the HTML is emitted, **Then** a `TransferState` blob containing the hero snapshot is serialized into the page.
2. **Given** the client boots with a populated `TransferState` key, **When** `ngOnInit` runs, **Then** the hero renders from the transferred state without a blocking `fetchMatchInfo`/`fetchCricketData` round trip.
3. **Given** the transferred snapshot is stale (older than the refresh interval), **When** the client refreshes, **Then** the refresh happens in the background and does not blank the hero first.
4. **Given** SSR failed to populate the state (timeout/shell fallback), **When** the client boots, **Then** it falls back to the existing fetch path (no regression).

---

### User Story 3 - Render-blocking head CSS/JS is deferred or eliminated (Priority: P1)

As a mobile visitor, I want first paint to depend only on the critical CSS, so the LCP element paints before third-party fonts, ads, and Bootstrap JS download.

**Why this priority**: L1 + L2 are the largest first-paint blockers on mobile and are pure `index.html` edits with no component logic risk.

**Independent Test**: Diff `index.html` and assert Font Awesome, Material Icons, Roboto, and Bootstrap CSS load non-blockingly (preload + `media swap` / `font-display=swap` / async), and `prebid.js` is moved out of the critical path (idle-loaded or removed if unused on match pages).

**Acceptance Scenarios**:
1. **Given** the page loads, **When** the browser parses `<head>`, **Then** no third-party stylesheet blocks first paint (all loaded via `preload` + `onload` media swap, or `font-display=swap`).
2. **Given** `prebid.js` is not required for the hero, **When** the page loads, **Then** `prebid.js` is loaded via `requestIdleCallback`/deferred after hydration, not in `<head>`.
3. **Given** jQuery/Popper/Bootstrap JS are not needed for the hero, **When** the page loads, **Then** they are loaded with `defer` after the Angular main bundle or removed if unused.
4. **Given** the fonts swap in after first paint, **When** the scoreline text re-flows, **Then** the font swap does not cause a CLS shift (size-adjust / matching fallback metrics).

---

### User Story 4 - Below-the-fold content reserves space or is skipped (Priority: P2)

As a mobile visitor, I want the commentary list and scorecard to not push the hero or above-the-fold content when they populate.

**Why this priority**: C3 + C6 are the secondary CLS contributors after the hero. They are lower-risk CSS/template edits.

**Independent Test**: Load a `/cric-live/*` page on mobile, scroll to commentary, and assert the commentary container has a reserved min-height or `content-visibility: auto` with `contain-intrinsic-size` before entries stream in.

**Acceptance Scenarios**:
1. **Given** the commentary container is empty, **When** entries stream in, **Then** the container does not push any above-the-fold element (hero, tab bar) by more than 8%.
2. **Given** the scorecard tab is not active, **When** it is rendered off-screen, **Then** it uses `content-visibility: auto` so it is not laid out until scrolled into view.
3. **Given** the announcement bar is absent, **When** it later appears, **Then** it is rendered in a reserved slot or below the fold so it does not shift the hero.

---

### User Story 5 - Sidebar branding images have explicit dimensions (Priority: P2)

As a mobile visitor, I want sidebar logo images to have reserved dimensions so they do not cause a layout shift when they load.

**Why this priority**: C4 is a small, mechanical fix that applies to all 29 URLs because they share `AdminLayoutsComponent`.

**Independent Test**: Inspect `sidebar.component.html` and assert both branding `<img>` elements have explicit `width` and `height` attributes matching their intrinsic dimensions.

**Acceptance Scenarios**:
1. **Given** the sidebar branding images load, **When** they finish, **Then** no layout shift occurs (explicit `width`/`height` present).
2. **Given** the sidebar is hidden on mobile, **When** the images are not displayed, **Then** they do not contribute to CLS (not rendered or `display:none` before load).

---

### User Story 6 - JavaScript bundle is split and budgeted for the match page (Priority: P3)

As a mobile visitor, I want the match page to download only the JS it needs for first paint, so hydration completes faster and the LCP element stabilizes sooner.

**Why this priority**: L4 is the highest-effort fix (Angular 7 build config + lazy restructuring) and is scheduled last so the cheap, high-impact fixes (US1–US3) ship first.

**Independent Test**: Build the app and assert the match route's initial JS (main + runtime + polyfills + critical lazy chunk) is below a defined budget, with the giant `4.*.js` chunk either split or deferred.

**Acceptance Scenarios**:
1. **Given** a production build, **When** the match page loads, **Then** the initial JS payload (main + runtime + polyfills + first lazy chunk) is below 1.2 MB compressed total (or a defined budget).
2. **Given** `angular.json` budgets are configured, **When** a build exceeds the budget, **Then** the build warns/errors.
3. **Given** non-hero feature chunks (charts, odds sidebar, scorecard) exist, **When** the hero loads, **Then** those chunks are lazy-loaded after hydration.

---

### Edge Cases

- A match may transition from UPCOMING to LIVE between SSR render and client hydration; the transferred snapshot must be treated as a hint and a background refresh must reconcile without blanking the hero.
- SSR may time out (8s) and emit the bare shell; the client must fall back to the existing fetch path gracefully and still reserve the hero height.
- A completed match renders a different hero layout (3-column) than a live match; the reserved hero height must account for the correct lifecycle layout.
- The odds sidebar, commentary, and scorecard may be empty for a freshly-live match; reserved placeholders must collapse cleanly without leaving a large gap.
- `prebid.js` / AdSense may be required for monetization on non-match pages; deferring them must be scoped to the match route or confirmed unused before removal.
- Poppins is referenced in CSS but never loaded; the fix must either load it with `font-display=swap` and matching metrics or remove the reference in favor of the system font stack.
- Prerendering `/cric-live/*` must respect `max-age=5` freshness for live scores; a prerendered snapshot older than the refresh window must not be served as the live state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `live-hero.component.css` / `.html` MUST reserve a min-height for the hero container on each breakpoint (mobile, tablet, desktop) that is populated before `view$` resolves, so the loading state and the populated state occupy the same footprint (within 8%).
- **FR-002**: `cricket-odds.component.ts` MUST use Angular `TransferState` (`makeStateKey`) to serialize the resolved match snapshot (match info + hero view) into the SSR HTML and consume it on the client to avoid a redundant `fetchMatchInfo`/`fetchCricketData` round trip on first boot.
- **FR-003**: The client MUST fall back to the existing fetch path when `TransferState` is absent (shell fallback, timeout, or stale state), with no regression in the live-refresh loop.
- **FR-004**: `apps/frontend/src/index.html` MUST eliminate render-blocking third-party CSS for first paint: load Font Awesome, Material Icons, Roboto, and Bootstrap via `preload` + `media` swap or `font-display=swap`, and ensure no third-party stylesheet blocks the LCP element.
- **FR-005**: `assets/prebid.js` MUST be loaded out of the critical path (via `requestIdleCallback` or after hydration) on match pages, or removed from match pages if confirmed unused.
- **FR-006**: jQuery, Popper, and Bootstrap JS MUST be loaded with `defer` after the Angular main bundle, or removed if unused on the match page.
- **FR-007**: The Poppins font reference in `styles.css` MUST be resolved: either load Poppins with `font-display=swap` and a size-adjust fallback, or remove the reference and use the system font stack so the scoreline does not re-flow on font swap.
- **FR-008**: Below-the-fold sections (commentary list, scorecard tab) MUST reserve space (min-height skeleton) or use `content-visibility: auto` with `contain-intrinsic-size` so populating them does not shift above-the-fold content.
- **FR-009**: `sidebar.component.html` branding images MUST have explicit `width` and `height` attributes matching their intrinsic dimensions.
- **FR-010**: `apps/frontend/angular.json` MUST define bundle budgets for the match route initial JS payload and enable per-route code splitting so the match page's initial JS is below the defined budget.
- **FR-011**: These changes MUST NOT alter the `/cric-live/{slug}` canonical policy, route shape, or JSON-LD output (Spec 023 / Spec 030 must remain intact).
- **FR-012**: Verification MUST include raw SSR HTML inspection (TransferState blob present, hero reserved height present, no render-blocking head CSS), a Lighthouse / Core Web Vitals run on a sample `/cric-live/*` URL, and confirmation that the live-refresh loop still updates the hero after hydration.

### Key Entities

- **LiveHeroView**: The hero view model consumed by `live-hero.component`; carries `score`, `completedScores`, `chase`, `staleness`, `timestamp`. Serialized via `TransferState` in FR-002.
- **MatchInfoSnapshot**: The match metadata (teams, venue, series, status) rendered into the hero header; the second half of the transferred state.
- **TransferStateKey**: The `makeStateKey` used to ferry the SSR snapshot to the client (e.g. `MATCH_SNAPSHOT_<slug>` or a stable key).
- **HeroReservedHeight**: The CSS min-height / aspect-ratio reservation per breakpoint that holds the hero footprint before data arrives.
- **BundleBudget**: The `angular.json` budget entry limiting the match route's initial JS payload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Lighthouse mobile run on a sample `/cric-live/*` URL reports CLS < 0.1 (current: > 0.25) after deploy.
- **SC-002**: A Lighthouse mobile run on a sample `/cric-live/*` URL reports LCP < 4s, targeting < 2.5s (current: > 4s) after deploy.
- **SC-003**: Raw SSR HTML of a `/cric-live/*` page contains a `TransferState` blob with the match snapshot and a hero container with a reserved min-height, and does not contain render-blocking third-party `<link rel="stylesheet">` without `font-display=swap` / preload swap.
- **SC-004**: The client does not issue a redundant `fetchMatchInfo`/`fetchCricketData` call on first boot when `TransferState` is populated (verified via network panel or analytics log).
- **SC-005**: Sidebar branding images render with explicit `width`/`height` and contribute zero CLS on a sample match URL.
- **SC-006**: The match route's initial JS payload (main + runtime + polyfills + critical lazy chunk, compressed) is below the budget defined in FR-010.
- **SC-007**: The live-refresh loop continues to update the hero (score, recent balls, batsman/bowler) after hydration with no regression versus current behavior.
- **SC-008**: A rerun of the SEO health pattern audit shows no regression in canonical, H1, or JSON-LD checks on `/cric-live/*` pages (Spec 023 / Spec 030 intact).
