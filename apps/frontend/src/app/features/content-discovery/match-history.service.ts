import { Injectable } from '@angular/core';
import { MatchCardViewModel } from '../matches/models/match-card.models';

interface MatchHistoryItem {
  matchId: string;
  viewedAt: Date;
  matchData: MatchCardViewModel;
}

@Injectable({ providedIn: 'root' })
export class MatchHistoryService {
  private readonly STORAGE_KEY = 'crickzen_match_history';
  private readonly MAX_HISTORY_ITEMS = 20;

  constructor() {}

  /**
   * Record that a user viewed a match
   */
  recordView(match: MatchCardViewModel): void {
    const history = this.getHistory();

    // Remove existing entry for this match if any
    const filtered = history.filter(item => item.matchId !== match.id);

    // Add new entry at the beginning
    const newEntry: MatchHistoryItem = {
      matchId: match.id,
      viewedAt: new Date(),
      matchData: match
    };

    filtered.unshift(newEntry);

    // Keep only the most recent MAX_HISTORY_ITEMS
    const trimmed = filtered.slice(0, this.MAX_HISTORY_ITEMS);

    this.saveHistory(trimmed);
  }

  /**
   * Get recently viewed matches
   */
  getRecentlyViewed(limit: number = 10): MatchCardViewModel[] {
    const history = this.getHistory();
    return history
      .slice(0, limit)
      .map(item => item.matchData);
  }

  /**
   * Get full history with timestamps
   */
  getHistoryWithTimestamps(limit: number = 20): MatchHistoryItem[] {
    return this.getHistory().slice(0, limit);
  }

  /**
   * Check if a match was viewed
   */
  wasViewed(matchId: string): boolean {
    const history = this.getHistory();
    return history.some(item => item.matchId === matchId);
  }

  /**
   * Get timestamp of last view for a match
   */
  getLastViewTime(matchId: string): Date | null {
    const history = this.getHistory();
    const item = history.find(h => h.matchId === matchId);
    return item ? new Date(item.viewedAt) : null;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear match history:', error);
    }
  }

  /**
   * Get unique team names from history (for personalization)
   */
  getFavoriteTeams(): string[] {
    const history = this.getHistory();
    const teamCounts = new Map<string, number>();

    history.forEach(item => {
      const team1 = item.matchData.team1 ? .name  ;
      const team2 = item.matchData.team2 ? .name  ;

      if (team1) {
        teamCounts.set(team1, (teamCounts.get(team1) || 0) + 1);
      }
      if (team2) {
        teamCounts.set(team2, (teamCounts.get(team2) || 0) + 1);
      }
    });

    // Sort by frequency and return top teams
    return Array.from(teamCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }

  /**
   * Private: Load history from localStorage
   */
  private getHistory(): MatchHistoryItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return [];
      }

      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        viewedAt: new Date(item.viewedAt)
      }));
    } catch (error) {
      console.error('Failed to load match history:', error);
      return [];
    }
  }

  /**
   * Private: Save history to localStorage
   */
  private saveHistory(history: MatchHistoryItem[]): void {
    try {
      const data = JSON.stringify(history);
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save match history:', error);
      // Optionally: Clear old data if quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.clearHistory();
      }
    }
  }
}
