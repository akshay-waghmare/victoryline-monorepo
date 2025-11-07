// Match data model interfaces (aligned with specs/002-match-details-ux/data-model.md)

export enum MatchFormat {
  TEST = 'TEST',
  ODI = 'ODI',
  T20 = 'T20',
  T10 = 'T10',
  OTHER = 'OTHER'
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export enum PlayerRole {
  BATSMAN = 'BATSMAN',
  BOWLER = 'BOWLER',
  ALL_ROUNDER = 'ALL_ROUNDER',
  WICKET_KEEPER = 'WICKET_KEEPER',
  UNKNOWN = 'UNKNOWN'
}

export enum CommentaryType {
  BALL = 'BALL',
  OVER_SUMMARY = 'OVER_SUMMARY',
  WICKET = 'WICKET',
  BOUNDARY = 'BOUNDARY',
  INFO = 'INFO'
}

export enum HighlightType {
  NONE = 'NONE',
  BOUNDARY = 'BOUNDARY',
  SIX = 'SIX',
  WICKET = 'WICKET'
}

export interface Match {
  id: string;
  format: MatchFormat;
  status: MatchStatus;
  series: string;
  startTime: string; // ISO 8601
  lastUpdated: string; // ISO 8601
  venueId: string;
  officials: Officials;
  innings: Innings[];
}

export interface Innings {
  id: string;
  number: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  extras: Extras;
  fallOfWickets: FallOfWicket[];
  batting: BattingEntry[];
  bowling: BowlingEntry[];
}

export interface BattingEntry {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal: string;
  isOut: boolean;
}

export interface BowlingEntry {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface FallOfWicket {
  score: string; // e.g., "45/2"
  over: number;
  playerOutId: string;
  playerOutName: string;
}

export interface Extras {
  byes: number;
  legByes: number;
  wides: number;
  noBalls: number;
  penalties: number;
  total: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isPlayingXI: boolean;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity?: number;
}

export interface Officials {
  umpire1: string;
  umpire2: string;
  thirdUmpire?: string;
  referee?: string;
}

export interface ScoreSnapshot {
  matchId: string;
  battingTeamId: string;
  score: string; // e.g., "132/4"
  overs: number;
  currentRunRate: number;
  requiredRunRate?: number;
  recentBalls: RecentBall[];
  matchStatus: string;
  lastUpdated: string; // ISO 8601
}

export interface RecentBall {
  overBall: string; // e.g., "17.3"
  outcome: string; // e.g., "4", "6", "W", "1", "."
  highlight: HighlightType;
}

export interface CommentaryEntry {
  id: string;
  matchId: string;
  inningsNumber: number;
  overBall: string;
  overNumber: number;
  ballInOver: number; // 1..6
  text: string;
  type: CommentaryType;
  batsmanId?: string;
  bowlerId?: string;
  timestamp: string; // ISO 8601
  highlights: string[];
}

export interface CommentaryPage {
  matchId: string;
  page: number;
  pageSize: number;
  totalPages: number;
  entries: CommentaryEntry[];
}

// Staleness tier (per Constitution)
export enum StalenessLevel {
  LIVE = 'LIVE',       // <30s
  WARNING = 'WARNING', // 30-120s
  ERROR = 'ERROR'      // >120s
}
