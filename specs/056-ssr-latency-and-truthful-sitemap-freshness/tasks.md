# Tasks

## Baseline and truth repair

- [ ] T001 Capture cold and three warm timings for AUS–BAN and lifecycle samples; record TTFB, total time, cache state, bytes, and SSR completeness.
- [ ] T002 Trace all `10MT` rows by stable CREX key and repair owner/evidence merge so format, lifecycle, static facts, schema, and sitemap use one resolved record.
- [ ] T003 Add an automated contradiction test for an alias whose canonical owner lacks format text but a sibling has Test/first-class evidence.

## Full-information SSR latency

- [ ] T004 Define a semantic match-document fingerprint from every SSR-visible match fact; explicitly exclude transport timestamps and equivalent polling noise.
- [ ] T005 Implement retained full-document SSR caching by canonical match ID, with stale-while-revalidate refresh and bounded single-flight rendering.
- [ ] T006 Preserve all existing SSR blocks on a cache hit: hero, score, lifecycle, venue, toss, scorecard, commentary, lineups, details, JSON-LD, canonical, and internal links.
- [ ] T007 Invalidate the retained document only after a semantic fingerprint change or canonical-owner change; keep an availability-safe rich document on upstream failure.

## Cohorts and truthful lastmod

- [ ] T008 Define `live`, `upcoming`, `recent`, and `archive` lifecycle cohorts, including age/retention boundaries and mutually exclusive membership tests.
- [ ] T009 Route each hub and sitemap partition through the shared cohort resolver; remove lifecycle-mixed fallback behaviour.
- [ ] T010 Persist `seo_content_fingerprint` and `seo_content_modified_at` (with migration/backfill) and update them transactionally only for meaningful match-content changes.
- [ ] T011 Generate sitemap lastmod from `seo_content_modified_at`; verify manifest regeneration and no-op polls leave URL lastmods unchanged.
- [ ] T012 Publish cohort-named sitemap partitions in the sitemap index without duplicate canonical URLs or aliases.

## Verification and rollout

- [ ] T013 Add backend tests for meaningful-change detection, lifecycle cohort classification, stale state boundaries, and alias evidence merge.
- [ ] T014 Add frontend SSR tests for full-document cache hits, Googlebot parity, content preservation, and no thin fallback regression.
- [ ] T015 Run a production canary: prove AUS–BAN lifecycle/schema/catalogue/sitemap agreement, truthful current content timestamp, and warm p95 under two seconds.
- [ ] T016 Roll out with production image/digest proof, cache invalidation proof, cohort audit, and documented rollback path.
