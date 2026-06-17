# Implementation Plan: Live Score SEO Hubs And Match Page Enrichment

**Branch**: `021-live-score-seo-hubs` | **Date**: 2026-06-18 | **Spec**: `specs/021-live-score-seo-hubs/spec.md`  
**Input**: Phase 1 SEO recovery request after Ahrefs/GSC crawl-graph and thin-content audit.

## Summary

Preserve `/cric-live/{slug}` as the canonical match URL while adding crawlable `/live-score/*` and `/cricket-schedule/*` hub pages that expose many direct match links. Enrich canonical match pages with SSR-visible pre/live/post-match sections, improve metadata templates, fix live-event JSON-LD, add Article schema, list hubs in sitemap partition output, and document SerpBear tracking keywords outside app runtime.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, Java 8, Spring Boot 2.x  
**Primary Dependencies**: `MatchesService`, `MatchCardViewModel`, `MatchSeoService`, `StructuredDataService`, `MetaTagsService`, `SitemapService`  
**Storage**: None; reuse live/upcoming/completed match feeds and sitemap generation  
**Testing**: TypeScript no-emit compile, backend sitemap tests, raw SSR HTML checks when local SSR is running  
**Target Platform**: `apps/frontend`, `apps/backend/spring-security-jwt`, `docs`  
**Performance Goals**: Hub pages reuse the shared matches stream and do not add new polling loops; server-side rendering performs one match-feed fetch through existing service behavior  
**Constraints**: Keep `/cric-live/{slug}` canonical; do not create duplicate canonical match pages under `/live-score/*`; do not emit fake LiveBlogPosting schema; keep Angular 7/TS 3.2 syntax compatibility  
**Scale/Scope**: Five required hub routes, one archive/discovery route family, match-page SEO sections, structured data, sitemap static URLs, SerpBear docs

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | Placeholders are honest and do not invent toss, XI, or score data. |
| II. Monorepo Architecture Standards | PASS | Frontend route/component additions and backend sitemap change stay in existing app boundaries. |
| III. REST API Design Standards | PASS | No API contract changes are required. |
| IV. Testing Requirements | PASS | Compile checks and sitemap regression tests cover the implementation. |
| V. Performance Standards for Live Updates | PASS | Hub pages reuse shared match fetch behavior and do not touch scraper/runtime polling. |
| VI. Frontend UI/UX Standards | PASS | New hubs are readable user pages, not hidden crawler-only link dumps. |

## Project Structure

### Documentation

```text
specs/021-live-score-seo-hubs/
├── spec.md
├── plan.md
└── tasks.md

docs/
└── serpbear-keywords.md
```

### Source Code

```text
apps/frontend/src/app/
├── features/seo-hubs/live-score-hub/
│   ├── live-score-hub.component.ts
│   ├── live-score-hub.component.html
│   └── live-score-hub.component.css
├── layouts/admin-layouts/admin-layouts.routing.ts
├── layouts/admin-layouts/admin-layouts.module.ts
├── cricket-odds/cricket-odds.component.{ts,html,css}
├── seo/match-seo.service.ts
├── seo/structured-data.service.ts
├── home/home.component.{ts,html}
├── core/layout/navbar/navbar.component.ts
└── shared/components/footer/footer.component.ts

apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/
└── SitemapService.java
```

## Execution Order

1. Create Spec Kit artifacts.
2. Fix structured data live status and add Article schema.
3. Improve match-page metadata and SSR-visible content sections.
4. Add SEO hub component/routes and route metadata.
5. Add header/footer/home crawl links and broader discovery exposure.
6. Add sitemap static hub URLs.
7. Add SerpBear keyword documentation.
8. Run TypeScript/backend checks and capture route/schema/sitemap proof.

## Definition of Done

- `/cric-live/{slug}` remains self-canonical for valid match pages.
- Required hub routes exist and are indexable hub pages, not duplicate canonical match pages.
- Hub pages and discovery/archive surfaces link to canonical `/cric-live/{slug}` URLs.
- Match page SSR includes useful pre/live/post-match sections and long-tail copy.
- Live `SportsEvent` schema emits `EventInProgress`.
- Sitemap partition output includes the new hub URLs.
- SerpBear keywords are documented outside runtime.
