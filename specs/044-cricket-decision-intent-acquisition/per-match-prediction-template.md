# Per-Match Prediction Template

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Strategy artifact

## Purpose

This template defines what a per-match prediction surface should contain and how it differs from the canonical `/cric-live/{slug}` page.

## Distinct Search Job

The canonical live page answers:

- what is happening right now?
- what is the score and match state?

The per-match prediction page answers:

- who is ahead and why?
- what changed in the prediction?
- what should I watch next to understand the swing?

## Canonical Separation

`/cric-live/{slug}` remains canonical for:

- score
- commentary
- scorecard
- match details
- lineups

`/match-intelligence/{slug}` owns:

- win probability framing
- prediction explanation
- swing summaries
- pre-match reasoning
- completed turning-point review

The intelligence page must not become a duplicate score page with only small wording changes.

## Above-The-Fold Template

1. Breadcrumbs with return path to the canonical match page
2. Match identity and lifecycle status
3. One probability or prediction hero block
4. One-sentence `what changed`
5. One-sentence `why it changed`
6. One-sentence `what matters next`
7. Freshness or availability note
8. Return links to score, commentary, scorecard, and lineups

## Hero Module

### Required fields

- `title`
- `league`
- `status`
- `win_probability_pct`
- `projection_label`
- `freshness_timestamp`
- `freshness_state`

### Supported labels

- `Team A slightly ahead`
- `Team B in control`
- `Match finely balanced`
- `Probability unavailable`

### Guardrails

- do not imply certainty
- do not imply betting advice
- do not hide stale data

## Core Explanation Block

### Required sections

1. `What changed`
2. `Why it changed`
3. `What matters next`

### Preferred sources

- `insight`
- `last_swings`
- `reasons`
- `pressure_zones`
- derived match-state context

## Lifecycle Modules

### Upcoming version

Required:

- probability or early lean if available
- venue context
- toss sensitivity
- 3 reasons
- what to watch before start

Optional:

- conditions
- expected score framing

### Live version

Required:

- current probability
- latest swing summary
- pressure explanation
- next phase watchpoint

Optional:

- capped swing timeline
- venue-behaviour module

### Completed version

Required:

- result-aware probability wrap-up
- turning point summary
- why the match flipped
- next-match path

Optional:

- post-match proof or replay module once approved

## Below-The-Fold Modules

Allowed:

- swing history summary
- reason chips or bullets
- venue module
- completed-match turning-point module
- related next-match intelligence links

Blocked for initial public release:

- operator dashboards
- raw historical model charts
- raw commentary dumps
- premium-only player cards unless explicitly launched

## How It Differs From The Canonical Live Page

| Surface | Primary owner job | Above-the-fold priority |
|---|---|---|
| `/cric-live/{slug}` | score and live state | score, status, commentary path |
| `/match-intelligence/{slug}` | explanation and prediction intent | probability, what changed, what matters next |

## Metadata Promise Rule

If the page title, H1, or intro claims:

- prediction
- win probability
- who will win
- what changed

then the visible body must answer that promise with real contract-backed content on first load.

## Initial Launch Standard

The page is ready only if it:

- answers a distinct prediction-intent job
- remains clearly separate from the canonical match page
- works across upcoming, live, and completed lifecycle states
- stays useful when the model is stale or unavailable
