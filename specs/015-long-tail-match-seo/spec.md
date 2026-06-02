# Feature Specification: Long-Tail Match SEO Recovery

**Feature Branch**: `015-long-tail-match-seo`
**Created**: 2026-06-02
**Status**: Draft
**Input**: User description: "Now that SSR is set up, improve SEO for smaller cricket matches and long-tail keywords. Fix Search Console issues: Alternative page with proper canonical tag, Duplicate without user-selected canonical, Soft 404, orphan pages, low word count, missing H1, non-canonical pages in sitemap, missing social tags, and schema validation errors."

**Current Evidence**:
- Search Console reports `Alternative page with proper canonical tag`, `Duplicate without user-selected canonical`, and `Soft 404` for `/cric-live/*` pages.
- Production sample on 2026-06-02 showed match pages returning `200` with `rel="canonical" href="https://www.crickzen.com/"`, `h1=0`, and short fallback content.
- Production sample URLs included `/cric-live/pak-w-vs-wi-w-2nd-match-ireland-womens-t20i-tri-series-2026-match-updates-11BU`, `/cric-live/sh-vs-tan-10th-match-mens-t20-wc-africa-sub-regional-qualifier-b-2026`, `/cric-live/445`, and `/cric-live/br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P`.
- Small-match pages already generate clicks for long-tail searches such as `BR vs SGR Live Score Ball by Ball`, so the feature must optimize minor domestic/qualifier/tournament pages, not only major international matches.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Google Sees One Canonical Match URL (Priority: P1)

A Google crawler requests any valid match page and receives a self-consistent canonical, title, description, social tags, H1, and indexable SSR content for that exact match URL.

**Why this priority**: Canonical mismatch is the root cause behind non-indexing. If every match page canonicals to the home page, Google is correct to treat match URLs as alternatives/duplicates and not serve them.

**Independent Test**: Fetch any valid `/cric-live/{slug}` URL with `curl` or Playwright and verify the HTML head and rendered body without relying on client-side hydration.

**Acceptance Scenarios**:

1. **Given** a valid match URL with a slug, **When** Googlebot requests the page, **Then** the initial HTML contains exactly one canonical URL equal to `https://www.crickzen.com/cric-live/{slug}`.
2. **Given** a valid match URL, **When** the SSR response is inspected, **Then** the response contains one non-empty H1 that uses the match teams or readable slug title.
3. **Given** a valid match URL, **When** metadata is inspected, **Then** title, meta description, Open Graph, and Twitter tags are unique to that match and within safe length limits.
4. **Given** a valid match URL appears in a sitemap, **When** the same URL is fetched, **Then** the page canonical matches the sitemap URL.

---

### User Story 2 - Thin or Unknown Match URLs Do Not Become Soft 404s (Priority: P1)

A crawler requests an old numeric or unresolved match URL and receives either a useful archived match page or a clear non-indexable/404 response instead of a thin generic `Team A vs Team B` page.

**Why this priority**: Soft 404s waste crawl budget and reduce trust. Numeric fallback pages like `/cric-live/445` should not be indexable if the system cannot resolve the match.

**Independent Test**: Fetch known unresolved URLs and verify they no longer return generic indexable pages.

**Acceptance Scenarios**:

1. **Given** a numeric `/cric-live/{id}` URL cannot be mapped to a real match, **When** the page is requested, **Then** the response is `404` or `noindex,follow` with a helpful match-not-found page.
2. **Given** an old match can be resolved from database or stored schedule history, **When** the page is requested, **Then** it renders an archived scorecard/summary with an indexable canonical slug URL.
3. **Given** scraper/backend data is temporarily unavailable, **When** SSR renders the page, **Then** it does not emit a generic `Team A vs Team B` indexable title.

---

### User Story 3 - Smaller Matches Get Search-Relevant Content (Priority: P2)

A user searching a smaller match, league, qualifier, or domestic fixture sees a result title and snippet that matches the query intent and opens a page with useful match context before scrolling.

**Why this priority**: Search Console examples show small matches are already producing clicks. This is the organic growth wedge.

**Independent Test**: Inspect pages for Afghanistan One Day Cup, T20 Blast, Uttar Pradesh T10, women’s tri-series, and regional qualifiers and verify title/body contain team, match number, league, format, score/status, and commentary or summary.

**Acceptance Scenarios**:

1. **Given** a match slug includes team codes, match number, league, season, and match update id, **When** metadata is generated, **Then** the page title uses readable teams and league without noisy `match-updates-{id}` text.
2. **Given** a live match has score data, **When** SSR renders the page, **Then** the body includes score, innings/overs, match status, league, and ball-by-ball/commentary fallback text.
3. **Given** a completed match has a result, **When** SSR renders the page, **Then** the body includes final score, winner/result summary, full scorecard heading, and match context.

---

### User Story 4 - Crawl Paths Point Toward Canonical Match Pages (Priority: P2)

Google and users can discover match pages through internal links, sitemap entries, and related match/series links rather than orphan URLs.

**Why this priority**: The audit shows large orphan/no-outgoing-link counts. Even perfect pages struggle if Google has no crawl path and no outgoing context.

**Independent Test**: Crawl home, matches, live score, and match pages and verify incoming/outgoing link relationships for active and recently completed matches.

**Acceptance Scenarios**:

1. **Given** a match appears on home or matches list, **When** the rendered HTML is inspected, **Then** it contains crawlable `<a href="/cric-live/{slug}">` links, not only router click handlers.
2. **Given** a match page renders, **When** outgoing links are inspected, **Then** it links to `/matches`, live score hub, and related series/team pages where available.
3. **Given** sitemap generation runs, **When** sitemap XML is inspected, **Then** it includes only canonical indexable URLs and excludes unresolved numeric aliases.

---

### User Story 5 - Structured Data Is Valid and Useful (Priority: P3)

A match page exposes valid JSON-LD that describes the cricket event without placeholder teams, fake stadiums, or invalid enum values.

**Why this priority**: Structured-data validation errors are noisy and can suppress rich-result eligibility. Fixing after canonical/content work prevents false positives.

**Independent Test**: Run sampled pages through schema validation or parse JSON-LD and verify required properties and URL consistency.

**Acceptance Scenarios**:

1. **Given** a valid match page, **When** JSON-LD is parsed, **Then** `SportsEvent.name`, `url`, `startDate` when known, teams, sport, and event status are populated from real match data.
2. **Given** data is unknown, **When** JSON-LD would require placeholders, **Then** the page omits the invalid field or marks page `noindex` instead of emitting fake schema.
3. **Given** breadcrumbs render, **When** JSON-LD is parsed, **Then** breadcrumb URLs match real canonical pages.

### Edge Cases

- Same teams play multiple matches in the same league; canonical identity must include match number or source slug.
- Live match later becomes completed; title/status should update without creating a second canonical URL.
- CREX slugs may include trailing opaque ids like `126P`; these identify the canonical URL but should not pollute titles/body copy.
- Legacy numeric URLs may have no internal match relation; they must not be indexed as generic pages.
- SSR timeout or backend outage must not return indexable empty shell content.
- Search Console validation may lag by days; deployment validation must use local/prod HTML evidence first, then GSC revalidation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove or override the static home-page canonical for route-specific SSR pages.
- **FR-002**: System MUST emit exactly one canonical tag per HTML page.
- **FR-003**: System MUST set `/cric-live/{slug}` canonical to the normalized HTTPS `www.crickzen.com` URL for that slug when the match is valid and indexable.
- **FR-004**: System MUST not include non-canonical match URLs in sitemap partitions.
- **FR-005**: System MUST classify match pages as `index,follow`, `noindex,follow`, or `404` based on whether a real match can be resolved.
- **FR-006**: System MUST prevent unresolved fallback titles such as `Team A vs Team B Live Score Ball by Ball` from being indexable.
- **FR-007**: System MUST render one visible H1 in the initial SSR HTML for each match page.
- **FR-008**: System MUST render at least 250 words or equivalent match-specific structured text for indexable match pages when match data is available.
- **FR-009**: System MUST generate match titles using team names/codes, match number, league, format, and status without noisy source suffixes.
- **FR-010**: System MUST keep titles at or below 60 visible characters where possible and descriptions at or below 155 visible characters.
- **FR-011**: System MUST render Open Graph and Twitter tags for match pages in SSR output.
- **FR-012**: System MUST render valid JSON-LD only from real match data and avoid placeholder schema.
- **FR-013**: System MUST expose crawlable internal links to active/recent match pages on home and matches pages.
- **FR-014**: System MUST expose outgoing crawlable links from match pages to match list/live hub and related series/team pages where data exists.
- **FR-015**: System MUST provide a verification command/report that checks canonical, title length, description length, H1 count, word count, robots, JSON-LD count, status code, and sitemap inclusion for sample URLs.
- **FR-016**: System MUST preserve live-score freshness and WebSocket behavior while changing SEO metadata.

### Key Entities

- **Canonical Match URL**: The one URL Google should index for a match; usually `/cric-live/{source-slug}`.
- **Match SEO Metadata**: Title, description, canonical, robots, social tags, and H1 text for a match page.
- **Indexability Decision**: Page-level decision of `index`, `noindex`, or `404` based on match resolution and content quality.
- **Sitemap Entry**: XML URL record that must only point to canonical indexable URLs.
- **Internal Link Edge**: Crawlable link between home/matches/match/series/team pages.
- **Match Structured Data**: JSON-LD derived from real match, team, score, venue, and date data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sampled valid `/cric-live/*` pages have a self-referencing canonical in initial SSR HTML.
- **SC-002**: 0 sampled match pages canonicalize to `https://www.crickzen.com/` unless the requested URL is the home page.
- **SC-003**: 100% of sampled indexable match pages have exactly one visible H1 in SSR HTML.
- **SC-004**: 0 unresolved numeric/fallback match pages are indexable with `Team A` or `Team B` metadata.
- **SC-005**: 100% of sitemap match URLs are canonical according to their own HTML.
- **SC-006**: At least 90% of sampled live/recent match pages have unique titles and descriptions within length limits.
- **SC-007**: Search Console `Alternative page with proper canonical tag` and `Duplicate without user-selected canonical` affected counts trend down after revalidation.
- **SC-008**: Search Console `Soft 404` affected count does not increase after rollout and known numeric fallback examples are removed or noindexed.
- **SC-009**: Small-match query pages such as `BR vs SGR Live Score Ball by Ball` retain or improve clicks/impressions after canonical recovery.
- **SC-010**: Structured-data validation errors for sampled match pages are eliminated or limited to intentionally omitted optional fields.

## Assumptions

- The preferred canonical for current Crickzen match pages is the existing `/cric-live/{slug}` URL, not the future `/match/{tournament}/{season}/...` pattern, because current Search Console traffic and app routing already use `/cric-live/*`.
- Numeric `/cric-live/{id}` URLs should be treated as aliases only if they can be mapped to a real slug; otherwise they should be `noindex` or `404`.
- Search Console reports lag live HTML changes; the first validation source is HTML/sitemap evidence, then GSC validation.
