/**
 * Matches List Page Component
 * Purpose: Display all cricket matches in a grid with filtering and search
 * Created: 2025-11-06
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';
import { MatchesService } from '../../services/matches.service';
import { extractSlugFromUrl } from '../../../../core/utils/match-utils';
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

@Component({
  selector: 'app-matches-list',
  templateUrl: './matches-list.component.html',
  styleUrls: ['./matches-list.component.css']
})
export class MatchesListComponent implements OnInit, OnDestroy {
  private static readonly SWIPE_DISTANCE_PX = 72;
  private readonly swipeableStatuses: Array<MatchStatus | 'all'> = [
    'all',
    MatchStatus.LIVE,
    MatchStatus.UPCOMING,
    MatchStatus.COMPLETED
  ];
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private suppressNavigationUntil = 0;

  // Match data
  allMatches: MatchCardViewModel[] = [];
  filteredMatches: MatchCardViewModel[] = [];
  upcomingMatchGroups: { label: string; matches: MatchCardViewModel[] }[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Filter state
  selectedStatus: MatchStatus | 'all' = 'all';
  searchQuery = '';
  
  // Tab navigation configuration
  filterTabs: Tab[] = [
    { id: 'all', label: 'All Matches', icon: 'view_list', count: 0 },
    { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: 0 },
    { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: 0 },
    { id: MatchStatus.COMPLETED, label: 'Completed', icon: 'check_circle', count: 0 }
  ];
  
  // Expose MatchStatus enum to template
  MatchStatus = MatchStatus;
  
  // Unsubscribe subject
  private destroy$ = new Subject<void>();
  
  constructor(
    private matchesService: MatchesService, 
    private router: Router,
    private titleService: Title  // T044: Inject Angular Title service
  ) {}
  
  ngOnInit(): void {
    // T044: Set page title for matches list page
    this.titleService.setTitle('Cricket Matches | Live, Upcoming & Completed | Crickzen');
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
    if (this.selectedStatus !== 'all') {
      matches = filterMatchesByStatus(matches, this.selectedStatus);
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      matches = searchMatches(matches, this.searchQuery.trim());
    }
    
    this.filteredMatches = matches;
    this.upcomingMatchGroups = this.selectedStatus === MatchStatus.UPCOMING
      ? this.buildUpcomingGroups(matches)
      : [];
  }
  
  /**
   * Update tab counts based on current matches
   */
  updateTabCounts(): void {
    this.filterTabs = [
      { id: 'all', label: 'All Matches', icon: 'view_list', count: this.allMatches.length },
      { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: this.liveMatchesCount },
      { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: this.upcomingMatchesCount },
      { id: MatchStatus.COMPLETED, label: 'Completed', icon: 'check_circle', count: this.completedMatchesCount }
    ];
  }
  
  /**
   * Handle tab change from tab-nav component
   */
  onTabChange(tabId: string): void {
    this.selectedStatus = tabId as MatchStatus | 'all';
    this.applyFilters();
  }
  
  /**
   * Handle status filter change
   */
  onStatusFilterChange(status: MatchStatus | 'all'): void {
    this.selectedStatus = status;
    this.applyFilters();
  }
  
  /**
   * Handle search query change
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
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
      this.router.navigate(['/cric-live', slug], {
        queryParams: { url: match.matchUrl || '' }
      });
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
      this.router.navigate(['/cric-live', slug], {
        queryParams: { url: match.matchUrl || '' }
      });
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
    // Prefer explicit matchUrl if present
    const url = match.matchUrl;
    var slug = url ? extractSlugFromUrl(url) : null;
    if (slug) return slug;
    // Fallback: if id looks like a slug (contains dashes), use it
    if (match.id && match.id.indexOf('-') !== -1) {
      return match.id;
    }
    return null;
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
  getMatchCount(status: MatchStatus | 'all'): number {
    if (status === 'all') {
      return this.allMatches.length;
    }
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
}
