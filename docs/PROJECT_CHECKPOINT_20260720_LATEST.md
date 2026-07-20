# Crickzen Latest Change Checkpoint — 2026-07-20

This checkpoint consolidates the latest Git history and the current uncommitted working tree.

## Recent committed checkpoints

- `c236119` — `Checkpoint frontend surfaces and match intelligence`
- `535ccec` — `Checkpoint match surfaces and route SEO updates`
- `761d9da` — `Document current Crickzen project checkpoint`
- `fe332ab` — `Complete match intelligence and match surface checkpoint`
- `70da037` — `Normalize transient series startup labels`
- `690f6df` — `Tune homepage density for default zoom`
- `5a7f32f` — `Improve homepage match cards and news discovery`
- `fc9701d` — `feat: integrate match intelligence model surface`

## Finalized in c236119

### Match-detail UX

- Replaced the match-details “At a glance” label with an explicit “Match Details” heading.
- Removed visual status/format pills in favor of typography-led metadata.
- Added a separator between match context and metadata.
- Made the venue, date/time, toss, status, and format easier to scan as plain text.
- Tightened Recent Form and Team Comparison spacing.
- Added a responsive two-column information layout for larger screens while retaining a single column on mobile.
- Replaced duplicated tab-level and bottom SEO support cards with one compact `Explore this match` navigation row linking to Commentary, Scorecard, Lineups, Match Details, and Match Intelligence.
- Kept these as real internal destinations with user-facing labels instead of keyword-heavy support copy.

### Smooth navigation

- Prevented the initial component setup and first `NavigationEnd` event from fetching the same match twice.
- Removed the duplicate match-info request during initial page setup.
- Preserved stale-while-revalidate behavior so cached content stays visible while fresh data arrives.
- Documented the behavior in `docs/FRONTEND_SMOOTH_NAVIGATION.md`.

### sV3 format metadata

- Preserved the raw sV3 `fo` label.
- Added normalized `format_metadata` with `label`, `type`, `variant`, `days`, and `follow_on_runs`.
- Emits metadata in full scraper updates and immediate live patches.
- For example, `Youth Test`, `numDays: 4`, and `followOnRuns: 150` become a Test format with Youth variant, four days, and a 150-run follow-on threshold.
- Added focused tests and `docs/SV3_FORMAT_METADATA.md`.

### Layout/routing and supporting frontend changes

The checkpoint also includes public/admin layout routing, compact navbar styling, homepage series navigation, homepage/match-card score presentation, trust-page routes, footer links, and updated privacy/terms operator disclosure.

### Trust and operator surfaces

- Added public `/about` and `/contact` routes owned by the frontend public route table.
- Added Victoricode Labs / owner disclosure and a support contact path across About, Contact, Privacy Policy, Terms of Service, and the global footer.
- Added advertising/analytics disclosure language to the privacy surface.

### Homepage and match-card data flow

- Homepage series links now expose the active series state, reveal the selected chip in the horizontal rail, and retain up to eight distinct series links.
- Active match cards request scorecard data through the existing cricket service so the catalog card can show the same live score as the match page. Each request is timeout- and error-bounded to avoid blocking the full catalog.
- Live cards suppress the generic score-pending label when a result summary exists, and the redundant venue/time info bar was removed from the compact card.
- The live hero is mounted whenever a match id exists, while match-info loading guards prevent duplicate requests during initialization.

### Match Intelligence chart contract

- The probability timeline is rendered by Chart.js on a browser-only canvas; the SSR path uses a safe placeholder.
- Cricket `over.ball` values are converted to ball-based x positions (`19.3` means 19 overs and 3 balls), then sorted chronologically across the two innings.
- Persistent point markers are hidden to keep the line readable; hover hit areas remain available for update inspection.
- Duplicate `Live` status/state labels collapse to one badge. Model labels are humanized into public-safe labels such as `Crickzen T20 Match Model`.
- Regression coverage includes over parsing and two-innings chart placement.

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` passes.
- `$env:NODE_OPTIONS='--openssl-legacy-provider'; npm run build:browser` passes.
- `docker compose -f docker-compose.local.yml build frontend` passes and the image was recreated with `docker compose -f docker-compose.local.yml up -d --no-build --no-deps --force-recreate frontend`.
- Local homepage `http://localhost:8080/Home` returns HTTP 200.
- The Match Intelligence route returns HTTP 200 and renders the Chart.js canvas after hydration.
- Local containers were verified healthy after recreation in the current session.
- The focused Karma command reaches compilation but remains blocked by unrelated baseline spec errors in `match-intelligence-data.service.spec.ts` and `matches-list.component.discovery.spec.ts`; the production browser and SSR Docker builds pass.

## Documentation gaps closed after c236119

This file now records the public trust surfaces, the homepage-to-scorecard data-flow decision, the Chart.js/SSR boundary, the cricket-over conversion rule, the duplicate-status cleanup, and the exact local verification evidence that were previously only visible in source or chat.

## Commit status

The implementation checkpoint is `c236119`. This documentation update is the follow-up record for the same 2026-07-20 work session and is committed separately so the final worktree can be verified clean.
