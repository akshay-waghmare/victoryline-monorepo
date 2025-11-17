# Feature Specification: Upcoming Matches Feed

**Feature Branch**: `005-upcoming-matches`  
**Created**: 2025-11-16  
**Status**: Draft  
**Input**: Backend and scraper-only implementation for upcoming cricket fixtures feed

## User Scenarios & Testing

### User Story 1 - Backend API Consumer Accesses Upcoming Fixtures (Priority: P1)

A backend API consumer (frontend application, mobile app, or third-party service) needs to retrieve a list of upcoming cricket matches with filtering and pagination capabilities.

**Why this priority**: This is the core functionality that enables all downstream use cases. Without this API, no client can access upcoming match data.

**Independent Test**: Can be fully tested by making HTTP GET requests to `/api/v1/matches/upcoming` with various query parameters and verifying the response structure, pagination, and filtering behavior.

**Acceptance Scenarios**:

1. **Given** the API is running and fixtures data exists, **When** a client requests GET `/api/v1/matches/upcoming?page=1&pageSize=20`, **Then** the system returns a paginated list of upcoming matches with 20 items in the standard response envelope
2. **Given** multiple upcoming matches exist, **When** a client filters by team name `?team=India`, **Then** only matches involving India (in teamA or teamB) are returned
3. **Given** matches scheduled across multiple dates, **When** a client filters with `?from=2025-12-01T00:00:00Z&to=2025-12-31T23:59:59Z`, **Then** only matches within that date range are returned
4. **Given** a specific match exists, **When** a client requests GET `/api/v1/matches/upcoming/{id}`, **Then** the full match details are returned with venue, teams, and schedule information

---

### User Story 2 - Scraper Maintains Fresh Fixture Data (Priority: P1)

The scraper service periodically fetches upcoming fixtures from crex.com, normalizes the data, and updates the backend database to ensure API consumers receive current fixture information.

**Why this priority**: Data freshness is critical for user trust. Stale fixture data undermines the entire feature.

**Independent Test**: Can be tested by monitoring scraper logs for successful fetch cycles, verifying database updates with recent `last_scraped_at` timestamps, and confirming new fixtures appear in API responses.

**Acceptance Scenarios**:

1. **Given** the scraper is running on a 10-minute schedule, **When** a scraping cycle completes successfully, **Then** the database contains updated fixture records with current `last_scraped_at` timestamps
2. **Given** a new fixture is announced on crex.com, **When** the scraper runs its next cycle (within 10 minutes), **Then** the new fixture appears in the database and is accessible via the API
3. **Given** a fixture is postponed on the source, **When** the scraper detects the status change, **Then** the database record status is updated to 'postponed' and the API reflects this change
4. **Given** the scraper encounters a transient error (4xx/5xx), **When** the error occurs, **Then** the scraper logs the failure, applies exponential backoff, and retries once before moving to the next cycle

---

### User Story 3 - Operations Team Monitors Scraper Health (Priority: P2)

Operations team members need visibility into scraper health, data freshness, and resource usage to detect and respond to issues before they impact users.

**Why this priority**: Proactive monitoring prevents prolonged outages and enables quick response to the known PID leak incident class.

**Independent Test**: Can be tested by calling GET `/api/v1/health/upcoming` and verifying the response includes status, lastScrapeAt timestamp, and pidCount metrics.

**Acceptance Scenarios**:

1. **Given** the scraper is operating normally, **When** the health endpoint is called, **Then** it returns status 'healthy', a recent lastScrapeAt timestamp (<15 minutes old), and pidCount below 200
2. **Given** the scraper hasn't run successfully in 20 minutes, **When** the health endpoint is called, **Then** it returns status 'degraded' and indicates data staleness
3. **Given** the scraper PID count exceeds 300, **When** the health endpoint is called, **Then** it returns status 'failing' and includes the current pidCount for investigation
4. **Given** a monitoring system polls the health endpoint, **When** status changes from 'healthy' to 'degraded' or 'failing', **Then** alerts are triggered per the configured thresholds

---

### Edge Cases

- What happens when crex.com is unavailable or returns malformed HTML? → Scraper logs error, skips this cycle, continues normal schedule for next attempt
- How does the system handle duplicate fixtures with identical source_key? → Upsert logic updates existing record based on UNIQUE(source, source_key) constraint
- What happens when a fixture start_time changes after initial scraping? → Scraper updates the record; lastScrapeAt and updated_at timestamps reflect the change
- How are cancelled matches after they've started handled? → Out of scope for this phase (covers only upcoming/scheduled fixtures; live/completed match handling is separate)
- What if pagination requests exceed available data (page 100 when only 3 pages exist)? → Returns empty items array with correct total count
- How are timezone conversions handled? → All times stored as UTC; client responsible for local display (Phase 2 UI work)
- What happens if scraper Playwright processes fail to clean up? → Docker PID limit (512) enforces hard cap; health endpoint exposes pidCount for monitoring; manual restart required if limit reached
- How is concurrent scraper execution prevented? → Single-instance design (no distributed locking in Phase 1); future enhancement if horizontal scaling needed

## Clarifications

### Session 2025-11-16

- Q: Exponential backoff configuration for scraper error retry (FR-020) - What are the timing parameters? → A: Conservative approach - Initial delay 2s, multiplier 2x, max delay 5s (total wait: 2-5s per retry)
- Q: Cache invalidation strategy for Redis list responses (FR-026, FR-027) - How should cache be invalidated when scraper updates fixtures? → A: Selective eviction - Track affected date ranges and delete only matching cache keys for precision

## Requirements

### Functional Requirements

- **FR-001**: System MUST expose a REST API endpoint GET `/api/v1/matches/upcoming` returning paginated list of upcoming fixtures
- **FR-002**: System MUST support pagination parameters: `page` (1-indexed, default 1), `pageSize` (1-100, default 20)
- **FR-003**: System MUST support filtering by date range: `from` (ISO-8601 UTC inclusive), `to` (ISO-8601 UTC inclusive)
- **FR-004**: System MUST support filtering by team name or code via `?team=` query parameter (case-insensitive partial match)
- **FR-005**: System MUST support filtering by series name via `?series=` query parameter (case-insensitive partial match)
- **FR-006**: System MUST expose a REST API endpoint GET `/api/v1/matches/upcoming/{id}` returning single fixture details
- **FR-007**: All API responses MUST follow the standard envelope: `{success, data, error, timestamp}`
- **FR-008**: System MUST return appropriate HTTP status codes: 200 (OK), 400 (Bad Request), 404 (Not Found), 500 (Internal Server Error)
- **FR-009**: System MUST validate pagination parameters and return 400 with descriptive error for invalid values
- **FR-010**: System MUST persist fixture data in MySQL with fields: source, source_key, series_name, match_title, team names/codes, start_time_utc, venue, status, timestamps
- **FR-011**: System MUST enforce UNIQUE constraint on (source, source_key) to prevent duplicate fixture records
- **FR-012**: System MUST create indexes on: start_time_utc, series_name, team_a_name, team_b_name for query performance
- **FR-013**: Scraper MUST fetch upcoming fixtures from crex.com on a 10-minute schedule
- **FR-014**: Scraper MUST normalize scraped data into standardized schema: source, source_key, teams, series, venue, start_time_utc, status
- **FR-015**: Scraper MUST upsert fixtures (insert new, update existing based on source_key)
- **FR-016**: Scraper MUST set `last_scraped_at` timestamp on each successful fixture sync
- **FR-017**: Scraper MUST handle postponements and cancellations by updating status field
- **FR-018**: Scraper MUST use HTTP requests + BeautifulSoup for static fixture pages (preferred)
- **FR-019**: Scraper MUST support optional Playwright fallback for JS-required pages with strict cleanup (`with sync_playwright()`, `browser.close()` in finally)
- **FR-020**: Scraper MUST apply exponential backoff on 4xx/5xx errors (max 1 retry per cycle) with initial delay 2s, multiplier 2x, max delay 5s
- **FR-021**: Scraper MUST log all fetch attempts, success/failure status, and record counts
- **FR-022**: System MUST expose health endpoint GET `/api/v1/health/upcoming` returning: status (healthy/degraded/failing), lastScrapeAt, pidCount
- **FR-023**: Health endpoint MUST return 'healthy' when last scrape completed <15 minutes ago and pidCount <200
- **FR-024**: Health endpoint MUST return 'degraded' when last scrape is 15-30 minutes old
- **FR-025**: Health endpoint MUST return 'failing' when last scrape is >30 minutes old or pidCount >300
- **FR-026**: Backend MUST cache GET `/api/v1/matches/upcoming` list responses in Redis with 10-minute TTL (optional but recommended)
- **FR-027**: Backend MUST invalidate cache entries when scraper updates affect the queried date range by tracking updated fixture start_time ranges and selectively deleting only cache keys with overlapping date filters
- **FR-028**: Docker Compose configuration MUST set PID limit (512) for scraper container to prevent thread exhaustion

### Key Entities

- **UpcomingMatch**: Represents a scheduled cricket fixture with source attribution, team details, venue, start time, and current status (scheduled/postponed/cancelled). Includes metadata for data freshness tracking.
- **Team**: Referenced by name and optional code (IND, AUS, etc.) within UpcomingMatch; no separate table in Phase 1.
- **Venue**: Embedded within UpcomingMatch as name, city, country; no separate table in Phase 1.
- **Series**: Referenced by name within UpcomingMatch; no separate table in Phase 1.

## Success Criteria

### Measurable Outcomes

- **SC-001**: API GET `/api/v1/matches/upcoming` responds in <200ms at P95 with Redis caching enabled
- **SC-002**: Scraper completes full fixture sync in <5 seconds per source page
- **SC-003**: Data freshness: 95% of fixture records have `last_scraped_at` <15 minutes old during active scraping periods
- **SC-004**: Accuracy: ≥95% of scraped fixture details (teams, venue, start time) match source data (manual spot-check validation)
- **SC-005**: Scraper maintains stable resource usage: PID count remains <150 during normal operation over 24-hour period
- **SC-006**: Zero "can't start new thread" errors in scraper logs over 7-day observation period
- **SC-007**: Health endpoint correctly reflects status transitions (healthy → degraded → failing) based on defined thresholds
- **SC-008**: API correctly filters fixtures by team name with <1% false positive/negative rate (test with 100 sample queries)
- **SC-009**: API correctly filters fixtures by date range with 100% accuracy (test with 50 edge cases: start of day, end of day, DST boundaries)
- **SC-010**: System handles scraper restart gracefully: fixture data remains available via API with staleness indicator during restart window (<2 minutes)

## Assumptions

- crex.com fixture pages remain structurally stable; scraper selectors may require maintenance if layout changes
- Fixture data volume: O(10²–10³) upcoming matches at any given time; database and cache sized accordingly
- Single data source (crex.com) in Phase 1; multi-source reconciliation deferred to future phase
- No real-time fixture updates required; 10-minute refresh cadence acceptable per user research
- Backend Spring Boot 2.x and Python 3.10+ scraper are existing services; no new infrastructure provisioning required
- Redis is available in the deployment environment for caching; system degrades gracefully if Redis unavailable (direct DB queries)
- Docker Compose is the deployment mechanism; Kubernetes migration out of scope
- No authentication required for upcoming matches API in Phase 1 (public read-only data)

## Dependencies

- Existing Backend API (Spring Boot 2.x, Java 11, MySQL, JPA/Hibernate)
- Existing Scraper service (Python 3.10+, Flask, requests/BeautifulSoup/Playwright)
- Existing MySQL database with migration capability (Flyway or Liquibase)
- Redis instance (optional but recommended for caching)
- Docker Compose orchestration
- crex.com external data source availability and stability

## Out of Scope (Phase 1)

- Frontend UI for displaying upcoming matches (deferred to Phase 2)
- User authentication and authorization for API access
- Multi-source fixture data reconciliation (espncricinfo, cricbuzz)
- Real-time fixture updates (WebSocket/SSE)
- Advanced filtering: format (Test/ODI/T20), tournament type, venue capacity
- Fixture notifications (email, push, webhook)
- Historical fixture data archival beyond current + next 90 days
- Horizontal scraper scaling with distributed locking
- Fixture edit/override admin interface
- Match preview content (team form, head-to-head stats, predicted lineups)
