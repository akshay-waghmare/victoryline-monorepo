import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MatchesService } from '../matches/services/matches.service';
import { MatchCardViewModel, MatchStatus } from '../matches/models/match-card.models';

export interface MatchFilter {
  type: 'all' | 'live' | 'upcoming' | 'completed';
  league?: string | null;
  dateRange?: { from: string; to: string } | null;
}

@Injectable({ providedIn: 'root' })
export class DiscoveryFilterService {
  private cachedMatches: MatchCardViewModel[] = [];
  private lastFetchTime: number = 0;
  private CACHE_TTL = 30000; // 30 seconds cache (matches auto-refresh interval)

  constructor(private matchesService: MatchesService) {}

  getInitialMatches(): Promise<MatchCardViewModel[]> {
    return this.fetchMatches();
  }

  private fetchMatches(): Promise<MatchCardViewModel[]> {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (this.cachedMatches.length > 0 && (now - this.lastFetchTime) < this.CACHE_TTL) {
      return Promise.resolve(this.cachedMatches);
    }

    // Fetch live matches from MatchesService
    return this.matchesService.getLiveMatches().pipe(
      map((matches: MatchCardViewModel[]) => {
        this.cachedMatches = matches;
        this.lastFetchTime = now;
        return matches;
      }),
      catchError(error => {
        console.error('Error fetching matches:', error);
        return Promise.resolve([]);
      })
    ).toPromise();
  }

  filterMatches(filter: MatchFilter): Promise<MatchCardViewModel[]> {
    return this.fetchMatches().then(matches => {
      return matches.filter(m => {
        // Filter by type (all/live/upcoming/completed)
        if (filter.type && filter.type !== 'all') {
          if (filter.type === 'live') {
            if (m.status !== MatchStatus.LIVE && m.status !== MatchStatus.INNINGS_BREAK) {
              return false;
            }
          } else if (filter.type === 'upcoming') {
            if (m.status !== MatchStatus.UPCOMING) {
              return false;
            }
          } else if (filter.type === 'completed') {
            if (m.status !== MatchStatus.COMPLETED) {
              return false;
            }
          }
        }

        // Filter by league/tournament (venue field contains tournament info)
        if (filter.league && filter.league.length > 0) {
          const venueLower = (m.venue || '').toLowerCase();
          const leagueLower = filter.league.toLowerCase();
          if (!venueLower.includes(leagueLower)) {
            return false;
          }
        }

        // Date range filtering (future enhancement)
        // if (filter.dateRange) { ... }

        return true;
      });
    });
  }

  search(query: string): Promise<MatchCardViewModel[]> {
    const q = (query || '').toLowerCase();
    return this.fetchMatches().then(matches => {
      return matches.filter(m => {
        const team1Name = (m.team1?.name || '').toLowerCase();
        const team2Name = (m.team2?.name || '').toLowerCase();
        const venue = (m.venue || '').toLowerCase();
        
        return team1Name.includes(q) || 
               team2Name.includes(q) || 
               venue.includes(q);
      });
    });
  }

  // New method for autocomplete suggestions with cached results
  private cachedSuggestions = new Map<string, MatchCardViewModel[]>();

  searchWithSuggestions(query: string): Promise<MatchCardViewModel[]> {
    const q = (query || '').toLowerCase();
    
    // Check cache first
    if (this.cachedSuggestions.has(q)) {
      return Promise.resolve(this.cachedSuggestions.get(q)!);
    }

    // Search matches
    return this.search(query).then(results => {
      const topResults = results.slice(0, 5); // Limit to top 5 suggestions
      
      // Cache the result
      this.cachedSuggestions.set(q, topResults);
      
      // Clear cache after 5 minutes to avoid stale data
      setTimeout(() => this.cachedSuggestions.delete(q), 5 * 60 * 1000);
      
      return topResults;
    });
  }
}
