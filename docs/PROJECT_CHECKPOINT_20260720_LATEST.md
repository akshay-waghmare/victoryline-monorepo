# Crickzen Latest Change Checkpoint — 2026-07-20

This checkpoint consolidates the latest Git history and the current uncommitted working tree.

## Recent committed checkpoints

- `535ccec` — `Checkpoint match surfaces and route SEO updates`
- `761d9da` — `Document current Crickzen project checkpoint`
- `fe332ab` — `Complete match intelligence and match surface checkpoint`
- `70da037` — `Normalize transient series startup labels`
- `690f6df` — `Tune homepage density for default zoom`
- `5a7f32f` — `Improve homepage match cards and news discovery`
- `fc9701d` — `feat: integrate match intelligence model surface`

## Current uncommitted work

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

The worktree also contains changes to public/admin layout routing, navbar styling, homepage/matches surface styling, and related frontend tests. These are retained as the current working set and have not been committed in this checkpoint.

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` passes.
- Local homepage `http://localhost:8080/Home` returns HTTP 200.
- Local containers were verified healthy after recreation in the current session.
- The full Angular production build/test path is slow in this older Angular CLI environment and has exceeded command windows; do not treat a timeout as a successful compile unless the Docker image and served page are checked afterward.

## Commit status

The repository is intentionally not clean at this point. The current uncommitted changes should be reviewed as one UX/data-flow checkpoint before the next commit.
