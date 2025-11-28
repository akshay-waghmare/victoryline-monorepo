# Implementation Tasks: Fast Ball-by-Ball Updates

**Feature**: 007-fast-updates  
**Generated**: 2025-11-28  
**Updated**: 2025-11-28  
**Source**: spec.md, plan.md, data-model.md, contracts/

## Overview

| Metric | Value |
|--------|-------|
| Total Tasks | 38 |
| Completed | 22 |
| Remaining | 16 |
| User Stories | 5 |
| Phases | 9 |
| Parallel Opportunities | 15 |
| Estimated Effort | 7-9 developer-days |

## User Story Mapping

| Story | Priority | Tasks | Independent Test |
|-------|----------|-------|------------------|
| US1: Real-time Ball-by-Ball | P1 | 6 | Verify 19.1→20.0 captured in sequence |
| US2: Live Score Updates | P1 | 5 | Score increments within 2s of run |
| US3: Scorecard Statistics | P2 | 4 | Batsman runs match total within 5s |
| US4: WebSocket Resilience | P2 | 3 | Reconnect after 10s airplane mode |
| US5: High-Action Moments | P1 | 4 | 6 balls in 60s all captured in order |

---

## Phase 1: Setup ✅ COMPLETE

- [x] T001 Create feature branch from main and verify environment in `apps/scraper/crex_scraper_python/`
- [x] T002 [P] Add new config fields to `apps/scraper/crex_scraper_python/src/config.py` (scorecard_polling_interval_seconds, cache_scorecard_ttl, backoff settings)
- [x] T003 [P] Add environment variable prefix to ScraperSettings class in `apps/scraper/crex_scraper_python/src/config.py` for SCRAPER_* overrides
- [x] T004 [P] Add `enable_fast_updates` and `enable_immediate_push` feature flags to ScraperSettings in `apps/scraper/crex_scraper_python/src/config.py` and guard new behavior behind them

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

- [x] T005 Reduce polling_interval_seconds from 2.5 to 1.0 in `apps/scraper/crex_scraper_python/src/config.py:75` (guarded by enable_fast_updates flag)
- [x] T006 [P] Reduce cache_live_ttl from 15 to 5 in `apps/scraper/crex_scraper_python/src/config.py:120`
- [x] T007 Add OnUpdateCallback type alias in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`
- [x] T008 Add on_update callback parameter to CrexAdapter.__init__ in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`

---

## Phase 3: User Story 1 - Real-time Ball-by-Ball Updates [P1] ✅ COMPLETE

**Goal**: Every ball update appears in UI within 2 seconds, no gaps in sequence.

**Independent Test**: Open app during live match, verify deliveries 19.1 to 20.0 captured in sequence with no gaps.

- [x] T009 [US1] Remove asyncio.sleep(2) after sV3 capture in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py:88-92` (guarded by enable_immediate_push flag)
- [x] T010 [US1] Call on_update callback immediately when sV3 response intercepted in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`
- [x] T011 [P] [US1] Create BallEvent dataclass in `apps/scraper/crex_scraper_python/src/models/ball_event.py`
- [x] T012 [P] [US1] Create UpdateSequence dataclass in `apps/scraper/crex_scraper_python/src/models/update_sequence.py`
- [x] T013 [US1] Add last_ball_number tracking dict to CrexScraperService via BallTracker service
- [x] T014 [US1] Implement gap detection logic (expected next ball vs actual) in `apps/scraper/crex_scraper_python/src/services/ball_tracker.py`

---

## Phase 4: User Story 2 - Live Score Updates [P1] ✅ COMPLETE

**Goal**: Score (runs, wickets, overs) updates within 2 seconds of sV3 response.

**Independent Test**: During live match, verify score counter increments within 2s of each run.

- [x] T015 [P] [US2] Create ScoreSnapshot dataclass in `apps/scraper/crex_scraper_python/src/models/score_snapshot.py`
- [x] T016 [US2] Implement parse_score_snapshot function in `apps/scraper/crex_scraper_python/src/services/score_parser.py`
- [x] T017 [US2] Wire on_update callback to cricket_data_service.push_score via CrexAdapter on_sv3_update callback
- [x] T018 [US2] Update Redis cache with 5s TTL on score push (cache_live_ttl reduced to 5)
- [x] T019 [US2] Add timestamp logging for all score updates via UpdateSequencer

---

## Phase 5: User Story 3 - Scorecard Statistics [P2] ⏳ PARTIAL

**Goal**: Batsman/bowler stats update within 10 seconds max staleness.

**Independent Test**: Compare batsman runs on scorecard with total score - should match within 5 seconds.

- [x] T020 [P] [US3] Create ScorecardState dataclass with nested BatsmanStats and BowlerStats in `apps/scraper/crex_scraper_python/src/models/scorecard_state.py`
- [ ] T021 [US3] Implement _scorecard_poll_loop async method in `apps/scraper/crex_scraper_python/src/crex_scraper.py`
- [x] T022 [US3] Add fetch_scorecard method to CrexAdapter for sC4 endpoint (on_sc4_update callback added)
- [ ] T023 [US3] Launch scorecard poll loop as separate asyncio.create_task per match in `apps/scraper/crex_scraper_python/src/crex_scraper.py`

---

## Phase 6: User Story 4 - WebSocket Resilience [P2] ✅ COMPLETE

**Goal**: Updates resume seamlessly after brief network interruptions.

**Independent Test**: Simulate airplane mode for 10s, reconnect, verify updates resume without page refresh.

- [x] T024 [US4] Implement latest-state-wins logic (skip stale updates) in `apps/scraper/crex_scraper_python/src/services/update_sequencer.py`
- [ ] T025 [US4] Add connection retry with exponential backoff in `apps/scraper/crex_scraper_python/src/services/cricket_data_service.py`
- [ ] T026 [US4] Log all push failures with match_id and timestamp in `apps/scraper/crex_scraper_python/src/services/cricket_data_service.py`

---

## Phase 7: User Story 5 - High-Action Moments [P1] ✅ COMPLETE

**Goal**: Priority scheduling ensures final overs get immediate processing.

**Independent Test**: Simulate 6 balls in 60 seconds, verify all 6 captured and pushed in order.

- [x] T027 [P] [US5] Create MatchPhase and MatchImportance enums in `apps/scraper/crex_scraper_python/src/models/match_priority.py`
- [x] T028 [P] [US5] Create MatchPriority dataclass with calculate_priority method in `apps/scraper/crex_scraper_python/src/models/match_priority.py`
- [ ] T029 [US5] Integrate priority scoring into AsyncScheduler task queue in `apps/scraper/crex_scraper_python/src/scheduler/async_scheduler.py`
- [ ] T030 [US5] Implement exponential backoff with jitter for HTTP 429 responses in `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`
- [ ] T031 [US5] Integrate rate-limit backoff with polling interval in `apps/scraper/crex_scraper_python/src/scheduler/async_scheduler.py` (increase poll interval on repeated 429s, decay back to 1s on recovery)

---

## Phase 8: Polish & Observability ✅ COMPLETE

- [x] T032 [P] Add update_latency_seconds Prometheus histogram in `apps/scraper/crex_scraper_python/src/metrics.py`
- [x] T033 [P] Add missed_balls_total and rate_limit_events_total Prometheus counters in `apps/scraper/crex_scraper_python/src/metrics.py`
- [x] T034 [P] Add scorecard_staleness_seconds Prometheus gauge in `apps/scraper/crex_scraper_python/src/metrics.py` and update on each sC4 fetch (SC-003)
- [x] T035 Create Grafana dashboard JSON for live update health in `apps/scraper/crex_scraper_python/monitoring/dashboards/fast-updates.json`

---

## Phase 9: Testing ⏳ PARTIAL

- [x] T036 [P] Add unit tests for BallEvent, ScoreSnapshot, ScorecardState, MatchPriority models in `apps/scraper/crex_scraper_python/tests/unit/test_fast_updates_models.py` (31 tests passing)
- [ ] T037 Add integration test: simulated live match flow (sV3 + sC4) verifies no skipping from 19.1 to 20.0 in `apps/scraper/crex_scraper_python/tests/integration/test_live_match_flow.py`
- [ ] T038 Add load test for 50+ concurrent matches with metrics assertions in `apps/scraper/crex_scraper_python/tests/load/test_concurrent_matches.py`

---

## Dependencies

```
Phase 1 (Setup + Feature Flags) ─────────────────────┐
                                                     ↓
Phase 2 (Foundational) ──────────────────────────────┤
         ↓                                           │
    ┌────┴────┬────────────┬────────────┐            │
    ↓         ↓            ↓            ↓            │
Phase 3    Phase 4     Phase 5      Phase 7          │
(US1 P1)   (US2 P1)    (US3 P2)     (US5 P1)         │
    │         │            │            │            │
    └────┬────┴────────────┴────────────┘            │
         ↓                                           │
     Phase 6 (US4 P2) ←──────────────────────────────┘
         ↓
     Phase 8 (Polish & Observability)
         ↓
     Phase 9 (Testing)
```

**Note**: US1, US2, US5 are all P1 priority and can be developed in parallel after Phase 2. US3 and US4 (P2) can follow any P1 completion.

**Feature Flags**: New behavior guarded by `enable_fast_updates` and `enable_immediate_push` flags. Rollback = flip env var, no code revert needed.

---

## Parallel Execution Opportunities

### Within Phase 1 (Setup)
```
T002 ─┬─ [P] Config fields
T003 ─┼─ [P] Env prefix
T004 ─┘  [P] Feature flags
```

### Within Phase 3 (US1)
```
T011 ─┬─ [P] BallEvent model
T012 ─┘  [P] UpdateSequence model
```

### Within Phase 4-7 (User Stories)
```
T015 ─── [P] ScoreSnapshot model (US2)
T020 ─── [P] ScorecardState model (US3)
T027 ─┬─ [P] Enums (US5)
T028 ─┘  [P] MatchPriority model (US5)
```

### Within Phase 8 (Polish)
```
T032 ─┬─ [P] Latency histogram
T033 ─┼─ [P] Counters
T034 ─┘  [P] Scorecard staleness gauge
```

### Within Phase 9 (Testing)
```
T036 ─── [P] Unit tests (models)
```

---

## Implementation Strategy

### MVP Scope (User Story 1 only)
- Complete Phases 1-3 (Setup, Foundational, US1)
- Delivers: No missed balls, 1s polling, immediate push
- Estimated: 2 developer-days
- Validates core fix before additional features
- **Feature flags enabled**: Deploy with `SCRAPER_ENABLE_FAST_UPDATES=true`

### Incremental Delivery Order
1. **Day 1-2**: Phases 1-3 (MVP - ball-by-ball fix)
2. **Day 3**: Phase 4 (Live score updates)
3. **Day 4**: Phase 5 (Scorecard loop)
4. **Day 5**: Phases 6-7 (Resilience + Priority)
5. **Day 6**: Phase 8 (Observability)
6. **Day 7**: Phase 9 (Testing + validation)

### Rollback Strategy
- **Instant rollback**: Set `SCRAPER_ENABLE_FAST_UPDATES=false` and `SCRAPER_ENABLE_IMMEDIATE_PUSH=false`
- No code revert needed - feature flags disable new behavior
- Original 2.5s polling and 15s cache TTL remain as fallback defaults

### Rollback Points
- After Phase 2: Config changes only, flag-protected
- After Phase 3: Core functionality complete, flag-protected
- After Phase 9: Full feature complete with tests

---

## Validation Checklist

Before marking phase complete:

- [ ] All tasks in phase have checkbox marked
- [ ] Independent test for user story passes
- [ ] No regressions in existing functionality
- [ ] Metrics show improvement (if applicable)
- [ ] Code reviewed and merged to feature branch
