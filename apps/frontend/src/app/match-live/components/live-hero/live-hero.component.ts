import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges, HostListener } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { LiveHeroConfig, LiveHeroState, LiveHeroViewModel, StalenessTier } from '../../services/live-hero.models';
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

  trackBall(_: number, ball: string): string {
    return ball;
  }
}
