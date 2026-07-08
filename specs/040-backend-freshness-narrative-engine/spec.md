# Feature Specification: Backend Freshness Narrative Engine

**Feature Branch**: `040-backend-freshness-narrative-engine`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User request: "ok lets plan spec and plan and tasks and implement all this"

## Summary

Crickzen now has stronger frontend freshness pages, but the most important missing layer is still backend-driven narrative freshness. The app already stores commentary, match-info, and live-score state. What it does not yet do reliably is convert that state into a shared, meaningful-change freshness signal that powers:

- crawlable event-to-text updates
- key-event summaries
- honest freshness timestamps
- sitemap `lastmod`
- stronger live-update and result copy

This phase adds a backend freshness narrative engine so the frontend and sitemap can both use one trusted source of truth for match-day freshness.

## Current Evidence

- `CricketDataService` already caches commentary and transient match state keyed by match URL.
- `CricketDataController` already exposes `/commentary` and `/match-info/get`, but not a dedicated freshness-summary endpoint.
- `match-freshness-page.component.ts` currently derives key events and visible update logic mostly in the frontend.
- `SitemapService` currently assigns freshness-page `lastmod` from the generic live-match state timestamp rather than a dedicated meaningful-change narrative signal.
- Competitor guidance and current repo analysis both point to the same gap: crawlable text updates matter more than raw numeric score changes.

## User Scenarios & Testing

### User Story 1 - Backend Converts Match Events Into Crawlable Text (Priority: P1)

As a search engine and as a user, I want meaningful match events translated into short human-readable updates so the freshness pages expose more than scoreboard numbers.

**Why this priority**: This is the clearest gap between basic score surfaces and stronger editorial/live-update competitors.

**Independent Test**: Feed the backend commentary plus match-info data for a real fixture and verify the summary response contains readable key-event text, update entries, and a narrative summary.

**Acceptance Scenarios**:

1. **Given** toss information becomes available, **When** the freshness summary is generated, **Then** it produces a readable toss update entry rather than only storing a raw field.
2. **Given** commentary contains wickets, milestones, or innings-break signals, **When** the freshness summary is generated, **Then** those become visible key events and live-update entries.
3. **Given** the match finishes, **When** result text is available, **Then** the summary response includes a readable result/recap angle.
4. **Given** commentary is sparse, **When** the summary is generated, **Then** it degrades honestly instead of inventing a fake live blog.

---

### User Story 2 - One Meaningful-Change Timestamp Powers Page Freshness And Sitemap Freshness (Priority: P1)

As the team, we want page `Updated` time, structured-data `dateModified`, and sitemap `lastmod` to move from the same meaningful-change decision.

**Why this priority**: Right now freshness trust is weakened if each surface updates independently.

**Independent Test**: Compare the backend freshness summary timestamp with the frontend freshness page and sitemap output for a sample match; verify they line up.

**Acceptance Scenarios**:

1. **Given** a meaningful event changes the visible freshness summary, **When** the backend summary is regenerated, **Then** it exposes a newer meaningful-change timestamp.
2. **Given** only a non-visible background field changes, **When** the summary is regenerated, **Then** the meaningful-change timestamp does not move.
3. **Given** the live-update page renders, **When** it shows visible updated time and JSON-LD dates, **Then** they use the backend meaningful-change timestamp.
4. **Given** the sitemap is rebuilt, **When** a freshness support URL is emitted, **Then** its `lastmod` uses the same backend meaningful-change timestamp where available.

---

### User Story 3 - Freshness Pages Consume Shared Backend Narrative Instead Of Recomputing Everything Client-Side (Priority: P1)

As the team, we want the freshness page to consume a backend summary contract so the page content stays stable, SSR-friendly, and easier to verify.

**Why this priority**: Shared backend output reduces duplicate logic and makes the sitemap/front-end freshness behavior more consistent.

**Independent Test**: Load a sample freshness page and verify key events, live-update entries, and summary text come from the backend summary response with sensible fallbacks.

**Acceptance Scenarios**:

1. **Given** the backend summary endpoint returns key events, **When** the live-update page renders, **Then** those entries are shown directly.
2. **Given** the backend summary endpoint returns no rich events, **When** the page renders, **Then** it falls back gracefully without breaking the page.
3. **Given** the page emits `LiveBlogPosting`, **When** JSON-LD is built, **Then** its update entries correspond to the backend live-update entries.

---

### User Story 4 - Operators Can Inspect Freshness Summary Quality Quickly (Priority: P2)

As the team, we want lightweight verification that shows whether a fixture has meaningful backend freshness coverage before we depend on it for SEO.

**Why this priority**: We need proof that the narrative layer is working on real matches, not just code completeness.

**Independent Test**: Review API output and dashboard-proof surfaces for a sample live fixture and verify they expose summary text, key events, and the backend freshness timestamp.

**Acceptance Scenarios**:

1. **Given** a sample live or recent fixture, **When** the freshness summary endpoint is queried, **Then** operators can inspect meaningful updated time and current key events.
2. **Given** the freshness dashboard review runs, **When** a page lacks narrative depth, **Then** the deficiency is visible as missing key-event or schema-readiness signals rather than hidden.

## Edge Cases

- Commentary may arrive out of order or with sparse metadata; the summary layer must prefer high-confidence visible events.
- A match may have useful result text but very weak live commentary; result/recap output should still be possible.
- Toss and playing XI may exist before rich commentary; preview/result summaries should still be meaningful.
- Sitemaps must not emit future-dated freshness `lastmod`.
- The summary engine must not invent fake milestones or score statements when source data is ambiguous.

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST expose a freshness summary contract for a match URL that includes summary text, key events, live-update entries, and a meaningful updated timestamp.
- **FR-002**: The freshness summary MUST prefer high-confidence visible events such as toss, wickets, milestones, innings break, result, and score-state changes.
- **FR-003**: The freshness summary MUST degrade honestly when source commentary is too thin to justify rich live-update entries.
- **FR-004**: The frontend freshness pages MUST consume backend freshness summary data when available.
- **FR-005**: The frontend MUST align visible updated time and page-level structured-data `dateModified` to the backend meaningful updated timestamp when available.
- **FR-006**: The sitemap freshness URLs MUST use the backend meaningful updated timestamp for `lastmod` when that signal exists and is trustworthy.
- **FR-007**: The summary engine MUST avoid moving its meaningful updated timestamp for non-visible background changes alone.
- **FR-008**: The implementation MUST preserve `/cric-live/{slug}` as the canonical match entity URL and treat the new backend narrative layer as support for freshness surfaces.
- **FR-009**: The phase MUST add focused tests covering backend summary generation and sitemap freshness timestamp alignment.

### Key Entities

- **Freshness Summary**: Shared backend response containing page-purpose narrative text, key events, live-update entries, and freshness timestamps.
- **Meaningful Updated Timestamp**: The backend timestamp representing the last visible editorial-grade change for a match freshness surface.
- **Narrative Event Entry**: A human-readable summary derived from match state or commentary, such as toss result, wicket fall, milestone, innings break, or final result.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A sample live fixture returns a backend freshness summary with readable key-event entries and a match-development summary.
- **SC-002**: A sample freshness page uses the backend meaningful updated timestamp for visible freshness and schema dates.
- **SC-003**: A sample freshness-support sitemap URL uses the backend meaningful updated timestamp for `lastmod` when available.
- **SC-004**: Focused automated tests verify backend summary generation and sitemap freshness timestamp alignment.
