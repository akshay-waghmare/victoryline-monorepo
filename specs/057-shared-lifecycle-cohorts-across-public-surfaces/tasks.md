# Tasks

## Contract

- [ ] T001 Map every current hub/catalogue endpoint and local lifecycle filter.
- [x] T002 Extract a shared cohort contract over resolved canonical records.
- [x] T003 Define cohort endpoint contract and ordering behavior.
- [ ] T004 Add canonical one-owner and mutually-exclusive cohort assertions.

## Backend integration

- [x] T005 Route the shared catalogue stream through the resolver without breaking existing clients.
- [ ] T006 Add explicit cohort endpoints for live, upcoming, recent, and archive.
- [x] T007 Route named sitemap shards through the resolved cohort field and escape XML safely.
- [ ] T008 Align semantic freshness and cache invalidation facts with the resolver output.

## Frontend integration

- [x] T009 Replace homepage live/upcoming/recent source feeds with shared cohort data.
- [x] T010 Replace live-score and upcoming discovery source with shared cohort data.
- [ ] T011 Route archive pagination and IPL filtering through cohort-aware queries while retaining rich cards and links.
- [ ] T012 Preserve SSR transfer-state bounds and complete visible card information.

## Verification and rollout

- [ ] T013 Add tests for Test/first-class stumps, ODI, T20, Hundred, stale rows, terminal results, aliases, and no duplicates.
- [ ] T014 Add SSR/hub contract tests proving the same match does not change lane across surfaces.
- [ ] T015 Capture local raw SSR and API evidence for representative cohort rows.
- [x] T016 Build and deploy backend first, then frontend, with pinned image tags and rollback `.env` backups.
- [x] T017 Prove production sitemap XML, cohort endpoint, healthy services, and warm cached canonical SSR response.
