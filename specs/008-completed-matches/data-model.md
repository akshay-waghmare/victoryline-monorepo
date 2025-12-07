# Data Model: Completed Matches

**Feature**: 008-completed-matches  
**Created**: December 7, 2025  
**Purpose**: Define database schema and data storage strategy for completed matches

## Current Database Architecture

### Database System
- **Primary**: H2 Embedded Database (file-based: `./testdb.mv.db`)
- **Mode**: Embedded (not server mode) - database runs within application JVM
- **Console**: H2 Web Console enabled at `http://localhost:8099/h2-console`
  - JDBC URL: `jdbc:h2:file:./testdb`
  - Username: `sa`
  - Password: (empty)
  - Web Access: Allowed from other hosts (`web-allow-others=true`)
- **ORM**: JPA/Hibernate with `ddl-auto=update` (auto-schema generation)
- **Migration**: Flyway (V1__schema.sql, V2__seed_users_and_roles.sql)
- **Alternative**: MySQL support available via environment variables (commented out)

### Existing Match-Related Tables

#### 1. LIVE_MATCH (Primary Match Registry)
```sql
CREATE TABLE LIVE_MATCH (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL UNIQUE,
    isDeleted BOOLEAN DEFAULT FALSE,
    lastKnownState TEXT,  -- JSON string with final match result
    deletionAttempts INT DEFAULT 0,
    isDistributionDone BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_is_deleted ON LIVE_MATCH(isDeleted);
```

**Entity**: `com.devglan.model.LiveMatch`
- `isDeleted = true` indicates match has finished
- `lastKnownState` contains result text like "India won by 7 wickets"
- Existing method: `getWinningTeam()` parses winner from `lastKnownState`

#### 2. cricket_data (Live Match Details)
```sql
CREATE TABLE cricket_data (
    url VARCHAR(500) PRIMARY KEY,
    battingTeamName VARCHAR(255),
    over DOUBLE,
    score VARCHAR(50),
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP,
    -- Plus: teamOdds, matchOdds, sessionOdds, oversData
    FOREIGN KEY (url) REFERENCES match_info(url)
);
CREATE INDEX cricket_url ON cricket_data(url);
```

**Entity**: `com.devglan.model.CricketDataEntity`
- Links to: `MatchInfoEntity`, `TeamOdds`, `SessionOdds`, `OversData`
- Contains live score updates
- `createdAt` / `updatedAt` track match lifecycle

#### 3. match_info (Match Metadata)
```sql
CREATE TABLE match_info (
    url VARCHAR(500) PRIMARY KEY,
    matchDate VARCHAR(50),
    venue VARCHAR(255),
    matchName VARCHAR(255),
    tossInfo VARCHAR(255)
    -- Plus: teamComparison, venueStats, playingXI
);
```

**Entity**: `com.devglan.dao.MatchInfoEntity`
- Contains venue, date, team names
- Preserved for historical reference

#### 4. scorecard (Match Scorecard)
```sql
CREATE TABLE scorecard (
    url VARCHAR(500) PRIMARY KEY,
    data CLOB  -- JSON scorecard data
);
```

**Entity**: `com.devglan.dao.ScorecardEntity`
- Full scorecard stored as JSON CLOB
- Essential for completed match details page

## Proposed Implementation: Extend LIVE_MATCH Table

### Schema Changes (Recommended Approach)

Add new columns to existing `LIVE_MATCH` table:

```sql
-- H2-compatible ALTER TABLE statements
-- Note: H2 supports standard SQL with some MySQL compatibility

ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS completedAt TIMESTAMP NULL;
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'LIVE';
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS finalScore VARCHAR(100) NULL;
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS winnerTeam VARCHAR(100) NULL;
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS team1Name VARCHAR(100) NULL;
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS team2Name VARCHAR(100) NULL;
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS matchVenue VARCHAR(255) NULL;

-- Indexes for efficient queries (H2 syntax)
CREATE INDEX IF NOT EXISTS idx_status_completed ON LIVE_MATCH(status, completedAt DESC);
CREATE INDEX IF NOT EXISTS idx_completed_at ON LIVE_MATCH(completedAt DESC);
```

**H2 Specific Notes:**
- `IF NOT EXISTS` clause prevents errors if columns/indexes already exist
- H2 supports `TIMESTAMP` (maps to `java.sql.Timestamp`)
- H2 supports `VARCHAR(n)` with length limits
- `DESC` index ordering is supported in H2 2.x
- Default values work same as MySQL
```

### Updated Entity Model

```java
@Entity
@Table(name = "LIVE_MATCH", indexes = {
    @Index(name = "idx_is_deleted", columnList = "isDeleted"),
    @Index(name = "idx_status_completed", columnList = "status,completedAt"),
    @Index(name = "idx_completed_at", columnList = "completedAt")
})
public class LiveMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String url;
    
    // Existing fields
    private boolean isDeleted = false;
    private String lastKnownState;
    private int deletionAttempts = 0;
    
    @Column(name="isDistributionDone")
    private Boolean distributionDone = false;
    
    // NEW FIELDS for completed matches
    @Column(name="completedAt")
    private Instant completedAt;
    
    @Column(name="status", length=20)
    private String status = "LIVE"; // LIVE, COMPLETED, DELETED
    
    @Column(name="finalScore", length=100)
    private String finalScore; // e.g., "IND 250/5 (50 ov) vs PAK 248 (49.2 ov)"
    
    @Column(name="winnerTeam", length=100)
    private String winnerTeam; // Cached from lastKnownState
    
    @Column(name="team1Name", length=100)
    private String team1Name;
    
    @Column(name="team2Name", length=100)
    private String team2Name;
    
    @Column(name="matchVenue", length=255)
    private String matchVenue;
    
    // Existing methods
    public boolean isFinished() {
        return "COMPLETED".equals(status) || isDeleted;
    }
    
    public String getWinningTeam() {
        // Return cached value if available, else parse from lastKnownState
        if (winnerTeam != null) return winnerTeam;
        
        if (lastKnownState != null && lastKnownState.contains("won by")) {
            String[] parts = lastKnownState.split(" won by");
            if (parts.length > 0) {
                this.winnerTeam = parts[0].trim();
                return this.winnerTeam;
            }
        }
        return null;
    }
}
```

### Migration Strategy

**Phase 1: Schema Migration**
1. Add new columns to `LIVE_MATCH` table via Flyway migration
   - Create new migration file: `V3__add_completed_match_columns.sql`
   - H2-compatible ALTER TABLE statements
2. Create indexes for query performance (H2 supports standard indexes)
3. Deploy schema changes (backward compatible)

**Note**: H2 embedded mode means database is created/updated automatically on application startup. For production, consider using H2 server mode or migrating to PostgreSQL/MySQL for better concurrent access.

**Phase 2: Data Backfill**
1. Update existing records where `isDeleted=true`:
   - Set `status='COMPLETED'`
   - Set `completedAt` from `updatedAt` (if available) or current timestamp
   - Parse and cache `winnerTeam` from `lastKnownState`
   - Fetch and cache `finalScore`, team names, venue from related tables

**Phase 3: Application Logic**
1. Update match completion detection to set new fields
2. Implement 20-match limit with cleanup job
3. Create API endpoint for completed matches

## Alternative: New COMPLETED_MATCH Table

If denormalized approach is preferred:

```sql
-- H2-compatible CREATE TABLE
CREATE TABLE IF NOT EXISTS COMPLETED_MATCH (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL UNIQUE,
    completedAt TIMESTAMP NOT NULL,
    team1Name VARCHAR(100),
    team1Score VARCHAR(50),
    team2Name VARCHAR(100),
    team2Score VARCHAR(50),
    finalScore VARCHAR(200),
    winnerTeam VARCHAR(100),
    matchResult TEXT,  -- Full result text (H2 supports TEXT or CLOB)
    venue VARCHAR(255),
    matchDate VARCHAR(50),
    matchFormat VARCHAR(20),  -- ODI, T20, Test
    seriesName VARCHAR(255),
    
    -- Denormalized for performance
    team1LogoUrl VARCHAR(500),
    team2LogoUrl VARCHAR(500),
    
    -- Original data reference
    originalLiveMatchId BIGINT,
    
    FOREIGN KEY (originalLiveMatchId) REFERENCES LIVE_MATCH(id)
);

CREATE INDEX IF NOT EXISTS idx_completed_at_desc ON COMPLETED_MATCH(completedAt DESC);
CREATE INDEX IF NOT EXISTS idx_url ON COMPLETED_MATCH(url);
```

**Pros**: Fast reads, no joins needed, clean separation
**Cons**: Data duplication, sync complexity, additional storage

**Note**: H2 embedded mode stores all data in single file (`testdb.mv.db`), so table separation doesn't provide storage isolation.

## Query Patterns

### Get Last 20 Completed Matches
```sql
-- Using extended LIVE_MATCH (Recommended)
SELECT id, url, completedAt, finalScore, winnerTeam, team1Name, team2Name, matchVenue
FROM LIVE_MATCH
WHERE status = 'COMPLETED'
ORDER BY completedAt DESC
LIMIT 20;

-- Using separate COMPLETED_MATCH table
SELECT *
FROM COMPLETED_MATCH
ORDER BY completedAt DESC
LIMIT 20;
```

### Cleanup Old Completed Matches (Maintain 20 limit)
```sql
-- Find matches to delete (beyond top 20)
DELETE FROM LIVE_MATCH
WHERE id IN (
    SELECT id FROM (
        SELECT id FROM LIVE_MATCH
        WHERE status = 'COMPLETED'
        ORDER BY completedAt DESC
        OFFSET 20
    ) AS old_matches
);
```

### Check for Newly Completed Matches
```sql
-- Find matches that finished but not marked completed
SELECT id, url, lastKnownState
FROM LIVE_MATCH
WHERE isDeleted = TRUE
  AND status = 'LIVE'
ORDER BY id DESC;
```

## REST API Contract

### Get Completed Matches
```
GET /api/matches/completed
Response: 200 OK
[
  {
    "id": 123,
    "url": "pak-vs-sa-2nd-odi-2025",
    "completedAt": "2025-12-06T14:30:00Z",
    "team1": { "name": "Pakistan", "score": "250/5 (50 ov)" },
    "team2": { "name": "South Africa", "score": "248 (49.2 ov)" },
    "finalScore": "PAK 250/5 vs SA 248",
    "winner": "Pakistan",
    "result": "Pakistan won by 5 wickets",
    "venue": "National Stadium, Karachi",
    "status": "COMPLETED"
  }
]
```

### Get Match Details (Live or Completed)
```
GET /api/matches/{matchUrl}
Response: 200 OK
{
  "url": "pak-vs-sa-2nd-odi-2025",
  "status": "COMPLETED",
  "completedAt": "2025-12-06T14:30:00Z",
  ... (existing match details)
}
```

## Performance Considerations

1. **Indexes**: Critical for `ORDER BY completedAt DESC LIMIT 20` query
2. **Caching**: Redis cache for completed matches list (TTL: 5 minutes)
3. **Cleanup Job**: Scheduled task runs hourly to maintain 20-match limit
4. **Lazy Loading**: Load scorecard/match-info only when user clicks match card

## Testing Data Requirements

1. Create test fixtures with 25 completed matches
2. Verify oldest 5 are auto-deleted when cleanup runs
3. Test match completion transition (LIVE → COMPLETED)
4. Verify data consistency across related tables
5. Load test: 20 matches × 30KB each = 600KB response size

## H2 Database Access & Management

### H2 Console Access
1. Start the Spring Boot application
2. Open browser: `http://localhost:8099/h2-console`
3. Login credentials:
   - **JDBC URL**: `jdbc:h2:file:./testdb`
   - **User Name**: `sa`
   - **Password**: (leave empty)
4. Click "Connect"

### Useful H2 Console Queries

**View current LIVE_MATCH records:**
```sql
SELECT * FROM LIVE_MATCH ORDER BY id DESC LIMIT 10;
```

**Check for completed matches:**
```sql
SELECT id, url, isDeleted, lastKnownState 
FROM LIVE_MATCH 
WHERE isDeleted = TRUE
ORDER BY id DESC;
```

**View all tables:**
```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'PUBLIC';
```

**Check table schema:**
```sql
SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'LIVE_MATCH';
```

**Database file location:**
- Development: `./testdb.mv.db` (in project root)
- Docker: `/app/testdb.mv.db` (inside container)

### H2 Database Backup
```bash
# Stop application first
# Copy database file
cp testdb.mv.db testdb.backup.mv.db

# Or use H2 SCRIPT command in console:
SCRIPT TO 'backup.sql';

# Restore from script:
RUNSCRIPT FROM 'backup.sql';
```

### Migration to Production Database
When moving to production, consider:
1. **PostgreSQL**: Better concurrent access, production-grade reliability
2. **MySQL**: Industry standard, wide ecosystem support
3. **H2 Server Mode**: If staying with H2, use server mode (`jdbc:h2:tcp://localhost/~/testdb`) for multi-instance access

Current embedded mode is suitable for:
- ✅ Development and testing
- ✅ Single-instance deployments
- ✅ Demo environments
- ❌ Multi-instance production (no concurrent access support)
