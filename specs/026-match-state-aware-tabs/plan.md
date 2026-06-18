# Implementation Plan: Match State Aware Tabs

## Scope

Implement a focused match-page UX pass that:

- defaults the initial tab by match lifecycle state,
- respects explicit commentary/scorecard route intent,
- moves the recently added SEO/detail grid under the hero into Match Details,
- keeps canonical and discovery behavior untouched.

## Workstreams

1. **Lifecycle tab resolver**
   - Add a small tab enum or index mapping in `CricketOddsComponent`.
   - Resolve explicit route surface first.
   - Fall back to lifecycle state from route hint, current match, or fetched match info.

2. **Match page layout cleanup**
   - Remove the top-of-page detail-heavy SEO blocks from above the hero.
   - Render that content inside the Match Details tab below the existing `app-match-details-info` surface.
   - Rename the tab label from `Match Info` to `Match Details` if that better matches the new content.

3. **State-aware detail presentation**
   - Add helpers that describe upcoming, live, and completed states more cleanly.
   - Keep useful placeholders for toss, playing XI, and venue context without mixing lifecycle messaging.

4. **Verification**
   - Add focused unit/spec coverage for lifecycle tab selection.
   - Re-run targeted frontend specs and SSR/browser builds.

## Constraints

- Keep `/cric-live/{slug}` canonical unchanged.
- Do not reopen Spec 023 or add any `/live-cricket-score/{slug}` behavior.
- Keep moved detail content present in rendered HTML for prematch usefulness.
