# Feature Specification: Homepage Scoreboard First UX

**Feature Branch**: `027-homepage-scoreboard-first-ux`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: User description: "home page is also having similar UI issue and the at a glance thing is gone , check crex or cricbuzz and see how it is structured ... check how seo and structured ld is done for them see espn also"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Homepage Opens With Match Context First (Priority: P1)

As a homepage visitor, I want the first screen to tell me what is live, what starts next, and what result just landed so I can orient quickly without reading SEO-heavy blocks first.

**Why this priority**: The current homepage places discovery-heavy sections too high, which makes the page feel mixed up and weakens the at-a-glance experience.

**Independent Test**: Open `/Home` locally and verify the hero, at-a-glance strip, and active match rail appear before the discovery link sections.

**Acceptance Scenarios**:

1. **Given** matches are available, **When** the homepage loads, **Then** the hero and first summary strip should foreground live, upcoming, and recent-result context before discovery-heavy sections.
2. **Given** a user wants to jump straight into live scores or the schedule, **When** the homepage loads, **Then** the primary hero actions should expose those paths immediately.
3. **Given** the match rail is visible, **When** the user scans the top of the page, **Then** the surface should feel scoreboard-first rather than metadata-first.

---

### User Story 2 - At A Glance Context Returns Without Losing Discovery (Priority: P1)

As a visitor, I want a compact at-a-glance summary that helps me pick between live, upcoming, and results while still keeping the crawlable discovery links in the page.

**Why this priority**: We still need SSR-visible discovery links for Spec 025, but they should support the UX instead of dominating it.

**Independent Test**: Verify the page still contains the live, upcoming, and recent direct links in HTML while also rendering a visible at-a-glance summary strip above them.

**Acceptance Scenarios**:

1. **Given** live matches exist, **When** the glance strip renders, **Then** it should summarize the current live state and point users toward the live tab.
2. **Given** upcoming matches exist, **When** the glance strip renders, **Then** it should summarize the next start time or fixture context instead of burying that information in secondary chips.
3. **Given** discovery links still exist for SEO, **When** the page is inspected visually, **Then** those links should appear below the core match rail instead of above it.

---

### User Story 3 - Competitor Lessons Improve Content Hierarchy, Not Copycat The Page (Priority: P2)

As a product team, we want to borrow the strong structural patterns from CREX, Cricbuzz, and ESPN Cricinfo without cloning their visual design or changing our canonical setup.

**Why this priority**: Competitors consistently lead with match state and keep SEO/context as supporting detail. We need that same clarity on Crickzen.

**Independent Test**: Compare the revised local homepage against the competitor audit and verify our homepage now leads with score state, quick actions, and match navigation.

**Acceptance Scenarios**:

1. **Given** CREX and Cricbuzz both lead with live/upcoming match structures, **When** our homepage loads, **Then** the top hierarchy should also prioritize scoreboard state before deep discovery sections.
2. **Given** ESPN keeps its match page state-led and concise, **When** our homepage and match page are reviewed together, **Then** the visible wording should stay user-facing rather than exposing internal SEO language.
3. **Given** this work is a UX pass, **When** implementation is complete, **Then** canonical policy and Spec 023 behavior must remain unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage MUST render a top-of-page hero that frames the page around live scores, upcoming starts, and recent results.
- **FR-002**: The homepage MUST render a compact at-a-glance summary strip above the main match rail when tracked matches are available.
- **FR-003**: Each at-a-glance card MUST map to one of the existing homepage match tabs: live, upcoming, or results.
- **FR-004**: The main match rail and tab bar MUST appear before the SEO/discovery-heavy link sections.
- **FR-005**: SSR discovery links for live, upcoming, and recent matches MUST remain in the page output.
- **FR-006**: Discovery card titles and labels MUST stay user-facing and must not expose internal implementation terms like raw HTML.
- **FR-007**: The work MUST not change canonical URLs, route families, or Spec 023 behavior.

### Key Entities

- **Homepage Hero**: The top-of-page framing content and quick actions for live scores and full schedule access.
- **At A Glance Strip**: Compact state cards summarizing live, upcoming, and recent-result buckets.
- **Main Match Rail**: The tabbed carousel of live, upcoming, or recent matches that remains the core homepage interaction surface.
- **Discovery Sections**: Crawlable direct links and hub links that remain in the page for discovery but sit lower in the visual hierarchy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Local `/Home` renders a scoreboard-first hierarchy: hero, at-a-glance strip, tab bar, carousel, then discovery sections.
- **SC-002**: At least one visible at-a-glance summary card appears whenever match data exists.
- **SC-003**: Discovery links for direct match pages and hub pages remain in rendered HTML after the layout cleanup.
- **SC-004**: Focused homepage specs cover the new at-a-glance summary behavior in addition to existing discovery ordering coverage.
