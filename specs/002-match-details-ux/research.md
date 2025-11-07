# Research (Phase 0) — Match Details UI/UX Redesign

This document consolidates clarifications and decisions required to proceed with design and contracts.

## Decisions

### 1) Live update mechanism (WebSocket vs polling)
- Decision: WebSocket channel subscription as primary; polling (≤5s) as fallback only.
- Rationale: Project already uses WebSockets; ensures push-based low-latency updates. Polling retained solely for resilience.
- Alternatives considered: Server-Sent Events (SSE) — not needed; pure polling — inferior latency and higher bandwidth.

### 2) Commentary ordering
- Decision: Latest-first ordering (newest entries appear at top).
- Rationale: Aligns with mobile quick-scan behavior; mirrors popular cricket apps; reduces scroll-to-bottom need during live.
- Alternatives: Chronological oldest-first (better for reading narrative end-to-end) — acceptable but less convenient live.

### 3) Commentary pagination window & retention
- Decision: Page size = 30 entries; "Load more" appends older entries. Retain full history accessible via pagination.
- Rationale: Balances payload size and user control; supports very long matches without memory blowups.
- Alternatives: Time-windowed pages (per over), infinite scroll with auto-load (risk of performance issues on low-end devices).

### 4) Partnerships in scorecard (Phase 002 or later)
- Decision: Defer partnerships visualization to Phase 002.1; keep fall-of-wickets in Phase 002.
- Rationale: Non-blocking; adds complexity; can be layered later without UI churn.
- Alternatives: Include now (adds scope and time).

### 5) Desktop compact mode toggle
- Decision: Not in Phase 002 MVP; consider as enhancement flag later.
- Rationale: Keep scope tight; ensure base UX quality first.
- Alternatives: Implement now (adds settings UI + persistence + QA matrix).

### 6) Backend versions and contract alignment
- Decision: Assume Spring Boot 2.x and Java 8/11; confirm during backend implementation of contracts.
- Rationale: Directory naming suggests Spring Boot; versions won’t impact contract shape.
- Alternatives: Spring Boot 3.x / Java 17 (requires verification and potentially different plugin setups).

### 7) Data freshness tiers
- Decision: Adopt tiers per Constitution: <30s live, 30–120s warning, >120s error.
- Rationale: Standard across project.
- Alternatives: None required.

## Best Practices (applied)
- Accessibility: WCAG 2.1 AA, focus-visible, ARIA roles, non-color cues for highlights.
- Performance: Virtualize long lists; minimize DOM updates; lazy load non-critical; throttled updates.
- Resilience: Retry with backoff; user-visible status; graceful degradation.
- Contracts: REST with versioning `/api/v1/`; standard response envelope.

## Open Questions (tracked but non-blocking)
- Weather data inclusion (source reliability and license).
- Analytics event taxonomy specifics (can default to tab_change, commentary_load_more, snapshot_refresh, staleness_state_change).

--
All clarifications above resolve "NEEDS CLARIFICATION" items from the spec/plan for Phase 002.
