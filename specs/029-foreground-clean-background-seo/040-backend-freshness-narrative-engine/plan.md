# Implementation Plan: Backend Freshness Narrative Engine

**Branch**: `040-backend-freshness-narrative-engine` | **Date**: 2026-06-29 | **Spec**: `specs/040-backend-freshness-narrative-engine/spec.md`  
**Input**: Feature specification from `/specs/040-backend-freshness-narrative-engine/spec.md`

## Summary

Implement a shared backend freshness narrative layer so Crickzen can turn live commentary and match state into crawlable text updates, meaningful timestamps, and better freshness signals without duplicating logic between frontend pages and sitemap generation.

## Technical Context

**Primary Goal**: Generate one backend freshness-summary contract per match that powers:
- event-to-text live updates
- key-event summaries
- honest visible freshness timestamps
- freshness-page structured data
- freshness-page sitemap `lastmod`

**Stack**:
- Spring Boot backend under `apps/backend/spring-security-jwt`
- Angular 7 frontend under `apps/frontend`
- Existing freshness pages under `apps/frontend/src/app/features/seo-hubs/match-freshness-page`
- Existing sitemap generation under `service/seo/SitemapService`

**Relevant Existing Surfaces**:
- `CricketDataService` commentary cache and transient match cache
- `CricketDataController` match-info and commentary endpoints
- `SitemapService` freshness URL generation
- frontend freshness page summary and structured data logic

**Constraints**:
- Keep `/cric-live/{slug}` canonical stable
- Do not generate fake live-blog text where source data is weak
- Keep freshness timestamps honest and aligned between frontend and sitemap
- Prefer reusing existing cached match state over building a separate content store

## Proposed Implementation Slices

### Slice A - Backend freshness summary contract

Add a backend service and DTOs that:
- read current match cache, match-info, and commentary
- extract high-confidence narrative events
- build summary text and key events
- compute a meaningful updated timestamp

Likely files:
- new DTOs under `com.devglan.dao`
- new service under `com.devglan.service` or `com.devglan.service.seo`

### Slice B - API exposure

Expose a lightweight endpoint such as:
- `/cricket-data/freshness-summary?url=...`

It should return:
- page-purpose summary text
- key events
- live-update entries
- meaningful updated timestamp

### Slice C - Frontend consumption

Update the freshness page to:
- fetch the backend summary
- render backend key events and narrative summary first
- use backend meaningful updated time for visible freshness and schema dates
- keep safe local fallbacks where needed

### Slice D - Sitemap alignment

Update `SitemapService` so freshness-support pages use the backend meaningful updated timestamp for `lastmod` where available and trustworthy.

### Slice E - Verification

Add focused tests for:
- backend event extraction
- summary generation
- sitemap `lastmod` alignment
- frontend integration remaining type-safe

## File Areas Likely Involved

```text
specs/040-backend-freshness-narrative-engine/
├── spec.md
├── plan.md
└── tasks.md

apps/backend/spring-security-jwt/src/main/java/com/devglan/
├── dao/
├── controller/CricketDataController.java
├── service/seo/SitemapService.java
└── websocket/service/CricketDataService.java

apps/frontend/src/app/
├── features/seo-hubs/match-freshness-page/
└── seo/
```

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Commentary is too sparse or messy | Weak or misleading narrative output | Prefer high-confidence event patterns and degrade honestly |
| Backend summary logic drifts from frontend rendering | Inconsistent freshness signals | Make frontend consume the shared backend contract first |
| Sitemap `lastmod` becomes noisy | Freshness trust drops | Gate it on meaningful updated timestamp only |
| Summary endpoint depends on data not always persisted | Missing output on some fixtures | Reuse cache plus existing match-info fallback path |

## Recommended Implementation Order

1. Define DTOs and backend summary service.
2. Expose the new freshness-summary API endpoint.
3. Update frontend freshness pages to consume it.
4. Align sitemap `lastmod` to backend meaningful updated time.
5. Add focused tests and run targeted verification.
