---
description: "Task list for Phase 035: prematch indexing operator queue"
---

# Tasks: Prematch Indexing Operator Queue

**Input**: Design documents from `/specs/035-prematch-indexing-operator-queue/`  
**Generated**: 2026-06-28  
**Branch**: `035-prematch-indexing-operator-queue`

## Phase 1: Documentation

- [x] T001 Create `specs/035-prematch-indexing-operator-queue/spec.md`
- [x] T002 Create `specs/035-prematch-indexing-operator-queue/plan.md`
- [x] T003 Create `specs/035-prematch-indexing-operator-queue/tasks.md`

## Phase 2: Collector Foundations

- [x] T004 Parse the sitemap index and match partitions in `tools/seo-dashboard/collector.py`
- [x] T005 Add URL-level sitemap `lastmod` extraction for monitored rows
- [x] T006 Add durable local dashboard history state helpers for first-seen timestamps

## Phase 3: Scoring And Queue

- [x] T007 Add manual-submission scoring logic in `tools/seo-dashboard/collector.py`
- [x] T008 Add recommendation buckets such as `manual_submit`, `fix_product`, and `monitor`
- [x] T009 Expose `manualSubmissionQueue` and queue summary in the dashboard payload

## Phase 4: Dashboard UI

- [x] T010 Update `tools/seo-dashboard/templates/index.html` with an operator queue section
- [x] T011 Update `tools/seo-dashboard/static/dashboard.js` to render queue rows, reasons, and first-seen evidence
- [x] T012 Update `tools/seo-dashboard/static/dashboard.css` for queue styling
- [x] T013 Update `tools/seo-dashboard/app.py` if a dedicated queue API endpoint is useful

## Phase 5: Tests And Docs

- [x] T014 Extend `tools/seo-dashboard/tests/test_collector.py` with sitemap/state/scoring tests
- [x] T015 Update `tools/seo-dashboard/README.md` with queue and state-file behavior
- [x] T016 Run the dashboard collector tests locally
