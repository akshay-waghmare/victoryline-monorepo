# Feature Specification: Prematch SEO Discovery Fixes

**Feature Branch**: `030-prematch-seo-discovery-fixes`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "We need SEO before match for every live match. We were having good impressions only for 4 days 26-29 May last month then saw a drop. Investigate thoroughly where we are lagging in spite of working so much on SEO. Sitemap is submitted via GSC. Check the quota for sitemap submission — we should at least submit hourly. Use Google Rich Results Test to verify."

## Current Evidence

A read-only production SEO health audit on 2026-06-25 (`artifacts/seo-health/crickzen-seo-health-20260625-070536.json`) plus source inspection found five correlated root causes for the post-May-29 impression drop and the pre-match traffic gap.

1. **Pre-match matches never receive an Indexing API ping.** `LiveMatchIndexingScheduler` sources from `liveMatchesService.getLiveMatchesOnly()` → `/cricket-data/live-matches` → `liveMatchService.findAllLiveMatches()`, which filters with `MatchLifecycleStatus.isLiveLike()` = `LIVE || INNINGS_BREAK || RAIN_DELAY`. `UPCOMING` is excluded. A fixture scheduled for tonight gets its first real-time Indexing API push only **after** it goes LIVE, so Google discovers pre-match pages with multi-hour/day sitemap-crawl latency instead of minutes.
2. **SportsEvent JSON-LD is silently dropped when venue is TBD.** `cricket-odds.component.ts:2976` gates the entire `SportsEvent` block on `if (startDate && location)`. `getStructuredDataLocation()` returns `null` for "Venue TBD"/"N/A"/empty. Many upcoming fixtures have unknown venues, so they get zero event markup — no `startDate`, no `eventStatus`, no rich-result eligibility. This is the single most valuable schema for "match starting soon" SERP features.
3. **Duplicate H1 on completed match pages.** 19 of 30 sampled match pages have `h1=2`. `cricket-odds.component.html:16` renders the canonical H1 in a sr-only block; `scorecard.component.html:97` renders a second `<h1>Scorecard</h1>` inside the scorecard tab shown for completed matches. Two competing H1s signal an unclear page topic — a known indexability/quality demoter on the largest URL slice of the sitemap.
4. **GSC sitemap ping is daily 3 AM only.** `SitemapScheduler.java:55` cron `0 0 3 * * *`. The sitemap XML rebuilds on content-change events (debounced), but the ping that tells Google to re-fetch fires once daily. A fixture discovered at 10 AM won't prompt a sitemap resubmission until 3 AM next day. The Search Console API quota is 200 req/100s and 200,000/day — hourly submission (24/day) is ~0.01% of the ceiling.
5. **lastmod uses future start time for upcoming matches.** `SitemapService.deriveLiveMatchLastMod` falls back to `scheduledStartTime` when there is no `lastStateUpdatedAt`. For upcoming matches lastmod = a future timestamp, which Google treats as unreliable and may ignore — weakening the freshness signal right when it is needed most.

The May 26-29 spike aligns with the Angular SSR migration going live (commits `9aecec2`→`3c522be`, mid-May). The drop after May 29 is explained by the structural defects above, not by the startDate/location fix (commit `84bb547` was June 3, after the drop began).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-match matches receive an Indexing API ping before start (Priority: P1)

As a search engine, I want Google's Indexing API to be notified of an upcoming match page the moment it appears in the feed so I can crawl and index it hours before the first ball, not hours after.

**Why this priority**: Pre-match traffic is the entire goal of this feature. Without a real-time ping for upcoming matches, all other fixes only help after the match is already live.

**Independent Test**: Trigger the indexing scheduler manually against a fixture in the UPCOMING state and verify `GoogleSearchConsoleService.requestIndexingForMatch` is called for that slug.

**Acceptance Scenarios**:

1. **Given** a match exists in the feed with status `UPCOMING` and a valid `-vs-` slug, **When** `LiveMatchIndexingScheduler.indexNewLiveMatches()` runs, **Then** the upcoming match slug is submitted to the Indexing API (not skipped).
2. **Given** an upcoming match was already pinged once today, **When** the scheduler runs again, **Then** the slug is skipped (already indexed today) to protect quota.
3. **Given** the daily indexing budget is reached, **When** more upcoming matches remain, **Then** the scheduler stops and logs the budget exhaustion.
4. **Given** a match transitions from UPCOMING to LIVE, **When** the scheduler runs after the transition, **Then** the LIVE match is prioritized ahead of remaining UPCOMING matches in the same run.

---

### User Story 2 - SportsEvent structured data is emitted whenever a start date exists (Priority: P1)

As a search engine, I want a `SportsEvent` JSON-LD block with `startDate` and `eventStatus` on every match page that has a known start time, even when the venue is unknown, so the page is eligible for "match starting soon" rich results.

**Why this priority**: This is the single most valuable schema for pre-match SERP features. The current `&& location` gate drops it entirely for TBD-venue fixtures.

**Independent Test**: Render a match page SSR with a known `startDate` but `venue = null` and verify the HTML contains a `SportsEvent` JSON-LD block with `startDate` and `eventStatus` but no `location`.

**Acceptance Scenarios**:

1. **Given** a match has a known `startDate` and no venue, **When** the match page is rendered, **Then** the HTML contains a `SportsEvent` JSON-LD block with `startDate` and `eventStatus` and no `location` property.
2. **Given** a match has a known `startDate` and a known venue, **When** the match page is rendered, **Then** the `SportsEvent` block includes both `startDate` and `location`.
3. **Given** a match has no `startDate`, **When** the match page is rendered, **Then** no `SportsEvent` block is emitted (the Article and BreadcrumbList blocks remain).
4. **Given** a `SportsEvent` block is emitted, **When** it is validated with the Google Rich Results Test or Schema.org validator, **Then** it passes without errors.

---

### User Story 3 - Completed match pages have exactly one H1 (Priority: P1)

As a search engine, I want exactly one H1 per match page so the page topic is unambiguous, regardless of whether the match is live, upcoming, or completed.

**Why this priority**: 19 of 30 sampled match pages currently fail with `h1=2`. This is a known indexability/quality demoter on the largest URL slice.

**Independent Test**: Fetch the raw SSR HTML of a completed match page that renders the scorecard tab and assert `h1Count === 1`.

**Acceptance Scenarios**:

1. **Given** a completed match page renders the scorecard tab, **When** the raw SSR HTML is inspected, **Then** exactly one `<h1>` element is present.
2. **Given** the single H1 on a completed match page, **When** its text is inspected, **Then** it contains the match teams (e.g. "Team A vs Team B Match Result & Scorecard") and not the generic word "Scorecard".
3. **Given** a live or upcoming match page, **When** the raw SSR HTML is inspected, **Then** exactly one `<h1>` element is present (no regression).

---

### User Story 4 - Sitemap is submitted to GSC hourly, not daily (Priority: P2)

As an operator, I want the sitemap resubmitted to Google Search Console every hour so newly-discovered fixtures prompt a re-fetch within minutes-to-an-hour instead of waiting up to 24 hours for the 3 AM cron.

**Why this priority**: The daily cron is a self-imposed conservative default, not a quota constraint. Hourly submission (24/day) is ~0.01% of the 200,000/day Search Console API quota.

**Independent Test**: Change the cron expression and verify the scheduler fires at the top of every hour via logs or a unit test asserting the cron value.

**Acceptance Scenarios**:

1. **Given** the `SitemapScheduler.submitDailySitemap()` method, **When** the cron expression is inspected, **Then** it fires at the top of every hour (not once at 3 AM).
2. **Given** the GSC client is initialized and `gsc.enabled=true`, **When** the hourly cron fires, **Then** `submitSitemap()` is called and the result is logged.
3. **Given** the GSC client is not initialized or `gsc.enabled=false`, **When** the hourly cron fires, **Then** it skips submission and logs the reason without error.
4. **Given** 24 hourly submissions in one day, **When** the daily quota is reviewed, **Then** the submission count is far below the 200,000/day ceiling.

---

### User Story 5 - Sitemap lastmod is honest for upcoming matches (Priority: P3)

As a search engine, I want the sitemap `lastmod` for an upcoming match to reflect when the URL became known, not a future start time, so the freshness signal is trustworthy.

**Why this priority**: Future-dated `lastmod` is ignored by Google, weakening the freshness signal right when pre-match discovery matters most.

**Independent Test**: Inspect the sitemap XML for an upcoming match with no `lastStateUpdatedAt` and verify `lastmod` is not in the future.

**Acceptance Scenarios**:

1. **Given** an upcoming match has no `lastStateUpdatedAt` but has a future `scheduledStartTime`, **When** the sitemap partition is generated, **Then** the `lastmod` is the URL discovery/emit time (now), not the future `scheduledStartTime`.
2. **Given** a live match has a recent `lastStateUpdatedAt`, **When** the sitemap partition is generated, **Then** the `lastmod` is the `lastStateUpdatedAt` timestamp (no regression).
3. **Given** a completed match has a `lastStateUpdatedAt`, **When** the sitemap partition is generated, **Then** the `lastmod` is the `lastStateUpdatedAt` timestamp (no regression).

---

### Edge Cases

- A match may transition from UPCOMING to LIVE between two scheduler runs; the LIVE ping must take priority and the earlier UPCOMING ping must not be wasted quota if the slug was already indexed today.
- A match may have a `startDate` but a venue string like "Venue TBD" or "N/A"; these must be treated as no location, not as a location name.
- A match may have neither `startDate` nor venue; in that case only Article and BreadcrumbList blocks are emitted.
- The Indexing API and Search Console API are different APIs with different quotas (~200/day vs 200,000/day); the hourly sitemap submission must not consume the per-URL Indexing API budget.
- The hourly sitemap submission must remain idempotent — resubmitting an unchanged sitemap is harmless and expected.
- The `SeoContentChangeEvent` debounce and burst caps in `SitemapService` must not be bypassed by the hourly cron; the cron calls GSC, the service controls XML regeneration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `LiveMatchIndexingScheduler` MUST include matches with status `UPCOMING` in the candidate set submitted to the Indexing API.
- **FR-002**: `LiveMatchIndexingScheduler` MUST prioritize `LIVE` matches ahead of `UPCOMING` matches within a single run.
- **FR-003**: `LiveMatchIndexingScheduler` MUST skip any slug already indexed today (via `SeoCache.isSlugIndexed`) regardless of lifecycle state.
- **FR-004**: `LiveMatchIndexingScheduler` MUST respect the daily indexing budget and max-per-run limits for upcoming matches as it does for live matches.
- **FR-005**: `cricket-odds.component.ts` MUST emit a `SportsEvent` JSON-LD block whenever `startDate` is present, regardless of whether `location` is present.
- **FR-006**: `StructuredDataService.sportsEvent()` MUST omit the `location` property when no location is provided (do not emit an empty `Place`).
- **FR-007**: `scorecard.component.html` MUST NOT render a second `<h1>` element; the single page-level H1 comes from `matchSeo.h1` in `cricket-odds.component.html`.
- **FR-008**: `SitemapScheduler` MUST submit the sitemap to Google Search Console at the top of every hour, not once daily at 3 AM.
- **FR-009**: The hourly sitemap submission MUST use the existing `GoogleSearchConsoleService.submitSitemap()` method with its retry/backoff and MUST NOT bypass GSC initialization checks.
- **FR-010**: `SitemapService.deriveLiveMatchLastMod()` MUST NOT emit a future `scheduledStartTime` as `lastmod` for upcoming matches; it MUST use the current emit time or omit `lastmod` when no `lastStateUpdatedAt` exists.
- **FR-011**: These changes MUST NOT alter the `/cric-live/{slug}` canonical route policy or reopen Spec 023.
- **FR-012**: Verification MUST include raw SSR HTML inspection, the Schema.org validator / Google Rich Results Test for `SportsEvent`, and a rerun of the SEO health pattern audit.

### Key Entities

- **LiveMatchEntry**: The feed entry consumed by the indexing scheduler and sitemap service; carries `status`, `scheduledStartTime`, `lastStateUpdatedAt`, `url`, `externalMatchKey`.
- **MatchSeoViewModel**: The frontend SEO view model carrying `h1`, `isIndexable`, `team1`, `team2`, `canonicalUrl`.
- **StructuredDataLocationInput**: The venue/location input to `StructuredDataService.sportsEvent()`; may be `null` for TBD venues.
- **SeoCache**: Redis-backed cache tracking which slugs were indexed today; protects Indexing API quota across scheduler runs and restarts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An UPCOMING match with a valid slug receives an Indexing API ping within one scheduler interval (15 minutes) of appearing in the feed, before it goes LIVE.
- **SC-002**: A match page with a known `startDate` and unknown venue emits a valid `SportsEvent` JSON-LD block that passes the Schema.org validator and Google Rich Results Test.
- **SC-003**: At least 95% of sampled completed match pages return `h1Count === 1` in a rerun of the SEO health pattern audit (current baseline: 19/30 failing with `h1=2`).
- **SC-004**: The sitemap is submitted to GSC 24 times per day (hourly), and the daily submission count stays below 30 (far under the 200,000/day quota).
- **SC-005**: No sitemap `lastmod` value for an upcoming match is in the future relative to the sitemap generation time.
- **SC-006**: A post-implementation SEO health pattern audit rerun shows zero `h1=2` match-page failures and the audit exit code is 0 (no actionable failures).
