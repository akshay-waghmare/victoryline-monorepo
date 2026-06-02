# Implementation Plan: Live Match Page SEO Hardening

**Branch**: `008-match-title-seo` | **Date**: 2026-06-03 | **Spec**: `specs/016-live-match-page-seo-hardening/spec.md`
**Input**: Feature specification from `/specs/016-live-match-page-seo-hardening/spec.md`

## Summary

Harden the live match SSR template by fixing true 404 behavior for unknown routes, removing duplicated security headers at the Node SSR layer, upgrading match-page social metadata with a real OG image, stopping above-the-fold logo lazy loading, and emitting safe JSON-LD only from real match data.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, Node SSR runtime, Express  
**Primary Dependencies**: Angular Universal, `helmet`, Angular `Meta`/`Title`, existing match SEO services  
**Storage**: N/A  
**Testing**: Frontend SSR build plus `scripts/Audit-MatchSeo.ps1` against sampled URLs  
**Target Platform**: Node SSR frontend container behind Caddy  
**Project Type**: Web application monorepo (`apps/frontend`, `specs`, `scripts`)  
**Performance Goals**: Improve crawl quality signals without regressing live match rendering or hero behavior  
**Constraints**: No Angular upgrade, no route migration, no disruption to current `/cric-live/{slug}` canonical strategy  
**Scale/Scope**: Shared match template and SSR server behavior, not a full sitewide SEO rewrite

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | Structured data is emitted only from real match data, not placeholders. |
| II. Monorepo Architecture Standards | PASS | Changes stay in the SSR frontend and repo-local verification flow. |
| III. REST API Design Standards | PASS | No API contract changes are required. |
| IV. Testing Requirements | PASS | Verification reuses the repo audit script plus a production-style SSR build. |
| V. Performance Standards for Live Updates | PASS | Live UX stays intact; only metadata, route status handling, and a critical image loading hint change. |
| VI. Frontend UI/UX Standards | PASS | The user-facing layout remains stable; the 404 state becomes clearer. |

## Project Structure

### Documentation (this feature)

```text
specs/016-live-match-page-seo-hardening/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/frontend/
├── server.js
└── src/
    ├── app/
    │   ├── app.routing.ts
    │   ├── cricket-odds/
    │   │   ├── cricket-odds.component.ts
    │   │   └── cricket-odds.component.html
    │   ├── layouts/admin-layouts/
    │   │   ├── admin-layouts.routing.ts
    │   │   └── admin-layouts.module.ts
    │   ├── seo/
    │   │   ├── match-seo.models.ts
    │   │   ├── match-seo.service.ts
    │   │   ├── meta-tags.service.ts
    │   │   ├── og-images.ts
    │   │   └── structured-data.service.ts
    │   └── shared/components/
    │       ├── error-404/error-404.component.ts
    │       └── logo/logo.component.ts
    └── assets/
        └── og/

scripts/
└── Audit-MatchSeo.ps1
```

**Structure Decision**: Keep all fixes inside the existing frontend SEO/SSR template so one deployment improves every live match page consistently.

## Execution Order

1. Add the spec, plan, and tasks for traceability.
2. Fix unknown-route `404` handling in SSR and Angular routing.
3. Remove duplicated security headers from the Node SSR layer.
4. Improve match-page metadata and social image support.
5. Stop lazy-loading the above-the-fold logo.
6. Add match-page JSON-LD only from real match data.
7. Extend verification and run build plus sampled audit checks.

## Definition of Done

- Unknown routes render the 404 page and return `404`.
- Live match pages keep returning `200`.
- Match pages emit a real `og:image` plus Twitter image metadata.
- Match pages emit JSON-LD only when match data is real.
- Navbar logo no longer lazy-loads in above-the-fold SSR contexts.
- Audit script can flag missing OG image metadata.
