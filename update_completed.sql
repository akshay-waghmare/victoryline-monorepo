UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"India A","score":"328/5","overs":"48.3","final_result_text":"India A won by 5 wickets","current_ball":"Match completed"}' 
WHERE id = 1;

UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"Pakistan","score":"148/10","overs":"19.5","final_result_text":"Zimbabwe won by 12 runs","current_ball":"Match completed"}' 
WHERE id = 2;

UPDATE LIVE_MATCH SET 
  isDeleted = true,
  lastKnownState = '{"battingTeam":"Northern Warriors","score":"136/4","overs":"9.4","final_result_text":"Northern Warriors won by 6 wickets","current_ball":"Match completed"}' 
WHERE id = 3;
