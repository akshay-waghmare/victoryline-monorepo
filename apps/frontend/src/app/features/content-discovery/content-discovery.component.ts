import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DiscoveryFilterService, MatchFilter } from './discovery-filter.service';
import { MatchCardViewModel } from '../matches/models/match-card.models';
import { MatchHistoryService } from './match-history.service';
import { RecommendationService } from './recommendation.service';
import { AnalyticsService } from './analytics.service';
import { OfflineCacheService } from './offline-cache.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-content-discovery',
  templateUrl: './content-discovery.component.html',
  styleUrls: ['./content-discovery.component.css'],
  changeDetection: ChangeDetectionStrategy.Default, // Keep Default for WebSocket updates
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ContentDiscoveryComponent implements OnInit {
  filters: MatchFilter = { type: 'all', league: null, dateRange: null };
  matches: MatchCardViewModel[] = [];
  recentlyViewed: MatchCardViewModel[] = [];
  recommended: MatchCardViewModel[] = [];
  loading = false;
  showRecentSection = true;
  showRecommendedSection = true;
  isOnline = true;
  usingCachedData = false;
  error: string | null = null;
  canRetry = false;

  constructor(
    private discoveryService: DiscoveryFilterService,
    private historyService: MatchHistoryService,
    private recommendationService: RecommendationService,
    private analytics: AnalyticsService,
    private offlineCache: OfflineCacheService,
    private networkStatus: NetworkStatusService,
    private router: Router
  ) {
    // Monitor network status
    this.networkStatus.online$.subscribe(online => {
      this.isOnline = online;
      if (online && this.usingCachedData) {
        // Refresh data when coming back online
        this.loadInitial();
      }
    });
  }

  ngOnInit() {
    this.loadInitial();
    this.loadRecentlyViewed();
  }

  loadInitial() {
    this.loading = true;
    this.usingCachedData = false;
    this.error = null;
    this.canRetry = false;

    // Try to load from network first
    this.discoveryService.getInitialMatches().then(result => {
      this.matches = result;
      this.loading = false;
      this.error = null;
      
      // Cache the results for offline use
      if (this.isOnline) {
        this.offlineCache.cacheSearchResults('initial', this.filters, result).subscribe();
      }
      
      // Generate recommendations based on all matches
      this.loadRecommendations(result);
    }).catch(error => {
      console.error('Failed to load matches from network:', error);
      
      // Fall back to cached data if offline
      if (!this.isOnline) {
        this.loadFromCache('initial');
      } else {
        this.loading = false;
        this.error = 'Failed to load matches. Please try again.';
        this.canRetry = true;
      }
    });
  }

  /**
   * Retry loading data after an error
   */
  retry() {
    if (this.canRetry) {
      this.loadInitial();
    }
  }

  loadRecentlyViewed() {
    this.recentlyViewed = this.historyService.getRecentlyViewed(5);
  }

  loadRecommendations(allMatches: MatchCardViewModel[]) {
    this.recommended = this.recommendationService.getRecommendations(allMatches, 5);
  }

  /**
   * Load data from offline cache when network is unavailable
   */
  private loadFromCache(query: string) {
    this.offlineCache.getCachedSearchResults(query, this.filters).subscribe(cachedResults => {
      if (cachedResults && cachedResults.length > 0) {
        this.matches = cachedResults;
        this.usingCachedData = true;
        this.loadRecommendations(cachedResults);
        console.log('Loaded matches from offline cache');
      }
      this.loading = false;
    });
  }

  applyFilters() {
    this.loading = true;
    this.usingCachedData = false;

    this.discoveryService.filterMatches(this.filters).then(result => {
      this.matches = result;
      this.loading = false;
      
      // Cache filtered results
      if (this.isOnline) {
        this.offlineCache.cacheSearchResults('filter', this.filters, result).subscribe();
      }
      
      // Track filter change
      this.analytics.trackFilterChange(
        'type',
        this.filters.type || 'all',
        result.length
      );
    }).catch(error => {
      console.error('Failed to apply filters:', error);
      
      // Fall back to cached data if offline
      if (!this.isOnline) {
        this.loadFromCache('filter');
      } else {
        this.loading = false;
      }
    });
  }

  onSearch(query: string) {
    if (!query || query.length < 2) { return; }
    this.loading = true;
    this.usingCachedData = false;

    this.discoveryService.search(query).then(result => {
      this.matches = result;
      this.loading = false;
      
      // Cache search results
      if (this.isOnline) {
        this.offlineCache.cacheSearchResults(query, this.filters, result).subscribe();
      }
      
      // Track search
      this.analytics.trackSearch(query, result.length);
    }).catch(error => {
      console.error('Failed to search:', error);
      
      // Fall back to cached data if offline
      if (!this.isOnline) {
        this.loadFromCache(query);
      } else {
        this.loading = false;
      }
    });
  }

  onSuggestionSelected(item: MatchCardViewModel) {
    // When user selects an autocomplete suggestion, show that match
    this.matches = [item];
    // Record the view
    this.historyService.recordView(item);
    this.loadRecentlyViewed();
    
    // Track autocomplete selection
    const matchTitle = `${item.team1 ? item.team1.name : ''} vs ${item.team2 ? item.team2.name : ''}`;
    this.analytics.trackAutocompleteSelection(item.id, matchTitle, 0);
  }

  onMatchClick(match: MatchCardViewModel, source: 'all_matches' | 'recently_viewed' | 'recommended' = 'all_matches', position?: number) {
    // Record view in history
    this.historyService.recordView(match);
    
    // Track the click based on source
    const matchTitle = `${match.team1 ? match.team1.name : ''} vs ${match.team2 ? match.team2.name : ''}`;
    if (source === 'recently_viewed' && position !== undefined) {
      this.analytics.trackRecentlyViewedClick(match.id, matchTitle, position);
    } else if (source === 'recommended' && position !== undefined) {
      this.analytics.trackRecommendationClick(match.id, matchTitle, position);
    } else {
      this.analytics.trackMatchClick(match.id, matchTitle, 'all_matches');
    }
    
    // Navigate to match details
    if (match.matchUrl) {
      // Extract slug from URL for routing
      const urlParts = match.matchUrl.split('/');
      const slug = urlParts[urlParts.length - 2]; // Get slug before '/live'
      this.router.navigate(['/cric-live', slug]);
    }
  }

  clearHistory() {
    if (confirm('Clear all viewing history?')) {
      const itemCount = this.recentlyViewed.length;
      this.historyService.clearHistory();
      this.loadRecentlyViewed();
      
      // Track history clear
      this.analytics.trackHistoryClear(itemCount);
    }
  }

  /**
   * TrackBy function for *ngFor performance optimization
   * Angular will only re-render items that have changed
   */
  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id || index.toString();
  }
}
