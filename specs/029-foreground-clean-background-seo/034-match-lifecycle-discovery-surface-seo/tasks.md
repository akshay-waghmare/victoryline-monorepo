---
description: "Task list for Phase 034: match lifecycle discovery and surface SEO"
---

# Tasks: Match Lifecycle Discovery And Surface SEO

**Input**: Design documents from `/specs/034-match-lifecycle-discovery-surface-seo/`
**Generated**: 2026-06-27
**Branch**: `034-match-lifecycle-discovery-surface-seo`

**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Documentation

- [ ] T001 Create `specs/034-match-lifecycle-discovery-surface-seo/spec.md`
- [ ] T002 Create `specs/034-match-lifecycle-discovery-surface-seo/plan.md`
- [ ] T003 Create `specs/034-match-lifecycle-discovery-surface-seo/tasks.md`

## Phase 2: Lifecycle Discovery Contract

- [ ] T004 Define the lifecycle sample rules for `upcoming` (12-48 hours), `live`, and `recent completed` in the frontend discovery helpers
- [ ] T005 [P] Review `apps/frontend/src/app/core/utils/match-utils.ts` and related selection helpers for the strongest existing lifecycle windows and note any missing helpers needed for archive/result retention
- [ ] T006 [P] Add or refine lifecycle helper coverage so homepage, `/matches`, and hub pages can request explicit upcoming, live, and completed discovery buckets
- [ ] T007 [P] Define how reliable series context is detected so `/series` can be included honestly as a lightweight intent node during this phase

## Phase 3: Homepage And Matches Discovery Graph

- [ ] T008 [P] Update `apps/frontend/src/app/home/home.component.ts` to keep explicit lifecycle discovery buckets for upcoming, live, and completed sample URLs
- [ ] T009 [P] Update `apps/frontend/src/app/home/home.component.html` so the SSR HTML exposes stable crawlable links for those lifecycle buckets
- [ ] T010 [P] Update `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts` to keep lifecycle-aware discovery sets and result retention visible in SSR
- [ ] T011 [P] Update `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.html` so the results and archive paths remain crawlable after completion
- [ ] T012 [P] Review homepage and `/matches` support links so they strengthen the limited lifecycle entity graph, including the current `/series` surface where reliable

## Phase 4: Hub Lifecycle Coverage

- [ ] T013 [P] Refine `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.ts` so each hub has a clear lifecycle role for upcoming, live, completed, and archive coverage
- [ ] T014 [P] Update `live-score-hub.component.html` to expose the lifecycle buckets in raw SSR HTML without turning the hub into a generic dump
- [ ] T015 [P] Confirm `/live-score/archive` continues to retain completed canonical match links in SSR HTML
- [ ] T016 [P] Verify `/cricket-schedule/today` remains the strongest prematch hub and document any additional discovery hub that should also expose the 12-48 hour sample

## Phase 5: Hub Structured Data And Breadcrumb Fixes

- [ ] T017 [P] Extend `apps/frontend/src/app/seo/structured-data.service.ts` with the minimal schema helpers needed for hub pages, such as breadcrumb, FAQ, or collection/item-list support
- [ ] T018 [P] Add structured-data emission to homepage and `/matches` so those pages no longer ship with zero JSON-LD
- [ ] T019 [P] Add structured-data emission to lifecycle hubs under `live-score-hub.component.ts` so `/live-score`, `/live-cricket-score`, and `/cricket-schedule/today` no longer ship with zero JSON-LD
- [ ] T020 [P] Fix breadcrumb semantics on hub and canonical match pages so they use only real reachable destinations in this phase
- [ ] T021 [P] Add lightweight `/series` metadata, internal links, or intent cues that the current `series-page` can honestly support
- [ ] T022 [P] Ensure hub structured data reflects only visible content and does not create fake event or child-page semantics

## Phase 6: Canonical Match Surface SEO

- [ ] T023 [P] Review `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` support-copy helpers for match info, scorecard, and lineups against the new lifecycle spec
- [ ] T024 [P] Strengthen fixture-specific match-info support copy and headings in `cricket-odds.component.ts` and `cricket-odds.component.html`
- [ ] T025 [P] Strengthen fixture-specific scorecard support copy and headings in `cricket-odds.component.ts` and `cricket-odds.component.html`
- [ ] T026 [P] Strengthen fixture-specific lineups support copy and headings in `cricket-odds.component.ts` and `cricket-odds.component.html`
- [ ] T027 [P] Update match-page support links and breadcrumbs so they connect back into real lifecycle hubs, archive paths, and the current `/series` surface where reliable
- [ ] T028 [P] Keep all three surfaces honest when the underlying data is not yet available

## Phase 7: Verification And Audit

- [ ] T029 Update `scripts/Audit-MatchSeo.ps1` or add a companion lifecycle audit path so sampled upcoming, live, and completed URLs report hub coverage, breadcrumb validity, series-link behavior, and section-intent proof
- [ ] T030 [P] Extend `tools/seo-dashboard/collector.py` only if needed to separate lifecycle discovery proof from generic live-match checks
- [ ] T031 Run focused frontend verification for the changed files
- [ ] T032 Run local SSR raw HTML checks for homepage, `/matches`, `/live-score`, `/live-cricket-score`, `/cricket-schedule/today`, `/live-score/archive`, and `/series`
- [ ] T033 Run local SSR raw HTML checks for one upcoming, one live, and one completed canonical match URL
- [ ] T034 Confirm sampled hub pages emit non-zero JSON-LD after the implementation
- [ ] T035 Confirm sampled breadcrumbs and support links use only real lifecycle destinations and honest `/series` paths
- [ ] T036 Confirm sampled canonical match pages expose fixture-specific match-info, scorecard, and lineups intent in raw SSR HTML
- [ ] T037 Re-run the production lifecycle checks after rollout and document which hubs expose each sampled URL before start, during live, and after completion

## Notes

- Keep `/cric-live/{slug}` canonical throughout this phase.
- Do not make scorecard, lineups, commentary, or match-details child routes self-canonical here.
- Include `/series` in this phase as a lightweight intent and internal-link surface, but do not block the rollout on full series-page completion.
