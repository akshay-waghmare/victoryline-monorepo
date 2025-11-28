# Feature Specification: Fast Ball-by-Ball and Score Updates

**Feature Branch**: `007-fast-updates`  
**Created**: 2025-01-15  
**Status**: Draft  
**Input**: User description: "Issue with fast updates - ball 9.3 to 9.6 skipping, score_updates not going quickly, scorecard updates after long time. Need faster updates and don't want to miss updates."

## Clarifications

### Session 2025-11-28

- Q: How should system handle unknown Crex API rate limits with 1s polling? → A: Assume rate limit exists, implement adaptive polling with exponential backoff
- Q: How should system handle backpressure when WebSocket clients can't keep up? → A: Drop old updates, always send latest state (newest wins)
- Q: How should system determine high-priority matches for resource allocation? → A: Weighted combination of viewer count × match phase × match importance

---

## Problem Statement

The live cricket scraper is experiencing significant update latency and missed ball-by-ball events:
1. **Ball skipping**: Updates jump from ball 9.3 directly to 9.6, missing intermediate deliveries
2. **Slow score propagation**: Score changes take too long to reach the frontend (5-17+ seconds)
3. **Stale scorecards**: Batsman/bowler statistics update after long delays

### Root Causes Identified

| Issue | Root Cause | Location |
|-------|------------|----------|
| Ball skipping | 2.5s polling interval misses rapid consecutive deliveries | `config.py:75` |
| Slow score push | sV3 API response captured but not pushed immediately | `crex_adapter.py:88-92` |
| Stale scorecard | sC4 only fetched during scrape cycle, not continuously | `crex_adapter.py:90` |
| Cache staleness | 15s cache TTL + polling gap = 17s+ effective delay | `config.py:120` |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Ball-by-Ball Updates (Priority: P1)

As a cricket fan watching a live match on Crickzen, I want to see every ball update within 2 seconds of it happening so I don't miss any action, especially during exciting overs.

**Why this priority**: Ball-by-ball updates are the core feature of live cricket coverage. Missing deliveries (9.3 → 9.6) breaks user trust and makes the app unreliable for live following.

**Independent Test**: Open the app during a live match and verify that every delivery from 19.1 to 20.0 in a T20 final over is captured in sequence with no gaps.

**Acceptance Scenarios**:

1. **Given** a live match is in progress, **When** a ball is bowled (e.g., ball 9.4), **Then** the update appears in the UI within 2 seconds
2. **Given** 3 consecutive balls are bowled rapidly (9.4, 9.5, 10.0), **When** updates are pushed, **Then** all 3 balls appear in correct sequence with no missing balls
3. **Given** a wicket falls on ball 15.3, **When** the dismissal is detected, **Then** both the wicket event and updated batting card reflect within 2 seconds

---

### User Story 2 - Live Score Counter Updates (Priority: P1)

As a user with the match glance widget open, I want the score (runs, wickets, overs) to update as runs are scored so I can track the match progress in real-time.

**Why this priority**: Score display is the primary at-a-glance information. Slow score updates (5-17s delay) make users distrust the "live" label.

**Independent Test**: During a live match where runs are being scored regularly, verify the score counter increments within 2 seconds of each run.

**Acceptance Scenarios**:

1. **Given** the current score is 145/3, **When** 4 runs are scored, **Then** the display shows 149/3 within 2 seconds
2. **Given** a boundary six is hit, **When** the sV3 API returns the updated score, **Then** the UI reflects the new score immediately without waiting for next poll cycle
3. **Given** a run-out occurs (runs + wicket), **When** the event is detected, **Then** both runs and wicket count update atomically

---

### User Story 3 - Accurate Scorecard Statistics (Priority: P2)

As a user viewing the detailed scorecard, I want batsman strike rates and bowler economy rates to reflect the latest balls so I can analyze player performance accurately.

**Why this priority**: Scorecard data (sC4) is secondary to live score but essential for deeper engagement. Stale stats (30s+) confuse users comparing live score vs scorecard.

**Independent Test**: During a live match, compare the batsman's runs on the scorecard with the total score - they should match within 5 seconds.

**Acceptance Scenarios**:

1. **Given** batsman X hits a four on ball 12.3, **When** the scorecard is viewed, **Then** batsman X's runs include that boundary within 5 seconds
2. **Given** bowler Y concedes 12 runs in an over, **When** the over ends, **Then** bowler Y's economy rate updates within the next scorecard refresh (max 10 seconds)
3. **Given** a new batsman comes to crease, **When** they face their first ball, **Then** the scorecard shows their entry within 10 seconds

---

### User Story 4 - WebSocket Connection Resilience (Priority: P2)

As a user on a mobile connection, I want updates to resume seamlessly after brief network interruptions so I don't miss critical moments.

**Why this priority**: Mobile users frequently experience connection drops. Graceful reconnection prevents them from seeing stale data.

**Independent Test**: Simulate airplane mode for 10 seconds during a live match, then reconnect and verify updates resume without refresh.

**Acceptance Scenarios**:

1. **Given** user loses connection for 5 seconds, **When** connection restores, **Then** the latest score appears within 1 second
2. **Given** 3 balls were bowled during a 15-second disconnect, **When** reconnected, **Then** the current state shows correct score (no need to replay missed balls)
3. **Given** connection is unstable (frequent drops), **When** updates resume, **Then** no duplicate events are displayed

---

### User Story 5 - No Missed Updates During High-Action Moments (Priority: P1)

As a user following a super over or final over, I want guaranteed delivery of every ball update even during rapid consecutive deliveries.

**Why this priority**: High-tension moments (last over, super over) have the highest engagement. Missing balls here causes maximum user frustration.

**Independent Test**: Simulate rapid ball sequence (6 balls in 60 seconds) and verify all 6 are captured in order.

**Acceptance Scenarios**:

1. **Given** a super over is in progress, **When** 6 legal deliveries occur in 90 seconds, **Then** all 6 balls are captured and pushed in order
2. **Given** rapid scoring (wide + 4 runs in quick succession), **When** events occur, **Then** both events are captured as separate updates
3. **Given** server load is high (multiple matches), **When** final over updates occur, **Then** priority scheduling ensures this match gets immediate processing

---

### Edge Cases

- **What happens when sV3 API rate limits the scraper?** → Implement exponential backoff with jitter, log rate limit events, alert if sustained
- **What happens when a ball is revised (umpire review)?** → Accept corrected data, emit correction event, UI handles gracefully
- **How does system handle multiple matches updating simultaneously?** → Priority queue ensures live matches (especially final overs) get preference
- **What happens when browser context crashes mid-scrape?** → Auto-restart worker, resume from last known state, log incident
- **How does system handle timezone differences?** → All timestamps in UTC, client converts to local time

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST poll live match data at minimum 1-second intervals (reduced from 2.5s), with adaptive backoff if rate limiting detected
- **FR-002**: System MUST push score updates immediately when sV3 API response is intercepted, not wait for poll cycle
- **FR-003**: System MUST maintain continuous sC4 (scorecard) polling with dedicated loop, max 10-second staleness
- **FR-004**: System MUST guarantee in-order delivery of ball-by-ball events (no 9.3 → 9.6 skipping)
- **FR-005**: System MUST implement sequence tracking to detect and alert on missed balls
- **FR-006**: System MUST reduce live data cache TTL to 5 seconds (from 15s)
- **FR-007**: System MUST support parallel sV3 and sC4 data streams without blocking each other
- **FR-008**: System MUST log all ball events with timestamps for debugging missed update incidents
- **FR-009**: System MUST gracefully handle sV3 API failures without crashing the poll loop
- **FR-010**: System MUST expose metrics for update latency (time from sV3 response to WebSocket push)
- **FR-011**: System MUST implement exponential backoff with jitter (base 1s, max 30s) when rate limit responses (HTTP 429) detected
- **FR-012**: System MUST use latest-state-wins strategy for WebSocket updates (drop stale updates if client is slow, always send current state)
- **FR-013**: System MUST prioritize matches using weighted score: (viewer_count × phase_weight × importance_weight) where phase_weight = {final_over: 3, middle: 2, start: 1} and importance_weight = {international: 3, domestic: 2, club: 1}

### Non-Functional Requirements

- **NFR-001**: End-to-end latency from ball bowled to UI update MUST be < 3 seconds (p95)
- **NFR-002**: System MUST handle 50+ concurrent live matches without degradation
- **NFR-003**: System MUST maintain < 100ms internal processing time per update
- **NFR-004**: WebSocket broadcast to all connected clients MUST complete within 200ms
- **NFR-005**: Memory usage per live match MUST stay below 50MB

### Key Entities

- **BallEvent**: Individual delivery with ball number (e.g., 9.4), runs, extras, wicket, timestamp
- **ScoreSnapshot**: Current match state (runs, wickets, overs, run rate, required rate)
- **ScorecardState**: Detailed batting/bowling cards with per-ball granularity
- **UpdateSequence**: Monotonically increasing sequence number per match for ordering

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero missed ball updates during a complete match (all balls from 0.1 to final captured in order)
- **SC-002**: 95% of score updates appear in UI within 2 seconds of sV3 API response
- **SC-003**: Scorecard staleness reduced from 30s+ to < 10s maximum
- **SC-004**: End-to-end latency p50 < 1.5s, p95 < 3s, p99 < 5s
- **SC-005**: No "ball skipping" incidents reported in production for 7 consecutive days
- **SC-006**: User complaints about slow updates reduced by 80% (measure via support tickets)
- **SC-007**: System handles 100 concurrent live matches with latency SLOs maintained

### Validation Methods

| Criteria | Validation Method |
|----------|-------------------|
| SC-001 | Automated test: Record full match, compare ball sequence to source |
| SC-002 | Prometheus metrics: `update_latency_seconds` histogram |
| SC-003 | Metrics: `scorecard_staleness_seconds` gauge |
| SC-004 | Grafana dashboard with latency percentiles |
| SC-005 | Log analysis: Search for gap detection alerts |
| SC-006 | Support ticket tagging before/after deployment |
| SC-007 | Load test with simulated concurrent matches |

---

## Technical Approach *(high-level)*

### Phase 1: Quick Wins (1-2 days)
1. Reduce `polling_interval_seconds` from 2.5 to 1.0 in `config.py`
2. Add immediate push callback when sV3 API response is intercepted in `crex_adapter.py`
3. Reduce `cache_live_ttl` from 15 to 5 seconds

### Phase 2: Dedicated Scorecard Loop (2-3 days)
4. Create separate async task for sC4 polling (10-second interval)
5. Decouple sC4 from sV3 scrape cycle

### Phase 3: Sequence Tracking (2-3 days)
6. Add `last_ball_number` tracking per match
7. Detect gaps (9.3 → 9.6) and log alerts
8. Implement backfill logic for missed balls

### Phase 4: Observability (1-2 days)
9. Add `update_latency_seconds` Prometheus histogram
10. Add `missed_balls_total` counter
11. Create Grafana dashboard for live update health

---

## Out of Scope

- UI/frontend changes (this spec is scraper-only)
- Historical data backfill for past matches
- Push notification infrastructure
- Multi-source scraping (Crex-only for now)

---

## Open Questions

1. ~~**Rate limits**: What are the Crex sV3/sC4 API rate limits? Need to ensure 1s polling doesn't trigger throttling.~~ → Resolved: Assume rate limits exist, implement adaptive exponential backoff.
2. ~~**Backpressure**: If WebSocket clients can't keep up, should we drop old updates or queue them?~~ → Resolved: Drop old updates, always send latest state (newest wins).
3. ~~**Match priority**: How do we determine which matches are "high priority" for resource allocation?~~ → Resolved: Weighted score = viewer_count × phase_weight × importance_weight.
