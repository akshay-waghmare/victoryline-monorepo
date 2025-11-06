/**
 * Matches List Page Component
 * Purpose: Display all cricket matches in a grid with filtering and search
 * Created: 2025-11-06
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';
import { MatchesService } from '../../services/matches.service';
import { 
  sortMatchesByPriority, 
  filterMatchesByStatus, 
  searchMatches, 
  filterLiveMatches, 
  filterUpcomingMatches, 
  filterCompletedMatches 
} from '../../../../core/utils/match-utils';

@Component({
  selector: 'app-matches-list',
  templateUrl: './matches-list.component.html',
  styleUrls: ['./matches-list.component.css']
})
export class MatchesListComponent implements OnInit, OnDestroy {
  // Match data
  allMatches: MatchCardViewModel[] = [];
  filteredMatches: MatchCardViewModel[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Filter state
  selectedStatus: MatchStatus | 'all' = 'all';
  searchQuery = '';
  
  // Expose MatchStatus enum to template
  MatchStatus = MatchStatus;
  
  // Unsubscribe subject
  private destroy$ = new Subject<void>();
  
  constructor(private matchesService: MatchesService) {}
  
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
    // Navigate to match details page
    // TODO: Implement navigation when match details page is ready
    console.log('Match clicked:', match);
  }
  
  /**
   * Handle details button click
   */
  onDetailsClick(match: MatchCardViewModel): void {
    // Navigate to match details page
    // TODO: Implement navigation when match details page is ready
    console.log('Details clicked:', match);
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
}
