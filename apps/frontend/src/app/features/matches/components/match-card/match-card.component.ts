/**
 * Match Card Component
 * Purpose: Display match information with live updates and animations
 * Created: 2025-11-06
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { MatchCardViewModel, MatchStatus, ScoreInfo, TeamInfo } from '../../models/match-card.models';
import { getStatusDisplayText, getStatusColor, isLiveMatch, calculateStaleness, formatTimeDisplay, formatAbsoluteTime, formatCalendarDate } from '../../models/match-status';
import { AnimationService } from '../../../../core/services/animation.service';
import { buildCanonicalMatchPath, getMatchResultSummary } from '../../../../core/utils/match-utils';

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
  private static readonly SWIPE_DISTANCE_PX = 48;
  private static readonly TAP_CANCEL_DISTANCE_PX = 10;

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

  /**
   * Enable touch swipe gesture handling on the card itself
   */
  @Input() enableSwipeGesture: boolean = false;
  
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
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private touchCurrentX: number = 0;
  private touchCurrentY: number = 0;
  private hasTouchMoved: boolean = false;
  private suppressNextClick: boolean = false;
  
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

  private static readonly TEAM_COLORS = [
    '#1565C0', '#2E7D32', '#C62828', '#E65100', '#6A1B9A',
    '#00838F', '#AD1457', '#283593', '#4E342E', '#37474F',
    '#558B2F', '#F9A825', '#0277BD', '#BF360C', '#4527A0'
  ];

  getTeamColor(team: TeamInfo): string {
    const name = (this.getResolvedShortName(team) || team.name || '').toUpperCase();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return MatchCardComponent.TEAM_COLORS[Math.abs(hash) % MatchCardComponent.TEAM_COLORS.length];
  }

  getTeamInitials(team: TeamInfo): string {
    return this.getResolvedShortName(team);
  }

  getTeamDisplayName(team: TeamInfo): string {
    if (this.variant === 'compact' && this.isUpcomingMatch()) {
      return team.name || this.getResolvedShortName(team) || '';
    }

    if (this.variant === 'compact' && this.isMatchLive()) {
      return team.name || this.getResolvedShortName(team) || '';
    }

    if (this.variant === 'compact') {
      return this.getResolvedShortName(team) || team.name || '';
    }

    if (this.isUpcomingMatch()) {
      return team.name || this.getResolvedShortName(team) || '';
    }

    return this.getResolvedShortName(team) || team.name || '';
  }
  
  getStatusDisplayText(): string {
    return getStatusDisplayText(this.match.status);
  }
  
  getStatusColor(): string {
    return getStatusColor(this.match.status);
  }

  getStatusTextColor(): string {
    switch (this.match.status) {
      case MatchStatus.LIVE:
      case MatchStatus.INNINGS_BREAK:
        return '#0f172a';
      case MatchStatus.UPCOMING:
      case MatchStatus.COMPLETED:
      case MatchStatus.RAIN_DELAY:
      case MatchStatus.ABANDONED:
      default:
        return '#ffffff';
    }
  }
  
  getStaleness(): 'fresh' | 'warning' | 'error' {
    return calculateStaleness(this.match.lastUpdated);
  }
  
  getTimeDisplay(): string {
    if (this.isUpcomingMatch()) {
      return formatAbsoluteTime(this.match.startTime);
    }
    return formatTimeDisplay(this.match.startTime);
  }

  getUpcomingDateDisplay(): string {
    return formatCalendarDate(this.match.startTime);
  }
  
  isMatchLive(): boolean {
    return isLiveMatch(this.match.status);
  }

  isUpcomingMatch(): boolean {
    return this.match.status === MatchStatus.UPCOMING;
  }

  isCompletedMatch(): boolean {
    return this.match.status === MatchStatus.COMPLETED || this.match.status === MatchStatus.ABANDONED;
  }

  getSeriesLabel(): string {
    const cleanedSeries = this.getCleanSeriesLabel();

    if (this.isUpcomingMatch() && cleanedSeries && /\b\d{1,2}:\d{2}\s*[AP]M\b/i.test(cleanedSeries)) {
      return '';
    }

    const format = this.match.matchFormat || '';
    const shouldAppendFormat = !!format && cleanedSeries.toLowerCase().indexOf(format.toLowerCase()) === -1;
    const parts = [cleanedSeries, shouldAppendFormat ? format : ''].filter(Boolean);
    return parts.join(' • ');
  }

  hasSeriesLabel(): boolean {
    return this.getSeriesLabel().trim().length > 0;
  }

  getCardHeadline(): string {
    const parsed = this.parseFixtureSeries(this.match.seriesName || '');
    if (parsed) {
      return [this.shouldShowFixtureStartTime() ? parsed.time : '', parsed.fixtureLabel].filter(Boolean).join(' ');
    }

    if (this.shouldShowFixtureStartTime() && this.match.startTime) {
      const teamLabel = this.getFullFixtureLabel();
      const timeLabel = this.getScheduledStartTimeLabel();
      return [timeLabel, teamLabel].filter(Boolean).join(' ');
    }

    return '';
  }

  hasCardHeadline(): boolean {
    return this.getCardHeadline().trim().length > 0;
  }

  getResultSummary(): string {
    return getMatchResultSummary(this.match);
  }

  hasResultSummary(): boolean {
    return this.getResultSummary().trim().length > 0;
  }

  shouldShowResultSummary(): boolean {
    if (!this.hasResultSummary()) {
      return false;
    }

    if (this.variant === 'compact' && !this.isCompletedMatch() && !this.isMatchLive()) {
      return false;
    }

    return true;
  }

  getCompactStateLabel(): string {
    if (!this.isMatchLive() || this.getStaleness() === 'fresh') {
      return '';
    }

    return this.getStaleness() === 'warning' ? 'Delayed' : 'Stale';
  }

  hasMeaningfulVenue(): boolean {
    const venue = this.getVenueLabel();
    if (!venue || /venue tbd/i.test(venue)) {
      return false;
    }

    if (this.isLikelyMatchMeta(venue)) {
      return false;
    }

    const normalizedVenue = this.normalizeMetaValue(venue);
    const normalizedSeries = this.normalizeMetaValue(this.getSeriesLabel());
    const normalizedSeriesName = this.normalizeMetaValue(this.match.seriesName || '');

    return normalizedVenue !== normalizedSeries && normalizedVenue !== normalizedSeriesName;
  }

  getVenueLabel(): string {
    return this.cleanSeriesName(this.match.venue || '');
  }

  shouldShowCompactTime(): boolean {
    return !this.isUpcomingMatch() && !this.isMatchLive();
  }

  shouldShowNoScore(team: TeamInfo): boolean {
    if (this.isUpcomingMatch() || !!team.score) {
      return false;
    }

    if (this.isMatchLive()) {
      return false;
    }

    return true;
  }

  formatOvers(overs: number | null | undefined): string {
    const value = Number(overs);
    if (!isFinite(value) || value < 0) {
      return '';
    }
    // Scores store cricket notation (6.2 = six overs and two balls), not a
    // decimal run-rate. Preserve the completed-over `.0` on cards as well.
    return value.toFixed(1);
  }

  // ===== EVENT HANDLERS =====
  
  getMatchHref(): string {
    return buildCanonicalMatchPath(this.match) || '/matches';
  }

  onCardClick(event?: MouseEvent): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      if (event) {
        event.preventDefault();
      }
      return;
    }

    if (event) {
      const isModifiedClick = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0;
      if (!isModifiedClick) {
        event.preventDefault();
      }
    }

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

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.enableSwipeGesture) {
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      return;
    }

    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchCurrentX = this.touchStartX;
    this.touchCurrentY = this.touchStartY;
    this.hasTouchMoved = false;
    this.suppressNextClick = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.enableSwipeGesture) {
      return;
    }

    if (this.touchStartX === null || this.touchStartY === null || !event.touches || event.touches.length !== 1) {
      return;
    }

    this.touchCurrentX = event.touches[0].clientX;
    this.touchCurrentY = event.touches[0].clientY;
    this.hasTouchMoved =
      Math.abs(this.touchCurrentX - this.touchStartX) > MatchCardComponent.TAP_CANCEL_DISTANCE_PX ||
      Math.abs(this.touchCurrentY - this.touchStartY) > MatchCardComponent.TAP_CANCEL_DISTANCE_PX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.enableSwipeGesture) {
      return;
    }

    const movement = this.getTouchMovement(event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null);

    if (!movement) {
      return;
    }

    const horizontalDistance = Math.abs(movement.deltaX);
    const verticalDistance = Math.abs(movement.deltaY);

    if (horizontalDistance >= MatchCardComponent.SWIPE_DISTANCE_PX && horizontalDistance > verticalDistance) {
      this.suppressNextClick = true;

      if (movement.deltaX < 0) {
        this.emitSwipe('left', event);
      } else {
        this.emitSwipe('right', event);
      }
    } else if (this.hasTouchMoved) {
      this.suppressNextClick = true;
    }

    this.resetTouchTracking();
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    if (!this.enableSwipeGesture) {
      return;
    }

    this.suppressNextClick = true;
    this.resetTouchTracking();
  }
  
  // ===== PRIVATE METHODS =====

  private emitSwipe(direction: 'left' | 'right', event?: Event): void {
    if (event && event.cancelable) {
      event.preventDefault();
    }

    if (direction === 'left') {
      this.swipeLeft.emit(this.match.id);
      return;
    }

    this.swipeRight.emit(this.match.id);
  }

  private getTouchMovement(touch: Touch | null): { deltaX: number; deltaY: number } | null {
    if (this.touchStartX === null || this.touchStartY === null) {
      return null;
    }

    const endX = touch ? touch.clientX : this.touchCurrentX;
    const endY = touch ? touch.clientY : this.touchCurrentY;

    return {
      deltaX: endX - this.touchStartX,
      deltaY: endY - this.touchStartY
    };
  }

  private resetTouchTracking(): void {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.hasTouchMoved = false;
  }
  
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

  private cleanSeriesName(seriesName: string): string {
    const parsed = this.parseFixtureSeries(seriesName);
    if (parsed) {
      return parsed.meta;
    }

    return seriesName
      .replace(/\bmatch updates\b.*$/i, '')
      .replace(/\s+\b[A-Z0-9]{3,5}\b$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private getCleanSeriesLabel(): string {
    const parsed = this.parseFixtureSeries(this.match.seriesName || '');
    if (parsed) {
      return parsed.meta;
    }

    const series = this.cleanSeriesName(this.match.seriesName || '');
    const venue = this.getVenueLabel();

    const fallback = venue && this.isLikelyMatchMeta(venue) ? venue : series;
    return this.isMatchLive() ? this.stripScheduledTime(fallback) : fallback;
  }

  private getFullFixtureLabel(): string {
    const team1 = this.match.team1 && this.match.team1.name ? this.match.team1.name : this.getResolvedShortName(this.match.team1);
    const team2 = this.match.team2 && this.match.team2.name ? this.match.team2.name : this.getResolvedShortName(this.match.team2);
    return [team1, team2].filter(Boolean).join(' vs ');
  }

  private getScheduledStartTimeLabel(): string {
    if (!this.match.startTime) {
      return '';
    }

    const value = formatAbsoluteTime(this.match.startTime);
    return /^\d{1,2}:\d{2}\s*[AP]M$/i.test(value) ? value : '';
  }

  private shouldShowFixtureStartTime(): boolean {
    return !this.isMatchLive();
  }

  private parseFixtureSeries(seriesName: string): { time: string; matchOrdinal: string; format: string; league: string; meta: string; fixtureLabel: string } | null {
    const raw = (seriesName || '').replace(/\s+/g, ' ').trim();
    if (!raw) {
      return null;
    }

    const pattern = /^(.+?)\s+(\d{1,2}:\d{2}\s*[AP]M)\s+(\d+(?:st|nd|rd|th))\s*([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?),\s*(.+)$/i;
    const match = raw.match(pattern);
    if (!match) {
      return null;
    }

    const leadingTeam = match[1].trim();
    const tail = this.splitFixtureTail(match[5]);
    const trailingTeam = tail.trailingTeam;
    const matchOrdinal = match[3].trim();
    const format = this.formatMatchType(match[4]);
    const league = tail.league;

    return {
      time: match[2].trim().toUpperCase(),
      matchOrdinal,
      format,
      league,
      meta: matchOrdinal + ' ' + format + ', ' + league,
      fixtureLabel: leadingTeam + ' vs ' + trailingTeam
    };
  }

  private splitFixtureTail(value: string): { league: string; trailingTeam: string } {
    const tail = (value || '').replace(/\s+/g, ' ').trim();
    const team2Name = this.match && this.match.team2 ? this.match.team2.name : '';
    const team2ShortName = this.match && this.match.team2 ? this.getResolvedShortName(this.match.team2) : '';
    const candidates = [team2Name, team2ShortName]
      .map(candidate => (candidate || '').replace(/\s+/g, ' ').trim())
      .filter(candidate => candidate.length > 1);

    for (const candidate of candidates) {
      const suffixPattern = new RegExp('\\s+' + this.escapeRegExp(candidate) + '$', 'i');
      if (suffixPattern.test(tail)) {
        const league = tail.replace(suffixPattern, '').trim();
        if (league) {
          return { league, trailingTeam: candidate };
        }
      }
    }

    const parts = tail.split(' ');
    if (parts.length >= 3) {
      return {
        league: parts.slice(0, -2).join(' '),
        trailingTeam: parts.slice(-2).join(' ')
      };
    }

    return { league: tail, trailingTeam: team2Name || team2ShortName || tail };
  }

  private isLikelyMatchMeta(value: string): boolean {
    return /^\d+(st|nd|rd|th)\s+/i.test(value) || /\b(t20|odi|test|one day)\b/i.test(value);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private stripScheduledTime(value: string): string {
    return (value || '')
      .replace(/\b\d{1,2}:\d{2}\s*[AP]M\b/ig, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private formatMatchType(value: string): string {
    const cleaned = (value || '').replace(/\s+/g, ' ').trim();
    if (/^t20i$/i.test(cleaned)) {
      return 'T20I';
    }
    if (/^t20$/i.test(cleaned)) {
      return 'T20';
    }
    if (/^odi$/i.test(cleaned)) {
      return 'ODI';
    }
    return cleaned
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private getResolvedShortName(team: TeamInfo): string {
    const derived = this.deriveTeamInitials(team.name || '');
    const candidate = (team.shortName || '').trim().toUpperCase();

    if (!candidate) {
      return derived;
    }

    if (!derived) {
      return candidate.slice(0, 4);
    }

    if (candidate === derived) {
      return candidate;
    }

    const normalizedCandidate = candidate.replace(/[^A-Z0-9]/g, '');
    const normalizedDerived = derived.replace(/[^A-Z0-9]/g, '');

    if (normalizedCandidate.length < 2 || normalizedCandidate.length > 4) {
      return derived;
    }

    if (this.isLikelyMismatchedShortName(normalizedCandidate, normalizedDerived)) {
      return derived;
    }

    return candidate;
  }

  private deriveTeamInitials(teamName: string): string {
    const parts = (teamName || '')
      .split(/[\s/-]+/)
      .map(part => part.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean);

    if (parts.length === 0) {
      return 'TBD';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 3).toUpperCase();
    }

    return parts
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  private isLikelyMismatchedShortName(candidate: string, derived: string): boolean {
    if (candidate === derived) {
      return false;
    }

    if (derived.indexOf(candidate) === 0 && candidate.length >= derived.length - 1) {
      return false;
    }

    if (candidate.indexOf(derived) === 0) {
      return false;
    }

    return true;
  }

  private normalizeMetaValue(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
