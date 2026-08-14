# Feature Specification: Crawl receipt and index selection for canonical upcoming match pages

**Feature Branch**: `051-crawl-receipt-index-selection`
**Created**: 2026-08-13
**Status**: Draft for implementation
**Input**: Make canonical upcoming match pages trustworthy before start, measure Google crawl receipt and index selection on fixed cohorts, repair venue/location SSR reliability, and test (but do not blanket-apply) NewsArticle eligibility.

## Problem statement

CrickZen can expose a 200/self-canonical/indexable match URL and still receive no timely Google crawl or index selection. The work therefore treats crawl receipt and index selection as separate outcomes from technical readiness. A valid page must be published early, linked through server-rendered hubs, included in a fresh sitemap, and measured in Google Search Console (GSC) at known times. The experiment must never convert a technical response, sitemap entry, notification, or schema-valid count into an indexing claim.

SportsEvent remains the event-facts contract. NewsArticle is an optional representation for a page that genuinely contains editorial/live-update coverage; it is not an indexing workaround.

## User scenarios & testing

### User Story 1 - Trustworthy upcoming match page (Priority: P1)

As a search crawler, I need one stable `/cric-live/{slug}` URL published 12–48 hours before start with real teams, competition, scheduled time, and venue when known, so that the page is worth discovering before the live window.

**Independent Test**: Select a source-resolved upcoming fixture and verify the normal and Googlebot responses are 200, self-canonical, `index,follow`, have one match-specific H1/title, show the schedule facts in HTML, and emit SportsEvent only when `startDate` and a non-placeholder location are both real.

**Acceptance Scenarios**:

1. **Given** a valid source fixture with a scheduled time and venue, **when** it enters the 12–48-hour cohort, **then** its canonical page is in the match sitemap and the schedule/live-score/series/team hubs contain a server-rendered team-name link.
2. **Given** a fixture with missing or placeholder venue, **when** the page is rendered, **then** the page remains honest and indexable if otherwise valid, but no fabricated Place or SportsEvent location is emitted and the row is excluded from the schema-ready denominator.
3. **Given** an opening-model row is absent, **when** the page is rendered, **then** discovery content still publishes; no unsupported probability or “who will win” claim is shown.

### User Story 2 - Reliable crawl receipt and index-selection measurement (Priority: P1)

As the SEO operator, I need to know when each fixed upcoming URL first entered the sitemap, first received a server-rendered link, was observed by Google, and was indexed, so that we can change the crawl graph based on evidence rather than wait blindly.

**Independent Test**: Run the standalone cohort monitor against the same URL identities at T−48/T−24, T−6, T−1, match start, T+6, and T+24–72 hours; verify the ledger preserves identity and records explicit GSC observations, latency, and pre-live margin.

**Acceptance Scenarios**:

1. **Given** a selected cohort URL, **when** no GSC inspection has been supplied, **then** discovery and indexing remain `pending` and are not counted as success.
2. **Given** an explicit inspection showing `Discovered` or `Indexed`, **when** it is recorded, **then** the ledger records the observation timestamp and computes sitemap-to-discovery latency.
3. **Given** an explicit inspection showing `Indexed` no later than one hour before scheduled start, **when** the T−1h checkpoint runs, **then** the URL passes the pre-live indexing outcome; `Discovered – currently not indexed` passes discovery but fails indexing.
4. **Given** three completed lifecycle cohorts, **when** each cohort has valid technical denominators and timed GSC evidence, **then** the 90% decision rule can be evaluated; before that it remains pending.

### User Story 3 - Genuine editorial coverage without schema overclaim (Priority: P2)

As an editor, I need the option to mark a match as editorial/live coverage only when the visible page contains real update prose and attribution, so that structured data accurately describes the page instead of pretending every scoreboard is a news article.

**Independent Test**: A normal upcoming score page emits the existing generic Article plus guarded SportsEvent (when valid), while a high-value non-upcoming page with at least three substantive visible updates may emit NewsArticle/LiveBlogPosting with real publication and modification times. A thin upcoming page never emits NewsArticle solely to improve indexing.

**Acceptance Scenarios**:

1. **Given** an upcoming page without article prose, **when** structured data is built, **then** NewsArticle is absent.
2. **Given** a live/completed high-value page with at least three substantive visible update bodies, author/publisher identity, and real timestamps, **when** structured data is built, **then** the gated editorial schema may be emitted and remains consistent with visible content.
3. **Given** a page that fails any editorial eligibility check, **when** structured data is built, **then** it falls back to the normal Article/SportsEvent contract without claiming NewsArticle.

## Functional requirements

- **FR-001**: The system MUST keep one stable canonical `/cric-live/{slug}` URL across upcoming, live, and completed lifecycle states.
- **FR-002**: The system MUST publish a source-resolved upcoming URL independently of an opening-model row; model absence MUST suppress unsupported probabilities, not suppress basic match facts.
- **FR-003**: The upcoming catalogue MUST retain real team names, competition/series, scheduled start, match identity, and venue when supplied by the source; literal nulls, placeholders, and guessed locations MUST be rejected.
- **FR-004**: The schedule ingestion path MUST capture venue/location from trusted schedule JSON-LD or an explicit venue/ground element and carry it through the scraper, backend catalogue, canonical snapshot, and SSR response.
- **FR-005**: The canonical SSR response MUST be bounded and deterministic: on render timeout/error it MUST return the canonical match fallback, not a generic empty shell, with 200 only for a resolved match and 404/noindex for an unresolved match.
- **FR-006**: A valid upcoming page MUST have a self-canonical URL, `index,follow`, one match-specific H1/title, visible scheduled context, and at least one server-rendered crawl link from the configured hub set.
- **FR-007**: Sitemap membership and meaningful `lastmod` MUST be recorded for every selected cohort URL; sitemap freshness MUST be measured separately from GSC outcomes.
- **FR-008**: The fixed cohort monitor MUST persist URL identity and checkpoints at T−48/T−24, T−6, T−1, start, T+6, and T+24–72 hours, including explicit GSC discovery/index observations and calculated latency.
- **FR-009**: The monitor MUST use `pending` for missing, stale, or unknown GSC evidence and MUST NOT infer discovery/indexing from HTTP 200, schema validity, sitemap inclusion, rankings, or API notification acceptance.
- **FR-010**: The experiment MUST NOT call the Google Indexing API for ordinary SportsEvent pages. Manual URL Inspection requests are limited to one or two technically valid priority URLs per cohort and are evidence collection, not an indexing guarantee.
- **FR-011**: SportsEvent JSON-LD MUST be emitted only when a trustworthy start date and non-placeholder location exist. Missing location MUST not be repaired with invented schema.
- **FR-012**: NewsArticle MUST NOT be emitted for every match. It MAY be emitted only when the page has explicit editorial eligibility: non-upcoming lifecycle, visible substantive update prose, real publication/modification timestamps, and declared author/publisher identity. LiveBlogPosting remains separately gated by substantive updates and coverage value.
- **FR-013**: The page MUST keep event facts and editorial claims distinct: no win probability, toss, XI, venue, or result may be asserted unless present in the source snapshot.
- **FR-014**: The implementation MUST expose enough logs/headers/artifacts to distinguish SSR snapshot, deterministic fallback, timeout, missing venue, and unresolved identity during verification.

## Key entities

- **Canonical match identity**: stable canonical URL/slug, source URL/key, teams, series, and lifecycle owner.
- **Upcoming cohort member**: a canonical identity selected in the 12–48-hour window with scheduled start and checkpoint timestamps.
- **Technical readiness observation**: response, canonical, robots, H1/title, visible facts, schema, sitemap, and SSR-link checks.
- **GSC outcome observation**: explicit URL Inspection or Search Console evidence with observed state (`Unknown`, `Discovered`, `Indexed`) and observed-at time.
- **Editorial eligibility**: a verifiable set of visible update prose, timestamps, author/publisher, and non-upcoming state used to gate NewsArticle.

## Edge cases

- Venue absent, literal `null`, `TBD`, `N/A`, or a match-update sentence: keep page honest; omit SportsEvent location and mark schema readiness false.
- Scheduled time missing or malformed: do not fabricate `startDate`; keep the URL out of the valid schema denominator.
- Duplicate or malformed source identity: select only the canonical source-resolved row and retain the same cohort identity across runs.
- Opening model stale/missing: publish upcoming facts and links, but suppress prediction language.
- SSR timeout or backend snapshot outage: return deterministic canonical fallback for a resolved route; return 404/noindex for unresolved identity.
- GSC inspection unavailable or URL outside the current upcoming window: retain the ledger row and wait for explicit evidence; never reset the cohort or count unknown as failure/success.
- A live update page later becomes completed: retain the same URL and update lifecycle/schema only when visible content supports it.

## Success criteria

- **SC-001**: At least 90% of selected upcoming URLs meet the technical contract before T−1h across three fixed cohorts.
- **SC-002**: At least 90% of technically valid cohort URLs have explicit GSC discovery evidence within 24 hours of first sitemap publication.
- **SC-003**: At least 90% of technically valid cohort URLs are explicitly indexed by T−1h across three cohorts before claiming the operating target is met.
- **SC-004**: The ledger reports sitemap-to-discovery, discovery-to-index, and index-to-start latency for every URL with evidence; unknown remains pending.
- **SC-005**: Venue/location and SSR contract tests pass with zero fabricated locations, zero unresolved 200 indexable match pages, and zero bare-shell timeout fallbacks.
- **SC-006**: NewsArticle is emitted only for pages that pass the editorial eligibility gate; no blanket NewsArticle migration is shipped.
