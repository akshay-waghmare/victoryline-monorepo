# Feature Specification: Match Page Title SEO Optimization

**Feature Branch**: `008-match-title-seo`  
**Created**: 2026-01-28  
**Status**: Draft  
**Input**: User description: "Deploy dynamic match page titles with exact team names + 'Live Score Ball by Ball' format for all ongoing matches + match-specific pages indexed in Google Search Console"

**Dependencies**: Builds on [003-seo-optimization](../003-seo-optimization/) (~70% of infrastructure already implemented)  
**Gap Analysis**: See [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md) for detailed implementation status

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cricket Fan Discovers Live Match via Search (Priority: P1)

A cricket fan searches for a specific ongoing match (e.g., "Bangladesh vs Afghanistan live score January 2026") on Google and discovers the app's match page with clear, descriptive title showing exact team names.

**Why this priority**: This is the primary user acquisition channel for long-tail search traffic. Without discoverable match pages, the app has zero organic distribution.

**Independent Test**: Can be fully tested by performing a Google search for specific match names after indexing completes, and verifies that match pages appear in search results with correct titles.

**Acceptance Scenarios**:

1. **Given** a live match between Bangladesh and Afghanistan is ongoing, **When** a user searches "Bangladesh vs Afghanistan live score" on Google, **Then** the app's match page appears in search results with title "Bangladesh vs Afghanistan Live Score Ball by Ball"
2. **Given** a user clicks on the match page from Google search results, **When** the page loads, **Then** the browser tab/window shows the same descriptive title matching the search result
3. **Given** multiple ongoing matches exist simultaneously, **When** a user searches for any specific match by team names, **Then** that specific match's page appears with the correct team names in the title

---

### User Story 2 - User Shares Match Page on Social Media (Priority: P2)

A user watching a live match wants to share the score with friends via social media or messaging apps, and the shared link displays with a clear, descriptive preview showing the exact team names.

**Why this priority**: Enables viral distribution through social sharing, with professional-looking link previews that encourage click-throughs.

**Independent Test**: Can be fully tested by sharing a match page URL on platforms like WhatsApp, Twitter, or Facebook, and verifying the preview shows the correct match title.

**Acceptance Scenarios**:

1. **Given** a user is viewing a live match page, **When** they share the URL on WhatsApp or Facebook, **Then** the link preview displays "Bangladesh vs Afghanistan Live Score Ball by Ball" as the title
2. **Given** a match is ongoing, **When** a user pastes the match page URL in any social media platform, **Then** the social media platform's link crawler retrieves the correct title from page metadata

---

### User Story 3 - Site Owner Monitors Search Performance (Priority: P3)

A site administrator wants to monitor which match pages are being discovered via Google Search and track click-through rates for different match titles.

**Why this priority**: Enables data-driven optimization of SEO strategy and validation that the feature is working as intended.

**Independent Test**: Can be fully tested by accessing Google Search Console after deployment and verifying that individual match pages are appearing with impression and click data.

**Acceptance Scenarios**:

1. **Given** match pages have been indexed for at least 48 hours, **When** an administrator views Google Search Console, **Then** they can see individual match page URLs with search query data showing team-name-specific searches
2. **Given** multiple matches have been indexed, **When** viewing Search Console performance reports, **Then** each match page appears as a separate URL with distinct click and impression metrics

---

### Edge Cases

- What happens when team names contain special characters (e.g., "Team A/B" or "XI vs XI")?
- How does the system handle matches with very long team names that might exceed SEO title length recommendations (60 characters)?
- How does the system handle title and description updates when match status changes from live to completed mid-crawl?
- How does the system prevent duplicate page titles if the same teams play multiple matches in a short time period (e.g., tournament series)?
- What happens when match data is temporarily unavailable but the page is being crawled by Google?
- How does the system handle matches accessible via multiple URL patterns (e.g., /match/123 vs /cric-live/ban-vs-afg)?
- What happens if social media platforms cache old "Live Score" titles for completed matches?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate page titles dynamically for each match page using the format: "{Team A} vs {Team B} Live Score Ball by Ball"
- **FR-002**: System MUST use the exact official team names as provided by the match data source (no abbreviations or modifications)
- **FR-003**: System MUST update the page title in real-time when viewing different match pages (title must change when navigating between matches)
- **FR-004**: System MUST include the dynamic title in HTML `<title>` tag for search engine visibility
- **FR-005**: System MUST include the dynamic title in Open Graph `og:title` meta tag for social media sharing
- **FR-006**: System MUST include the dynamic title in Twitter Card `twitter:title` meta tag for Twitter sharing
- **FR-007**: System MUST ensure each match page has a unique, indexable URL (e.g., `/match/{match-id}` or `/match/{team-a}-vs-{team-b}`)
- **FR-008**: System MUST generate and maintain an XML sitemap containing all active match page URLs
- **FR-009**: System MUST submit the sitemap to Google Search Console API for automated indexing
- **FR-010**: System MUST include crawlable content on match pages (not purely client-side rendered) so search engines can index the titles
- **FR-011**: System MUST handle team name special characters appropriately in page titles (escape or replace problematic characters)
- **FR-012**: System MUST truncate overly long team names in titles to stay within 60-character SEO recommendation while maintaining readability
- **FR-013**: System MUST generate a dynamic meta description optimized for CTR using the format: "{Team A} vs {Team B} live score, ball by ball commentary, latest runs, wickets, overs, and match updates"
- **FR-014**: System MUST update page title and metadata when match status changes:
  - Live matches: "{Team A} vs {Team B} Live Score Ball by Ball"
  - Completed matches: "{Team A} vs {Team B} Final Score | Full Scorecard"
  - Abandoned/cancelled matches: "{Team A} vs {Team B} Match Scorecard" (with appropriate status in description)
- **FR-015**: System MUST output a single canonical URL per match page using a self-referencing canonical tag to prevent duplicate content issues
- **FR-016**: System MUST render `<title>`, meta descriptions, Open Graph tags, and Twitter Card tags in the initial HTML response (server-side rendered or pre-rendered), not solely via client-side JavaScript

### Key Entities

- **Match Page**: Represents a unique URL for a specific cricket match, containing the match ID, team names, current score, and ball-by-ball commentary
- **Page Metadata**: SEO and social sharing metadata including title, description, Open Graph tags, and Twitter Card tags associated with each match page
- **Sitemap Entry**: XML record containing match page URL, last modified timestamp, and priority/frequency hints for search engine crawlers

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All ongoing match pages display titles following the exact format "{Team A} vs {Team B} Live Score Ball by Ball" within 30 seconds of match data becoming available
- **SC-002**: 100% of match pages have unique, indexable URLs that appear in the generated XML sitemap
- **SC-003**: XML sitemap is successfully submitted to Google Search Console and shows "Success" status within 24 hours of deployment
- **SC-004**: At least 30 unique match page URLs appear in Google Search Console's "Pages" report within 7 days of deployment, indicating successful indexing
- **SC-005**: When shared on social media platforms (WhatsApp, Facebook, Twitter), match page links display correct team-name-based titles in preview cards 95% of the time
- **SC-006**: Users searching for specific match names (e.g., "Bangladesh vs Afghanistan live score") can discover the app's match page in Google search results within 72 hours of match start time
- **SC-007**: Match page titles in browser tabs update immediately (under 1 second) when navigating between different match pages
- **SC-008**: Match pages receive impressions in Google Search Console within 24-72 hours of match start time, indicating successful crawling and indexing
- **SC-009**: Average click-through rate (CTR) for match-specific queries reaches at least 2% within 14 days of deployment, measured via Google Search Console
- **SC-010**: Zero duplicate URL errors reported in Google Search Console's Coverage report, confirming canonical implementation is working correctly

## Deployment Readiness *(mandatory)*

### Phase 1A: Immediate Ship (4-6 hours)
**Must complete before first deployment:**
- Dynamic title generation with team names (FR-001, FR-002)
- CTR-optimized meta descriptions (FR-013)
- Status-aware title variations (FR-014: live/completed/abandoned)

**Deployment Gate**: All items in [Go/No-Go Checklist](./IMPLEMENTATION_GAP_ANALYSIS.md#-gono-go-deployment-checklist) marked "Must-Have" must pass.

### Phase 1B: Automation (Week 1-2)
- Google Search Console API integration (FR-009)
- Scheduled sitemap submission

### Phase 2+: Polish & UX
- Client-side title updates (FR-003)
- Special character handling (FR-011)
- Title truncation (FR-012)

**Implementation Details**: See [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md) for code locations, effort estimates, and copy-paste examples.
