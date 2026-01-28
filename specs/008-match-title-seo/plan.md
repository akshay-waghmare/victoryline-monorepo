# Implementation Plan: Match Page Title SEO Optimization

**Branch**: `008-match-title-seo` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-match-title-seo/spec.md`  
**Gap Analysis**: [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable long-tail search traffic acquisition by implementing dynamic, team-based page titles for match pages following the format "{Team A} vs {Team B} Live Score Ball by Ball". This feature builds on existing SEO infrastructure from Feature 003 (~70% complete) and focuses on wiring match data into title/description generation plus Google Search Console API integration for automated sitemap submission.

**Primary Technical Approach**: 
1. Fetch match data (team names, status) from Backend API in SSR routes
2. Generate format-compliant titles dynamically based on match status (live/completed/abandoned)
3. Wire Angular Title service for client-side updates during SPA navigation
4. Integrate Google Search Console API for automated daily sitemap submission

**Deployment Strategy**: Phased rollout - Phase 1A (dynamic titles, 4-6h) ships immediately for visible user impact, Phase 1B (GSC automation, 4-6h) follows for operational comfort.

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 4.9+ (Angular 15+), Node.js 16+ for SSR
- Backend: Java 8/11 (Spring Boot 2.x)
- Tooling: Python 3.x (Google API client library)

**Primary Dependencies**: 
- Frontend: Express.js (SSR server), @angular/platform-browser (Title service), helmet (security headers)
- Backend: Spring Web, Spring Boot, Google Search Console API client (`google-api-services-searchconsole v1`)
- Existing: MetaTagsService, SitemapService (from Feature 003)

**Storage**: 
- MySQL (Backend persistence - match data via existing schema)
- Redis (SEO metadata cache - already configured from Feature 003)

**Testing**: 
- Frontend: Jasmine/Karma (Angular unit tests), manual SSR validation (curl)
- Backend: JUnit 5 (unit tests), MockMvc (integration tests for new endpoints if added)
- Contract validation: Test generated titles match format specifications

**Target Platform**: 
- Frontend: Linux server (Express SSR on port 4000), browser clients (SPA)
- Backend: Linux server (Spring Boot on port 8080)

**Project Type**: Web application (monorepo with frontend + backend)

**Performance Goals**: 
- SSR title generation: <50ms additional overhead per request
- Match data API fetch: <200ms response time (existing endpoint)
- Client-side title update: <50ms (immediate on navigation)
- GSC API submission: <2 seconds per sitemap submission

**Constraints**: 
- Title length: ≤60 characters (SEO best practice)
- Meta description: ≤155 characters (SEO best practice)
- SSR response time: Must not degrade existing <500ms P95 for /cric-live/:id routes
- No breaking changes to existing MetaTagsService or SitemapService APIs

**Scale/Scope**: 
- Active matches: ~20-50 concurrent live matches at peak
- Historical matches: ~10,000+ matches in database
- Daily sitemap submissions: 1 automated job (3 AM daily)
- Google Search Console rate limits: 200 requests/day (ample for single daily submission)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Real-Time Data Accuracy ✅ PASS
- **Status**: No violation
- **Rationale**: Feature enhances SEO discoverability but does not modify data accuracy pipeline. Match data freshness requirements (<5s for live updates) are maintained by existing scraper infrastructure. Titles are generated from existing accurate match data.

### II. Monorepo Architecture Standards ✅ PASS
- **Status**: No violation, stays within existing 3-service architecture
- **Services Modified**:
  - Frontend: Update SSR routes in `server.ts`, add Title service to Angular components
  - Backend: Add GoogleSearchConsoleService (Spring), scheduled job for sitemap submission
  - Scraper: No changes required
- **Communication**: Frontend → Backend API (existing `/api/matches/{id}` endpoint), Backend → GSC API (new external integration)
- **Rationale**: No new services introduced. GSC integration is an external API client within Backend service, not a new service.

### III. REST API Design Standards ✅ PASS
- **Status**: No new API endpoints required
- **Existing Endpoints Used**:
  - `GET /api/matches/{id}` (already exists, returns match data with team names and status)
  - `GET /sitemap.xml` (already exists from Feature 003)
- **Rationale**: Feature leverages existing Backend API. No new REST endpoints needed. GSC API integration is outbound (Backend as client), not inbound.

### IV. Testing Requirements ✅ PASS (with action items)
- **Frontend Tests Required**:
  - Unit tests: Title generation logic (format compliance, truncation, special characters)
  - Integration tests: SSR routes with mocked match data
  - Manual validation: curl SSR routes, verify `<title>` tags
- **Backend Tests Required**:
  - Unit tests: GoogleSearchConsoleService (mock GSC API)
  - Integration tests: Scheduled job execution (test with in-memory scheduler)
- **Coverage Targets**: >70% frontend, >80% backend (constitution requirements)
- **Action Items**: Write tests in Phase 2 (implementation)

### V. Performance Standards for Live Updates ✅ PASS
- **Status**: No violation, performance maintained
- **Measurements**:
  - Title generation: <50ms (simple string formatting)
  - Match data fetch: <200ms (existing API endpoint)
  - SSR overhead: ~50-100ms total additional time (acceptable for SEO benefit)
- **Rationale**: Synchronous match data fetch during SSR is acceptable for initial page load. Subsequent updates use existing WebSocket/polling. Performance targets (<3s FCP, <200ms API) unaffected.

### VI. Frontend UI/UX Standards ✅ PASS
- **Status**: No UI changes required (invisible SEO feature)
- **Design System**: Not applicable (meta tags and titles only)
- **Accessibility**: Improved - dynamic titles help screen readers announce page context
- **Responsive**: Not applicable (server-side meta tags)
- **Rationale**: Feature enhances SEO without modifying visual UI. Accessibility benefit: descriptive titles improve navigation for assistive technologies.

### Summary
**Overall Result**: ✅ **ALL GATES PASS** - No constitution violations. Feature aligns with existing architecture, performance, and testing standards.

## Project Structure

### Documentation (this feature)

```text
specs/008-match-title-seo/
├── plan.md                        # This file (/speckit.plan command output)
├── spec.md                        # Feature specification (user requirements)
├── IMPLEMENTATION_GAP_ANALYSIS.md # Code audit (what exists vs what's needed)
├── research.md                    # Phase 0 output (/speckit.plan command - GENERATED BELOW)
├── data-model.md                  # Phase 1 output (/speckit.plan command - GENERATED BELOW)
├── quickstart.md                  # Phase 1 output (/speckit.plan command - GENERATED BELOW)
├── contracts/                     # Phase 1 output (/speckit.plan command - GENERATED BELOW)
│   └── match-metadata.schema.json # Title/description generation contract
├── checklists/
│   └── requirements.md            # Spec quality validation (already exists)
└── tasks.md                       # Phase 2 output (/speckit.tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```text
# Web application (frontend + backend monorepo)

apps/frontend/
├── server.ts                                    # [MODIFY] SSR server - add match data fetching
├── src/
│   ├── app/
│   │   ├── seo/
│   │   │   ├── meta-tags.service.ts            # [EXISTS] Helper methods for metadata
│   │   │   └── og-images.ts                    # [EXISTS] OG image generation
│   │   ├── cricket-odds/
│   │   │   └── cricket-odds.component.ts       # [MODIFY] Add Title service for CSR updates
│   │   └── features/
│   │       └── matches/
│   │           └── pages/
│   │               └── matches-list/
│   │                   └── matches-list.component.ts # [MODIFY] Add Title service
├── package.json                                 # [MODIFY] Add @google-cloud/local-auth if needed
└── tests/                                       # [ADD] SSR title generation tests

apps/backend/spring-security-jwt/
├── src/
│   ├── main/
│   │   └── java/
│   │       └── com/devglan/
│   │           ├── service/
│   │           │   └── seo/
│   │           │       ├── SitemapService.java            # [EXISTS] Dynamic sitemap generation
│   │           │       └── GoogleSearchConsoleService.java # [ADD] GSC API integration
│   │           ├── scheduler/
│   │           │   └── SitemapScheduler.java              # [ADD] Daily sitemap submission job
│   │           └── controller/
│   │               └── seo/
│   │                   └── PublicSitemapController.java   # [EXISTS] Sitemap endpoints
│   └── test/
│       └── java/
│           └── com/devglan/
│               └── seo/
│                   ├── GoogleSearchConsoleServiceTest.java # [ADD] GSC unit tests
│                   └── SitemapSchedulerTest.java           # [ADD] Scheduler tests
├── pom.xml                                      # [MODIFY] Add Google API dependency
└── src/main/resources/
    └── gsc-service-account.json                 # [ADD] GSC API credentials (gitignored)

# No scraper changes required for this feature
```

**Structure Decision**: This is a web application (Option 2) modifying existing frontend SSR and backend services. No new services or major structural changes. Frontend modifications focus on `server.ts` (SSR routes) and Angular components (Title service). Backend adds a new service (GoogleSearchConsoleService) and scheduler within existing structure. All changes are additive or modificative, not architectural.

## Complexity Tracking

> **No violations to justify** - Constitution Check passed all gates without exceptions.

This feature introduces minimal complexity:
- Leverages existing SSR infrastructure (server.ts already configured)
- Uses existing Backend API endpoint (`/api/matches/{id}`)
- Adds single new service (GoogleSearchConsoleService) following existing Spring Boot patterns
- No new database tables, schemas, or migrations required
- No architectural changes or service boundary violations

**Complexity Score**: Low - Primarily configuration and data wiring, not new architectural patterns.
