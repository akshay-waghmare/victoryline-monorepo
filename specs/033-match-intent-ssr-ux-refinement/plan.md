# Implementation Plan: Match Intent SSR UX Refinement

**Branch**: `033-match-intent-ssr-ux-refinement` | **Date**: 2026-06-26 | **Spec**: `specs/033-match-intent-ssr-ux-refinement/spec.md`  
**Input**: Feature specification from `/specs/033-match-intent-ssr-ux-refinement/spec.md`

## Summary

Refine the match-page SEO support layer after Phase 032 by making the SSR copy explicitly fixture-specific, adding short team-name capture, and keeping the UX hierarchy calm. This phase preserves one canonical `/cric-live/{slug}` page and strengthens the page's ability to answer commentary, scorecard, and lineup intent without route churn.

## Technical Context

**Language/Version**: TypeScript 3.2.x (Angular 7.2.x)  
**Primary Dependencies**: `MatchSeoService`, `MatchSeoViewModel`, `CricketOddsComponent`, Angular templates, Angular SSR  
**Storage**: None  
**Testing**: Focused TypeScript/spec checks plus raw HTML bot-style phrase verification  
**Target Platform**: `apps/frontend`  
**Project Type**: Frontend-only refinement phase  
**Constraints**: Keep the canonical strategy unchanged; do not reintroduce support-copy-first UX; keep lifecycle copy honest

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | Copy remains lifecycle-aware and honest about unavailable commentary, scorecard, or lineups. |
| II. Monorepo Architecture Standards | PASS | Work stays within the existing frontend SEO and match-page surfaces. |
| III. REST API Design Standards | PASS | No API contract changes. |
| IV. Testing Requirements | PASS | Includes focused specs and bot-style raw HTML verification. |
| V. Performance Standards for Live Updates | PASS | No new polling or heavier rendering patterns. |
| VI. Frontend UI/UX Standards | PASS | The phase explicitly protects the at-a-glance match hierarchy. |

## Project Structure

### Documentation

```text
specs/033-match-intent-ssr-ux-refinement/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/
├── seo/
│   ├── match-seo.models.ts
│   ├── match-seo.service.ts
│   └── match-seo.service.spec.ts
└── cricket-odds/
    ├── cricket-odds.component.ts
    ├── cricket-odds.component.html
    ├── cricket-odds.component.css
    └── cricket-odds.component.lifecycle.spec.ts
```

## Execution Order

1. Extend the match SEO model with short-team support.
2. Update lifecycle-aware metadata to preserve full names while capturing short-name intent safely.
3. Replace generic match-support labels with fixture-specific SSR wording in commentary, scorecard, lineups, and details surfaces.
4. Keep the support layer in secondary UI zones so the hero and first-glance score state stay primary.
5. Verify with focused specs and a bot-style raw HTML phrase check.

## Verification Approach

1. Run focused TypeScript/spec checks for SEO model and lifecycle helper logic.
2. Serve the updated frontend locally through the existing SSR stack.
3. Fetch one sample match page as a normal browser and as Googlebot-like user agents.
4. Search the raw HTML for commentary, scorecard, lineup, full-name, and short-name intent phrases.

## Risks And Mitigations

- **Risk**: Short-name capture becomes noisy in titles.
  **Mitigation**: Keep full names primary and append short names in a controlled, readable form.

- **Risk**: Support copy becomes repetitive.
  **Mitigation**: Use short names mainly where they improve section clarity and keep summaries concise.

- **Risk**: UX regresses again.
  **Mitigation**: Keep the stronger support copy inside existing secondary surfaces rather than returning it to the top visual layer.

## Definition of Done

- Match SEO view model exposes short team names.
- Metadata and SSR copy capture both full-name and short-name match intent.
- Commentary, scorecard, and lineups surfaces read as belonging to one exact fixture.
- The first visual layer remains clean and score-first.
- Bot-style raw HTML checks confirm the intended phrases are present.
