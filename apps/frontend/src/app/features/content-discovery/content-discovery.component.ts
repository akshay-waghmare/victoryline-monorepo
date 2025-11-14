import { Component, OnInit } from '@angular/core';
import { DiscoveryFilterService, MatchFilter } from './discovery-filter.service';

@Component({
  selector: 'app-content-discovery',
  templateUrl: './content-discovery.component.html',
  styleUrls: ['./content-discovery.component.css']
})
export class ContentDiscoveryComponent implements OnInit {
  filters: MatchFilter = { type: 'all', league: null, dateRange: null };
  matches: any[] = [];
  loading = false;

  constructor(private discoveryService: DiscoveryFilterService) {}

  ngOnInit() {
    this.loadInitial();
  }

  loadInitial() {
    this.loading = true;
    // Use the discovery service to fetch initial matches (stubbed)
    this.discoveryService.getInitialMatches().then(result => {
      this.matches = result;
      this.loading = false;
    }).catch(() => this.loading = false);
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

  onSuggestionSelected(item: any) {
    // When user selects an autocomplete suggestion, show that match
    this.matches = [item];
    // In a real app, navigate to match details or show full info
  }
}
