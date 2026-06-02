# Implementation Plan: Long-Tail Match SEO Recovery

**Branch**: `015-long-tail-match-seo` | **Date**: 2026-06-02 | **Spec**: `specs/015-long-tail-match-seo/spec.md`
**Input**: Feature specification from `/specs/015-long-tail-match-seo/spec.md`

## Summary

Recover indexability for smaller match pages by fixing the route-level canonical bug, preventing unresolved/thin match URLs from being indexable, making SSR match pages contain crawlable H1/content/social tags/schema, cleaning sitemap contents to include only canonical URLs, and adding verification tooling for Search Console issue classes.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, Node 14 SSR runtime, Spring Boot Java backend
**Primary Dependencies**: Angular `Title`/`Meta`, Angular Universal SSR, Express SSR server, Spring Boot sitemap controllers, Playwright or PowerShell HTML audit scripts
**Storage**: Existing backend match repositories/cache; no new persistent storage required for MVP
**Testing**: Angular production build with `NODE_OPTIONS=--openssl-legacy-provider`; backend unit tests for sitemap/indexability logic; HTML audit script against local/prod URLs
**Target Platform**: SSR frontend container behind Caddy, backend sitemap API, Google Search Console crawl/index pipeline
**Project Type**: Web application in monorepo (`apps/frontend`, `apps/backend/spring-security-jwt`, `specs`)
**Performance Goals**: SSR route response remains within existing timeout; live match pages preserve short cache policy; SEO audit script completes for 100 URLs in under 2 minutes
**Constraints**: Preserve live-score UX and WebSocket behavior; do not upgrade Angular; do not rebuild production from dirty server tree; canonical changes must be visible in initial HTML
**Scale/Scope**: `/cric-live/*`, `/Home`, `/matches`, sitemap partitions, robots/metadata/schema controllers, internal links for active and recent matches

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | SEO changes must not slow live updates or invent match data. Unknown matches become noindex/404 instead of fake content. |
| II. Monorepo Architecture Standards | PASS | Frontend renders metadata; backend remains source for sitemap and match resolution. No cross-service database access. |
| III. REST API Design Standards | PASS | Existing API routes remain; any new debug/audit endpoint must stay under existing `/api/v1/seo/*` pattern. |
| IV. Testing Requirements | PASS | Tasks include targeted frontend build, backend tests, and HTML/sitemap audit verification. |
| V. Performance Standards for Live Updates | PASS | SSR metadata should use existing match data and cache; no extra high-frequency scraper calls. |
| VI. Frontend UI/UX Standards | PASS | H1 and internal links improve semantic HTML without changing core UX. |

No constitution violations are expected.

## Project Structure

### Documentation (this feature)

```text
specs/015-long-tail-match-seo/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/frontend/
├── src/index.html
├── server.js
└── src/app/
    ├── seo/
    │   ├── meta-tags.service.ts
    │   ├── structured-data.service.ts
    │   └── url-utils.ts
    ├── cricket-odds/
    │   ├── cricket-odds.component.ts
    │   └── cricket-odds.component.html
    ├── features/matches/
    │   ├── pages/matches-list/
    │   └── services/matches.service.ts
    └── home/

apps/backend/spring-security-jwt/src/main/java/com/devglan/
├── controller/seo/
│   ├── SeoMetadataController.java
│   ├── StructuredDataController.java
│   └── PublicSitemapController.java
└── service/seo/
    ├── SitemapService.java
    └── LiveMatchesService.java

scripts/
└── Audit-MatchSeo.ps1
```

**Structure Decision**: Implement MVP in the frontend SSR metadata path and backend sitemap logic. Add a repo-local audit script so every deployment can prove Search Console issue classes before submitting revalidation.

## Phase 0: Research & Decisions

| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|--------------|
| Canonical target | Use self-referencing `/cric-live/{slug}` for valid match pages | Current traffic, app routing, and GSC examples already use this pattern | Future `/match/...` URLs would create another migration and risk more duplicate sets |
| Static canonical | Remove static root canonical from `index.html` or replace dynamically during SSR | Current static canonical causes every route to canonicalize to `/` | Keep static canonical and add another route canonical, rejected because duplicate canonical tags are error-prone |
| Numeric URLs | Redirect/noindex only when resolvable; otherwise 404 or noindex | Prevents `/cric-live/445` from becoming a soft 404 | Keep generic Team A page, rejected because GSC already flags this class |
| Soft 404 protection | Do not index unresolved fallback pages; return helpful thin-safe state | Better for crawl budget and trust | Always 200 with loading shell, rejected for SEO pages |
| Sitemap signal | Include only URLs that are canonical and indexable | Google treats sitemap inclusion as a canonical signal; mismatches weaken signals | Include all discovered URLs, rejected because non-canonical sitemap issue already exists |
| Internal links | Render real `<a href>` links for cards and related pages | Crawlers need link graph; click handlers alone are weaker | Router-only buttons, rejected for crawlability |
| Structured data | Generate JSON-LD from real data only; omit placeholders | Placeholder schema caused validation errors | Keep fake Cricket Stadium/Team1 fields, rejected |

Official Google Search Central guidance used for planning:
- Canonical signals stack through redirects, `rel=canonical`, and sitemap inclusion.
- A soft 404 can happen when a URL returns `200` with missing/error-like/thin content.

## Phase 1: Design

1. **Canonical and robots layer**: Replace static root canonical with route-level canonical generation in `MetaTagsService`; ensure exactly one canonical tag; add robots tag updates.
2. **Match indexability resolver**: Add a central method that classifies route match state as indexable, noindex, or not found based on slug resolution, match data, and fallback quality.
3. **SSR match content**: Add a crawlable H1 and concise match context block that renders on SSR using route slug, resolved match info, score, league, status, and result/commentary fallback.
4. **Long-tail copy builder**: Normalize team codes, league names, match number, and format from CREX slugs and match data; remove `match-updates-{id}` noise from titles/body while preserving canonical slug.
5. **Sitemap cleanup**: Update backend sitemap generation to exclude unresolved numeric aliases and any URL that canonicalizes elsewhere.
6. **Internal links**: Ensure home/matches cards render crawlable anchors and match pages link to match list/live hub/related series/team pages where available.
7. **Structured data cleanup**: Remove placeholder schema values and align JSON-LD URLs with canonical URLs.
8. **Audit automation**: Add `scripts/Audit-MatchSeo.ps1` to validate status, canonical, robots, H1, title/description length, word count, JSON-LD, OG/Twitter, and sitemap presence.

## Current Issue Assessment

| Issue From Audit/GSC | Current Status | Evidence | Planned Fix |
|----------------------|----------------|----------|-------------|
| Alternative page with proper canonical tag | Not solved | Sample `/cric-live/*` pages canonicalize to `/` | US1 canonical work |
| Duplicate without user-selected canonical | Not solved | Static canonical conflicts with unique match titles | US1 canonical work |
| Soft 404 | Not solved | `/cric-live/445` returns `200` + `Team A vs Team B` | US2 indexability resolver |
| H1 missing | Not solved on sampled match pages | `h1=0` in SSR HTML | US1/US3 H1 block |
| Low word count | Partially solved but weak | Sample text length under 900 chars and mostly generic | US3 match context block |
| Meta/social tags missing | Partially solved | Current match pages have some tags, but canonical/social consistency is not guaranteed | US1 metadata service |
| Non-canonical page in sitemap | Likely not solved | Sitemap can include URLs whose HTML canonical is `/` | US4 sitemap cleanup |
| Orphan/no outgoing links | Likely not solved | Need crawlable anchors and related links | US4 internal links |
| Structured data validation error | Not solved | Backend schema generator has placeholder team/stadium patterns | US5 schema cleanup |

## Complexity Tracking

No constitution violations.

## Definition of Done

- Spec, plan, tasks, and checklist exist for long-tail SEO recovery.
- Sampled valid match pages no longer canonicalize to `/`.
- Unresolved numeric/fallback match URLs are noindex or 404, not indexable generic pages.
- Sitemap contains only canonical indexable match URLs.
- Each sampled indexable match page has SSR title, description, canonical, robots, H1, OG/Twitter tags, and non-placeholder JSON-LD.
- Audit script output is attached to deployment notes before Search Console revalidation.
