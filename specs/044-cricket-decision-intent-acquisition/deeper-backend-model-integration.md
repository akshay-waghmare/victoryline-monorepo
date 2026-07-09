# Deeper Backend And Model Integration

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Cross-repo implementation backlog

## Purpose

This document defines what still has to happen beyond the current frontend shell so the public intelligence route is fed by real contract-backed prediction and explanation data.

## Current State

### Already true in `victoryline-monorepo`

- public route exists
- CTA from canonical match page exists
- frontend can read current match feed, `team_odds`, `session_odds`, commentary, score, and basic metadata
- frontend now renders richer explanation modules from whatever public-safe fields are present

### Not yet true

- model repo is not yet the stable source of a public intelligence payload
- explanation repo is not yet feeding reusable plain-language modules into the public route
- VictoryLine still derives too much explanation copy inside the component

## Integration Target

The target chain is:

`model repo public payload -> explanation packaging enrichments -> VictoryLine render layer`

VictoryLine should become a consumer of public-safe fields, not the main place where intelligence meaning is invented.

## Repo Responsibilities

### 1. `machine_learning_bbl_009-odi-mc-predictor`

Should supply a public-safe prediction payload with:

- `slug`
- `title`
- `league`
- `status`
- `score`
- `overs`
- `batting_team`
- `bowling_team`
- `target`
- `win_probability_pct`
- `projection_label`
- `insight`
- `updated_at`
- `last_swings`
- `venue_label`
- `venue_avg_score`
- `pressure_zones`
- `reasons`

### 2. `trueodds-video-studio`

Should supply reusable explanation-layer enrichments with:

- plain-language reason packs
- venue behavior summaries
- toss impact summaries
- expected score framing
- turning-point summaries
- probability-swing recap structures

### 3. `victoryline-monorepo`

Should only:

- fetch and normalize the contract
- map lifecycle state
- render public-safe modules
- own SEO, routing, metadata, and analytics

## Required Backend Work

### Phase A: Public payload normalization

Needed next:

- define or expose one stable backend response shape for match intelligence
- stop forcing the frontend to guess multiple field aliases
- include freshness timestamp in a stable field

### Phase B: Explanation-field promotion

Needed next:

- promote `insight`, `last_swings`, `reasons`, `pressure_zones`, `venue_avg_score`, and `venue_label` into the response wherever available
- add completed-match fields:
  - `turning_point`
  - `probability_swing`

### Phase C: Public-safe boundary enforcement

Needed next:

- explicitly strip operator-only fields before public transport
- keep out:
  - raw model blends
  - weight internals
  - dashboard debug state
  - customer-specific or commercial-only logic

## VictoryLine Refactor Backlog

Once the backend contract is stronger, VictoryLine should:

1. remove fallback-first explanation logic where real fields exist
2. centralize normalization into the data service
3. keep the component focused on rendering, not inference

## Video-Studio Reuse Backlog

The strongest reusable modules to promote next are:

1. `reasons`
2. `venue.summary`
3. `toss_impact`
4. `expected_score`
5. `turning_point`
6. `probability_swing`

These should arrive as plain-language product modules, not reel assets.

## Release Order Recommendation

### Release 1

- stable public payload for:
  - `insight`
  - `last_swings`
  - `reasons`
  - `venue_label`
  - `venue_avg_score`
  - `pressure_zones`

### Release 2

- completed-match payload for:
  - `turning_point`
  - `probability_swing`

### Release 3

- richer optional modules:
  - `toss_impact`
  - `expected_score`
  - `expected_wickets`
  - selected player-risk modules if they remain public-safe

## Acceptance Standard

Deeper integration is complete only when:

- VictoryLine no longer depends mainly on frontend-generated explanation wording
- sampled pages render contract-backed intelligence fields
- completed matches have a real turning-point explanation
- the route stays public-safe and SEO-safe
