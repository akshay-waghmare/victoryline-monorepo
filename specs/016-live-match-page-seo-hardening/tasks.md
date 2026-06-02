# Tasks: Live Match Page SEO Hardening

**Input**: Design documents from `/specs/016-live-match-page-seo-hardening/`  
**Prerequisites**: `plan.md`, `spec.md`

**Tests**: Targeted build and audit verification are required because this work changes live match SSR behavior.

## Phase 1: Documentation

- [ ] T001 Create spec, plan, and tasks for live match page SEO hardening in `specs/016-live-match-page-seo-hardening/`

---

## Phase 2: Foundational Route and Header Fixes

- [ ] T002 Add known-route detection and `404` status handling in `apps/frontend/server.js`
- [ ] T003 Add a wildcard Angular route for unknown pages in `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- [ ] T004 Declare the 404 component inside `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.module.ts`
- [ ] T005 Replace the dead `href="#"` recovery link in `apps/frontend/src/app/shared/components/error-404/error-404.component.ts`
- [ ] T006 Disable overlapping SSR security headers that are already provided by Caddy in `apps/frontend/server.js`

---

## Phase 3: Match Metadata and Social Preview Fixes

- [ ] T007 Add real OG image support to `apps/frontend/src/app/seo/og-images.ts`
- [ ] T008 Add `og:image`, image dimension, and `twitter:image` handling to `apps/frontend/src/app/seo/meta-tags.service.ts`
- [ ] T009 Extend `MatchSeoViewModel` and `MatchSeoService` with match social-image data in `apps/frontend/src/app/seo/match-seo.models.ts` and `apps/frontend/src/app/seo/match-seo.service.ts`
- [ ] T010 Shorten live/completed match descriptions for better SERP snippets in `apps/frontend/src/app/seo/match-seo.service.ts`

---

## Phase 4: Match JSON-LD and Above-the-Fold Cleanup

- [ ] T011 Add safe JSON-LD builders that omit undefined placeholder fields in `apps/frontend/src/app/seo/structured-data.service.ts`
- [ ] T012 Emit match JSON-LD from `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- [ ] T013 Render JSON-LD in SSR HTML from `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- [ ] T014 Stop lazy-loading above-the-fold logo images in `apps/frontend/src/app/shared/components/logo/logo.component.ts`

---

## Phase 5: Verification

- [ ] T015 Extend `scripts/Audit-MatchSeo.ps1` to flag missing OG image metadata
- [ ] T016 Generate a real bundled OG image asset under `apps/frontend/src/assets/og/`
- [ ] T017 Run frontend SSR build
- [ ] T018 Run the match SEO audit script against sampled URLs and review remaining gaps

## Implementation Strategy

1. Fix status/header correctness first because those affect crawl trust for every page.
2. Add social metadata and JSON-LD next because they are shared template wins.
3. Leave larger performance/CSS and mobile typography work for a follow-up once the indexing-signals layer is stable.
