# Live Explanation And Calculator Surfaces

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Strategy artifact

## Purpose

This document defines the first live explanation utilities that can extend the intelligence route without taking over the canonical score page.

These surfaces should help the user understand match pressure, not just consume another score summary.

## Surface Types

### 1. Live Explanation Surface

This is the default live intelligence view for most users.

It answers:

- what changed?
- why did it change?
- what matters next?

Core inputs:

- `win_probability_pct`
- `insight`
- `last_swings`
- `pressure_zones`
- score, overs, target

## Required Live Explanation Modules

### Probability summary

- short lead label
- rounded probability
- freshness note

### What changed

- latest swing or pressure event

### Why it changed

- cricket reason tied to scoreboard context

### What matters next

- next overs, wicket window, or threshold to watch

### Return navigation

- score
- commentary
- scorecard

## Calculator-Style Utility Surfaces

These are lighter tools nested under or linked from live intelligence, not separate thin SEO pages at launch.

### Run-rate pressure explainer

Inputs:

- target
- current score
- overs
- wickets in hand

Output:

- required rate
- current rate comparison
- plain-language pressure label

### Par-score checkpoint

Inputs:

- venue average
- innings phase
- current score

Output:

- above par / near par / below par framing
- one sentence on what that means

### Next-phase watchpoint

Inputs:

- current over band
- wickets in hand
- pressure zone

Output:

- one next threshold to watch
- one reason it could trigger the next swing

## Initial UX Rule

For launch, these utilities should render as modules on the intelligence route or as expandable in-page tools.

They should not launch as standalone indexable pages until they prove:

- distinct demand
- unique content
- repeat usage
- reliable SSR-visible value

## Copy Rules

- utility labels must be explanatory, not gimmicky
- outputs must stay informational, not advisory
- every tool must answer `so what?` in one sentence

## Data And Safety Rules

Allowed:

- derived values from score, target, overs, venue context, and pressure labels
- public-safe explanation fields from the shared contract

Blocked:

- raw feature vectors
- operator controls
- internal model confidence mechanics
- customer or account state

## Analytics Hooks

These surfaces should support:

- `prediction_view`
- `prediction_interaction`
- `explanation_expand`

Recommended properties:

- `match_slug`
- `lifecycle`
- `surface`
- `module_name`
- `interaction_type`

## Release Recommendation

Ship in this order:

1. Live explanation shell
2. Run-rate pressure explainer
3. Par-score checkpoint
4. Next-phase watchpoint

Do not expand to more tools until the first three show real engagement and remain distinct from the scorecard.
