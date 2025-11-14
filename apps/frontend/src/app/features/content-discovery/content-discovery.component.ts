import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DiscoveryFilterService, MatchFilter } from './discovery-filter.service';
import { MatchCardViewModel } from '../matches/models/match-card.models';
import { MatchHistoryService } from './match-history.service';
import { RecommendationService } from './recommendation.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-content-discovery',
  templateUrl: './content-discovery.component.html',
  styleUrls: ['./content-discovery.component.css'],
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
    }).catch(() => this.loading = false);
  }

  onSearch(query: string) {
    if (!query || query.length < 2) { return; }
    this.loading = true;
    this.discoveryService.search(query).then(result => {
      this.matches = result;
      this.loading = false;
    }).catch(() => this.loading = false);
  }

  onSuggestionSelected(item: MatchCardViewModel) {
    // When user selects an autocomplete suggestion, show that match
    this.matches = [item];
    // Record the view
    this.historyService.recordView(item);
    this.loadRecentlyViewed();
  }

  onMatchClick(match: MatchCardViewModel) {
    // Record view in history
    this.historyService.recordView(match);
    
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
      this.historyService.clearHistory();
      this.loadRecentlyViewed();
    }
  }
}
