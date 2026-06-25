# Implementation Plan: Prematch SEO Discovery Fixes

**Branch**: `030-prematch-seo-discovery-fixes` | **Date**: 2026-06-25 | **Spec**: `specs/030-prematch-seo-discovery-fixes/spec.md`
**Input**: Feature specification from `/specs/030-prematch-seo-discovery-fixes/spec.md`

## Summary

Fix the five correlated root causes behind the post-May-29 SEO impression drop and the pre-match traffic gap: (1) exclude UPCOMING matches from the real-time Indexing API ping, (2) drop the SportsEvent JSON-LD block entirely when venue is TBD, (3) render two H1 elements on completed match pages, (4) submit the sitemap to GSC only once daily, and (5) emit future-dated lastmod for upcoming matches. All five are small, surgical edits across backend Java and frontend TypeScript, with no route or canonical policy changes.

## Technical Context

**Language/Version**: Java 8+ (Spring Boot), TypeScript 3.2.x (Angular 7.2.x)
**Primary Dependencies**: Google Search Console API, Google Indexing API, Spring `@Scheduled`, Angular SSR, `StructuredDataService`, `SeoCache` (Redis)
**Storage**: Redis (via `SeoCache` for indexed-slug tracking); MySQL (via `MatchRepository`); no schema changes
**Testing**: JUnit (`mvn test`) for backend, Angular unit tests (`ng test`) for frontend, plus the read-only SEO health pattern audit PowerShell script and raw production HTML inspection for end-to-end verification
**Target Platform**: `apps/backend/spring-security-jwt` (Java), `apps/frontend` (Angular SSR)
**Project Type**: Monorepo web app (backend + frontend changes)
**Performance Goals**: No new latency; the indexing scheduler already runs every 15 min and the sitemap cron is lightweight. Hourly GSC submission is 24/day vs 200,000/day quota.
**Constraints**: Do not change `/cric-live/{slug}` canonical policy or reopen Spec 023. Do not bypass `SitemapService` debounce/burst caps. Do not exceed the Indexing API daily budget (180). Do not introduce a new API surface.
**Scale/Scope**: 5 surgical edits across 5 files; ~50-80 lines of change total. Affects 2,213 sitemap match URLs and all future match pages.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | Including UPCOMING matches in the indexing ping improves real-time discovery accuracy without altering data freshness. |
| II. Monorepo Architecture Standards | PASS | Backend edits stay in `apps/backend`; frontend edits stay in `apps/frontend`; no cross-service boundary changes. |
| III. REST API Design Standards | PASS | No public API contract changes. The scheduler consumes the existing `/cricket-data/matches` endpoint already used by the sitemap. |
| IV. Testing Requirements | PASS | JUnit tests for the scheduler change and Angular unit tests for the H1/JSON-LD change are included in the task breakdown. |
| V. Performance Standards for Live Updates | PASS | Hourly GSC submission is a single lightweight API call; the indexing scheduler change adds upcoming matches to an existing 15-min loop without new polling. |
| VI. Frontend UI/UX Standards | PASS | The H1 fix improves semantic structure and accessibility (one clear page heading) without changing visual design. |

## Project Structure

### Documentation (this feature)

```text
specs/030-prematch-seo-discovery-fixes/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/backend/spring-security-jwt/src/main/java/com/devglan/
├── scheduler/
│   ├── LiveMatchIndexingScheduler.java   # US1: include UPCOMING in ping
│   └── SitemapScheduler.java             # US4: hourly cron
├── service/seo/
│   └── SitemapService.java               # US5: honest lastmod for upcoming
└── src/test/java/com/devglan/seo/
    └── LiveMatchIndexingSchedulerTest.java  # US1 tests

apps/frontend/src/app/
├── cricket-odds/
│   └── cricket-odds.component.ts          # US2: drop && location gate
├── scorecard/
│   └── scorecard.component.html           # US3: downgrade second h1 to h2
└── seo/
    └── structured-data.service.ts         # US2: already omits empty location (verify)
```

**Structure Decision**: Backend and frontend edits are independent and can be deployed separately. Backend-first rollout (US1, US4, US5) follows the `crickzen-backend-scraper-prod-rollout` skill. Frontend rollout (US2, US3) follows the `crickzen-frontend-prod-rollout` skill. The two can ship in either order, but backend-first is recommended because the indexing ping (US1) has the largest pre-match traffic impact.

## Execution Order

1. **US1 (backend)** — Include UPCOMING matches in `LiveMatchIndexingScheduler`. Change the data source from `getLiveMatchesOnly()` to `getLiveMatches()` (which returns all matches via `/cricket-data/matches`). Keep the `prioritySortValue` LIVE-first ordering. Add/update JUnit tests.
2. **US4 (backend)** — Change `SitemapScheduler` cron from `0 0 3 * * *` to `0 0 * * * *` (top of every hour). Rename the method/log messages from "daily" to "hourly". No new dependencies.
3. **US5 (backend)** — In `SitemapService.deriveLiveMatchLastMod()`, when `lastStateUpdatedAt` is absent and the match is upcoming (future `scheduledStartTime` OR a future parsed `startDate` string), use the current emit time instead of the future date. Both the `scheduledStartTime` branch and the `parseLiveMatchStartDate()` fallback are guarded so no upcoming fixture can emit a future `lastmod` regardless of which field carries the kickoff time.
4. **US2 (frontend)** — In `cricket-odds.component.ts:2976`, change `if (startDate && location)` to `if (startDate)`. Pass `location` only when available (it is already nullable in `StructuredDataService.sportsEvent()`). Add/adjust the Angular unit test to cover the no-venue case.
5. **US3 (frontend)** — In `scorecard.component.html:97`, change `<h1>Scorecard</h1>` to `<h2>Scorecard</h2>`. No other template changes. The sr-only `<h1>{{ matchSeo.h1 }}</h1>` in `cricket-odds.component.html:16` remains the single page-level H1.
6. **Verification** — Run `mvn test` (backend), `ng test` (frontend), then the SEO health pattern audit script, then raw production HTML inspection for H1 count and SportsEvent JSON-LD, then the Schema.org validator / Google Rich Results Test for a pre-match sample URL.

## Verification Approach

The Google Rich Results Test (`https://search.google.com/test/rich-results`) is a JS-rendered tool with no public API and no fetchable result payload. It cannot be automated from the CLI. Therefore verification uses:

1. **SEO health pattern audit** (`Audit-CrickzenSeoHealth.ps1`) — rerun after deploy; expects `h1=1` on all sampled match pages and zero `h1=2` failures.
2. **Raw SSR HTML inspection** — `curl` a completed match page and a pre-match (upcoming) match page; count `<h1>` tags and grep for `application/ld+json` with `SportsEvent`.
3. **Schema.org validator** (`https://validator.schema.org/`) — paste the extracted `SportsEvent` JSON-LD or submit the production URL; it is fetchable and returns a validation report.
4. **Google Rich Results Test** — manual browser check on one pre-match URL post-deploy to confirm rich-result eligibility (documented in the verification task, not automated).
5. **Backend logs** — confirm `[LiveMatchIndexer] Indexed match: {upcoming-slug}` and `[SitemapScheduler] Hourly sitemap submission SUCCESSFUL` appear in production logs.

## Definition of Done

- An UPCOMING match receives an Indexing API ping within one scheduler interval of feed discovery.
- A match page with `startDate` and no venue emits a `SportsEvent` JSON-LD block that passes the Schema.org validator.
- Completed match pages return exactly one `<h1>` in raw SSR HTML.
- The sitemap is submitted to GSC hourly (24/day), confirmed via backend logs.
- No sitemap `lastmod` for an upcoming match is in the future.
- A post-deploy SEO health pattern audit rerun shows zero `h1=2` failures and exit code 0.
- `/cric-live/{slug}` canonical policy and Spec 023 behavior are unchanged.
