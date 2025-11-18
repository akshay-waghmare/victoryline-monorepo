/**
 * Completed Match Model (Feature 006-completed-matches-display)
 * Represents a completed cricket match with series information
 */
export interface CompletedMatch {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  result: string;
  completionDate: Date | string;
  seriesName: string;
  seriesFormat?: string;
  location?: string;
  sportType?: string;
  matchLink?: string;
}

/**
 * API Response for completed matches endpoint
 */
export interface CompletedMatchesResponse {
  matches: CompletedMatch[];
  totalCount: number;
  timestamp: Date | string;
}
