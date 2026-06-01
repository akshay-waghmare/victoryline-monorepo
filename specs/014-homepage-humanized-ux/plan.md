# Implementation Plan: Homepage Humanized UX

**Branch**: `014-homepage-humanized-ux` | **Date**: 2026-06-01 | **Spec**: `specs/014-homepage-humanized-ux/spec.md`  
**Input**: Feature specification from `/specs/014-homepage-humanized-ux/spec.md`

## Summary

Upgrade the Angular `HomeComponent` from a visually polished dashboard into a clearer match-entry surface. The implementation will preserve the existing SSR-aware match and news data flow while improving first-viewport decision making, reducing template-driven friction, and tightening interaction behavior around tabs, carousel controls, and page states.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, CSS  
**Primary Dependencies**: Existing home page services, match card component, Angular router, Angular SSR setup  
**Storage**: None  
**Testing**: Frontend build plus local manual verification of `/Home` in browser  
**Target Platform**: `apps/frontend` Angular app  
**Project Type**: Monorepo web app  
**Performance Goals**: Keep current data calls; reduce unnecessary template method work; maintain fast repeated interactions  
**Constraints**: No backend or scraper changes; preserve current routes and service contracts; keep SSR-safe behavior for browser-only logic  
**Scale/Scope**: `apps/frontend/src/app/home/*` and `specs/014-homepage-humanized-ux/*`

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | No data contract or refresh behavior changes. |
| II. Monorepo Architecture Standards | PASS | Scoped to frontend home-page files and spec artifacts. |
| III. REST API Design Standards | PASS | No API changes. |
| IV. Testing Requirements | PASS | Frontend build and manual local route verification fit the scope. |
| V. Performance Standards for Live Updates | PASS | Work reduces UI friction without adding requests or heavier polling. |
| VI. Frontend UI/UX Standards | PASS | The feature directly targets clarity, responsiveness, and human-centered navigation. |

## Project Structure

### Documentation

```text
specs/014-homepage-humanized-ux/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/home/
├── home.component.ts
├── home.component.html
└── home.component.css
```

**Structure Decision**: Keep the work fully inside `HomeComponent`. This page already has the needed data; the main gap is how the data is framed and how the interactions behave.

## Phase 0: Research & Decisions

| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|--------------|
| Design guidance | Use `emil-design-eng` as the taste bar | The user explicitly asked for it and the repo already used it for other polish work | Purely ad hoc styling |
| UX focus | Emphasize next-action clarity over decorative upgrades | The page needs better guidance, not just shinier cards | Another broad visual reskin |
| Performance focus | Replace repeated template methods and fragile DOM reads with derived state | Helps repeated interactions feel smoother and keeps SSR safer | Leave logic embedded in template calls |
| News strategy | Keep news but make it editorially calmer | News should support the score journey, not compete with it | Remove or fully redesign news module |
| Motion strategy | Use short, subtle transitions only | The home page is a high-frequency surface | Larger animations or theatrical effects |

## Phase 1: Design

1. Reframe the hero into a decision surface with one promoted match action and quick secondary picks.
2. Improve the match rail context so the user understands what is shown and why.
3. Make carousel edge states accurate and lightweight through explicit component state.
4. Redesign loading, empty, and error states so they feel like part of the same product.
5. Tighten the news block so it reads as a curated continuation of the match journey.

## Definition of Done

- Spec, plan, and tasks exist in `specs/014-homepage-humanized-ux/`.
- The home page offers a clear primary match action above the fold.
- Tabs and carousel controls feel smoother and reflect real state.
- The news section looks intentionally integrated.
- The Angular frontend build succeeds after the changes.
