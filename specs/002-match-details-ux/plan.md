# Implementation Plan: Match Details UI/UX Redesign

**Branch**: `002-match-details-ux` | **Date**: 2025-11-07 | **Spec**: `/specs/002-match-details-ux/spec.md`
**Input**: Feature specification from `/specs/002-match-details-ux/spec.md`

## Summary

Redesign the individual match page for clarity, engagement, accessibility, and performance. Deliver a live snapshot header, tabbed navigation (Summary, Commentary, Scorecard, Lineups, Info), data freshness indicators, and mobile-first responsive layout. Implementation emphasizes minimal DOM mutation for live updates, virtualized commentary, accessible semantics, and adherence to Constitution v1.1.0.

## Technical Context

**Language/Version**: Frontend: Angular (CLI ~6.x/7.x), TypeScript ~3.2; Backend: Spring Boot (2.x, Java 8/11) [NEEDS CLARIFICATION]; Scraper: Python 3.x (Flask)
**Primary Dependencies**: Angular, RxJS; Backend REST API (Spring); Scraper Flask API; axe-core (CI audit) [NEEDS CLARIFICATION on tooling integration]
**Storage**: Backend MySQL (per Constitution), Redis (optional cache) [NEEDS CLARIFICATION for usage in this feature]
**Testing**: Frontend Karma/Jasmine unit tests; Protractor E2E (critical flows); Backend JUnit; Scraper pytest (unchanged)
**Target Platform**: Web (mobile-first responsive)
**Project Type**: Web application (frontend + backend + scraper monorepo)
**Performance Goals**: Live updates ≤5s from backend timestamp; Lighthouse mobile ≥90; LCP <2.5s; CLS <0.1; 60fps updates (reduced motion respected)
**Constraints**: Bundle <500KB gzipped (lazy load where possible); commentary virtualization >200 entries; WebSocket primary updates with ≤5s polling fallback
**Scale/Scope**: Unknown live concurrency and history depth [NEEDS CLARIFICATION: typical max commentary entries per match, concurrent live viewers]

NEEDS CLARIFICATION (carried to Phase 0 research):
- Backend Java and Spring Boot versions for API contract generation rigor
- Commentary history retention policy and pagination window (now set: 30/page; confirm)
- Desktop compact mode toggle preference
- Inclusion of partnerships in Phase 002 vs deferral (currently deferred)

## Constitution Check

Gate assessment before research:
- I. Real-Time Data Accuracy: Plan conforms (staleness tiers, ≤5s refresh). PASS
- II. Monorepo Architecture Standards: No cross-service DB access; REST-only contracts. PASS
- III. REST API Design Standards: Endpoints versioned `/api/v1/...`, standard response envelope, status codes. PASS
- IV. Testing Requirements: Unit + integration planned; a11y/perf gating included. PASS
- V. Performance Standards for Live Updates: Targets aligned (≤5s, 60fps, throttled network). PASS
- VI. Frontend UI/UX Standards: Mobile-first, CSS variables, accessibility, reduced motion. PASS

Overall Gate: PASS (with noted clarifications to resolve in Phase 0)

## Project Structure

### Documentation (this feature)

```text
specs/002-match-details-ux/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (clarifications resolved)
├── data-model.md        # Phase 1 output (entities & relationships)
├── quickstart.md        # Phase 1 output (how to implement/test)
├── contracts/           # Phase 1 output (OpenAPI)
└── tasks.md             # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
apps/
├── backend/
│   └── spring-security-jwt/
│       ├── src/
│       └── pom.xml
├── frontend/
│   └── src/
│       ├── app/
│       ├── assets/
│       └── environments/
└── scraper/
    └── crex_scraper_python/
        └── src/
```

**Structure Decision**: Web application within existing monorepo. Work primarily in `apps/frontend` UI layer. Backend and scraper unchanged unless API gaps arise; any new contracts to be proposed under `specs/002-match-details-ux/contracts/` and implemented later by respective services.

## Complexity Tracking

No constitution violations anticipated. No additional projects introduced. If WebSocket introduction is proposed later, it will follow existing architecture and standards.
