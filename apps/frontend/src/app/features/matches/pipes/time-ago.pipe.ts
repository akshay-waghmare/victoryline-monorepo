/**
 * Time Ago Pipe
 * Purpose: Display relative time (pure pipe to avoid change detection issues)
 * Created: 2025-11-18
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  pure: true // Pure pipe to avoid change detection issues
})
export class TimeAgoPipe implements PipeTransform {

  transform(date: Date | null | undefined): string {
    if (!date) {
      return '';
    }

    const now = Date.now();
    const timestamp = date.getTime();

    // Calculate new value
    const diffMs = timestamp - now;
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

    return result;
  }
}
