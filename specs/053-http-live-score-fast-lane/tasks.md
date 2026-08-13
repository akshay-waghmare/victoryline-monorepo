# Tasks: Low-resource HTTP Live Score Fast Lane

## Phase 1 — Contract and safety

- [x] T001 Verify direct `getSV3` from production egress for all three selected live matches.
- [x] T002 Verify existing immediate patch mapper covers direct-feed fields and identify localStorage dependencies.
- [x] T003 Create Spec 053, architecture plan, data ownership contract, safety gate, and rollback plan.
- [x] T004 Add default-disabled settings and HTTP-lane health metrics.

## Phase 2 — Implementation

- [x] T005 Implement one shared async `sV3` client with selected-slate reconciliation and changed-payload deduplication.
- [x] T006 Gate polling/pushing on complete Redis localStorage identity and use `push_immediate_sv3()` unchanged.
- [x] T007 Add host-wide rate budget, jitter, adaptive interval, and fail-closed circuit breaker.
- [x] T008 Preserve 45-second normal full-scrape fallback and cancel state for unselected matches.

## Phase 3 — Tests and local proof

- [x] T009 Unit-test update/dedup, identity readiness, removal, interval policy, and no persistent-page creation.
- [x] T010 Unit-test `403`/`429`/malformed/timeout circuit-breaker behavior and recovery cooldown.
- [x] T011 Run focused scraper tests and a real one-match HTTP runtime probe without browser contexts.
- [ ] T012 Build runtime-only scraper image and verify image tests.

## Phase 4 — Controlled production release

- [ ] T013 Deploy only the scraper image with max three matches, HTTP lane enabled, persistent pages disabled.
- [ ] T014 Observe the 15-minute production gate: healthy/zero failures, three eligible matches, bounded PIDs, no upstream block, and advancing public timestamps.
- [ ] T015 Roll back scraper-only configuration immediately if any gate fails; otherwise record the exact artifact and evidence.

## Phase 5 — Durable handoff

- [ ] T016 Update the Crickzen wiki checkpoint, index, hot context, and log with verified final outcome.
