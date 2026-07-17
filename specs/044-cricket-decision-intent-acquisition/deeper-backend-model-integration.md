# Deeper Backend And Model Integration

Date: 2026-07-13 IST
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

- model repo now exposes a stable public-safe payload, including `reasons`, capped `prediction_history`, and the explanation pack fields
- the video-studio repo contains reusable source patterns and data for venue behavior, player roles, prediction tracking, prematch packs, and post-match proof, but it is not yet a runtime service for generic T20/ODI matches
- VictoryLine still owns lifecycle-specific fallback wording, while contract-backed reasons and explanation-pack values take precedence when available

## Integration Target

The target chain is:

`model repo public payload -> explanation packaging enrichments -> VictoryLine render layer`

VictoryLine should become a consumer of public-safe fields, not the main place where intelligence meaning is invented.

## Repo Responsibilities

### 1. `machine_learning_bbl_009-odi-mc-predictor`

Supplies a public-safe prediction payload with:

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
- `prediction_history`
- `explanation_pack`

### 2. `trueodds-video-studio`

Contains reusable explanation-layer patterns and source data with:

- plain-language reason packs
- venue behavior summaries
- toss impact summaries
- expected score framing
- turning-point summaries
- probability-swing recap structures
- venue confidence and behavior fields in `data/intelligence/venue_intelligence.json`
- player-role intelligence in `data/intelligence/player_role_intelligence.json`
- prematch and post-match proof pack shapes in `inputs/packs/` and `compositions/`

The video-studio artifacts are not copied into the public route as stale IPL-only facts. They are treated as schema/presentation inputs until a format- and gender-aware runtime lookup exists.

### 3. `victoryline-monorepo`

Should only:

- fetch and normalize the contract
- map lifecycle state
- render public-safe modules
- own SEO, routing, metadata, and analytics

## Required Backend Work

### Phase A: Public payload normalization

Completed for the current local runtime:

- the public model endpoint exposes one safe response shape with a stable `updated_at`
- the adapter normalizes current aliases before rendering
- raw feature/debug fields remain excluded

### Phase B: Explanation-field promotion

Partially complete:

- `insight`, `last_swings`, `reasons`, `venue_avg_score`, and explanation-pack fields are promoted and rendered
- completed-match fields are shaped but still need a real completed-match source:
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

Current VictoryLine behavior:

1. contract-backed reasons and explanation-pack values render before fallback wording
2. normalization is centralized in the match intelligence data service
3. the component remains a rendering and lifecycle-language layer

## Video-Studio Reuse Backlog

The strongest reusable modules to promote next are:

1. `reasons` -> implemented through the public model payload
2. `venue.summary` -> implemented as public `venue_behaviour`/venue average where available
3. `toss_impact` -> implemented as an availability-safe explanation-pack field
4. `expected_score` -> implemented as the public expected-final explanation field
5. `turning_point` -> shape implemented; completed-match runtime source pending
6. `probability_swing` -> shape implemented; completed-match runtime source pending
7. venue confidence and player-role modules -> pending a generic T20/ODI lookup boundary

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
