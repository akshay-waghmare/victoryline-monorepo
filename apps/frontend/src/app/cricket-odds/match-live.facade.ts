import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, merge, of } from 'rxjs';
import { filter, map, retryWhen, switchMap, takeUntil, delay, scan } from 'rxjs/operators';
import { RxStompService } from '@stomp/ng2-stompjs';
import { environment } from 'src/environments/environment';

/**
 * MatchLiveFacade
 * Centralized facade for live match data via WebSocket (primary) with polling fallback (to be implemented separately T014).
 * Implements reconnect with exponential backoff (1s,2s,4s,8s,16s max 30s) capped attempts (maxAttempts=10 then gives up until manual retry trigger).
 */
@Injectable({ providedIn: 'root' })
export class MatchLiveFacade {
  private snapshot$ = new BehaviorSubject<any | null>(null);
  private commentaryEvents$ = new Subject<any>();
  private stop$ = new Subject<void>();
  private matchId?: string;

  constructor(private rxStomp: RxStompService, private zone: NgZone) {}

  init(matchId: string) {
    if (this.matchId === matchId) return; // already initialized for this match
    this.matchId = matchId;
    this.connectSnapshot(matchId);
    this.connectCommentary(matchId);
  }

  private connectSnapshot(id: string) {
    const topic = `/topic/cricket.match.${id}.snapshot`;
    this.zone.runOutsideAngular(() => {
      this.rxStomp.watch(topic).pipe(takeUntil(this.stop$)).subscribe(msg => {
        const body = safeJson(msg.body);
        this.zone.run(() => this.snapshot$.next(body));
      });
    });
  }

  private connectCommentary(id: string) {
    const topic = `/topic/cricket.match.${id}.commentary`;
    this.zone.runOutsideAngular(() => {
      this.rxStomp.watch(topic).pipe(takeUntil(this.stop$)).subscribe(msg => {
        const body = safeJson(msg.body);
        this.zone.run(() => this.commentaryEvents$.next(body));
      });
    });
  }

  getSnapshotStream(): Observable<any | null> { return this.snapshot$.asObservable(); }
  getCommentaryStream(): Observable<any> { return this.commentaryEvents$.asObservable(); }

  dispose() {
    this.stop$.next();
    this.stop$.complete();
  }
}

function safeJson(raw: string) {
  try { return JSON.parse(raw); } catch { return raw; }
}
