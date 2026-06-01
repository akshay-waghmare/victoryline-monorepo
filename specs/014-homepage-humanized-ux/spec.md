# Feature Specification: Homepage Humanized UX

**Feature Branch**: `014-homepage-humanized-ux`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "now we have made changes for SSR based , so can we make tha pp faster and smoother now , app UX can me made smoother check this design eng thing and locally lets make the home page better rate it honestly now and improve home page till it is 8.0 make it intuitive for humans and not just css based improvement make spec and plan and work"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A First-Time Visitor Knows Where To Go Immediately (Priority: P1)

As a user landing on the home page, I want the page to tell me the best next action right away so I can enter the most relevant match flow without scanning multiple sections first.

**Why this priority**: The current page looks respectable, but it still makes users interpret the layout instead of guiding them.

**Independent Test**: Open `/Home` and verify the first viewport clearly answers "what is live now?", "what is next?", and "where should I click?" within a few seconds.

**Acceptance Scenarios**:

1. **Given** there is at least one live match, **When** the home page loads, **Then** a primary live action appears above the fold and leads directly into that match.
2. **Given** there are no live matches but upcoming fixtures exist, **When** the home page loads, **Then** the page naturally pivots to the next scheduled match rather than feeling empty.
3. **Given** only recent results exist, **When** the home page loads, **Then** the page still provides a meaningful first action and status context.

---

### User Story 2 - Repeated Visits Feel Fast And Low-Friction (Priority: P1)

As a returning user checking scores repeatedly, I want the home page to feel lightweight and responsive so repeated visits stay smooth.

**Why this priority**: After SSR improvements, the next leverage is reducing avoidable UI friction and client-side churn on the most visited page.

**Independent Test**: Interact with the home tabs and carousel on desktop and mobile widths and confirm the page feels responsive without awkward control states or jumpy layout changes.

**Acceptance Scenarios**:

1. **Given** the user switches between live, upcoming, and results, **When** the active tab changes, **Then** the visible state updates quickly and the active context remains obvious.
2. **Given** the user scrolls the match carousel, **When** they reach either edge, **Then** navigation affordances reflect the real scroll state instead of relying on stale disabled states.
3. **Given** the user prefers reduced motion, **When** they use the page, **Then** motion remains subtle and never becomes a dependency for understanding the interface.

---

### User Story 3 - News Supports The Match Journey Instead Of Competing With It (Priority: P2)

As a cricket fan browsing beyond scores, I want the news area to feel editorially organized so I can move from live utility into deeper reading without visual clutter.

**Why this priority**: The news block is useful, but currently it feels appended rather than intentionally integrated into the home journey.

**Independent Test**: Scroll below the match section and verify the featured story and supporting headlines feel easier to scan and visually consistent with the rest of the page.

**Acceptance Scenarios**:

1. **Given** news is available, **When** the user reaches the news section, **Then** one featured story and supporting headlines read as a deliberate editorial surface.
2. **Given** fallback blog posts are shown, **When** the API news feed is unavailable, **Then** the fallback layout still looks intentional and aligned with the rest of the page.

### Edge Cases

- The primary hero action must degrade gracefully when live, upcoming, or result data is partially missing.
- Long team names, venue names, and series names must wrap cleanly without breaking the first viewport layout.
- Scroll controls must not fail or throw in SSR contexts where `document` is not safe to assume.
- Loading, error, and empty states must feel integrated rather than dropping back to generic centered text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST preserve existing data sources, refresh cadence, and navigation behavior for matches and news.
- **FR-002**: The first viewport MUST expose a clear primary action based on the best available match state: live first, then upcoming, then recent result.
- **FR-003**: The home page MUST offer quick secondary entry points for live, upcoming, and result exploration when those datasets exist.
- **FR-004**: The tabbed match carousel MUST keep its existing categories while improving state clarity and scroll affordance behavior.
- **FR-005**: The implementation SHOULD reduce avoidable template work and browser-only DOM reads during ordinary change detection.
- **FR-006**: Loading, error, and empty states MUST be visually consistent with the upgraded home-page shell.
- **FR-007**: The news section MUST remain present when data exists but SHOULD feel editorially structured instead of appended.
- **FR-008**: Motion and transitions MUST remain short, restrained, and compatible with reduced-motion preferences.

### Key Entities

- **Hero Decision Surface**: The first-viewport home-page area that frames the primary user action and current match landscape.
- **Primary Match Highlight**: The single best match card/action promoted in the hero based on live, upcoming, or recent-result priority.
- **Quick Match Picks**: Small secondary actions that let users jump into live, upcoming, or result states without scanning the carousel.
- **Match Carousel State Model**: The derived active-tab metadata and edge-aware scroll state used to keep the carousel responsive and understandable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/Home` makes the next best action obvious within the first viewport on desktop and mobile.
- **SC-002**: The home page feels smoother during tab switches and carousel use, with correct scroll affordance behavior.
- **SC-003**: The updated homepage remains SSR-safe and builds successfully in the existing Angular frontend.
- **SC-004**: The page reaches an honest qualitative rating of at least 8/10 for clarity and usability within the current product constraints.
