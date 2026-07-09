# Daily SEO Monitoring Checklist

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Daily Checks

### 1. Discovery and freshness

- Check one upcoming match sample from `/api/cricket-data/upcoming-matches`
- Confirm target `/cric-live/{slug}` is linked from a discoverable hub
- Confirm sitemap freshness for new eligible matches
- Confirm lifecycle state has not left a completed match exposed as misleadingly live

### 2. Canonical and SSR

- Fetch raw HTML for one upcoming, one live, and one completed match page
- Confirm canonical URL is correct
- Confirm exactly one visible `h1`
- Confirm title and description match visible lifecycle state
- Confirm raw SSR HTML includes meaningful intent-supporting text

### 3. Prediction / intelligence eligibility

- Confirm eligible matches have model freshness and a valid intelligence CTA path
- Confirm ineligible matches degrade honestly and do not promise prediction content
- Confirm no thin intelligence route has been exposed without value gate approval

### 4. Search performance review

- Check Search Console page/query deltas for:
  - prediction
  - win probability
  - prediction update
  - turning point
- Mark each cluster:
  - improve
  - expand
  - consolidate
  - observe
  - stop

### 5. Event health

- Verify `match_view` and `prediction_view` are flowing
- Verify `prediction_interaction` and `explanation_expand` exist for sampled pages
- Verify `alert_cta_click` and `relationship_join` if relationship flow is active
- Check for anomalous event drops by lifecycle or surface

### 6. UX guardrails

- Confirm score remains primary on sampled canonical pages
- Confirm intelligence CTA does not displace hero state
- Confirm no commercial or alert module has moved above score-first ownership

### 7. Issue log

Record:

- affected URL
- lifecycle
- issue family
- suspected owner
- next action

## Issue Families

- discovery gap
- canonical mismatch
- SSR weak content
- stale model
- no model
- wrong lifecycle metadata
- low engagement
- CTA missing
- relationship flow failure
- thin duplicate surface
