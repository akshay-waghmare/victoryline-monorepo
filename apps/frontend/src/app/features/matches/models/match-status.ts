/**
 * Match Status Utilities
 * Purpose: Helper functions for match status handling
 * Created: 2025-11-06
 */

import { MatchStatus } from './match-card.models';

/**
 * Type guard for MatchStatus
 */
export function isValidMatchStatus(status: string): status is MatchStatus {
  return Object.values(MatchStatus).includes(status as MatchStatus);
}

/**
 * Get display text for match status
 */
export function getStatusDisplayText(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.LIVE:
      return 'Live';
    case MatchStatus.UPCOMING:
      return 'Upcoming';
    case MatchStatus.COMPLETED:
      return 'Completed';
    case MatchStatus.INNINGS_BREAK:
      return 'Innings Break';
    case MatchStatus.ABANDONED:
      return 'Abandoned';
    case MatchStatus.RAIN_DELAY:
      return 'Rain Delay';
    default:
      return 'Unknown';
  }
}

/**
 * Get color CSS variable name for match status
 */
export function getStatusColor(status: MatchStatus): string {
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
 * Check if match is live (accepting score updates)
 */
export function isLiveMatch(status: MatchStatus): boolean {
  return status === MatchStatus.LIVE || status === MatchStatus.INNINGS_BREAK;
}

/**
 * Calculate staleness level based on last updated timestamp
 */
export function calculateStaleness(lastUpdated: Date): 'fresh' | 'warning' | 'error' {
  const secondsAgo = (Date.now() - lastUpdated.getTime()) / 1000;
  
  if (secondsAgo < 30) {
    return 'fresh';
  } else if (secondsAgo < 120) {
    return 'warning';
  } else {
    return 'error';
  }
}

// Cache for formatTimeDisplay to prevent ExpressionChangedAfterItHasBeenCheckedError
let timeDisplayCache: { date: number, value: string, timestamp: number } | null = null;
const TIME_CACHE_TTL = 10000; // 10 seconds

/**
 * Format time display relative to now (DEPRECATED - use TimeAgoPipe instead)
 * This function is cached to prevent change detection errors
 * @deprecated Use TimeAgoPipe in templates instead
 */
export function formatTimeDisplay(date: Date): string {
  const now = Date.now();
  const dateTime = date.getTime();
  
  // Return cached value if still valid
  if (timeDisplayCache && 
      timeDisplayCache.date === dateTime && 
      (now - timeDisplayCache.timestamp) < TIME_CACHE_TTL) {
    return timeDisplayCache.value;
  }
  
  const diffMs = dateTime - now;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  let result: string;
  
  if (diffMs < 0) {
    // Past time
    if (diffSeconds < 60) {
      result = `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      result = `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      result = `${diffHours}h ago`;
    } else {
      result = `${diffDays}d ago`;
    }
  } else {
    // Future time
    if (diffSeconds < 60) {
      result = `in ${diffSeconds}s`;
    } else if (diffMinutes < 60) {
      result = `in ${diffMinutes}m`;
    } else if (diffHours < 24) {
      result = `in ${diffHours}h`;
    } else {
      result = `in ${diffDays}d`;
    }
  }
  
  // Cache the result
  timeDisplayCache = { date: dateTime, value: result, timestamp: now };
  
  return result;
}
