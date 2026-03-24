# Feature Specification: Decoupled Player Stats Crawler

**Feature Branch**: `011-player-stats-crawler`  
**Created**: 2026-03-24  
**Status**: Draft  
**Input**: User description: "Create the spec-driven development docs for a new feature that adds a separate player stats crawler for live and upcoming matches, with optional ESPN enrichment as secondary/on-demand source, and a hard requirement that the new crawler must not slow or destabilize the existing live performance pipeline."

---

## Overview

VictoryLine's current scraper stack is optimized for low-latency live score and fast-update delivery. That path already contains dedicated logic for live discovery, immediate sV3 pushes, and separate scorecard handling. Player-level statistics are valuable, but they are slower-moving, heavier to extract, and risk competing for the same browser, queue, PID, and rate-limit budgets if implemented carelessly.

This feature adds a **separate player stats crawler** for **live** and **upcoming** cricket matches. The crawler must:

1. consume canonical match candidates from the backend's existing live and upcoming match catalog;
2. crawl player-oriented data on its **own cadence, queue, retry policy, and rate limit**;
3. push match-scoped player stats snapshots to the backend;
4. optionally enrich player records from ESPN as a **secondary, on-demand adapter**, not as a primary live or upcoming match source; and
5. remain **fully decoupled** from the existing live fast-update path so the current scoreboard pipeline stays fast and stable.

The design prioritizes operational safety over maximum scrape aggressiveness.

---

## Product Intent

VictoryLine should be able to show player context for live and upcoming matches without depending on external apps:

- **Live matches**: batting, bowling, and on-field status from the current scorecard state
- **Upcoming matches**: squad, probable/confirmed lineup context, and known player metadata when available upstream
- **Optional enrichment**: ESPN-backed profile or recent-form fields when explicitly enabled and requested

The feature is not intended to replace the current live pipeline or to introduce ESPN as a new primary match-discovery source.

---

## Scope

### In Scope

1. A separate player stats crawl worker/service in `apps\scraper\crex_scraper_python\`.
2. Match candidate intake from canonical backend endpoints such as:
   - `GET /cricket-data/live-matches`
   - `GET /cricket-data/upcoming-matches`
3. CREX-first extraction for:
   - live player scorecard stats
   - upcoming squad/player context
4. Backend persistence for match-scoped player snapshots and optional enrichment snapshots.
5. Backend read APIs for per-match player stats retrieval and enrichment status.
6. Feature flags for master enablement, live collection, upcoming collection, and ESPN enrichment.
7. Separate scheduling, queueing, rate limiting, health reporting, and load shedding for the new crawler.
8. Operational safeguards that pause or degrade the stats crawler before it can impact the live path.

### Out of Scope

- changing the current `FastUpdateManager` cadence or scoreboard push contract
- using ESPN as the primary source for live or upcoming match discovery
- historical player archive backfill across completed seasons
- major frontend redesign work
- betting, odds, commentary, or non-player analytics unrelated to player stats capture

---

## Assumptions

- The backend remains the canonical source of match identity via `LiveMatch.externalMatchKey` and related schedule/live endpoints.
- CREX remains the primary match-source provider for live and upcoming matches.
- Upcoming matches may only expose partial player context until squads or playing XI are announced.
- Player identity can start as **match-scoped** and later be linked to a canonical player record when confidence is sufficient.
- ESPN enrichment is optional and may be absent in some environments or deployments.
- The safest production deployment model is a **separate worker/container** even though local development may run inside the same codebase.

---

## Actors

| Actor | Motivation |
|-------|------------|
| Match Viewer / API Consumer | Wants player stats for live and upcoming matches without stale or missing context. |
| Backend Consumer | Needs a stable per-match player-stats API with provenance and freshness metadata. |
| Operations Engineer | Needs confidence that enabling player stats cannot slow, exhaust, or destabilize the live fast-update pipeline. |
| Admin / Support | Needs a safe way to trigger optional ESPN enrichment only when needed. |
| Product Team | Needs the feature to launch progressively behind flags and with measurable safety guardrails. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve Live Player Stats Safely (Priority: P1)

As an API consumer, I want live match player batting and bowling stats so I can power player panels without affecting the existing live score pipeline.

**Why this priority**: The main value of the feature is live player stats, but the hard requirement is that live-score freshness must not regress.

**Independent Test**: Enable the player stats crawler for a controlled set of live matches, confirm per-match player snapshots refresh on the configured player-stats cadence, and verify the existing live fast-update metrics stay within current baseline thresholds.

**Acceptance Scenarios**:

1. **Given** a live match exists in `GET /cricket-data/live-matches`, **When** the player stats crawler is enabled for live matches, **Then** the system stores a match-scoped player snapshot with batting and bowling data for that match.
2. **Given** the player stats crawler is running, **When** the main live scraper remains healthy, **Then** the player stats crawler refreshes live player data on its own cadence without altering the fast-update manager's cadence.
3. **Given** the live scraper becomes degraded or PID/memory pressure rises, **When** the player stats crawler evaluates safety guardrails, **Then** it pauses or backs off before live-score freshness degrades.

---

### User Story 2 - Capture Upcoming Match Player Context (Priority: P1)

As a user of upcoming-match APIs, I want squad or lineup context before a match starts so player panels are not empty before first ball.

**Why this priority**: Upcoming player context is the second required match state and must be collected differently from live scorecards.

**Independent Test**: Seed or crawl upcoming matches within the configured pre-match window and verify that the system stores `PARTIAL`, `SQUAD_ONLY`, or `PLAYING_XI` coverage states based on what CREX exposes.

**Acceptance Scenarios**:

1. **Given** a match appears in `GET /cricket-data/upcoming-matches`, **When** it enters the configured pre-match crawl window, **Then** the player stats crawler schedules a lower-frequency upcoming job for that match.
2. **Given** CREX exposes squads but not the playing XI, **When** the crawl completes, **Then** the backend stores partial roster context instead of treating the match as failed.
3. **Given** squads or lineups change before toss, **When** the next scheduled crawl runs, **Then** the latest roster snapshot replaces the prior one idempotently.

---

### User Story 3 - Trigger ESPN Enrichment Only When Needed (Priority: P2)

As an admin or downstream consumer, I want optional ESPN enrichment for player metadata or recent-form fields so I can fill gaps without making ESPN a primary dependency.

**Why this priority**: ESPN enrichment adds value, but it must remain optional and secondary.

**Independent Test**: With ESPN enrichment disabled, confirm no ESPN calls are made. With it enabled, trigger an on-demand enrichment request and confirm only missing optional fields are merged into the stored player record.

**Acceptance Scenarios**:

1. **Given** `ENABLE_PLAYER_STATS_ESPN_ENRICHMENT=false`, **When** live or upcoming player snapshots are collected, **Then** the crawler never contacts ESPN.
2. **Given** ESPN enrichment is enabled, **When** a consumer requests on-demand enrichment for a player or match, **Then** the system schedules an asynchronous enrichment job with separate rate limits and caches the result.
3. **Given** ESPN returns no confident match for a player, **When** the enrichment job completes, **Then** the system records a negative-cache result and leaves CREX-derived fields unchanged.

---

### User Story 4 - Preserve Live Pipeline Stability (Priority: P1)

As an operations engineer, I want the new player stats crawler to fail independently so incidents in the stats path never slow or destabilize live scoring.

**Why this priority**: This is the feature's non-negotiable operating constraint.

**Independent Test**: Induce ESPN errors, CREX throttling, queue backlog, and high-PID conditions in the player stats worker while verifying the live scraper and backend live endpoints remain healthy and unchanged.

**Acceptance Scenarios**:

1. **Given** the player stats crawler queue backs up, **When** backlog thresholds are exceeded, **Then** the worker sheds low-priority upcoming and enrichment jobs before touching live fast-update resources.
2. **Given** the player stats worker crashes or is disabled, **When** the primary live scraper continues running, **Then** live match discovery and fast updates remain operational.
3. **Given** the player stats crawler is deployed, **When** comparing live freshness before and after enablement, **Then** there is no material regression beyond the approved tolerance window.

---

### User Story 5 - Expose Provenance and Freshness Clearly (Priority: P2)

As a backend consumer, I want freshness, coverage, and source metadata so I know whether a player field came from CREX or ESPN and how complete it is.

**Why this priority**: Mixed-source data is only trustworthy if provenance is explicit.

**Independent Test**: Fetch match-scoped player stats from the backend and confirm the response includes coverage state, last refreshed timestamps, and provider provenance for both base and enriched fields.

**Acceptance Scenarios**:

1. **Given** a match snapshot is retrieved, **When** the backend returns player stats, **Then** the response includes `coverageState`, `capturedAt`, and `sourceSystem`.
2. **Given** enrichment fields are present, **When** the response is serialized, **Then** enriched fields identify ESPN as the provider and include enrichment freshness metadata.
3. **Given** the upcoming roster is incomplete, **When** the consumer reads the API, **Then** the response clearly indicates partial coverage instead of implying a full lineup.

---

## Edge Cases

- A live match has scorecard rows but unresolved player identity; the system must store match-scoped players first and reconcile later.
- CREX team sheets change close to toss; upcoming snapshots must be replaceable and versioned.
- Substitute or impact players appear mid-match and must be added without corrupting existing lineup order.
- Two players share the same display name; identity resolution must preserve a match-scoped fallback key.
- CREX returns player abbreviations only; the crawler must attempt page/localStorage expansion before falling back to a shorter display name.
- ESPN search returns ambiguous or incorrect candidates; enrichment must require a confidence threshold and negative-cache misses.
- The main live scraper reports `DEGRADED` or high PID pressure; the stats worker must pause or reduce scope automatically.
- The stats worker is restarted while jobs are in flight; leases must expire safely and allow idempotent retry.
- Upcoming matches may expose no squads at all; that must be represented as `NOT_AVAILABLE` or `PARTIAL`, not as a hard scrape failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement the player stats crawler as a **separate worker/service path** from the live fast-update path.
- **FR-002**: The player stats crawler MUST use its own scheduling loop, queue, retry policy, and per-domain rate limits.
- **FR-003**: In production, the player stats crawler MUST be deployable as a separate process or container from the primary scraper service.
- **FR-004**: The player stats crawler MUST obtain live and upcoming match candidates from backend-managed canonical match endpoints before scheduling player-stat jobs.
- **FR-005**: The primary source for live and upcoming player stats MUST be CREX-derived scorecard/info/squad data, not ESPN.
- **FR-006**: The system MUST crawl live player scorecard data on a player-stats cadence that is independent from the 1-second fast-update cadence.
- **FR-007**: The system MUST crawl upcoming squad or lineup data on a slower schedule than live player stats and only within a configurable pre-match window.
- **FR-008**: The system MUST persist match-scoped player snapshots containing, where available, batting stats, bowling stats, role, lineup status, team affiliation, and capture timestamps.
- **FR-009**: The system MUST preserve provenance for every snapshot, including source system and enrichment status.
- **FR-010**: The system MUST support a master feature flag `ENABLE_PLAYER_STATS_CRAWLER` and sub-flags for live, upcoming, and ESPN enrichment behavior.
- **FR-011**: The default rollout mode MUST allow the player stats crawler to be fully disabled without changing the existing live pipeline.
- **FR-012**: The system MUST auto-pause, back off, or shed lower-priority jobs when:
  - the primary live scraper is not healthy,
  - PID or memory thresholds approach configured limits,
  - the player-stats queue exceeds configured backlog thresholds, or
  - source rate limits are being hit persistently.
- **FR-013**: Upcoming player capture MUST support partial states such as `NOT_AVAILABLE`, `SQUAD_ONLY`, and `PLAYING_XI`.
- **FR-014**: The backend MUST expose read APIs for match-scoped player stats and freshness metadata.
- **FR-015**: The backend MUST expose an explicit API or command path for asynchronous on-demand enrichment requests.
- **FR-016**: ESPN integration MUST be implemented as a separate optional enrichment adapter and MUST NOT be used for primary live or upcoming match discovery.
- **FR-017**: ESPN enrichment MUST run only when explicitly enabled and MUST use separate rate limits, retries, and negative-cache behavior from CREX extraction.
- **FR-018**: Enrichment merges MUST fill optional or missing fields without overwriting higher-confidence CREX match-scoped live data.
- **FR-019**: Writes from the player stats crawler to the backend MUST be idempotent using a stable snapshot identity such as `externalMatchKey + playerKey + innings + capturedAt/hash`.
- **FR-020**: The system MUST expose player-stats-specific health and metrics separately from the existing live scraper health surface.
- **FR-021**: The system MUST use separate Redis keys or storage namespaces for player-stats job state and snapshot caches.
- **FR-022**: The system MUST support match-scoped player keys first and optional canonical player linkage second, with confidence/provenance recorded for each mapping.

### Non-Functional Requirements

- **NFR-001**: Enabling the player stats crawler MUST NOT cause a material regression in the live pipeline's existing fast-update latency or health grade.
- **NFR-002**: Live player snapshots SHOULD refresh within **20 seconds** of a scorecard-visible change under normal load.
- **NFR-003**: Upcoming squad/lineup snapshots SHOULD refresh on a lower cadence, with defaults no more aggressive than:
  - every **10 minutes** inside the configured pre-match window, and
  - every **2 minutes** once a lineup or toss-adjacent state is detected.
- **NFR-004**: ESPN enrichment MUST NEVER block primary CREX snapshot ingestion or backend reads.
- **NFR-005**: The initial worker defaults SHOULD cap player-stats concurrency conservatively (for example, 1 browser / 2 contexts or equivalent bounded resource usage) until soak testing proves higher safe limits.
- **NFR-006**: Queue overload MUST prefer dropping or deferring upcoming/enrichment work before live player-stat work.
- **NFR-007**: The worker MUST be observable enough to diagnose source throttling, stale snapshots, queue backlog, and pause reasons.
- **NFR-008**: All API and storage contracts MUST be deterministic and testable with replay fixtures.

### Key Entities *(include if feature involves data)*

- **PlayerStatsJob**: scheduled work item for live, upcoming, or enrichment collection with priority, lease, retry count, and pause reason.
- **PlayerMatchSnapshot**: latest match-scoped player-stat payload for one match and one capture instant.
- **PlayerStatLine**: per-player row inside a snapshot, including match-scoped identity, team, role, lineup status, batting/bowling fields, and provenance.
- **PlayerEnrichmentSnapshot**: optional ESPN-derived metadata or recent-form payload stored separately from primary CREX capture.
- **PlayerIdentityLink**: mapping between provider-specific player references and an optional canonical player ID, including confidence score.
- **CoverageState**: completeness indicator such as `NOT_AVAILABLE`, `SQUAD_ONLY`, `PLAYING_XI`, `LIVE_SCORECARD`, `PARTIAL`, or `COMPLETE`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the feature enabled for live matches, player-stat snapshots are retrievable for monitored live matches from the backend without manual seeding.
- **SC-002**: With the feature enabled for upcoming matches, upcoming fixtures inside the configured window return at least a partial player-context snapshot when CREX exposes roster data.
- **SC-003**: With ESPN enrichment disabled, the system performs zero ESPN requests during normal live/upcoming collection.
- **SC-004**: With ESPN enrichment enabled, on-demand enrichment jobs complete asynchronously and do not block base CREX snapshot availability.
- **SC-005**: In soak and failure tests, the live fast-update path remains within approved freshness/error tolerances before and after player-stats rollout.
- **SC-006**: Operations can disable the player stats crawler via feature flag or deployment toggle without requiring live scraper code rollback.
- **SC-007**: API responses expose enough provenance and freshness metadata for consumers to distinguish base CREX data from optional ESPN enrichment.

## Success Validation Strategy

1. Reuse CREX live, scorecard, info, and schedule fixtures to build deterministic parser tests.
2. Replay a mix of live, upcoming, no-squad, and ambiguous-player scenarios against the new worker.
3. Compare live scraper health and freshness metrics with player stats disabled vs enabled.
4. Validate feature-flag behavior for:
   - crawler disabled
   - live only
   - live + upcoming
   - live + upcoming + ESPN enrichment
5. Verify enrichment negative caching and merge precedence with controlled ESPN-miss fixtures.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Player stats reuse the same browser or queue budget as fast updates | Live pipeline slows or destabilizes | Run player stats as a separate worker with independent browser pool, queue, and conservative defaults |
| CREX upcoming pages expose incomplete squad data | Sparse upcoming player context | Model partial coverage explicitly and refresh on lower cadence rather than failing hard |
| ESPN enrichment becomes a hidden dependency | Live/upcoming feature becomes fragile | Keep ESPN behind a disabled-by-default feature flag and allow only async/on-demand usage |
| Player identity is ambiguous across sources | Wrong player attached to a stat row | Persist match-scoped player keys first and add confidence-scored identity linking later |
| Source throttling or browser leaks in stats worker | Shared environment pressure | Separate rate-limit buckets, queue shedding, PID-aware pauses, and distinct health reporting |

## Out-of-Scope Confirmations

- No change to the current fast-update manager's 1-second interception strategy.
- No ESPN-first live/upcoming crawler.
- No requirement to build historical season-level player archives in this feature.
- No requirement to deliver frontend UI changes in the same implementation slice, though the backend contract should support them later.
