import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { LiveHeroViewModel } from '../../services/live-hero.models';

@Component({
  selector: 'app-hero-condensed',
  templateUrl: './hero-condensed.component.html',
  styleUrls: ['./hero-condensed.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroCondensedComponent {
  @Input() view!: LiveHeroViewModel;
  @Input() matchInfo?: any;

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
        return 'Stale';
      default:
        return null;
    }
  }
}
