---
description: "Task list for polishing the home page, match detail page, and match-page tabs"
---

# Tasks: Match Surface Polish

**Input**: Design documents from `/specs/013-match-surface-polish/`  
**Generated**: 2026-05-22  
**Branch**: `013-match-surface-polish`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Run the existing frontend build and manually verify the updated home and match-detail routes.

**Organization**: Tasks are grouped by surface so the home page, match shell, and scorecard tab polish can be implemented and checked independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Which user story this task belongs to (`US1`..`US3`)
- Include exact file paths so implementation stays anchored to the current repo structure

---

## Phase 1: Setup

**Purpose**: Capture the feature artifacts and install the requested design guidance.

- [x] T001 Create `specs/013-match-surface-polish/spec.md`
- [x] T002 Create `specs/013-match-surface-polish/plan.md`
- [x] T003 Create `specs/013-match-surface-polish/tasks.md`
- [x] T004 Verify whether `emilkowalski/skill` is already installed and install it for the repo if missing
- [x] T005 Review `.agents/skills/emil-design-eng/SKILL.md` and apply its motion/hierarchy guidance to implementation decisions

---

## Phase 2: User Story 1 - Home Page Feels More Intentional At First Glance (Priority: P1)

**Goal**: Improve first-viewport hierarchy and tab clarity on the home page without changing navigation or match data behavior.

**Independent Test**: Open `/Home` and verify the page header, summary counts, tab rail, and carousel feel clearer on mobile and desktop.

- [x] T006 [US1] Enhance the home page header and summary surface in `apps/frontend/src/app/home/home.component.html`
- [x] T007 [US1] Add the supporting home-page visual system and responsive behavior in `apps/frontend/src/app/home/home.component.css`
- [x] T008 [US1] Add any minimal helper methods or derived state needed by the new home UI in `apps/frontend/src/app/home/home.component.ts`

---

## Phase 3: User Story 2 - Match Detail Page Reads Like A Designed Match Center (Priority: P1)

**Goal**: Give the match detail page a clearer shell and more readable section states while preserving existing fetch behavior.

**Independent Test**: Open a `/cric-live/{slug}` page and verify the overview shell, commentary section, sidebar, and loading/empty states are more coherent.

- [x] T009 [US2] Replace the inline page shell and add a match overview surface in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [x] T010 [US2] Add match-shell helper methods for title/status/context fallbacks in `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [x] T011 [US2] Update the match-page visual system in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`

---

## Phase 4: User Story 3 - Match Tabs Feel Deliberate And Easier To Use (Priority: P1)

**Goal**: Improve the main match tabs and the nested innings tabs so navigation is clearer and more tactile.

**Independent Test**: Switch between Live Match, Match Info, Scorecard, and Lineups, then switch between innings inside Scorecard, and confirm active states and labels are improved.

- [x] T012 [US3] Convert the main match tabs to icon-assisted labels and improved panel wrappers in `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [x] T013 [US3] Style the Angular Material match tabs for stronger active/focus/empty-state treatment in `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- [x] T014 [US3] Add richer innings labels and summary metrics in `apps/frontend/src/app/cricket-odds/components/scorecard/scorecard.component.ts`
- [x] T015 [US3] Update the innings tab markup and panel layout in `apps/frontend/src/app/cricket-odds/components/scorecard/scorecard.component.html`
- [x] T016 [US3] Refine innings tab motion, layout, and table framing in `apps/frontend/src/app/cricket-odds/components/scorecard/scorecard.component.css`

---

## Phase 5: Validation & Cleanup

**Purpose**: Confirm the polish pass builds and the visible routes still work.

- [x] T017 Run the frontend build from `apps/frontend`
- [x] T018 Manually inspect `/Home` for layout, hierarchy, and responsiveness
- [x] T019 Manually inspect one `/cric-live/{slug}` route for shell, tabs, and scorecard usability
- [x] T020 Review changed files to ensure no unrelated code or behavior was modified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **US1, US2, US3**: Depend on Setup and can be implemented in sequence within the frontend app.
- **Validation & Cleanup**: Depends on the targeted UI work being complete.

### Parallel Opportunities

- T006-T008 are tightly related and best handled together.
- T009-T013 can be split between template and CSS once the match-shell structure is decided.
- T014-T016 can run in parallel with T012-T013 after the desired scorecard presentation is clear.

## Implementation Strategy

1. Capture the feature artifacts and confirm the requested skill is available.
2. Improve the home page first so the first-viewport hierarchy is settled.
3. Reframe the match detail shell and main tabs next.
4. Finish with scorecard innings-tab improvements.
5. Validate with a frontend build and manual route inspection.
