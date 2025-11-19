# Implementation Plan: Upcoming Matches Feed (Backend + Scraper)

**Branch**: `005-upcoming-matches` | **Date**: 2025-11-16 | **Spec**: specs/005-upcoming-matches/spec.md
**Input**: Feature specification from `/specs/005-upcoming-matches/spec.md`

## Summary

Deliver a production-ready Upcoming Matches feed powered by the Scraper and exposed via Backend REST APIs. Scope excludes UI (to be addressed in Phase 2). Data source is crex.com fixtures; freshness target is under 15 minutes; accuracy ≥95% for schedule details (teams, venue, start time). Backend will provide paginated, filterable endpoints adhering to the repository’s REST standards. Scraper will fetch fixtures periodically, normalize records, handle postponements/cancellations, and enforce robust resource cleanup to avoid the currently known PID/thread leak.

## Technical Context

**Language/Version**: Java 11 (Spring Boot 2.x), Python 3.10+ (Scraper)  
**Primary Dependencies**: Spring Web + Jackson; MySQL (JPA/Hibernate); Redis (cache, optional); Python: requests/Playwright, Flask API, pydantic-like validation (or dataclasses)  
**Storage**: MySQL (authoritative fixtures table), Redis cache for list endpoints (TTL 5–10 min)  
**Testing**: Backend: JUnit 5 + Spring Boot tests, H2; Scraper: pytest + responses/requests-mock, HTML snapshots  
**Target Platform**: Linux (Docker Compose stack)  
**Project Type**: web (backend service + scraper service)  
**Performance Goals**: Backend GET /upcoming responds <200ms P95 with warm cache; Scraper completes fixture sync <5s per source page  
**Constraints**: Consistent REST wrapper format; contract-first OpenAPI; avoid PID/thread leaks; scraper rate-limits respected  
**Scale/Scope**: Feed size O(10^2–10^3) upcoming fixtures; queries by date range, series, team; pagination up to 100/page

NEEDS CLARIFICATION (resolved in research.md):
- Exact Python library for scraping: Playwright vs requests+BS4 for fixtures-only pages
- Final Redis TTL for upcoming lists (5 vs 10 minutes)
- Java version (8 vs 11) to align with existing backend image(s)
- Source of truth when multiple providers conflict (primary/secondary)

## Constitution Check

Gate evaluation before research:
- I. Real-Time Data Accuracy: PASS (Not live scoring; freshness target <15 min is acceptable for fixtures; include timestamps and staleness indicators)  
- II. Monorepo Architecture Standards: PASS (Backend consumes Scraper via REST; no cross-DB access; contracts versioned)  
- III. REST API Design Standards: PASS (Endpoints under `/api/v1/`, plural nouns, standard status codes, JSON envelope)  
- IV. Testing Requirements: PASS (Backend: unit+integration; Scraper: unit+integration with snapshots; contract tests)  
- V. Performance Standards for Live Updates: PASS (Non-live feature; adhere to backend response <200ms; caching via Redis)  
- VI. Frontend UI/UX Standards: N/A for this phase (no UI work); will apply in Phase 2

Re-check after Phase 1 design: PASS — see updated notes at end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/005-upcoming-matches/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI)
└── checklists/          # Pre-existing quality checklist
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

scraper/
├── src/ (apps/scraper/* existing)
└── tests/

tests/
└── contract/
```

**Structure Decision**: Web application multi-service pattern (backend + scraper) aligning with Constitution II. No new top-level projects introduced; work will extend existing backend Spring Boot module and existing Python scraper.

## Complexity Tracking

No violations anticipated. Redis caching is optional and aligns with Constitution V. No additional services introduced.

---

## Constitution Check (Post-Design Re-evaluation)

- I. Real-Time Data Accuracy: PASS — Upcoming fixtures not bound to 5s SLA; include `lastUpdated` and clear staleness semantics.
- II. Monorepo Architecture Standards: PASS — Contracts in `specs/005-upcoming-matches/contracts/`; REST-only integration.
- III. REST API Design Standards: PASS — OpenAPI provided; consistent envelope and status codes; pagination and filtering patterns.
- IV. Testing Requirements: PASS — Unit/integration test expectations captured in quickstart and contracts notes.
- V. Performance Standards: PASS — Redis TTL chosen; indexes defined in data model; target <200ms achievable.
- VI. Frontend UI/UX Standards: N/A — Phase 2 will ensure compliance.

---

## Phase 2: Frontend UI Implementation

**Status**: Ready to start (Backend API complete and deployed)  
**Framework**: Angular 15+ with TypeScript 4.9+  
**Scope**: User-facing upcoming matches page with responsive design, filtering, and real-time updates

### UI Goals

1. **Responsive Design**: Mobile-first approach with CSS Grid/Flexbox
2. **Performance**: Initial load <2s, smooth scrolling with virtual scroll
3. **User Experience**: Clear match cards, intuitive filters, loading states
4. **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation
5. **Real-time**: Auto-refresh every 5 minutes, manual refresh button

### UI Components Structure

```text
apps/frontend/src/app/
├── upcoming-matches/
│   ├── upcoming-matches.module.ts
│   ├── upcoming-matches-routing.module.ts
│   ├── components/
│   │   ├── upcoming-matches-list/
│   │   │   ├── upcoming-matches-list.component.ts
│   │   │   ├── upcoming-matches-list.component.html
│   │   │   ├── upcoming-matches-list.component.scss
│   │   │   └── upcoming-matches-list.component.spec.ts
│   │   ├── match-card/
│   │   │   ├── match-card.component.ts
│   │   │   ├── match-card.component.html
│   │   │   ├── match-card.component.scss
│   │   │   └── match-card.component.spec.ts
│   │   └── match-filters/
│   │       ├── match-filters.component.ts
│   │       ├── match-filters.component.html
│   │       ├── match-filters.component.scss
│   │       └── match-filters.component.spec.ts
│   ├── services/
│   │   ├── upcoming-matches.service.ts
│   │   └── upcoming-matches.service.spec.ts
│   └── models/
│       └── upcoming-match.model.ts
```

### UI Features

1. **Match List View**
   - Card-based layout with team logos, names, series info
   - Time countdown to match start
   - Venue and status badges
   - Pagination controls (10, 20, 50 per page)

2. **Filtering & Search**
   - Date range picker (from/to)
   - Team search/filter (autocomplete)
   - Series filter (dropdown)
   - Status filter (scheduled/postponed/cancelled)

3. **Real-time Updates**
   - Auto-refresh every 5 minutes
   - Manual refresh button with loading spinner
   - Last updated timestamp display

4. **Responsive Behavior**
   - Desktop: 3-column grid
   - Tablet: 2-column grid
   - Mobile: Single column with optimized card layout

### Technical Specifications

- **HTTP Client**: Angular HttpClient with RxJS observables
- **State Management**: Component-level state (no NgRx for this feature)
- **Styling**: SCSS with BEM methodology, CSS Grid/Flexbox
- **Icons**: Material Icons or custom SVG sprites
- **Date Handling**: date-fns or native Intl API for timezone conversion
- **Testing**: Jasmine + Karma for unit tests, TestBed for component tests

