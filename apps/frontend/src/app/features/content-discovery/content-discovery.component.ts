import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DiscoveryFilterService, MatchFilter } from './discovery-filter.service';
import { MatchCardViewModel } from '../matches/models/match-card.models';
import { MatchHistoryService } from './match-history.service';
import { RecommendationService } from './recommendation.service';
import { AnalyticsService } from './analytics.service';
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

  constructor(
    private discoveryService: DiscoveryFilterService,
    private historyService: MatchHistoryService,
    private recommendationService: RecommendationService,
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadInitial();
    this.loadRecentlyViewed();
  }

  loadInitial() {
    this.loading = true;
    // Use the discovery service to fetch initial matches (now using real MatchesService data)
    this.discoveryService.getInitialMatches().then(result => {
      this.matches = result;
      this.loading = false;
      
      // Generate recommendations based on all matches
      this.loadRecommendations(result);
    }).catch(() => this.loading = false);
  }

  loadRecentlyViewed() {
    this.recentlyViewed = this.historyService.getRecentlyViewed(5);
  }

  loadRecommendations(allMatches: MatchCardViewModel[]) {
    this.recommended = this.recommendationService.getRecommendations(allMatches, 5);
  }

  applyFilters() {
    this.loading = true;
    this.discoveryService.filterMatches(this.filters).then(result => {
      this.matches = result;
      this.loading = false;
      
      // Track filter change
      this.analytics.trackFilterChange(
        'type',
        this.filters.type || 'all',
        result.length
      );
    }).catch(() => this.loading = false);
  }

  onSearch(query: string) {
    if (!query || query.length < 2) { return; }
    this.loading = true;
    this.discoveryService.search(query).then(result => {
      this.matches = result;
      this.loading = false;
      
      // Track search
      this.analytics.trackSearch(query, result.length);
    }).catch(() => this.loading = false);
  }

  onSuggestionSelected(item: MatchCardViewModel) {
    // When user selects an autocomplete suggestion, show that match
    this.matches = [item];
    // Record the view
    this.historyService.recordView(item);
    this.loadRecentlyViewed();
    
    // Track autocomplete selection
    const matchTitle = `${item.team1?.name} vs ${item.team2?.name}`;
    this.analytics.trackAutocompleteSelection(item.id, matchTitle, 0);
  }

  onMatchClick(match: MatchCardViewModel, source: 'all_matches' | 'recently_viewed' | 'recommended' = 'all_matches', position?: number) {
    // Record view in history
    this.historyService.recordView(match);
    
    // Track the click based on source
    const matchTitle = `${match.team1?.name} vs ${match.team2?.name}`;
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
