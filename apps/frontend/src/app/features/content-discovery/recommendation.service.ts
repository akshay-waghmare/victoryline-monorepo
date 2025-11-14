import { Injectable } from '@angular/core';
import { MatchCardViewModel, MatchStatus } from '../matches/models/match-card.models';
import { MatchHistoryService } from './match-history.service';

interface ScoredMatch {
  match: MatchCardViewModel;
  score: number;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  constructor(private historyService: MatchHistoryService) {}

  /**
   * Get recommended matches based on viewing history and match attributes
   */
  getRecommendations(
    allMatches: MatchCardViewModel[],
    limit: number = 5
  ): MatchCardViewModel[] {
    const favoriteTeams = this.historyService.getFavoriteTeams();
    const recentlyViewed = this.historyService.getRecentlyViewed(10);
    const viewedMatchIds = new Set(recentlyViewed.map(m => m.id));
    
    // Score each match
    const scoredMatches: ScoredMatch[] = allMatches
      .filter(match => !viewedMatchIds.has(match.id)) // Exclude already viewed
      .map(match => ({
        match,
        score: this.calculateScore(match, favoriteTeams),
        reasons: this.getReasons(match, favoriteTeams)
      }));
    
    // Sort by score descending
    scoredMatches.sort((a, b) => b.score - a.score);
    
    // Return top N matches
    return scoredMatches.slice(0, limit).map(sm => sm.match);
  }

  /**
   * Calculate recommendation score for a match
   */
  private calculateScore(
    match: MatchCardViewModel,
    favoriteTeams: string[]
  ): number {
    let score = 0;
    
    // 1. Live matches get highest priority (+50)
    if (match.status === MatchStatus.LIVE || match.status === MatchStatus.INNINGS_BREAK) {
      score += 50;
    }
    
    // 2. Upcoming matches get medium priority (+20)
    if (match.status === MatchStatus.UPCOMING) {
      score += 20;
    }
    
    // 3. Favorite team involvement (+30 per team)
    const team1Name = match.team1?.name || '';
    const team2Name = match.team2?.name || '';
    
    if (favoriteTeams.includes(team1Name)) {
      score += 30;
    }
    if (favoriteTeams.includes(team2Name)) {
      score += 30;
    }
    
    // 4. Both favorite teams playing each other (+bonus 20)
    if (favoriteTeams.includes(team1Name) && favoriteTeams.includes(team2Name)) {
      score += 20;
    }
    
    // 5. Close matches (if scores are available) (+10)
    if (match.team1?.score && match.team2?.score) {
      const diff = Math.abs(
        (match.team1.score.runs || 0) - (match.team2.score.runs || 0)
      );
      if (diff < 50) { // Close match
        score += 10;
      }
    }
    
    // 6. Recent staleness (fresher data gets bonus) (+5)
    if (match.staleness === 'fresh') {
      score += 5;
    }
    
    return score;
  }

  /**
   * Get human-readable reasons for recommendation
   */
  private getReasons(
    match: MatchCardViewModel,
    favoriteTeams: string[]
  ): string[] {
    const reasons: string[] = [];
    
    if (match.status === MatchStatus.LIVE) {
      reasons.push('Live now');
    }
    
    const team1Name = match.team1?.name || '';
    const team2Name = match.team2?.name || '';
    
    if (favoriteTeams.includes(team1Name)) {
      reasons.push(`You watch ${team1Name}`);
    }
    if (favoriteTeams.includes(team2Name)) {
      reasons.push(`You watch ${team2Name}`);
    }
    
    if (match.team1?.score && match.team2?.score) {
      const diff = Math.abs(
        (match.team1.score.runs || 0) - (match.team2.score.runs || 0)
      );
      if (diff < 50) {
        reasons.push('Close match');
      }
    }
    
    return reasons;
  }

  /**
   * Get trending matches (most viewed/popular - placeholder for future)
   */
  getTrending(allMatches: MatchCardViewModel[], limit: number = 5): MatchCardViewModel[] {
    // For now, just return live matches
    // In production, this would use backend analytics/view counts
    return allMatches
      .filter(m => m.status === MatchStatus.LIVE)
      .slice(0, limit);
  }
}
