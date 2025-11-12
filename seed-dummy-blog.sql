-- Seed dummy blog data for testing
USE cricket_db;

-- Create a test user for blog editor if not exists
INSERT IGNORE INTO user (id, username, email, password, role) 
VALUES (999, 'blog_editor', 'editor@crickzen.com', '$2a$10$dummyhashedpassword', 'ROLE_BLOG_EDITOR');

-- Insert dummy live events for a test match
INSERT INTO live_events (match_id, message, event_type, over_label, innings_label, created_at) VALUES
('TEST_MATCH_001', 'Match started! India vs Australia at MCG', 'start', NULL, NULL, NOW()),
('TEST_MATCH_001', 'Rohit Sharma and KL Rahul open the batting', 'info', '0.1', '1st innings', DATE_ADD(NOW(), INTERVAL 1 MINUTE)),
('TEST_MATCH_001', 'FOUR! Beautiful cover drive by Rohit Sharma', 'boundary', '2.3', '1st innings', DATE_ADD(NOW(), INTERVAL 3 MINUTE)),
('TEST_MATCH_001', 'SIX! Rohit Sharma smashes it over mid-wicket!', 'boundary', '3.5', '1st innings', DATE_ADD(NOW(), INTERVAL 5 MINUTE)),
('TEST_MATCH_001', 'WICKET! KL Rahul caught behind for 15', 'wicket', '5.2', '1st innings', DATE_ADD(NOW(), INTERVAL 7 MINUTE)),
('TEST_MATCH_001', 'Virat Kohli comes to the crease', 'info', '5.3', '1st innings', DATE_ADD(NOW(), INTERVAL 8 MINUTE)),
('TEST_MATCH_001', 'End of 10th over. India 78/1', 'over', '10.0', '1st innings', DATE_ADD(NOW(), INTERVAL 12 MINUTE)),
('TEST_MATCH_001', 'FOUR! Kohli drives through covers', 'boundary', '12.4', '1st innings', DATE_ADD(NOW(), INTERVAL 15 MINUTE)),
('TEST_MATCH_001', 'FIFTY for Rohit Sharma! 50 runs off 32 balls', 'milestone', '15.2', '1st innings', DATE_ADD(NOW(), INTERVAL 18 MINUTE)),
('TEST_MATCH_001', 'End of innings. India 185/3 in 20 overs', 'innings', '20.0', '1st innings', DATE_ADD(NOW(), INTERVAL 25 MINUTE));

-- Add some more events for variety
INSERT INTO live_events (match_id, message, event_type, over_label, innings_label, created_at) VALUES
('IPL_2025_FINAL', '🏏 IPL 2025 Final begins!', 'start', NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('IPL_2025_FINAL', 'Toss won by Mumbai Indians, chose to bat first', 'info', NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR 55 MINUTE)),
('IPL_2025_FINAL', 'WICKET! Quick breakthrough for CSK', 'wicket', '3.1', '1st innings', DATE_SUB(NOW(), INTERVAL 1 HOUR 45 MINUTE)),
('IPL_2025_FINAL', 'SIX! Huge hit into the stands!', 'boundary', '8.4', '1st innings', DATE_SUB(NOW(), INTERVAL 1 HOUR 30 MINUTE)),
('IPL_2025_FINAL', 'Strategic timeout. MI 89/2', 'info', '10.0', '1st innings', DATE_SUB(NOW(), INTERVAL 1 HOUR 20 MINUTE));

SELECT '✅ Dummy live events inserted successfully!' as status;
SELECT COUNT(*) as total_events FROM live_events;
