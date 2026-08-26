# Plan

## Phase 0 — Evidence and inventory

1. Preserve the 2026-08-18 audit artifacts and correct the denominator to the
   exact selected child sitemap set.
2. Reconcile every advertised sitemap URL against the resolved catalogue:
   canonical slug, stable key, lifecycle, cohort, indexability reason, and
   expected HTTP disposition.
3. Run a separate historical/recent/archive audit; the earlier crawl did not
   cover the complete roughly 2,998-URL domain corpus.

## Phase 1 — Shared identity and lifecycle policy

1. Reject blank, malformed, and placeholder team identities at the shared URL
   helper boundary.
2. Resolve canonical snapshots by stable key first and exact human-readable
   slug second, so older bare URLs can be retained when their record still
   exists.
3. Keep one canonical owner per stable key and preserve deterministic 301
   aliases.

## Phase 2 — Schedule-first SSR

1. Treat a trustworthy future scheduled time as `upcoming` even when score or
   model fields are absent.
2. Render a complete canonical schedule document with teams, competition,
   schedule, venue when known, and honest unavailable-model copy.
3. Do not run retained-result entity fan-out for upcoming/live pages.
4. Keep `SportsEvent` conditional on both trustworthy `startDate` and venue.
5. Measure cold/warm latency and repeated status stability under bounded
   concurrency before changing the render deadline.

## Phase 3 — Fresh sitemap publication

1. Generate named cohort shards from the same resolved canonical catalogue.
2. Exclude invalid identities, no-result terminal rows without retained value,
   duplicate aliases, and records with no canonical route.
3. Keep valid recent/archive result pages; retire only URLs with no valid entity
   or deterministic replacement.
4. Publish atomically and preserve the last known-good manifest if generation
   fails.

## Phase 4 — Verification and rollout

1. Run focused backend tests, compile, frontend syntax/type/build checks, and
   local raw SSR probes.
2. Build clean backend/frontend images with pinned rollback references.
3. Canary one bare upcoming URL, one pre-generated upcoming URL, one valid
   retained result, one alias, one placeholder, and one fabricated URL using
   normal and Googlebot user agents.
4. Fetch every URL in every advertised sitemap shard and fail the release on
   unexpected 4xx/5xx, duplicate locations, or cohort disagreement.
5. Only after the technical gate passes, inspect fixed GSC cohorts at
   T−24h/T−6h/T−1h/T+24–72h.
