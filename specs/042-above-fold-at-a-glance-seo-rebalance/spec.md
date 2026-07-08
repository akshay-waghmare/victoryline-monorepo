# Feature Specification: Above Fold At A Glance SEO Rebalance

**Feature Branch**: `042-above-fold-at-a-glance-seo-rebalance`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User description: "all our seo changes here were interfereing with the above the fold at a glance concept which make UI and UX easier for user can we make a spec and plan to solve that"

## Context

Recent SEO and discovery work improved crawlability, internal links, fixture-specific copy, and SSR support content across the homepage, `/matches`, and canonical match pages. The recurring regression is not that the SEO work exists, but that too much of it competes with the first reading layer.

Earlier specs already identified slices of this problem:

- `027-homepage-scoreboard-first-ux` restored homepage score-first hierarchy.
- `028-match-surfaces-at-a-glance-hierarchy` pushed `/matches` and match details back toward a state-first structure.
- `029-foreground-clean-background-seo` introduced the foreground-versus-background SEO model.
- `033-match-intent-ssr-ux-refinement` strengthened fixture-specific SEO while explicitly warning against first-view UX regression.

This spec consolidates those lessons into one operating rule:

- Above the fold belongs to user decision-making.
- SEO support must remain crawlable in SSR HTML.
- SEO support must not visually compete with the first score/state layer.

## Problem Statement

Crickzen match surfaces are carrying valid SEO payloads, but some support sections, discovery clusters, and keyword-strengthened copy have drifted too high in the visual hierarchy. This makes the first screen feel mixed up, increases scanning effort, and weakens the at-a-glance product promise.

The goal is not to remove SEO content. The goal is to separate:

- foreground decision UX for humans
- background discovery/support content for crawlers and deeper readers

## User Scenarios & Testing

### User Story 1 - Users Understand Match State Before They Read Support Content (Priority: P1)

As a user opening Crickzen, I want the first screen to tell me what is live, what is next, and where to tap next before I encounter SEO-heavy support content.

**Why this priority**: The top-of-page hierarchy is the product. If the first reading layer becomes cluttered, both UX and perceived quality drop immediately.

**Independent Test**: Open the homepage, `/matches`, and a sample `/cric-live/{slug}` page and verify the first visible layer is state-first, action-first, and clearly separated from deeper support blocks.

**Acceptance Scenarios**:

1. **Given** the homepage loads, **When** the user scans the first screen, **Then** hero, at-a-glance summaries, and primary match navigation appear before discovery-heavy support sections.
2. **Given** `/matches` loads, **When** the user scans the first screen, **Then** summary cards, filters/tabs, and real match cards appear before any support-link cluster.
3. **Given** a match page loads, **When** the user scans the first screen, **Then** the hero, score state, and at-a-glance tab content appear before deeper explanatory or SEO-support copy.

---

### User Story 2 - SEO Support Remains In SSR Without Owning The Viewport (Priority: P1)

As the product team, we want the page to keep crawlable links, structured support copy, and indexable SSR sections without letting them dominate above-the-fold layout.

**Why this priority**: Discovery wins are only useful if the product remains easy to parse for real users.

**Independent Test**: Inspect raw SSR HTML for each target surface and verify that support links and support copy still exist even after they are moved into quieter secondary containers or lower sections.

**Acceptance Scenarios**:

1. **Given** the homepage needs crawlable live and upcoming links, **When** raw HTML is inspected, **Then** those links remain present even if the visible UI moves them below the primary rail or into a quieter expandable block.
2. **Given** `/matches` needs discovery support, **When** raw HTML is inspected, **Then** direct match links and hub links remain present even if they no longer sit above the list.
3. **Given** the canonical match page needs fixture-specific support copy, **When** raw HTML is inspected, **Then** the copy remains present even if the visible UI reduces its prominence.

---

### User Story 3 - The Team Has Explicit Hierarchy Rules For Future SEO Work (Priority: P1)

As the team, we want explicit product and implementation rules so future SEO changes do not repeatedly reintroduce first-view clutter.

**Why this priority**: The current issue is recurring because the repo has individual fixes but no single guardrail spec defining what may and may not enter the first screen.

**Independent Test**: Review a future SEO-oriented UI change against this spec and confirm it can be accepted or rejected using the hierarchy rules alone.

**Acceptance Scenarios**:

1. **Given** a new support section is proposed, **When** it is evaluated, **Then** it must justify why it belongs above the fold rather than in a secondary zone.
2. **Given** a new SEO copy block is proposed, **When** it is evaluated, **Then** fixture-specific SSR strength alone is not enough to place it in the top visual layer.
3. **Given** the page already contains the needed crawlable HTML, **When** a second visible support block is proposed near the top, **Then** the default decision is to keep it lower or quieter.

## Requirements

### Functional Requirements

- **FR-001**: The homepage MUST keep its first viewport focused on live, upcoming, and recent match state before discovery-heavy support sections.
- **FR-002**: `/matches` MUST keep its first viewport focused on summaries, controls, and actual match cards before discovery-heavy support sections.
- **FR-003**: Canonical match pages MUST keep their first viewport focused on hero, score state, and at-a-glance tab content before supporting SEO copy blocks.
- **FR-004**: SEO-supporting link clusters and explanatory sections MUST remain available in SSR HTML on all target surfaces.
- **FR-005**: SEO-supporting link clusters and explanatory sections SHOULD be moved lower in the DOM reading order only when doing so does not weaken required crawlable discovery paths; otherwise they MUST be visually deemphasized through quieter containers.
- **FR-006**: Any support content that is not required for an immediate user decision MUST be treated as secondary content by default.
- **FR-007**: Secondary support content SHOULD prefer quieter patterns such as collapsed drawers, lower-priority cards, subdued headings, or post-primary sections.
- **FR-008**: New SEO copy added to visible UI MUST be fixture-specific, short, and non-duplicative if it appears near the top of a page.
- **FR-009**: This work MUST not change canonical routes, slug policy, structured data eligibility, or existing one-canonical-match-page strategy.
- **FR-010**: Future SEO work affecting match surfaces MUST pass an above-the-fold hierarchy review before rollout.

### Non-Functional Requirements

- **NFR-001**: Raw SSR HTML must continue exposing key discovery links and support copy after the UX cleanup.
- **NFR-002**: The first viewport should minimize competing headings, repeated summaries, and duplicated intent copy.
- **NFR-003**: The hierarchy should remain clear on both mobile and desktop, with mobile treated as the stricter constraint.
- **NFR-004**: The solution should prefer minimal structural changes over introducing parallel content systems.

### Key Entities

- **Primary Decision Layer**: The first visible score/state/navigation surface that helps a user choose what to watch or open next.
- **Secondary Support Layer**: Crawlable links, support copy, and SEO-oriented detail that should remain accessible without dominating the first view.
- **Hierarchy Review Gate**: A lightweight review step for SEO-related UI changes that checks placement, prominence, duplication, and SSR retention.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Homepage first-view hierarchy is hero, at-a-glance summary, primary match navigation, then discovery/support sections.
- **SC-002**: `/matches` first-view hierarchy is summary, controls, match cards, then discovery/support sections.
- **SC-003**: Canonical match-page first-view hierarchy is hero, score state, primary tab content, then support sections.
- **SC-004**: Raw SSR HTML still contains the required crawlable links and fixture-specific support copy on all target surfaces.
- **SC-005**: A future SEO change can be evaluated against a documented checklist before rollout.

## Out Of Scope

- Changing canonical route families or reintroducing multiple self-canonical child routes.
- Removing structured data, sitemap coverage, or existing discovery programs that are already working.
- Rewriting the broader visual design system unrelated to hierarchy and first-view clarity.

## Implementation Plan

### Phase 1 - Audit And Inventory

Goal: identify every visible SEO/support block currently competing with the first reading layer.

Work:

1. Audit homepage, `/matches`, and canonical match pages on mobile and desktop.
2. Classify each visible block as one of: primary decision layer, secondary support layer, or redundant.
3. Record for each block whether it is needed for UX, needed for SSR discovery, needed for intent reinforcement, or duplicative.

Exit criteria:

- A per-surface inventory exists showing what stays above the fold, what moves lower, and what becomes quieter.

### Phase 2 - Define Placement Rules

Goal: turn the audit into reusable rules, not one-off rearrangements.

Work:

1. Define which component types are allowed above the fold on each surface.
2. Define which component types must be secondary by default.
3. Define a duplication rule so the same match-intent text is not expressed in multiple top-layer cards.

Exit criteria:

- The team has a short hierarchy checklist that can block future regressions during implementation review.

### Phase 3 - Homepage Recovery

Goal: restore a clear scoreboard-first homepage without removing discovery support.

Work:

1. Keep hero, at-a-glance strip, and main rail as the first reading sequence.
2. Push discovery-heavy clusters below the rail or into quieter expandable containers.
3. Keep crawlable direct links and hub links in SSR HTML.

Exit criteria:

- Homepage top layer feels score-first on mobile and desktop.

### Phase 4 - `/matches` Recovery

Goal: make `/matches` feel like a match browser first and an SEO support surface second.

Work:

1. Keep summaries, controls, and live/upcoming/result cards above discovery sections.
2. Reduce heading noise and explanatory repetition around the list.
3. Preserve crawlable HTML links for discovery.

Exit criteria:

- A user can identify live, next, and recent matches without parsing support blocks first.

### Phase 5 - Canonical Match Page Recovery

Goal: keep the canonical page strong for match intent while restoring the at-a-glance feel.

Work:

1. Preserve hero, score state, tab bar, and top tab content as the primary layer.
2. Keep fixture-specific support copy below the primary layer or inside quieter secondary containers.
3. Remove or tone down any duplicate summary card that behaves like a second hero.

Exit criteria:

- The page remains match-intent strong in SSR while the visible first layer remains score-first.

### Phase 6 - Verification And Rollout Gate

Goal: prevent reintroducing the same problem on the next SEO pass.

Work:

1. Verify local SSR HTML still contains required links, copy, metadata, and structured data.
2. Run a viewport-based review on mobile and desktop screenshots or local pages.
3. Add a lightweight release checklist item for above-the-fold hierarchy on SEO-related UI changes.

Exit criteria:

- The rollout checklist includes both SEO proof and first-view UX proof.

## Verification Checklist

1. Homepage first screen shows score/state before discovery sections.
2. `/matches` first screen shows summaries and match cards before discovery sections.
3. Match page first screen shows hero/score/tabs before support copy.
4. Raw SSR HTML still contains the required direct match links and support copy.
5. Canonical, metadata, JSON-LD, and sitemap behavior remain unchanged.
6. Mobile review passes without support content crowding the first viewport.

## Risks And Mitigations

- **Risk**: Moving sections lower could accidentally reduce crawlable discovery visibility.
  **Mitigation**: Validate raw SSR HTML and internal links before and after the change.

- **Risk**: Designers or engineers may reintroduce visible SEO blocks because they improve perceived content depth.
  **Mitigation**: Enforce the hierarchy review gate and duplication rule.

- **Risk**: Match-specific support copy may still feel noisy even when technically secondary.
  **Mitigation**: Shorten visible copy near the top and reserve fuller text for deeper sections.

## Recommended Execution Order

1. Finalize the per-surface audit inventory.
2. Convert the inventory into a small hierarchy checklist.
3. Implement homepage recovery first.
4. Implement `/matches` recovery second.
5. Implement canonical match-page recovery third.
6. Run raw SSR and first-view verification before any rollout.
