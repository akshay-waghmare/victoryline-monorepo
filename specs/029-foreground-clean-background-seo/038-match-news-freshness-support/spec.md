# Feature Specification: Match News Freshness Support

**Feature Branch**: `038-match-news-freshness-support`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User request: "also many are targeting the news section for seo" and "ok lets implememnt all this"

## Summary

Crickzen already has a strong canonical match strategy around `/cric-live/{slug}` plus expanding discovery hubs, lifecycle support, and match-intent SSR. What is still missing is a freshness-support editorial layer that can compete for query patterns where Google favors recent timestamps, article-style snippets, and news-like live updates.

This phase adds that missing layer without changing the canonical match entity policy.

## Current Evidence

- Canonical match work already exists in `specs/021`, `032`, `033`, `034`, `035`, `036`, and `037`.
- Competitor and SERP examples on 2026-06-28 show Indian Express and Hindustan Times competing for live-score queries using article/live-update surfaces with freshness signals like `20 minutes ago` and `3 hours ago`.
- The repo already has non-match content inputs:
  - backend `CricketNewsService`
  - `/cricket-data/news`
  - `/cricket-data/blog-posts`
  - a homepage news/editorial area
- Existing match pages already emit `Article` JSON-LD in the canonical match flow, but the repo does not yet define a dedicated match-preview/live-update/result editorial support surface with its own crawl-path and freshness rules.
- Existing crawl graph work emphasizes SSR hub links and sitemaps; freshness-support pages must join that graph instead of becoming isolated articles.

## User Scenarios & Testing

### User Story 1 - Fresh Editorial Pages Support Match SEO Without Replacing The Canonical Match Page (Priority: P1)

As a search engine, I want a clear distinction between the canonical match entity page and editorial freshness pages so I can rank each one for its appropriate intent without canonical confusion.

**Why this priority**: Crickzen should gain freshness coverage without breaking the stable `/cric-live/{slug}` entity strategy.

**Independent Test**: Inspect one preview page, one live-update page, one result/highlights page, and the related canonical `/cric-live/{slug}` page; verify canonicals, internal links, and titles follow the intended ownership rules.

**Acceptance Scenarios**:

1. **Given** a freshness-support editorial page exists for a match, **When** raw HTML is inspected, **Then** the page has its own clear title, H1, visible timestamps, and links prominently back to the canonical `/cric-live/{slug}` page.
2. **Given** the canonical `/cric-live/{slug}` page renders, **When** raw HTML is inspected, **Then** it links to any related preview, live-update, or result/highlights editorial page for the same fixture.
3. **Given** child match aliases such as `/scorecard` or `/commentary`, **When** those routes render in this phase, **Then** they still fold back to the canonical match entity and are not repurposed as freshness pages.
4. **Given** an editorial page is not materially different from the canonical match page, **When** content quality is evaluated, **Then** it is rejected from this phase rather than shipped as a thin duplicate.

---

### User Story 2 - Crawlers Discover Freshness Pages Through The Existing SSR Graph (Priority: P1)

As a crawler, I want freshness-support pages to be discoverable through real SSR links and sitemap coverage so they do not depend on isolated article URLs alone.

**Why this priority**: Sitemap-only discovery is too weak for time-sensitive match freshness content.

**Independent Test**: For one sample freshness page per type, verify the page is linked from at least one SSR hub, linked from its related canonical match page, and present in sitemap output.

**Acceptance Scenarios**:

1. **Given** a preview page exists, **When** homepage, `/matches`, `/cricket-schedule/today`, or another intended SSR surface is inspected, **Then** at least one real crawlable link to that preview page exists.
2. **Given** a live-update or result page exists, **When** raw SSR HTML of the related canonical `/cric-live/{slug}` page is inspected, **Then** it links to that editorial surface.
3. **Given** a freshness-support page is created, **When** sitemap output is generated, **Then** the page appears in sitemap coverage according to the phase’s inclusion policy.
4. **Given** the live match ends, **When** result/highlights retention surfaces are inspected, **Then** the result page remains reachable from archive, recent-results, or series context instead of vanishing from the crawl graph immediately.

---

### User Story 3 - Freshness Signals Stay Honest And Useful (Priority: P1)

As a search engine and as a user, I want visible published and updated timestamps plus matching structured-data dates so freshness is trustworthy instead of artificially inflated.

**Why this priority**: The SERP `minutes ago` treatment depends on real visible freshness cues, but fake timestamp churn can reduce trust.

**Independent Test**: Inspect raw HTML and structured data for sample freshness pages and verify visible timestamps, `datePublished`, `dateModified`, and update behavior align.

**Acceptance Scenarios**:

1. **Given** a preview, live-update, or result page renders, **When** raw HTML is inspected, **Then** the page shows a visible publish time and updated time where appropriate.
2. **Given** the page uses `Article` or `NewsArticle` structured data, **When** JSON-LD is parsed, **Then** `datePublished` and `dateModified` match the visible editorial timestamps.
3. **Given** a live-update page refreshes during play, **When** content changes are meaningful, **Then** `dateModified` is updated honestly.
4. **Given** no meaningful editorial change occurred, **When** background product data refreshes, **Then** the editorial timestamps and `dateModified` do not change just because live data polled again.

---

### User Story 4 - Query Ownership Is Explicit Across Match, Preview, Live-Update, And Result Pages (Priority: P1)

As the team, we want a clear keyword ownership model so freshness pages support canonical match SEO instead of competing blindly with it.

**Why this priority**: Competitors capture both entity intent and freshness intent. Crickzen needs the same separation.

**Independent Test**: For one sample fixture, verify the titles/H1s of the canonical page, preview page, live-update page, and result page each target a distinct intent lane.

**Acceptance Scenarios**:

1. **Given** the canonical match page renders, **When** title and H1 are inspected, **Then** they remain focused on live score, scorecard, commentary, playing XI, toss, and match details.
2. **Given** a preview page renders, **When** title and H1 are inspected, **Then** they focus on preview, pitch, weather, expected lineups, toss timing, or series context.
3. **Given** a live-update page renders, **When** title and H1 are inspected, **Then** they focus on live updates, today-match phrasing, or freshness-heavy coverage.
4. **Given** a result/highlights page renders, **When** title and H1 are inspected, **Then** they focus on result, highlights, recap, and full scorecard follow-up language.

---

### User Story 5 - Update Cadence Matches Page Purpose (Priority: P2)

As the team, we want different page types to update at the right cadence so the freshness signal is useful without being noisy.

**Why this priority**: Preview pages, live-update pages, and result pages should not all churn on the same schedule.

**Independent Test**: Review the phase configuration and sample timestamps for each page type; verify the cadence policy is encoded and documented.

**Acceptance Scenarios**:

1. **Given** a preview page exists, **When** its update policy is reviewed, **Then** it updates only on meaningful prematch changes rather than on every data poll.
2. **Given** a live-update page exists during a live match, **When** its update policy is reviewed, **Then** it supports meaningful updates on a much tighter cadence than preview pages.
3. **Given** a result/highlights page exists, **When** the match finishes, **Then** it receives a fast initial result update and may receive one fuller follow-up update shortly after.

## Edge Cases

- A match may be too small or too thin to justify a freshness-support page; this phase must prefer quality over volume.
- Live-update pages must not impersonate a full live blog unless real update content exists.
- Preview pages may be published before venue, lineups, or toss are fully known; the page must stay honest and use placeholders carefully.
- Result/highlights pages should not become orphaned once the live window closes.
- If article-style surfaces are externally sourced or lightly curated, canonical and timestamp policy still must remain internally consistent.

## Requirements

### Functional Requirements

- **FR-001**: This phase MUST preserve `/cric-live/{slug}` as the canonical match entity URL.
- **FR-002**: This phase MUST define at least three freshness-support page types: preview, live-update, and result/highlights.
- **FR-003**: Freshness-support pages MUST be materially distinct from the canonical match page in title, H1, summary, and editorial body content.
- **FR-004**: Freshness-support pages MUST link prominently to the related canonical `/cric-live/{slug}` page.
- **FR-005**: The canonical match page MUST link back to any related freshness-support page that exists for the same fixture.
- **FR-006**: Freshness-support pages MUST be discoverable from at least one intended SSR hub and MUST NOT rely only on sitemap submission.
- **FR-007**: Freshness-support pages MUST be included in sitemap coverage under a documented inclusion policy.
- **FR-008**: Freshness-support pages MUST show visible published and updated timestamps where appropriate.
- **FR-009**: Structured data for freshness-support pages MUST include `Article` or `NewsArticle` with honest `datePublished` and `dateModified`.
- **FR-010**: `LiveBlogPosting` MUST only be emitted when the page genuinely behaves like a live update surface with real update entries.
- **FR-011**: The phase MUST define explicit keyword ownership across canonical match, preview, live-update, and result/highlights pages.
- **FR-012**: The phase MUST define update-cadence rules for preview, live-update, and result pages so editorial timestamps only move on meaningful changes.
- **FR-013**: Verification MUST prove crawl-path presence, sitemap presence, timestamp visibility, structured-data dates, and canonical-link relationships for sample freshness pages.

### Key Entities

- **Canonical Match Entity Page**: The stable `/cric-live/{slug}` URL that remains the primary match entity.
- **Preview Page**: A prematch editorial support page for build-up, conditions, and expected lineups.
- **Live-Update Page**: A freshness-heavy match page focused on live updates, match-day context, and rolling editorial coverage.
- **Result/Highlights Page**: A post-match editorial support page focused on result, recap, highlights, and scorecard follow-up.
- **Freshness Signal Contract**: Visible timestamps plus matching `datePublished`/`dateModified` values and update rules.
- **Freshness Crawl Path**: The set of SSR hubs, canonical match links, and sitemap coverage that exposes editorial freshness pages to crawlers.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Sample freshness-support pages are linked from at least one SSR hub and from their related canonical match pages.
- **SC-002**: Sample freshness-support pages appear in sitemap coverage according to the documented inclusion policy.
- **SC-003**: Sample freshness-support pages show visible timestamp blocks and matching `datePublished`/`dateModified` values.
- **SC-004**: The canonical `/cric-live/{slug}` page remains stable and does not lose its entity-intent ownership after adding freshness-support pages.
- **SC-005**: Query ownership across canonical match, preview, live-update, and result pages is explicit and reflected in sample titles/H1s.
- **SC-006**: The update policy for preview, live-update, and result pages can be explained and verified without relying on vague “updated frequently” wording.
