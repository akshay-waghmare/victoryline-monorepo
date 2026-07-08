# Implementation Plan: Prematch Indexing Operator Queue

**Branch**: `035-prematch-indexing-operator-queue` | **Date**: 2026-06-28 | **Spec**: `specs/035-prematch-indexing-operator-queue/spec.md`
**Input**: Feature specification from `/specs/035-prematch-indexing-operator-queue/spec.md`

## Summary

Extend the standalone SEO dashboard into an operator queue for prematch indexing decisions. The work stays local to `tools/seo-dashboard/` and does not change public routing, Search Console submission behavior, or backend/frontend runtime behavior. It adds durable first-seen tracking, full sitemap partition parsing, priority scoring, and a dedicated UI/API surface for the top manual-submission candidates.

## Technical Context

**Language/Version**: Python 3.x, vanilla JS, HTML, CSS  
**Primary Dependencies**: `requests`, Google service-account auth already used by the dashboard collector, Flask app cache layer  
**Storage**: local JSON state file under `tools/seo-dashboard/` for monitor history  
**Testing**: Python `unittest` in `tools/seo-dashboard/tests/test_collector.py`  
**Target Platform**: local operator dashboard at `tools/seo-dashboard/`  
**Project Type**: standalone internal tool inside the monorepo  
**Constraints**: no route/canonical changes, no Playwright automation, no new external service, remain honest that first-seen timestamps are dashboard observations  
**Scale/Scope**: collector, Flask API, dashboard template/JS/CSS, tests, README, and new spec docs

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Real-time data accuracy | PASS | Uses existing live/upcoming/completed feeds and current hub HTML, plus URL Inspection sampling. |
| Monorepo architecture standards | PASS | Changes stay in the dashboard tool and spec docs only. |
| Testing requirements | PASS | Add focused collector/state/scoring tests. |
| Frontend UX standards | PASS | UI work is internal-tool facing and should stay dense, readable, and action-oriented. |

## Project Structure

### Documentation

```text
specs/035-prematch-indexing-operator-queue/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
tools/seo-dashboard/
├── app.py
├── collector.py
├── README.md
├── static/
│   ├── dashboard.css
│   └── dashboard.js
├── templates/
│   └── index.html
└── tests/
    └── test_collector.py
```

## Execution Order

1. Add the durable phase docs.
2. Extend the collector with full sitemap partition parsing and a durable state file for first-seen timestamps.
3. Add queue scoring and recommendation logic on top of existing monitored rows.
4. Expose the queue through the API and dashboard response.
5. Render the queue and first-seen evidence in the UI.
6. Add focused tests for sitemap parsing, state persistence helpers, and queue scoring.
7. Run the dashboard tests locally.

## Verification Approach

- Unit tests cover the state merge and scoring logic.
- Local API output is inspected through one dashboard refresh.
- The queue is verified against at least one real upcoming production slug.

## Definition of Done

- The dashboard parses all match sitemap partitions needed for monitored rows.
- First-seen monitor timestamps persist locally across refreshes.
- The API returns a manual-submission queue and queue summary.
- The UI renders the queue with reasons, recommended actions, and first-seen evidence.
- Tests pass for the new collector logic.
