# Match Intelligence Cockpit

## Design direction

The Match Intelligence page is organized as a compact decision surface rather than a long analytics report.

The first viewport should answer:

1. Which side does the model currently favor?
2. What is the current score and match state?
3. What are the important pace/resource signals?
4. How has the probability moved over the match?
5. What is the expected finish compared with the venue baseline?

## Current implementation

- The prediction brief leads with the public model direction, probability, score, overs, expected final, and run-rate context.
- The metric strip is reduced to batting, bowling, CRR, RRR, resources, resource win probability, par pace, and pressure.
- The probability chart is a compact ESPN-style Match Worm: one probability line, a restrained filled area, a highlighted latest point, team labels on the left, and a 0%/50%/100% explanation scale on the right.
- The chart header keeps the current team and probability visible at a glance; the bottom axis anchors the timeline to the innings and latest update rather than adding decorative chart chrome.
- The chart has a bounded no-history state, so an unavailable model timeline does not create a large blank loading-like panel.
- Expected final versus venue average and resource/pace context sit beside the worm chart on desktop.
- The same structure collapses to readable single-column/two-column mobile layouts.
- Longer explanation, glossary, history, and briefing modules remain available below the decision surface.

## Product principle

The graph is not decorative. It should help users understand direction and change. The number answers “where is the model now?”; the worm answers “how did it get there?”; the expected-final and resource panels answer “what is driving the view?”

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` passes.
- The production-style Docker frontend image was rebuilt and recreated with `docker compose -f docker-compose.local.yml build frontend` followed by frontend/Caddy recreation.
- The live-data route `/match-intelligence/vmk-vs-yar-t20-win-probability` was checked in the browser: the probability history rendered, both team labels were present, and the current `VMK 100%` readout matched the chart state.
- The U19 route with no trustworthy probability history rendered the compact bounded empty state instead of a loading-like blank region.
