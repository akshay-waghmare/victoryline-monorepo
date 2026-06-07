---
description: "Task list for roadmap Phase 2: match URL lifecycle and canonical intent map"
---

# Tasks: Match URL Lifecycle and Canonical Intent Map

**Input**: Design documents from `/specs/019-match-url-lifecycle/`  
**Generated**: 2026-06-07  
**Branch**: `019-match-url-lifecycle`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Frontend canonical-policy coverage and route-audit output review.

## Phase 1: Documentation

- [x] T001 Create `specs/019-match-url-lifecycle/spec.md`
- [x] T002 Create `specs/019-match-url-lifecycle/plan.md`
- [x] T003 Create `specs/019-match-url-lifecycle/tasks.md`

## Phase 2: Canonical Policy Layer

- [x] T004 Add a shared match route-intent and canonical-policy model in the frontend SEO layer
- [x] T005 Extend match utility coverage for legacy suffix parsing and canonical route normalization in `apps/frontend/src/app/core/utils/match-utils.spec.ts`
- [x] T006 Update `apps/frontend/src/app/seo/match-seo.service.ts` to apply the canonical policy for base, child, legacy, and unresolved routes

## Phase 3: Route Normalization

- [x] T007 Update `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts` and related helpers so duplicate or multi-segment `/cric-live/*` forms normalize consistently
- [x] T008 Update `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` and any related SEO wiring to pass route intent and lifecycle context into canonical metadata generation
- [x] T009 Ensure unapproved child surfaces canonicalize to the base match URL with safe robots behavior

## Phase 4: Verification

- [x] T010 Add focused frontend verification for upcoming, live, completed, legacy, and unresolved route samples
- [x] T011 Extend `scripts/Audit-MatchSeo.ps1` or the phase verification workflow to report requested-vs-canonical route outcomes for sample match URLs
- [x] T012 Run targeted verification and record the canonical lifecycle evidence before Phase 3 begins
