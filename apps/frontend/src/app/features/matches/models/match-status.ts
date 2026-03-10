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

/**
 * Format time display relative to now
 */
export function formatTimeDisplay(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMs < 0) {
    // Past time
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  } else {
    // Future time
    if (diffSeconds < 60) {
      return `in ${diffSeconds}s`;
    } else if (diffMinutes < 60) {
      return `in ${diffMinutes}m`;
    } else if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      return remainingMinutes > 0 ? `in ${diffHours}h ${remainingMinutes}m` : `in ${diffHours}h`;
    } else {
      return `in ${diffDays}d`;
    }
  }
}

export function formatAbsoluteTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatCalendarDate(date: Date): string {
  const target = new Date(date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()).getTime();

  const absoluteLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(target);

  if (targetDay === todayDay) {
    return `Today, ${absoluteLabel}`;
  }

  if (targetDay === tomorrowDay) {
    return `Tomorrow, ${absoluteLabel}`;
  }

  return absoluteLabel;
}
