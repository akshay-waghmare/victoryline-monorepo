import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
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

  readonly state$: Observable<LiveHeroState> = this.heroState.state$;
  readonly view$: Observable<LiveHeroViewModel | null> = this.heroState.view$;

  constructor(private readonly heroState: LiveHeroStateService) {}

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
