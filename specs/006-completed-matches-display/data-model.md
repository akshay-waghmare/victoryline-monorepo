# Data Model: Completed Matches Display

**Feature**: 006-completed-matches-display  
**Date**: November 18, 2025  
**Status**: Design Phase

## Overview

This document defines the data structures, relationships, and validation rules for displaying completed cricket matches with their series information.

## Entity Schemas

### Match Entity (Existing)

**Purpose**: Represents a cricket match with all its details including status, teams, scores, and completion information.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Long | PRIMARY KEY, AUTO_INCREMENT | Unique match identifier |
| `status` | String (Enum) | NOT NULL, VALUES: 'LIVE', 'UPCOMING', 'COMPLETED', 'ABANDONED' | Current match status |
| `completionDate` | Timestamp | NULL for non-completed matches | When the match was completed (ISO 8601) |
| `startDate` | Timestamp | NOT NULL | Match scheduled start time |
| `teamA` | String | NOT NULL, MAX 100 chars | First team name |
| `teamB` | String | NOT NULL, MAX 100 chars | Second team name |
| `scoreA` | String | NULL | Team A's score (e.g., "250/10") |
| `scoreB` | String | NULL | Team B's score (e.g., "248/9") |
| `result` | String | NULL, MAX 500 chars | Match result description |
| `venue` | String | NULL, MAX 200 chars | Match venue |
| `seriesId` | Long | FOREIGN KEY → Series.id | Associated series |
| `format` | String (Enum) | NOT NULL, VALUES: 'TEST', 'ODI', 'T20' | Match format |
| `createdAt` | Timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updatedAt` | Timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update time |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX idx_status_completion (status, completionDate DESC)` - **NEW** - Required for efficient completed matches query
- `INDEX idx_series (seriesId)` - Existing for JOIN operations

**Relationships**:
- `Match.seriesId` → `Series.id` (Many-to-One)

---

### Series Entity (Existing)

**Purpose**: Represents a cricket tournament or series containing multiple matches.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Long | PRIMARY KEY, AUTO_INCREMENT | Unique series identifier |
| `name` | String | NOT NULL, MAX 200 chars | Series name (e.g., "India vs Australia 2025") |
| `format` | String (Enum) | NOT NULL, VALUES: 'TEST', 'ODI', 'T20', 'MIXED' | Series format |
| `startDate` | Timestamp | NOT NULL | Series start date |
| `endDate` | Timestamp | NULL | Series end date (NULL if ongoing) |
| `season` | String | NULL, MAX 50 chars | Season identifier (e.g., "2025") |
| `country` | String | NULL, MAX 100 chars | Host country |
| `createdAt` | Timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updatedAt` | Timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update time |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX idx_name (name)` - For search/filter operations

**Relationships**:
- One Series has Many Matches

---

## Data Transfer Objects (DTOs)

### CompletedMatchDTO (New)

**Purpose**: Optimized response object for completed matches API, containing only necessary fields for display.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matchId` | Long | Yes | Match identifier |
| `teamA` | String | Yes | First team name |
| `teamB` | String | Yes | Second team name |
| `scoreA` | String | No | Team A's score (null if not available) |
| `scoreB` | String | No | Team B's score (null if not available) |
| `result` | String | No | Match result summary |
| `seriesName` | String | Yes* | Series name (see validation) |
| `format` | String | Yes | Match format (TEST/ODI/T20) |
| `completionDate` | String (ISO 8601) | Yes | When match completed |
| `venue` | String | No | Match venue |

**Validation Rules**:
- `seriesName`: If null/empty in database, return "Series information unavailable"
- `completionDate`: Must be valid ISO 8601 timestamp (e.g., "2025-11-15T18:30:00Z")
- `result`: If null, return "Result not available"
- `scoreA`, `scoreB`: If null, return "Score not available"

**Example JSON**:

```json
{
  "matchId": 12345,
  "teamA": "India",
  "teamB": "Australia",
  "scoreA": "328/5",
  "scoreB": "325/9",
  "result": "India won by 5 wickets",
  "seriesName": "India vs Australia ODI Series 2025",
  "format": "ODI",
  "completionDate": "2025-11-15T18:30:00Z",
  "venue": "Melbourne Cricket Ground"
}
```

---

## API Response Structures

### GET /api/v1/matches/completed Response

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "matchId": 12345,
      "teamA": "India",
      "teamB": "Australia",
      "scoreA": "328/5",
      "scoreB": "325/9",
      "result": "India won by 5 wickets",
      "seriesName": "India vs Australia ODI Series 2025",
      "format": "ODI",
      "completionDate": "2025-11-15T18:30:00Z",
      "venue": "Melbourne Cricket Ground"
    }
    // ... 19 more matches
  ],
  "error": null,
  "timestamp": "2025-11-18T10:30:45.123Z",
  "count": 20
}
```

**Error Response (500 Internal Server Error)**:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Unable to fetch completed matches. Please try again later.",
    "field": null
  },
  "timestamp": "2025-11-18T10:30:45.123Z"
}
```

---

## Database Query

### Repository Method Signature

```java
@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    
    @Query("SELECT m FROM Match m JOIN FETCH m.series s WHERE m.status = :status ORDER BY m.completionDate DESC")
    List<Match> findTop20ByStatusOrderByCompletionDateDesc(@Param("status") String status, Pageable pageable);
}
```

**Usage**:
```java
Pageable limit = PageRequest.of(0, 20);
List<Match> completedMatches = matchRepository.findTop20ByStatusOrderByCompletionDateDesc("COMPLETED", limit);
```

**SQL Equivalent** (for reference):
```sql
SELECT 
    m.id, m.status, m.completion_date, m.team_a, m.team_b, 
    m.score_a, m.score_b, m.result, m.venue, m.format,
    s.name as series_name
FROM matches m
INNER JOIN series s ON m.series_id = s.id
WHERE m.status = 'COMPLETED'
ORDER BY m.completion_date DESC
LIMIT 20;
```

---

## Data Validation Rules

### Backend Validation

1. **Match Status**: Must be exactly "COMPLETED" (case-sensitive)
2. **Completion Date**: Must not be in the future
3. **Series Relationship**: Series must exist (referential integrity)
4. **Team Names**: Must not be empty or null
5. **Response Size**: Must return exactly 20 or fewer matches

### Frontend Validation

1. **Date Display**: Format completion date as human-readable (e.g., "Nov 15, 2025")
2. **Score Display**: Handle null scores gracefully (show "N/A" or "-")
3. **Series Name**: Show placeholder if unavailable
4. **Empty State**: If API returns 0 matches, show "No completed matches yet" message

---

## State Transitions

### Match Status Flow

```
UPCOMING → LIVE → COMPLETED
              ↓
          ABANDONED
```

**Relevant for this feature**: Only matches in `COMPLETED` state are displayed.

**Completion Trigger**: When match status changes from `LIVE` to `COMPLETED`:
1. Set `completionDate` = current timestamp
2. Set `result` = match outcome
3. Invalidate cache: `completed_matches:20`

---

## Caching Strategy

### Cache Schema

**Cache Key**: `completed_matches:20`

**Cache Value**: Serialized JSON array of `CompletedMatchDTO[]`

**Cache TTL**: 300 seconds (5 minutes)

**Cache Invalidation Trigger**: 
- When any match status changes to "COMPLETED"
- Manual invalidation via admin endpoint (future)

**Cache Miss Behavior**: Fetch from database, cache result, return to client

---

## Data Migration (If Needed)

### New Database Index

**Purpose**: Optimize completed matches query performance

**Migration SQL**:
```sql
CREATE INDEX idx_status_completion 
ON matches (status, completion_date DESC);
```

**Rollback SQL**:
```sql
DROP INDEX idx_status_completion ON matches;
```

**Impact**: Improves query performance from O(n) table scan to O(log n) index lookup. Critical for 10,000+ matches.

---

## Data Constraints & Edge Cases

### Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| <20 completed matches exist | Return all available (e.g., 15 matches) |
| Match has null series_id | Should not happen (FK constraint), but handle with "Unknown Series" |
| Series name is null/empty | Return "Series information unavailable" |
| Completion date is null | Should not happen for COMPLETED status, exclude from results |
| Multiple matches complete at same timestamp | Order by match ID as secondary sort |
| Score fields are null | Return "Score not available" |

---

## Frontend Data Models

### TypeScript Interfaces

```typescript
// apps/frontend/src/app/models/match.model.ts

export interface CompletedMatch {
  matchId: number;
  teamA: string;
  teamB: string;
  scoreA: string | null;
  scoreB: string | null;
  result: string | null;
  seriesName: string;
  format: 'TEST' | 'ODI' | 'T20';
  completionDate: string; // ISO 8601
  venue: string | null;
}

export interface CompletedMatchesResponse {
  success: boolean;
  data: CompletedMatch[] | null;
  error: {
    code: string;
    message: string;
    field: string | null;
  } | null;
  timestamp: string;
  count?: number;
}
```

---

## Performance Considerations

### Query Performance

- **Expected Query Time**: <50ms with proper indexing
- **Database Impact**: Single JOIN query, no N+1 problem
- **Index Size**: Approximately 100KB for 10,000 matches
- **Cache Hit Rate Target**: >90% (most users see cached data)

### Memory Usage

- **Single Match DTO**: ~500 bytes
- **20 Matches Response**: ~10KB
- **Cache Memory**: ~10KB per cached response
- **Frontend Memory**: ~10KB for component state

---

## Versioning

**API Version**: v1  
**Schema Version**: 1.0  
**Backward Compatibility**: This is the initial version, no migration concerns

**Future Considerations**:
- Pagination support (if users request more than 20 matches)
- Filtering by series, format, date range
- Sorting options (by date, series, team)

---

## Summary

This data model defines:
- ✅ Existing entity schemas (Match, Series)
- ✅ New DTO for API response (CompletedMatchDTO)
- ✅ Database query strategy (Spring Data JPA with JOIN FETCH)
- ✅ Caching schema (Redis with 5-min TTL)
- ✅ Validation rules (backend and frontend)
- ✅ Edge case handling
- ✅ Performance optimizations (indexing)
- ✅ TypeScript interfaces for frontend

**Next**: Generate API contract (OpenAPI spec) in `contracts/completed-matches-api.yaml`
