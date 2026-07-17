# Analytics Baseline And Reporting Plan

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Measurement artifact

## Purpose

This document defines how Spec 044 should measure real traffic and intelligence usage.

It does not claim the real baseline has already been collected.
That part is still blocked on access to the live analytics destinations and Search Console exports.

## Baseline Status Right Now

### What is ready

- frontend event taxonomy exists
- route-level interaction events are instrumented
- canonical CTA events are instrumented
- intent-ledger fields are defined at the spec level
- `AnalyticsService.trackEvent` forwards events to configured `gtag`, `dataLayer`, and a `crickzen:analytics` DOM event, while remaining safe when no provider is installed.
- A focused bridge test covers `prediction_view` forwarding.

### What is not yet proved

- production analytics destination receives these events correctly
- Search Console query exports for prediction-intent terms are in hand
- baseline values for traffic and engagement are recorded in one durable sheet or dashboard

## Required Baseline Metrics

Collect these before any indexing expansion decision:

### Traffic baseline

- organic landing sessions to canonical match pages
- organic landing sessions to any intelligence route if already exposed
- landing sessions by lifecycle:
  - upcoming
  - live
  - completed

### Engagement baseline

- `intelligence_cta_impression`
- `intelligence_cta_click`
- `prediction_view`
- `prediction_interaction`
- `explanation_expand`
- `model_unavailable`

### Relationship baseline

- `alert_cta_click`
- `relationship_join`
- `repeat_match_visit`

### Commercial baseline

- `premium_interest`
- `api_interest`
- `commercial_enquiry`

## Real-Traffic Data Sources

### Source 1: Search Console

Use for:

- query cluster demand
- landing page impressions
- clicks
- CTR
- average position

Required filters:

- prediction-intent modifiers:
  - `prediction`
  - `who will win`
  - `win probability`
  - `winning chances`
  - `prediction update`
  - `turning point`
  - `loss reason`

### Source 2: Product analytics destination

Use for:

- event counts
- unique sessions
- event sequences
- route engagement quality

### Source 3: SEO dashboard or reporting layer

Use for:

- joined view of landing page plus downstream engagement
- weekly trend snapshots

## Minimum Reporting Views

### Report 1: Query cluster to landing page

Columns:

- week
- query cluster
- landing page
- impressions
- clicks
- CTR
- average position

### Report 2: Landing page to intelligence engagement

Columns:

- week
- landing page
- lifecycle
- organic sessions
- `intelligence_cta_click`
- `prediction_view`
- `prediction_interaction`
- `explanation_expand`
- `model_unavailable`

### Report 3: Relationship and commercial outcome

Columns:

- week
- landing page
- relationship joins
- repeat visits
- premium interest
- API interest
- enquiries

## Weekly Review Questions

Every weekly review should answer:

1. Are we getting prediction-intent demand or only generic score traffic?
2. Do users who land on match pages actually move into intelligence?
3. Which lifecycle performs best:
   - upcoming
   - live
   - completed
4. Are model-unavailable states too common?
5. Is any cluster ready to expand, or does it still need product depth?

## Current Blockers

- no live Search Console export captured in this repo yet
- no confirmed production analytics destination readout captured in this repo yet
- local work cannot create a trustworthy real-traffic baseline by itself

## Immediate Next Actions

1. verify local event payloads on the running stack
2. identify the production analytics destination used for `trackIntelligenceEvent`
3. export Search Console query data for the approved prediction modifiers
4. record the first weekly baseline in a durable sheet or dashboard

## Decision Rule

No indexing expansion decision should rely only on impressions or clicks.

The minimum acceptable evidence is:

- query demand is prediction-intent aligned
- the landing page produces `prediction_view`
- the route produces downstream interaction or repeat behavior

If traffic rises but interaction remains weak, improve product depth before expanding SEO.
