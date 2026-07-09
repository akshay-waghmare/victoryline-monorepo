# Keyword-to-Intent-to-Surface Matrix

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Purpose

This matrix is the first ownership contract for decision-intent acquisition.

Each approved cluster must define:

- the user job
- the owning surface
- lifecycle
- canonical owner
- value gate
- primary event
- owned next step

No new indexable route should ship without an entry here.

## Core Intent Clusters

| Intent cluster | User job | Primary page family | Canonical owner | Primary event | Owned next step |
|---|---|---|---|---|---|
| Live score | Know current score, status, scorecard, commentary | Canonical match page | `/cric-live/{slug}` | `match_view` | Prediction or explanation interaction |
| Prediction | Know likely winner before or during match | Match intelligence page | `/match-intelligence/{slug}` after value gate; otherwise canonical match module only | `prediction_view` | Alert or follow CTA |
| Turning point | Understand where the match swung | Completed intelligence state or post-match analysis surface | `/match-intelligence/{slug}` completed state first | `explanation_expand` | Team follow or next-match path |
| Live explanation | Understand why momentum or probability changed | Canonical match explanation block or intelligence route | canonical match page first; separate tool only if reusable | `explanation_expand` | Alert or repeat visit |
| Alerts / relationship | Stay updated after leaving the page | Alert capture page or in-product CTA | alert landing or owned capture flow | `alert_cta_click` then `relationship_join` | Repeat owned-channel visit |
| API / widget | Evaluate publisher or B2B integration | Dedicated commercial page | API or widget landing page | `api_interest` or `commercial_enquiry` | Demo or enquiry |

## Approved P1 Clusters

These are the first clusters approved for implementation targeting.

| Priority | Query pattern examples | Lifecycle | Owning surface | Canonical owner | Value gate | Primary event | Owned next step | Decision |
|---|---|---|---|---|---|---|---|---|
| P1 | `{team a} vs {team b} prediction` | Upcoming, live | `/match-intelligence/{slug}` | match-intelligence route only after SSR/value gate | visible model direction, freshness, and reasons | `prediction_view` | `alert_cta_click` | target now |
| P1 | `{team a} vs {team b} win probability` | Live | `/match-intelligence/{slug}` linked from `/cric-live/{slug}` | match-intelligence route only after SSR/value gate | visible probability, freshness, match phase, and explanation | `prediction_view` | `prediction_interaction` | target now |
| P1 | `{team a} vs {team b} prediction update` | Live | `/match-intelligence/{slug}` | same route, lifecycle-aware metadata | visible “what changed” block and timestamped context | `prediction_interaction` | `relationship_join` | target now |

## P2 Observation Clusters

These clusters should be designed now but not expanded blindly into standalone URLs.

| Priority | Query pattern examples | Lifecycle | Owning surface | Canonical owner | Primary event | Owned next step | Decision |
|---|---|---|---|---|---|---|---|
| P2 | `today cricket match prediction`, `today match prediction` | Mixed daily | curated prediction hub | hub only after enough eligible matches exist | `prediction_view` | click to match intelligence | observe |
| P2 | `pitch report and prediction`, `toss prediction`, `playing 11 prediction` | Upcoming | canonical match page or intelligence route | canonical match page until stronger model support exists | `prediction_interaction` | follow match | observe |
| P2 | `why win probability changed`, `who is ahead in match` | Live | explanation block or intelligence module | canonical match page first | `explanation_expand` | alert CTA | target now for module, not new URL |
| P2 | `turning point`, `why team lost` | Completed | completed intelligence state or reusable analysis hub | completed intelligence state first | `explanation_expand` | next-match path | observe |

## P3 Relationship And Commercial Clusters

| Priority | Query pattern examples | Lifecycle | Owning surface | Canonical owner | Primary event | Owned next step | Decision |
|---|---|---|---|---|---|---|---|
| P3 | `cricket prediction alerts`, `win probability alerts` | Any | alert capture page | alert page | `alert_cta_click` | `relationship_join` | observe |
| P3 | `cricket prediction API`, `live score widget`, `win probability API` | Any | API / widget page | B2B landing page | `api_interest`, `commercial_enquiry` | demo / enquiry | observe |

## Rejected Or Merged Patterns

These should not create their own route today.

| Pattern family | Reason | Outcome |
|---|---|---|
| separate prediction URL for every keyword variation | keyword variation alone is not distinct value | merge into one lifecycle-aware intelligence URL |
| prediction pages without model freshness or visible reasoning | fails value gate | reject |
| turning-point pages for low-data matches | likely thin and weak | reject until evidence supports |
| alert pages using betting or guaranteed-win wording | policy and trust risk | reject |
| API or widget modules above the fold on consumer match pages | wrong user job and clutters score-first UX | reject |

## Lifecycle Ownership Rules

### Upcoming

- canonical match page owns score, fixture, toss watch, lineup context, and broad preview intent
- intelligence route owns model direction and prediction framing only if real probability and reasoning are present

### Live

- canonical match page remains score-first
- intelligence route owns deeper prediction and probability-movement framing
- live explanation can appear on the canonical page, but must not replace score-first hero ownership

### Completed

- canonical match page preserves result and scorecard continuity
- intelligence route can own turning-point and prediction-review framing if the explanation is distinct and preserved

## Route Decision

- Working public route name: `/match-intelligence/{slug}`
- `/cric-live/{slug}` remains canonical for the core match entity
- `/match-intelligence/{slug}` is non-indexable until it passes unique-value, SSR, and internal-link gates

## Value Gate

Every proposed new surface must pass all of these:

1. Distinct user job from `/cric-live/{slug}`
2. SSR-visible value in the first render
3. Real first-party or model-backed explanation
4. Honest freshness and fallback handling
5. One owned next step

If any item fails, the cluster stays on the canonical match page or remains unshipped.
