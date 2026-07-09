# Match-Page Content Template

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Purpose

This template protects score-first UX on `/cric-live/{slug}` while making Crickzen's decision-intelligence value visible.

## Above-The-Fold Ownership Rules

The first viewport on the canonical match page is owned by:

1. current match state
2. score snapshot
3. teams, status, and key immediate context
4. one lightweight intelligence CTA or explanation signal

The first viewport is not owned by:

- heavy SEO blocks
- long FAQ text
- alert capture walls
- API or widget CTAs
- commercial messaging

## First-Viewport Template

### Required blocks

1. Breadcrumbs
2. Match hero with score/state
3. Current match status
4. One short intelligence hook:
   - upcoming: prediction preview hook
   - live: probability or “what changed” hook
   - completed: turning-point or result-review hook
5. One owned next step:
   - `Match Intelligence`
   - follow / alert CTA later in flow, not above score

### Example first-view framing

- **Upcoming**:
  - What changed: toss not yet known / lineup pending / start time fixed
  - Why it matters: venue, match setup, or early model direction
  - What matters next: toss, lineup, or start

- **Live**:
  - What changed: wicket, required-rate pressure, partnership, innings phase
  - Why it changed: model direction moved because of that event
  - What matters next: next 2-3 overs, chase pressure, wickets in hand

- **Completed**:
  - What changed: decisive phase or event
  - Why it changed: swing in match control
  - What matters next: turning-point review or next match

## Explanation Module Template

### Module title

- Upcoming: `Prediction Snapshot`
- Live: `What Changed`
- Completed: `Turning Point`

### Module structure

1. `Signal`
2. `Reason`
3. `What matters next`
4. timestamp or freshness note
5. route to deeper intelligence

### Example shape

- Signal: `Win probability shifted toward Team A`
- Reason: `Two wickets fell in the powerplay and the required rate rose above 10`
- What matters next: `The next over and lower-order resistance decide whether the pressure holds`

## Match Intelligence CTA Template

### CTA placement

- below the hero or inside the first supporting block
- never above the score

### CTA copy by lifecycle

- Upcoming: `Open Match Intelligence`
- Live: `See Win Probability And What Changed`
- Completed: `See Turning Point Analysis`

### CTA fallback

- If model data is unavailable, show honest disabled or explanatory state:
  - `Match Intelligence unavailable for this match yet`

## Mid-Page Support Sections

Allowed below the fold:

- explanation module
- scorecard support links
- FAQ
- language / search help
- relationship CTA

These must stay subordinate to score and live state.

## Required Questions Coverage

Every eligible match page should answer some combination of:

1. What changed?
2. Why did it change?
3. What matters next?

The fourth question, `How do we keep the user after the visit?`, belongs in:

- intelligence CTA
- alert/follow CTA
- next-match path

## Fallback Rules

- If model data is stale, say it is stale
- If model data is unavailable, do not invent prediction text
- If explanation is weak, prefer no explanation module over thin filler copy
