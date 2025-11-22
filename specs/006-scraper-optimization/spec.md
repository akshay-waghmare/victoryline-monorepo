# Feature Specification: High-Reliability Scraper Optimization

**Feature Branch**: `006-scraper-optimization`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "Improve scraper efficiency, resource governance, freshness, resilience, observability, eliminate uncontrolled process growth and lag." 

## Clarifications

### Session 2025-11-22
- Q: What exposure/auth policy should apply to the `/metrics` and `/status` endpoints? → A: `/metrics` internal-only; `/status` public read (no auth).
- Q: Which per-domain rate limiting strategy should be used? → A: Token bucket (capacity + refill rate) per domain.
- Q: How should multi-source reconciliation precedence be determined? → A: Static precedence weight combined with dynamic reliability score (penalize degrading domains).
- Q: What retention policy should apply to recovery audit entries? → A: Keep last N (e.g., 200) entries in memory (ring buffer), ship all externally.
- Q: What canonical match identity scheme should be used across domains? → A: Use backend authoritative match ID; map other domain IDs via lookup table.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Continuous Fresh Updates (Priority: P1)
Operations stakeholders rely on near-real-time match data; the system keeps each live match's data within freshness targets without manual intervention.

**Why this priority**: Directly impacts user trust and downstream features depending on timely scores.

**Independent Test**: Simulate a set of live matches; verify freshness ages remain within targets over a fixed observation window.

**Acceptance Scenarios**:
1. **Given** multiple live matches, **When** normal update scheduling runs, **Then** 95% of freshness ages stay below the upper threshold.
2. **Given** a live match just updated, **When** a new update cycle elapses, **Then** the freshness age resets and is visible via status endpoint.

---

### User Story 2 - Graceful Degradation Under Load (Priority: P2)
During high simultaneous match volume, the system enforces capacity limits, prioritizes live/high-impact matches, and avoids total stall.

**Why this priority**: Prevents systemic collapse and ensures core value delivery under contention.

**Independent Test**: Generate tasks exceeding capacity; confirm low-priority tasks defer while live match freshness remains acceptable.

**Acceptance Scenarios**:
1. **Given** task demand beyond concurrency cap, **When** scheduling occurs, **Then** live matches still update while lower priority tasks are deferred.
2. **Given** sustained overload, **When** observing metrics, **Then** queue depth plateaus at defined maximum and health grade reflects "degraded" not "failing".

---

### User Story 3 - Self-Recovery From Stalls (Priority: P3)
If updates cease, the system detects stall conditions and initiates automated recovery with audit visibility.

**Why this priority**: Reduces manual intervention time and restores service reliability faster.

**Independent Test**: Induce a simulated stall (no successful completions); verify recovery workflow triggers and audit entry recorded.

**Acceptance Scenarios**:
1. **Given** no successful updates within the stall interval, **When** watchdog runs, **Then** recovery triggers and health grade changes to "recovering".
2. **Given** recovery completes, **When** updates resume, **Then** health grade returns to "healthy" within one monitoring interval.

---

### Edge Cases
- Spike: Sudden surge in matches beyond planned peak.
- Partial Failures: Single match repeatedly failing while others succeed.
- Long Idle: No live matches; system scales down scheduling frequency.
- Recovery Loop: Repeated stalls triggering successive recoveries.
- Paused Matches: Matches exceeding failure threshold during a period with others functioning.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST maintain a freshness timestamp per monitored match.
- **FR-002**: System MUST prioritize tasks (live > imminent > completed) during scheduling.
- **FR-003**: System MUST enforce a bounded queue; excess low-priority tasks are deferred or dropped predictably.
- **FR-004**: System MUST expose a status endpoint with per-match freshness, queue depth, active task count, paused matches, failure ratios, and overall health grade.
- **FR-005**: System MUST transition health grade based on freshness distributions and recovery state rules.
- **FR-006**: System MUST enforce a maximum number of concurrent update tasks (CONCURRENCY_CAP = 40).
- **FR-007**: System MUST retry transient failures with bounded attempts and randomized delay.
- **FR-008**: System MUST pause a match after exceeding consecutive failure threshold; pause duration is finite.
- **FR-009**: System MUST provide automated stall detection when no successful updates occur within a global interval.
- **FR-010**: System MUST perform controlled recovery actions (resource recycle) when stall conditions confirmed.
- **FR-011**: System MUST record audit entries for each automated recovery and manual recycle trigger.
- **FR-012**: System MUST expose configuration values (freshness thresholds, concurrency cap, failure thresholds) via status endpoint.
- **FR-013**: System MUST ensure background recovery does not erase existing freshness timestamps.
- **FR-014**: System MUST prevent initiation of tasks that would exceed capacity limits.
- **FR-015**: System MUST provide structured logs correlating match, phase, outcome, attempt number, and duration.
- **FR-016**: System MUST measure and publish freshness percentiles (median, 95th) each interval.
- **FR-017**: System MUST auto-resume paused matches after cooldown unless failure threshold breaches again.
- **FR-018**: System MUST recycle internal scheduling resources after exceeding uptime OR usage limits (RECYCLE_UPTIME = 6h OR RECYCLE_TASK_COUNT = 10,000, whichever first).
- **FR-019**: System MUST allow manual soft recycle via an administrative action.
- **FR-020**: System MUST surface a "degraded" state before critical failure thresholds to enable early intervention.
- **FR-021**: System MUST define freshness thresholds: DEGRADED if median freshness ≥ 60s OR p95 ≥ 60s; FAILING if any live match freshness ≥ 120s.
- **FR-022**: System MUST cache latest normalized match snapshot (TTL ≤ 15s) for continuity during brief failures.
- **FR-023**: System MUST cache static domain data (team roster, venue) with long TTL (12–24h) distinct from live snapshots.
- **FR-024**: System MUST provide delta outputs by comparing current snapshot with previous cached snapshot.
- **FR-025**: System MUST record and expose per-domain metrics (label `domain`) to support multi-site expansion.
- **FR-026**: System MUST support pluggable `SourceAdapter` interfaces for additional sites without altering core scheduler.
- **FR-027**: System MUST apply per-domain rate limits and concurrency caps (configurable) separate from global cap.
- **FR-028**: System MUST retain a rolling buffer (N=5) of recent snapshots per live match for debug inspection.
- **FR-029**: System MUST negative-cache missing upcoming matches (TTL 60s) to avoid hammering discovery endpoints.
- **FR-030**: System MUST reconcile duplicate match data from multiple domains using deterministic precedence rules.
- **FR-031**: System MUST expose reconciliation provenance (fields source) in status endpoint for multi-source matches.
- **FR-032**: System MUST allow dynamic enabling/disabling of a domain via configuration without restart.
- **FR-033**: System MUST evict completed matches from hot cache while retaining final snapshot for archival (TTL 24h).
- **FR-034**: System MUST ensure cache operations are O(1) per request and do not block scheduling loop (async operations).
- **FR-035**: System MUST restrict `/metrics` endpoint to internal interface only (not internet-facing) while exposing `/status` publicly (read-only, no authentication) relying on infrastructure/network segmentation for security.
- **FR-036**: System MUST implement per-domain token bucket rate limiting (capacity & refill rate configurable) enforcing domain-specific request pacing; tasks exceeding available tokens are deferred without blocking scheduler.
- **FR-037**: System MUST compute a dynamic reliability score per domain (based on rolling failure rate and latency over a recent time window) and combine it with static precedence weight to rank sources during reconciliation; domains with reliability below threshold are temporarily demoted.
- **FR-038**: System MUST retain only the last N (configurable, default 200) recovery audit entries in an in-memory ring buffer while emitting all entries to external logging; older entries evicted without blocking operations.
- **FR-039**: System MUST use the backend authoritative match ID as canonical for all internal tracking and reconciliation, maintaining a mapping table from each domain-specific match identifier to the canonical ID; mismatches or unmapped IDs MUST be surfaced as a reconciliation warning.

### Key Entities
- **Match Monitoring Record**: Identifier, last update time, freshness age, priority state, consecutive failure count, paused flag.
	- Canonical ID: backend authoritative match ID.
	- Mappings: dictionary of domain_id → domain_specific_match_id (runtime maintained, cached in memory; persisted indirectly via backend).
- **Task Record**: Match identifier, scheduled time, priority, attempt count, status.
- **Health Summary**: Grade, freshness statistics, queue depth, active tasks, failure ratio, configuration snapshot.
- **Recovery Audit Entry**: Timestamp, action type, trigger condition, outcome status.
	- Retention: Held in ring buffer of size AUDIT_MAX_ENTRIES (default 200); all entries also forwarded to external log sink.
- **Cached Snapshot**: Match ID, normalized payload, created_at, provenance metadata, sequence number.
- **Domain Adapter Descriptor**: Domain ID, rate limits, enabled flag, precedence weight, last discovery timestamp.
	- Adds: token_bucket_capacity, token_bucket_refill_rate (tokens/sec), current_tokens (runtime only, not persisted).
	- Adds: reliability_score (0–1), rolling_failure_rate (last N tasks), rolling_avg_latency_ms (last N tasks), precedence_effective (derived), last_reliability_update.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: ≥95% of live match freshness ages < 60s during peak hours.
- **SC-002**: Median (p50) freshness age for live matches < 30s across daily observation window.
- **SC-003**: No live match freshness age ≥ 120s for more than one consecutive interval.
- **SC-004**: Capacity enforcement prevents any task from starting beyond defined concurrency cap (0 violations in audit).
- **SC-005**: Stall recovery completes within 120s restoring healthy state.
- **SC-006**: Audit coverage: 100% of recovery and manual recycle actions have recorded entries.
- **SC-007**: Health grade updates within one monitoring cycle after threshold crossings.
- **SC-008**: Paused match automatically resumes after cooldown with ≥1 successful update in next two intervals.
- **SC-009**: Freshness percentile metrics available for external monitoring every interval without gaps.
- **SC-010**: Deferred low-priority tasks never exceed queue maximum for more than two consecutive intervals.
- **SC-011**: Cache hit rate for live match snapshot requests ≥ 85% during peak.
- **SC-012**: Reconciliation provenance present for 100% of multi-source matches.
- **SC-013**: Per-domain metrics exposed with <5s lag versus internal state.

## Assumptions
- **A-01**: External monitoring polls the status endpoint at regular short intervals.
- **A-02**: Match priority classification logic is available from existing domain rules.
- **A-03**: Configuration changes can be applied without full system restart.
- **A-04**: Limited operational staff prefer clear health grades over granular raw metrics.
- **A-05**: Network segmentation/firewall rules ensure only trusted internal systems can reach `/metrics`.
- **A-06**: External logging/observability stack persists full audit history beyond in-memory ring buffer.
- **A-07**: Backend exposes authoritative match IDs reliably before or during initial discovery phase.

## Constraints
- **C-01**: Must avoid unbounded growth in pending tasks.
- **C-02**: Must remain observable without privileged system access.
- **C-03**: Recovery actions must not corrupt existing freshness tracking.

## Out of Scope
- UI redesign of consumer applications.
- Changes to underlying match data schema beyond freshness and status flags.
- Multi-sport expansion.

## Risks
- **R-01**: Overly aggressive pauses could reduce coverage if thresholds misconfigured.
- **R-02**: Inaccurate freshness metrics could mislead health grading.
- **R-03**: Recovery loops could occur if root cause unresolved.

## Operational Threshold Definitions
- **CONCURRENCY_CAP**: 40 simultaneous update tasks (global). Tunable via config.
- **RECYCLE_UPTIME**: 6 hours continuous browser/scheduler uptime.
- **RECYCLE_TASK_COUNT**: 10,000 successful tasks triggers recycle if uptime not yet reached.
- **FRESHNESS_DEGRADED**: median or p95 freshness ≥ 60s.
- **FRESHNESS_FAILING**: any live match freshness ≥ 120s OR stalled (no successes) ≥ 90s.
- **CACHE_LIVE_TTL**: 15s (updated each cycle).
- **CACHE_STATIC_TTL**: 12–24h (configurable) for roster/venue.
- **NEGATIVE_CACHE_TTL**: 60s.
- **SNAPSHOT_BUFFER_SIZE**: 5 recent versions per live match.
- **PAUSE_COOLDOWN**: 300s before automatic resume attempt.
- **RETRY_ATTEMPTS**: 3 (exponential backoff with jitter).

## Edge Case Handling Summary
- Excess demand: enforce caps, defer non-live tasks.
- Persistent single-match failure: isolate via pause without global degradation.
- No matches: reduce scheduling frequency to baseline idle mode.
- Rapid config change: reflect new thresholds within next interval metrics.

## Acceptance Testing Overview
- Scenario suites map directly to User Stories and Success Criteria.
- Metrics sampling harness verifies freshness distributions and enforcement rules.
- Cache validation tests measure hit/miss rates under simulated load.
- Multi-domain adapter tests validate precedence and provenance correctness.

---

*End of specification draft.*
