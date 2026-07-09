# User-Facing Model Language

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Strategy artifact

## Purpose

This document translates model and explanation outputs into repeatable public language for Crickzen's four core user questions:

1. What changed?
2. Why did it change?
3. What matters next?
4. How do we keep the user after the visit?

The goal is to stop leaking internal model vocabulary into public surfaces and to make the intelligence route feel useful, calm, and trustworthy.

## Translation Rules

- Prefer cricket-state language over model-state language.
- Prefer one plain sentence over a debug-style data dump.
- Never expose raw blend mechanics, feature names, or internal score components.
- Use numbers only when they help the user understand the match decision.
- If confidence or freshness is weak, say so directly instead of overstating.

## Core Question 1: What Changed?

This answers the visible match event or pressure shift.

### Allowed source inputs

- `last_swings`
- `score`
- `overs`
- `target`
- `projection_label`
- lifecycle state
- derived wicket, run-rate, and phase context

### Public language pattern

`<Team or match state> shifted because <visible match event or pressure change>.`

### Examples

- `Namibia moved ahead after a two-wicket swing in the powerplay.`
- `Vidarbha's chase became harder once the required rate pushed above 10 an over.`
- `The match is still balanced, but the latest over pulled momentum back toward the batting side.`

### Avoid

- `Model delta increased by 7.4 points`
- `Historical blend now dominates`
- `MC layer updated after feature refresh`

## Core Question 2: Why Did It Change?

This explains the cricket reason behind the shift.

### Allowed source inputs

- `insight`
- `reasons`
- `pressure_zones`
- `conditions`
- `venue_label`
- `venue_avg_score`
- `toss_sensitivity_label`
- `probability_swing`

### Public language pattern

`It changed because <cricket reason>, which matters here because <match context>.`

### Examples

- `It changed because wickets fell before the chase settled, which matters because this surface punishes recovery late in the innings.`
- `It changed because the batting side moved above par, which matters on a ground where first-innings pressure usually holds.`
- `It changed because the toss setup favoured chasing and that advantage is now visible in the run-rate pressure.`

### Avoid

- generic filler like `because momentum changed`
- reasons not grounded in visible score or known venue context
- speculative player or injury claims unless the source contract explicitly provides them

## Core Question 3: What Matters Next?

This turns explanation into a next-watch job.

### Allowed source inputs

- innings phase
- wickets in hand
- required rate
- `target`
- `expected_score`
- `expected_wickets`
- `pressure_zones`
- current over window

### Public language pattern

`Next, watch <specific phase, over window, wicket risk, or score threshold>.`

### Examples

- `Next, watch the next two overs because one more wicket could flip the chase fully out of balance.`
- `Next, watch whether the batting side reaches par by the 15-over mark.`
- `Next, watch the death overs, where this venue usually creates the biggest swing in win probability.`

### Avoid

- vague copy like `stay tuned`
- future claims with no match-state anchor
- restating the score without giving the user a decision lens

## Core Question 4: How Do We Keep The User After The Visit?

This converts one useful answer into a deeper owned relationship.

### Owned next-step options by lifecycle

- Upcoming:
  - `Open Match Intelligence`
  - `Track toss and lineup impact`
  - future alert/follow CTA after engagement

- Live:
  - `See win probability and what changed`
  - `Follow the next swing`
  - future alert CTA after meaningful interaction

- Completed:
  - `See turning-point analysis`
  - `Review how the match flipped`
  - `Go to the next match intelligence page`

### CTA language rules

- CTA must promise the exact next value on the destination page.
- CTA must not promise certainty, tips, guaranteed picks, or betting returns.
- Alert/follow copy must remain analytics-safe and informational.

## Field-To-Language Mapping

| Contract field | Public job |
|---|---|
| `insight` | shortest plain-language reason |
| `last_swings` | what changed summary |
| `reasons` | why it changed support points |
| `pressure_zones` | what matters next framing |
| `venue_label` | pre-match or innings-context explanation |
| `probability_swing` | completed-match swing explanation |
| `turning_point` | completed-match decisive moment |

## Lifecycle Output Shape

### Upcoming

- What changed: setup changed or is still pending
- Why it changed: venue, toss sensitivity, lineup readiness, first model lean
- What matters next: toss, XI, first innings shape

### Live

- What changed: wicket, partnership, run-rate pressure, above-par shift
- Why it changed: scoreboard event plus venue or innings context
- What matters next: next 1-3 overs, wicket window, threshold score

### Completed

- What changed: decisive phase or moment
- Why it changed: the result swung there
- What matters next: turning-point review, proof, next-match path

## Acceptance Standard

Public explanation copy is acceptable only if:

- a first-time visitor can understand it without knowing model terminology
- it maps to visible match state or a declared contract field
- it helps the user decide what to watch or click next
- it stays useful even when probability is unavailable or stale
