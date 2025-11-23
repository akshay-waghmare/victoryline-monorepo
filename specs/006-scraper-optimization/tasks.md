# Tasks: High-Reliability Scraper Optimization

Feature: 006-scraper-optimization  
Branch: `006-scraper-optimization`  
Spec: `specs/006-scraper-optimization/spec.md`  
Plan: `specs/006-scraper-optimization/plan.md`

---
## Phase 1: Setup

- [x] T001 Ensure Playwright async dependency present (verify `playwright==1.40.0`) in `apps/scraper/crex_scraper_python/requirements.txt`
- [x] T002 Add `redis` & `asyncio` runtime config placeholders to `apps/scraper/crex_scraper_python/src/config.py`
- [x] T003 Add environment variable documentation (Redis host, cache TTLs, concurrency cap) to `specs/006-scraper-optimization/quickstart.md`
- [x] T004 Add pids limit (`pids_limit: 512`) to `docker-compose.prod.yml` (root) referencing scraper service
- [x] T005 Add new Python dependency `backoff` (if not present) to `apps/scraper/crex_scraper_python/requirements.txt`
- [x] T006 Create `.env.example` entries for `REDIS_URL`, `CONCURRENCY_CAP`, `CACHE_LIVE_TTL`, `PAUSE_COOLDOWN` in `apps/scraper/crex_scraper_python/.env.example`
- [x] T007 Initialize Prometheus scrape config for scraper `/metrics` in `apps/scraper/monitoring/prometheus.yml`
- [x] T008 Add Grafana dashboard stub JSON `apps/scraper/monitoring/dashboards/scraper-health.json`
- [x] T009 Add ring buffer settings (`AUDIT_MAX_ENTRIES`) to `apps/scraper/crex_scraper_python/src/config.py`
- [x] T010 Document canonical match ID mapping strategy in `specs/006-scraper-optimization/ARCHITECTURE.md`

## Phase 2: Foundational

- [x] T011 Implement `AsyncBrowserPool` skeleton in `apps/scraper/crex_scraper_python/src/browser_pool.py`
- [x] T012 [P] Implement context acquire/release with semaphore in `apps/scraper/crex_scraper_python/src/browser_pool.py`
- [x] T013 Implement `AsyncScheduler` priority queue & interface in `apps/scraper/crex_scraper_python/src/scheduler.py`
- [x] T014 [P] Add task enqueue logic (LIVE/IMMINENT/COMPLETED mapping) to `apps/scraper/crex_scraper_python/src/scheduler.py`
- [x] T015 Implement Redis cache wrapper `ScrapeCache` in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T016 [P] Add snapshot rolling buffer operations (LPUSH/TRIM) in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T017 Implement metrics collector skeleton in `apps/scraper/crex_scraper_python/src/metrics.py`
- [x] T018 [P] Register counters/gauges (freshness, queue_depth, active_tasks, domain_failures) in `apps/scraper/crex_scraper_python/src/metrics.py`
- [x] T019 Implement health grader state machine in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T020 [P] Implement stall detection timer logic in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T021 Implement token bucket util in `apps/scraper/crex_scraper_python/src/adapters/rate_limit.py`
- [x] T022 [P] Implement reliability score calculator (rolling failure & latency window) `apps/scraper/crex_scraper_python/src/adapters/reliability.py`
- [x] T023 Implement base `SourceAdapter` interface in `apps/scraper/crex_scraper_python/src/adapters/base.py`
- [x] T024 [P] Implement Crex adapter minimal fetch API in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`
- [x] T025 Implement adapter registry & dynamic enable flags in `apps/scraper/crex_scraper_python/src/adapters/registry.py`
- [x] T026 Integrate DOM parser `dom_match_extract.py` into fetch pipeline in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T027 [P] Add canonical ID mapping / lookup in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T028 Implement audit ring buffer manager in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T029 [P] Implement manual recycle endpoint stub in `apps/scraper/crex_scraper_python/src/app.py`
- [x] T030 Implement `/status` endpoint returning HealthSummary in `apps/scraper/crex_scraper_python/src/app.py`
- [x] T031 [P] Implement `/metrics` endpoint (Prometheus exposition) in `apps/scraper/crex_scraper_python/src/app.py`
- [x] T032 Integrate retry decorator using backoff/tenacity in `apps/scraper/crex_scraper_python/src/utils/retry.py`
- [x] T033 [P] Implement watchdog/orphan PID cleanup `apps/scraper/crex_scraper_python/src/utils/watchdog.py`
- [x] T034 Implement delta snapshot computation helper `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T035 [P] Add negative cache (missing matches) set ops in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T036 Implement reconciliation precedence (static weight + reliability) in `apps/scraper/crex_scraper_python/src/adapters/registry.py`
- [x] T037 [P] Implement provenance assignment for fields in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T038 Wire configuration loading (env → config object) in `apps/scraper/crex_scraper_python/src/config.py`
- [x] T039 [P] Update Dockerfile for async entrypoint in `apps/scraper/Dockerfile`
- [x] T040 Add pids monitoring integration (psutil) in `apps/scraper/crex_scraper_python/src/health.py`

## Phase 3: User Story 1 (Continuous Fresh Updates) [P1]

- [x] T041 [US1] Implement freshness timestamp update on successful scrape in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T042 [P] [US1] Implement freshness percentile aggregation in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T043 [US1] Implement live snapshot caching (TTL 15s) in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T044 [P] [US1] Implement delta snapshot emission logic in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T045 [US1] Add unit test freshness update `apps/scraper/crex_scraper_python/tests/unit/test_freshness_update.py`
- [x] T046 [P] [US1] Add unit test snapshot caching hit rate harness `apps/scraper/crex_scraper_python/tests/unit/test_cache_live_snapshots.py`
- [x] T047 [US1] Add integration test multi-match freshness SLA `apps/scraper/crex_scraper_python/tests/integration/test_freshness_sla.py`
- [x] T048 [P] [US1] Add contract test `/status` freshness fields `apps/scraper/crex_scraper_python/tests/contract/test_status_freshness.py`
- [x] T049 [US1] Add metrics test for freshness percentiles `apps/scraper/crex_scraper_python/tests/contract/test_metrics_freshness.py`

## Phase 4: User Story 2 (Graceful Degradation Under Load) [P2]

- [x] T050 [US2] Enforce concurrency cap (semaphore) in scheduler `apps/scraper/crex_scraper_python/src/scheduler.py`
- [x] T051 [P] [US2] Implement bounded queue size & drop/defer logic `apps/scraper/crex_scraper_python/src/scheduler.py`
- [x] T052 [US2] Implement priority ordering (LIVE first) in `apps/scraper/crex_scraper_python/src/scheduler.py`
- [x] T053 [P] [US2] Implement token bucket enforcement pre-enqueue `apps/scraper/crex_scraper_python/src/adapters/rate_limit.py`
- [x] T054 [US2] Implement reliability scoring periodic update `apps/scraper/crex_scraper_python/src/adapters/reliability.py`
- [x] T055 [P] [US2] Integrate degraded state detection thresholds `apps/scraper/crex_scraper_python/src/health.py`
- [x] T056 [US2] Add unit test queue bounding `apps/scraper/crex_scraper_python/tests/unit/test_scheduler_queue_bound.py`
- [x] T057 [P] [US2] Add unit test token bucket logic `apps/scraper/crex_scraper_python/tests/unit/test_token_bucket.py`
- [x] T058 [US2] Add unit test reliability scoring `apps/scraper/crex_scraper_python/tests/unit/test_reliability_score.py`
- [x] T059 [P] [US2] Add integration test overload scenario queue plateau `apps/scraper/crex_scraper_python/tests/integration/test_overload_plateau.py`
- [x] T060 [US2] Add contract test degraded health grade `apps/scraper/crex_scraper_python/tests/contract/test_status_degraded.py`
- [x] T061 [P] [US2] Add metrics test queue depth exposure `apps/scraper/crex_scraper_python/tests/contract/test_metrics_queue_depth.py`

## Phase 5: User Story 3 (Self-Recovery From Stalls) [P3]

- [x] T062 [US3] Implement stall detection interval tracking in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T063 [P] [US3] Implement automated recovery trigger logic in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T064 [US3] Implement browser recycle flow (pool drain + restart) in `apps/scraper/crex_scraper_python/src/browser_pool.py`
- [x] T065 [P] [US3] Implement audit logging entry creation in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T066 [US3] Implement paused match resume after cooldown in `apps/scraper/crex_scraper_python/src/health.py`
- [x] T067 [P] [US3] Add unit test stall detection -> recovery `apps/scraper/crex_scraper_python/tests/unit/test_recovery_stall.py`
- [x] T068 [US3] Add unit test audit ring buffer trim `apps/scraper/crex_scraper_python/tests/unit/test_audit_ring_buffer.py`
- [x] T069 [P] [US3] Add integration test forced recycle path `apps/scraper/crex_scraper_python/tests/integration/test_forced_recycle.py`
- [x] T070 [US3] Add contract test recovery grade transition `apps/scraper/crex_scraper_python/tests/contract/test_status_recovering.py`
- [x] T071 [P] [US3] Add metrics test recovery counters `apps/scraper/crex_scraper_python/tests/contract/test_metrics_recovery.py`

## Phase 6: Cross-Cutting & Multi-Domain

- [x] T072 Implement domain enable/disable dynamic config in `apps/scraper/crex_scraper_python/src/adapters/registry.py`
- [x] T073 [P] Implement provenance field tagging integration test `apps/scraper/crex_scraper_python/tests/integration/test_provenance_fields.py`
- [x] T074 Implement negative cache for missing upcoming matches in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T075 [P] Add unit test negative cache expiry `apps/scraper/crex_scraper_python/tests/unit/test_negative_cache.py`
- [x] T076 Implement completed match archival eviction in `apps/scraper/crex_scraper_python/src/cache.py`
- [x] T077 [P] Add unit test archival eviction logic `apps/scraper/crex_scraper_python/tests/unit/test_archival_eviction.py`
- [x] T078 Implement reconciliation warning exposure in `/status` output `apps/scraper/crex_scraper_python/src/app.py`
- [x] T079 [P] Add contract test reconciliation provenance presence `apps/scraper/crex_scraper_python/tests/contract/test_status_provenance.py`

## Phase 7: Polish & Performance

- [x] T080 Profile async scraping latency (time per match) script `apps/scraper/crex_scraper_python/tests/perf/profile_latency.py`
- [x] T081 [P] Add PID stability test (200 cycles) `apps/scraper/crex_scraper_python/tests/integration/test_pid_stability.py`
- [x] T082 Add logging structure validation test `apps/scraper/crex_scraper_python/tests/unit/test_structured_logging.py`
- [x] T083 [P] Optimize context reuse (pool warm/rotate) in `apps/scraper/crex_scraper_python/src/browser_pool.py`
- [x] T084 Add configuration reload test (env change simulation) `apps/scraper/crex_scraper_python/tests/integration/test_config_reload.py`
- [x] T085 [P] Add health summary serialization test `apps/scraper/crex_scraper_python/tests/unit/test_health_summary_serialization.py`
- [x] T086 Final README update with async usage `apps/scraper/crex_scraper_python/README.md`
- [x] T087 [P] Update `MONITORING_GUIDE.md` with new metrics & alerts `apps/scraper/MONITORING_GUIDE.md`
- [x] T088 Add alert rule examples (freshness failing, stall detected) in `apps/scraper/monitoring/prometheus.yml`
- [x] T089 [P] Add load test script (synthetic matches) `apps/scraper/crex_scraper_python/tests/perf/load_test_matches.py`
- [x] T090 Add success criteria validation checklist `specs/006-scraper-optimization/checklists/results.md`

## Phase 8: Feature Parity Restoration (New)

- [x] T076 Implement `localStorage` extraction in `CrexAdapter` (Task 8.1)
- [x] T077 Implement Network Interception in `CrexAdapter` (Task 8.2)
- [x] T078 Port complex parsing logic (bowlers/batsmen stats) (Task 8.3)
- [x] T079 Integrate `CricketDataService` to push data to Backend API (Task 8.4)
- [x] T080 Verify data parity with legacy payload (Task 8.5)

---
## Dependency Graph (Story Completion Order)

Setup → Foundational → US1 → US2 → US3 → Cross-Cutting → Polish

US1 depends on Foundational readiness. US2 depends on scheduler + health baseline from US1. US3 depends on US2 degradation metrics (stall detection uses queue & freshness). Cross-Cutting can begin after US2 (some tasks parallelizable with US3). Polish after all.

---
## Parallel Execution Examples

- Example 1: T012 (context acquire) can run parallel with T014 (enqueue logic) and T016 (snapshot buffer) after T011.
- Example 2: T042 (freshness percentiles) parallel with T044 (delta emission) once cache (T015) exists.
- Example 3: T057 (token bucket test) parallel with T058 (reliability test) after their implementations (T053, T054).
- Example 4: T063 (recovery trigger) parallel with T064 (browser recycle) since both use existing pool from T011.
- Example 5: T073 (provenance integration test) parallel with T074 (negative cache) after foundational cache (T015) and provenance logic (T037).

---
## MVP Scope Suggestion

Deliver Phases 1–3 (Setup, Foundational, US1) to achieve continuous fresh updates & baseline metrics. Defer degradation and recovery mechanics (US2, US3) to subsequent increments.

---
## Independent Test Criteria per User Story

- US1: Freshness percentiles within thresholds under simulated load (T047, T049 pass; cache hit rate ≥85%).
- US2: Queue depth plateaus; degraded state surfaces; token bucket prevents burst violation (T059, T060, T061 pass).
- US3: Stall triggers recovery; audit ring buffer logs entry; health transitions to recovering then healthy (T069, T070, T071 pass).

---
## Format Validation

All tasks follow required checklist format: `- [ ] T### [P]? [USn]? Description with file path`. Parallelizable tasks marked `[P]`. User story tasks labeled `[US1]`, `[US2]`, `[US3]` within their phases only.

---
## Totals

- Total Tasks: 90
- US1 Tasks: 9 (T041–T049)
- US2 Tasks: 12 (T050–T061)
- US3 Tasks: 10 (T062–T071)
- Parallel Tasks Marked `[P]`: 34

---
## Next Steps

Begin implementation with T001–T010, then proceed to browser pool & scheduler (T011–T020). After completing Foundational, execute MVP (US1) tasks before moving to US2.
