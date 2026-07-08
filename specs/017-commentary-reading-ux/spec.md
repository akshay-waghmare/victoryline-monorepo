# Feature Specification: Commentary Reading UX

**Feature Branch**: `017-commentary-reading-ux`  
**Created**: 2026-06-03  
**Status**: Draft  
**Input**: User description: "I have made some changes to the commentary, rate the UI of commentary out of 10 honestly and improve till it is 8 / 10 and start the local stack so i can view the changes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Match Follower Can Read The Latest Ball Instantly (Priority: P1)

As a user opening a live match, I want the latest commentary to be easy to scan so I can understand the match situation without decoding visual noise.

**Why this priority**: Commentary is a high-frequency reading surface. If the feed feels busy, the page looks polished but still works against the user.

**Independent Test**: Open a live match page locally and verify the latest commentary entries can be read comfortably at normal zoom without the badges or state colors competing with the sentence text.

**Acceptance Scenarios**:

1. **Given** a normal ball commentary entry, **When** the row appears in the feed, **Then** the commentary sentence remains the dominant visual element.
2. **Given** a wicket, boundary, or six entry, **When** it appears in the feed, **Then** the state is noticeable without obscuring readability.
3. **Given** an entry has both over/ball position and run outcome metadata, **When** the row is rendered, **Then** those cues remain secondary to the actual text.

---

### User Story 2 - The Feed Explains Its Structure Without Extra Thinking (Priority: P1)

As a user checking the commentary stream, I want the feed to make its reading order and grouping obvious so I can move through overs naturally.

**Why this priority**: The current pass adds more style, but the grouping and hierarchy still ask the user to interpret the UI instead of simply following it.

**Independent Test**: Open the commentary section on desktop and mobile widths and confirm users can identify the header, latest-first flow, and over-summary transitions in a few seconds.

**Acceptance Scenarios**:

1. **Given** the feed has over summary entries, **When** they render between ball entries, **Then** they read as separators rather than oversized cards.
2. **Given** the feed is live, **When** the user lands in the section, **Then** the section header communicates the surface is active without relying on flashy motion.
3. **Given** the feed is long, **When** the user scrolls, **Then** the sticky header and list density continue to support orientation.

---

### User Story 3 - Repeated Match Checking Feels Calm And Fast (Priority: P2)

As a returning user refreshing live matches often, I want commentary interactions to feel smooth and lightweight so the page stays usable across repeated visits.

**Why this priority**: Commentary is revisited often, so decorative motion and heavy surfaces become tiring quickly.

**Independent Test**: Revisit the commentary section multiple times on a live match and confirm the UI feels steady, quick, and readable with reduced distraction.

**Acceptance Scenarios**:

1. **Given** new entries appear in the feed, **When** they are inserted, **Then** motion is brief and does not make the list feel unstable.
2. **Given** the user has reduced-motion preferences, **When** the feed updates, **Then** the interface remains fully understandable with minimal animation.

### Edge Cases

- Very short commentary text and very long commentary text must both wrap cleanly without badge collisions.
- Entries without `overBall` or `runs` metadata must still look deliberate and aligned.
- Over summaries must remain readable even when the over number or summary text is terse.
- Live and completed matches must share the same reading structure without false urgency in completed states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The commentary section MUST preserve existing live data sources, entry ordering, and event classification behavior.
- **FR-002**: The commentary sentence MUST remain the primary visual focus for standard ball entries.
- **FR-003**: The UI MUST differentiate wickets, boundaries, sixes, and over summaries without relying on heavy full-row treatments for every state.
- **FR-004**: Over summaries MUST read as structural separators instead of oversized feature cards.
- **FR-005**: The section header MUST communicate feed purpose and active/live state with restrained visual weight.
- **FR-006**: The list MUST remain comfortable to read at normal desktop and mobile zoom levels with improved typography, spacing, and badge sizing.
- **FR-007**: Motion MUST remain brief, optional, and reduced-motion compatible.
- **FR-008**: The work MUST stay scoped to the match-page commentary surface and must not change backend, scraper, or route behavior.

### Key Entities

- **Commentary Feed Surface**: The list container, sticky header, and row treatments that present live match commentary.
- **Commentary Event Row**: A ball-by-ball entry with optional over/ball metadata and run outcome.
- **Commentary State Accent**: The restrained visual treatment that differentiates wickets, boundaries, sixes, and neutral balls.
- **Over Summary Separator**: The compact row that organizes the feed between groups of deliveries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The latest commentary can be read comfortably with the sentence text remaining visually dominant.
- **SC-002**: The feed structure is understandable within a few seconds on desktop and mobile widths.
- **SC-003**: The updated commentary surface builds successfully in the existing Angular frontend and renders in the local Docker stack.
- **SC-004**: The commentary section reaches an honest qualitative rating of at least 8/10 for readability and usability within the current match-page layout.
