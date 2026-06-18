# Feature Specification: Match State Aware Tabs

**Feature Branch**: `026-match-state-aware-tabs`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: User description: "the match is now having a bad UX as our at a glance and all that is getting mixed up and what we have added on page can be put in match details tab below hero and when we navigate the live match the live match tab with commentary can come and when we navigate upcoming the match detail tab can be shown and for results the scorecard tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Match Opens On The Right Tab For Its Lifecycle State (Priority: P1)

As a user opening a match from a hub or listing, I want the first visible tab to match the match state so I land on the most useful surface immediately.

**Why this priority**: The current base route always opens the same tab, which is wrong for upcoming fixtures and completed results.

**Independent Test**: Open one live, one upcoming, and one completed `/cric-live/{slug}` page and verify the initial tab defaults to Commentary, Match Details, and Scorecard respectively.

**Acceptance Scenarios**:

1. **Given** a live or live-like match, **When** the base match page opens, **Then** the Commentary tab is selected by default.
2. **Given** an upcoming match, **When** the base match page opens, **Then** the Match Details tab is selected by default.
3. **Given** a completed or abandoned match, **When** the base match page opens, **Then** the Scorecard tab is selected by default.

---

### User Story 2 - Prematch Detail Content Moves Out Of The Top Of The Page (Priority: P1)

As a user opening a match page, I want the heavy detail copy to sit under the hero inside Match Details so the top of the page feels clean and match-first.

**Why this priority**: The recently added SEO-oriented content is useful, but it currently competes with the hero and makes the initial view feel mixed up.

**Independent Test**: Open an upcoming match page and verify the hero remains the main first-view surface while the detail grid and FAQ content appear inside the Match Details tab below it.

**Acceptance Scenarios**:

1. **Given** the page loads with match SEO/detail content available, **When** the user first lands above the fold, **Then** the hero remains the dominant surface and the detail-heavy cards are not rendered above it.
2. **Given** the Match Details tab is opened, **When** the detail content renders, **Then** the moved sections still include match facts, toss, playing XI, scorecard/result, venue, and FAQ support.
3. **Given** the moved content is server-rendered, **When** raw HTML is inspected, **Then** the detail sections still exist in the page markup for upcoming-match completeness.

---

### User Story 3 - At A Glance Context Matches The Current Match State (Priority: P1)

As a user reading the page hero and details, I want the supporting context to reflect whether the match is upcoming, live, or completed so signals do not feel mixed together.

**Why this priority**: Upcoming pages should not feel like broken live pages, and result pages should not foreground pre-match placeholders.

**Independent Test**: Compare one upcoming, one live, and one completed match page and verify the supporting labels and summaries emphasize the right state-specific context.

**Acceptance Scenarios**:

1. **Given** an upcoming match, **When** the Match Details surface renders, **Then** the leading summary should emphasize start time, venue, toss status, lineup status, and fixture context.
2. **Given** a live match, **When** the page renders, **Then** commentary remains the primary default surface and detail copy should support rather than compete with the live state.
3. **Given** a completed match, **When** the page renders, **Then** result and scorecard context should be easier to reach than commentary.

### Edge Cases

- If route state already includes a match hint, the initial tab decision should use that fast hint first and then stabilize once fetched match data arrives.
- If a child route such as `/scorecard` or `/live` is requested, the explicit route intent should win over lifecycle defaults.
- If scorecard data is not loaded yet for a completed match, the Scorecard tab should still open first and show an honest loading or unavailable state.
- If upcoming pages lack toss or playing XI confirmation, Match Details should show useful placeholders instead of mixing live-only phrasing into the summary.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The base canonical `/cric-live/{slug}` route MUST choose its initial tab from the resolved match lifecycle state.
- **FR-002**: Live-like matches (`LIVE`, `INNINGS_BREAK`, `RAIN_DELAY`) MUST default to the Commentary tab.
- **FR-003**: Upcoming matches MUST default to the Match Details tab.
- **FR-004**: Completed and abandoned matches MUST default to the Scorecard tab.
- **FR-005**: Explicit child-route intent such as commentary or scorecard MUST override lifecycle defaults when present.
- **FR-006**: The detail-heavy SEO/prematch content currently above the hero MUST move into the Match Details tab below the hero-level surface.
- **FR-007**: The moved detail content MUST remain server-rendered and MUST keep the same factual sections unless a section is intentionally renamed for clearer UX.
- **FR-008**: The Match Details surface MUST present cleaner state-aware summary language for upcoming, live, and completed matches.
- **FR-009**: The work MUST not change canonical policy, route family, or Spec 023 behavior.

### Key Entities

- **Lifecycle Default Tab**: The first selected tab derived from live, upcoming, or completed match state.
- **Explicit Route Intent**: A requested child surface like commentary or scorecard that should override lifecycle defaults.
- **Match Details Surface**: The tab content below the hero that includes factual match context, prematch completeness copy, and supporting sections.
- **Hero First View**: The top-of-page experience that should stay cleaner and less crowded after the moved content leaves the pre-hero area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Live, upcoming, and completed matches each open on the correct default tab from the base `/cric-live/{slug}` route.
- **SC-002**: The moved detail sections no longer appear above the hero in the initial page flow.
- **SC-003**: Match Details keeps the prematch completeness content available below the hero and inside SSR HTML.
- **SC-004**: Focused frontend tests prove the tab selection logic and detail-surface placement behavior.
