# Feature Specification: Match Freshness Authority Hardening

**Feature Branch**: `039-match-freshness-authority-hardening`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User request: "check waht is missing in our repo from this how can we take advantage of his" and "ok crete spec and plan for this"

## Summary

Crickzen already has the foundation for match freshness support through the canonical `/cric-live/{slug}` strategy and the first editorial freshness slice in `specs/038-match-news-freshness-support`. What is still missing is the higher-trust, higher-depth layer that lets freshness pages behave more like real live-update and match-news products instead of thin SEO support pages.

This phase hardens that layer without changing the canonical match entity policy. It focuses on richer live-update structure, better keyword separation, honest freshness behavior, stronger post-match retention, and proof that crawlers can discover and trust the surfaces.

## Current Evidence

- `specs/038-match-news-freshness-support` already introduced preview, live-update, and result/support page types plus first-slice crawl-path work.
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.ts` currently renders freshness pages with timestamps, article-style metadata, and related links.
- `apps/frontend/src/app/seo/structured-data.service.ts` supports `Article` but does not yet expose `NewsArticle` or `LiveBlogPosting` helpers.
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java` includes freshness pages in the general sitemap, but there is no dedicated freshness/news sitemap layer.
- Competitor patterns in the referenced research report show stronger live-update surfaces using visible freshness, distinct story angles, and clearer editorial blocks such as key moments and match-development summaries.
- The report also highlights a useful constraint: do not rely on unsupported Google Indexing API assumptions for text live updates; rely instead on crawlable SSR HTML, sitemap discipline, timestamps, and internal linking.

## User Scenarios & Testing

### User Story 1 - Live-Update Pages Feel Like Real Match-Day Coverage (Priority: P1)

As a user and as a search engine, I want live-update pages to surface key moments and match-state development clearly so the page offers something stronger than copied score data or a generic commentary list.

**Why this priority**: This is the biggest content-quality gap between Crickzen’s current freshness pages and the stronger competitor/news surfaces.

**Independent Test**: Inspect a sample live-update page during or after a real match and verify it contains a visible key-events layer, a match-development summary, and materially distinct live-update copy rather than only generic commentary cards.

**Acceptance Scenarios**:

1. **Given** a live-update page exists for a match, **When** the page renders, **Then** it shows a dedicated key-events block that summarizes major moments such as toss, wickets, milestones, innings break, chase pressure, or weather interruption.
2. **Given** a live-update page exists, **When** the editorial body is reviewed, **Then** it contains a match-development summary that is distinct from the canonical scorecard/commentary presentation.
3. **Given** no strong event content is available yet, **When** the page renders, **Then** it degrades honestly instead of pretending to be a full live blog.
4. **Given** the canonical `/cric-live/{slug}` page exists, **When** both pages are compared, **Then** the live-update page clearly owns freshness-oriented narrative intent while the canonical page keeps entity/score intent.

---

### User Story 2 - Structured Data Matches The True Freshness Surface (Priority: P1)

As a search engine, I want the page schema to reflect whether a surface is a general article, a news-style article, or a real live-update page so freshness signals are both useful and credible.

**Why this priority**: The repo currently emits generic article schema but does not yet model a stronger live-update/news distinction.

**Independent Test**: Parse JSON-LD for a sample preview page, live-update page, and result page; verify schema type and dates match the page’s actual role.

**Acceptance Scenarios**:

1. **Given** a preview or result page renders, **When** JSON-LD is inspected, **Then** it emits the appropriate article-style schema with honest `datePublished` and `dateModified`.
2. **Given** a live-update page has real update entries, **When** JSON-LD is inspected, **Then** it may emit `LiveBlogPosting` in addition to the page-level article/news schema.
3. **Given** a live-update page does not yet have real update entries, **When** JSON-LD is inspected, **Then** it does not emit fake `LiveBlogPosting`.
4. **Given** visible timestamps are shown on-page, **When** schema dates are compared, **Then** they match the visible freshness contract.

---

### User Story 3 - Freshness Timestamps Move Only On Meaningful Change (Priority: P1)

As a search engine and as a user, I want freshness timestamps to reflect actual editorial updates so the page earns trust instead of looking artificially churned.

**Why this priority**: The current opportunity is not just showing timestamps, but proving they are meaningful.

**Independent Test**: Compare two snapshots of a sample page across a no-change interval and a meaningful-change interval; verify visible `Updated` text and `dateModified` only move when the content contract says they should.

**Acceptance Scenarios**:

1. **Given** only background score polling changes a hidden field, **When** the page re-renders, **Then** visible updated time and `dateModified` do not move.
2. **Given** a meaningful live-update entry or key-event summary changes, **When** the page re-renders, **Then** visible updated time and `dateModified` do move.
3. **Given** a preview page is waiting for toss or lineup confirmation, **When** no new prematch insight is available, **Then** its freshness timestamp remains stable.
4. **Given** a result page receives the final result and later a fuller recap, **When** each meaningful update lands, **Then** the page freshness moves in a documented and limited way.

---

### User Story 4 - Keyword Ownership Is Strong Enough To Avoid Internal Cannibalization (Priority: P1)

As the team, we want explicit keyword ownership across canonical, preview, live-update, and result pages so each surface can grow without competing blindly against the others.

**Why this priority**: The report’s value only compounds if each route type has a clear job.

**Independent Test**: Review one full fixture set and verify title/H1/meta/support modules reflect the intended lane for each page type.

**Acceptance Scenarios**:

1. **Given** the canonical match page renders, **When** its SEO fields are reviewed, **Then** it remains focused on live score, scorecard, commentary, toss, and playing-XI intent.
2. **Given** the preview page renders, **When** its SEO fields are reviewed, **Then** it focuses on preview, probable XI, pitch, weather, and match build-up intent.
3. **Given** the live-update page renders, **When** its SEO fields are reviewed, **Then** it focuses on live updates, today-match, latest developments, and match progression intent.
4. **Given** the result page renders, **When** its SEO fields are reviewed, **Then** it focuses on result, highlights, recap, and follow-up scorecard intent.

---

### User Story 5 - Freshness Pages Stay Discoverable And Useful After The Live Window (Priority: P2)

As a crawler and as a user, I want live-update and result pages to remain reachable after the match so freshness work compounds into archive value instead of disappearing after the final ball.

**Why this priority**: The report’s post-match value depends on keeping these pages in the crawl graph instead of treating them as disposable live-only URLs.

**Independent Test**: Inspect a completed sample match and verify result/recap pages remain linked from archive, recent-results, series, or canonical match surfaces after live play ends.

**Acceptance Scenarios**:

1. **Given** a match is completed, **When** the result page is inspected, **Then** it remains linked from at least one archive or recent-results SSR surface.
2. **Given** a completed live-update page exists, **When** it is retained, **Then** it points users toward the result/recap and canonical scorecard rather than becoming a dead-end.
3. **Given** freshness pages are included in discovery systems, **When** sitemap policy is reviewed, **Then** retention rules for live-update versus result pages are documented clearly.

---

### User Story 6 - The Team Can Prove Freshness Performance With Real Evidence (Priority: P2)

As the team, we want lightweight observability for freshness-support pages so we can see whether crawler discovery, indexing, and impressions improve after rollout.

**Why this priority**: Without evidence, it is hard to tell whether richer freshness pages are worth ongoing editorial effort.

**Independent Test**: Review the monitoring surface or documented checks for a sample page and verify the team can track discovery and freshness readiness over time.

**Acceptance Scenarios**:

1. **Given** a sample freshness page exists, **When** operators review the monitoring workflow, **Then** they can confirm sitemap presence, SSR link presence, and current metadata state.
2. **Given** Search Console or other indexing evidence is available, **When** the team reviews freshness coverage, **Then** it can associate impressions/clicks with page type and fixture.
3. **Given** a page type underperforms, **When** the team investigates, **Then** the monitoring path makes it clear whether the problem is crawl path, metadata quality, timestamp quality, or content thinness.

## Edge Cases

- A small or low-interest fixture may not justify a live-update or result page with full enrichment; the system must prefer quality thresholds over blanket page creation.
- `LiveBlogPosting` must not be emitted for a page that only rephrases scoreboard fields.
- Key-event extraction must handle sparse commentary, delayed feeds, innings transitions, rain delays, and abandoned matches without generating misleading summaries.
- Post-match retention must not create duplicate archive loops that compete with the canonical match page.
- Observability should not depend on unstable or unsupported indexing shortcuts.

## Requirements

### Functional Requirements

- **FR-001**: This phase MUST preserve `/cric-live/{slug}` as the canonical match entity URL.
- **FR-002**: This phase MUST extend the `038` freshness-support layer rather than replacing it with a new canonical route family.
- **FR-003**: Live-update pages MUST expose a dedicated key-events or match-moments block when sufficient source data exists.
- **FR-004**: Live-update pages MUST include a materially distinct match-development summary separate from raw scorecard/commentary presentation.
- **FR-005**: The frontend structured-data layer MUST support article/news-style schema that matches the actual freshness page role.
- **FR-006**: `LiveBlogPosting` MUST only be emitted when the live-update page has real, visible update entries that justify it.
- **FR-007**: The freshness system MUST define and enforce meaningful-change rules for visible updated timestamps and `dateModified`.
- **FR-008**: The phase MUST document and implement explicit keyword ownership across canonical, preview, live-update, and result pages.
- **FR-009**: Completed-match freshness pages MUST remain discoverable through at least one SSR archive, recent-results, series, or canonical-match path according to a documented retention rule.
- **FR-010**: The phase MUST define whether a dedicated freshness/news sitemap is needed now or deliberately deferred, with a documented rationale.
- **FR-011**: The phase MUST define a verification workflow that proves raw SSR metadata, crawl-path presence, structured-data correctness, and retention behavior for sample pages.
- **FR-012**: The phase MUST define a lightweight observability model for tracking freshness page readiness and performance over time.

### Key Entities

- **Freshness Authority Layer**: The higher-trust set of content, schema, cadence, and monitoring rules that makes freshness-support pages credible.
- **Key Event Entry**: A structured match moment such as toss, wicket, milestone, innings break, review, rain delay, or winning moment that can be surfaced as a summary block and optional live-update entry.
- **Live Update Entry**: A visible incremental editorial update used to justify live-update freshness behavior and possible `LiveBlogPosting`.
- **Freshness Cadence Policy**: The rule set that decides when each page type should move visible `Updated` time and schema `dateModified`.
- **Retention Path**: The SSR link path that keeps preview, live-update, or result pages discoverable after the live window.
- **Freshness Proof Surface**: The dashboard or documented verification workflow used to validate discovery, schema, timestamps, and page readiness.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A sample live-update page exposes a visible key-events block and a distinct match-development summary.
- **SC-002**: Sample preview, live-update, and result pages emit schema types and dates that match their real page role and visible freshness state.
- **SC-003**: A no-change page snapshot does not move visible updated time or `dateModified`, while a meaningful editorial change does.
- **SC-004**: A sample fixture set shows clear, non-overlapping keyword ownership across canonical, preview, live-update, and result pages.
- **SC-005**: A completed sample match still exposes its result page through at least one retained SSR discovery path.
- **SC-006**: Operators have a documented way to verify freshness readiness and diagnose discovery or metadata regressions for sample pages.
