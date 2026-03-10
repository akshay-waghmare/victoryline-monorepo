# Feature Specification: Upcoming and Completed Matches

**Feature Branch**: `010-upcoming-completed-matches`  
**Created**: 2026-03-10  
**Status**: Draft  
**Input**: User description: "Create a worktree and define a SpecKit spec for upcoming and completed matches in the app, with analysis of CREX upcoming and completed schedule behavior."

---

## Overview

VictoryLine currently exposes live match cards and status-aware UI primitives, but it does not have a reliable data pipeline for upcoming fixtures or completed results. The existing matches list already includes `Upcoming` and `Completed` tabs, yet those tabs remain effectively empty because discovery, persistence, and API delivery are live-only.

This feature extends the schedule experience so users can browse upcoming fixtures before first ball and completed matches after the result, using CREX schedule patterns as inspiration while staying aligned with VictoryLine's existing architecture. The goal is not just cosmetic parity: it requires schedule discovery, explicit match-status persistence, new backend read models, and a frontend that surfaces countdowns, result summaries, and series/date context.

---

## Competitive and Product Intent

CREX's schedule experience consistently emphasizes:

- clear separation of live, upcoming, and completed states
- compact match cards with immediate status context
- relative time for upcoming fixtures
- concise result summaries for completed fixtures
- series/date grouping that makes browsing fast

VictoryLine should adopt those strengths without copying page structure verbatim. The app should feel native to VictoryLine while giving users the same confidence that they can find what is next and what just finished without leaving the platform.

---

## Scope

In scope:

1. Discover upcoming and completed matches from CREX schedule-oriented sources, not only live-match discovery.
2. Persist explicit match schedule metadata needed for not-started and finished states.
3. Expose backend APIs for schedule browsing by status and date ordering.
4. Populate the existing matches-list Upcoming and Completed tabs with real data.
5. Show upcoming match start time and relative countdown messaging.
6. Show completed match result summary and recent-finish context.
7. Preserve existing live-match behavior and ordering while expanding the schedule catalog.
8. Support match lifecycle transitions from upcoming -> live -> completed without duplicate records.

Out of scope:

- full historical archives beyond the schedule retention window defined by product policy
- deep completed-match editorial content such as POTM cards, quotes, or highlights
- large-scale redesign of the match-card visual system unrelated to status support
- new fantasy, rankings, or series hub experiences outside schedule browsing
- replacing CREX as the primary upstream schedule source

---

## Assumptions

- CREX schedule pages or related series pages expose enough metadata to identify teams, format, series, start time, and completion/result state.
- VictoryLine may retain completed schedule entries for a shorter window than permanent archives, as long as recent completed matches remain browseable.
- Existing match cards and filters can be extended instead of replaced.
- Backend and scraper changes are acceptable for this feature because current live-only data flow cannot satisfy the requirement.

---

## Actors

| Actor | Motivation |
|-------|------------|
| Cricket Fan | Wants to see what matches are coming next and what just finished without opening external apps. |
| Returning User | Wants a quick "what did I miss?" view using recent completed results. |
| Planner | Wants upcoming fixtures grouped in a way that supports deciding what to watch later. |
| Mobile User | Needs concise, scannable cards that separate live, upcoming, and completed states clearly. |
| Product/Admin Team | Needs a stable lifecycle model so match states are explicit, queryable, and testable. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Upcoming Fixtures (Priority: P1)

As a fan, I want to open the matches page and immediately browse upcoming fixtures so I know which matches are scheduled next and when they start.

**Why this priority**: Upcoming discovery is the core missing capability. Without it, the feature does not exist from a user point of view.

**Independent Test**: Seed or mock schedule data for not-started matches and confirm the Upcoming tab renders non-empty cards ordered by start time with local-time presentation and countdown messaging.

**Acceptance Scenarios**:

1. **Given** CREX schedule data contains future matches, **When** the user opens the matches page and selects `Upcoming`, **Then** the app shows those matches ordered by nearest start time first.
2. **Given** an upcoming match has a valid scheduled start timestamp, **When** the card renders, **Then** the app shows a human-readable local start time and relative countdown such as `Starting in 2h 15m` or `Tomorrow 7:00 PM`.
3. **Given** multiple upcoming matches belong to the same series or date block, **When** they render in the list, **Then** the grouping or contextual labeling makes that relationship clear without forcing the user to open each match.

---

### User Story 2 - Review Completed Results (Priority: P1)

As a returning user, I want to browse recently completed matches so I can quickly understand results without navigating into each scorecard.

**Why this priority**: Completed browsing is the second half of the requested feature and delivers immediate value for post-match visits.

**Independent Test**: Seed or mock completed matches and confirm the Completed tab shows final state cards with result summaries and sensible recency ordering.

**Acceptance Scenarios**:

1. **Given** a match has completed and a result summary is available, **When** the user selects `Completed`, **Then** the card shows the final result summary such as winner and margin.
2. **Given** multiple matches completed on the same day, **When** the Completed tab loads, **Then** the most recently completed results appear before older ones unless a user-selected sort changes that ordering.
3. **Given** a completed match was abandoned, tied, or no-result, **When** the card renders, **Then** the status copy reflects that final state instead of forcing a winner summary.

---

### User Story 3 - Trust the Match Lifecycle (Priority: P1)

As a user, I want a match to move cleanly between upcoming, live, and completed states so I never see duplicate or contradictory entries.

**Why this priority**: Lifecycle consistency is required for trust and for keeping the schedule usable as matches change state throughout the day.

**Independent Test**: Simulate a single match moving from future start time to live to completed and verify that only one canonical match record is shown in the appropriate tab at each stage.

**Acceptance Scenarios**:

1. **Given** an upcoming match has started, **When** the next schedule/live refresh arrives, **Then** the match is removed from `Upcoming` and appears in `Live` without a duplicate card.
2. **Given** a live match finishes, **When** the completion update is persisted, **Then** the match exits `Live` and appears in `Completed` with final summary data.
3. **Given** schedule and live sources disagree temporarily, **When** the system reconciles the record, **Then** the canonical state follows explicit status rules rather than fragile UI-only heuristics.

---

### User Story 4 - Scan Schedule Cards Efficiently (Priority: P2)

As a mobile or desktop user, I want upcoming and completed cards to be compact and easy to scan so I can decide whether to open a match in seconds.

**Why this priority**: The data pipeline matters, but the feature still fails if the new states are not legible or scannable.

**Independent Test**: Render mixed upcoming and completed fixtures on desktop and mobile and verify key metadata is visible without opening the details page.

**Acceptance Scenarios**:

1. **Given** an upcoming card renders, **When** the user scans it, **Then** they can see teams, format/series context, start time, and countdown in the card summary.
2. **Given** a completed card renders, **When** the user scans it, **Then** they can see teams, final result summary, and completion recency in the card summary.
3. **Given** schedule metadata is partially missing, **When** the card renders, **Then** the app shows a clear placeholder or fallback label instead of a broken layout.

---

### User Story 5 - Recover Gracefully from Schedule Gaps (Priority: P2)

As any user, I want clear feedback when schedule data is stale or partially unavailable so I can understand whether a tab is empty because no matches exist or because data has not refreshed.

**Why this priority**: Upcoming and completed tabs are especially confusing when empty; the UI must explain the state.

**Independent Test**: Force schedule fetch failures or stale timestamps and verify the matches page distinguishes between "no matches" and "data unavailable" states.

**Acceptance Scenarios**:

1. **Given** the schedule fetch succeeds but no upcoming matches exist, **When** the Upcoming tab renders, **Then** the UI shows a zero-state message explaining that no fixtures are scheduled in the current window.
2. **Given** the schedule fetch fails or exceeds the staleness threshold, **When** the user opens Upcoming or Completed, **Then** the UI shows a staleness/error state with last-updated context and retry affordance.
3. **Given** only partial schedule metadata is available, **When** the cards render, **Then** the UI preserves the available information and labels missing fields explicitly.

---

## Edge Cases

- Match rescheduled after initial discovery: countdown and ordering must update without creating a second record.
- Match discovered on both live and schedule sources: deduplicate by canonical match identity.
- Abandoned, no-result, tie, and super-over finals must map to explicit completed-state messaging.
- Timezone changes and locale formatting must not change actual chronological ordering.
- A match may briefly appear as scheduled while live score data is already available; lifecycle reconciliation must prefer the strongest state.
- Series pages may expose partial metadata for venue or format; the UI must degrade gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scraper or discovery layer MUST ingest upcoming and completed match candidates from CREX schedule-oriented sources in addition to existing live-match discovery.
- **FR-002**: The system MUST persist an explicit match status for schedule records rather than relying only on implicit `isDeleted` or string heuristics.
- **FR-003**: The system MUST persist schedule metadata needed to render upcoming and completed cards, including canonical match identifier, teams, series/context label, format, scheduled start time, and latest update timestamp.
- **FR-004**: The system MUST persist completed-state summary metadata sufficient to render a concise result card, including final status and result summary text when available.
- **FR-005**: The backend MUST expose status-aware match retrieval for upcoming and completed browsing, either through dedicated endpoints, a unified schedule endpoint with filters, or both, while staying aligned with VictoryLine REST conventions.
- **FR-006**: The frontend matches list MUST populate the existing `Upcoming` and `Completed` tabs from the new data source rather than deriving them from the live-only payload.
- **FR-007**: Upcoming matches MUST be ordered by nearest scheduled start time by default.
- **FR-008**: Completed matches MUST be ordered by most recent completion or most recent final update by default.
- **FR-009**: Upcoming match cards MUST display a localized absolute start time and a relative countdown or relative-day label when the scheduled time is known.
- **FR-010**: Completed match cards MUST display a localized result summary and a final-state label for outcomes such as completed, abandoned, tied, or no result.
- **FR-011**: A match MUST transition between upcoming, live, and completed without duplicate cards appearing across tabs for the same canonical match.
- **FR-012**: The system MUST retain enough schedule state to support browsing recently completed matches for the product-defined retention window after live coverage ends.
- **FR-013**: Empty, stale, and failed schedule states MUST be distinguishable in the UI so users know whether no matches exist or data is unavailable.
- **FR-014**: The feature MUST preserve current live-match behavior and must not regress live list rendering while schedule support is added.

### Non-Functional Requirements

- **NFR-001**: Schedule updates for upcoming and completed states should appear in the app within a product-acceptable lag from upstream discovery, with explicit monitoring of freshness.
- **NFR-002**: Matches page tab switches and schedule-card rendering must remain performant on mobile and desktop with realistic daily fixture volumes.
- **NFR-003**: Status-specific messaging and countdown/result labels must remain accessible and understandable without relying on color alone.
- **NFR-004**: Schedule data reconciliation must be deterministic and testable so lifecycle bugs can be reproduced with fixtures.

### Key Entities *(include if feature involves data)*

- **ScheduledMatch**: Canonical match record for browseable schedule states, including identity, teams, series, format, start time, explicit lifecycle status, and freshness metadata.
- **MatchResultSummary**: Final-state snapshot for a completed match, including outcome type, summary text, and final-update timestamp.
- **ScheduleSection**: Read-model grouping used by the frontend to present lists by status, date, or series context.
- **LifecycleState**: Explicit state machine that governs transitions such as `UPCOMING -> LIVE -> COMPLETED` and terminal alternatives like `ABANDONED` or `NO_RESULT`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When CREX exposes upcoming fixtures in the monitored schedule window, users can see those fixtures in VictoryLine's Upcoming tab without manual data seeding.
- **SC-002**: When monitored matches finish, users can see those results in VictoryLine's Completed tab with a readable result summary.
- **SC-003**: In lifecycle test scenarios, a single canonical match never appears simultaneously as both upcoming and live or both live and completed.
- **SC-004**: In usability validation, users can identify the next upcoming match and the latest completed result from the matches page in under 10 seconds.
- **SC-005**: Empty-state and failure-state testing confirms users can correctly distinguish "no matches scheduled" from "schedule data unavailable."

## Success Validation Strategy

1. Capture schedule fixtures from CREX examples and use them as test fixtures for upcoming and completed states.
2. Add integration coverage for explicit lifecycle transitions and API filtering by status.
3. Verify frontend card rendering for live, upcoming, completed, abandoned, and no-result cases.
4. Perform manual QA on local time formatting and countdown correctness across at least two timezones.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CREX schedule metadata is inconsistent across pages | Upcoming/completed cards may be incomplete | Define canonical required fields, store partial metadata safely, and surface placeholders explicitly |
| Current backend uses implicit deletion-based status | Status bugs or duplicate records | Introduce explicit lifecycle status and reconcile records centrally |
| Completed retention is too short | Users cannot browse recent results | Define minimum retention window for completed matches before archival |
| Countdown logic drifts or localizes poorly | Upcoming cards feel unreliable | Store UTC source timestamps, localize at render time, and add timezone-focused tests |

## Out-of-Scope Confirmations

- No commitment to a full archives product in this feature.
- No large redesign of live scorecards or commentary pages.
- No requirement to add editorial modules, videos, or points tables as part of schedule support.
