---
description: "Task list for roadmap Phase 025: prematch discovery monitoring"
---

# Tasks: Prematch Discovery Monitoring

**Input**: Design documents from `/specs/025-prematch-discovery-monitoring/`  
**Generated**: 2026-06-18  
**Branch**: `025-prematch-discovery-monitoring`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Focused `tools/seo-dashboard` collector coverage, local dashboard API smoke checks, and raw production HTML audits on a 12-48 hour acceptance sample.

## Phase 1: Documentation

- [x] T001 Create `specs/025-prematch-discovery-monitoring/spec.md`
- [x] T002 Create `specs/025-prematch-discovery-monitoring/plan.md`
- [x] T003 Create `specs/025-prematch-discovery-monitoring/tasks.md`

## Phase 2: Upcoming Sample Collection

- [ ] T004 Extend `tools/seo-dashboard/collector.py` to collect upcoming fixtures and select a 12-48 hour monitoring window
- [ ] T005 Add explicit sample-window metadata with exact audit timestamps and chosen acceptance slugs
- [ ] T006 Separate upcoming prematch monitoring rows from the existing `liveMatches` payload

## Phase 3: Discovery And Completeness Proof

- [ ] T007 Add hub-coverage checks for `/`, `/matches`, `/live-score`, `/live-score/today`, `/cricket-schedule/today`, and sitemap membership
- [ ] T008 Add prematch HTML proof fields for title, description, canonical, robots, H1, FAQ, `SportsEvent`, `LiveBlogPosting`, and visible prematch context markers
- [ ] T009 Document or codify the current SSR selection behavior for live-score hubs versus homepage discovery so fallback visibility is not mistaken for feed-driven visibility

## Phase 4: Dashboard Surface

- [ ] T010 Update `tools/seo-dashboard/templates/index.html` and `tools/seo-dashboard/static/dashboard.js` to render upcoming discovery samples separately from live-match SEO health
- [ ] T011 Update `tools/seo-dashboard/static/dashboard.css` for the new prematch monitoring states and coverage badges

## Phase 5: Verification

- [ ] T012 Add focused collector tests for upcoming sample selection, hub coverage, and prematch HTML proof
- [ ] T013 Run the local dashboard API smoke test and verify the upcoming monitoring payload
- [ ] T014 Re-run the production acceptance sample audit for the June 19, 2026 Texas Super Kings vs Seattle Orcas fixture, or the next valid 12-48 hour replacement sample if that match has already started
- [ ] T015 Confirm that the phase finishes without changing `/cric-live/{slug}` canonical policy or Spec 023 behavior
