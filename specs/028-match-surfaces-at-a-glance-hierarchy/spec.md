# Feature Specification: Match Surfaces At A Glance Hierarchy

**Feature Branch**: `028-match-surfaces-at-a-glance-hierarchy`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: User description: "`/matches` has the same issue the homepage had. Check the individual page too. Do the same competitor analysis and solve the at-a-glance UX without fighting SEO."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Matches Page Leads With Match State, Not Discovery Blocks (Priority: P1)

As a user opening `/matches`, I want the page to tell me what is live, what is next, and what just finished before it shows SEO-heavy discovery sections.

**Why this priority**: The page currently places discovery cards above the actual list, which makes the list feel secondary even though it is the main product surface.

**Independent Test**: Open `/matches` and verify the summary layer, tab controls, and visible match cards appear before the discovery sections and direct-link cluster.

**Acceptance Scenarios**:

1. **Given** `/matches` has live or upcoming data, **When** the page loads, **Then** the first visible hierarchy should be hero, at-a-glance summaries, controls, and match cards.
2. **Given** SSR discovery links still exist for SEO, **When** the page is visually scanned, **Then** those sections should appear below the match list instead of above it.
3. **Given** the user needs a quick decision, **When** they look at the summary cards, **Then** each card should include a short state-specific description rather than only a label and count.

---

### User Story 2 - Match Details Starts With A Real At-A-Glance Layer (Priority: P1)

As a user opening an individual match page, I want the first details surface to clearly read as the at-a-glance layer and the SEO support content to feel secondary.

**Why this priority**: The page already has a good structured detail component, but the supporting SEO section still competes visually with it.

**Independent Test**: Open an upcoming match page and verify the `Match Details` tab first shows the snapshot-style details card, with the secondary SEO copy toned down below it.

**Acceptance Scenarios**:

1. **Given** the Match Details tab is open, **When** the page renders, **Then** the top card should explicitly frame itself as the at-a-glance surface.
2. **Given** the supporting SEO summary still needs to exist, **When** it renders, **Then** it should read as secondary detail rather than a second hero.
3. **Given** the user still needs full SEO coverage, **When** HTML is inspected, **Then** the supporting sections and links should remain in the page.

---

### User Story 3 - Competitor Lessons Influence Hierarchy Without Copying Route Strategy (Priority: P2)

As a product team, we want to match the best hierarchy lessons from CREX, Cricbuzz, and ESPN Cricinfo without changing Crickzen canonicals or route strategy.

**Why this priority**: Competitors consistently keep score state first and metadata second. We need that clarity while preserving our existing SEO implementation.

**Independent Test**: Compare local `/matches` and the individual match page against the competitor audit and verify Crickzen now leads with state, then supporting discovery.

**Acceptance Scenarios**:

1. **Given** CREX and Cricbuzz lead with state-driven rails and cards, **When** our list page loads, **Then** the match cards should visibly outrank discovery chips.
2. **Given** ESPN Cricinfo keeps the match surface compact and state-led, **When** our match details render, **Then** the at-a-glance card should remain the first reading layer.
3. **Given** this is a hierarchy pass, **When** implementation completes, **Then** canonical policy and Spec 023 behavior must stay unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `/matches` MUST render its summary and actual match list before SSR discovery sections.
- **FR-002**: `/matches` summary cards MUST include brief state-specific explanatory copy, not only counts.
- **FR-003**: `/matches` MUST keep direct crawlable match links in rendered HTML.
- **FR-004**: The individual `Match Details` surface MUST explicitly frame the top details card as the at-a-glance layer.
- **FR-005**: The supporting SEO summary and detail grid on the individual page MUST remain present but MUST be visually secondary to the at-a-glance card.
- **FR-006**: This work MUST not change canonical routes, slug policy, or Spec 023 behavior.

### Key Entities

- **Matches Summary Layer**: The top summary cards on `/matches` that help users choose live, upcoming, or results quickly.
- **Discovery Sections**: SSR-visible cards and link clusters that support crawling and deep linking.
- **Match At A Glance Layer**: The top details card in the individual match details tab.
- **Supporting SEO Layer**: The lower-priority detail summary and structured supporting blocks kept for completeness and SEO.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/matches` renders visible match content before discovery sections.
- **SC-002**: Each `/matches` summary card has human-readable supporting copy.
- **SC-003**: The individual match details surface visibly starts with an explicit at-a-glance framing.
- **SC-004**: Focused specs cover the updated summary behavior for `/matches` and the at-a-glance labeling for match details.
