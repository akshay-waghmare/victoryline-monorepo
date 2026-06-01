# Feature Specification: Match Surface Polish

**Feature Branch**: `013-match-surface-polish`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "use speckit plan spec and task and do this" plus "using this enhance the home page , mathc page , and tabs in match page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Home Page Feels More Intentional At First Glance (Priority: P1)

As a cricket user landing on the home page, I want the live, upcoming, and result surfaces to feel more structured and premium so I can immediately understand what is happening without scanning a flat list.

**Why this priority**: The home page is the first impression and the fastest path into live match navigation.

**Independent Test**: Open `/Home` and confirm the header, match summary, tab rail, and match carousel present stronger hierarchy without changing the existing navigation flow.

**Acceptance Scenarios**:

1. **Given** the home page has live and upcoming data, **When** the page loads, **Then** the header communicates the current match state with clearer hierarchy and count summaries.
2. **Given** the user switches between Live, Upcoming, and Results, **When** the active tab changes, **Then** the active state is visually obvious and the carousel remains easy to scan on mobile and desktop.
3. **Given** the user wants to jump deeper, **When** they use the home page controls, **Then** the "All Matches" action still works exactly as before.

---

### User Story 2 - Match Detail Page Reads Like A Designed Match Center (Priority: P1)

As a match viewer, I want the match detail page to feel like a coherent match center rather than a stack of sections so I can understand status, context, and the most important live information faster.

**Why this priority**: This is the highest-value user journey after clicking a match card.

**Independent Test**: Open any `/cric-live/{slug}` page and confirm the shell, overview surface, live/commentary area, and empty/loading states feel visually consistent and easier to parse.

**Acceptance Scenarios**:

1. **Given** match metadata is available, **When** the page renders, **Then** a compact overview surface exposes title, status, venue, and supporting context near the top of the page.
2. **Given** live commentary and odds are available, **When** the user lands on the main tab, **Then** the layout keeps commentary primary while the supporting sidebar remains readable.
3. **Given** some data is not yet available, **When** the user opens that section, **Then** empty and loading states still feel designed rather than placeholder text.

---

### User Story 3 - Match Tabs Feel Deliberate And Easier To Use (Priority: P1)

As a user navigating within the match page, I want the main tabs and scorecard innings tabs to feel more tactile and better labeled so switching sections is obvious and fast.

**Why this priority**: Tabs are the main information architecture inside the match detail page.

**Independent Test**: Open a match page, switch between Live Match, Match Info, Scorecard, and Lineups, then switch innings inside the scorecard and verify the active state and information density improve without breaking current behavior.

**Acceptance Scenarios**:

1. **Given** the main match tabs are visible, **When** the user scans or switches tabs, **Then** labels, icons, and active states clearly communicate where they are.
2. **Given** scorecard innings data exists, **When** the user views scorecard tabs, **Then** each innings tab exposes enough context to choose the right innings without opening each one blindly.
3. **Given** reduced-motion preferences are enabled, **When** the user switches tabs, **Then** the page remains readable without relying on elaborate animation.

---

### Edge Cases

- The enhanced home header must still render cleanly when only one of live, upcoming, or results has data.
- Match shell context must gracefully fall back when `matchInfo` is incomplete and only route/current-match hints are available.
- Long venue, series, and match names must wrap without overlapping tab controls or cards.
- Tab polish must not depend on hover-only affordances because mobile remains a primary target.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST keep the existing live/upcoming/results data flow and navigation behavior while improving hierarchy and visual polish.
- **FR-002**: The home page MUST surface match counts and active section context in the first viewport without hiding existing carousel functionality.
- **FR-003**: The match detail page MUST add a clearer top-level shell and overview treatment without removing live hero, commentary, scorecard, or lineups functionality.
- **FR-004**: The match detail page MUST preserve current fetch behavior for match info, scorecard, and lineups tabs.
- **FR-005**: The main match tabs MUST expose stronger active/hover/focus states and SHOULD use icon-assisted labels where appropriate.
- **FR-006**: The scorecard innings tabs MUST provide more context than a plain innings number while preserving current tab switching behavior.
- **FR-007**: Empty/loading states introduced by this feature MUST be visually integrated with the rest of the page.
- **FR-008**: Motion used for the enhanced surfaces MUST stay subtle, fast, and compatible with reduced-motion preferences.

### Key Entities

- **Home Match Summary Surface**: The header and tab rail area on `HomeComponent` that summarizes live, upcoming, and result counts.
- **Match Shell Overview**: The top context area on `CricketOddsComponent` that frames the match title, status, venue, and related metadata.
- **Primary Match Tabs**: The Angular Material tabs inside `cricket-odds.component.html` for Live Match, Match Info, Scorecard, and Lineups.
- **Scorecard Innings Tabs**: The custom tablist inside `cricket-odds/components/scorecard` used to switch innings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/Home` presents a stronger first-viewport hierarchy while keeping live match card navigation intact.
- **SC-002**: `/cric-live/{slug}` shows a clearer match shell with readable context above the tab content.
- **SC-003**: Main match tabs and scorecard innings tabs have distinct active/focus states and improved labels.
- **SC-004**: The frontend builds successfully after the UI changes.
- **SC-005**: The enhanced layouts remain usable on mobile-width and desktop-width viewports without overlapping text or broken controls.
