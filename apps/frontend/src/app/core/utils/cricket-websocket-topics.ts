export const LEGACY_CRICKET_TOPIC_KEYS: string[] = [
  'team_odds',
  'toss_won_country',
  'bat_or_ball_selected',
  'batsman_data',
  'bowler_data',
  'session_odds',
  'batting_team',
  'score',
  'over',
  'crr',
  'current_ball',
  'runs_on_ball',
  'overs_data',
  'commentary',
  'match_announcement',
  'match_odds',
  'fav_team',
  'final_result_text'
];

export function buildLegacyCricketTopicPaths(matchId: string): string[] {
  const trimmedMatchId = matchId ? matchId.trim() : '';
  if (!trimmedMatchId) {
    return [];
  }

  return LEGACY_CRICKET_TOPIC_KEYS.map(function(key: string): string {
    return '/topic/cricket.' + trimmedMatchId + '.' + key;
  });
}
