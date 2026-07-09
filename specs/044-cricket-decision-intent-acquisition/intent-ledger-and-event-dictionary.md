# Intent Ledger And Event Dictionary

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Intent Ledger Contract

The intent ledger is the privacy-safe record that links acquisition to engagement, relationship capture, and commercial outcomes.

## Ledger Fields

| Field | Required | Notes |
|---|---|---|
| `visitor_key` | yes | privacy-safe stable identifier; no raw personal identifier required |
| `session_key` | yes | per-session join key |
| `event_name` | yes | one of the approved event names |
| `event_ts` | yes | UTC timestamp |
| `source_channel` | yes | `organic`, `direct`, `internal`, `social`, `paid`, `owned-channel`, `partner`, `unknown` |
| `source_platform` | no | `google`, `telegram`, `whatsapp`, `x`, etc |
| `query_cluster` | no | normalized cluster such as `per-match-prediction` |
| `query_text_observed` | no | only when captured legally and safely |
| `landing_path` | yes | first page path for the session |
| `surface_path` | yes | page where event fired |
| `surface_family` | yes | `canonical-match`, `match-intelligence`, `prediction-hub`, `alert-page`, `api-page` |
| `match_slug` | no | required for match-specific surfaces |
| `match_id` | no | backend-resolved identifier where available |
| `lifecycle_state` | no | `upcoming`, `live`, `completed`, `unknown` |
| `intent_cluster` | yes | `live-score`, `prediction`, `turning-point`, `live-explanation`, `relationship`, `commercial` |
| `cta_id` | no | unique CTA identifier when applicable |
| `relationship_outcome` | no | `joined`, `declined`, `unavailable`, `failed` |
| `commercial_outcome` | no | `interest`, `enquiry`, `qualified`, `not-qualified` |
| `failure_reason` | no | `stale-model`, `no-model`, `route-not-eligible`, `join-failed`, etc |
| `dedupe_key` | yes | event-specific dedupe rule |

## Event Dictionary

### `match_view`

- Trigger: first meaningful render of `/cric-live/{slug}`
- Required properties: `surface_path`, `surface_family=canonical-match`, `match_slug`, `lifecycle_state`
- Dedupe: once per session per `surface_path`
- Owner: frontend match page
- Destination: analytics stream + intent ledger
- QA: refresh page twice in one session and confirm one logical event

### `prediction_view`

- Trigger: first meaningful render of `/match-intelligence/{slug}`
- Required properties: `surface_family=match-intelligence`, `match_slug`, `lifecycle_state`, `model_freshness_bucket`
- Dedupe: once per session per match + lifecycle
- Owner: frontend intelligence route
- Destination: analytics stream + intent ledger
- QA: direct load and browser refresh both resolve to one deduped logical view

### `prediction_interaction`

- Trigger: user expands or interacts with prediction-specific modules such as win-probability detail, pressure factors, or scenario explanation
- Required properties: `module_id`, `match_slug`, `lifecycle_state`
- Dedupe: once per session per module
- Owner: frontend intelligence route
- Destination: analytics stream + intent ledger
- QA: interact twice with same module and confirm dedupe rule

### `explanation_expand`

- Trigger: user opens a “what changed”, “why it changed”, or turning-point explanation block
- Required properties: `module_id`, `match_slug`, `lifecycle_state`, `surface_family`
- Dedupe: once per session per module
- Owner: canonical match page or intelligence route
- Destination: analytics stream + intent ledger
- QA: open two different explanation blocks and confirm separate events

### `alert_cta_click`

- Trigger: user clicks a follow / alert CTA
- Required properties: `cta_id`, `surface_family`, `match_slug` when applicable, `lifecycle_state`
- Dedupe: once per session per CTA
- Owner: frontend CTA layer
- Destination: analytics stream + intent ledger
- QA: click same CTA repeatedly and confirm dedupe

### `relationship_join`

- Trigger: user successfully joins Telegram, email, push, or another owned relationship flow
- Required properties: `channel`, `origin_cta_id`, `surface_family`, `match_slug` when applicable
- Dedupe: once per visitor per channel per 24h
- Owner: relationship capture flow
- Destination: analytics stream + intent ledger
- QA: simulate success and failure outcomes

### `repeat_match_visit`

- Trigger: visitor returns to the same match or intelligence surface in a later session
- Required properties: `match_slug`, `surface_family`, `return_window_bucket`
- Dedupe: once per later session per match
- Owner: analytics processing layer
- Destination: intent ledger
- QA: verify from two sessions

### `premium_interest`

- Trigger: user engages with a premium-interest teaser or upgrade-oriented advanced capability
- Required properties: `capability_id`, `surface_family`, `match_slug` when applicable
- Dedupe: once per session per capability
- Owner: monetization layer
- Destination: analytics stream + intent ledger
- QA: trigger from one sampled capability

### `api_interest`

- Trigger: user engages with API/widget documentation or commercial feature CTA
- Required properties: `surface_family=api-page`, `cta_id`
- Dedupe: once per session per CTA
- Owner: B2B landing page
- Destination: analytics stream + intent ledger
- QA: click API CTA from sampled page

### `commercial_enquiry`

- Trigger: user submits or starts a commercial enquiry flow
- Required properties: `surface_family`, `channel`, `product_interest`
- Dedupe: once per enquiry attempt
- Owner: commercial capture flow
- Destination: CRM + intent ledger
- QA: validate success + failed submission paths

## Transaction-Adjacent Supporting Events

These are not the core analytics contract from the spec, but they are useful operationally:

- `intelligence_cta_impression`
- `intelligence_cta_click`
- `model_unavailable`
- `upgrade_view`
- `upgrade_start`
- `upgrade_complete`

## Capability Matrix

| Capability | Launch tier | Notes |
|---|---|---|
| Headline win probability | free | launch enabled |
| What changed summary | free | launch enabled |
| Model freshness status | free | launch enabled |
| Basic turning-point explanation | free | launch enabled when data supports |
| Alerts / follows | registered later | not required for first free launch |
| Probability history | premium later | future capability |
| Advanced scenario analysis | premium later | future capability |
| Publisher API / widget | commercial later | distinct B2B flow |

## Analytics Destinations

- Frontend event stream
- Intent ledger dataset
- Relationship system where applicable
- Commercial / CRM destination for B2B events

## Validation Notes

- DOM click logging alone is not sufficient
- every event must be validated in its actual configured destination
- sampled QA should cover upcoming, live, and completed lifecycle states
