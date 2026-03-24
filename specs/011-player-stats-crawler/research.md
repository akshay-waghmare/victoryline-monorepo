# Research: Decoupled Player Stats Crawler

**Feature**: 011-player-stats-crawler  
**Date**: 2026-03-24  
**Status**: Complete

## Research Tasks

### 1. Worker Topology for Zero Live-Path Regression

**Decision**: Implement player stats as a separate worker entrypoint and deploy it as a separate container/service in non-local environments.

**Rationale**:

- The current scraper already coordinates discovery, background workers, browser pooling, fast polling, and immediate push logic.
- Player stats extraction is heavier than live scoreboard extraction because it requires parsing larger scorecard or squad views and does not need 1-second cadence.
- The safest way to honor the hard requirement is to keep the new workload outside the existing `CrexScraperService` fast path.

**Alternatives Considered**:

- Add another task loop inside `CrexScraperService`: rejected because it increases shared event-loop, queue, browser, and PID pressure.
- Reuse `FastUpdateManager` with lower-priority jobs: rejected because the fast-update manager is explicitly optimized for live score freshness, not heavy player-stat crawling.
- Run player stats synchronously during live score pushes: rejected because it couples slow data to the most latency-sensitive path.

**Implementation Notes**:

- Add a new worker entrypoint, e.g. `src\player_stats_app.py`.
- Give it its own browser budget, queue limits, and health/metrics.
- In production, deploy it separately from the primary scraper service.

---

### 2. Candidate Match Intake Should Reuse Backend Canonical State

**Decision**: Read live and upcoming match candidates from backend endpoints instead of rediscovering them independently.

**Rationale**:

- The backend already stores canonical `LiveMatch` records with `externalMatchKey`, lifecycle state, and schedule metadata.
- Reusing backend endpoints keeps player-stat work aligned with the same match catalog already used elsewhere in the system.
- It avoids the risk of the player-stats worker discovering a slightly different match set or conflicting URL variant.

**Alternatives Considered**:

- Directly crawl `https://crex.com/live-matches` and `https://crex.com/schedule` again from the player-stats worker: rejected due to duplication and drift risk.
- Query Redis/cache owned by the primary scraper: rejected because it creates tighter coupling and a hidden dependency.

**Implementation Notes**:

- Live candidates: `GET /cricket-data/live-matches`
- Upcoming candidates: `GET /cricket-data/upcoming-matches`
- Optional health source: `GET /status` from the primary scraper for pause decisions

---

### 3. CREX Must Be Primary; ESPN Must Be Optional Enrichment

**Decision**: Use CREX for base live and upcoming player snapshots; use ESPN only as an optional secondary adapter triggered asynchronously or on demand.

**Rationale**:

- Current VictoryLine live/upcoming match flow is already CREX-centric.
- ESPN is useful for filling optional metadata gaps, but relying on it for primary live or upcoming match presence would create a second core dependency.
- The request explicitly requires ESPN to remain secondary and optional.

**Alternatives Considered**:

- ESPN as co-primary source for upcoming lineups: rejected because it complicates reconciliation and raises operational risk.
- Always-on ESPN enrichment for all players: rejected due to rate-limit, latency, and data-quality risk.

**Implementation Notes**:

- Add `ENABLE_PLAYER_STATS_ESPN_ENRICHMENT=false` by default.
- Support an async enrichment request endpoint from the backend.
- Use negative caching to avoid repeated lookup failures.

---

### 4. Separate Scheduling and Rate Limits Are Mandatory

**Decision**: Create a dedicated player-stats scheduler with its own queue classes and per-provider token buckets.

**Rationale**:

- Existing settings already show distinct feature flags and rate-limit concepts in the scraper.
- Player-stat crawling has a different urgency profile than live score pushes.
- Shared rate limits would allow the lower-value path to crowd the higher-value live path.

**Recommended Initial Defaults**:

| Dimension | Live Player Stats | Upcoming Player Context | ESPN Enrichment |
|-----------|-------------------|-------------------------|-----------------|
| Trigger | backend live matches | backend upcoming matches | explicit request / cache miss |
| Refresh interval | 20s | 10m (2m near start) | on demand |
| Concurrency class | medium | low | lowest |
| Rate limit | 0.5 req/s burst 2 | 0.25 req/s burst 1 | 0.1 req/s burst 1 |
| Shedding order | last to shed | shed before live | shed first |

**Implementation Notes**:

- Keep worker queue max small at first (for example 100 jobs).
- Upcoming and ESPN jobs should be easy to drop/defer under pressure.
- The worker should not share the live scraper's `concurrency_cap`.

---

### 5. Partial Upcoming Coverage Is a Valid Product State

**Decision**: Upcoming player capture should explicitly support incomplete states rather than forcing a success/failure binary.

**Rationale**:

- Upcoming data is often incomplete until close to toss.
- Forcing completeness would either create false failures or encourage over-aggressive crawling.
- Consumers need to know whether the system has no data, some squad data, or a confirmed XI.

**Coverage States**:

- `NOT_AVAILABLE`
- `SQUAD_ONLY`
- `PLAYING_XI`
- `LIVE_SCORECARD`
- `PARTIAL`
- `COMPLETE`

**Implementation Notes**:

- Backend responses should always include `coverageState`.
- Upcoming snapshots may contain players with sparse stat fields but meaningful lineup metadata.

---

### 6. Identity Strategy Should Start Match-Scoped

**Decision**: Persist a stable match-scoped player key first and treat canonical player identity as a separate enrichment/reconciliation step.

**Rationale**:

- Live scorecard correctness matters more than perfect global player identity in v1.
- Different sources can represent the same player with abbreviations, initials, or formatting differences.
- Match-scoped storage prevents data loss and allows safer later linking.

**Alternatives Considered**:

- Require global player IDs before storing any snapshot: rejected because it blocks ingestion on unresolved identity.
- Name-only global matching: rejected due to ambiguity risk.

**Implementation Notes**:

- Recommended match-scoped key pattern: `externalMatchKey + innings/team + normalized_player_name_or_provider_id`
- Store optional `canonicalPlayerId` and `identityConfidence` separately.

---

### 7. Primary Safety Signal Should Be the Existing Scraper Health Surface

**Decision**: The player-stats worker should consult the primary scraper's health/status endpoint and pause or back off when the primary scraper is degraded.

**Rationale**:

- The existing scraper already exposes `/health` and `/status` with state, score, PID count, and memory usage.
- The new worker's main purpose is additive, so it should yield to the primary scraper whenever environment pressure is visible.

**Recommended Guardrails**:

- pause if primary scraper state is not healthy
- pause if primary scraper PID count exceeds configured safety threshold
- pause or slow if local queue backlog exceeds max
- disable ESPN first, then upcoming, then slow live cadence

**Implementation Notes**:

- Add `PLAYER_STATS_PRIMARY_SCRAPER_STATUS_URL`
- Store last pause reason and export it in metrics/health

---

### 8. Backend Upsert Model Should Be Snapshot-Based

**Decision**: Use snapshot upserts rather than row-at-a-time mutating writes from the worker.

**Rationale**:

- Scorecard and squad views naturally arrive as full or near-full snapshots.
- Snapshot upserts simplify idempotency and make testing with fixtures easier.
- A snapshot model aligns well with provenance, coverage state, and capture timestamps.

**Alternatives Considered**:

- Per-player incremental patch events: rejected because it adds ordering complexity with little value in v1.
- Direct DB writes from the worker: rejected because backend should remain the owner of persistence.

**Implementation Notes**:

- `POST /cricket-data/player-stats/sync` should accept a snapshot DTO.
- Backend stores latest snapshot plus optional history hooks if needed later.

---

### 9. Recommended Metrics for Safe Rollout

**Decision**: Add worker-specific metrics from day one.

**Rationale**:

- The success condition is operational, not only functional.
- Without separate metrics, it is impossible to prove that the worker stayed isolated.

**Recommended Metrics**:

- `player_stats_jobs_inflight`
- `player_stats_queue_depth`
- `player_stats_snapshot_freshness_seconds`
- `player_stats_job_duration_seconds`
- `player_stats_crex_requests_total`
- `player_stats_espn_requests_total`
- `player_stats_pause_total{reason=...}`
- `player_stats_negative_cache_hits_total`
- `player_stats_enrichment_requests_total`

---

## Summary

All major design decisions converge on one rule: **player stats are useful but must always be optional relative to live-score safety**.

| Topic | Decision |
|------|----------|
| Worker topology | separate player-stats worker / container |
| Candidate source | backend live/upcoming endpoints |
| Primary source | CREX |
| Secondary source | ESPN, optional and on demand |
| Identity model | match-scoped first, canonical second |
| Write model | snapshot upsert via backend |
| Safety mechanism | independent queue/rate limits + primary-scraper health pause |
| Rollout | flags off by default, ESPN off in initial production rollout |
