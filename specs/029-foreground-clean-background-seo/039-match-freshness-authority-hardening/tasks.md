# Tasks: Match Freshness Authority Hardening

**Input**: Design documents from `/specs/039-match-freshness-authority-hardening/`  
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1 - Schema and page-purpose hardening

- [x] T001 Extend frontend structured data support with `NewsArticle` and gated `LiveBlogPosting`.
- [x] T002 Encode explicit keyword-ownership lanes across canonical, preview, live-update, and result pages.
- [x] T003 Keep `/cric-live/{slug}` as the stable canonical handoff while enriching freshness pages.

## Phase 2 - Live-update depth and freshness trust

- [x] T004 Add visible key-events and match-development summaries to live-update pages.
- [x] T005 Gate visible `Updated` time and `dateModified` on meaningful visible change sources instead of blind churn.
- [x] T006 Keep preview and result surfaces aligned to their own update-cadence purpose.

## Phase 3 - Observability and proof

- [x] T007 Extend the SEO dashboard with freshness-page readiness monitoring for preview, live-update, and result routes.
- [x] T008 Add freshness proof checks for timestamps, schema type, key events, and canonical handoff signals.
- [x] T009 Add focused automated coverage for new schema helpers and collector proof parsing.

## Follow-up

- [ ] T010 Decide whether a dedicated freshness/news sitemap is worth adding beyond the current general sitemap coverage.
- [ ] T011 Run raw SSR HTML verification against sample local or production freshness pages after the next dashboard/frontend restart.
