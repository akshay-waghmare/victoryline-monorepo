# Feature Specification: Match Discovery and Crawl Graph

**Feature Branch**: `018-match-discovery-link-graph`  
**Created**: 2026-06-07  
**Status**: Draft  
**Input**: Roadmap phase from `docs/LIVE_MATCH_SEO_PHASE_ROADMAP.md` to strengthen crawlable match discovery before deeper page-type expansion.

## Current Evidence

- The repo already has canonical recovery work in `specs/015-long-tail-match-seo/` and live-page hardening work in `specs/016-live-match-page-seo-hardening/`.
- Match cards themselves render canonical `/cric-live/{slug}` URLs, but the discovery phase still needs unambiguous plain-link surfaces on home and `/matches`.
- The sitemap service currently includes canonical match URLs, but live-match sitemap entries do not yet use the live model's `lastStateUpdatedAt` freshness signal.
- The existing audit script checks match-page metadata but does not currently verify whether discovery surfaces expose crawlable `/cric-live/` links.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crawlers Can Reach Match Pages From Home And Matches (Priority: P1)

As a search crawler or a user landing on the homepage or `/matches`, I want plain crawlable links to live, upcoming, and recent match pages so important match URLs are discoverable without depending on component behavior or client-side navigation.

**Why this priority**: Canonical pages still underperform if discovery surfaces hide or dilute the link graph.

**Independent Test**: Fetch SSR HTML for home and `/matches` and verify both pages contain visible `<a href="/cric-live/{slug}">` style links for current match pages.

**Acceptance Scenarios**:

1. **Given** the homepage has tracked matches, **When** the SSR HTML is inspected, **Then** it includes a plain list of direct match links that point to canonical `/cric-live/{slug}` pages.
2. **Given** the `/matches` page has filtered match results, **When** the SSR HTML is inspected, **Then** it includes direct crawlable links to the currently surfaced match pages.
3. **Given** a match URL cannot be normalized to a canonical slug, **When** discovery links are rendered, **Then** that broken match does not emit a fake `/cric-live/` link.

---

### User Story 2 - Sitemap Freshness Uses Real Match Lifecycle Signals (Priority: P1)

As a search crawler consuming sitemap partitions, I want `lastmod` values to reflect real known match-update timestamps so recent match URLs get honest freshness hints.

**Why this priority**: The roadmap explicitly treats sitemap freshness as first-class crawl infrastructure, and the live model already stores a better timestamp than the sitemap layer is using.

**Independent Test**: Seed a live-match entry with `lastStateUpdatedAt` and verify the sitemap partition emits that ISO timestamp for the canonical match URL.

**Acceptance Scenarios**:

1. **Given** a live match entry has `lastStateUpdatedAt`, **When** the sitemap partition is generated, **Then** the canonical match URL uses that timestamp in `lastmod`.
2. **Given** a live match entry lacks `lastStateUpdatedAt` but has a scheduled start time, **When** the sitemap partition is generated, **Then** the service falls back to that known schedule timestamp instead of inventing a custom freshness signal.
3. **Given** a numeric or non-canonical match alias is encountered, **When** the sitemap partition is generated, **Then** the entry is excluded from sitemap output.

---

### User Story 3 - Discovery Audits Catch Missing Match Links Early (Priority: P2)

As a developer verifying SEO work, I want the repo audit flow to tell me if discovery pages stop exposing canonical match links so crawl regressions are caught before rollout.

**Why this priority**: Phase 1 should leave behind reusable proof, not only code changes.

**Independent Test**: Run the audit script against homepage, `/matches`, and sample match pages, and verify it reports the count of internal `/cric-live/` links.

**Acceptance Scenarios**:

1. **Given** the homepage HTML includes direct match links, **When** the audit script runs, **Then** it reports a positive internal match-link count and no discovery-link flag.
2. **Given** the `/matches` page HTML includes direct match links, **When** the audit script runs, **Then** it reports a positive internal match-link count and no discovery-link flag.
3. **Given** a match page is audited, **When** the script runs, **Then** match-page metadata checks continue to work alongside the new link-graph checks.

### Edge Cases

- Discovery blocks must tolerate live-only, upcoming-only, or completed-only datasets.
- Links must remain valid when match cards fall back from `matchUrl` to `externalMatchKey` or slug-like IDs.
- Discovery UI should stay concise enough for users while still exposing plain anchors in SSR HTML.
- Sitemap freshness must not invent fake "now" timestamps when the live model already has a better update signal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Home page MUST expose a visible plain-anchor match-link cluster for canonical `/cric-live/{slug}` URLs when tracked matches exist.
- **FR-002**: `/matches` MUST expose a visible plain-anchor match-link cluster for the currently surfaced canonical match pages.
- **FR-003**: Discovery surfaces MUST generate match hrefs from a shared normalization helper so home, matches, and match cards stay aligned.
- **FR-004**: Discovery surfaces MUST not emit broken `/cric-live/` URLs when no canonical slug can be derived.
- **FR-005**: Sitemap generation MUST use live-match `lastStateUpdatedAt` when available for canonical live-match URLs.
- **FR-006**: Sitemap generation MUST fall back to a known scheduled/start timestamp only when a fresher live-update timestamp is unavailable.
- **FR-007**: The audit script MUST report the number of internal canonical `/cric-live/` links found in audited HTML.
- **FR-008**: The audit script MUST flag homepage or `/matches` HTML that exposes zero canonical match links.
- **FR-009**: The phase MUST preserve the active public match URL family as `/cric-live/{slug}`.

### Key Entities

- **Canonical Match Link**: A plain anchor to `/cric-live/{slug}` derived from a real canonical slug.
- **Discovery Surface**: The homepage or `/matches` page where crawlers and users find match URLs.
- **Live Match Freshness Signal**: The backend `lastStateUpdatedAt` timestamp captured on live-match state changes.
- **Discovery Audit Result**: The script output showing internal match-link counts and missing-link flags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Home SSR HTML exposes at least one canonical `/cric-live/` link whenever tracked matches exist.
- **SC-002**: `/matches` SSR HTML exposes at least one canonical `/cric-live/` link whenever surfaced matches exist.
- **SC-003**: Sample sitemap partitions use live-match `lastStateUpdatedAt` when that timestamp exists.
- **SC-004**: The audit script reports internal canonical match-link counts for home and `/matches`.
- **SC-005**: Canonical, H1, OG-image, and JSON-LD audit checks for match pages remain intact after the discovery-audit extension.
