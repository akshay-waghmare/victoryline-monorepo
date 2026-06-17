# Tasks: Live Score SEO Hubs And Match Page Enrichment

## Phase 0 - Spec Kit

- [x] T001 Create `spec.md` for the Phase 1 SEO recovery scope.
- [x] T002 Create `plan.md` with architecture, guardrails, and validation.
- [x] T003 Create this `tasks.md` execution checklist.

## Phase 1 - Canonical Match Page And Schema

- [x] T004 Fix `LiveEvent` schema mapping to `https://schema.org/EventInProgress`.
- [x] T005 Add Article JSON-LD for indexable match pages with headline, description, dates, author, publisher, and `mainEntityOfPage`.
- [x] T006 Improve match title/meta/H1 templates for live score today, scorecard, toss update, playing XI, and result intent.
- [x] T007 Add SSR-visible match details, tournament, date/time, venue, live score, toss, playing XI, scorecard, venue stats, team form/head-to-head, FAQ, and Hindi/Marathi long-tail sections.

## Phase 2 - Hubs And Crawl Graph

- [x] T008 Add SEO hub component for live-score, today, IPL, schedule, and archive/discovery pages.
- [x] T009 Add routes for `/live-score`, `/live-score/today`, `/live-score/ipl`, `/cricket-schedule/today`, `/cricket-schedule/ipl-2026`, and archive discovery.
- [x] T010 Add header, footer, homepage, and hub-to-hub internal links.
- [x] T011 Increase visible direct match-link exposure without relying on client-only navigation.

## Phase 3 - Sitemap And Tracking Docs

- [x] T012 Add hub URLs to `SitemapService.java` partition output and partition count.
- [x] T013 Create `docs/serpbear-keywords.md` with general, match-specific, and language-variant tracking groups.

## Phase 4 - Verification

- [x] T014 Run frontend TypeScript no-emit checks.
- [x] T015 Run backend sitemap tests or focused compile checks.
- [x] T016 Verify route HTML expectations locally where SSR can be started. Note: local match-feed proxy timed out, so hub direct match-link counts must be rechecked after prod deploy.
- [x] T017 Summarize files changed, routes added, rendered HTML checklist, sitemap proof, schema proof, remaining risks, and local/prod test steps.
