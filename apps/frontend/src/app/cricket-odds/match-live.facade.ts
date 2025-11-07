import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, throwError, of } from 'rxjs';
import { filter, map, retryWhen, switchMap, takeUntil, delay, scan, mergeMap, tap } from 'rxjs/operators';
import { RxStompService } from '@stomp/ng2-stompjs';
import { environment } from 'src/environments/environment';

/**
 * MatchLiveFacade
 * Centralized facade for live match data via WebSocket (primary) with polling fallback (to be implemented separately T014).
 * Implements reconnect with exponential backoff (1s,2s,4s,8s,16s max 30s) capped attempts (maxAttempts=10).
 * After 10 failed attempts, requires manual retry trigger.
 */
@Injectable({ providedIn: 'root' })
export class MatchLiveFacade {
  private snapshot$ = new BehaviorSubject<any | null>(null);
  private commentaryEvents$ = new Subject<any>();
  private stop$ = new Subject<void>();
  private reconnectAttempts$ = new BehaviorSubject<number>(0);
  private matchId?: string;

  private readonly MAX_ATTEMPTS = 10;
  private readonly MAX_BACKOFF_MS = 30000; // 30s cap

  constructor(private rxStomp: RxStompService, private zone: NgZone) {}

  init(matchId: string) {
    if (this.matchId === matchId) return; // already initialized for this match
    this.matchId = matchId;
    this.reconnectAttempts$.next(0);
    this.connectSnapshot(matchId);
    this.connectCommentary(matchId);
  }

  private connectSnapshot(id: string) {
    const topic = `/topic/cricket.match.${id}.snapshot`;
    this.zone.runOutsideAngular(() => {
      this.rxStomp.watch(topic).pipe(
        retryWhen(errors => errors.pipe(
          mergeMap((err, attempt) => {
            const currentAttempt = attempt + 1;
            this.reconnectAttempts$.next(currentAttempt);
            
            if (currentAttempt >= this.MAX_ATTEMPTS) {
              console.error(`[MatchLiveFacade] Max reconnect attempts (${this.MAX_ATTEMPTS}) reached for snapshot.`);
              return throwError(() => new Error('Max reconnect attempts exceeded'));
            }

            const backoffMs = Math.min(Math.pow(2, attempt) * 1000, this.MAX_BACKOFF_MS);
            console.warn(`[MatchLiveFacade] Reconnecting snapshot in ${backoffMs}ms (attempt ${currentAttempt})`);
            return timer(backoffMs);
          })
        )),
        takeUntil(this.stop$)
      ).subscribe(msg => {
        const body = safeJson(msg.body);
        this.zone.run(() => {
          this.snapshot$.next(body);
          this.reconnectAttempts$.next(0); // reset on successful message
        });
      }, err => {
        console.error('[MatchLiveFacade] Snapshot connection failed permanently:', err);
      });
    });
  }

  private connectCommentary(id: string) {
    const topic = `/topic/cricket.match.${id}.commentary`;
    this.zone.runOutsideAngular(() => {
      this.rxStomp.watch(topic).pipe(
        retryWhen(errors => errors.pipe(
          mergeMap((err, attempt) => {
            const currentAttempt = attempt + 1;
            if (currentAttempt >= this.MAX_ATTEMPTS) {
              console.error(`[MatchLiveFacade] Max reconnect attempts (${this.MAX_ATTEMPTS}) reached for commentary.`);
              return throwError(() => new Error('Max reconnect attempts exceeded'));
            }
            const backoffMs = Math.min(Math.pow(2, attempt) * 1000, this.MAX_BACKOFF_MS);
            console.warn(`[MatchLiveFacade] Reconnecting commentary in ${backoffMs}ms (attempt ${currentAttempt})`);
            return timer(backoffMs);
          })
        )),
        takeUntil(this.stop$)
      ).subscribe(msg => {
        const body = safeJson(msg.body);
        this.zone.run(() => this.commentaryEvents$.next(body));
      }, err => {
        console.error('[MatchLiveFacade] Commentary connection failed permanently:', err);
      });
    });
  }

  getSnapshotStream(): Observable<any | null> { return this.snapshot$.asObservable(); }
  getCommentaryStream(): Observable<any> { return this.commentaryEvents$.asObservable(); }
  getReconnectAttempts(): Observable<number> { return this.reconnectAttempts$.asObservable(); }

  manualRetry() {
    this.reconnectAttempts$.next(0);
    if (this.matchId) {
      this.dispose();
      this.stop$ = new Subject<void>();
      this.init(this.matchId);
    }
  }

  dispose() {
    this.stop$.next();
    this.stop$.complete();
  }
}

function safeJson(raw: string) {
  try { return JSON.parse(raw); } catch { return raw; }
}
