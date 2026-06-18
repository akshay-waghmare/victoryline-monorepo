# Feature Specification: Live Match SEO Dashboard

**Feature Branch**: `008-match-title-seo`  
**Created**: 2026-06-18  
**Status**: In Progress  
**Input**: Phase 2 is production verified and SEO implementation is paused for monitoring. Operators need one dashboard focused on live `/cric-live/{slug}` discovery, indexing, impressions, queries, and ranking movement.

## Current Evidence

- SerpBear is not running locally or in production. Only keyword documentation exists.
- Google Search Console and the live-match indexing scheduler are initialized in production.
- Sitemap submission runs daily and live-match indexing runs every 15 minutes.
- GSC performance can be queried with the existing service-account credentials.
- Production raw HTML auditing already proves hub and match-page crawlability.

## User Scenarios

### User Story 1 - See Live Match SEO Health

As an operator, I want to see current live match URLs with sitemap, discovery-link, canonical, indexing, impressions, clicks, CTR, and average-position signals.

### User Story 2 - See Live Match Search Performance

As an operator, I want 7-day and 14-day trends plus top `/cric-live/` pages and queries so I can detect whether live-match SEO is improving or dropping.

### User Story 3 - Track SerpBear Without Runtime Coupling

As an operator, I want the dashboard to show whether SerpBear data is configured and display imported rank data when available, without adding SerpBear to the Crickzen frontend, backend, or scraper runtime.

### User Story 4 - Recheck Production Proof

As an operator, I want a refresh action that checks production hubs, sitemap membership, indexing service status, and current live match pages.

## Requirements

- **FR-001**: Build the dashboard as a standalone monitoring tool.
- **FR-002**: Do not change public canonicals, routes, sitemap policy, or Spec 023.
- **FR-003**: Query GSC performance for `/cric-live/` pages and live-score hubs.
- **FR-004**: Show clicks, impressions, CTR, average position, top pages, top queries, and daily trend.
- **FR-005**: Read current live matches from production and compare their canonical URLs with sitemap and hub discovery links.
- **FR-006**: Show GSC/indexing scheduler status.
- **FR-007**: Check raw HTML status, H1, robots, and canonical for current live match pages.
- **FR-008**: Support optional SerpBear JSON export input.
- **FR-009**: Clearly show `Not configured` when SerpBear data is unavailable.
- **FR-010**: Cache external checks to avoid excessive GSC URL Inspection requests.
- **FR-011**: Keep credentials server-side and never expose service-account contents to the browser.

## Success Criteria

- The dashboard starts locally with one command.
- The API returns current GSC, sitemap, hub, and live-match SEO data.
- The browser renders summary cards, trends, live match table, top pages, top queries, and source status.
- Missing SerpBear data does not break the dashboard.
- No production application service is changed or restarted.
