# Tasks: Query Surface Authority And Link Graph Hardening

**Input**: Design documents from `/specs/041-query-surface-authority-and-link-graph-hardening/`  
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1 - Spec foundation

- [x] T001 Create `specs/041-query-surface-authority-and-link-graph-hardening/spec.md`
- [x] T002 Create `specs/041-query-surface-authority-and-link-graph-hardening/plan.md`
- [x] T003 Create `specs/041-query-surface-authority-and-link-graph-hardening/tasks.md`

## Phase 2 - Authority contract

- [x] T004 Consolidate the query-to-surface ownership model across canonical, preview, live-update, result, matches hub, series hub, and archive surfaces.
- [x] T005 Document the backlink and linkable-asset backlog as an explicit non-code SEO workstream in the phase.

## Phase 2A - Documentation hardening

- [x] T005A Add the explicit ownership matrix to `specs/041-query-surface-authority-and-link-graph-hardening/spec.md`.
- [x] T005B Add the initial linkable-asset backlog and backlink quality guardrails to the phase docs.

## Phase 3 - Internal-link graph hardening

- [x] T006 Add a reusable freshness-support link-cluster helper that can emit multiple deduplicated support URLs from qualifying fixtures.
- [x] T007 Upgrade homepage freshness-support discovery from token single-link sampling to a richer multi-link cluster.
- [x] T008 Upgrade `/matches` freshness-support discovery from token single-link sampling to a richer multi-link cluster.
- [x] T009 Add compact preview-support links to qualifying `/series` discovery cards.

## Phase 4 - Verification

- [x] T010 Add focused automated coverage for the new support-link helper behavior.
- [x] T011 Run focused frontend TypeScript compile checks for the affected surfaces.
- [ ] T012 Verify raw SSR HTML on `/`, `/matches`, and `/series` after a frontend restart or local stack run.
- [ ] T013 Capture follow-up backlog for deeper result retention, archive surfacing, and backlink-asset rollout beyond this code slice.
