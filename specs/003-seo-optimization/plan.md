# Implementation Plan: SEO Optimization for Crickzen

**Branch**: `003-seo-optimization` | **Date**: 2025-11-11 | **Spec**: `specs/003-seo-optimization/spec.md`
**Input**: Feature specification describing comprehensive SEO improvements (metadata, structured data, performance, indexing controls, URL strategy).

## Summary

Deliver a production-ready SEO foundation for Crickzen: dynamic metadata + structured data for matches/players/teams; canonical, season-scoped URL scheme; real‑time sitemap refresh; pagination/facet noindex strategy; Open Graph image standards; SSR integration; performance & accessibility conformance; live→final match URL canonical handoff without link loss.

Host & brand consistency: All canonicals, robots, sitemap URLs, and examples MUST use https://www.crickzen.com. Any Victory Line/VictoryLine variants are removed/ignored in this branch to avoid mixed signals.

## Technical Context

**Language/Version**: 
- Frontend: Angular (current CLI config appears ~v6–7), TypeScript 3.x → target upgrade path TypeScript 4.9+ / Angular Universal (Node 18+ runtime)
- Backend: Spring Boot 2.x (Java 11) / MySQL 8.x / Redis (optional cache)
- Scraper: Python 3.x (Flask) for live data ingestion

**Primary Dependencies**: Angular Universal (SSR), Express server adapter, Helmet (security headers), Sharp (OG image resizing), Spring Boot Web + Jackson, MySQL JDBC, Redis client, Flask + requests, Lighthouse CI, axe-core (accessibility audit), sitemap + robots generator utility (custom or library), json-schema / OpenAPI tooling.

**Storage**: MySQL (authoritative match / team / player data); Redis (caching rendered SEO metadata & sitemap snapshot); File store or object storage (future) for generated OG/social images (initially build-time static assets).

**Testing**: Frontend (Karma/Jasmine existing, add Lighthouse CI + accessibility checks); Backend (JUnit + Spring MockMvc + contract tests); Scraper (pytest for parsers). Add integration tests for SEO endpoints + sitemap generation. Add snapshot tests for structured data JSON-LD.

**Target Platform**: Web (mobile-first, domain: https://www.crickzen.com, deployment via existing monorepo pipelines; Node SSR container + Spring Boot API + Python scraper).

**Project Type**: Monorepo (frontend + backend + scraper) following Constitution service boundaries; SEO feature spans all three but adds no new independent service.

**Performance Goals / CI Budgets**: 
- Lighthouse (Mobile): LCP ≤ 2.5s; INP ≤ 200ms; CLS ≤ 0.1
- TTFB (SSR) p95 ≤ 600ms for match pages (validated via k6 or autocannon in CI)
- Sitemap regeneration < 2s per update event; debounce 5s; max burst 30 writes/min
- OG image generation (if dynamic later) < 300ms p95
- Bundle size main < 500KB gzipped

**Constraints**: Real-time data accuracy principle (<5s freshness); avoid blocking live score ingestion; Node SSR memory footprint <256MB per instance; no direct DB access from frontend; adhere to REST API standards & accessibility (WCAG 2.1 AA). Avoid more than 60s cache staleness for live match metadata.

**Scale/Scope**: Up to 10k concurrent users during marquee matches; ~100k indexable pages (matches across seasons + players + teams); expected sitemap partitions after 50k URLs; OG images stored for ~10k active pages.

## Constitution Check (Initial)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | SEO caching respects freshness (short TTL for live matches). |
| II. Monorepo Architecture Standards | PASS | No cross-service DB access introduced; REST only. |
| III. REST API Design Standards | PASS | Planned SEO endpoints follow /api/v1/ patterns. |
| IV. Testing Requirements | PASS | Test additions defined (unit + integration + Lighthouse + accessibility). |
| V. Performance Standards for Live Updates | PASS | Targets align; no degradation expected (SSR caching + incremental hydration). |
| VI. Frontend UI/UX Standards | PASS | Metadata changes + structured data do not violate design system; alt text & accessibility preserved. |

No violations; Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-seo-optimization/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── checklists/
```

### Source Code (Relevant existing)

```text
apps/
├── frontend/              # Angular app (to enable SSR & SEO services)
│   ├── src/app/seo/       # New SEO module (MetaTagsService, StructuredDataService)
│   ├── src/app/shared/    # Shared components/services
│   └── server.ts          # SSR entry (Angular Universal)
├── backend/spring-security-jwt/  # Spring Boot API
│   ├── src/main/java/.../seo/    # New SEO controllers (SitemapController, RobotsController)
│   └── src/main/resources/seo/   # Templates/cache config
├── scraper/               # Python scraping & live data
│   └── seo/               # (Optional) feed hooks for freshness triggers
```

**Structure Decision**: Extend existing service directories—no new top-level service. Introduce focused SEO modules per service; centralize contracts in `specs/003-seo-optimization/contracts/`.

SSR scope & guardrails (Phase 1):
- Enable SSR only for match, team, and player routes; keep other routes CSR initially.
- Guardrails: log hydration errors in the browser and server; if SSR render fails, fallback to CSR for the request.
- Cache policy (Cache-Control) per page state:
	- live: max-age=5, stale-while-revalidate=55
	- scheduled: max-age=60
	- completed: max-age=3600
	- archived: respect indexing policy; may be excluded or long-cache as per spec.

## Phase 0: Research & Decisions

Research items (now resolved):
| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|-------------|
| SSR approach | Angular Universal + Express | Native Angular SSR, community support | Pre-render only (insufficient for live) |
| Dynamic meta | MetaTagsService (Angular) | Centralizes page-level metadata logic | Per-component manual tags |
| Structured data | JSON-LD injection service | Flexible, testable, cacheable | Inline microdata (harder to maintain) |
| Sitemap refresh | Real-time event hook + debounce (5s) | Fast indexing w/out thrash | Hourly batch (slower) |
| Sitemap burst cap | Cap to ≤30 writes/min | Prevents IO thrash during busy updates | No cap (risk of churn) |
| Pagination noindex | meta robots + canonical | Consolidates authority | Full index (wastes crawl budget) |
| OG images | Static curated + size standard (1200×630) | Fast delivery; pass social checks | On-demand dynamic render (later) |
| Canonical host | https://www.crickzen.com | Single domain clarity | Multiple host variants |
| Live→final URL | Persist live; canonical to final | Preserves inbound links | Hard redirect (loss of context) |
| Cache strategy | Redis short TTL live; long TTL stable | Balances freshness & performance | DB-only lookups |
| Performance audit | Lighthouse CI + WebPageTest (optional) | Objective scoring & regression tracking | Manual sporadic checks |

All NEEDS CLARIFICATION items from spec addressed.

## Phase 1: Design & Contracts

Artifacts to produce:
- `research.md` (decisions above, expanded)
- `data-model.md` (entities: Match, Player, Team, PageMetadata, URLSlug, StructuredDataBlock, SitemapEntry, ImageAsset)
- `contracts/seo-openapi.yaml` (SEO endpoints)
- `quickstart.md` (implementation steps & verification)

### API Contract Outline

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/v1/seo/sitemap | GET | Returns current sitemap index or partition listing |
| /api/v1/seo/robots | GET | Returns robots.txt content |
| /api/v1/seo/metadata | GET | Returns computed metadata for a given path (debug/admin) |
| /api/v1/seo/og-image | POST | Regenerates OG image (admin only) |
| /api/v1/seo/structured-data/{type}/{id} | GET | Returns JSON-LD block for testing |

Public file endpoints (served via backend or CDN):
- GET /sitemap.xml → sitemap index (gzipped), with <loc> using https://www.crickzen.com and <lastmod> ISO 8601
- GET /sitemaps/sitemap-matches-0001.xml (and similar partitions; gzip supplied by edge proxy)

### Data Integrity & States
Match states: scheduled → live → completed → archived (affects indexing priority & TTL). PageMetadata caches vary by state; Completed becomes stable with longer TTL; Archived may be excluded.

Live → final canonical handoff:
- During live: live URL exists with canonical pointing to the final, season-scoped URL.
- After completion: keep the live page indexable for ~7 days (index,follow) to preserve social shares; a scheduled job flips it to noindex,follow thereafter for authority consolidation.

### Testing Strategy Summary
Unit tests for services; integration tests for controllers; snapshot tests for JSON-LD; Lighthouse CI threshold gating; accessibility (axe-core) in CI; contract schema validation (OpenAPI). Load test sitemap generation under 10 concurrent publish events.

Structured data completeness & tests:
- Emit schemas: SportsEvent (match: homeTeam, awayTeam, startDate, eventStatus LiveEvent when in play, location, offers if available), SportsTeam/Organization (teams), Person (players), BreadcrumbList (all primary pages).
- Add concrete JSON-LD fixtures (match/player/team/breadcrumb) and snapshot tests to guard against regressions.

Performance budgets in CI:
- Enforce Lighthouse budgets (LCP, INP, CLS) on match/team/player pages.
- Add TTFB p95 check with k6/autocannon for match SSR route in CI.

## Phase 2: (Planning Boundary)

Out of scope for this command—tasks file (`tasks.md`) to be generated separately. Focus next on implementation tasks: SSR integration, metadata service, structured data generation, sitemap job, robots endpoint, canonical + pagination directives, performance audits, accessibility validation.

## Complexity Tracking

No Constitution violations—section intentionally left empty.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| SSR upgrade regression | Medium | Staged rollout; fallback to static build; performance benchmarks pre/post |
| Live cache staleness | High (trust) | Short TTL + freshness tags + monitoring |
| Sitemap thrash on rapid updates | Low | Debounce (5s) & batch coalescing |
| OG image mismatch | Low | Validation script during CI; fallback default image |
| Structured data errors | Medium | Snapshot tests + Rich Results test in CI |

## Definition of Done (Plan Level)
- All Phase 1 artifacts committed
- SSR serving match/player/team pages with metadata
- Lighthouse mobile SEO score ≥ 90 on sample pages
- Rich Results test passes for representative pages
- Sitemap & robots accessible and valid; sitemap index serves gzipped index and partition files with correct <lastmod> and canonical host in <loc>
- Pagination/facet pages return proper meta robots directives
- Canonical URLs stable & correct

## Next Steps
Proceed to generate `research.md`, `data-model.md`, `quickstart.md`, and `contracts/seo-openapi.yaml`, then run update-agent-context again to finalize context.
