/**
 * Matches List Page Component
 * Purpose: Display all cricket matches in a grid with filtering and search
 * Created: 2025-11-06
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';
import { MatchesService } from '../../services/matches.service';
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, extractSlugFromUrl } from '../../../../core/utils/match-utils';
import { formatCalendarDate } from '../../models/match-status';
import { 
  sortMatchesByPriority, 
  filterMatchesByStatus, 
  searchMatches, 
  filterLiveMatches, 
  filterUpcomingMatches, 
  filterCompletedMatches 
} from '../../../../core/utils/match-utils';
import { Tab } from '../../../../shared/components/tab-nav/tab-nav.component';
import { MetaTagsService } from '../../../../seo/meta-tags.service';

@Component({
  selector: 'app-matches-list',
  templateUrl: './matches-list.component.html',
  styleUrls: ['./matches-list.component.css']
})
export class MatchesListComponent implements OnInit, OnDestroy {
  private static readonly SWIPE_DISTANCE_PX = 72;
  private readonly swipeableStatuses: MatchStatus[] = [
    MatchStatus.LIVE,
    MatchStatus.UPCOMING,
    MatchStatus.COMPLETED
  ];
  private readonly pageSizeByStatus: { [key: string]: number } = {
    [MatchStatus.LIVE]: 12,
    [MatchStatus.UPCOMING]: 24,
    [MatchStatus.COMPLETED]: 24
  };
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private suppressNavigationUntil = 0;
  private hasInitializedStatus = false;
  private visibleMatchCount = this.pageSizeByStatus[MatchStatus.LIVE];

  // Match data
  allMatches: MatchCardViewModel[] = [];
  filteredMatches: MatchCardViewModel[] = [];
  visibleMatches: MatchCardViewModel[] = [];
  upcomingMatchGroups: { label: string; matches: MatchCardViewModel[] }[] = [];
  crawlableMatches: MatchCardViewModel[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Filter state
  selectedStatus: MatchStatus = MatchStatus.LIVE;
  searchQuery = '';
  
  // Tab navigation configuration
  filterTabs: Tab[] = [
    { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: 0 },
    { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: 0 },
    { id: MatchStatus.COMPLETED, label: 'Results', icon: 'check_circle', count: 0 }
  ];
  
  // Expose MatchStatus enum to template
  MatchStatus = MatchStatus;
  
  // Unsubscribe subject
  private destroy$ = new Subject<void>();
  
  constructor(
    private matchesService: MatchesService,
    private router: Router,
    private metaTagsService: MetaTagsService
  ) {}

  ngOnInit(): void {
    this.metaTagsService.setPageMeta('/matches', {
      title: 'Cricket Matches | Live, Upcoming & Completed | Crickzen',
      description: 'Browse live, upcoming, and recently completed cricket matches with direct links to scores, commentary, scorecards, and match updates.',
      canonicalUrl: 'https://www.crickzen.com/matches',
      robots: 'index,follow'
    });
    this.loadMatches();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load matches from service with auto-refresh every 30 seconds
   */
  loadMatches(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.matchesService.getLiveMatchesWithAutoRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (matches) => {
          this.allMatches = sortMatchesByPriority(matches);
          if (!this.hasInitializedStatus) {
            this.selectedStatus = this.getDefaultStatus();
            this.resetVisibleMatchCount();
            this.hasInitializedStatus = true;
          }
          this.updateTabCounts();
          this.applyFilters();
          this.isLoading = false;
          console.log('Matches auto-refreshed:', matches.length);
        },
        (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load matches. Please try again later.';
          this.isLoading = false;
          console.error('Error loading matches:', error);
        }
      );
  }
  
  /**
   * Apply filters and search to matches
   */
  applyFilters(): void {
    let matches = [...this.allMatches];
    
    // Apply status filter
    if (this.selectedStatus === MatchStatus.UPCOMING) {
      matches = filterUpcomingMatches(matches);
    } else {
      matches = filterMatchesByStatus(matches, this.selectedStatus);
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      matches = searchMatches(matches, this.searchQuery.trim());
    }
    
    this.filteredMatches = matches;
    this.visibleMatches = matches.slice(0, this.visibleMatchCount);
    this.upcomingMatchGroups = this.selectedStatus === MatchStatus.UPCOMING
      ? this.buildUpcomingGroups(this.visibleMatches)
      : [];
    this.crawlableMatches = this.visibleMatches.filter(match => !!buildCanonicalMatchPath(match)).slice(0, 48);
  }
  
  /**
   * Update tab counts based on current matches
   */
  updateTabCounts(): void {
    this.filterTabs = [
      { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: this.liveMatchesCount },
      { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: this.upcomingMatchesCount },
      { id: MatchStatus.COMPLETED, label: 'Results', icon: 'check_circle', count: this.completedMatchesCount }
    ];
  }
  
  /**
   * Handle tab change from tab-nav component
   */
  onTabChange(tabId: string): void {
    this.selectedStatus = tabId as MatchStatus;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle status filter change
   */
  onStatusFilterChange(status: MatchStatus): void {
    this.selectedStatus = status;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle search query change
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle match card click
   */
  onMatchClick(match: MatchCardViewModel): void {
    if (Date.now() < this.suppressNavigationUntil) {
      return;
    }

    // Navigate to match details page (cric-live/:path)
    const slug = this.getMatchSlug(match);
    if (slug) {
      this.router.navigate(['/cric-live', slug], { state: { match: match } });
    } else {
      console.warn('Unable to derive match slug for navigation', match);
    }
  }
  
  /**
   * Handle details button click
   */
  onDetailsClick(match: MatchCardViewModel): void {
    // Navigate to match details page (cric-live/:path)
    const slug = this.getMatchSlug(match);
    if (slug) {
      this.router.navigate(['/cric-live', slug], { state: { match: match } });
    } else {
      console.warn('Unable to derive match slug for navigation', match);
    }
  }

  onResultsTouchStart(event: TouchEvent): void {
    if (!this.isSwipeGestureTarget(event.target)) {
      this.resetSwipeTracking();
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      return;
    }

    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;
  }

  onResultsTouchEnd(event: TouchEvent): void {
    if (this.swipeStartX === null || this.swipeStartY === null) {
      return;
    }

    const changedTouch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;

    if (!changedTouch) {
      this.resetSwipeTracking();
      return;
    }

    const deltaX = changedTouch.clientX - this.swipeStartX;
    const deltaY = changedTouch.clientY - this.swipeStartY;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (horizontalDistance >= MatchesListComponent.SWIPE_DISTANCE_PX && horizontalDistance > verticalDistance * 1.15) {
      this.suppressNavigationUntil = Date.now() + 400;
      this.shiftSelectedStatus(deltaX < 0 ? 1 : -1);
    }

    this.resetSwipeTracking();
  }

  /**
   * Derive the match slug used by the cric-live/:path route from the full match URL or data
   * Expects a crex.com URL ending with '/<slug>/live'. Falls back to match.id if it's already a slug.
   */
  private getMatchSlug(match: MatchCardViewModel): string | null {
    var path = buildCanonicalMatchPath(match);
    if (path) {
      return path.replace(/^\/cric-live\//, '');
    }

    const url = match.matchUrl;
    return url ? extractSlugFromUrl(url) : null;
  }
  
  /**
   * Refresh matches
   */
  onRefresh(): void {
    this.loadMatches();
  }
  
  /**
   * Get count of matches by status
   */
  getMatchCount(status: MatchStatus): number {
    return filterMatchesByStatus(this.allMatches, status).length;
  }
  
  /**
   * Get live matches count
   */
  get liveMatchesCount(): number {
    return filterLiveMatches(this.allMatches).length;
  }
  
  /**
   * Get upcoming matches count
   */
  get upcomingMatchesCount(): number {
    return filterUpcomingMatches(this.allMatches).length;
  }
  
  /**
   * Get completed matches count
   */
  get completedMatchesCount(): number {
    return filterCompletedMatches(this.allMatches).length;
  }
  
  /**
   * TrackBy function for ngFor optimization
   */
  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  getMatchHref(match: MatchCardViewModel): string {
    return buildCanonicalMatchPath(match) || '/matches';
  }

  getMatchLinkLabel(match: MatchCardViewModel): string {
    return buildCanonicalMatchLinkLabel(match);
  }

  getEmptyStateMessage(): string {
    if (this.searchQuery) {
      return 'No matches found';
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'No upcoming matches scheduled';
      case MatchStatus.COMPLETED:
        return 'No recent completed matches';
      case MatchStatus.LIVE:
        return 'No live matches right now';
      default:
        return 'No matches found';
    }
  }

  getEmptyStateHint(): string {
    if (this.searchQuery) {
      return 'Try adjusting your search';
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Check back later for new fixtures';
      case MatchStatus.COMPLETED:
        return 'Completed matches will appear here after results are synced';
      case MatchStatus.LIVE:
        return 'Upcoming and completed matches are available in the other tabs';
      default:
        return 'Check back later for updates';
    }
  }

  getSelectedStatusTitle(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Upcoming fixtures';
      case MatchStatus.COMPLETED:
        return 'Recent results';
      case MatchStatus.LIVE:
        return 'Live matches';
      default:
        return 'Matches';
    }
  }

  getStatusDescription(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Fixture timing, venue context, and quick entry into each match centre.';
      case MatchStatus.COMPLETED:
        return 'Finished matches with scorelines and the full scorecard path kept close.';
      case MatchStatus.LIVE:
        return 'Live scorecards, commentary, lineups, and match detail tabs in one place.';
      default:
        return 'Live scores, fixtures, and results.';
    }
  }

  getResultSummaryCopy(): string {
    const shownCount = this.visibleMatches.length;
    const totalCount = this.filteredMatches.length;

    if (this.searchQuery.trim()) {
      return `${shownCount} of ${totalCount} matches shown for "${this.searchQuery.trim()}".`;
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return `${shownCount} of ${totalCount} fixtures visible, grouped by match day.`;
      case MatchStatus.COMPLETED:
        return `${shownCount} of ${totalCount} results visible, newest first.`;
      case MatchStatus.LIVE:
        return `${shownCount} of ${totalCount} live matches visible.`;
      default:
        return `${shownCount} of ${totalCount} matches visible.`;
    }
  }

  isUpcomingGroupedView(): boolean {
    return this.selectedStatus === MatchStatus.UPCOMING && this.upcomingMatchGroups.length > 0;
  }

  private shiftSelectedStatus(direction: 1 | -1): void {
    const currentIndex = this.swipeableStatuses.indexOf(this.selectedStatus);
    const nextIndex = Math.max(0, Math.min(this.swipeableStatuses.length - 1, currentIndex + direction));

    if (nextIndex === currentIndex) {
      return;
    }

    this.selectedStatus = this.swipeableStatuses[nextIndex];
    this.resetVisibleMatchCount();
    this.applyFilters();
  }

  private isSwipeGestureTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element) {
      return false;
    }

    return !element.closest('input, button, a');
  }

  private resetSwipeTracking(): void {
    this.swipeStartX = null;
    this.swipeStartY = null;
  }

  private buildUpcomingGroups(matches: MatchCardViewModel[]): { label: string; matches: MatchCardViewModel[] }[] {
    const groups: { [key: string]: { label: string; matches: MatchCardViewModel[] } } = {};

    matches.forEach(match => {
      const startTime = match.startTime;
      const key = isNaN(startTime.getTime())
        ? 'Scheduled'
        : `${startTime.getFullYear()}-${startTime.getMonth()}-${startTime.getDate()}`;

      if (!groups[key]) {
        groups[key] = {
          label: key === 'Scheduled' ? 'Scheduled' : formatCalendarDate(startTime),
          matches: []
        };
      }

      groups[key].matches.push(match);
    });

    return Object.keys(groups).map(key => groups[key]);
  }

  get canLoadMore(): boolean {
    return this.visibleMatches.length < this.filteredMatches.length;
  }

  onLoadMore(): void {
    this.visibleMatchCount += this.getPageSize(this.selectedStatus);
    this.applyFilters();
  }

  get loadMoreLabel(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Show more upcoming matches';
      case MatchStatus.COMPLETED:
        return 'Show more results';
      default:
        return 'Show more live matches';
    }
  }

  private getDefaultStatus(): MatchStatus {
    if (this.liveMatchesCount > 0) {
      return MatchStatus.LIVE;
    }
    if (this.upcomingMatchesCount > 0) {
      return MatchStatus.UPCOMING;
    }
    return MatchStatus.COMPLETED;
  }

  private resetVisibleMatchCount(): void {
    this.visibleMatchCount = this.getPageSize(this.selectedStatus);
  }

  private getPageSize(status: MatchStatus): number {
    return this.pageSizeByStatus[status] || 24;
  }
}
