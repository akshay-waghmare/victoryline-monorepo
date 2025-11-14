import { Injectable } from '@angular/core';

export interface MatchFilter {
  type: 'all' | 'live' | 'upcoming' | 'completed';
  league?: string | null;
  dateRange?: { from: string; to: string } | null;
}

@Injectable({ providedIn: 'root' })
export class DiscoveryFilterService {
  // Stubbed dataset for initial development. Replace with MatchesService integration.
  private STUB_MATCHES = [
    { id: 'm1', title: 'Ind vs Aus', status: 'live', league: 'IPL', startsAt: '2025-11-14T09:00:00Z' },
    { id: 'm2', title: 'Eng vs NZ', status: 'upcoming', league: 'Test', startsAt: '2025-11-16T09:00:00Z' },
    { id: 'm3', title: 'SL vs PAK', status: 'completed', league: 'ODI', startsAt: '2025-11-12T09:00:00Z' }
  ];

  constructor() {}

  getInitialMatches(): Promise<any[]> {
    // Simulate async fetch
    return new Promise(resolve => setTimeout(() => resolve(this.STUB_MATCHES.slice()), 200));
  }

  filterMatches(filter: MatchFilter): Promise<any[]> {
    return new Promise(resolve => {
      const result = this.STUB_MATCHES.filter(m => {
        if (filter.type && filter.type !== 'all') {
          if (filter.type === 'live' && m.status !== 'live') { return false; }
          if (filter.type === 'upcoming' && m.status !== 'upcoming') { return false; }
          if (filter.type === 'completed' && m.status !== 'completed') { return false; }
        }
        if (filter.league && filter.league.length > 0 && m.league !== filter.league) { return false; }
        // dateRange handling omitted for stub
        return true;
      });
      setTimeout(() => resolve(result), 150);
    });
  }

  search(query: string): Promise<any[]> {
    const q = (query || '').toLowerCase();
    return new Promise(resolve => setTimeout(() => resolve(this.STUB_MATCHES.filter(m => m.title.toLowerCase().includes(q))), 120));
  }

  // New method for autocomplete suggestions with cached results
  private cachedSuggestions = new Map<string, any[]>();

  searchWithSuggestions(query: string): Promise<any[]> {
    const q = (query || '').toLowerCase();
    
    // Check cache first
    if (this.cachedSuggestions.has(q)) {
      return Promise.resolve(this.cachedSuggestions.get(q)!);
    }

    // Simulate async search with suggestions
    return new Promise(resolve => {
      const results = this.STUB_MATCHES.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.league && m.league.toLowerCase().includes(q))
      ).slice(0, 5); // Limit to top 5 suggestions
      
      // Cache the result
      this.cachedSuggestions.set(q, results);
      
      // Clear cache after 5 minutes to avoid stale data
      setTimeout(() => this.cachedSuggestions.delete(q), 5 * 60 * 1000);
      
      setTimeout(() => resolve(results), 120);
    });
  }
}
