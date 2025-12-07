# Feature Specification: Completed Matches Functionality

**Feature Branch**: `008-completed-matches`  
**Created**: December 6, 2025  
**Status**: Draft  
**Input**: User description: "I want add completed match funtionality In matches nav tab show completed tab here dont have complited matches functionality here already live matech are show correctly when live matches is completed then you can store live matches as completed matches (store last 20 matesh) we have already LIVE_MATCH table is there"

## Current State Analysis

The Matches page (`/app/features/matches/pages/matches-list`) already has a **Completed tab** in the navigation alongside Live, Upcoming, and All Matches tabs. However, this tab is **currently non-functional** because:

1. The `MatchesService.getLiveMatches()` method filters out completed matches (`!item.finished && !item.deleted`)
2. The service only retrieves live/active matches from the API
3. There is no separate endpoint or storage for completed matches
4. The tab shows an empty state because `filterCompletedMatches()` always returns zero matches

**What needs to be implemented**: Add backend storage and API endpoint for completed matches, and update the frontend service to fetch and display them when the Completed tab is selected.

### Database Schema Analysis

**Current Database**: H2 (file-based) or MySQL (environment-dependent)
- Connection: `jdbc:h2:file:./testdb` (default)
- JPA Mode: `spring.jpa.hibernate.ddl-auto=update` (auto-creates tables from entities)

**Existing Tables Related to Matches:**

1. **`LIVE_MATCH`** (Primary table for live matches)
   - `id` (BIGINT, auto-increment, primary key)
   - `url` (VARCHAR, unique match identifier from crex.com)
   - `isDeleted` (BOOLEAN, soft delete flag - **indicates match completion**)
   - `lastKnownState` (VARCHAR/TEXT, JSON string with final match data including winner)
   - `deletionAttempts` (INT, counter for deletion attempts)
   - `isDistributionDone` (BOOLEAN, betting distribution flag)
   - Index: `idx_is_deleted` on `isDeleted` column

2. **`cricket_data`** (Detailed live match data)
   - `url` (VARCHAR, primary key, links to LIVE_MATCH)
   - `battingTeamName`, `over`, `score` (live match details)
   - Links to: `match_info`, `team_odds`, `session_odds`, `overs_data`
   - Has timestamps: `createdAt`, `updatedAt`

3. **`match_info`** (Match metadata)
   - `url` (VARCHAR, primary key)
   - `matchDate`, `venue`, `matchName`, `tossInfo`
   - Links to: `team_comparison`, `venue_stats`, `playing_xi`, `team_form`

4. **`scorecard`** (Match scorecard data)
   - `url` (VARCHAR, primary key)
   - `data` (CLOB, JSON scorecard data)

**Implementation Approach for Completed Matches:**

**Selected Approach: Use existing LIVE_MATCH table with isDeleted=true filter** (minimal schema changes)
- Query completed matches: `WHERE isDeleted=true ORDER BY updatedAt DESC LIMIT 20`
- The `isDeleted=true` flag is the established system convention for marking completed matches
- The `updatedAt` timestamp field is used for ordering (updated when match completes) - no new completedAt column needed
- The `lastKnownState` field already contains match result data (winner, final score)
- The existing `getWinningTeam()` method can parse winner information
- **20-match limit enforcement**: API query uses LIMIT 20 clause - no physical deletion of older records from database (keeps historical data)
- Add index on `isDeleted` and `updatedAt` for efficient queries
- **No schema migration required** - uses only existing columns

**Alternative approaches considered but not selected:**
- **Extend LIVE_MATCH with additional columns** (completedAt, status enum, cached finalScore/winnerTeam) - adds complexity without clear benefit since lastKnownState already contains this data
- **Create new COMPLETED_MATCH table** - introduces data duplication and requires background sync job

## Clarifications

### Session 2025-12-07

- Q: Which database implementation approach should be used (extend LIVE_MATCH with new columns, create new COMPLETED_MATCH table, or use existing LIVE_MATCH as-is filtering by isDeleted=true)? → A: Use existing LIVE_MATCH table as-is, filter by isDeleted=true (minimal schema changes) - isDeleted=true is the established convention for completed matches
- Q: How does the system detect when isDeleted changes to true (scheduled polling, existing scraper/background job, event-driven, or manual/API-triggered)? → A: Existing scraper/background job already sets isDeleted=true when matches complete (no new detection logic needed)
- Q: How should the 20-match limit be enforced (scheduled cleanup job deletes old records, API returns only 20 most recent via LIMIT, database trigger, or manual cleanup)? → A: API returns only the 20 most recent (via LIMIT clause, no physical deletion from DB)
- Q: When the API for completed matches fails, how should the UI respond (show error message with retry, fall back to empty state silently, show cached/stale data, or show skeleton loading indefinitely)? → A: Show error message with retry option (e.g., "Unable to load completed matches. Tap to retry")
- Q: Should a dedicated completedAt timestamp column be added to LIVE_MATCH, or use the existing updatedAt field for ordering completed matches? → A: Use updatedAt without adding completedAt (minimal changes, sufficient for ordering)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Completed Matches in Existing Tab (Priority: P1)

Users want to see a list of recently completed cricket matches in the existing Completed tab to review results and access match details they may have missed.

**Why this priority**: This is the core functionality that delivers immediate value - users can access historical match information in the tab that currently shows no data.

**Independent Test**: Can be fully tested by navigating to the Matches page, clicking the existing "Completed" tab, and verifying that recently completed matches are displayed with their final scores and results. Delivers standalone value by making the existing tab functional.

**Acceptance Scenarios**:

1. **Given** a user is on the Matches page, **When** they click the existing "Completed" tab, **Then** they see a list of up to 20 recently completed matches with team names, final scores, and match results
2. **Given** a user views the Completed matches tab, **When** multiple matches have finished, **Then** matches are displayed in reverse chronological order (most recent first)
3. **Given** a user sees a completed match in the list, **When** they tap/click on the match card, **Then** they navigate to the full match details page showing scorecard, match info, and lineups
4. **Given** there are no completed matches stored, **When** a user views the Completed tab, **Then** they see the existing empty state message "No matches found"

---

### User Story 2 - Automatic Match Completion (Priority: P1)

The system's existing scraper/background job automatically marks matches as completed by setting isDeleted=true, making them available in the completed matches list without requiring any new detection logic.

**Why this priority**: This is critical infrastructure that enables the primary user story - the existing completion mechanism ensures the completed matches list is automatically populated. This feature leverages existing behavior.

**Independent Test**: Can be fully tested by monitoring a live match until the scraper marks it complete (isDeleted=true), then verifying that it appears in the Completed tab. Delivers value by ensuring data accuracy through existing automated processes.

**Acceptance Scenarios**:

1. **Given** a match is currently live in the LIVE_MATCH table, **When** the match finishes (isDeleted flag becomes true), **Then** the match is automatically stored in the completed matches storage
2. **Given** a match has just completed, **When** the system detects completion, **Then** the match data includes final score, winning team, and match result from the lastKnownState field
3. **Given** there are more than 20 completed matches in the database, **When** the API is called, **Then** only the 20 most recent completed matches are returned (older matches remain in DB but aren't displayed)
4. **Given** multiple matches complete simultaneously, **When** the scraper processes completions, **Then** all completed matches are marked correctly (isDeleted=true) without data loss or duplication

---

### User Story 3 - Completed Match Card Display (Priority: P2)

Completed match cards display clear, comprehensive information including final scores, winning team, and match result to help users quickly understand match outcomes.

**Why this priority**: While important for user experience, this enhances the basic functionality rather than enabling it. Users can still access completed matches with basic information, making this a priority 2 enhancement.

**Independent Test**: Can be fully tested by viewing completed matches and verifying that each card shows complete information (team names, scores, winner, result text). Delivers value by improving information clarity and reducing need to open full match details.

**Acceptance Scenarios**:

1. **Given** a user views a completed match card, **When** the match has a winner, **Then** the winning team is visually highlighted or indicated
2. **Given** a completed match card is displayed, **When** the match has a result text (e.g., "India won by 7 wickets"), **Then** the result text is prominently displayed on the card
3. **Given** a user views completed matches on mobile, **When** they see match cards, **Then** cards are touch-optimized with minimum 44x44px tap targets and responsive layout
4. **Given** a completed match has team logos available, **When** the card is rendered, **Then** team logos are displayed with lazy loading and fallback to team abbreviations if logo fails

---

### User Story 4 - Completed Tab Count Display (Priority: P2)

The existing Completed tab badge shows the accurate count of available completed matches, helping users understand if there are matches to view.

**Why this priority**: This improves UX by providing information scent, but the core functionality (viewing completed matches) works without accurate counts. This enhances user awareness.

**Independent Test**: Can be fully tested by viewing the matches page tab navigation and verifying that the Completed tab shows the correct count badge. Delivers value by setting user expectations before clicking.

**Acceptance Scenarios**:

1. **Given** there are completed matches stored, **When** a user views the Matches page, **Then** the Completed tab displays the correct count (up to 20) in the badge
2. **Given** the Completed tab badge shows a count, **When** a user clicks the tab, **Then** the displayed count matches the number of match cards shown
3. **Given** the matches list auto-refreshes, **When** new matches complete, **Then** the Completed tab count updates automatically without page refresh
4. **Given** there are zero completed matches, **When** a user views the Matches page, **Then** the Completed tab badge shows "0" or is hidden

---

### Edge Cases

- What happens when a match is marked as completed but has incomplete data (no final score or winner)?
- How does the system handle matches that are abandoned or ended due to external factors (weather, forfeit)?
- What happens if the system fails to detect match completion for several hours?
- How are duplicate completed matches prevented if the same match is processed multiple times?
- What happens when a user tries to access a completed match that was removed from the 20-match limit?
- How does the system handle concurrent match completions without race conditions or data corruption?
- What happens if the lastKnownState field is null or corrupted when a match completes?
- How does the existing match card component handle displaying completed match status differently from live matches?
- **What happens when the API for completed matches fails?** → Show error message with retry option (e.g., "Unable to load completed matches. Tap to retry") - provides transparency and recovery path
- How does the tab count badge update when matches transition from live to completed in real-time?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST query completed matches from LIVE_MATCH table where isDeleted=true (this is the established convention for completed matches)
- **FR-002**: System MUST retrieve completed matches with their existing data: match URL, lastKnownState (contains final scores and winner), and timestamp
- **FR-003**: System MUST return a maximum of 20 most recent completed matches using SQL LIMIT clause, ordered by completion time descending (older matches remain in database)
- **FR-004**: System MUST provide a REST API endpoint to retrieve completed matches for the frontend
- **FR-005**: Frontend MatchesService MUST fetch completed matches from the API when the Completed tab is selected
- **FR-006**: System MUST display completed matches in reverse chronological order (most recent first) in the existing Completed tab
- **FR-007**: Users MUST be able to navigate to full match details from a completed match card by tapping/clicking (existing functionality)
- **FR-008**: System MUST extract winning team information from the lastKnownState field when storing completed matches
- **FR-009**: Completed match cards MUST display team names, final scores, and match result text using the existing match card component
- **FR-010**: System MUST handle cases where completed match data is incomplete by storing available data and marking missing fields
- **FR-011**: System MUST prevent duplicate entries for the same completed match URL
- **FR-012**: The existing Completed tab count badge MUST display the accurate number of completed matches available
- **FR-013**: Completed matches data MUST be fetched with the existing matches list (not require separate API call) OR fetched only when Completed tab is clicked to optimize performance
- **FR-014**: System MUST use the existing match card component (`app-match-card`) to display completed matches without creating new UI components
- **FR-015**: When the completed matches API fails, the UI MUST display an error message with a retry option (e.g., "Unable to load completed matches. Tap to retry") instead of silently falling back to empty state

### Key Entities *(include if feature involves data)*

- **CompletedMatch**: Represents a finished cricket match. **Implementation**: Extend existing `LIVE_MATCH` table with columns: `completedAt` (TIMESTAMP), `status` (VARCHAR: 'LIVE'|'COMPLETED'), `finalScore` (VARCHAR, cached), `winnerTeam` (VARCHAR, cached from `lastKnownState`). Match URL remains unique identifier. Alternative: New `COMPLETED_MATCH` table with denormalized data (id, url, completedAt, finalScore, winnerTeam, matchResult, team1, team2, venue).
  
- **LiveMatch**: Existing entity in `LIVE_MATCH` table representing currently active matches. Contains:
  - `id` (BIGINT, primary key)
  - `url` (VARCHAR, unique match identifier)
  - `isDeleted` (BOOLEAN) - **Currently indicates match completion**
  - `lastKnownState` (VARCHAR/TEXT) - Contains final match result text (e.g., "India won by 7 wickets")
  - `isDistributionDone` (BOOLEAN) - Betting settlement flag
  - Existing `getWinningTeam()` method extracts winner from `lastKnownState`
  
- **CricketDataEntity**: Linked match details in `cricket_data` table. Contains live score data, team info, overs data. Links via `url` foreign key. Has `createdAt` and `updatedAt` timestamps useful for tracking match lifecycle.

- **ScorecardEntity**: Match scorecard in `scorecard` table. Contains CLOB field with JSON scorecard data. Links via `url`. Preserved for completed matches for historical access.

- **MatchInfoEntity**: Match metadata in `match_info` table. Contains venue, date, team names, toss info. Links via `url`. Provides additional context for completed matches.

- **MatchCardViewModel**: Existing frontend model used to display both live and completed matches in the UI. No changes needed to this model as it already supports completed status via `MatchStatus.COMPLETED` enum.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view up to 20 recently completed matches in the existing Completed tab (no new tab creation needed)
- **SC-002**: Completed matches are automatically detected and stored within 5 minutes of match completion
- **SC-003**: Completed matches list loads within 2 seconds on standard mobile connections (shares caching with live matches)
- **SC-004**: 95% of completed matches contain complete data (final scores, winner, result text)
- **SC-005**: Zero duplicate completed matches exist in the system at any time
- **SC-006**: Users can navigate from a completed match card to full match details in one tap/click (existing functionality)
- **SC-007**: The existing match card component displays completed matches correctly without UI modifications
- **SC-008**: System API returns exactly 20 most recent completed matches (or fewer if less than 20 exist)
- **SC-009**: The Completed tab count badge displays accurate match counts that update in real-time
