---
name: crickzen-match-surface-ux-pass
description: Clean crowded Crickzen match surfaces while preserving SSR SEO and canonical behavior. Use when the homepage, `/matches`, live-score hubs, or `/cric-live/*` pages feel mixed up, the at-a-glance layer is missing, competitor structure should be studied, or SEO support content needs to move into quieter secondary surfaces without removing crawlable HTML.
---

# Crickzen Match Surface UX Pass

Use this skill for repo-specific Crickzen UX cleanup on match surfaces after SEO/discovery work has made the first view too noisy.

## Workflow

1. Preserve guardrails first.
   - Keep `/cric-live/{slug}` canonical behavior stable unless the user explicitly asks for a migration.
   - Do not remove SSR-visible discovery links, FAQ blocks, or supporting copy unless a replacement remains crawlable in HTML.
   - Treat this as hierarchy cleanup, not route expansion.
   - Follow the constitution's above-the-fold rule: hero-owned facts stay in the hero; support modules must not re-state them above the fold.

2. Audit the visible hierarchy before editing.
   - Compare Crickzen against CREX, Cricbuzz, and ESPN Cricinfo for structure, not visual cloning.
   - Identify what should be foreground UI versus background SEO support.
   - Favor score state, quick actions, and current/upcoming/result orientation above long support blocks.

3. Apply the surface pattern that matches the page.
   - Homepage: hero + at-a-glance strip + main match rail first, discovery hubs second.
   - `/matches`: summary cards + filters/list first, discovery sections second.
   - `/cric-live/*`: hero first, lifecycle-aware default tab, details inside `Match Details`, heavy supporting sections inside a quieter drawer.
   - Live-score hubs: group SSR links into clear lanes such as `Live now`, `Upcoming live scores`, and `Recently completed`.
   - Homepage hydration: if the homepage appears to "load twice", inspect SSR-to-browser hydration and `TransferState` before assuming network or rendering regressions.
   - Canonical match page: keep the coverage intro lightweight above the hero; do not place a second visible facts grid for score, status, toss, venue, or updated time ahead of the live hero.

4. Keep support content present but visually secondary.
   - Prefer secondary drawers or quieter support cards over always-open heavy blocks.
   - Use plain user-facing labels such as `At a glance`, `More match pages`, or `More match detail`.
   - Keep the first reading layer clean enough that a user can decide where to go without parsing SEO copy.
   - If key moments or curated commentary updates are useful but not primary, default to collapsed `details`/accordion treatment rather than always-open cards.
   - Treat `At a glance` as additive context only. If it repeats hero facts, remove it, move it lower, or rewrite it.

5. Implement with the repo's usual file zones.
   - Homepage: `apps/frontend/src/app/home/*`
   - Matches page: `apps/frontend/src/app/features/matches/pages/matches-list/*`
   - Match page: `apps/frontend/src/app/cricket-odds/*`
   - Match details card: `apps/frontend/src/app/cricket-odds/components/match-info/*`
   - Discovery ordering helpers: `apps/frontend/src/app/core/utils/match-utils*`
   - Live-score hub SSR grouping: `apps/frontend/src/app/features/seo-hubs/live-score-hub/*`

6. Verify with runtime proof, not just static diffs.
   - Run `npx tsc -p src/tsconfig.app.json --noEmit` in `apps/frontend`.
   - Run `$env:NODE_OPTIONS='--openssl-legacy-provider'; npm run build:browser`.
   - Rebuild and force-recreate the local frontend container if Docker is being used.
   - Check raw served HTML for the intended visible markers on `/`, `/matches`, relevant hub pages, and a sample `/cric-live/{slug}` page.
   - When fixing a homepage double-load or first-load/refresh mismatch, verify both SSR HTML and post-hydration browser behavior.
   - For canonical match pages, explicitly check that the hero remains the first facts surface and that key moments start collapsed unless the user asked otherwise.

7. If production is requested, pair this skill with `crickzen-frontend-prod-rollout`.
   - Deploy only the verified frontend subset.
   - Do not roll backend/scraper/dashboard changes into a UX-only release.
   - Verify public HTML markers after rollout, not only container health.

## Useful markers

- Homepage: `Match centre at a glance`, `At a glance`, `More live score pages`
- Matches page: `At a glance`, `Pick the lane you want`, `More match pages`
- Match page: `At a glance`, `More match detail`, `Keep the match snapshot first`

## Notes

- Competitor lessons here are mostly information architecture lessons: state first, support second.
- Raw HTML proof matters because many of these surfaces also serve discovery and SEO goals.
- If the in-app browser is flaky, trust local SSR/raw HTML checks over a broken browser automation pass.
- Recent durable pattern from this repo: homepage double-load symptoms were fixed by hydrating SSR match data with `TransferState`, while canonical match clutter was reduced by removing duplicate pre-hero fact blocks and collapsing key moments behind `<details>`.
