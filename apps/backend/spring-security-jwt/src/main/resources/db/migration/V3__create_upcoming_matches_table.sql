-- Migration: Create upcoming_matches table for Feature 005
-- Purpose: Store upcoming cricket fixtures with source attribution and freshness tracking
-- Date: 2025-11-16
-- Compatible with H2 and MySQL

CREATE TABLE IF NOT EXISTS upcoming_matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    source_key VARCHAR(128) NOT NULL,
    series_name VARCHAR(255) NOT NULL,
    match_title VARCHAR(255) NOT NULL,
    team_a_name VARCHAR(128) NOT NULL,
    team_b_name VARCHAR(128) NOT NULL,
    team_a_code VARCHAR(16) NULL,
    team_b_code VARCHAR(16) NULL,
    start_time_utc TIMESTAMP NOT NULL,
    venue_name VARCHAR(255) NULL,
    city VARCHAR(128) NULL,
    country VARCHAR(128) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    notes VARCHAR(512) NULL,
    last_scraped_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT uq_upcoming_matches_source_key UNIQUE (source, source_key)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_start_time ON upcoming_matches(start_time_utc);
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_series ON upcoming_matches(series_name);
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_team_a ON upcoming_matches(team_a_name);
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_team_b ON upcoming_matches(team_b_name);
CREATE INDEX IF NOT EXISTS idx_upcoming_matches_status ON upcoming_matches(status);
