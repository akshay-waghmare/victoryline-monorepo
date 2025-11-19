-- V006: Optimize completed matches query for LIVE_MATCH table
-- Date: November 18, 2025 (CORRECTED)
-- Purpose: Add indexes to LIVE_MATCH table for efficient completed matches retrieval
--
-- CRITICAL CORRECTION: The system uses LIVE_MATCH table (JPA entity: LiveMatch.java),
-- NOT the 'matches' table from V1 schema. The previous implementation was WRONG.
--
-- LIVE_MATCH table structure (created by JPA):
--   - id (BIGINT, PRIMARY KEY, AUTO_INCREMENT)
--   - url (VARCHAR) - match URL identifier
--   - isDeleted (BOOLEAN) - TRUE = completed match, FALSE = live/ongoing
--   - lastKnownState (TEXT/CLOB) - JSON string with match details (teams, scores, result)
--   - deletionAttempts (INT) - counter for deletion retry logic
--   - distributionDone (BOOLEAN) - flag indicating bet distribution completion
--
-- Query pattern for completed matches:
--   SELECT * FROM LIVE_MATCH WHERE isDeleted = TRUE ORDER BY id DESC LIMIT 20
--
-- Note: We use 'id' as a proxy for completion time since the table doesn't have
-- an explicit completion_date column. Higher IDs = more recent matches.

-- Add composite index for efficient "last 20 completed matches" query
-- This index optimizes: WHERE isDeleted = TRUE ORDER BY id DESC LIMIT 20
-- H2 and MySQL compatible syntax
CREATE INDEX IF NOT EXISTS idx_is_deleted_id ON LIVE_MATCH(isDeleted, id);

-- Add index on url column for fast match lookup by URL
-- This optimizes queries like: WHERE url = ?
CREATE INDEX IF NOT EXISTS idx_url ON LIVE_MATCH(url);

-- Note: No data migration needed since LIVE_MATCH table is already populated
-- by the scraper service (cricket_data_service.py → add_live_matches function)
