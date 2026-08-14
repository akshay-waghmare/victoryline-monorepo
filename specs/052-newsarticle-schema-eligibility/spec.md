# Feature Specification: Lifecycle-aware NewsArticle eligibility

**Feature Branch**: `052-newsarticle-schema-eligibility`
**Created**: 2026-08-13
**Status**: Implemented locally; rollout and GSC measurement pending
**Input**: Keep upcoming match pages on `Article` plus valid `SportsEvent`; allow `NewsArticle` plus `LiveBlogPosting` only for genuine live/editorial coverage; preserve the work completed in Spec 051 and record it in the wiki.

## Problem statement

CrickZen match URLs are event pages first. A scheduled match page is not automatically a news article merely because it has a title, a score shell, or JSON-LD. Treating every match as `NewsArticle` would describe the content inaccurately and would not solve Google crawl receipt or index selection. Structured data must follow the visible page and lifecycle state.

The schema policy is therefore explicit:

| Page state | Required baseline | Optional coverage schema | Prohibited shortcut |
| --- | --- | --- | --- |
| Upcoming | `Article` + `SportsEvent` only when trustworthy `startDate` and `location` exist | none | blanket `NewsArticle`, unsupported prediction, invented venue |
| Live | `Article` + valid `SportsEvent` when event facts remain trustworthy | `NewsArticle` + `LiveBlogPosting` only with genuine substantive updates | news schema with thin scoreboard text |
| Completed | `Article` + valid `SportsEvent` when event facts remain trustworthy | `NewsArticle` + `LiveBlogPosting` only when the page retains real editorial/update coverage | retroactively calling every result page news |

This is a schema correctness and experiment-isolation change, not an indexing guarantee.

## User scenarios & testing

### User Story 1 - Honest upcoming event page (Priority: P1)

As a search crawler, I need the scheduled match page to describe an upcoming sporting event and its useful schedule facts, so that schema matches the visible content before the match begins.

**Independent Test**: Build structured data for an upcoming page with real teams, start time, and venue. Assert one `Article`, one valid `SportsEvent`, and no `NewsArticle` or `LiveBlogPosting`. Repeat with missing venue and assert `SportsEvent` is omitted rather than fabricated.

**Acceptance Scenarios**:

1. **Given** an upcoming page with real `startDate` and location, **when** schemas are built, **then** `Article` and `SportsEvent` are present and `NewsArticle`/`LiveBlogPosting` are absent.
2. **Given** an upcoming page without a trustworthy venue or start date, **when** schemas are built, **then** `SportsEvent` is omitted and no placeholder location is emitted.
3. **Given** an upcoming page without an opening-model row, **when** the page is rendered, **then** schedule facts remain available while unsupported probability/editorial claims remain absent.

### User Story 2 - Genuine live/editorial coverage (Priority: P1)

As a reader and crawler, I need live update markup only when the page visibly contains real coverage, so that `NewsArticle` and `LiveBlogPosting` are defensible descriptions rather than indexing bait.

**Independent Test**: Build structured data for a non-upcoming high-value match with at least three substantive update bodies, parseable update timestamps, and a real modification time. Assert `NewsArticle` and `LiveBlogPosting` are present alongside the event facts. Remove any one eligibility condition and assert the page falls back to `Article` only.

**Acceptance Scenarios**:

1. **Given** a live or completed high-value match with three or more substantive visible updates and real timestamps, **when** schemas are built, **then** `NewsArticle` and `LiveBlogPosting` may be emitted with organization author/publisher and real dates.
2. **Given** a live match with sparse, short, synthetic, or timestamp-less updates, **when** schemas are built, **then** `NewsArticle` and `LiveBlogPosting` are absent.
3. **Given** a completed result page with no editorial update coverage, **when** schemas are built, **then** the page remains an `Article`/`SportsEvent` page and is not relabeled as news.

### User Story 3 - Crawl/index experiment remains isolated (Priority: P2)

As the SEO operator, I need to compare schema eligibility without changing the crawl graph or claiming an indexing effect, so that GSC outcomes remain interpretable.

**Independent Test**: Run the fixed cohort ledger with schema type and eligibility reason as observations, while keeping sitemap, SSR links, URL identity, and manual GSC inspection rules unchanged.

**Acceptance Scenarios**:

1. **Given** a technically valid upcoming cohort, **when** the schema policy is deployed, **then** no Google Indexing API request is made for ordinary `SportsEvent` pages.
2. **Given** a URL with `Discovered – currently not indexed`, **when** schema eligibility is recorded, **then** it remains a GSC outcome observation and is not reclassified as success.
3. **Given** a NewsArticle-eligible live page, **when** GSC is measured, **then** the result is compared only with a declared experiment cohort and not generalized to all matches.

## Functional requirements

- **FR-001**: The frontend MUST expose the schema lifecycle policy as deterministic, testable logic.
- **FR-002**: Every indexable upcoming match page MUST emit the existing generic `Article` schema and MUST NOT emit `NewsArticle` or `LiveBlogPosting`.
- **FR-003**: `SportsEvent` MUST be emitted only when both `startDate` and a trustworthy non-placeholder `location` are available; otherwise it MUST be omitted without invented values.
- **FR-004**: Live or completed pages MAY emit `NewsArticle` only when all eligibility conditions pass: non-upcoming lifecycle, high-value/editorial coverage classification, at least three substantive visible update bodies, parseable update timestamps, and a real modification timestamp.
- **FR-005**: Live or completed pages MAY emit `LiveBlogPosting` only when the existing substantive-update and coverage-value guard passes; `NewsArticle` eligibility MUST NOT weaken that guard.
- **FR-006**: An eligible `NewsArticle` MUST have a visible match-specific headline/description, organization author/publisher, real `datePublished`/`dateModified` values, and `mainEntityOfPage` pointing to the canonical URL.
- **FR-007**: A non-eligible page MUST fall back to `Article` without emitting a second competing article type.
- **FR-008**: The same canonical URL and event facts MUST remain the lifecycle owner across upcoming, live, and completed states.
- **FR-009**: Schema eligibility MUST be recorded separately from GSC discovery, crawl receipt, indexing selection, and rankings.
- **FR-010**: The implementation MUST NOT add a blanket News sitemap, call the Google Indexing API for ordinary SportsEvent pages, or claim that NewsArticle markup improves indexing without controlled GSC evidence.
- **FR-011**: Tests MUST cover upcoming valid, upcoming sparse, eligible live/editorial, sparse live, and completed non-editorial cases.

## Key entities

- **Schema policy result**: lifecycle, emitted types, eligibility boolean, and reason.
- **Editorial coverage evidence**: substantive update bodies, update timestamps, modification timestamp, headline, description, author, and publisher.
- **Event facts evidence**: source-resolved teams, scheduled start, venue/location, lifecycle status, and canonical URL.
- **GSC cohort observation**: schema types plus explicit discovery/crawl/index state and observed-at timestamp.

## Edge cases

- Missing venue or start time: omit `SportsEvent`, never invent a Place or date.
- `TBD`, `N/A`, `null`, or stale venue text: treat as missing.
- Upcoming page with toss/XI prose but no editorial update series: remain `Article`/`SportsEvent`, not `NewsArticle`.
- Live page with three short/synthetic updates: remain `Article` only.
- Real updates but missing modification timestamp: remain `Article` only.
- Completed page with final score and result but no update coverage: remain `Article`/`SportsEvent`.
- Browser hydration cannot replace valid SSR schemas with a less complete set; preserve the server-rendered event contract.

## Success criteria

- **SC-001**: 100% of sampled upcoming pages emit no `NewsArticle` or `LiveBlogPosting`.
- **SC-002**: 100% of emitted `SportsEvent` items in the sample contain trustworthy `startDate` and `location`.
- **SC-003**: 100% of emitted `NewsArticle` items satisfy the recorded editorial eligibility fields.
- **SC-004**: Schema policy tests pass for all five lifecycle/content cases.
- **SC-005**: No GSC discovery/indexing claim changes solely because a schema type was emitted; outcome requires explicit GSC evidence.
- **SC-006**: Any future indexing improvement is assessed only through the fixed cohort/timed GSC experiment from Spec 051.
