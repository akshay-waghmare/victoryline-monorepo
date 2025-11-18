-- 006-completed-matches-display: Database Migration Script
-- Purpose: Add series support and optimize completed matches queries

-- Step 1: Create series table
CREATE TABLE IF NOT EXISTS series (
    series_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50),
    start_date DATE,
    end_date DATE,
    organizer VARCHAR(100),
    season VARCHAR(100),
    description TEXT,
    INDEX idx_name (name),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add series_id and completion_date columns to matches table
ALTER TABLE matches 
    ADD COLUMN series_id BIGINT,
    ADD COLUMN completion_date TIMESTAMP NULL DEFAULT NULL,
    ADD CONSTRAINT fk_matches_series FOREIGN KEY (series_id) REFERENCES series(series_id) ON DELETE SET NULL;

-- Step 3: Create performance index for completed matches queries
CREATE INDEX idx_status_completion ON matches(match_status, completion_date DESC);

-- Step 4: Migrate existing data - populate series from competition field
INSERT INTO series (name, format, season)
SELECT DISTINCT 
    competition,
    'Unknown',
    YEAR(match_date)
FROM matches
WHERE competition IS NOT NULL AND competition != '';

-- Step 5: Update matches with series_id based on competition name
UPDATE matches m
INNER JOIN series s ON m.competition = s.name
SET m.series_id = s.series_id;

-- Step 6: Set completion_date for completed matches
UPDATE matches 
SET completion_date = match_date 
WHERE match_status IN ('Completed', 'Result', 'Finished')
AND completion_date IS NULL;

-- Verification queries
-- SELECT COUNT(*) as total_series FROM series;
-- SELECT COUNT(*) as matches_with_series FROM matches WHERE series_id IS NOT NULL;
-- SELECT COUNT(*) as completed_matches FROM matches WHERE match_status IN ('Completed', 'Result', 'Finished');
