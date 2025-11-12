# Tasks: SEO Optimization for Crickzen

Feature: 003-seo-optimization
Spec: specs/003-seo-optimization/spec.md
Plan: specs/003-seo-optimization/plan.md

This file lists executable tasks grouped by phases and user stories. Each task uses the strict checklist format.

## Phase 1 — Setup

Goal: Establish scaffolding, configs, and CI budgets to support implementation.

- [X] T001 Create SSR entry file apps/frontend/server.ts
- [X] T002 Wire SSR Express adapter and helmet in apps/frontend/server.ts
- [X] T003 Add SEO module scaffold apps/frontend/src/app/seo/seo.module.ts
- [X] T004 Add MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [X] T005 Add StructuredDataService apps/frontend/src/app/seo/structured-data.service.ts
- [X] T006 Add hydration error logger utility apps/frontend/src/app/seo/hydration-logger.ts
- [X] T007 Add Lighthouse config .lighthouserc.json
- [X] T008 Add Lighthouse CI workflow .github/workflows/lighthouse.yml
- [X] T009 Add axe-core accessibility script tests/frontend/accessibility/axe-smoke.spec.ts
- [X] T010 Add performance check script .github/workflows/ttfb-k6.yml
- [X] T011 Update frontend package scripts apps/frontend/package.json
- [X] T012 Prepare backend seo package directory apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/.keep
- [X] T013 Prepare backend seo service directory apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/.keep
- [X] T014 Prepare backend seo resources apps/backend/spring-security-jwt/src/main/resources/seo/.keep

## Phase 2 — Foundational

Goal: Implement shared services and endpoints that all stories depend on.

- [X] T015 Implement RobotsController apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/RobotsController.java
- [X] T016 Implement SitemapService with debounce + burst cap apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java
- [X] T017 Implement SitemapController (API XML) apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/SitemapController.java
- [X] T018 Implement public sitemap index handler (/sitemap.xml) apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/PublicSitemapController.java
- [X] T019 Configure static mapping for /sitemaps/*.xml.gz apps/backend/spring-security-jwt/src/main/java/com/devglan/config/StaticResourceConfig.java
- [X] T020 Implement SeoMetadataController (debug) apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/SeoMetadataController.java
- [X] T021 Implement StructuredDataController (debug JSON-LD) apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/StructuredDataController.java
- [X] T022 Add sitemap file writer with ISO <lastmod> apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapWriter.java
- [X] T023 Add gzip index/partition outputs apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/GzipWriter.java
- [X] T024 Add sitemap storage directory apps/backend/spring-security-jwt/src/main/resources/public/sitemaps/.keep
- [X] T025 Add robots policy template apps/backend/spring-security-jwt/src/main/resources/seo/robots.txt
- [X] T026 Add canonical host constant apps/backend/spring-security-jwt/src/main/java/com/devglan/config/seo/SeoConstants.java
- [X] T027 Add Redis cache wrapper apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SeoCache.java
- [X] T028 Configure CORS/cache headers for SEO endpoints apps/backend/spring-security-jwt/src/main/java/com/devglan/config/seo/WebConfig.java
- [X] T029 Add SSR cache headers per state in server apps/frontend/server.ts
- [X] T030 Wire hydration error logging in Angular bootstrap apps/frontend/src/main.ts

## Phase 3 — User Story 1 (P1): Find matches via search

Story goal: Match pages are crawlable with correct metadata and structured data to enable rich results.
Independent test: Validate SportsEvent JSON-LD in Rich Results tool; verify canonical and breadcrumbs.

- [X] T031 [US1] Add match SSR route handler apps/frontend/server.ts
- [X] T032 [P] [US1] Implement match metadata in MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [X] T033 [P] [US1] Implement SportsEvent builder apps/frontend/src/app/seo/structured-data.service.ts
- [X] T034 [US1] Inject BreadcrumbList on match pages apps/frontend/src/app/seo/structured-data.service.ts
- [X] T035 [US1] Ensure canonical uses https://www.crickzen.com in SSR apps/frontend/src/app/seo/meta-tags.service.ts
- [X] T036 [US1] Implement JSON-LD snapshot test tests/frontend/seo/jsonld-match.spec.ts
- [X] T037 [US1] Implement SitemapEntry generator for matches apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java
- [X] T038 [US1] Add match URL rule (tournament/season/teams/format/date) apps/frontend/src/app/seo/url-utils.ts

## Phase 4 — User Story 2 (P1): Shareable previews on social

Story goal: Player, team, and match links render correct Open Graph/Twitter previews.
Independent test: Facebook/Twitter validators show correct title/description/image.

- [X] T039 [US2] Implement OG/Twitter tags in MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [X] T040 [P] [US2] Add static OG images mapping apps/frontend/src/app/seo/og-images.ts
- [X] T041 [US2] Implement /api/v1/seo/og-image (stub 202) apps/backend/spring-security-jwt/src/main/java/com/devglan/controller/seo/OgImageController.java
- [X] T042 [US2] Validate 1200x630 and safe margins apps/frontend/src/app/seo/og-images.ts
- [X] T043 [US2] Add social preview e2e smoke test tests/frontend/seo/social-preview.spec.ts

## Phase 5 — User Story 3 (P2): Fast, stable pages

Story goal: Meet performance budgets and stability targets.
Independent test: Lighthouse CI budgets pass on match/team/player routes; TTFB p95 ≤ 600ms.

- [X] T044 [US3] Add resource hints (preconnect/dns-prefetch) apps/frontend/src/index.html
- [X] T045 [P] [US3] Defer below-the-fold media apps/frontend/src/app/app.module.ts
- [X] T046 [US3] Reserve image aspect ratios to reduce CLS apps/frontend/src/styles.scss
- [X] T047 [US3] Configure SSR caching TTL by state apps/frontend/server.ts
- [X] T048 [US3] Add Lighthouse budgets in .lighthouserc.json
- [X] T049 [US3] Add TTFB check to CI .github/workflows/ttfb-k6.yml

## Phase 6 — User Story 4 (P2): Mobile-first usability

Story goal: Mobile layout and interactions meet usability standards.
Independent test: Mobile-friendly checks and axe-core assertions pass.

- [X] T050 [US4] Ensure viewport and base font sizes apps/frontend/src/index.html
- [X] T051 [P] [US4] Adjust tap target sizes in CSS apps/frontend/src/styles.scss
- [X] T052 [US4] Add axe-core assertions tests/frontend/accessibility/axe-smoke.spec.ts

## Phase 7 — User Story 5 (P3): Fresh content is discovered quickly

Story goal: Real-time sitemap updates with partitioning, ISO lastmod, and canonicals.
Independent test: /sitemap.xml and /sitemaps/*.xml serve correct <loc> and <lastmod>; gzip handled by edge proxy if needed.

- [X] T053 [US5] Wire publish/update event hook to SitemapService apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java
- [X] T054 [P] [US5] Implement debounce (5s) and cap (≤30 writes/min) apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java
- [X] T055 [US5] Generate sitemap index with canonical host apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapWriter.java
- [X] T056 [US5] Generate partition files with URL capping & slicing apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java
- [X] T057 [US5] Add comprehensive partition tests (6 scenarios) apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/SitemapPartitionTest.java

## Phase 8 — Live → Final canonical handoff ✅

Story goal: Preserve live page shares; consolidate authority post-completion.
Independent test: Live page canonical points to final; indexing flips to noindex after ~7 days.

- [X] T058 [US1] Add live→final canonical logic (MetaTagsService + /cric-live SSR route)
- [X] T059 [US1] Add LiveBannerComponent with rel=canonical link to final URL
- [X] T060 [US1] Add RobotsScheduler @Scheduled job (daily 3 AM, 7-day grace period)

## Final Phase — Polish & Cross-Cutting

- [ ] T061 Remove Victory Line references in docs .github/copilot-instructions.md
- [ ] T062 Add quickstart cross-checks to CI .github/workflows/lighthouse.yml
- [ ] T063 Add OpenAPI reference link in README README.md
- [ ] T064 Update sitemap path in robots template apps/backend/spring-security-jwt/src/main/resources/seo/robots.txt
- [ ] T065 Add error handling and CSR fallback guard apps/frontend/server.ts

## Dependencies (Story Order)

US1 → US2 → US3/US4 (parallel) → US5 → Handoff/Polish

- US1 depends on Setup + Foundational
- US2 depends on US1 (uses metadata services)
- US3, US4 depend on US1/US2 (pages exist to optimize)
- US5 depends on Foundational sitemap services

## Parallel Execution Examples

- T032 and T033 can proceed in parallel ([P]) — independent files in frontend SEO services.
- T040 and T041 in parallel ([P]) — frontend OG mapping vs backend stub.
- T045 and T051 in parallel ([P]) — CSS/media tweaks separate from routing.
- T054 can run while T055/T056 are being reviewed ([P]) — debounce/cap logic independent.

## Implementation Strategy

- Deliver MVP with US1 and US2 complete (crawlable match pages + correct social previews).
- Incrementally roll in US3/US4 optimization and CI budgets.
- Enable real-time discovery (US5) after sitemap generators stabilize.
- Finish with live→final handoff automation and polish.

## Format validation

- All tasks follow: `- [ ] T### [P]? [US#]? Description with file path`.
- Each user story phase includes goal and independent test criteria.
- File paths are explicit and actionable.
