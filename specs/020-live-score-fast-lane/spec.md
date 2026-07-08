# Feature Specification: Live Score Fast Lane

**Feature Branch**: `020-live-score-fast-lane`  
**Created**: 2026-06-10  
**Status**: In Progress  
**Input**: Investigate slow individual-match updates compared with the local `betx21.live` project and implement the transferable fast-update pattern.

## Current Evidence

- Production currently starts the scraper with `ENABLE_FAST_UPDATES=false` and `ENABLE_PERSISTENT_PAGES=false`.
- Production metrics showed `scraper_persistent_pool_size 0`, so live matches were not covered by the existing persistent-page network-intercept path.
- Repeated production API reads for a live match remained on the same score and over for more than 30 seconds.
- Crickzen already has a persistent-page `sV3` response interceptor and immediate backend push path, but the production defaults prevent it from running.
- `betx21.live` keeps a hot upstream websocket, preserves prior non-empty fields, and immediately emits one merged per-match snapshot while slower detail refreshes remain separate.

## User Scenarios & Testing

### User Story 1 - Live Match Updates Arrive Through The Fast Lane (Priority: P1)

As a viewer following an individual live match, I want score and ball changes to appear shortly after the upstream source changes so the page feels genuinely live.

**Acceptance Scenarios**:

1. **Given** a match is live, **When** the upstream `sV3` response changes, **Then** the scraper immediately pushes the changed live fields to the backend.
2. **Given** the fast lane is active, **When** slower enrichment or reconciliation runs, **Then** it remains a fallback and does not disable immediate updates.
3. **Given** production starts with no explicit override, **When** the scraper container launches, **Then** persistent pages and fast updates are enabled.

### User Story 2 - The Browser Receives One Merged Match Snapshot (Priority: P1)

As a viewer, I want related live fields to arrive together so the score hero does not briefly show mismatched score, over, ball, or team values.

**Acceptance Scenarios**:

1. **Given** the backend merges a live update, **When** it broadcasts the update, **Then** it publishes the complete merged match snapshot to a per-match snapshot topic.
2. **Given** existing clients still use field topics, **When** the snapshot topic is introduced, **Then** legacy topics continue to be published.
3. **Given** the live hero receives either a snapshot or a legacy field update, **Then** it merges the payload without erasing other known fields.

### User Story 3 - Operators Can Prove Fast-Lane Coverage (Priority: P1)

As an operator, I want health output to show whether the fast lane covers all discovered live matches so silent production configuration regressions are immediately visible.

**Acceptance Scenarios**:

1. **Given** persistent pages are disabled, **When** health is read, **Then** fast-update status reports disabled and zero coverage.
2. **Given** live matches are discovered and persistent pages are attached, **When** health is read, **Then** it reports live count, covered count, and coverage ratio.
3. **Given** the number of live matches exceeds the configured page capacity, **When** health is read, **Then** the capacity and incomplete coverage are visible.

## Requirements

- **FR-001**: Production scraper defaults MUST enable persistent pages and fast updates.
- **FR-002**: Existing full-scrape and lifecycle reconciliation paths MUST remain active as slower correctness fallbacks.
- **FR-003**: Scraper health MUST expose fast-lane enabled state, live-match count, covered-match count, capacity, and coverage ratio.
- **FR-004**: The backend MUST publish a complete merged snapshot to `/topic/cricket.match.{matchId}.snapshot`.
- **FR-005**: The backend MUST continue publishing existing per-field websocket topics.
- **FR-006**: Viewer-facing websocket broadcasts MUST occur before slower relational persistence.
- **FR-007**: The live hero MUST subscribe to the snapshot topic and retain legacy topic compatibility.
- **FR-008**: Snapshot and field payloads MUST merge without clearing non-updated live values.
- **FR-009**: Resource safety controls, including persistent-page maximum count and PID restart thresholds, MUST remain in place.

## Success Criteria

- **SC-001**: Production configuration resolves both `ENABLE_FAST_UPDATES` and `ENABLE_PERSISTENT_PAGES` to `true` unless deliberately overridden.
- **SC-002**: Health output makes zero or partial fast-lane coverage detectable without inspecting container internals.
- **SC-003**: A merged backend update emits one complete snapshot and retains legacy field broadcasts.
- **SC-004**: Focused scraper, backend, and frontend tests pass.
- **SC-005**: The implementation preserves periodic full reconciliation and existing resource guardrails.
