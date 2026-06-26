---
description: "Task list for Phase 033: match intent SSR UX refinement"
---

# Tasks: Match Intent SSR UX Refinement

**Input**: Design documents from `/specs/033-match-intent-ssr-ux-refinement/`  
**Generated**: 2026-06-26  
**Branch**: `033-match-intent-ssr-ux-refinement`

## Phase 1: Documentation

- [ ] T001 Create `specs/033-match-intent-ssr-ux-refinement/spec.md`
- [ ] T002 Create `specs/033-match-intent-ssr-ux-refinement/plan.md`
- [ ] T003 Create `specs/033-match-intent-ssr-ux-refinement/tasks.md`

## Phase 2: Short-Team SEO Model Support

- [ ] T004 [P] Add short-team fields to `apps/frontend/src/app/seo/match-seo.models.ts`
- [ ] T005 [P] Update `apps/frontend/src/app/seo/match-seo.service.ts` to resolve explicit or derived short team names
- [ ] T006 [P] Update `apps/frontend/src/app/seo/match-seo.service.spec.ts` to verify readable short-name capture in metadata

## Phase 3: Match-Specific SSR Copy

- [ ] T007 [P] Update `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` helper copy so commentary, scorecard, lineups, and details all reference the exact fixture
- [ ] T008 [P] Add short-team-aware jump labels and section headings in `cricket-odds.component.ts`
- [ ] T009 [P] Update `apps/frontend/src/app/cricket-odds/cricket-odds.component.html` to use fixture-specific SSR headings and summaries
- [ ] T010 [P] Add any minimal supporting styles needed in `cricket-odds.component.css`
- [ ] T011 [P] Update `cricket-odds.component.lifecycle.spec.ts` to verify fixture-specific and short-name-aware helper output

## Phase 4: UX Guardrail

- [ ] T012 Confirm the stronger support copy remains in secondary zones and does not return to the top-layer UX path

## Phase 5: Verification

- [ ] T013 Run focused frontend TypeScript/spec verification
- [ ] T014 Rebuild or refresh the local SSR frontend stack
- [ ] T015 Fetch a sample match page in raw HTML and verify full-name and short-name commentary/scorecard/lineup intent
- [ ] T016 Repeat the raw HTML check with Googlebot-like user agents to simulate crawler visibility
- [ ] T017 Document whether the page now captures commentary, scorecard, and lineup intent more strongly without route changes
