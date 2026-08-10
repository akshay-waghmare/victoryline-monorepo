# India intent backlog: live match intelligence

Date: 2026-07-31  
Market: India, English  
Source: OpenSEO `Crickzen India SEO` keyword research

## Decision

Use prediction and live-decision phrasing as a differentiating layer on canonical match pages. Do not try to win generic live-score head terms with a new generic page. The canonical `/cric-live/{slug}` remains the one indexable per-match entity; standalone Match Intelligence remains noindex unless it clears the Spec 044 value gate.

## P1 clusters

| Cluster | India monthly volume | KD | Owning surface | SSR-visible answer | Primary event | Next step |
| --- | ---: | ---: | --- | --- | --- | --- |
| `cricket match prediction today` | 5,400 | 40 | Canonical match page and a reusable daily prediction hub only after value validation | probability, evidence, freshness, match context | `prediction_view` | probability-updates CTA |
| `who will win today match prediction` | 5,400 | 40 | Canonical match page | current probability plus why | `prediction_interaction` | alert/follow CTA |
| `today match winning percentage` | 12,100 | 42 | Canonical match page and later live-probability hub | current win probability, direction, timestamp | `prediction_view` | explanation module |
| `win probability cricket match today` | 1,900 | 54 | Canonical match page | live probability plus how it was derived | `explanation_expand` | return visit or alert |
| `cricket live win probability` | 30 | 46 | Reusable methodology/help page, linked from match pages | model limitations, inputs, freshness | `explanation_expand` | active-match discovery |

The high-volume generic cluster (`live cricket match today`, 673,000; KD 28) is a support/discovery term, not a primary ranking bet. It belongs to the existing live-score hub and must not pull score-first pages away from their product job.

## Explicit exclusions

- `100 sure`, `sure win`, `guaranteed`, `fixed match`
- betting, tips, odds-as-profit, and astrology variants
- Dream11 team-selection terms
- streaming and competitor-navigation queries

These queries may have volume, but they conflict with Crickzen's evidence-based, analytics-safe product promise and produce poor-fit traffic.

## Current GSC reality

The GSC-connected project shows exact fixture live-score demand, not validated prediction demand. It has 163 query/page rows for 2026-04-28 to 2026-07-28. The successful examples are exact score queries such as `br vs sgr live score` (35 clicks, 388 impressions, average position 5.6). Therefore P1 prediction demand is a productization and measurement initiative, not a claim that those terms already rank.

## Promotion gate

Promote a cluster only when a canonical page provides distinct visible SSR value, has fresh model context, is index-eligible, and produces measurable prediction/explanation engagement. Otherwise improve the canonical page or stop; do not mint a new route.

