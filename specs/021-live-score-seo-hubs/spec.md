# Feature Specification: Live Score SEO Hubs And Match Page Enrichment

**Feature Branch**: `021-live-score-seo-hubs`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: Phase 1 SEO audit follow-up: keep `/cric-live/{slug}` canonical, add crawlable live-score/schedule hubs, enrich match pages, fix schema, and improve sitemap discovery.

## Current Evidence

- Ahrefs reports a large orphan-page cluster: roughly 2,037 match URLs are present in sitemap partitions but only a small number are discoverable through direct SSR links.
- Production match pages under `/cric-live/{slug}` already have SSR, sitemap, GSC, indexing, and production setup working, so this phase must not migrate canonical match URLs.
- `/live-score/*` and `/cricket-schedule/*` routes are currently missing even though they match high-intent live score and schedule queries.
- The match page currently emits `SportsEvent`, but live matches map to `https://schema.org/EventScheduled` instead of an in-progress event status.
- Pre-match pages can be too thin when toss, playing XI, venue stats, and scorecard data have not arrived yet.

## User Scenarios & Testing

### User Story 1 - Crawlers Discover Match Pages Through SEO Hubs (Priority: P1)

As a search crawler, I want crawlable hub pages for live scores, today's matches, IPL scores, and schedules so canonical `/cric-live/{slug}` match pages are not isolated sitemap-only URLs.

**Independent Test**: Fetch SSR HTML for each new hub route and verify it returns a 200 page with one H1, indexable metadata, hub copy, and direct `<a href="/cric-live/{slug}">` links when match data is available.

**Acceptance Scenarios**:

1. **Given** tracked live matches exist, **When** `/live-score` or `/live-score/today` is rendered, **Then** the HTML includes crawlable links to canonical `/cric-live/{slug}` pages.
2. **Given** IPL matches exist in live/upcoming/completed feeds, **When** `/live-score/ipl` is rendered, **Then** the HTML prioritizes IPL match links and links to related schedule hubs.
3. **Given** today's scheduled matches exist, **When** `/cricket-schedule/today` is rendered, **Then** the HTML exposes fixture links and schedule-focused copy.

---

### User Story 2 - Match Pages Are Useful Before, During, And After Play (Priority: P1)

As a user landing from search, I want the canonical match page to answer match details, scorecard, toss, playing XI, venue, result, and language-variant intent even before the match starts.

**Independent Test**: Fetch a sample `/cric-live/{slug}` SSR HTML page and verify the HTML contains visible sections for match details, tournament, date/time, venue, live score, toss update, playing XI, scorecard, venue stats, FAQ, and Hindi/Marathi keyword copy.

**Acceptance Scenarios**:

1. **Given** toss or playing XI data is not yet available, **When** the match page renders, **Then** it includes honest placeholders rather than omitting the section entirely.
2. **Given** scorecard or venue stats are available, **When** the match page renders, **Then** those sections summarize the available data without requiring client hydration.
3. **Given** the page is pre-match, **When** a crawler reads it, **Then** it still contains useful match details, schedule context, FAQs, and long-tail live-score language.

---

### User Story 3 - Structured Data Matches Real Match Lifecycle (Priority: P1)

As a search engine, I want JSON-LD that reflects whether the match is scheduled, live, or completed so rich-result parsing is not contradicted by page content.

**Independent Test**: Inspect JSON-LD emitted for a live sample and verify `SportsEvent.eventStatus` is `https://schema.org/EventInProgress`; inspect an indexable match page and verify Article JSON-LD includes headline, description, dates, publisher, author, and `mainEntityOfPage`.

**Acceptance Scenarios**:

1. **Given** a match is live, **When** structured data is emitted, **Then** `LiveEvent` maps to `EventInProgress`.
2. **Given** a match page is indexable, **When** structured data is emitted, **Then** it includes an Article object with required publisher and page identity fields.
3. **Given** no real ball-by-ball text exists, **When** schema is emitted, **Then** no fake `LiveBlogPosting` is emitted.

---

### User Story 4 - Sitemap Includes Hub URLs (Priority: P2)

As a crawler consuming sitemaps, I want the new discovery hubs listed alongside match partitions so the crawl graph has clear entry points.

**Independent Test**: Generate sitemap partition 1 and verify it contains `/live-score`, `/live-score/today`, `/live-score/ipl`, `/cricket-schedule/today`, and `/cricket-schedule/ipl-2026`.

## Requirements

- **FR-001**: `/cric-live/{slug}` MUST remain the canonical match detail URL.
- **FR-002**: Add crawlable hub routes: `/live-score`, `/live-score/today`, `/live-score/ipl`, `/cricket-schedule/today`, and `/cricket-schedule/ipl-2026`.
- **FR-003**: Hub pages MUST be SSR-visible and link internally to canonical `/cric-live/{slug}` match pages.
- **FR-004**: Add a paginated or indexed match archive/discovery surface that exposes additional canonical match links.
- **FR-005**: Add homepage, header, and footer links to the new hub routes.
- **FR-006**: Match pages MUST render SSR-visible match details, tournament, date/time, venue, live score, toss update, playing XI, scorecard, venue stats, team form/head-to-head when available, FAQ, and Hindi/Marathi long-tail copy.
- **FR-007**: Match title, description, and H1 templates MUST include live score today, scorecard, toss update, playing XI, match result, and today match live score language naturally.
- **FR-008**: Structured data MUST map live matches to `https://schema.org/EventInProgress`.
- **FR-009**: Structured data MUST include Article JSON-LD for indexable match pages.
- **FR-010**: LiveBlogPosting MUST only be emitted when real ball-by-ball text updates exist.
- **FR-011**: `SitemapService.java` MUST add the required hub URLs to sitemap partition output and partition counts.
- **FR-012**: SerpBear tracking MUST be documented outside app runtime in `docs/serpbear-keywords.md`.

## Key Entities

- **Canonical Match Page**: `/cric-live/{slug}`, the indexable match detail page.
- **SEO Hub Page**: A crawlable listing route for live scores, today's matches, IPL, and schedules.
- **Discovery Archive**: A route that exposes more canonical match links than homepage and primary hubs can reasonably show.
- **Match SEO Block**: SSR-visible copy and sections that keep pre-match/live/completed pages useful.
- **Structured Data Bundle**: Breadcrumb, Article, and SportsEvent JSON-LD generated for indexable match pages.

## Success Criteria

- **SC-001**: All required hub routes compile and render indexable SSR HTML.
- **SC-002**: Hub pages expose direct `/cric-live/` links when match data exists.
- **SC-003**: A sample `/cric-live/{slug}` page contains the required visible SEO sections.
- **SC-004**: JSON-LD for a live match uses `EventInProgress`, not `EventScheduled`.
- **SC-005**: Sitemap partition 1 includes the new hub URLs.
- **SC-006**: SerpBear keyword groups are documented without adding runtime dependency.
