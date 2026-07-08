# Implementation Plan: Commentary Reading UX

**Branch**: `017-commentary-reading-ux` | **Date**: 2026-06-03 | **Spec**: `specs/017-commentary-reading-ux/spec.md`  
**Input**: Feature specification from `/specs/017-commentary-reading-ux/spec.md`

## Summary

Refine the Angular match-page commentary feed from a visually improved but still busy surface into a calmer reading tool. The implementation will preserve existing commentary data and live-update behavior while tightening hierarchy, lowering decorative noise, and making the sentence text, feed structure, and event accents feel more intuitive to human readers.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, CSS  
**Primary Dependencies**: `CricketOddsComponent`, existing commentary entry model, Angular Material icons, live match page styles  
**Storage**: None  
**Testing**: Frontend Docker rebuild plus manual local verification of a live match page  
**Target Platform**: `apps/frontend` Angular app  
**Project Type**: Monorepo web app  
**Performance Goals**: Keep live updates lightweight; reduce avoidable visual churn in a frequently revisited surface  
**Constraints**: No backend or scraper changes; preserve current commentary ordering and data contracts; keep SSR-safe behavior intact  
**Scale/Scope**: `apps/frontend/src/app/cricket-odds/*` and `specs/017-commentary-reading-ux/*`

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | No live data logic or polling changes. |
| II. Monorepo Architecture Standards | PASS | Scoped to frontend match-page files and spec artifacts. |
| III. REST API Design Standards | PASS | No API changes. |
| IV. Testing Requirements | PASS | Manual local verification plus rebuild is appropriate for this UI-only refinement. |
| V. Performance Standards for Live Updates | PASS | The plan favors calmer styling and less distracting motion on a high-frequency surface. |
| VI. Frontend UI/UX Standards | PASS | The work directly improves readability, density, and human-centered clarity. |

## Project Structure

### Documentation

```text
specs/017-commentary-reading-ux/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/cricket-odds/
├── cricket-odds.component.html
├── cricket-odds.component.css
└── cricket-odds.component.ts
```

**Structure Decision**: Keep the work inside `CricketOddsComponent`. The commentary feed already has the right data; the main gap is how the surface prioritizes text, structure, and event accents.

## Phase 0: Research & Decisions

| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|--------------|
| Design guidance | Use `emil-design-eng` as the review bar | The user explicitly requested it and the task is primarily about craft and reading comfort | Ad hoc CSS polish |
| UX focus | Prioritize reading flow over decorative distinction | Commentary is a text surface first and a state surface second | Add more color and badges |
| Layout strategy | Keep the two-column page structure intact | The user asked for commentary improvement, not a broader match-page redesign | Rebuild the whole tab panel |
| Motion strategy | Keep motion short and subtle; avoid theatrical live-feed behavior | Commentary is seen repeatedly and should not feel noisy | Larger staggered or pulsing effects |
| State treatment | Use restrained accents and denser typography | Strong states should stand out because the baseline is calm | Heavy tints on every special entry |

## Phase 1: Design

1. Reframe the commentary header so purpose, status, and reading order are obvious.
2. Reduce row chrome so the commentary sentence becomes the center of gravity.
3. Make over summaries compact separators rather than feature cards.
4. Rebalance badge sizing, numeric treatment, and text spacing for better zoom-level readability.
5. Trim motion and hover behavior so the feed feels stable on repeated visits.

## Definition of Done

- Spec, plan, and tasks exist in `specs/017-commentary-reading-ux/`.
- Commentary rows feel calmer and easier to read at normal zoom.
- Over summaries organize the feed without overpowering it.
- Event accents remain clear while the sentence text stays primary.
- The Angular frontend rebuilds and the local Docker stack serves the updated page.
