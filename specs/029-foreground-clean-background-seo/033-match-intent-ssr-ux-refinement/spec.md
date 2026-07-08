# Feature Specification: Match Intent SSR UX Refinement

**Feature Branch**: `033-match-intent-ssr-ux-refinement`  
**Created**: 2026-06-26  
**Status**: Draft  
**Input**: User description: "Keep one canonical match page, restore UX, and make all commentary/scorecard/lineups copy explicitly match-specific in SSR. Also capture shorter versions of team names."

## Context

Phase 032 strengthened canonical match metadata, but it also exposed two follow-up needs:

1. Match-intent support copy still reads too generic in several places.
2. The stronger SEO layer must not harm the at-a-glance UX on the live match page.

This phase keeps the one-canonical-page strategy and strengthens the match-specific SSR signals inside the existing page structure. It does not split `/commentary`, `/scorecard`, or `/lineups` into self-canonical pages yet.

## User Scenarios & Testing

### User Story 1 - Canonical Match Copy Is Explicitly Fixture-Specific (Priority: P1)

As a search engine, I want the canonical match page to state exactly which match the commentary, scorecard, lineups, and details belong to so the page reads like a strong response to match-specific intent queries.

**Independent Test**: Inspect raw SSR HTML for one match page and verify commentary, scorecard, lineups, and details copy includes the exact fixture rather than generic phrases alone.

**Acceptance Scenarios**:

1. **Given** a canonical match page, **When** raw SSR HTML is inspected, **Then** the commentary support copy includes the match-specific team pair.
2. **Given** a canonical match page, **When** raw SSR HTML is inspected, **Then** the scorecard support copy includes the same match-specific team pair.
3. **Given** a canonical match page, **When** raw SSR HTML is inspected, **Then** the lineups support copy includes the same match-specific team pair.
4. **Given** a canonical match page, **When** raw SSR HTML is inspected, **Then** the match-details support copy still reads naturally and does not become keyword soup.

### User Story 2 - Short Team Names Are Captured Alongside Full Team Names (Priority: P1)

As a search engine, I want the canonical page to capture both full team names and their shorter forms so the page better matches queries written as abbreviations or codes.

**Independent Test**: Inspect the generated SEO model and raw SSR HTML to verify both the full team pair and short team pair appear in the strengthened metadata and support copy.

**Acceptance Scenarios**:

1. **Given** a match with reliable short team names, **When** metadata is generated, **Then** the title, H1, or description includes the short team form without replacing the full team names.
2. **Given** a match without explicit short team names in API payloads, **When** metadata is generated, **Then** the page derives a sensible short form from the team names.
3. **Given** a commentary or scorecard support section, **When** it renders, **Then** the section may use the short team pair where that improves clarity.

### User Story 3 - Stronger Intent Does Not Break The At-A-Glance UX (Priority: P1)

As a user, I want the live match view to remain clean and score-first even after the SEO-support content becomes more explicit.

**Independent Test**: Inspect the live-match first view and confirm the page still foregrounds the hero, score state, and tabs before secondary support content.

**Acceptance Scenarios**:

1. **Given** the canonical match page loads, **When** the first visual layer is inspected, **Then** the hero and primary match state remain ahead of heavier support content.
2. **Given** supporting match-intent copy is present, **When** the user scans the page, **Then** it appears in quieter secondary zones rather than replacing the at-a-glance layer.
3. **Given** commentary, scorecard, or lineup intros are strengthened, **When** the user opens those surfaces, **Then** the new copy feels contextual rather than intrusive.

### User Story 4 - Bot-Style Verification Proves Intent Capture (Priority: P2)

As the team, we want a crawler-style verification pass so we can see whether the final raw HTML actually contains the commentary, scorecard, and lineup intent we think we shipped.

**Independent Test**: Fetch raw HTML with normal and bot-like user agents and verify the expected phrases are present in the response body.

**Acceptance Scenarios**:

1. **Given** a sample canonical match URL, **When** it is fetched as a normal browser and as Googlebot-like user agents, **Then** the same match-intent phrases are present.
2. **Given** commentary, scorecard, and lineups support copy, **When** raw HTML is searched, **Then** it contains both full-name and short-name match references where intended.

## Edge Cases

- Short-name data may be missing from one source but present in another; the page should prefer explicit short names and fall back to derived abbreviations only when necessary.
- Some single-word team names should not become awkward three-letter guesses if a known cricket abbreviation exists.
- Franchise and domestic sides may need initial-based short forms such as `TSK`, `RCB`, or `MAR`.
- The stronger match-specific copy must remain honest when commentary, scorecard, or lineups are not yet available.
- This phase must not reopen self-canonical child-route rollout.

## Requirements

### Functional Requirements

- **FR-001**: `match-seo.service.ts` MUST carry both full team names and short team names in the match SEO view model.
- **FR-002**: Metadata generation MUST preserve readable full team names while also capturing short-name intent where available.
- **FR-003**: `cricket-odds.component.ts` MUST generate match-specific commentary, scorecard, lineup, and details copy instead of generic labels alone.
- **FR-004**: The match page template MUST use fixture-specific SSR copy for commentary, scorecard, and lineup support surfaces.
- **FR-005**: The page MUST keep heavy support content in secondary zones and MUST NOT reintroduce a top-layer UX regression.
- **FR-006**: Verification MUST include a raw-HTML, bot-style phrase check for at least one sample match page.

## Success Criteria

- **SC-001**: Raw SSR HTML contains fixture-specific commentary, scorecard, and lineup phrasing for the sampled match.
- **SC-002**: The sampled page contains both the full team pair and a short team pair in the intended strengthened SEO/support copy.
- **SC-003**: The first visual layer remains hero-first and tab-first instead of support-copy-first.
- **SC-004**: Bot-style raw HTML checks confirm the intended phrases appear for the sampled page.
