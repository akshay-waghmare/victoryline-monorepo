-- Dummy Blog Data for Testing
-- This creates sample blog posts and live events

-- Create live_events table if not exists (Flyway migration)
CREATE TABLE IF NOT EXISTS live_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    over_label VARCHAR(20),
    innings_label VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_match_id (match_id),
    INDEX idx_created_at (created_at)
);

-- Insert dummy live events for testing
INSERT INTO live_events (match_id, message, event_type, over_label, innings_label) VALUES
('IPL2025_FINAL', 'Match started! Mumbai Indians vs Chennai Super Kings', 'start', '0.0', '1st Innings'),
('IPL2025_FINAL', 'Rohit Sharma takes strike', 'info', '0.1', '1st Innings'),
('IPL2025_FINAL', 'FOUR! Beautiful cover drive by Rohit', 'boundary', '0.4', '1st Innings'),
('IPL2025_FINAL', 'SIX! Rohit Sharma smashes it over long-on!', 'boundary', '2.3', '1st Innings'),
('IPL2025_FINAL', 'WICKET! Rohit Sharma caught at mid-wicket for 24', 'wicket', '4.2', '1st Innings'),
('IPL2025_FINAL', 'End of over 5: MI 45/1', 'over', '5.0', '1st Innings'),
('IPL2025_FINAL', 'Ishan Kishan brings up his fifty!', 'milestone', '12.4', '1st Innings'),
('IPL2025_FINAL', 'Strategic timeout taken', 'info', '10.0', '1st Innings'),
('IPL2025_FINAL', 'WICKET! Ishan Kishan run out for 67', 'wicket', '15.3', '1st Innings'),
('IPL2025_FINAL', 'Mumbai Indians finish at 185/6', 'innings', '20.0', '1st Innings'),
('IPL2025_FINAL', 'Chennai Super Kings need 186 to win', 'start', '0.0', '2nd Innings'),
('IPL2025_FINAL', 'FOUR! Ruturaj Gaikwad gets off the mark', 'boundary', '0.3', '2nd Innings'),
('IPL2025_FINAL', 'Match is live! Join us for ball-by-ball updates', 'info', '3.2', '2nd Innings');

-- Note: Blog posts would typically be in Strapi's database
-- For H2 embedded database testing, we can create a simple blog_posts table

CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt VARCHAR(500),
    author VARCHAR(255) DEFAULT 'Admin',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hero_image_url VARCHAR(1000),
    tags VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_published_at (published_at)
);

-- Insert dummy blog posts
INSERT INTO blog_posts (title, slug, content, excerpt, author, hero_image_url, tags) VALUES
(
    'IPL 2025 Final: Mumbai Indians vs Chennai Super Kings - Match Preview',
    'ipl-2025-final-preview',
    '# Match Preview\n\nThe stage is set for an epic showdown as Mumbai Indians take on Chennai Super Kings in the IPL 2025 Final at Wankhede Stadium.\n\n## Key Players to Watch\n\n### Mumbai Indians\n- **Rohit Sharma** (Captain): The Hitman is in sublime form\n- **Jasprit Bumrah**: Death bowling specialist\n- **Ishan Kishan**: Explosive opener\n\n### Chennai Super Kings\n- **MS Dhoni**: Leading from behind the stumps\n- **Ravindra Jadeja**: All-rounder extraordinaire\n- **Ruturaj Gaikwad**: Consistent run-scorer\n\n## Match Prediction\n\nBoth teams have been in excellent form throughout the tournament. Mumbai Indians have the home advantage, but CSK has the experience of winning finals under pressure.\n\n**Our Prediction**: A thriller that goes down to the last over!',
    'The ultimate IPL showdown is here! Get the complete match preview, key players, and predictions for the IPL 2025 Final.',
    'Rajesh Kumar',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&h=600&fit=crop',
    'IPL,Cricket,Final,2025,Preview'
),
(
    'Top 5 Batsmen to Watch in IPL 2025',
    'top-5-batsmen-ipl-2025',
    '# Top 5 Batsmen to Watch in IPL 2025\n\nIPL 2025 has been a batting extravaganza! Here are the top 5 batsmen who have lit up the tournament.\n\n## 1. Virat Kohli (Royal Challengers Bangalore)\n\n**Runs**: 723 | **Average**: 60.25 | **Strike Rate**: 145.2\n\nKohli has been in vintage form, playing match-winning knocks throughout the season.\n\n## 2. Rohit Sharma (Mumbai Indians)\n\n**Runs**: 698 | **Average**: 58.16 | **Strike Rate**: 142.8\n\nThe Mumbai skipper has led from the front with crucial contributions.\n\n## 3. David Warner (Delhi Capitals)\n\n**Runs**: 681 | **Average**: 56.75 | **Strike Rate**: 150.3\n\nWarner has been a revelation with his aggressive batting.\n\n## 4. KL Rahul (Lucknow Super Giants)\n\n**Runs**: 654 | **Average**: 54.50 | **Strike Rate**: 138.9\n\nConsistent performances from the LSG captain.\n\n## 5. Jos Buttler (Rajasthan Royals)\n\n**Runs**: 642 | **Average**: 53.50 | **Strike Rate**: 155.6\n\nButtler has been explosive at the top of the order.',
    'IPL 2025 has seen some incredible batting performances. Here are the top 5 batsmen who have dominated the tournament.',
    'Priya Sharma',
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&h=600&fit=crop',
    'IPL,Batsmen,Stats,2025,Cricket'
),
(
    'Best Bowling Figures in IPL History',
    'best-bowling-figures-ipl-history',
    '# Best Bowling Figures in IPL History\n\nThe IPL has witnessed some magical bowling spells over the years. Let''s look at the top bowling performances.\n\n## 1. Alzarri Joseph - 6/12 (2019)\n\n**Team**: Mumbai Indians vs Sunrisers Hyderabad\n\nOn his IPL debut, Joseph produced the best-ever IPL figures, taking 6 wickets for just 12 runs.\n\n## 2. Sohail Tanvir - 6/14 (2008)\n\n**Team**: Rajasthan Royals vs Chennai Super Kings\n\nTanvir''s devastating spell in the inaugural IPL season remains one of the best.\n\n## 3. Adam Zampa - 6/19 (2016)\n\n**Team**: Rising Pune Supergiants vs Sunrisers Hyderabad\n\nThe Australian leg-spinner ripped through the SRH batting lineup.\n\n## 4. Anil Kumble - 5/5 (2009)\n\n**Team**: Royal Challengers Bangalore vs Rajasthan Royals\n\nLegendary figures from the spin maestro - the most economical 5-wicket haul.\n\n## 5. Axar Patel - 5/17 (2023)\n\n**Team**: Delhi Capitals vs Kolkata Knight Riders\n\nAxar''s left-arm spin proved too good for KKR.',
    'From Alzarri Joseph to Anil Kumble, relive the best bowling performances in IPL history.',
    'Amit Desai',
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1200&h=600&fit=crop',
    'IPL,Bowling,Records,Cricket,History'
),
(
    'How to Improve Your Cricket Batting Technique',
    'improve-cricket-batting-technique',
    '# How to Improve Your Cricket Batting Technique\n\nWhether you''re a beginner or an experienced player, these tips will help you refine your batting skills.\n\n## 1. Perfect Your Stance\n\nA good batting stance is the foundation of great technique:\n- Stand sideways with your feet shoulder-width apart\n- Keep your weight balanced\n- Hold the bat with a relaxed grip\n\n## 2. Watch the Ball\n\nIt sounds obvious, but watching the ball from the bowler''s hand to your bat is crucial.\n\n## 3. Practice Your Footwork\n\nGood footwork helps you:\n- Get into position quickly\n- Maintain balance\n- Play shots more effectively\n\n## 4. Master the Basics\n\nFocus on these fundamental shots:\n- **Forward Defense**: For good-length balls\n- **Back Defense**: For short-pitched deliveries\n- **Straight Drive**: The most elegant shot\n- **Pull Shot**: For short balls\n\n## 5. Work on Your Timing\n\nPower comes from timing, not brute force. Practice hitting through the line of the ball.\n\n## 6. Regular Practice\n\nThere''s no substitute for regular practice. Spend time in the nets working on specific areas.\n\n## 7. Study Great Batsmen\n\nWatch videos of legendary batsmen like Sachin Tendulkar, Virat Kohli, and Steve Smith. Observe their technique and try to incorporate elements into your game.',
    'Want to become a better batsman? Follow these 7 essential tips to improve your cricket batting technique.',
    'Coach Suresh',
    'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=1200&h=600&fit=crop',
    'Cricket,Coaching,Batting,Tips,Tutorial'
),
(
    'Understanding Cricket Field Positions',
    'cricket-field-positions-guide',
    '# Understanding Cricket Field Positions\n\nCricket has a complex array of fielding positions. This guide will help you understand where each fielder stands.\n\n## Close-In Fielders (Near the Batsman)\n\n### On-Side (Leg-Side)\n- **Short Leg**: Very close, near the batsman''s legs\n- **Leg Slip**: Behind the batsman on the leg side\n- **Mid-Wicket**: In the arc between mid-on and square leg\n\n### Off-Side\n- **Silly Point**: Extremely close to the batsman\n- **Silly Mid-Off**: Close catching position\n- **Short Cover**: Saves quick singles\n\n## Inner Ring (Saving Singles)\n\n### On-Side\n- **Square Leg**: At 90° to the batsman\n- **Mid-On**: Straight down the ground\n\n### Off-Side\n- **Point**: Square on the off-side\n- **Cover**: Between point and mid-off\n- **Mid-Off**: Straight on the off-side\n\n## Outer Ring (Boundary Fielders)\n\n### On-Side\n- **Fine Leg**: Behind square on the leg side\n- **Deep Square Leg**: On the boundary at square leg\n- **Deep Mid-Wicket**: Long boundary position\n- **Long-On**: Straight boundary on the leg side\n\n### Off-Side\n- **Third Man**: Behind the wicketkeeper\n- **Deep Point**: Boundary position square\n- **Deep Cover**: Wide long-off position\n- **Long-Off**: Straight boundary off-side\n\n## Wicket-Keeper Position\n\nThe wicket-keeper stands behind the stumps and is the only fielder allowed to wear gloves.\n\n## Strategic Placement\n\nCaptains set fields based on:\n- Bowler type (pace vs spin)\n- Batsman''s strengths and weaknesses\n- Match situation (attacking vs defensive)\n- Pitch conditions',
    'New to cricket? This comprehensive guide explains all the fielding positions and their strategic importance.',
    'Vikram Patel',
    'https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=1200&h=600&fit=crop',
    'Cricket,Fielding,Guide,Beginners,Tutorial'
);

-- Create user table for authentication (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
);

-- Insert dummy admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO users (username, password, first_name, last_name, email, role) VALUES
('admin', '$2a$10$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6', 'Admin', 'User', 'admin@crickzen.com', 'BLOG_EDITOR'),
('editor', '$2a$10$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6', 'Blog', 'Editor', 'editor@crickzen.com', 'BLOG_EDITOR'),
('viewer', '$2a$10$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6', 'Guest', 'User', 'guest@crickzen.com', 'USER');

COMMIT;
