# Tasks: Lifecycle-aware NewsArticle eligibility

## Phase 1 — Specification and continuity

- [x] T001 Create Spec 052 with schema policy matrix, non-goals, requirements, edge cases, and success criteria.
- [x] T002 Record the prior Spec 051 implementation and evidence boundary in the CrickZen wiki.

## Phase 2 — Eligibility implementation

- [x] T003 Refine the frontend eligibility helper to require non-upcoming lifecycle, substantive visible updates, parseable update timestamps, and real modification time.
- [x] T004 Keep Article fallback and valid SportsEvent guard independent from NewsArticle eligibility.
- [x] T005 Add an explicit eligibility reason/helper if the existing lifecycle code cannot explain why NewsArticle was suppressed.

## Phase 3 — Regression coverage

- [x] T006 Add/update lifecycle tests for valid upcoming, sparse upcoming, eligible live/editorial, sparse live, and completed non-editorial pages.
- [ ] T007 Run structured-data service tests and TypeScript compile/build with the repository-compatible Node/OpenSSL setting. TypeScript and browser build passed; lifecycle assertions passed within the full Karma run (170 passed, 52 unrelated configuration/provider failures). Angular 7 CLI has no `--include` flag, so the structured-data service suite still needs an isolated or full-suite verification pass.
- [ ] T008 Run raw SSR plus normal/desktop/mobile Googlebot parity checks on one eligible and one non-eligible sample.

## Phase 4 — Controlled rollout and measurement

- [ ] T009 Review the diff against Spec 051 and deploy only the frontend slice after all local gates pass.
- [ ] T010 Record schema types and eligibility reason in the fixed cohort ledger without changing GSC denominator rules.
- [ ] T011 Reinspect the next fixed cohort in GSC at T−24/T−6/T−1/T+24–72; do not attribute indexing changes to schema without evidence.
- [ ] T012 Decide whether to keep, narrow, or revert the NewsArticle experiment after three measured cohorts.
