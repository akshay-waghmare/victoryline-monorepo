export type LiveMatchStatus = 'LIVE' | 'INNINGS_BREAK' | 'DELAYED' | 'COMPLETED';

export interface LiveMatchSnapshotDto {
  id: string;
  status: LiveMatchStatus;
  timestamp: string;
  innings: InningsScoreDto;
  chaseContext?: ChaseContextDto | null;
  batters?: ParticipantSummaryDto[] | null;
  bowler?: BowlerSummaryDto | null;
  partnership?: PartnershipSummaryDto | null;
  odds?: OddsQuoteDto | null;
  currentBall?: string | number | null;
  staleness: StalenessSignalDto;
}

export interface InningsScoreDto {
  teamCode: string;
  teamName: string;
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  projected?: number | null;
  resultSummary?: string | null;
}

export interface ChaseContextDto {
  target: number;
  runsRemaining: number;
  ballsRemaining: number;
  requiredRunRate: number;
  winProbability?: number | null;
}

export interface ParticipantSummaryDto {
  id: string;
  name: string;
  role: 'BATTER' | 'KEEPER' | 'ALL_ROUNDER' | 'UNKNOWN';
  runs: number;
  balls: number;
  fours?: number | null;
  sixes?: number | null;
  strikeRate: number;
  isOnStrike: boolean;
  recentBalls?: string[] | null;
}

export interface BowlerSummaryDto {
  id: string;
  name: string;
  overs: string;
  maidens?: number | null;
  runsConceded: number;
  wickets: number;
  economy?: number | null;
  lastOverFigure?: string | null;
}

export interface PartnershipSummaryDto {
  runs: number;
  balls: number;
  wicketsFallen?: number | null;
  description?: string | null;
}

export interface OddsQuoteDto {
  label: string;
  value?: number | null;
  format: 'PERCENT' | 'DECIMAL' | 'FRACTIONAL';
  trend?: 'UP' | 'DOWN' | 'STABLE' | 'UNKNOWN' | null;
  provider?: string | null;
  timestamp?: string | null;
  jurisdictionEnabled: boolean;
}

export type StalenessTier = 'FRESH' | 'WARNING' | 'ERROR';

export interface StalenessSignalDto {
  tier: StalenessTier;
  ageSeconds: number;
  message?: string | null;
  nextRetryAllowed?: string | null;
}

export interface ScorecardBatterDto {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOnStrike?: boolean;
}

export interface ScorecardBowlerDto {
  playerId: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  lastOverFigure?: string;
}

export interface ScorecardSnapshotDto {
  batters: ScorecardBatterDto[];
  bowlers: ScorecardBowlerDto[];
  partnership?: PartnershipSummaryDto | null;
}

export interface LiveHeroScoreSummary {
  teamCode: string;
  teamName: string;
  runs: number;
  wickets: number;
  overs: string;
  runRateLabel: string;
  projectedLabel?: string;
  status: LiveMatchStatus;
  resultSummary?: string | null;
  currentBall?: string | null;
}

export interface LiveHeroChaseSummary {
  isChasing: boolean;
  target?: number;
  runsRemaining?: number;
  ballsRemaining?: number;
  requiredRunRateLabel?: string;
  winProbabilityLabel?: string;
}

export interface LiveHeroBatterView {
  id: string;
  name: string;
  role: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRateLabel: string;
  isOnStrike: boolean;
  recentBalls: string[];
}

export interface LiveHeroBowlerView {
  id: string;
  name: string;
  overs: string;
  maidens: number | null;
  runs: number;
  wickets: number;
  economyLabel: string;
  lastOverFigure?: string | null;
}

export interface LiveHeroOddsView {
  label: string;
  valueLabel: string;
  trend: 'UP' | 'DOWN' | 'STABLE' | 'UNKNOWN';
  provider?: string | null;
  timestampLabel?: string | null;
  jurisdictionEnabled: boolean;
}

export interface LiveHeroStalenessView {
  tier: StalenessTier;
  ageSeconds: number;
  message?: string | null;
  nextRetryAllowed?: string | null;
}

export interface LiveHeroQuickLink {
  id: string;
  label: string;
  target: string;
}

export interface LiveHeroViewModel {
  matchId: string;
  status: LiveMatchStatus;
  timestamp: string;
  score: LiveHeroScoreSummary;
  chase: LiveHeroChaseSummary;
  batters: LiveHeroBatterView[];
  bowler: LiveHeroBowlerView | null;
  partnershipLabel?: string | null;
  odds: LiveHeroOddsView | null;
  staleness: LiveHeroStalenessView;
  quickLinks: LiveHeroQuickLink[];
  currentStriker?: LiveHeroBatterView | null;
  lastValidStriker?: LiveHeroBatterView | null;
}

export interface LiveHeroState {
  loading: boolean;
  view: LiveHeroViewModel | null;
  error?: string | null;
}

export interface LiveHeroConfig {
  quickLinks?: LiveHeroQuickLink[];
}

export interface LegacyCricketData {
  score?: string | null;
  over?: number | string | null;
  crr?: string | number | null;
  currentRunRate?: string | number | null;
  requiredRunRate?: string | number | null;
  fav_team?: string | null;
  batting_team?: string | null;
  final_result_text?: string | null;
  team_odds?: LegacyTeamOdds | null;
  match_odds?: LegacyMatchOdds[] | null;
  batsman_data?: LegacyBatsman[] | null;
  bowler_data?: LegacyBowler[] | null;
  session_odds?: LegacySessionOdds[] | null;
  overs_data?: LegacyOverData[] | null;
  runs_on_ball?: string | string[] | null;
  current_ball?: string | number | null;
  toss_won_country?: string | null;
  lastUpdated?: number | null;
  updatedTimeStamp?: number | null;
}

export interface LegacyTeamOdds {
  backOdds?: string | number | null;
  layOdds?: string | number | null;
}

export interface LegacyMatchOdds {
  teamName?: string | null;
  odds?: LegacyTeamOdds | null;
}

export interface LegacyBatsman {
  name?: string | null;
  score?: string | number | null;
  ballsFaced?: string | number | null;
  fours?: string | number | null;
  sixes?: string | number | null;
  strikeRate?: string | number | null;
  onStrike?: boolean | null;
}

export interface LegacyBowler {
  name?: string | null;
  score?: string | number | null;
  ballsBowled?: string | number | null;
  economyRate?: string | number | null;
  wicketsTaken?: string | number | null;
  dotBalls?: string | number | null;
}

export interface LegacySessionOdds {
  sessionOver?: string | number | null;
  sessionBackOdds?: string | number | null;
  sessionLayOdds?: string | number | null;
}

export interface LegacyOverData {
  overNumber?: string | null;
  balls?: Array<string | LegacyOverBall> | null;
}

export interface LegacyOverBall {
  score?: string | number | null;
  runs?: string | number | null;
  outcome?: string | number | null;
  [key: string]: string | number | null | undefined;
}
