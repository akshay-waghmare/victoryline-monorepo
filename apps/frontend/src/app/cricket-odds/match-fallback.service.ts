import { Injectable } from '@angular/core';
import { Observable, timer, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { MatchApiService } from './match-api.service';

/**
 * MatchFallbackService
 * Polling fallback (≤5s interval) when WebSocket is unavailable or failing.
 * Controlled via feature flag `usePollingFallback` (stored in-memory or config).
 */
@Injectable({ providedIn: 'root' })
export class MatchFallbackService {
  private usePollingFallback = false; // Feature flag
  private pollingInterval = 5000; // 5s

  constructor(private api: MatchApiService) {}

  setPollingEnabled(enabled: boolean) {
    this.usePollingFallback = enabled;
  }

  isPollingEnabled(): boolean {
    return this.usePollingFallback;
  }

  pollSnapshot(matchId: string): Observable<any> {
    if (!this.usePollingFallback) {
      return of(null);
    }

    return timer(0, this.pollingInterval).pipe(
      switchMap(() => this.api.getSnapshot(matchId)),
      tap(data => console.log('[MatchFallback] Snapshot polled:', data)),
      catchError(err => {
        console.error('[MatchFallback] Snapshot poll failed:', err);
        return of(null);
      })
    );
  }

  pollCommentary(matchId: string, page = 1, pageSize = 30): Observable<any> {
    if (!this.usePollingFallback) {
      return of(null);
    }

    return timer(0, this.pollingInterval).pipe(
      switchMap(() => this.api.getCommentary(matchId, page, pageSize)),
      tap(data => console.log('[MatchFallback] Commentary polled:', data)),
      catchError(err => {
        console.error('[MatchFallback] Commentary poll failed:', err);
        return of(null);
      })
    );
  }
}
