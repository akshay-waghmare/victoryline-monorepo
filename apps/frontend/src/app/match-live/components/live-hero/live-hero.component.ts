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

  private normalizeBallCode(ball: string | null | undefined): string {
    if (!ball) return '';
    const v = String(ball).trim().toLowerCase();
    if (v === 'b' || v === 'ball start') return 'ballstart';
    if (v === 'o' || v === 'over') return 'over';
    if (v === 'wd' || v === 'wide') return 'wide';
    if (v === 'nb' || v === 'no ball') return 'noball';
    if (v === 'fh' || v === 'free hit') return 'freehit';
    // All ^N codes and their translated strings → wicket
    if (v.startsWith('^') ||
        v === 'w' || v === 'wicket' ||
        v === 'bowled' || v === 'caught out' || v === 'caught and bowled' || v === 'caughtandbowled' ||
        v === 'run out' || v === 'stumped' || v === 'lbw' || v === 'hit wicket') return 'wicket';
    if (v === 'bc' || v === 'boundary check') return 'check';
    if (v === 'ba' || v === 'ball in air') return 'air';
    // Bye: b1, 1b, b2, 2b … (runs may come before or after the 'b')
    if (/^b\d+$/.test(v) || /^\d+b$/.test(v)) return 'bye';
    // Leg bye: lb1, 1lb …
    if (/^lb\d+$/.test(v) || /^\d+lb$/.test(v)) return 'legbye';
    if (v === '6') return 'six';
    if (v === '4') return 'four';
    if (v === '0' || v === '.') return 'dot';
    return 'run';
  }

  getCurrentBallKind(ball: string | null | undefined): string {
    return this.normalizeBallCode(ball) || 'other';
  }

  isCurrentBallImpact(ball: string | null | undefined): boolean {
    const code = this.normalizeBallCode(ball);
    return code === 'six' || code === 'four' || code === 'wicket';
  }

  isCurrentBallFreeHit(ball: string | null | undefined): boolean {
    return this.normalizeBallCode(ball) === 'freehit';
  }

  getCurrentBallDisplay(ball: string | null | undefined): string {
    if (!ball) return '';
    const raw = String(ball).trim();
    switch (this.normalizeBallCode(ball)) {
      case 'ballstart': return '●';
      case 'over':      return 'End';
      case 'wide':      return 'Wd';
      case 'noball':    return 'NB';
      case 'freehit':   return 'FH';
      case 'wicket':    return 'W';
      case 'check':     return '?';
      case 'air':       return '↑';
      case 'bye': {
        const n = raw.replace(/[^0-9]/g, '');
        return n ? `B${n}` : 'By';
      }
      case 'legbye': {
        const n = raw.replace(/[^0-9]/g, '');
        return n ? `LB${n}` : 'LB';
      }
      default: return raw;
    }
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
