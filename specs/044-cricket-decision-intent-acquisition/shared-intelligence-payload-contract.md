# Shared Intelligence Payload Contract

Updated: 2026-07-09

## Purpose

This document freezes the first shared public intelligence payload contract for Spec 044 across three repos:

- `victoryline-monorepo`
- `machine_learning_bbl_009-odi-mc-predictor`
- `trueodds-video-studio`

The contract exists so the public Crickzen match-intelligence surface can stop depending on ad hoc frontend copy and instead render a stable, public-safe prediction payload with reusable explanation modules.

## Repo Roles

### 1. victoryline-monorepo

Owns:

- canonical `/cric-live/{slug}` pages
- `/match-intelligence/{slug}` route
- SSR, metadata, canonical policy, and internal-link discovery
- product analytics and owned-surface routing

Does not own:

- final model probability logic
- dashboard-private serialization rules
- long-lived explanation-packaging logic

### 2. machine_learning_bbl_009-odi-mc-predictor

Owns the model-brain and public-safe prediction boundary.

Current reusable sources found:

- `dashboard/app/public.py`
- `dashboard/app/prematch.py`
- `specs/013-public-dashboard-growth/spec.md`

Key reusable public-safe fields already present there:

- `slug`
- `title`
- `league`
- `status`
- `score`
- `overs`
- `batting_team`
- `bowling_team`
- `win_probability_pct`
- `projection_label`
- `insight`
- `updated_at`
- `detail_url`
- `venue`
- `target`
- `last_swings`
- `dashboard_url`

Pre-match-safe structures already present there:

- `venue_avg_score`
- `venue_bat_first_win_rate`
- `venue_label`
- `conditions`
- `pressure_zones`
- `reasons`
- `source_status`
- `live_match_slug`

### 3. trueodds-video-studio

Owns reusable explanation and packaging logic.

Current reusable sources found:

- `scripts/ipl_intelligence.py`
- `scripts/probability_agent.py`
- `scripts/build_match_day_pack.py`
- `docs/TRAFFIC_CONTENT_ENGINE.md`

Key reusable structures already present there:

- `prediction.probability`
- `prediction.model_pick`
- `prediction.method`
- `prediction.inputs`
- `venue.summary`
- `safe_players`
- `risky_players`
- `trump_pick`
- `avoid_pick`
- `toss_impact`
- `expected_score`
- `expected_wickets`
- `venue_behaviour`
- `notes`
- `turning_point`
- `probability_swing`
- `post_match_proof`
- `market_edge_replay`
- tracker proof fields such as `hit`, `winner`, `brier_score`

## Contract Layers

Every field in the shared payload must be classified into one of these layers:

- `model-layer`
- `explanation-layer`
- `public-safe`
- `premium-candidate`
- `operator-only`

## Public Contract v1

### A. Match Identity

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `slug` | model-layer, public-safe | model repo | Stable match intelligence key |
| `title` | model-layer, public-safe | model repo | Human match title |
| `league` | model-layer, public-safe | model repo | IPL, PSL, etc. |
| `lifecycle` | model-layer, public-safe | derived in Crickzen from model + match state | upcoming, live, completed, unknown |
| `status` | model-layer, public-safe | model repo | running, upcoming, completed, etc. |
| `canonical_match_path` | public-safe | victoryline | always points back to `/cric-live/{slug}` |
| `intelligence_path` | public-safe | victoryline | `/match-intelligence/{slug}` |

### B. Score And State

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `score` | model-layer, public-safe | model repo | e.g. `145/4` |
| `overs` | model-layer, public-safe | model repo | string-safe |
| `batting_team` | model-layer, public-safe | model repo | current batting team |
| `bowling_team` | model-layer, public-safe | model repo | current bowling team |
| `target` | model-layer, public-safe | model repo | chase target when available |
| `projection_label` | model-layer, public-safe | model repo | projected score or chase pressure label |

### C. Probability And Freshness

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `win_probability_pct` | model-layer, public-safe | model repo | rounded integer percentage |
| `probability_source` | model-layer, public-safe | model repo | blended / calibrated / historical blend etc. |
| `freshness_timestamp` | model-layer, public-safe | model repo | ISO timestamp |
| `freshness_state` | model-layer, public-safe | model repo + victoryline | fresh, stale, unavailable |
| `model_unavailable_reason` | model-layer, public-safe | model repo + victoryline | only when not available |

### D. Lightweight Explanation

These are safe for the first public release and should power the default intelligence shell.

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `insight` | explanation-layer, public-safe | model repo | one-sentence public insight from `build_public_insight()` |
| `last_swings` | explanation-layer, public-safe | model repo | capped recent swing points |
| `what_changed` | explanation-layer, public-safe | derived from model repo swings + match state | human-readable change summary |
| `why_it_changed` | explanation-layer, public-safe | victoryline initially, later hybrid | should become contract-driven |
| `what_matters_next` | explanation-layer, public-safe | victoryline initially, later hybrid | next decisive factor |

### E. Pre-Match Modules

These are valid for upcoming-match intelligence when available.

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `venue_label` | explanation-layer, public-safe | model repo | balanced / chase-friendly / bat-first friendly |
| `venue_avg_score` | explanation-layer, public-safe | model repo | integer |
| `venue_bat_first_win_rate` | explanation-layer, public-safe | model repo | float or rounded percentage |
| `toss_sensitivity_label` | explanation-layer, public-safe | model repo | high / medium / low leverage |
| `conditions` | explanation-layer, public-safe | model repo | honest readiness states only |
| `pressure_zones` | explanation-layer, public-safe | model repo | above par / par / below par |
| `reasons` | explanation-layer, public-safe | model repo or video-studio | 3-5 short plain-language reasons |
| `source_status` | model-layer, public-safe | model repo | ready / partial |

### F. Richer Intelligence Modules

These should not be stuffed into the hero. They are expandable modules or below-the-fold blocks.

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `venue_behaviour` | explanation-layer, public-safe | video-studio | descriptive venue pattern |
| `toss_impact` | explanation-layer, public-safe | video-studio | toss win/chase impact summary |
| `expected_score` | explanation-layer, public-safe | video-studio | expected first-innings framing |
| `expected_wickets` | explanation-layer, public-safe | video-studio | wicket-profile framing |
| `safe_players` | explanation-layer, premium-candidate | video-studio | useful but may be later-gated |
| `risky_players` | explanation-layer, premium-candidate | video-studio | same |
| `trump_pick` | explanation-layer, premium-candidate | video-studio | not for initial public shell |
| `avoid_pick` | explanation-layer, premium-candidate | video-studio | not for initial public shell |

### G. Completed-Match And Replay Modules

| Field | Layer | Source Repo | Notes |
|---|---|---|---|
| `turning_point` | explanation-layer, public-safe | video-studio | can back completed-state explainer |
| `probability_swing` | explanation-layer, public-safe | video-studio | before/after shift block |
| `post_match_proof` | explanation-layer, premium-candidate | video-studio | useful for proof content, not required on day one |
| `market_edge_replay` | explanation-layer, operator-only | video-studio | educational only; keep out of public Crickzen for now |

### H. Operator / Premium / Blocked Fields

These should not enter the public match-intelligence contract yet.

| Field | Classification | Source Repo | Reason |
|---|---|---|---|
| `monte_carlo` | operator-only | model repo | premium/internal detail |
| `odm` | operator-only | model repo | premium/internal detail |
| `blend` | operator-only | model repo | raw internal composition |
| `features` | operator-only | model repo | raw model features |
| `pred_state` | operator-only | model repo | internal model/debug state |
| `scraped_data` | operator-only | model repo | not presentation-safe |
| `history` | operator-only | model repo | too large/raw |
| `chart_history` | operator-only for transport, public-safe only via `last_swings` | model repo | public uses capped derivative only |
| `commentary` | operator-only for transport, public-safe only via derived summaries | model repo | avoid raw dump in contract |
| `ball_history` / `balls_data` | operator-only | model repo | too raw |
| `ml_prob`, `mc_prob`, `ml_weight`, `mc_weight` | operator-only | model repo | internal blend mechanics |
| reel hook variants / voiceover / captions | operator-only | video-studio | content assets, not product fields |

## First Implementation Recommendation

### Release-safe fields to wire next into `/match-intelligence/:slug`

Use now:

- `slug`
- `title`
- `league`
- `lifecycle`
- `status`
- `score`
- `overs`
- `win_probability_pct`
- `projection_label`
- `freshness_timestamp`
- `freshness_state`
- `insight`
- `last_swings`
- `what_changed`
- `why_it_changed`
- `what_matters_next`
- `venue_label`
- `venue_avg_score`
- `toss_sensitivity_label`
- `reasons`

### Fields to hold for later modules

- `safe_players`
- `risky_players`
- `trump_pick`
- `avoid_pick`
- `post_match_proof`

### Fields to block from public transport

- raw `blend`
- raw `history`
- raw `commentary`
- MC / ODM / weights
- raw prediction-state internals
- reel-only copy assets

## Immediate Spec 044 Implications

1. The current frontend shell in VictoryLine should stop inventing generic explanation blocks where the model repo already has `insight`, `last_swings`, and pre-match reason structures.
2. The video-studio repo should feed optional richer explanation modules, not the base transport for public match state.
3. The initial public intelligence API should be model-repo-shaped first, then extended carefully with selected explanation-layer fields.
4. Public match intelligence should prefer capped, human-readable derivatives over raw model state dumps.
