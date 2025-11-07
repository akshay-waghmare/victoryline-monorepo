/**
 * Match Card Component
 * Purpose: Display match information with live updates and animations
 * Created: 2025-11-06
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { MatchCardViewModel, ScoreInfo } from '../../models/match-card.models';
import { getStatusDisplayText, getStatusColor, isLiveMatch, calculateStaleness, formatTimeDisplay } from '../../models/match-status';
import { AnimationService } from '../../../../core/services/animation.service';

/**
 * Score update event data
 */
export interface ScoreUpdateEvent {
  matchId: string;
  team: 'team1' | 'team2';
  previousScore: ScoreInfo | null;
  newScore: ScoreInfo;
  timestamp: Date;
}

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.css'],
  animations: [
    // Score update animation
    trigger('scoreUpdate', [
      transition('* => updated', [
        style({ transform: 'scale(1)', opacity: 1 }),
        animate('300ms ease-out', style({ transform: 'scale(1.15)', opacity: 0.8 })),
        animate('200ms ease-in', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),
    
    // Pulse animation for live indicator
    trigger('pulse', [
      transition('* => *', [
        animate('1500ms ease-in-out')
      ])
    ])
  ]
})
export class MatchCardComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  // ===== INPUTS =====
  
  /**
   * Match data to display
   */
  @Input() match!: MatchCardViewModel;
  
  /**
   * Enable animations (default: true)
   */
  @Input() enableAnimations: boolean = true;
  
  /**
   * Card layout variant
   */
  @Input() variant: 'default' | 'compact' | 'detailed' = 'default';
  
  /**
   * Show match details button
   */
  @Input() showDetailsButton: boolean = true;
  
  /**
   * Maximum height for card (for scrollable containers)
   */
  @Input() maxHeight?: string;
  
  // ===== OUTPUTS =====
  
  /**
   * Emitted when user clicks the card
   */
  @Output() cardClick = new EventEmitter<string>();
  
  /**
   * Emitted when user clicks "View Details" button
   */
  @Output() detailsClick = new EventEmitter<string>();
  
  /**
   * Emitted when score updates (for analytics)
   */
  @Output() scoreUpdated = new EventEmitter<ScoreUpdateEvent>();
  
  /**
   * Emitted when user swipes left on the card (mobile gesture)
   */
  @Output() swipeLeft = new EventEmitter<string>();

  /**
   * Emitted when user swipes right on the card (mobile gesture)
   */
  @Output() swipeRight = new EventEmitter<string>();
  
  /**
   * Emitted when card enters/leaves viewport (for lazy loading)
   */
  @Output() visibilityChange = new EventEmitter<boolean>();
  
  // ===== COMPONENT STATE =====
  
  isHovered: boolean = false;
  isAnimating: boolean = false;
  isInViewport: boolean = false;
  previousMatch: MatchCardViewModel | null = null;
  
  // Animation state tracking
  team1ScoreState: string = 'idle';
  team2ScoreState: string = 'idle';
  
  // Intersection Observer for lazy loading
  private intersectionObserver: IntersectionObserver | null = null;
  // Cleanup
  // Element reference
  @ViewChild('cardElement') cardElement?: ElementRef<HTMLDivElement>;
  
  constructor(
    private animationService: AnimationService
  ) {}
  
  ngOnInit(): void {
    // Initialize previous match data for change detection
    if (this.match) {
      this.previousMatch = { ...this.match };
    }

  }
  
  ngAfterViewInit(): void {
    // Set up IntersectionObserver for visibility tracking
    if ('IntersectionObserver' in window && this.cardElement) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            this.isInViewport = entry.isIntersecting;
            this.visibilityChange.emit(this.isInViewport);
          });
        },
        { threshold: 0.1 } // 10% of card visible
      );
      
      this.intersectionObserver.observe(this.cardElement.nativeElement);
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Detect score changes and trigger animations
    if (changes['match'] && !changes['match'].firstChange) {
      const previousMatch = changes['match'].previousValue as MatchCardViewModel;
      const currentMatch = changes['match'].currentValue as MatchCardViewModel;
      
      // Check team1 score change
      if (this.hasScoreChanged(previousMatch.team1.score, currentMatch.team1.score)) {
        this.onScoreUpdate('team1', previousMatch.team1.score, currentMatch.team1.score);
      }
      
      // Check team2 score change
      if (this.hasScoreChanged(previousMatch.team2.score, currentMatch.team2.score)) {
        this.onScoreUpdate('team2', previousMatch.team2.score, currentMatch.team2.score);
      }
      
      this.previousMatch = { ...currentMatch };
    }
  }
  
  ngOnDestroy(): void {
    // Cleanup
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
  
  // ===== PUBLIC METHODS =====
  
  /**
   * Manually trigger score update animation
   */
  public triggerScoreAnimation(team: 'team1' | 'team2'): void {
    if (!this.enableAnimations || this.animationService.prefersReducedMotion()) {
      return;
    }
    
    const elementId = `${this.match.id}-${team}-score`;
    
    if (this.animationService.isAnimating(elementId)) {
      // Animation already running, skip
      return;
    }
    
    // Update animation state
    if (team === 'team1') {
      this.team1ScoreState = 'updated';
      setTimeout(() => this.team1ScoreState = 'idle', 500);
    } else {
      this.team2ScoreState = 'updated';
      setTimeout(() => this.team2ScoreState = 'idle', 500);
    }
    
    // Register animation with service
    this.animationService.startAnimation(elementId, 500);
  }
  
  /**
   * Refresh card data (useful for polling)
   */
  public refresh(): void {
    // Force change detection by creating new object reference
    this.match = { ...this.match };
  }
  
  /**
   * Highlight card temporarily
   */
  public highlight(duration: number = 2000): void {
    // Implementation would add a temporary highlight class
    // For now, just emit the highlight state
  }
  
  /**
   * Check if card is currently in viewport
   */
  public isVisible(): boolean {
    return this.isInViewport;
  }
  
  // ===== TEMPLATE HELPER METHODS =====
  
  getStatusDisplayText(): string {
    return getStatusDisplayText(this.match.status);
  }
  
  getStatusColor(): string {
    return getStatusColor(this.match.status);
  }
  
  getStaleness(): 'fresh' | 'warning' | 'error' {
    return calculateStaleness(this.match.lastUpdated);
  }
  
  getTimeDisplay(): string {
    return formatTimeDisplay(this.match.startTime);
  }
  
  isMatchLive(): boolean {
    return isLiveMatch(this.match.status);
  }

  // ===== EVENT HANDLERS =====
  
  onCardClick(): void {
    this.cardClick.emit(this.match.id);
  }
  
  onDetailsClick(event: Event): void {
    event.stopPropagation(); // Prevent card click
    this.detailsClick.emit(this.match.id);
  }
  
  onMouseEnter(): void {
    this.isHovered = true;
  }
  
  onMouseLeave(): void {
    this.isHovered = false;
  }
  
  @HostListener('swipeleft', ['$event'])
  onSwipeLeft(event: any): void {
    if (event) {
      event.preventDefault();
    }
    this.swipeLeft.emit(this.match.id);
  }

  @HostListener('swiperight', ['$event'])
  onSwipeRight(event: any): void {
    if (event) {
      event.preventDefault();
    }
    this.swipeRight.emit(this.match.id);
  }
  
  // ===== PRIVATE METHODS =====
  
  private hasScoreChanged(previous: ScoreInfo | null, current: ScoreInfo | null): boolean {
    if (!previous && !current) return false;
    if (!previous || !current) return true;
    
    return previous.runs !== current.runs || 
           previous.wickets !== current.wickets ||
           previous.overs !== current.overs;
  }
  
  private onScoreUpdate(team: 'team1' | 'team2', previousScore: ScoreInfo | null, newScore: ScoreInfo): void {
    // Trigger animation
    this.triggerScoreAnimation(team);
    
    // Emit score update event
    this.scoreUpdated.emit({
      matchId: this.match.id,
      team,
      previousScore,
      newScore,
      timestamp: new Date()
    });
  }
}
