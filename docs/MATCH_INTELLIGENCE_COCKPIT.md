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
- The probability chart is presented as the dominant Match Worm visual, with model updates plotted over time and the current probability movement visible as a line.
- Expected final versus venue average and resource/pace context sit beside the worm chart on desktop.
- The same structure collapses to readable single-column/two-column mobile layouts.
- Longer explanation, glossary, history, and briefing modules remain available below the decision surface.

## Product principle

The graph is not decorative. It should help users understand direction and change. The number answers “where is the model now?”; the worm answers “how did it get there?”; the expected-final and resource panels answer “what is driving the view?”

## Verification

- `npx tsc -p src/tsconfig.app.json --noEmit` passes.
- The production-style Docker frontend build remains slow and exceeded the command window during this pass. The container must be rebuilt and the intelligence route checked in the browser before visual acceptance is considered complete.

