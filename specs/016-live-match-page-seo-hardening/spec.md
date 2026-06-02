# Feature Specification: Live Match Page SEO Hardening

**Feature Branch**: `016-live-match-page-seo-hardening`  
**Created**: 2026-06-03  
**Status**: Draft  
**Input**: User description: "Use spec and plan and make a concrete plan and implement the live match page audit issues step by step."

## Current Evidence

- On 2026-06-03, direct audits of live production match pages returned strong baseline scores (`93`, `94`, `93`) but exposed recurring template-level issues rather than page-specific breakage.
- Audited live URLs:
  - `https://www.crickzen.com/cric-live/aus-vs-pak-2nd-odi-australia-tour-of-pakistan-2026-match-updates-11YY`
  - `https://www.crickzen.com/cric-live/ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX`
  - `https://www.crickzen.com/cric-live/eng-w-vs-ind-w-3rd-t20-india-women-tour-of-england-2026-match-updates-VSY`
- Common issues across those pages:
  - soft-404 style failure for unknown URLs
  - duplicate `X-Frame-Options` and `X-Content-Type-Options` headers
  - missing `og:image`
  - above-the-fold image lazy loading
  - weak or absent structured data
  - response times in the 4.5s to 7.0s range
- Homepage and `/matches` HTML still expose zero crawlable `/cric-live/` links in SSR output, so match discovery depends heavily on direct URLs and sitemaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Match Pages Stay Crawlable and Self-Describing (Priority: P1)

A search crawler requests a live match URL and gets clear SSR metadata, one canonical, one H1, a real social preview image, and match-specific context without needing client-side hydration.

**Why this priority**: The live match template is already close to good. Tightening the metadata and structured content gives the fastest quality lift without changing URL strategy again.

**Independent Test**: Fetch any live `/cric-live/{slug}` URL from production or local SSR HTML and verify title, description, canonical, H1, `og:image`, Twitter tags, and JSON-LD in the initial response.

**Acceptance Scenarios**:

1. **Given** a valid live match URL, **When** the SSR HTML is inspected, **Then** it contains exactly one canonical tag pointing to that same `/cric-live/{slug}` URL.
2. **Given** a valid live match URL, **When** metadata is inspected, **Then** `og:image`, `twitter:image`, title, description, and `robots` are present and match the page intent.
3. **Given** a valid live match URL, **When** SSR body content is inspected, **Then** it contains one visible H1 and match-specific context for teams, series, and status.

---

### User Story 2 - Unknown Routes Stop Looking Like Valid Pages (Priority: P1)

A crawler requests an unknown frontend URL and gets a true 404 experience instead of a generic `200` shell that looks like a soft 404.

**Why this priority**: Soft-404 behavior reduces crawl trust and can bleed into otherwise healthy match templates.

**Independent Test**: Request a non-existent page such as `/this-page-should-not-exist` and verify the SSR response status and page content clearly represent a 404 state.

**Acceptance Scenarios**:

1. **Given** an unknown non-asset frontend route, **When** SSR handles it, **Then** the response status is `404`.
2. **Given** an unknown route, **When** the page renders, **Then** the user sees a real 404 page with crawlable recovery links.
3. **Given** a valid live match route, **When** it renders, **Then** it remains `200` and is not misclassified as a 404.

---

### User Story 3 - Social and Rich-Result Signals Come From Real Match Data (Priority: P2)

A live match page can generate cleaner previews in search and social by exposing a real OG image and valid JSON-LD only when trustworthy match data exists.

**Why this priority**: These are recurring template misses across all audited live pages and are straightforward to improve centrally.

**Independent Test**: Inspect sampled live pages and confirm `og:image`, image dimensions, Twitter image tags, and JSON-LD blocks exist only on real match pages.

**Acceptance Scenarios**:

1. **Given** a valid live match page, **When** metadata is inspected, **Then** it exposes a production-safe fallback OG image and image size metadata.
2. **Given** a valid live match page with real teams and status, **When** JSON-LD is parsed, **Then** `SportsEvent` and breadcrumb data match the canonical URL and page content.
3. **Given** a fallback or unresolved page, **When** JSON-LD would require placeholders, **Then** the page omits that structured data instead of emitting fake fields.

## Edge Cases

- Live pages can temporarily render from fallback match hints before full match info arrives; those states must not emit fake structured data.
- Unknown URLs must 404 without breaking existing public routes like `/matches`, `/players`, or `/cric-live/{slug}`.
- The same navbar logo component is reused in non-critical contexts, so above-the-fold loading changes must avoid hurting other surfaces.
- Match slugs currently include opaque source suffixes such as `11YY`; those remain part of the canonical URL even if titles and schema stay human-readable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST return `404` for unknown frontend routes instead of a generic `200` shell.
- **FR-002**: System MUST preserve `200` responses for valid public routes including `/`, `/matches`, `/players`, `/teams`, `/series`, `/privacy-policy`, `/terms-of-service`, and `/cric-live/{slug}`.
- **FR-003**: System MUST render a wildcard Angular 404 page for unknown routes with crawlable recovery links.
- **FR-004**: System MUST avoid duplicating `X-Frame-Options` and `X-Content-Type-Options` when the SSR app is already behind Caddy.
- **FR-005**: System MUST stop lazy-loading the above-the-fold navbar logo on SSR pages.
- **FR-006**: System MUST expose `og:image`, `og:image:width`, `og:image:height`, and `twitter:image` on indexable match pages.
- **FR-007**: System MUST use a real image asset that exists in the frontend bundle for match-page social previews.
- **FR-008**: System MUST keep live match descriptions concise enough to avoid obvious SERP truncation.
- **FR-009**: System MUST emit JSON-LD only when match data is real enough to avoid placeholders.
- **FR-010**: System MUST keep current live-score UX and match hero behavior unchanged while improving the SEO template.
- **FR-011**: System MUST extend repo verification to flag missing OG image metadata on sampled match URLs.

### Key Entities

- **Live Match SEO Template**: The shared SSR metadata/content pattern used by `/cric-live/{slug}` pages.
- **Known Frontend Route**: A route intentionally served by the Angular app and allowed to return `200`.
- **Unknown Frontend Route**: A non-asset URL that should render the app’s 404 experience and return `404`.
- **Match Social Image**: The OG/Twitter preview image attached to match pages.
- **Match Structured Data**: JSON-LD generated from real teams, status, series, date, and canonical URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sampled live match pages expose one self-canonical tag and one visible H1 in SSR HTML.
- **SC-002**: 100% of sampled live match pages expose `og:image` and `twitter:image` metadata in SSR HTML.
- **SC-003**: Unknown sample routes return `404` instead of `200`.
- **SC-004**: Duplicate `X-Frame-Options` and `X-Content-Type-Options` findings are eliminated from sampled live page audits.
- **SC-005**: JSON-LD appears on sampled real live match pages and is omitted on unresolved/fallback pages.
- **SC-006**: Existing match hero, scorecard, and WebSocket-driven live UX continue to work after the SEO hardening changes.
