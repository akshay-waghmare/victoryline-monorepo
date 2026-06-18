# Implementation Plan: Homepage Scoreboard First UX

## Scope

Implement a focused homepage cleanup that:

- restores a strong at-a-glance surface,
- puts the match rail ahead of discovery-heavy sections,
- keeps SSR discovery links intact for ongoing pre-match SEO work,
- uses competitor structure lessons without changing canonicals or route behavior.

## Inputs

- Local homepage inspection showed discovery cards and hub chips appearing too high in the page, ahead of the stronger match-story surfaces.
- Competitor audit:
  - CREX leads with live and upcoming match states, then lets the long schedule stream continue underneath.
  - Cricbuzz leads with match rails, category splits, and quick navigation links tied to each match state.
  - ESPN Cricinfo keeps its match pages concise and state-led, with metadata acting as support rather than the main story.

## Workstreams

1. **Homepage hierarchy reset**
   - Strengthen the hero copy and quick actions.
   - Add a compact at-a-glance strip for live, upcoming, and recent-result buckets.
   - Keep the tabbed rail as the main interaction surface.

2. **Discovery relegation without SEO loss**
   - Move discovery-heavy sections below the carousel.
   - Rename discovery labels so they read naturally to users while keeping the crawlable links.

3. **Focused verification**
   - Add or update homepage specs around at-a-glance cards.
   - Rebuild the frontend and verify the local homepage in the browser.

## Constraints

- Do not change canonical URLs or route families.
- Do not undo Spec 025 discovery work.
- Do not touch unrelated live-score backend, scraper, or dashboard files during this pass.
