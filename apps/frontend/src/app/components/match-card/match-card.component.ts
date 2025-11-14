import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatchCardViewModel } from '../../features/matches/models/match-card.models';

/**
 * MobileMatchCardComponent
 *
 * Mobile-first match card with compact layout for home page.
 * This is a simplified, performance-optimized version for mobile devices.
 *
 * Features:
 * - Touch-optimized with 44x44px minimum tap targets
 * - Lazy-loaded team logos with fallback to abbreviations
 * - Live match status indicator
 * - Ripple effect on tap
 * - WCAG AA compliant
 *
 * Usage:
 * ```html
 * <app-mobile-match-card
 *   [match]="match"
 *   [layout]="'compact'"
 *   [showStatus]="true"
 *   (cardClick)="navigateToMatch($event)">
 * </app-mobile-match-card>
 * ```
 */
@Component({
  selector: 'app-mobile-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchCardComponent {
  /**
   * Match data to display
   * @required
   */
  @Input() match!: MatchCardViewModel;

  /**
   * Card layout variant
   * @default 'compact'
   */
  @Input() layout: 'compact' | 'expanded' = 'compact';

  /**
   * Show LIVE/upcoming status indicator
   * @default true
   */
  @Input() showStatus = true;

  /**
   * Enable card click interaction
   * @default true
   */
  @Input() clickable = true;

  /**
   * Emits match ID when card is clicked
   */
  @Output() cardClick = new EventEmitter<string>();

  /**
   * Handle card click
   */
  onCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit(this.match.id);
    }
  }

  /**
   * Handle keyboard navigation (Enter/Space)
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick();
    }
  }

  /**
   * Get status badge class
   */
  getStatusClass(): string {
    return `status-${this.match.status.toLowerCase()}`;
  }

  /**
   * Get status label
   */
  getStatusLabel(): string {
    return this.match.displayStatus || this.match.status;
  }

  /**
   * Get ARIA label for accessibility
   */
  getAriaLabel(): string {
    const status = this.getStatusLabel();
    const team1 = this.match.team1.name;
    const team2 = this.match.team2.name;

    if (this.match.isLive && this.match.team1.score && this.match.team2.score) {
      return `${status} match: ${team1} ${this.match.team1.score.displayText} vs ${team2} ${this.match.team2.score.displayText}. Tap to view details.`;
    } else {
      return `${status} match: ${team1} vs ${team2}. Tap to view details.`;
    }
  }

  /**
   * Format date/time for display
   */
  getMatchDateTime(): string {
    return this.match.timeDisplay || this.match.startTime.toLocaleString();
  }

  /**
   * Generate srcset for team logo (T030)
   * Provides 1x, 2x, 3x resolution images for responsive display
   * @param logoUrl - Base logo URL
   * @returns srcset string for responsive images
   */
  getLogoSrcset(logoUrl: string): string {
    if (!logoUrl) {
      return '';
    }

    // Extract base path and extension
    const lastDot = logoUrl.lastIndexOf('.');
    const basePath = lastDot > 0 ? logoUrl.substring(0, lastDot) : logoUrl;
    const extension = lastDot > 0 ? logoUrl.substring(lastDot) : '.png';

    // Generate srcset: base.png 1x, base@2x.png 2x, base@3x.png 3x
    return `${logoUrl} 1x, ${basePath}@2x${extension} 2x, ${basePath}@3x${extension} 3x`;
  }
}
