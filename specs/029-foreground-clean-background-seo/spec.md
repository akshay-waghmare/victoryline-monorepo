# Feature Specification: Foreground Clean Background SEO

**Feature Branch**: `029-foreground-clean-background-seo`  
**Created**: 2026-06-19  
**Status**: Draft  
**Input**: User description: "crex and espn and cricbuzz are not crowding the page with so much info; theirs is cleaner yet in background they are handling seo" and "do this for homepage, matches page and the individual match page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Primary Match Story Stays Visible First (Priority: P1)

As a user landing on Crickzen surfaces, I want the first screen to stay focused on the match story rather than visible SEO support blocks.

**Why this priority**: The app still showed too many always-open support sections compared with cleaner competitors.

**Independent Test**: Open the homepage, `/matches`, and a sample `/cric-live/{slug}` page and verify the primary score/state surfaces appear before any large support-link or support-copy clusters.

**Acceptance Scenarios**:

1. **Given** the homepage loads, **When** the user first scans the page, **Then** the hero, glance strip, and match rail should be visible before deeper score-hub clusters.
2. **Given** `/matches` loads, **When** the user first scans the page, **Then** the summary cards, controls, and match list should appear before the discovery-link collections.
3. **Given** the individual match details tab loads, **When** the user first scans the page, **Then** the at-a-glance detail card should remain the main surface before deeper support sections.

---

### User Story 2 - SEO Support Moves Into Quieter Secondary Drawers (Priority: P1)

As a product team, we want the richer SEO support content to stay in SSR HTML while becoming less visually noisy.

**Why this priority**: We need the crawlable links and supporting content, but we do not need them fully expanded in the first reading layer.

**Independent Test**: Inspect the rendered HTML and confirm the deeper discovery/support sections still exist while the visible UI presents them inside secondary details drawers.

**Acceptance Scenarios**:

1. **Given** homepage discovery links are needed, **When** the page renders, **Then** they should remain in HTML but sit inside a quieter "More live score pages" drawer.
2. **Given** `/matches` discovery links are needed, **When** the page renders, **Then** they should remain in HTML but sit inside a quieter "More match pages" drawer.
3. **Given** the individual page needs supporting detail and FAQ content, **When** it renders, **Then** the deeper sections should remain in HTML but sit behind a quieter "More match detail" drawer.

---

### User Story 3 - Competitor Cleanliness Is Matched Without SEO Regression (Priority: P2)

As a product team, we want to achieve competitor-level cleanliness without removing canonicals, JSON-LD, or crawlable internal links.

**Why this priority**: CREX, Cricbuzz, and ESPN all keep their visible pages cleaner while still handling SEO in the background.

**Independent Test**: Compare the local surfaces against the competitor audit and verify that Crickzen now keeps SEO support secondary instead of primary.

**Acceptance Scenarios**:

1. **Given** competitors keep deeper support content quieter, **When** Crickzen renders, **Then** our first-view surfaces should feel similarly focused.
2. **Given** structured SEO support still matters, **When** the HTML is inspected, **Then** the support blocks and links should still be present.
3. **Given** this is a hierarchy cleanup only, **When** the work completes, **Then** canonical and route behavior must remain unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage MUST keep discovery-heavy sections present in HTML but visually secondary to the main match rail.
- **FR-002**: `/matches` MUST keep discovery-heavy sections present in HTML but visually secondary to the main list.
- **FR-003**: The individual match page MUST keep the deeper SEO detail grid present in HTML but visually secondary to the at-a-glance card.
- **FR-004**: Secondary support content SHOULD be presented using quieter expandable containers rather than always-open primary cards where appropriate.
- **FR-005**: This work MUST not change canonical URLs, route families, or Spec 023 behavior.

### Key Entities

- **Foreground Surface**: The first visible score/state layer intended for human reading.
- **Background SEO Surface**: Crawlable support links and supporting detail content that remain in HTML but are not foregrounded.
- **Secondary Drawer**: An expandable, lower-priority container for support content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Homepage, `/matches`, and individual match pages each foreground score/state before deeper support sections.
- **SC-002**: Support sections remain in rendered HTML on all three surfaces after the cleanup.
- **SC-003**: Local rebuild verification proves the served pages include the new drawer-based hierarchy.
