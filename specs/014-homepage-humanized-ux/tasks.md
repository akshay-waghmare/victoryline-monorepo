---
description: "Task list for improving homepage clarity, smoothness, and human-centered flow"
---

# Tasks: Homepage Humanized UX

**Input**: Design documents from `/specs/014-homepage-humanized-ux/`  
**Generated**: 2026-06-01  
**Branch**: `014-homepage-humanized-ux`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Run the frontend build and manually inspect `/Home` locally.

## Phase 1: Setup

- [x] T001 Create `specs/014-homepage-humanized-ux/spec.md`
- [x] T002 Create `specs/014-homepage-humanized-ux/plan.md`
- [x] T003 Create `specs/014-homepage-humanized-ux/tasks.md`
- [x] T004 Review `.agents/skills/emil-design-eng/SKILL.md` and apply its hierarchy, motion, and tactile-state guidance

## Phase 2: User Story 1 - A First-Time Visitor Knows Where To Go Immediately

- [x] T005 [US1] Add hero decision-surface structure and primary/secondary match actions in `apps/frontend/src/app/home/home.component.html`
- [x] T006 [US1] Add component state for promoted matches, quick picks, and tab metadata in `apps/frontend/src/app/home/home.component.ts`
- [x] T007 [US1] Build the upgraded hero, quick-pick, and state-surface styling in `apps/frontend/src/app/home/home.component.css`

## Phase 3: User Story 2 - Repeated Visits Feel Fast And Low-Friction

- [x] T008 [US2] Replace fragile template-driven carousel state checks with explicit scroll-state handling in `apps/frontend/src/app/home/home.component.ts`
- [x] T009 [US2] Improve tab semantics, active-state clarity, and carousel affordances in `apps/frontend/src/app/home/home.component.html`
- [x] T010 [US2] Add reduced-motion-aware, short-duration transitions and accurate edge-state visuals in `apps/frontend/src/app/home/home.component.css`

## Phase 4: User Story 3 - News Supports The Match Journey

- [x] T011 [US3] Reframe the news section markup for stronger editorial structure in `apps/frontend/src/app/home/home.component.html`
- [x] T012 [US3] Refine news and fallback-story styling so the section feels intentionally integrated in `apps/frontend/src/app/home/home.component.css`

## Phase 5: Validation

- [x] T013 Run the frontend build from `apps/frontend`
- [x] T014 Manually inspect `/Home` locally for hierarchy, responsiveness, and smoothness
- [x] T015 Review changed files to ensure the pass stays scoped to the homepage work
