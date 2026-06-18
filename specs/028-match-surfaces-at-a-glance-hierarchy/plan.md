# Implementation Plan: Match Surfaces At A Glance Hierarchy

## Scope

Implement a focused hierarchy cleanup across:

- `/matches`
- the individual match `Match Details` tab

The goal is to restore clear at-a-glance reading order while preserving SSR discovery and structured SEO support.

## Inputs

- Local `/matches` inspection showed discovery cards and direct link clusters sitting above the actual match list.
- Local individual match inspection showed the strong snapshot card already exists, but the supporting SEO summary still reads too much like a second hero.
- Competitor audit:
  - CREX keeps state cards and match content first, then deeper info.
  - Cricbuzz keeps live-score hubs and match rails prominent before supporting metadata.
  - ESPN Cricinfo stays compact and state-led on the individual match surface.

## Workstreams

1. **Matches page hierarchy**
   - Enrich the summary cards into a real at-a-glance layer.
   - Move discovery-heavy sections below the visible match content.

2. **Individual page detail hierarchy**
   - Make the top details card explicitly read as the at-a-glance surface.
   - Tone down the secondary SEO summary and support grid without removing it.

3. **Verification**
   - Add focused spec coverage for the new summary/detail framing.
   - Rebuild the frontend and verify local routes.

## Constraints

- Do not remove SSR discovery content.
- Do not change canonical policy or route families.
- Do not undo Spec 026 tab behavior.
