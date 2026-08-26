/**
 * Match Utility Functions
 * Purpose: Color coding and display helpers for matches
 * Created: 2025-11-06
 */

import { MatchStatus, MatchCardViewModel } from '../../features/matches/models/match-card.models';

export type RecentBallKind = 'dot' | 'run' | 'four' | 'six' | 'wicket' | 'extra' | 'other';

export interface RecentBallDisplay {
  raw: string;
  display: string;
  fullLabel: string;
  kind: RecentBallKind;
}

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
    
    // Within same priority, sort upcoming by scheduled start and completed by last update.
    if (a.status === MatchStatus.UPCOMING) {
      return a.startTime.getTime() - b.startTime.getTime();
    } else if (a.status === MatchStatus.COMPLETED || a.status === MatchStatus.ABANDONED) {
      return b.lastUpdated.getTime() - a.lastUpdated.getTime();
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
    match.status === MatchStatus.LIVE || match.status === MatchStatus.INNINGS_BREAK || match.status === MatchStatus.RAIN_DELAY
  );
}

/**
 * Filter upcoming matches (today and future only)
 */
export function filterUpcomingMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  var now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  return matches.filter(function(match) {
    return match.status === MatchStatus.UPCOMING && match.startTime >= now;
  });
}

/**
 * Filter upcoming matches to a forward-looking time window.
 * Useful for SSR discovery sections that should prioritize the next real fixtures
 * instead of relying on whichever tab or sitemap slice happens to render first.
 */
export function filterUpcomingMatchesInHours(
  matches: MatchCardViewModel[],
  minHoursAhead: number,
  maxHoursAhead: number
): MatchCardViewModel[] {
  var now = Date.now();
  var minMs = Math.max(0, minHoursAhead || 0) * 60 * 60 * 1000;
  var maxMs = Math.max(minHoursAhead || 0, maxHoursAhead || 0) * 60 * 60 * 1000;

  return matches.filter(function(match) {
    if (!match || match.status !== MatchStatus.UPCOMING || !match.startTime || isNaN(match.startTime.getTime())) {
      return false;
    }

    var delta = match.startTime.getTime() - now;
    return delta >= minMs && delta <= maxMs;
  });
}

/**
 * Order upcoming matches for SSR discovery so the preferred early-discovery window
 * is surfaced before same-day crowding, while still keeping nearer fixtures
 * and the rest of the upcoming feed available behind it.
 */
export function prioritizeUpcomingMatchesForDiscovery(
  matches: MatchCardViewModel[],
  primaryMinHoursAhead: number,
  primaryMaxHoursAhead: number
): MatchCardViewModel[] {
  var candidates = ([] as MatchCardViewModel[])
    .concat(filterUpcomingMatchesInHours(matches, primaryMinHoursAhead, primaryMaxHoursAhead))
    .concat(filterUpcomingMatchesInHours(matches, 0, primaryMinHoursAhead))
    .concat(filterUpcomingMatches(matches));
  var seen: { [key: string]: boolean } = {};

  return candidates.filter(function(match) {
    var href = buildCanonicalMatchPath(match);
    if (!href || seen[href]) {
      return false;
    }

    seen[href] = true;
    return true;
  });
}

/**
 * Filter completed matches
 */
export function filterCompletedMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
  return matches.filter(match => 
    match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED
  );
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
  if (match.resultSummary && match.resultSummary.trim()) {
    // Live feeds may use resultSummary for chase context, e.g.:
    // "ZIM need 171 runs in 112 balls". Preserve that compact message.
    if ((match.status === MatchStatus.LIVE || match.status === MatchStatus.INNINGS_BREAK) && match.resultSummary.length <= 90) {
      return match.resultSummary.trim();
    }
    // Extract just the "TEAM Won ..." part, stripping embedded scores
    const wonMatch = match.resultSummary.match(/([A-Za-z][A-Za-z\s&.-]*?)\s+Won[^,]*/i);
    if (wonMatch) {
      return wonMatch[0].trim();
    }
    // Check for other result types
    const drawMatch = match.resultSummary.match(/Match\s+(Draw|Tied|Abandoned|No\s+Result)/i);
    if (drawMatch) {
      return drawMatch[0].trim();
    }
    // Fallback: return raw summary only if it's short (no embedded scores)
    if (match.resultSummary.length < 40) {
      return match.resultSummary;
    }
  }

  if (match.status !== MatchStatus.COMPLETED && match.status !== MatchStatus.ABANDONED) {
    return '';
  }

  if (match.status === MatchStatus.ABANDONED) {
    return 'Match abandoned';
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
  if (value === undefined || value === null) return '';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '';
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
  if (!raw) return raw;
  var s = String(raw).trim();
  // Ensure single space before '('
  s = s.replace(/\s*\(/g, ' (');
  // If '(digits)' convert digits to overs
  s = s.replace(/\((\d+)\)/g, function(m, d) { return '(' + ballsToOvers(d) + ')'; });
  // If '(' without closing ')', close and normalize
  s = s.replace(/\(([^)]*)$/, function(m, inside) {
    var cleaned = String(inside).trim();
    if (/^\d+$/.test(cleaned)) {
      return '(' + ballsToOvers(cleaned) + ')';
    }
    return '(' + cleaned + ')';
  });
  return s;
}

export function getRecentBallDisplay(value: any): RecentBallDisplay {
  var raw = value === undefined || value === null ? '' : String(value).trim();
  var lower = raw.toLowerCase();
  var numberMatch = lower.match(/^\d+$/);
  // Matches prefix-first (lb1, b2, wd, nb) OR number-first (1b, 2lb, 1wd) formats
  var extraMatch = lower.match(/^(lb|wd|nb|b)(\d+)?$/) || (() => {
    var m = lower.match(/^(\d+)(lb|wd|nb|b)$/);
    return m ? [m[0], m[2], m[1]] as RegExpMatchArray : null;  // swap groups to [full, type, runs]
  })();
  var wicketLabelMap: { [key: string]: string } = {
    'w': 'Wicket',
    '^1': 'Bowled',
    '^2': 'Caught Out',
    '^3': 'Caught and Bowled',
    '^4': 'Run Out',
    '^5': 'Stumped',
    '^6': 'Hit Wicket',
    '^7': 'LBW',
    'bowled': 'Bowled',
    'caught out': 'Caught Out',
    'caught and bowled': 'Caught and Bowled',
    'caughtandbowled': 'Caught and Bowled',
    'run out': 'Run Out',
    'stumped': 'Stumped',
    'hit wicket': 'Hit Wicket',
    'lbw': 'LBW',
    'wicket': 'Wicket'
  };

  if (!raw) {
    return {
      raw: '',
      display: '',
      fullLabel: '',
      kind: 'other'
    };
  }

  // Any ^N code not in the map → generic wicket
  if (lower.startsWith('^') && !wicketLabelMap[lower]) {
    return { raw, display: 'W', fullLabel: 'Wicket', kind: 'wicket' };
  }

  if (numberMatch) {
    var runs = parseInt(lower, 10);
    if (runs === 0) {
      return {
        raw: raw,
        display: '0',
        fullLabel: 'Dot ball',
        kind: 'dot'
      };
    }

    if (runs === 4) {
      return {
        raw: raw,
        display: '4',
        fullLabel: 'Four',
        kind: 'four'
      };
    }

    if (runs === 6) {
      return {
        raw: raw,
        display: '6',
        fullLabel: 'Six',
        kind: 'six'
      };
    }

    return {
      raw: raw,
      display: String(runs),
      fullLabel: runs === 1 ? '1 run' : runs + ' runs',
      kind: 'run'
    };
  }

  if (wicketLabelMap[lower]) {
    return {
      raw: raw,
      display: 'W',
      fullLabel: wicketLabelMap[lower],
      kind: 'wicket'
    };
  }

  if (extraMatch) {
    var extraType = extraMatch[1];
    var extraRuns = extraMatch[2] ? parseInt(extraMatch[2], 10) : null;
    var prefix = extraType === 'b' ? 'B' : extraType.toUpperCase();
    var extraLabel = extraType === 'lb'
      ? 'Leg bye'
      : extraType === 'wd'
        ? 'Wide'
        : extraType === 'nb'
          ? 'No ball'
          : 'Bye';
    var runSuffix = extraRuns === null ? '' : ' ' + extraRuns;

    return {
      raw: raw,
      display: extraRuns === null ? prefix : prefix + extraRuns,
      fullLabel: extraLabel + runSuffix,
      kind: 'extra'
    };
  }

  return {
    raw: raw,
    display: raw.toUpperCase(),
    fullLabel: raw,
    kind: 'other'
  };
}

/**
 * Extract the match slug from CREX match URLs.
 * Supports legacy endings like '/live', '/scorecard', '/info'
 * and newer endings like '/match-scorecard', '/match-details',
 * while also accepting the newer base live URL where the slug is
 * the final segment.
 */
export function extractSlugFromUrl(url: string): string | null {
  if (!url || url.indexOf('/') === -1) return null;

  var normalized = String(url).trim().split('#')[0].split('?')[0].replace(/\/+$/, '');
  var parts = normalized.split('/').filter(function(p) { return !!p; });
  if (parts.length < 2) return null;

  var last = parts[parts.length - 1];
  var prev = parts[parts.length - 2];
  if (!last) return null;

  var lastLower = last.toLowerCase();
  var suffixSegments: { [key: string]: boolean } = {
    live: true,
    scorecard: true,
    info: true,
    'match-scorecard': true,
    'match-details': true
  };
  var nonSlugSegments: { [key: string]: boolean } = {
    scoreboard: true,
    'cricket-live-score': true
  };

  if (suffixSegments[lastLower]) {
    return prev || null;
  }

  if (nonSlugSegments[lastLower]) {
    return null;
  }

  return last;
}

export function extractMatchRouteSuffix(urlOrPath: string): string | null {
  if (!urlOrPath) {
    return null;
  }

  var parts = getNormalizedPathSegments(urlOrPath);
  if (parts.length < 2) {
    return null;
  }

  var last = parts[parts.length - 1];
  var prev = parts[parts.length - 2];
  var lastLower = last.toLowerCase();
  var slug = parts.slice().reverse().find(function(part) { return part.indexOf('-vs-') !== -1; }) || null;

  if (!slug || prev !== slug) {
    return null;
  }

  return lastLower === slug.toLowerCase() ? null : lastLower;
}

export function normalizeMatchRoutePath(urlOrPath: string): string | null {
  var slug = extractMatchSlugFromPath(urlOrPath);
  return slug ? '/cric-live/' + slug : null;
}

export function buildCanonicalMatchPath(match: Pick<MatchCardViewModel, 'matchUrl' | 'externalMatchKey' | 'id'>): string | null {
  var slug = extractSlugFromUrl(match && match.matchUrl ? match.matchUrl : '');
  if (!slug && match && match.externalMatchKey) {
    slug = match.externalMatchKey;
  }
  if (!slug && match && match.id && match.id.indexOf('-') !== -1) {
    slug = match.id;
  }

  if (!slug || slug.indexOf('-vs-') === -1 || isPlaceholderCanonicalMatchSlug(slug)) {
    return null;
  }

  return '/cric-live/' + slug;
}

export function buildCanonicalMatchLinkLabel(
  match: Pick<MatchCardViewModel, 'team1' | 'team2' | 'status'>
    & Partial<Pick<MatchCardViewModel, 'matchUrl' | 'externalMatchKey' | 'id'>>
): string {
  var team1 = getPreferredTeamLabel(match && match.team1);
  var team2 = getPreferredTeamLabel(match && match.team2);

  // Some upcoming catalogue rows omit team objects even though their stable
  // CREX slug already carries the authoritative fixture identity. Keep the
  // SSR crawl anchor match-specific instead of publishing `TBD vs TBD`.
  if (!team1 || !team2 || isPlaceholderTeamLabel(team1) || isPlaceholderTeamLabel(team2)) {
    var slugTeams = getTeamsFromCanonicalSlug(match);
    team1 = slugTeams ? slugTeams[0] : team1;
    team2 = slugTeams ? slugTeams[1] : team2;
  }

  var base = (team1 || 'TBD') + ' vs ' + (team2 || 'TBD');

  switch (match && match.status) {
    case MatchStatus.UPCOMING:
      return base + ' match preview';
    case MatchStatus.COMPLETED:
    case MatchStatus.ABANDONED:
      return base + ' result';
    case MatchStatus.RAIN_DELAY:
    case MatchStatus.INNINGS_BREAK:
    case MatchStatus.LIVE:
    default:
      return base + ' live score';
  }
}

function getTeamsFromCanonicalSlug(
  match: Partial<Pick<MatchCardViewModel, 'matchUrl' | 'externalMatchKey' | 'id'>>
): [string, string] | null {
  var canonicalPath = buildCanonicalMatchPath(match as Pick<MatchCardViewModel, 'matchUrl' | 'externalMatchKey' | 'id'>);
  var slug = canonicalPath ? canonicalPath.replace(/^\/cric-live\//, '') : '';
  var matchParts = slug.match(/^(.+)-vs-(.+?)-\d+(?:st|nd|rd|th)-/i);
  if (!matchParts) {
    return null;
  }

  return [formatSlugTeamLabel(matchParts[1]), formatSlugTeamLabel(matchParts[2])];
}

function formatSlugTeamLabel(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.length <= 4
      ? part.toUpperCase()
      : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getPreferredTeamLabel(team: MatchCardViewModel['team1'] | null | undefined): string {
  if (!team) {
    return '';
  }

  var name = team.name ? team.name.trim() : '';
  if (name && !isPlaceholderTeamLabel(name)) {
    return name;
  }

  var shortName = team.shortName ? team.shortName.trim() : '';
  return shortName && !isPlaceholderTeamLabel(shortName) ? shortName : '';
}

function isPlaceholderTeamLabel(value: string): boolean {
  var normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return !normalized
    || normalized === 'tbd'
    || normalized === 'tbc'
    || normalized === 'team 1'
    || normalized === 'team 2'
    || normalized === 'team a'
    || normalized === 'team b'
    || normalized === 'unknown'
    || normalized === 'null'
    || normalized === 'undefined';
}

function isPlaceholderCanonicalMatchSlug(value: string): boolean {
  var normalized = String(value || '').trim().toLowerCase();
  var separator = normalized.indexOf('-vs-');
  if (separator <= 0 || separator + 4 >= normalized.length) {
    return true;
  }

  var firstTeam = normalized.substring(0, separator);
  var secondTeamAndSeries = normalized.substring(separator + 4);
  return /^(?:null|undefined|tbd|tbc|tba|unknown|team(?:[- ]?(?:1|2|a|b))?)(?:-|$)/i.test(firstTeam)
    || /^(?:null|undefined|tbd|tbc|tba|unknown|team(?:[- ]?(?:1|2|a|b))?)(?:-|$)/i.test(secondTeamAndSeries);
}

function extractMatchSlugFromPath(urlOrPath: string): string | null {
  var parts = getNormalizedPathSegments(urlOrPath);
  if (!parts.length) {
    return null;
  }

  var slug = parts.slice().reverse().find(function(part) { return part.indexOf('-vs-') !== -1; }) || null;
  return slug || null;
}

function getNormalizedPathSegments(urlOrPath: string): string[] {
  var normalized = String(urlOrPath || '').trim().split('#')[0].split('?')[0];
  normalized = normalized.replace(/^[a-z]+:\/\/[^\/]+/i, '');
  normalized = normalized.replace(/^\/+|\/+$/g, '');
  return normalized ? normalized.split('/').filter(function(part) { return !!part; }) : [];
}
