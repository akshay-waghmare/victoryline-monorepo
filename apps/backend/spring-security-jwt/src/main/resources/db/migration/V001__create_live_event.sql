-- Create live_event table for storing real-time match events
CREATE TABLE IF NOT EXISTS live_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id VARCHAR(64) NOT NULL,
    message VARCHAR(500) NOT NULL,
    event_type VARCHAR(16) NOT NULL,
    over_label VARCHAR(8) NULL,
    innings_label VARCHAR(8) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_live_event_match_time (match_id, created_at DESC)
);
