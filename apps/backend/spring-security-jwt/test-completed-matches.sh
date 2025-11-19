#!/bin/sh
# Script to mark some live matches as completed for testing
# This will be executed inside the backend container

echo "Connecting to H2 database to mark matches as completed..."

# Use the H2 RunScript tool to execute SQL
java -cp /app/app.war org.h2.tools.RunScript \
  -url "jdbc:h2:file:/app/data/victoryline" \
  -user "sa" \
  -password "" \
  -script - << 'EOF'

-- Mark first 3 matches as completed with sample data
UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"India A","score":"328/5","overs":"48.3","final_result_text":"India A won by 5 wickets","current_ball":"Match completed","team1":"India A","team2":"Oman"}',
  distributionDone = true
WHERE id = 1;

UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"Pakistan","score":"148/10","overs":"19.5","final_result_text":"Zimbabwe won by 12 runs","current_ball":"Match completed","team1":"Pakistan","team2":"Zimbabwe"}',
  distributionDone = true
WHERE id = 2;

UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"Northern Warriors","score":"136/4","overs":"9.4","final_result_text":"Northern Warriors won by 6 wickets","current_ball":"Match completed","team1":"Northern Warriors","team2":"Quetta Qavalry"}',
  distributionDone = true
WHERE id = 3;

-- Verify the updates
SELECT id, url, isDeleted, distributionDone FROM LIVE_MATCH WHERE isDeleted = true;

EOF

echo "Completed marking matches. Checking results..."
