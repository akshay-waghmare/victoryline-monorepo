import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges, HostListener } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { LiveHeroConfig, LiveHeroState, LiveHeroViewModel, StalenessTier } from '../../services/live-hero.models';
import {
  getLiveHeroResultSummary,
  getLiveHeroStatusKey,
  getLiveHeroStatusLabel,
  shouldShowLiveHeroChase
} from '../../services/live-hero-display.utils';
import { LiveHeroStateService } from '../../services/live-hero-state.service';
import { getRecentBallDisplay } from '../../../core/utils/match-utils';

@Component({
  selector: 'app-live-hero',
  templateUrl: './live-hero.component.html',
  styleUrls: ['./live-hero.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LiveHeroStateService]
})
export class LiveHeroComponent implements OnChanges, OnDestroy {
  @Input() matchId!: string;
  @Input() config?: LiveHeroConfig;
  @Input() matchInfo?: any;
  @Input() fallbackView?: LiveHeroViewModel | null;
  @Input() last6Balls?: any[] = [];
  @Input() batsmanDataList?: any[] = [];
  @Input() bowlerDataList?: any[] = [];

  readonly state$: Observable<LiveHeroState> = this.heroState.state$;
  readonly view$: Observable<LiveHeroViewModel | null> = this.heroState.view$;
  
  private showCondensedSubject = new BehaviorSubject<boolean>(false);
  readonly showCondensed$ = this.showCondensedSubject.asObservable();
  private heroScrollThreshold = 300; // pixels scrolled before showing condensed

  constructor(private readonly heroState: LiveHeroStateService) {}

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const shouldShowCondensed = scrollPosition > this.heroScrollThreshold;
    
    if (this.showCondensedSubject.value !== shouldShowCondensed) {
      this.showCondensedSubject.next(shouldShowCondensed);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.matchId) {
      return;
    }

    if (changes['matchId'] || changes['config']) {
      this.heroState.init(this.matchId, this.config);
    }
  }

  ngOnDestroy(): void {
    this.heroState.destroy();
    this.showCondensedSubject.complete();
  }

  retry(): void {
    this.heroState.manualRetry();
  }

  getActiveView(view: LiveHeroViewModel | null): LiveHeroViewModel | null {
    return view || this.fallbackView || null;
  }

  stalenessBadge(view: LiveHeroViewModel | null): string | null {
    if (!view) {
      return null;
    }

    switch (view.staleness.tier) {
      case 'FRESH':
        return 'Live';
      case 'WARNING':
        return 'Delayed';
      case 'ERROR':
        return 'Retry Required';
      default:
        return null;
    }
  }

  stalenessTone(view: LiveHeroViewModel | null): 'default' | 'warning' | 'error' {
    if (!view) {
      return 'default';
    }

    return this.mapTierToTone(view.staleness.tier);
  }

  mapTierToTone(tier: StalenessTier): 'default' | 'warning' | 'error' {
    switch (tier) {
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'error';
      default:
        return 'default';
    }
  }

  oddsTone(view: LiveHeroViewModel | null): 'default' | 'warning' {
    if (!view || !view.odds) {
      return 'warning';
    }

    return view.odds.jurisdictionEnabled ? 'default' : 'warning';
  }

  trackBall(index: number, ball: any): string {
    if (ball && ball.key) {
      return ball.key;
    }

    if (ball && ball.score !== undefined && ball.score !== null) {
      return index + '-' + ball.score;
    }

    return String(index);
  }

  getBallDisplay(ball: any): string {
    if (ball && ball.score !== undefined && ball.score !== null) {
      return String(ball.score);
    }

    return String(ball || '');
  }

  getBallLabel(ball: any): string {
    if (ball && ball.fullLabel) {
      return ball.fullLabel;
    }

    return this.getBallDisplay(ball);
  }

  getBallKind(ball: any): string {
    if (ball && ball.kind) {
      return ball.kind;
    }

    return 'other';
  }

  private getCurrentBallMeta(ball: string | null | undefined): {
    kind: string;
    display: string;
    fullLabel: string;
    freeHit: boolean;
  } {
    if (!ball) {
      return {
        kind: 'other',
        display: '',
        fullLabel: '',
        freeHit: false
      };
    }

    const raw = String(ball).trim();
    const lower = raw.toLowerCase();

    if (lower === 'b' || lower === 'ball start') {
      return {
        kind: 'ballstart',
        display: '●',
        fullLabel: 'Ball Start',
        freeHit: false
      };
    }

    if (lower === 'o' || lower === 'over') {
      return {
        kind: 'over',
        display: 'End',
        fullLabel: 'End of Over',
        freeHit: false
      };
    }

    if (lower === 'wd' || lower === 'wide') {
      return {
        kind: 'wide',
        display: 'Wd',
        fullLabel: 'Wide',
        freeHit: false
      };
    }

    if (lower === 'nb' || lower === 'no ball') {
      return {
        kind: 'noball',
        display: 'NB',
        fullLabel: 'No Ball',
        freeHit: false
      };
    }

    if (lower === 'fh' || lower === 'free hit') {
      return {
        kind: 'freehit',
        display: 'FH',
        fullLabel: 'Free Hit',
        freeHit: true
      };
    }

    if (lower === 'bc' || lower === 'boundary check') {
      return {
        kind: 'check',
        display: '?',
        fullLabel: 'Boundary Check',
        freeHit: false
      };
    }

    if (lower === 'ba' || lower === 'ball in air') {
      return {
        kind: 'air',
        display: '↑',
        fullLabel: 'Ball In Air',
        freeHit: false
      };
    }

    const recentBall = getRecentBallDisplay(raw);
    if (recentBall.raw) {
      return {
        kind: this.mapCurrentBallKind(raw, recentBall.kind),
        display: recentBall.kind === 'wicket' ? recentBall.fullLabel : recentBall.display,
        fullLabel: recentBall.fullLabel || recentBall.display,
        freeHit: false
      };
    }

    return {
      kind: 'other',
      display: raw,
      fullLabel: raw,
      freeHit: false
    };
  }

  private mapCurrentBallKind(raw: string, kind: string): string {
    if (kind !== 'extra') {
      return kind;
    }

    const lower = raw.toLowerCase();
    if (lower.indexOf('lb') !== -1) {
      return 'legbye';
    }
    if (lower.indexOf('wd') !== -1 || lower === 'wide') {
      return 'wide';
    }
    if (lower.indexOf('nb') !== -1 || lower === 'no ball') {
      return 'noball';
    }
    if (/^b\d+$/.test(lower) || /^\d+b$/.test(lower)) {
      return 'bye';
    }

    return 'other';
  }

  getCurrentBallKind(ball: string | null | undefined): string {
    return this.getCurrentBallMeta(ball).kind || 'other';
  }

  isCurrentBallImpact(ball: string | null | undefined): boolean {
    const kind = this.getCurrentBallMeta(ball).kind;
    return kind === 'six' || kind === 'four' || kind === 'wicket';
  }

  isCurrentBallFreeHit(ball: string | null | undefined): boolean {
    return this.getCurrentBallMeta(ball).freeHit;
  }

  getCurrentBallDisplay(ball: string | null | undefined): string {
    return this.getCurrentBallMeta(ball).display;
  }

  getCurrentBallLabel(ball: string | null | undefined): string {
    return this.getCurrentBallMeta(ball).fullLabel;
  }

  getResultSummary(view: LiveHeroViewModel | null): string | null {
    return getLiveHeroResultSummary(view, this.matchInfo);
  }

  shouldShowChaseSummary(view: LiveHeroViewModel | null): boolean {
    return shouldShowLiveHeroChase(view, this.matchInfo);
  }

  statusLabel(view: LiveHeroViewModel | null): string {
    return getLiveHeroStatusLabel(view, this.matchInfo);
  }

  statusKey(view: LiveHeroViewModel | null): string | null {
    return getLiveHeroStatusKey(view, this.matchInfo);
  }
}
