# Implementation Plan: Upcoming and Completed Matches

**Branch**: `010-upcoming-completed-matches` | **Date**: 2026-03-10 | **Spec**: `specs/010-upcoming-completed-matches/spec.md`
**Input**: Feature specification and research from `specs/010-upcoming-completed-matches/`

## Summary

Deliver upcoming and completed match browsing across the existing VictoryLine stack by extending CREX discovery beyond live-only pages, persisting explicit lifecycle metadata in the backend, and wiring the frontend matches list to status-aware schedule data instead of relying only on the live-match feed. The implementation keeps the current live experience intact while making the existing `Upcoming` and `Completed` tabs real, with countdowns for future fixtures, result summaries for finished matches, and deterministic transitions between states.

## Technical Context

**Language/Version**: TypeScript 3.2.x + Angular 7.2 (frontend), Java 8/11 + Spring Boot 2.x (backend), Python 3.x + async Playwright/Flask stack (scraper)  
**Primary Dependencies**: Angular HttpClient/RxJS 6, Spring MVC + Spring Data JPA, existing `LiveMatchRepository`, existing scraper browser pool/discovery services, CREX schedule/live pages  
**Storage**: MySQL-backed `LIVE_MATCH` persistence plus existing cricket snapshot storage; optional Redis/archive behavior remains unchanged unless explicitly extended  
**Testing**: Jasmine + Karma on frontend, JUnit/Spring tests on backend, pytest on scraper  
**Target Platform**: Monorepo web application with Angular frontend, Spring backend, and Python scraper services  
**Project Type**: Multi-service web application in a monorepo  
**Performance Goals**: Upcoming/completed schedule state visible within one discovery cycle, live behavior remains unchanged, matches-list tab switching stays responsive with realistic fixture volumes  
**Constraints**: Preserve existing live tabs/cards, REST-only communication across services, explicit timezone-safe start-time handling, accessibility-safe status messaging, no duplicate records across lifecycle transitions  
**Scale/Scope**: One cross-stack feature spanning discovery, persistence, retrieval, transformation, and card/list rendering for daily cricket fixture volumes

## Constitution Check

*Pre-Implementation Gate (PASS)*

- **I. Real-Time Data Accuracy**: PASS — live match behavior is preserved; schedule support adds explicit freshness handling for non-live states instead of weakening live accuracy guarantees.
- **II. Monorepo Architecture Standards**: PASS — scraper continues to discover external data, backend owns persistence and API delivery, frontend consumes backend APIs only.
- **III. REST API Design Standards**: PASS — plan introduces status-aware schedule retrieval under existing backend API structure rather than bypassing current service boundaries.
- **IV. Testing Requirements**: PASS — plan includes scraper, backend, and frontend tests for lifecycle, filtering, and UI-state correctness.
- **V. Performance Standards for Live Updates**: PASS — live updates remain on the current path; schedule reads add lighter-weight retrieval without increasing live update latency.
- **VI. Frontend UI/UX Standards**: PASS — upcoming/completed states will use explicit labels, countdown/result context, and accessible empty/error messaging without relying on color alone.

*Post-Design Gate (PASS)*

- Research confirms the main gap is upstream data ingestion, not the absence of frontend tabs or status enums.
- Existing UI primitives for `UPCOMING` and `COMPLETED` can be reused once schedule-aware data is available.
- Explicit lifecycle modeling is the safest way to avoid contradictions caused by the current `isDeleted`-driven approach.

## Architectural Decisions

### 1. Canonical lifecycle state becomes explicit

The backend will stop treating completed state as only a side effect of soft deletion. `LiveMatch` will be extended with an explicit lifecycle status and schedule metadata so the frontend can query by state without heuristics.

### 2. Discovery expands from live-only to schedule-aware

The scraper discovery flow currently navigates `https://crex.com/live-matches`. This feature adds schedule-aware parsing so not-started and finished fixtures can be synced into the backend.

### 3. Backend remains the single source of truth for browsing

The frontend will not infer upcoming/completed state from CREX URLs or live-only payloads. Instead, it will consume backend schedule retrieval APIs that return status-aware match records.

### 4. First release favors deterministic sorting over heavyweight new navigation

The initial implementation will sort upcoming matches by nearest start time and completed matches by most recent completion/final update. Date or series section labels can be included when metadata is present, but correctness of state and timing takes precedence over a larger visual redesign.

### 5. Completed retention defaults to recent-results browsing

For planning purposes, recently completed matches will remain browseable for at least a short retention window, with `24h` used as the baseline assumption for implementation unless product guidance overrides it later. This aligns with existing fast-update/archive thinking and is sufficient for the requested "completed matches" experience.

## Project Structure

### Documentation (this feature)

```text
specs/010-upcoming-completed-matches/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
├── data-model.md          # planned follow-up artifact
└── contracts/             # planned follow-up artifact
```

### Source Code (repository root)

```text
apps/
├── frontend/
│   └── src/app/
│       ├── component/
│       │   └── event-list.service.ts
│       ├── core/utils/
│       │   └── match-utils.ts
│       └── features/matches/
│           ├── components/match-card/
│           ├── models/
│           │   ├── match-card.models.ts
│           │   └── match-status.ts
│           ├── pages/matches-list/
│           └── services/matches.service.ts
├── backend/
│   └── spring-security-jwt/src/
│       ├── main/java/com/devglan/
│       │   ├── controller/CricketDataController.java
│       │   ├── dao/
│       │   ├── model/LiveMatch.java
│       │   ├── repository/LiveMatchRepository.java
│       │   └── service/
│       │       ├── LiveMatchService.java
│       │       └── impl/LiveMatchServiceImpl.java
│       └── test/java/com/devglan/
│           ├── controller/
│           └── service/
└── scraper/
    └── crex_scraper_python/
        ├── src/
        │   ├── cricket_data_service.py
        │   ├── crex_scraper.py
        │   ├── discovery.py
        │   └── parsers/
        └── tests/
            ├── integration/
            └── unit/
```

**Structure Decision**: Reuse the existing `matches` feature, `LiveMatch` persistence model, and scraper discovery pipeline instead of creating a parallel schedule subsystem. This keeps the feature integrated with the current product surface while minimizing architectural drift.

## Data and API Strategy

### Backend model changes

Extend `LiveMatch` to carry:

- explicit lifecycle status
- canonical external match key
- scheduled start time
- series/context label
- format
- result summary
- last lifecycle update timestamp

This allows schedule retrieval without forcing the frontend to inspect `deleted`, `finished`, or ambiguous score states.

### Retrieval strategy

The backend will support schedule-aware retrieval for:

- upcoming matches
- completed matches
- existing live matches

This can be implemented as dedicated endpoints for `upcoming` and `completed` while preserving the current live endpoint. That is the recommended implementation for the first release because it limits blast radius and keeps frontend integration straightforward.

### Frontend strategy

`EventListService` and `MatchesService` will be extended so the matches page can consume status-aware schedule data and transform it into the existing `MatchCardViewModel` shape. The current tab structure remains intact, but its data source becomes schedule-aware instead of live-only.

### Reconciliation strategy

When the same match is seen in schedule discovery and live discovery:

- identity is resolved through a canonical external key plus URL reconciliation
- lifecycle state prefers the strongest known current state
- one canonical record is updated rather than duplicated

Recommended precedence:

`LIVE/INNINGS_BREAK` > `COMPLETED/ABANDONED/NO_RESULT` > `UPCOMING`

This prevents temporary source disagreement from causing duplicate cards.

## Delivery Phases

## Phase 0 – Research (COMPLETE)

- Confirmed CREX schedule UX expectations for upcoming and completed browsing.
- Verified current repo support: frontend tabs/status enums exist, but data ingestion is live-only.
- Identified the main risk: backend and scraper currently model completion too implicitly.

## Phase 1 – Data Model and Contracts

**Goal**: Make schedule states explicit and queryable.

1. Extend backend match persistence with explicit lifecycle fields and schedule metadata.
2. Define DTOs for schedule retrieval and freshness metadata.
3. Add a dedicated scraper parser for CREX schedule cards.
4. Author `data-model.md` and API contract examples in the feature spec folder after the implementation shape is stable.

## Phase 2 – Schedule Ingestion Foundation

**Goal**: Sync upcoming and completed fixtures into the backend.

1. Expand scraper discovery beyond `live-matches`.
2. Add schedule upsert operations in scraper-to-backend sync.
3. Implement backend reconciliation logic for upsert/update across lifecycle states.
4. Preserve existing live discovery and stop-scrape behavior while separating lifecycle status from deletion semantics.

## Phase 3 – Backend Retrieval and Lifecycle Logic

**Goal**: Make schedule browsing available to the frontend.

1. Add backend retrieval methods for upcoming and completed matches.
2. Implement repository queries for nearest-first upcoming and newest-first completed ordering.
3. Expose schedule APIs from `CricketDataController`.
4. Ensure SEO/websocket/status-change notifications reflect lifecycle transitions correctly.

## Phase 4 – Frontend Integration

**Goal**: Make the existing matches UI show real upcoming and completed data.

1. Add upcoming/completed API methods to `EventListService`.
2. Extend `MatchesService` transformation logic with schedule-aware fields.
3. Replace live-only assumptions in `matches-list.component.ts`.
4. Update match-card rendering for countdowns, result summaries, and fallback-safe labels.

## Phase 5 – Error States, Validation, and QA

**Goal**: Make the feature trustworthy in edge conditions.

1. Distinguish empty schedule states from stale or failed schedule loads.
2. Add tests for lifecycle transitions and frontend deduplication.
3. Validate timezone formatting for upcoming cards.
4. Run scraper, backend, and frontend test suites.
5. Perform manual QA for the transition path `upcoming -> live -> completed`.

## Story-to-Implementation Mapping

| User Story | Core Implementation Focus |
|-----------|----------------------------|
| **US1** Browse Upcoming Fixtures | schedule discovery, upcoming persistence, upcoming API retrieval, countdown rendering |
| **US2** Review Completed Results | completed-state parsing, result summary persistence, completed API retrieval |
| **US3** Trust the Match Lifecycle | canonical identity, reconciliation rules, removal of delete-driven UI assumptions |
| **US4** Scan Schedule Cards Efficiently | card/list rendering, metadata exposure, placeholder-safe labels |
| **US5** Recover Gracefully from Schedule Gaps | freshness metadata, empty/error states, retry messaging |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CREX schedule pages change structure or expose partial data | Missing upcoming/completed metadata | Isolate parsing logic in a dedicated schedule parser and treat partial fields as first-class fallbacks |
| `isDeleted` semantics conflict with explicit lifecycle state | Duplicate or contradictory backend records | Move UI and retrieval logic to explicit status and reserve deletion semantics for archival/cleanup only |
| Start times are inconsistent or timezone-ambiguous | Incorrect countdowns and sort order | Persist canonical UTC time when available, localize at render time, and add timezone-focused tests |
| Live and schedule discovery report the same match differently | Duplicate cards across tabs | Centralize reconciliation in backend service with canonical identity precedence rules |
| Completed retention window is too short | Completed tab feels empty too quickly | Start with a minimum 24h retention assumption and keep the value configurable |

## Definition of Done

- Upcoming matches are discoverable from CREX schedule-oriented sources and appear in VictoryLine's Upcoming tab.
- Completed matches appear in VictoryLine's Completed tab with readable result summaries.
- A single match transitions across states without duplicate cards.
- Backend retrieval uses explicit lifecycle state rather than live-only payload assumptions.
- Frontend can distinguish empty schedule, stale schedule, and failed schedule states.
- Scraper, backend, and frontend tests for the feature pass.

## Complexity Tracking

No constitution violations identified at planning time. The feature is cross-stack but fits the existing monorepo architecture and service boundaries.
