# Feature Specification: Match Details UI/UX Redesign

**Feature Branch**: `002-match-details-ux`  
**Created**: 2025-11-07  
**Status**: Draft  
**Input**: "Update the UI/UX of the individual match page (opened from home). Tech-agnostic redesign to improve clarity, engagement, accessibility, performance, and real-time experience. Must align with Constitution v1.1.0 (UI/UX Standards)."

## Overview

The current individual match page provides limited live context, inconsistent layout, and lacks structured access to commentary, score progression, lineups, and contextual metadata (venue, toss, officials). This feature introduces a structured, mobile-first, accessible, performance-conscious redesign that presents all critical match information in progressive layers—quick summary, detailed score context, narrative (commentary), statistical detail (scorecard), personnel (lineups), and environmental context (venue, toss, match status).

## Scope (Phase 002)
In scope:
1. Live summary header (teams, score, status, run rates, recent balls)
2. Tabbed or segmented navigation for: Summary, Commentary, Scorecard, Lineups, Match Info
3. Commentary stream (paginated / incremental load) with clear event hierarchy (wickets, boundaries, milestones)
4. Scorecard structure (innings, batting, bowling, extras, fall of wickets) for completed or in-progress innings
5. Team lineups presentation with role indication (Batsman / Bowler / All-Rounder / Keeper)
6. Match info: venue, series, format, toss, officials, start time, data freshness indicators
7. Data freshness indicators (timestamp + staleness tier)
8. Accessibility foundations (keyboard navigation, focus order, ARIA landmarks)
9. Mobile-first layout (single column collapsing into multi-panel on larger screens)

Out of scope (deferred):
- Video/live streaming integration
- Predictive analytics / win probability models
- Player profile deep links (unless already existing) – treat as placeholder
- Advanced charts (worm, Manhattan) – future analytics phase
- Social/sharing interactions beyond simple share trigger

## Non-Goals
1. Implementing backend data acquisition changes
2. Replacing existing data pipelines or scraper logic
3. Introducing paid/premium segmentation

## Actors
| Actor | Motivation |
|-------|------------|
| Casual Viewer | Quick glance at score & status, minimal scrolling |
| Engaged Fan | Follows ball-by-ball narrative & momentum shifts |
| Analyst / Enthusiast | Needs structured statistics & wicket progression |
| Mobile User | Efficient, performant access under bandwidth constraints |
| Assistive Tech User | Requires semantic structure, focus order, screen-reader clarity |

## Primary Value Proposition
Deliver all essential match context in a single, structured, performant, accessible surface that reduces user bounce by enabling deeper exploration (narrative + stats) without friction.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Live Match Snapshot (Priority: P1)
As a casual viewer I want an immediate, compact snapshot (teams, current score, overs, wickets, run rates, match status, last balls) so I can assess the match situation in under 5 seconds.

**Why this priority**: Entry point for all user types; without instant clarity users abandon page.

**Independent Test**: Load match page with live data stub – verify snapshot renders fully (score, status, run rates, recent balls) without needing other tabs.

**Acceptance Scenarios**:
1. Given a live match with current over data When user opens the page Then snapshot shows batting team score (runs/wkts), overs, CRR, RRR (if chasing), last 6 ball outcomes.
2. Given a completed match When user opens the page Then snapshot shows final scores, result summary (winner + margin), removes run rate/required rate.
3. Given stale data (>120s since last update) When page loads Then snapshot displays a staleness warning badge.

---

### User Story 2 - Commentary Narrative (Priority: P2)
As an engaged fan I want ball-by-ball commentary with visual differentiation of key events so I can follow narrative without video.

**Why this priority**: Drives engagement & time-on-page; second most critical after snapshot.

**Independent Test**: Stub commentary feed API; load only commentary tab – user can scroll, load older entries, and identify wickets/boundaries quickly.

**Acceptance Scenarios**:
1. Given live commentary entries When new ball event arrives Then latest entry appears at top (or bottom depending ordering choice) without full page refresh.
2. Given a wicket event When displayed Then entry is visually distinguished (color/icon) and accessible (non-color reliance).
3. Given pagination triggers When user clicks "Load more" Then older commentary batch appends smoothly without layout shift.

---

### User Story 3 - Detailed Scorecard (Priority: P3)
As an analyst I want structured batting & bowling tables (with partnerships & fall of wickets) so I can evaluate progression and turning points.

**Why this priority**: Enables deeper analytical retention; essential for post-match value.

**Independent Test**: Provide scorecard JSON only – verify all batting rows, extras, fall-of-wickets appear with accessible table semantics.

**Acceptance Scenarios**:
1. Given an innings with completed batsmen When displayed Then each batsman row shows runs, balls, 4s, 6s, SR, dismissal method.
2. Given fall-of-wickets data When rendered Then sequence and score at each wicket displayed in order.
3. Given bowling figures When displayed Then economy calculation matches runs/overs.

### User Story 4 - Team Lineups & Roles (Priority: P4)
As a viewer I want to see ordered lineups with role indicators so I understand composition & tactical choices.

**Acceptance Scenarios**:
1. Given lineup data When rendered Then each player lists role (e.g., WK, AR, Batsman, Bowler) with legend.
2. Given current striker/non-striker and active bowler in live match When displayed Then their rows are visually highlighted (non-color reliant).

### User Story 5 - Match Context (Priority: P5)
As a viewer I want venue, toss, officials, format, series context so I can situate importance of the match.

**Acceptance Scenarios**:
1. Given toss data When rendered Then displays winning team and decision.
2. Given venue metadata When rendered Then shows name + location + (optional capacity if available) without blocking other content.

### User Story 6 - Mobile Interaction (Priority: P6)
As a mobile user I want collapsible sections & sticky minimal header so I can navigate efficiently on small screens.

**Acceptance Scenarios**:
1. Given viewport <768px When page loads Then content uses single-column with collapsible panels.
2. Given user scrolls past snapshot When scrolled Then condensed sticky header (teams + score + status) appears.

### User Story 7 - Accessibility & Reduced Motion (Priority: P7)
As an assistive technology user I require semantic landmarks, keyboard operability, readable contrast, and reduced animation mode compliance.

**Acceptance Scenarios**:
1. Given user navigates via keyboard When tabbing Then focus order matches visual/logical sequence.
2. Given prefers-reduced-motion media query When enabled Then non-essential animations disabled (commentary fade/slide becomes instant).

### User Story 8 - Data Freshness Feedback (Priority: P8)
As a user I want clarity on when data last updated so I can trust live state.

**Acceptance Scenarios**:
1. Given data timestamp updated <30s ago When displayed Then subtle "Live" indicator only.
2. Given data timestamp 30–120s old When displayed Then warning badge ("Updating…") appears.
3. Given data timestamp >120s old When displayed Then error-staleness banner appears with retry action.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Match switches from live to completed mid-view (ensure status & snapshot restructure without full reload)
- Data feed drops (missing commentary segment) – show placeholder + retry CTA
- Rain delay / interruption (status changes to "Delayed" with messaging)
- Super Over scenario (additional innings grouping logical display)
- Abandoned match (show reason, suppress unnecessary tabs like detailed scorecard partials)
- Missing player role metadata – fallback to generic label
- Commentary overload (hundreds of entries) – ensure virtual scroll / pagination prevents performance degradation

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Provide live snapshot block with teams, score, overs, wickets, run rates, recent balls.
- **FR-002**: Refresh snapshot & commentary at defined interval (≤5s live) with graceful staleness indicators.
- **FR-003**: Allow user switching between tabs (Summary, Commentary, Scorecard, Lineups, Info) without page reload.
- **FR-004**: Commentary view supports incremental loading (pagination or infinite scroll trigger).
- **FR-005**: Scorecard view renders innings list (1..N) each with batting/bowling tables & fall-of-wickets order.
- **FR-006**: Lineups view shows ordered squads with role indicators & highlights active participants (live).
- **FR-007**: Match info view presents venue, toss result, format, series, officials, start time, last updated timestamp.
- **FR-008**: Provide accessible keyboard navigation across interactive elements (tabs, pagination, expanders).
- **FR-009**: Support reduced-motion preference (disable non-essential transitions).
- **FR-010**: Provide staleness tiers: <30s Normal, 30–120s Warning, >120s Error.
- **FR-011**: Show error fallback & retry actions when commentary or score fetch fails.
- **FR-012**: Persist user-selected tab across soft navigation (optional enhancement).
- **FR-013**: Sticky condensed header activates after vertical scroll threshold.

*Clarifications Needed (marking early):*
- **FR-014**: Data retention for historical commentary (NEEDS CLARIFICATION: limit or full history?)
- **FR-015**: Win probability indicator (NEEDS CLARIFICATION: out-of-scope for Phase 002?)

### Non-Functional Requirements
- **NFR-001**: First meaningful paint <1500ms on 3G Fast.
- **NFR-002**: Time to interactive <3500ms mobile.
- **NFR-003**: Lighthouse Accessibility score ≥90.
- **NFR-004**: CPU frame budget maintained (no long tasks >50ms during live updates).
- **NFR-005**: Memory overhead for commentary list stable (<50MB at 1000 entries with virtualization).
- **NFR-006**: All text adheres to contrast 4.5:1 (normal), 3:1 (UI non-text).
- **NFR-007**: Keyboard navigation completes primary flows without trap.

### Key Entities
- **Match**: Logical container (id, format, status, series, timestamps).
- **Innings**: Sequence representing batting side performance (order, runs, wickets, overs, fall-of-wickets array).
- **CommentaryEntry**: Atomic narrative event (ball reference, batsman, bowler, outcome, highlight flags).
- **Player**: Participant with role, name, current state (active/inactive, striker/bowler).
- **ScoreSnapshot**: Derived aggregate (current run rate, required run rate, recent balls array, chasing context).
- **Venue**: Location metadata (name, city, country, optional capacity).
- **Officials**: Umpires/referee set for context.

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Snapshot visibility time: user identifies batting team score & match status in ≤5 seconds (usability test ≥90% success).
- **SC-002**: Commentary latency: new ball events appear within ≤5s of backend timestamp (95th percentile).
- **SC-003**: Accessibility: axe-core audit returns 0 critical violations.
- **SC-004**: Performance: Lighthouse mobile performance ≥90, accessibility ≥90, best practices ≥90.
- **SC-005**: Engagement: Average time-on-page for match details increases ≥50% vs baseline (analytics comparison post-release).
- **SC-006**: Bounce rate: Decrease by ≥20% for match details entry from homepage.
- **SC-007**: Error resilience: Recovery workflow (retry) resolves transient fetch errors ≥80% of attempts within 2 retries.
- **SC-008**: Staleness clarity: ≥85% of surveyed users can correctly interpret staleness tiers based on visual indicators.

## Success Validation Strategy
1. Instrument analytics for time-on-page, bounce, and tab interaction frequency.
2. Log commentary update latency metrics client-side compared to server event timestamp.
3. Run scheduled Lighthouse CI on representative live & completed match scenarios.
4. Conduct structured accessibility audit (keyboard traversal script + screen reader smoke test).
5. Run usability test with 5 users focusing on snapshot comprehension & staleness interpretation.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| High commentary volume | Performance degradation | Virtual scroll & pagination |
| Scraper outages | Stale/inaccurate display | Staleness tiers + fallback messaging |
| Mobile bandwidth constraints | Slow load times | Progressive loading & deferred tabs |
| Accessibility regression | Exclusion of users | Component checklist & automated axe scan CI |
| Layout thrash during updates | Janky experience | Minimize DOM mutations; update snapshot diffs only |

## Open Questions
1. Should ordering of commentary be latest-first or chronological? (Decision needed for UX consistency.)
2. Are partnerships required in Phase 002 or deferred? (Scorecard complexity.)
3. Provide optional compact mode for desktop? (User preference setting.)
4. Include weather data if available? (Source reliability.)

## Out-of-Scope Confirmations
- Predictive metrics (win probability) – future analytics feature.
- Advanced interactive charts – separate visualization phase.
- Player deep-profile expansions – dependent on player data readiness.

## Constitution Compliance Summary
- Real-Time Data Accuracy: Staleness tiers + snapshot refresh ≤5s.
- REST API Standards: Assumes existing API alignment (no change required here).
- Testing Requirements: Unit, integration (data fetch), accessibility & performance gating planned.
- Performance Standards: Targets defined (FMP, TTI, bundle constraints, FPS stable updates).
- Frontend UI/UX Standards: Mobile-first, CSS custom properties, a11y compliance, reduced motion support.

## Version
Spec Draft v0.1 (2025-11-07)

---
*End of specification.*
