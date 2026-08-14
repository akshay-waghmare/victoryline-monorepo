# Tasks: Crawl receipt and index selection

## Phase 1 — Contract and evidence

- [x] T001 [P] Freeze the 12–48-hour fixed upcoming cohort identity and checkpoint schema in the StartupOS ledger. (Existing ledger retained and formalized in Spec 051.)
- [x] T002 [P] Add the crawl-receipt/index-selection decision rule and NewsArticle non-goal to the SEO tracker and wiki.
- [x] T003 [P] Document the exact GSC observation fields required for `Discovered`, `Indexed`, and unknown outcomes.

## Phase 2 — Venue/location and catalogue quality

- [x] T004 Add schedule JSON-LD/ground venue extraction and placeholder normalization in `crex_schedule_parser.py`. (Implemented; parser test suite passes.)
- [x] T005 Add scraper unit coverage for real venue, placeholder venue, and absent venue cases. (9 parser tests pass.)
- [-] T006 Enrich upcoming backend rows from the canonical snapshot only when venue/identity facts are missing; preserve source identity and lifecycle. (Implemented and compiles; focused service assertion still required.)
- [ ] T007 Add focused backend coverage for upcoming venue hydration and no-invention behavior.

## Phase 3 — SSR and structured data

- [x] T008 Verify/extend the deterministic canonical fallback contract for timeout/error and unresolved routes. (Existing fallback is retained; production rollout proof remains separate.)
- [-] T009 Add a guarded NewsArticle factory path using genuine visible live/editorial updates; keep normal upcoming pages on Article/SportsEvent. (Implemented; Angular test gate remains.)
- [-] T010 Add lifecycle tests proving upcoming pages do not emit NewsArticle and eligible live coverage does. (Assertions added; Karma run remains.)

## Phase 4 — Cohort rollout and measurement

- [-] T011 Run parser/backend/frontend focused tests and local SSR/Googlebot parity checks. (Parser and backend compile pass; Angular Karma and real SSR parity remain.)
- [ ] T012 Deploy only the validated venue/SSR/schema slice using the narrow CrickZen rollout procedure.
- [ ] T013 Run the fixed cohort monitor at T−48/T−24, T−6, T−1, start, T+6, and T+24–72; retain append-only evidence.
- [ ] T014 Inspect one or two technically valid priority URLs per cohort in GSC; do not use the Indexing API for SportsEvent pages.
- [ ] T015 After three cohorts, evaluate technical readiness, discovery, and indexed-by-T−1h separately; update the decision and next experiment.
