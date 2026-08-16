# Tasks

## Contract

- [ ] T001 Map every current hub/catalogue endpoint and local lifecycle filter.
- [ ] T002 Extract a shared `MatchLifecycleCohortResolver` over resolved canonical records.
- [ ] T003 Define cohort DTO, endpoint contract, pagination, ordering, and indexability behavior.
- [ ] T004 Add canonical one-owner and mutually-exclusive cohort assertions.

## Backend integration

- [ ] T005 Route existing catalogue endpoints through the resolver without breaking clients.
- [ ] T006 Add explicit cohort endpoints for live, upcoming, recent, and archive.
- [ ] T007 Route named sitemap shards through the resolver and remove duplicate classification.
- [ ] T008 Align semantic freshness and cache invalidation facts with the resolver output.

## Frontend integration

- [ ] T009 Replace homepage live/upcoming/recent local filters with shared cohort data.
- [ ] T010 Replace live-score and schedule hub local filters/fallbacks with shared cohort data.
- [ ] T011 Route archive pagination and IPL filtering through cohort-aware queries while retaining rich cards and links.
- [ ] T012 Preserve SSR transfer-state bounds and complete visible card information.

## Verification and rollout

- [ ] T013 Add tests for Test/first-class stumps, ODI, T20, Hundred, stale rows, terminal results, aliases, and no duplicates.
- [ ] T014 Add SSR/hub contract tests proving the same match does not change lane across surfaces.
- [ ] T015 Capture local raw SSR and API evidence for representative cohort rows.
- [ ] T016 Build clean backend/frontend images, deploy backend first then frontend, and record digests/rollback pins.
- [ ] T017 Prove production agreement for AUS–BAN plus one ODI, T20, and Hundred sample; verify warm cached match SSR p95 under two seconds.
