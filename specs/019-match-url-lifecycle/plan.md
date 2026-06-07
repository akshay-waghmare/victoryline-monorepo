# Implementation Plan: Match URL Lifecycle and Canonical Intent Map

**Branch**: `019-match-url-lifecycle` | **Date**: 2026-06-07 | **Spec**: `specs/019-match-url-lifecycle/spec.md`  
**Input**: Feature specification from `/specs/019-match-url-lifecycle/spec.md`

## Summary

Define and implement a shared canonical policy layer for Crickzen match routes so the base `/cric-live/{slug}` URL stays stable across the match lifecycle, legacy suffix forms collapse cleanly, and future live/commentary/scorecard/report surfaces can be introduced without fragmenting search intent.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, PowerShell  
**Primary Dependencies**: `MatchSeoService`, `MetaTagsService`, `cricLiveMatcher`, `match-utils.ts`, `CricketOddsComponent`, `scripts/Audit-MatchSeo.ps1`  
**Storage**: None; reuse existing route params, match feed data, and SSR metadata flow  
**Testing**: Frontend unit coverage for policy decisions plus route-audit readback on representative URLs  
**Target Platform**: `apps/frontend`, `scripts`  
**Project Type**: Monorepo web app  
**Performance Goals**: Canonical-policy resolution stays synchronous and lightweight; no new network fetches for route decisions  
**Constraints**: Keep `/cric-live/{slug}` as the public base route; do not create distinct indexable child pages unless the policy explicitly approves them; avoid route churn before Phase 3 and Phase 4 content work  
**Scale/Scope**: Match-route normalization, canonical metadata decisions, legacy suffix handling, and route-policy verification

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | The phase stabilizes canonical identity across live state changes instead of swapping URLs mid-match. |
| II. Monorepo Architecture Standards | PASS | Work stays inside shared SEO utilities, route matching, and frontend verification. |
| III. REST API Design Standards | PASS | No API contract changes are required for canonical policy work. |
| IV. Testing Requirements | PASS | Phase 2 adds focused route-policy and canonical-lifecycle verification. |
| V. Performance Standards for Live Updates | PASS | Canonical decisions are derived from existing route and match data only. |
| VI. Frontend UI/UX Standards | PASS | The phase is infrastructure-first and preserves the current user-facing match experience while reducing SEO ambiguity. |

## Project Structure

### Documentation

```text
specs/019-match-url-lifecycle/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/
├── seo/match-seo.service.ts
├── seo/match-seo.models.ts
├── seo/meta-tags.service.ts
├── core/utils/match-utils.ts
├── layouts/admin-layouts/admin-layouts.routing.ts
└── cricket-odds/cricket-odds.component.ts

scripts/
└── Audit-MatchSeo.ps1
```

**Structure Decision**: Keep Phase 2 focused on canonical policy and route normalization in the frontend SEO layer. Do not expand into page-content enrichment, structured data redesign, or new backend route families yet.

## Execution Order

1. Create the `019` spec, plan, and tasks artifacts for traceability.
2. Introduce a shared route-intent and canonical-policy model for base match URLs and child surfaces.
3. Update route-normalization utilities and the route matcher so legacy suffixes and multi-segment aliases resolve consistently.
4. Apply the policy in the match SEO layer so base, child, legacy, and unresolved routes produce predictable canonical and robots decisions.
5. Extend verification so representative route samples prove the lifecycle and canonical-intent map before Phase 3 begins.

## Definition of Done

- The repo has a documented canonical policy map for base match, live, commentary, scorecard, and report surfaces.
- The base `/cric-live/{slug}` URL remains canonical across upcoming, live, and completed match states.
- Legacy suffix routes and duplicate forms collapse to the approved canonical target or safe fallback.
- Unresolved routes do not emit competing indexable canonicals.
- Focused frontend verification proves canonical behavior on representative route samples.
