---
description: "Task list for improving commentary readability, hierarchy, and calm live-match UX"
---

# Tasks: Commentary Reading UX

**Input**: Design documents from `/specs/017-commentary-reading-ux/`  
**Generated**: 2026-06-03  
**Branch**: `017-commentary-reading-ux`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Rebuild the frontend in Docker and manually inspect a local live match page commentary feed.

## Phase 1: Setup

- [x] T001 Create `specs/017-commentary-reading-ux/spec.md`
- [x] T002 Create `specs/017-commentary-reading-ux/plan.md`
- [x] T003 Create `specs/017-commentary-reading-ux/tasks.md`
- [x] T004 Review `.agents/skills/emil-design-eng/SKILL.md` and apply its hierarchy, density, and restrained-motion guidance

## Phase 2: User Story 1 - A Match Follower Can Read The Latest Ball Instantly

- [ ] T005 [US1] Refine commentary row markup in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html` so the sentence text becomes the dominant element
- [ ] T006 [US1] Add small helper state in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` for header/status copy and cleaner row semantics where needed
- [ ] T007 [US1] Rework row, badge, and typography styling in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`

## Phase 3: User Story 2 - The Feed Explains Its Structure Without Extra Thinking

- [ ] T008 [US2] Reframe the commentary header and over-summary treatment in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T009 [US2] Tighten list density, sticky-header behavior, and separator styling in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`

## Phase 4: User Story 3 - Repeated Match Checking Feels Calm And Fast

- [ ] T010 [US3] Reduce high-frequency motion and hover noise in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- [ ] T011 [US3] Keep reduced-motion handling and completed/live state cues aligned with the calmer feed design

## Phase 5: Validation

- [ ] T012 Rebuild the frontend in the local Docker stack
- [ ] T013 Manually inspect a live match page commentary feed locally
- [ ] T014 Re-rate the commentary honestly and confirm whether the pass reaches 8/10
