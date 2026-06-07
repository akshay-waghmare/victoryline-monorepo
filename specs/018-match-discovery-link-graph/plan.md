# Implementation Plan: Match Discovery and Crawl Graph

**Branch**: `018-match-discovery-link-graph` | **Date**: 2026-06-07 | **Spec**: `specs/018-match-discovery-link-graph/spec.md`  
**Input**: Feature specification from `/specs/018-match-discovery-link-graph/spec.md`

## Summary

Strengthen Crickzen's discovery layer before deeper SEO expansion by adding explicit plain-anchor match-link clusters to home and `/matches`, centralizing canonical match-link generation in frontend utilities, teaching the sitemap service to use the live model's `lastStateUpdatedAt` freshness signal, and extending the repo audit script to verify discovery-link presence.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, Java 8, Spring Boot 2.x, PowerShell  
**Primary Dependencies**: `MatchCardViewModel`, existing `extractSlugFromUrl()` helper, Angular SSR templates, `SitemapService`, `LiveMatchesService`, `scripts/Audit-MatchSeo.ps1`  
**Storage**: None; reuse current match feed and sitemap cache  
**Testing**: Frontend utility unit tests, backend `SitemapPartitionTest`, and audit-script readback  
**Target Platform**: `apps/frontend`, `apps/backend/spring-security-jwt`, `scripts`  
**Project Type**: Monorepo web app  
**Performance Goals**: Discovery additions stay lightweight; no extra network calls in home or `/matches`; sitemap freshness remains cache-friendly  
**Constraints**: Keep `/cric-live/{slug}` as the active route family; avoid adding fake freshness; preserve current match-card navigation behavior  
**Scale/Scope**: Home page, matches list page, shared frontend match-link utilities, sitemap freshness derivation, and audit output

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | `lastmod` uses known live-update timestamps rather than invented values. |
| II. Monorepo Architecture Standards | PASS | Scope stays within frontend discovery surfaces, backend sitemap logic, and verification scripts. |
| III. REST API Design Standards | PASS | No API contract changes are required for Phase 1. |
| IV. Testing Requirements | PASS | The phase adds utility coverage, backend sitemap regression coverage, and audit proof. |
| V. Performance Standards for Live Updates | PASS | No new polling or heavy client work is introduced. |
| VI. Frontend UI/UX Standards | PASS | Discovery links are visible and compact rather than hidden technical-only markup. |

## Project Structure

### Documentation

```text
specs/018-match-discovery-link-graph/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/
├── core/utils/match-utils.ts
├── home/home.component.{ts,html,css}
├── features/matches/pages/matches-list/matches-list.component.{ts,html,css}
└── features/matches/components/match-card/match-card.component.ts

apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/
├── LiveMatchesService.java
├── SitemapService.java
└── SitemapWriter.java

apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/
└── SitemapPartitionTest.java

scripts/
└── Audit-MatchSeo.ps1
```

**Structure Decision**: Keep Phase 1 small and infrastructural. Frontend changes go into existing discovery surfaces and shared utilities; backend changes stay inside sitemap freshness derivation.

## Execution Order

1. Create the `018` spec, plan, and tasks artifacts for traceability.
2. Add shared frontend helpers for canonical match hrefs and concise link labels.
3. Render explicit direct-link clusters on home and `/matches`.
4. Update the sitemap layer to honor `lastStateUpdatedAt` for live-match `lastmod`.
5. Extend the audit script and backend tests to prove the new discovery/freshness behavior.

## Definition of Done

- Home renders a visible direct-link cluster to canonical match pages.
- `/matches` renders a visible direct-link cluster to the currently surfaced canonical match pages.
- Shared frontend helpers keep match cards and discovery surfaces aligned on href generation.
- Sitemap partitions use `lastStateUpdatedAt` when available for live canonical match URLs.
- The audit script reports internal canonical `/cric-live/` link counts and flags missing discovery links.
- Backend sitemap regression tests pass for the new `lastmod` behavior.
