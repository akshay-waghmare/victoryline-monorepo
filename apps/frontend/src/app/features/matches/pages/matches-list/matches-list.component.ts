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
import { extractSlugFromUrl } from '../../../../core/utils/match-utils';
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
  // Match data
  allMatches: MatchCardViewModel[] = [];
  filteredMatches: MatchCardViewModel[] = [];
  completedMatches: MatchCardViewModel[] = []; // Feature 008-completed-matches (US1)
  
  // Loading states
  isLoading = true;
  isLoadingCompleted = false; // Feature 008-completed-matches (US1 - T026)
  hasError = false;
  errorMessage = '';
  hasCompletedError = false; // Feature 008-completed-matches (US1 - T027)
  completedErrorMessage = ''; // Feature 008-completed-matches (US1 - T027)
  
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
  
  constructor(private matchesService: MatchesService, private router: Router) {}
  
  ngOnInit(): void {
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
   * Load completed matches from API
   * Feature: 008-completed-matches (US1 - T024)
   */
  loadCompletedMatches(): void {
    this.isLoadingCompleted = true;
    this.hasCompletedError = false;
    
    this.matchesService.getCompletedMatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (matches) => {
          this.completedMatches = matches;
          this.updateTabCounts();
          this.isLoadingCompleted = false;
          console.log('Completed matches loaded:', matches.length);
        },
        (error) => {
          this.hasCompletedError = true;
          this.completedErrorMessage = 'Unable to load completed matches. Tap to retry';
          this.isLoadingCompleted = false;
          console.error('Error loading completed matches:', error);
        }
      );
  }
  
  /**
   * Retry loading completed matches
   * Feature: 008-completed-matches (US1 - T028)
   */
  retryLoadCompletedMatches(): void {
    this.loadCompletedMatches();
  }
  
  /**
   * Apply filters and search to matches
   */
  applyFilters(): void {
    // Feature 008-completed-matches (US1): Use completed matches when tab is selected
    let matches = this.selectedStatus === MatchStatus.COMPLETED 
      ? [...this.completedMatches] 
      : [...this.allMatches];
    
    // Apply status filter
    if (this.selectedStatus !== 'all' && this.selectedStatus !== MatchStatus.COMPLETED) {
      matches = filterMatchesByStatus(matches, this.selectedStatus);
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      matches = searchMatches(matches, this.searchQuery.trim());
    }
    
    this.filteredMatches = matches;
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
    
    // Feature 008-completed-matches (US1 - T025: Wire Completed tab click)
    if (tabId === MatchStatus.COMPLETED && this.completedMatches.length === 0) {
      this.loadCompletedMatches();
    }
    
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
    // Navigate to match details page (cric-live/:path)
    const slug = this.getMatchSlug(match);
    if (slug) {
      this.router.navigate(['/cric-live', slug]);
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
      this.router.navigate(['/cric-live', slug]);
    } else {
      console.warn('Unable to derive match slug for navigation', match);
    }
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
   * Feature: 008-completed-matches (US1 - Updated for actual completed matches)
   */
  get completedMatchesCount(): number {
    return this.completedMatches.length;
  }
  
  /**
   * TrackBy function for ngFor optimization
   */
  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }
}
