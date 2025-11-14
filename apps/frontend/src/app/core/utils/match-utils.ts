/**
 * Match Utility Functions
 * Purpose: Color coding and display helpers for matches
 * Created: 2025-11-06
 */

import { MatchStatus, MatchCardViewModel } from '../../features/matches/models/match-card.models';

/**
 * Get CSS color variable for match status
 * Used for badges, borders, and status indicators
 */
export function getMatchStatusColor(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.LIVE:
    case MatchStatus.INNINGS_BREAK:
      return 'var(--color-match-live)'; // Green
    case MatchStatus.UPCOMING:
      return 'var(--color-match-upcoming)'; // Blue
    case MatchStatus.COMPLETED:
      return 'var(--color-match-completed)'; // Gray
    case MatchStatus.RAIN_DELAY:
    case MatchStatus.ABANDONED:
      return 'var(--color-error)'; // Red
    default:
      return 'var(--color-text-secondary)';
  }
}

/**
 * Get background color with opacity for status badges
 */
export function getMatchStatusBackground(status: MatchStatus, opacity: number = 0.1): string {
  const baseColors: { [key in MatchStatus]: string } = {
    [MatchStatus.LIVE]: '76, 175, 80', // RGB for green
    [MatchStatus.INNINGS_BREAK]: '76, 175, 80',
    [MatchStatus.UPCOMING]: '33, 150, 243', // RGB for blue
    [MatchStatus.COMPLETED]: '117, 117, 117', // RGB for gray
    [MatchStatus.RAIN_DELAY]: '244, 67, 54', // RGB for red
    [MatchStatus.ABANDONED]: '244, 67, 54'
  };

  const rgb = baseColors[status] || '117, 117, 117';
  return `rgba(${rgb}, ${opacity})`;
}

/**
 * Get icon name for match status
 */
export function getMatchStatusIcon(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.LIVE:
      return 'fiber_manual_record'; // Red dot
    case MatchStatus.INNINGS_BREAK:
      return 'pause_circle';
    case MatchStatus.UPCOMING:
      return 'schedule';
    case MatchStatus.COMPLETED:
      return 'check_circle';
    case MatchStatus.RAIN_DELAY:
      return 'cloud';
    case MatchStatus.ABANDONED:
      return 'cancel';
    default:
      return 'help_outline';
  }
}

/**
 * Sort matches by priority: Live > Upcoming > Completed
 */
export function sortMatchesByPriority(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  const priorityOrder: { [key in MatchStatus]: number } = {
    [MatchStatus.LIVE]: 1,
    [MatchStatus.INNINGS_BREAK]: 2,
    [MatchStatus.UPCOMING]: 3,
    [MatchStatus.RAIN_DELAY]: 4,
    [MatchStatus.COMPLETED]: 5,
    [MatchStatus.ABANDONED]: 6
  };

  return [...matches].sort((a, b) => {
    const priorityA = priorityOrder[a.status] || 99;
    const priorityB = priorityOrder[b.status] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same priority, sort by start time (upcoming: earliest first, completed: latest first)
    if (a.status === MatchStatus.UPCOMING) {
      return a.startTime.getTime() - b.startTime.getTime();
    } else {
      return b.startTime.getTime() - a.startTime.getTime();
    }
  });
}

/**
 * Filter matches by status
 */
export function filterMatchesByStatus(matches: MatchCardViewModel[], status: MatchStatus): MatchCardViewModel[] {
  return matches.filter(match => match.status === status);
}

/**
 * Filter live matches (including innings break)
 */
export function filterLiveMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  return matches.filter(match =>
    match.status === MatchStatus.LIVE || match.status === MatchStatus.INNINGS_BREAK
  );
}

/**
 * Filter upcoming matches
 */
export function filterUpcomingMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  return matches.filter(match => match.status === MatchStatus.UPCOMING);
}

/**
 * Filter completed matches
 */
export function filterCompletedMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  return matches.filter(match => match.status === MatchStatus.COMPLETED);
}

/**
 * Search matches by team name
 */
export function searchMatches(matches: MatchCardViewModel[], query: string): MatchCardViewModel[] {
  if (!query || query.trim() === '') {
    return matches;
  }

  const lowerQuery = query.toLowerCase().trim();

  return matches.filter(match =>
    match.team1.name.toLowerCase().includes(lowerQuery) ||
    match.team1.shortName.toLowerCase().includes(lowerQuery) ||
    match.team2.name.toLowerCase().includes(lowerQuery) ||
    match.team2.shortName.toLowerCase().includes(lowerQuery) ||
    match.venue.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get match result summary text
 */
export function getMatchResultSummary(match: MatchCardViewModel): string {
  if (match.status !== MatchStatus.COMPLETED) {
    return '';
  }

  const team1Score = match.team1.score;
  const team2Score = match.team2.score;

  if (!team1Score || !team2Score) {
    return 'Match completed';
  }

  // Determine winner by comparing runs
  if (team1Score.runs > team2Score.runs) {
    const margin = team1Score.runs - team2Score.runs;
    return `${match.team1.shortName} won by ${margin} runs`;
  } else if (team2Score.runs > team1Score.runs) {
    const margin = team2Score.runs - team1Score.runs;
    return `${match.team2.shortName} won by ${margin} runs`;
  } else {
    return 'Match tied';
  }
}

/**
 * Check if match data is fresh (updated within last 30 seconds)
 */
export function isMatchDataFresh(match: MatchCardViewModel): boolean {
  const secondsAgo = (Date.now() - match.lastUpdated.getTime()) / 1000;
  return secondsAgo < 30;
}

/**
 * Get staleness severity level
 */
export function getStalenessSeverity(match: MatchCardViewModel): 'none' | 'warning' | 'error' {
  if (match.status !== MatchStatus.LIVE && match.status !== MatchStatus.INNINGS_BREAK) {
    return 'none'; // Only check staleness for live matches
  }

  const secondsAgo = (Date.now() - match.lastUpdated.getTime()) / 1000;

  if (secondsAgo < 30) {
    return 'none';
  } else if (secondsAgo < 120) {
    return 'warning';
  } else {
    return 'error';
  }
}

/**
 * Convert total balls to overs.balls string (6 balls = 1 over)
 * Examples: 102 -> "17.0", 70 -> "11.4", 5 -> "0.5"
 */
export function ballsToOvers(value: number | string): string {
  if (value === undefined || value === null) { return ''; }
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) { return ''; }
  // If already decimal like 17.0
  if (typeof value === 'string' && value.indexOf('.') !== -1) {
    return value;
  }
  const totalBalls = Math.floor(n);
  const completeOvers = Math.floor(totalBalls / 6);
  const remainingBalls = totalBalls % 6;
  return completeOvers + '.' + remainingBalls;
}

/**
 * Normalize score string by spacing parentheses and converting raw ball counts to overs.
 * E.g., "155/9(102" -> "155/9 (17.0)"; "155-9(17.0)" stays as-is.
 */
export function normalizeTeamScoreString(raw: string): string {
  if (!raw) { return raw; }
  let s = String(raw).trim();
  // Ensure single space before '('
  s = s.replace(/\s*\(/g, ' (');
  // If '(digits)' convert digits to overs
  s = s.replace(/\((\d+)\)/g, function(m, d) { return '(' + ballsToOvers(d) + ')'; });
  // If '(' without closing ')', close and normalize
  s = s.replace(/\(([^)]*)$/, function(m, inside) {
    const cleaned = String(inside).trim();
    if (/^\d+$/.test(cleaned)) {
      return '(' + ballsToOvers(cleaned) + ')';
    }
    return '(' + cleaned + ')';
  });
  return s;
}

/**
 * Extract the match slug from a full URL, e.g., '.../some-match-slug/live' => 'some-match-slug'.
 * Also supports '/scorecard' ending.
 */
export function extractSlugFromUrl(url: string): string | null {
  if (!url || url.indexOf('/') === -1) { return null; }
  const parts = url.split('/').filter(function(p) { return !!p; });
  if (parts.length < 2) { return null; }
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last && prev) {
    const lastLower = last.toLowerCase();
    if (lastLower === 'live' || lastLower === 'scorecard') {
      return prev;
    }
  }
  return null;
}
