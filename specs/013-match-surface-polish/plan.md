# Implementation Plan: Match Surface Polish

**Branch**: `013-match-surface-polish` | **Date**: 2026-05-22 | **Spec**: `specs/013-match-surface-polish/spec.md`  
**Input**: Feature specification from `/specs/013-match-surface-polish/spec.md`

**Note**: This plan follows the `/speckit.plan` workflow and is paired with `/speckit.tasks` output in `tasks.md`.

## Summary

Polish the Angular frontend’s highest-traffic surfaces using the existing component structure: upgrade the `HomeComponent` header and tab rail, tighten the `CricketOddsComponent` match shell and tab presentation, and improve the embedded scorecard innings navigation. The work remains frontend-only and uses the newly installed `emil-design-eng` skill as taste guidance for visual hierarchy, restraint, motion timing, and tactile states.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, CSS  
**Primary Dependencies**: Angular Material tabs/cards/icons already in repo, existing match card and live hero components  
**Storage**: None  
**Testing**: Focused frontend build plus manual browser verification of `/Home` and `/cric-live/{slug}`  
**Target Platform**: Existing Angular frontend in `apps/frontend`  
**Project Type**: Monorepo web app  
**Performance Goals**: No new data fetches on the home page; no slower tab interactions; CSS-only polish where possible  
**Constraints**: Keep existing routing/data-fetch behavior; avoid backend or scraper changes; preserve accessibility and reduced-motion behavior; keep edits scoped to current Angular templates/styles  
**Scale/Scope**: `apps/frontend/src/app/home/*`, `apps/frontend/src/app/cricket-odds/*`, and `specs/013-match-surface-polish/*`

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | No data-source or refresh logic changes; only presentation improvements. |
| II. Monorepo Architecture Standards | PASS | Work stays inside the frontend app and spec artifacts. |
| III. REST API Design Standards | PASS | No API contract changes. |
| IV. Testing Requirements | PASS | Frontend build and targeted UI verification cover the change surface. |
| V. Performance Standards for Live Updates | PASS | No extra polling or heavier runtime logic introduced. |
| VI. Frontend UI/UX Standards | PASS | This feature directly improves hierarchy, clarity, and interaction quality. |

No constitution violations are expected.

## Project Structure

### Documentation (this feature)

```text
specs/013-match-surface-polish/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (targeted files)

```text
apps/frontend/src/app/
├── home/
│   ├── home.component.html
│   ├── home.component.css
│   └── home.component.ts
├── cricket-odds/
│   ├── cricket-odds.component.html
│   ├── cricket-odds.component.css
│   └── cricket-odds.component.ts
└── cricket-odds/components/scorecard/
    ├── scorecard.component.html
    ├── scorecard.component.css
    └── scorecard.component.ts
```

**Structure Decision**: Keep the work inside the existing page and embedded scorecard components. Do not add new routes or broad design-system abstractions for a single polish pass.

## Phase 0: Research & Decisions

| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|--------------|
| Design guidance | Use `emil-design-eng` principles | The user explicitly asked to use the installed skill for this pass | Ad hoc visual changes without a design rubric |
| Home-page scope | Improve header, summary chips, tab rail, and carousel framing | Highest visible leverage with low implementation risk | Rebuild home page wholesale, too broad |
| Match-page scope | Improve shell, context strip, tab labels, and state styling | Delivers a more coherent match-center feel without touching data flow | Rewrite page structure, too risky |
| Scorecard scope | Improve innings tab labels and summary cards | Gives users more context with minimal logic | Leave nested tabs unchanged |
| Motion strategy | Short, subtle transitions only | Matches the skill’s guidance and keeps repeated interactions fast | Larger animations, which would slow repeated use |

## Phase 1: Design

1. Add first-viewport hierarchy and count summaries to the home page.
2. Reframe the match detail page as a match-center shell with better metadata presentation.
3. Convert match tab labels to icon-assisted, clearly active tabs with improved state styling.
4. Add richer innings tab context and a compact innings summary strip inside the scorecard.
5. Validate with a frontend build and browser inspection on home and match-detail routes.

## Complexity Tracking

No constitution violations.

## Definition of Done

- Spec, plan, and tasks exist in `specs/013-match-surface-polish/`.
- Home page hierarchy is visibly improved without changing its data flow.
- Match detail shell and tabs are more readable and deliberate.
- Scorecard innings navigation carries more context than plain numbering.
- The frontend build completes successfully after the changes.
