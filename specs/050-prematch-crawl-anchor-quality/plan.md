# Implementation Plan: Prematch Crawl Anchor Quality

**Branch**: `050-prematch-crawl-anchor-quality` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

## Summary

Patch the canonical match link-label helper used by live-score and schedule hubs so sparse upcoming feed rows do not publish placeholder crawl anchors when the canonical slug already carries real fixture identity.

## Technical Context

**Language/Version**: TypeScript 3.2 / Angular 7  
**Primary Files**:

- `apps/frontend/src/app/core/utils/match-utils.ts`
- `apps/frontend/src/app/core/utils/match-utils.spec.ts`
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.ts`

**Testing**:

- Focused Jasmine spec coverage in `match-utils.spec.ts`
- TypeScript app compilation with `npx tsc --noEmit -p src/tsconfig.app.json`

## Constitution Check

- **Canonical stability**: PASS. No route change; `/cric-live/{slug}` remains the match entity.
- **Visible crawl path first**: PASS. This improves SSR anchor text on existing hubs.
- **No fake schema**: PASS. No News sitemap or NewsArticle markup is introduced.
- **Scoped blast radius**: PASS. One shared helper plus tests.
- **Evidence gate**: PASS. Source checks are complete; production/GSC outcome proof remains an explicit later gate.

## Implementation

1. Keep existing slug-derived fallback behavior for empty team fields.
2. Add placeholder detection for `TBD`, `TBC`, `Team 1`, `Team 2`, `Team A`, `Team B`, `unknown`, `null`, and `undefined`.
3. If either team label is missing or placeholder, derive both labels from the canonical slug.
4. Preserve the honest `TBD vs TBD` fallback when no usable slug exists.
5. Extend focused tests to cover placeholder strings, numbered teams, blank fields, and lifecycle labels.

## Out of Scope

- New `/news`, `/prediction`, or `/analysis` routes.
- News sitemap implementation.
- Google Indexing API.
- Production deploy.
- GSC index/ranking claims.

## Verification

- Run focused TypeScript compilation.
- Run available focused unit test path if the Angular 7 Karma environment is usable.
- Record any blocked test runner separately from successful static checks.

