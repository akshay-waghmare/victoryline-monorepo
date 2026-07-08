# Feature Specification: Prematch Indexing Operator Queue

**Feature Branch**: `035-prematch-indexing-operator-queue`
**Created**: 2026-06-28
**Status**: Draft
**Input**: User request: "Most are not indexed by Google and I have to submit manually. Build the right automation: a GSC inspection monitor for upcoming match URLs, a priority scorer for which 3-5 URLs deserve manual submission, and an operator dashboard showing first seen, sitemap, SSR hub, and indexed state."

## Summary

Crickzen already has the canonical route, hourly sitemap submission, and a 15-minute prematch discovery ping. The remaining operator gap is visibility: we still cannot quickly answer which upcoming URLs are healthy but still not indexed, which ones deserve manual submission, and when our monitor first saw them in feed, sitemap, hubs, or indexed state.

This phase extends the standalone SEO dashboard so it becomes an operator queue instead of a passive report.

## Current Evidence

1. `tools/seo-dashboard/collector.py` already samples live, upcoming, and recent match URLs and can inspect a subset through the URL Inspection API.
2. The current dashboard shows bucketed states like `unknownToGoogle` and `discoveredButNotIndexed`, but it does not rank the rows into an actionable manual-submission shortlist.
3. The current dashboard shows current sitemap and hub presence, but it does not persist "first seen by monitor" timestamps over time.
4. The current dashboard only fetches `sitemaps/sitemap-matches-0001.xml`, so it cannot reliably attribute sitemap presence or URL-level `lastmod` across all partitions.
5. Operators still fall back to manual Search Console submissions because the dashboard does not clearly separate:
   - healthy upcoming URLs that are safe manual-submit candidates
   - discovery failures that need product fixes
   - already indexed URLs that just need monitoring

## User Scenarios & Testing

### User Story 1 - Upcoming inspection monitor with durable first-seen signals (Priority: P1)

As an operator, I want the prematch monitor to persist the first time it saw a match in feed, sitemap, hub HTML, and indexed state so I can prove whether Google discovered the page early enough before start.

**Independent Test**: Run the collector twice with a fixture that is present in the sitemap and hubs. The first run should stamp the state file; the second run should preserve those first-seen timestamps instead of overwriting them.

**Acceptance Scenarios**:

1. **Given** a monitored upcoming URL appears in the feed, **When** the collector runs, **Then** the row records `firstSeenInFeedAt` if it was not already known.
2. **Given** a monitored URL appears in a sitemap partition, **When** the collector runs, **Then** the row records `firstSeenInSitemapAt` and the URL-level sitemap `lastmod`.
3. **Given** a monitored URL is linked by real SSR hubs, **When** the collector runs, **Then** the row records `firstSeenInHubsAt`.
4. **Given** a monitored URL later becomes indexed or gains impressions, **When** the collector runs, **Then** the row records `firstSeenIndexedAt` without erasing older discovery timestamps.

### User Story 2 - Manual submission priority queue (Priority: P1)

As an operator, I want a ranked shortlist of only 3-5 URLs that deserve manual submission so I stop blindly submitting many upcoming matches.

**Independent Test**: Feed the scorer a mix of healthy indexed URLs, broken raw-HTML URLs, and healthy upcoming URLs that are still `unknown` or `discoveredButNotIndexed`. The shortlist should keep only the healthy non-indexed high-priority URLs.

**Acceptance Scenarios**:

1. **Given** an upcoming URL starts soon, is healthy, and is still `unknownToGoogle`, **When** the scorer runs, **Then** it receives a high manual-submission priority.
2. **Given** an upcoming URL is already indexed or has impressions, **When** the scorer runs, **Then** it is not placed in the urgent manual queue.
3. **Given** a URL has broken canonicals, `noindex`, or missing crawl-path support, **When** the scorer runs, **Then** it is labeled as a fix-product issue rather than a manual-submit candidate.
4. **Given** more than five URLs are eligible, **When** the scorer runs, **Then** the queue returns the top five ranked rows with reasons and recommended action.

### User Story 3 - Operator dashboard and API surface (Priority: P2)

As an operator, I want the dashboard and API to expose the queue directly so I can act on the urgent URLs without reading every table row.

**Independent Test**: Call the dashboard API and verify it returns `manualSubmissionQueue` plus summary counts. Open the UI and verify the queue renders reasons, first-seen timestamps, and recommended action.

**Acceptance Scenarios**:

1. **Given** the dashboard API returns monitored rows, **When** the response is built, **Then** it includes a `manualSubmissionQueue` array and a queue summary.
2. **Given** the UI loads the dashboard data, **When** there are urgent candidates, **Then** the page shows a dedicated operator queue section with at most five rows.
3. **Given** there are no urgent candidates, **When** the UI loads, **Then** the queue section explains that sitemap and monitor flow is sufficient for the current sample set.
4. **Given** a row has first-seen timestamps, **When** the UI renders it, **Then** those timestamps are visible without opening raw JSON.

## Requirements

### Functional Requirements

- **FR-001**: The dashboard collector MUST fetch the sitemap index and all match sitemap partitions, not only `sitemap-matches-0001.xml`.
- **FR-002**: The collector MUST derive URL-level sitemap presence and sitemap `lastmod` for monitored URLs.
- **FR-003**: The collector MUST persist row-level first-seen timestamps to a durable local state file.
- **FR-004**: The persisted state MUST include, at minimum, `firstSeenInFeedAt`, `firstSeenInSitemapAt`, `firstSeenInHubsAt`, and `firstSeenIndexedAt` when observed.
- **FR-005**: The collector MUST calculate a manual-submission priority score for monitored URLs.
- **FR-006**: The scorer MUST exclude URLs that are already indexed or impression-earning from the urgent manual-submission queue.
- **FR-007**: The scorer MUST downgrade URLs with broken raw-HTML health into a fix-product bucket instead of a manual-submit queue.
- **FR-008**: The dashboard API MUST expose `manualSubmissionQueue` and queue summary metadata.
- **FR-009**: The dashboard UI MUST render the manual queue, queue reasons, recommended action, and first-seen timestamps.
- **FR-010**: The implementation MUST remain honest about local state: first-seen timestamps are "first seen by this monitor," not authoritative historical Google discovery timestamps.

## Key Entities

- **DashboardHistoryState**: Durable local JSON state keyed by canonical URL that tracks first-seen timestamps observed by the dashboard.
- **ManualSubmissionCandidate**: Monitored match row plus score, reasons, and recommended action.
- **SitemapMatchEntry**: URL plus URL-level `lastmod` parsed from the sitemap partitions.
- **OperatorQueueSummary**: Counts for urgent manual-submit candidates, fix-product issues, and monitor-only URLs.

## Success Criteria

- **SC-001**: The dashboard persists and reuses first-seen timestamps across refreshes instead of recomputing them from scratch.
- **SC-002**: The dashboard returns a ranked manual-submission queue capped at five URLs.
- **SC-003**: Every queued URL includes a reason list and recommended action.
- **SC-004**: The queue excludes URLs that already have indexing/impression proof.
- **SC-005**: The operator can identify, from one dashboard screen, whether a URL needs manual submission, product fixes, or simple monitoring.
