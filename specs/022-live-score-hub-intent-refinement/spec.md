# Feature Specification: Live Score Hub Intent Refinement

**Feature Branch**: `008-match-title-seo`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: Phase 1 production proof showed hub pages are indexable and expose 300-380 raw `/cric-live/` links. Phase 2 should improve topical relevance without weakening crawl discovery.

## Current Evidence

- `/live-score`, `/live-score/today`, `/live-score/ipl`, `/cricket-schedule/today`, `/cricket-schedule/ipl-2026`, and `/live-score/archive` return production SSR HTML with one H1, metadata, canonical, and crawlable match links.
- The current hub implementation intentionally falls back to sitemap links during SSR to avoid match-feed timeouts.
- That fallback fixed crawl discovery, but hub pages can look too similar if each route exposes the same generic match-link set and copy.
- Competitor research shows keyword-rich live-score routes are common: ESPNcricinfo uses match URLs ending in `/live-cricket-score`, Cricbuzz uses `/live-cricket-scores/{id}/{slug}` and sibling scorecard/commentary routes, and CREX uses `/cricket-live-score/{slug}`.
- Google Indexing API must remain optional for these pages; the durable SEO strategy is SSR HTML, internal links, sitemap, Search Console, and fresh useful content.

## User Scenarios & Testing

### User Story 1 - Today Hub Matches Today Intent (Priority: P1)

As a search user looking for today's cricket scores, I want `/live-score/today` to emphasize today's live, upcoming, and recent matches instead of reading like a generic archive.

**Independent Test**: Fetch raw SSR HTML and verify the page has today-specific title, H1, intro, FAQ copy, internal hub links, and crawlable match links.

### User Story 2 - IPL Hub Matches IPL Intent (Priority: P1)

As a search user looking for IPL score intent, I want `/live-score/ipl` and `/cricket-schedule/ipl-2026` to use IPL-specific copy, FAQs, and match-link sections.

**Independent Test**: Fetch raw SSR HTML and verify IPL-specific keywords, FAQs, and direct match links are visible.

### User Story 3 - Schedule Hub Is Schedule-First (Priority: P1)

As a search user looking for today's cricket schedule, I want `/cricket-schedule/today` to foreground match time, venue, teams, tournament, and live-score links.

**Independent Test**: Fetch raw SSR HTML and verify schedule-specific headings, copy, FAQ, and match-card metadata are visible.

### User Story 4 - Operators Can Recheck Production Raw HTML (Priority: P2)

As an operator, I want a repeatable script that audits hub and match-page raw HTML after rollout so future SEO checks do not rely on manual curl snippets.

**Independent Test**: Run the script against production and verify it reports status, H1 count, title, meta description, canonical, robots, match-link count, FAQ presence, and JSON-LD presence.

## Requirements

- **FR-001**: Preserve all Phase 1 hub routes and `/cric-live/{slug}` canonical policy.
- **FR-002**: Each hub page MUST have unique H1, title, meta description, intro copy, FAQ questions, and section headings.
- **FR-003**: Hub pages MUST keep crawlable `/cric-live/` links visible in raw SSR HTML.
- **FR-004**: `/live-score/today` MUST emphasize today match live score, cricket live score today, live cricket score today, and today cricket match scorecard.
- **FR-005**: `/live-score/ipl` MUST emphasize IPL live score today, IPL scorecard, IPL match live updates, and IPL 2026 live score.
- **FR-006**: `/cricket-schedule/today` MUST emphasize cricket schedule today, today match time, today match list, and cricket fixtures today.
- **FR-007**: `/cricket-schedule/ipl-2026` MUST emphasize IPL 2026 schedule, IPL 2026 fixtures, IPL match list, and IPL live score links.
- **FR-008**: Hub-to-hub links MUST remain visible on every hub page.
- **FR-009**: Sitemap-backed fallback links MUST remain available when feed data is unavailable or too slow.
- **FR-010**: Add a production raw HTML audit script or documented command set for hub and match checks.
- **FR-011**: Keep Indexing API guidance optional and do not present it as the primary indexing mechanism for normal live-score pages.
- **FR-012**: `/live-cricket-score` MUST become a real self-canonical live cricket score hub, not the homepage.
- **FR-013**: Do not migrate match-page canonicals from `/cric-live/{slug}` to `/live-cricket-score/{slug}` in this phase; that requires a separate migration plan.

## Success Criteria

- **SC-001**: TypeScript app and server compile checks pass for the touched frontend code.
- **SC-002**: Raw HTML for each hub still contains one H1, title, meta description, canonical, index/follow, FAQ text, hub links, and `/cric-live/` links.
- **SC-003**: Hub pages expose distinct copy and FAQs rather than identical generic sections.
- **SC-004**: Production audit script can be run locally against `https://www.crickzen.com`.
