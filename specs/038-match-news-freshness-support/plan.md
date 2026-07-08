# Implementation Plan: Match News Freshness Support

**Branch**: `038-match-news-freshness-support` | **Date**: 2026-06-28 | **Spec**: `specs/038-match-news-freshness-support/spec.md`
**Input**: Feature specification from `/specs/038-match-news-freshness-support/spec.md`

## Summary

Add a lightweight editorial freshness layer around high-priority matches so Crickzen can compete for freshness-heavy live-score queries without destabilizing the canonical `/cric-live/{slug}` strategy. The implementation should reuse existing news/blog inputs where possible, integrate freshness pages into the current SSR crawl graph, and keep timestamps, structured data, and link relationships honest.

## Technical Context

**Primary Goal**: Support preview, live-update, and result/highlights editorial pages that complement canonical match pages.
**Stack**:
- Angular 7 frontend under `apps/frontend`
- Spring Boot backend under `apps/backend/spring-security-jwt`
- Existing match SEO stack in `apps/frontend/src/app/seo`
- Existing news/blog inputs via `/cricket-data/news` and `/cricket-data/blog-posts`
- Existing sitemap and SEO services in backend `service/seo`

**Constraints**:
- Keep `/cric-live/{slug}` canonical stable
- Do not split `/scorecard` or `/commentary` into self-canonical freshness pages
- Do not ship thin duplicated pages with superficial timestamp churn
- Prefer SSR-visible crawl paths over hidden or client-only discovery

## What Already Exists

- Match entity SEO and lifecycle discovery in Specs `021`, `032`, `033`, `034`, `035`, `036`, and `037`
- Homepage editorial/news section
- Backend news and blog endpoints
- Sitemap generation and SEO controllers
- Article structured-data helpers in frontend

## Missing Delta This Phase Must Solve

1. Freshness-support route family and content contract
2. Internal-link rules between canonical match pages and freshness pages
3. Sitemap and SSR crawl-path exposure for freshness pages
4. Honest timestamp visibility and matching structured-data dates
5. Update cadence rules by page type

## Proposed Implementation Slices

### Slice A - Route and content contract

Define the exact route family for:
- preview
- live-update
- result/highlights

This slice should answer:
- where the pages live
- when they self-canonicalize
- how they reference the related match entity

### Slice B - Content model and mapping

Map what content can be sourced from:
- existing match data
- existing news/blog data
- editorial scaffolding and templates

This slice should explicitly prevent “match page copied into article shell” behavior.

### Slice C - Frontend templates and metadata

Add page-level templates that render:
- route-specific title and H1
- visible published/updated timestamps
- editorial intro and summary
- prominent link to canonical match page
- route-specific structured data

### Slice D - Crawl graph integration

Expose freshness pages through:
- homepage editorial block
- `/matches`
- `/live-score`
- `/cricket-schedule/today`
- `/series`
- canonical match pages
- archive/result surfaces for retention

### Slice E - Sitemap integration

Include freshness pages in sitemap coverage with a clear inclusion policy:
- high-priority only at first if needed
- no sitemap-only discovery dependence

### Slice F - Verification and cadence

Verify:
- crawl-path presence
- sitemap presence
- canonical relationships
- timestamp visibility
- JSON-LD dates
- cadence policy per page type

## File Areas Likely Involved

```text
specs/038-match-news-freshness-support/
├── spec.md
├── plan.md
└── tasks.md

apps/frontend/src/app/
├── seo/
├── home/
├── features/matches/
├── component/news.service.ts
└── component/blog-list.service.ts

apps/backend/spring-security-jwt/src/main/java/com/devglan/
├── controller/
├── service/
└── service/seo/
```

## Verification Strategy

1. Raw SSR HTML checks for sample preview, live-update, result, and canonical match pages
2. Link-graph proof from at least one SSR hub plus the canonical match page
3. Sitemap output verification for freshness pages
4. Structured-data verification for `Article` or `NewsArticle`
5. Timestamp policy review showing which page types update and when

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Thin duplicate freshness pages | Canonical confusion and weak quality | Enforce materially distinct page-purpose rules |
| Timestamp churn without content changes | Reduced Google trust in freshness | Tie `dateModified` only to meaningful editorial updates |
| Sitemap-only discovery | Late or weak crawler pickup | Require at least one SSR crawl path for every important freshness page |
| Route sprawl | Hard-to-maintain SEO graph | Start with one focused route family and one sample vertical slice |

## Recommended First Vertical Slice

Start with one real fixture and implement:
- one preview page
- one live-update page
- one result/highlights page
- link those pages from the canonical `/cric-live/{slug}` page
- expose at least one of them from homepage or `/matches`
- include them in sitemap coverage

Only expand after the first slice proves:
- crawlability
- stable canonical relationships
- honest timestamps
- non-duplicate intent
