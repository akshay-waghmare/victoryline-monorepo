# Spec 057 — Shared lifecycle cohorts across public surfaces

## Problem

Crickzen currently has a resolved canonical lifecycle in the backend, but homepage, live-score hubs, schedule, archive, sitemap, and match SSR still apply overlapping local status filters or endpoint-specific fallback logic. A match can therefore be classified differently on different indexable surfaces.

## Goal

Create one canonical cohort contract over the resolved match catalogue and make every public discovery surface consume it without removing existing match information.

## Cohorts

Every canonical match belongs to exactly one cohort:

- `live`: live, rain delay, or innings break inside its format-aware lifecycle window.
- `upcoming`: scheduled and not yet live.
- `recent`: terminal match with indexable retained content changed within 30 days.
- `archive`: terminal match with indexable retained content older than 30 days.

Terminal rows without an indexable result/retained content remain excluded from public discovery rather than being forced into a cohort.

## Requirements

1. The backend resolves canonical identity, lifecycle, cohort, and semantic freshness once per match key.
2. API responses expose cohort membership and stable cohort endpoints without duplicating aliases.
3. Homepage, `/live-score`, `/live-score/today`, `/live-score/ipl`, `/cricket-schedule/today`, and `/live-score/archive` use the shared contract rather than local lifecycle filters.
4. Sitemap partitions, hub counts, visible cards, internal links, and schema eligibility agree with the cohort contract.
5. A completed match must never render in a live lane. A multi-day match at stumps/lead must remain live/innings-break while its format window is open.
6. Preserve all current rich match information and retained result discovery; this is a source-of-truth consolidation, not content reduction.
7. Existing numbered sitemap URLs remain compatible while named cohort shards are authoritative in the index.

## Success criteria

- One sampled match has the same canonical URL, lifecycle, cohort, label, and eligibility in API, raw SSR, JSON-LD, hubs, and sitemap.
- Lifecycle boundaries pass automated tests for Test/first-class, ODI, T20, and Hundred matches.
- No duplicate canonical URL appears across cohort endpoints or sitemap shards.
- Cold and warm public SSR evidence retains all visible content; cached canonical match p95 is under two seconds after deployment.

## Non-goals

- New SEO page expansion, ranking claims, or content thinning.
- Changing match-data provider semantics.
- Removing legacy public routes before redirect/compatibility evidence exists.
