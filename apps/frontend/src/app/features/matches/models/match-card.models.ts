/**
 * Match Card View Models and Interfaces
 * Purpose: Type definitions for match card components
 * Created: 2025-11-06
 */

/**
 * Enhanced match data for UI display
 */
export interface MatchCardViewModel {
  // Core match data (from backend)
  id: string;
  team1: TeamInfo;
  team2: TeamInfo;
  status: MatchStatus;
  venue: string;
  startTime: Date;
  matchUrl?: string;             // Original match URL for navigation
  
  // Computed display properties
  displayStatus: string;        // "Live", "Upcoming", "Completed"
  statusColor: string;           // Computed from theme
  timeDisplay: string;           // "2h ago", "Tomorrow 2:00 PM"
  isLive: boolean;
  canAnimate: boolean;           // True if match is live
  
  // UI state
  isHovered: boolean;
  isSelected: boolean;
  lastUpdated: Date;
  staleness: 'fresh' | 'warning' | 'error'; // Based on lastUpdated
}

/**
 * Team information for match card
 */
export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;      // "IND", "AUS"
  logoUrl: string;
  score: ScoreInfo | null;
}

/**
 * Score information
 */
export interface ScoreInfo {
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
  displayText: string;    // "245/6 (45.3 ov)"
}

/**
 * Match status enum
 */
export enum MatchStatus {
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  INNINGS_BREAK = 'INNINGS_BREAK',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  RAIN_DELAY = 'RAIN_DELAY'
}
