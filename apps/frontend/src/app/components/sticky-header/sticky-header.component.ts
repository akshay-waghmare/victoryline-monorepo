import { Component, Input, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

/**
 * Team interface for sticky header display
 */
export interface Team {
  name: string;
  shortName: string;
  logoUrl?: string;
}

/**
 * Score interface for sticky header display
 */
export interface CurrentScore {
  homeScore: string;
  awayScore: string;
  overs?: string;
}

/**
 * StickyHeaderComponent
 * 
 * Compact sticky header for match details page that appears on scroll.
 * Displays team names, current score, overs, and match status in a minimal layout.
 * 
 * Features:
 * - Sticky positioning after scroll threshold (default 200px)
 * - Slide-in animation from top
 * - Compact layout optimized for mobile
 * - Live status indicator
 * - Touch-friendly design
 * - WCAG AA compliant
 * 
 * Usage:
 * ```html
 * <app-sticky-header
 *   [homeTeam]="match.homeTeam"
 *   [awayTeam]="match.awayTeam"
 *   [currentScore]="match.score"
 *   [status]="match.status"
 *   [scrollThreshold]="150">
 * </app-sticky-header>
 * ```
 */
@Component({
  selector: 'app-sticky-header',
  templateUrl: './sticky-header.component.html',
  styleUrls: ['./sticky-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StickyHeaderComponent implements OnInit, OnDestroy {
  /**
   * Home team information
   * @required
   */
  @Input() homeTeam!: Team;
  
  /**
   * Away team information
   * @required
   */
  @Input() awayTeam!: Team;
  
  /**
   * Current match score
   * @required
   */
  @Input() currentScore!: CurrentScore;
  
  /**
   * Match status
   * @required
   */
  @Input() status!: 'live' | 'completed' | 'upcoming';
  
  /**
   * Scroll threshold (px) before header becomes sticky
   * @default 200
   */
  @Input() scrollThreshold: number = 200;
  
  /**
   * Whether the header is currently in sticky state
   */
  isSticky: boolean = false;
  
  /**
   * Throttle timer for scroll listener
   */
  private scrollThrottle: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initial check in case page is already scrolled
    this.checkStickyState();
  }

  ngOnDestroy(): void {
    // Clean up throttle timer
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
  }

  /**
   * Listen to window scroll events with throttling for performance
   * Updates sticky state when scroll position crosses threshold
   */
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Throttle scroll events to 16ms (~60fps)
    if (!this.scrollThrottle) {
      this.scrollThrottle = setTimeout(() => {
        this.checkStickyState();
        this.scrollThrottle = null;
      }, 16);
    }
  }

  /**
   * Check if scroll position has crossed the threshold
   * Updates isSticky state and triggers change detection
   */
  private checkStickyState(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const newStickyState = scrollPosition > this.scrollThreshold;
    
    if (this.isSticky !== newStickyState) {
      this.isSticky = newStickyState;
      this.cdr.markForCheck();
    }
  }

  /**
   * Get status label for display
   */
  getStatusLabel(): string {
    switch (this.status) {
      case 'live':
        return 'LIVE';
      case 'completed':
        return 'COMPLETED';
      case 'upcoming':
        return 'UPCOMING';
      default:
        return '';
    }
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(): string {
    return `status-badge status-badge--${this.status}`;
  }

  /**
   * Check if match is currently live
   */
  isLive(): boolean {
    return this.status === 'live';
  }

  /**
   * Get ARIA label for accessibility
   */
  getAriaLabel(): string {
    if (this.isLive()) {
      return `Live match: ${this.homeTeam.name} ${this.currentScore.homeScore} vs ${this.awayTeam.name} ${this.currentScore.awayScore}`;
    } else {
      return `${this.getStatusLabel()} match: ${this.homeTeam.name} vs ${this.awayTeam.name}`;
    }
  }
}
