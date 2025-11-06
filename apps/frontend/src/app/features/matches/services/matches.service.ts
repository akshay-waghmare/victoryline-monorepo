/**
 * Matches Service
 * Purpose: Data transformation and match management
 * Created: 2025-11-06
 */

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, timer, Subject } from 'rxjs';
import { map, switchMap, catchError, shareReplay, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { MatchCardViewModel, MatchStatus, TeamInfo, ScoreInfo } from '../models/match-card.models';
import { EventListService } from '../../../component/event-list.service';
import { getStatusDisplayText, formatTimeDisplay, calculateStaleness } from '../models/match-status';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatchesService {
  
  private scorecardApiUrl = environment.REST_API_URL + 'cricket-data/sC4-stats/get';
  private destroy$ = new Subject<void>();
  
  constructor(
    private eventListService: EventListService,
    private http: HttpClient
  ) {}
  
  /**
   * Get live matches with automatic refresh every 30 seconds
   * Returns an Observable that emits updated match data periodically
   */
  getLiveMatchesWithAutoRefresh(): Observable<MatchCardViewModel[]> {
    // Emit immediately, then every 30 seconds
    return timer(0, 30000).pipe(
      switchMap(() => this.getLiveMatches()),
      shareReplay(1), // Cache the latest emission
      takeUntil(this.destroy$)
    );
  }
  
  /**
   * Stop auto-refresh (call this when component is destroyed)
   */
  stopAutoRefresh(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Get live matches transformed to MatchCardViewModel
   * T042 - Data transformation logic (API response → MatchCardViewModel)
   */
  getLiveMatches(): Observable<MatchCardViewModel[]> {
    return this.eventListService.getLiveMatches().pipe(
      switchMap((response: any) => {
        console.log('Raw API Response:', response);
        
        if (!Array.isArray(response)) {
          return of([]);
        }
        
        // Filter out finished or deleted matches
        const activeMatches = response.filter((item: any) => 
          !item.finished && !item.deleted
        );
        
        console.log('Active matches count:', activeMatches.length);
        
        // If no active matches, return empty array
        if (activeMatches.length === 0) {
          return of([]);
        }
        
        // Fetch scorecard data for all active matches
        const scorecardRequests = activeMatches.map((match: any) => 
          this.fetchScorecardData(match.url).pipe(
            catchError(error => {
              console.error('Error fetching scorecard for:', match.url, error);
              return of(null); // Return null on error, continue with other matches
            })
          )
        );
        
        // Wait for all scorecard requests to complete
        return forkJoin(scorecardRequests).pipe(
          map((scorecardDataArray: any[]) => {
            // Combine match metadata with scorecard data
            const transformedMatches = activeMatches.map((match, index) => {
              const scorecardData = scorecardDataArray[index];
              const transformed = this.transformToViewModel(match, scorecardData);
              console.log('Transformed match:', transformed);
              return transformed;
            });
            
            return transformedMatches;
          })
        );
      })
    );
  }
  
  /**
   * Fetch scorecard data for a specific match URL
   */
  private fetchScorecardData(matchUrl: string): Observable<any> {
    // Extract the match identifier from the full URL
    // URL format: https://crex.com/scoreboard/.../pak-vs-sa-2nd-odi.../live
    // We need: pak-vs-sa-2nd-odi-south-africa-tour-of-pakistan-2025
    let matchIdentifier = matchUrl;
    
    if (matchUrl.includes('/')) {
      const urlParts = matchUrl.split('/');
      // Get the part before '/live'
      matchIdentifier = urlParts[urlParts.length - 2];
    }
    
    const url = `${this.scorecardApiUrl}?url=${encodeURIComponent(matchIdentifier)}`;
    console.log('Fetching scorecard from:', url);
    console.log('Match identifier:', matchIdentifier);
    
    return this.http.get(url).pipe(
      map((data: any) => {
        console.log('Scorecard data received for', matchIdentifier, ':', data);
        return data;
      })
    );
  }
  
  /**
   * Transform API response to MatchCardViewModel
   * Handles various API response formats
   */
  private transformToViewModel(apiMatch: any, scorecardData: any = null): MatchCardViewModel {
    // Extract match ID
    const matchId = apiMatch.id ? apiMatch.id.toString() : this.generateMatchId(apiMatch);
    
    // Parse match data from URL (similar to old parseLiveMatchUrl logic)
    const urlData = this.parseUrlData(apiMatch.url);
    
    // Parse match status
    const status = this.parseMatchStatus(apiMatch, scorecardData);
    
    // Parse teams from URL and scorecard data
    const team1 = this.parseTeamInfo(apiMatch, 'team1', 0, urlData, scorecardData);
    const team2 = this.parseTeamInfo(apiMatch, 'team2', 1, urlData, scorecardData);
    
    // Parse venue from scorecard or URL
    const venue = (scorecardData && scorecardData.venue) || urlData.tournament || 'Venue TBD';
    const startTime = this.parseStartTime(apiMatch, scorecardData);
    
    // Parse last updated timestamp
    const lastUpdated = apiMatch.lastUpdated 
      ? new Date(apiMatch.lastUpdated) 
      : new Date();
    
    // Compute display properties
    const displayStatus = getStatusDisplayText(status);
    const statusColor = this.getStatusColorForStatus(status);
    const timeDisplay = formatTimeDisplay(startTime);
    const isLive = status === MatchStatus.LIVE || status === MatchStatus.INNINGS_BREAK;
    const canAnimate = isLive;
    const staleness = calculateStaleness(lastUpdated);
    
    return {
      id: matchId,
      team1,
      team2,
      status,
      venue,
      startTime,
      matchUrl: apiMatch.url, // Store original URL for navigation
      displayStatus,
      statusColor,
      timeDisplay,
      isLive,
      canAnimate,
      isHovered: false,
      isSelected: false,
      lastUpdated,
      staleness
    };
  }
  
  /**
   * Parse match data from URL
   * URL format: https://crex.com/scoreboard/VKE/1UP/2nd-TEST/6S/IE/ind-a-vs-sa-a-2nd-test-south-africa-a-tour-of-india-2025/live
   */
  private parseUrlData(url: string): any {
    if (!url) {
      return { team1: 'Team 1', team2: 'Team 2', tournament: 'Tournament' };
    }
    
    try {
      // Extract the meaningful part after the last slash before '/live'
      const parts = url.split('/');
      const matchPart = parts[parts.length - 2]; // e.g., "ind-a-vs-sa-a-2nd-test-south-africa-a-tour-of-india-2025"
      
      // Find the "-vs-" separator
      const vsIndex = matchPart.indexOf('-vs-');
      if (vsIndex === -1) {
        return { team1: 'Team 1', team2: 'Team 2', tournament: matchPart };
      }
      
      // Split at first occurrence of "-vs-"
      const beforeVs = matchPart.substring(0, vsIndex);
      const afterVs = matchPart.substring(vsIndex + 4);
      
      // Team 1 is everything before "-vs-"
      const team1Name = this.formatTeamName(beforeVs);
      
      // Team 2 and tournament: find where tournament starts
      // Look for match number pattern like "2nd-test", "1st-odi", etc.
      const matchTypePattern = /\d+(st|nd|rd|th)-(test|odi|t20|match)/i;
      const matchTypeMatch = afterVs.match(matchTypePattern);
      
      let team2Name = 'Team 2';
      let tournament = 'Tournament';
      
      if (matchTypeMatch) {
        const matchTypeIndex = afterVs.indexOf(matchTypeMatch[0]);
        team2Name = this.formatTeamName(afterVs.substring(0, matchTypeIndex - 1));
        tournament = this.formatTournamentName(afterVs.substring(matchTypeIndex));
      } else {
        // Fallback: take first word after vs as team2
        const afterVsParts = afterVs.split('-');
        team2Name = this.formatTeamName(afterVsParts[0]);
        tournament = this.formatTournamentName(afterVs);
      }
      
      return {
        team1: team1Name,
        team2: team2Name,
        tournament: tournament
      };
    } catch (error) {
      console.error('Error parsing URL:', url, error);
      return { team1: 'Team 1', team2: 'Team 2', tournament: 'Tournament' };
    }
  }
  
  /**
   * Format team name from URL slug
   */
  private formatTeamName(slug: string): string {
    if (!slug) return 'Unknown';
    
    // Replace hyphens with spaces and title case
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Format tournament name from URL slug
   */
  private formatTournamentName(slug: string): string {
    if (!slug) return 'Tournament';
    
    // Replace hyphens with spaces and title case
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Parse team information from API response
   */
  private parseTeamInfo(apiMatch: any, teamKey: string, index: number, urlData?: any, scorecardData?: any): TeamInfo {
    // Try to get team data from various possible API structures
    let teamData = apiMatch[teamKey] || (apiMatch.teams && apiMatch.teams[index]) || {};
    
    // First try to get team name from scorecard data
    let teamName = 'Team ' + (index + 1);
    
    if (scorecardData && scorecardData.match_stats_by_innings && scorecardData.match_stats_by_innings.innings) {
      const innings = scorecardData.match_stats_by_innings.innings;
      const inningsKey = index === 0 ? '1st_inning' : '2nd_inning';
      const inningsData = innings[inningsKey];
      
      if (inningsData && inningsData.team_code) {
        teamName = inningsData.team_code;
        console.log(`Team ${index} name from scorecard:`, teamName);
      }
    }
    
    // Fallback to URL parsed data
    if (teamName === 'Team ' + (index + 1) && urlData && urlData[teamKey]) {
      teamName = urlData[teamKey];
    } else if (teamName === 'Team ' + (index + 1) && typeof teamData === 'string') {
      teamName = teamData;
    } else if (teamName === 'Team ' + (index + 1) && teamData.name) {
      teamName = teamData.name || teamData.teamName;
    }
    
    // Parse score if available from scorecard data
    const score = this.parseScore(teamData, apiMatch, index, scorecardData);
    
    return {
      id: teamData.id || (apiMatch.id ? apiMatch.id + '-' + teamKey : 'unknown-' + teamKey),
      name: teamName,
      shortName: this.extractShortName(teamName),
      logoUrl: this.getDefaultLogoUrl(teamName),
      score
    };
  }
  
  /**
   * Parse score information from scorecard data or team data
   */
  private parseScore(teamData: any, apiMatch: any, teamIndex: number, scorecardData?: any): ScoreInfo | null {
    console.log(`Parsing score for team ${teamIndex}:`, {
      scorecardData,
      teamData,
      hasScorecardScores: scorecardData && scorecardData.scores
    });
    
    // First try to get score from scorecard data
    if (scorecardData && scorecardData.match_stats_by_innings && scorecardData.match_stats_by_innings.innings) {
      const innings = scorecardData.match_stats_by_innings.innings;
      
      // Map team index to innings (0 -> 1st_inning, 1 -> 2nd_inning)
      const inningsKey = teamIndex === 0 ? '1st_inning' : '2nd_inning';
      const inningsData = innings[inningsKey];
      
      console.log(`Looking for ${inningsKey}:`, inningsData);
      
      if (inningsData && inningsData.team_score) {
        const scoreStr = inningsData.team_score;
        console.log(`Found team_score for team ${teamIndex}:`, scoreStr);
        
        // Parse score string like "243/8(291" or "243/8(50.0)"
        return this.parseScoreString(scoreStr);
      }
    }
    
    // Fallback: Check if scorecardData has direct score field
    if (scorecardData) {
      // scorecardData.score (string like "150/5")
      if (scorecardData.score && teamIndex === 0) {
        return this.parseScoreString(scorecardData.score, scorecardData.over);
      }
      
      // scorecardData.scores array
      if (scorecardData.scores && Array.isArray(scorecardData.scores)) {
        const teamScore = scorecardData.scores[teamIndex];
        console.log(`Team ${teamIndex} score from scorecard.scores:`, teamScore);
        if (teamScore) {
          return this.formatScoreInfo(teamScore);
        }
      }
    }
    
    // Fallback: Try various possible score data structures from old API
    const scoreData = teamData.score || (apiMatch.scores && apiMatch.scores[teamIndex]);
    
    if (!scoreData) {
      console.log(`No score data found for team ${teamIndex}`);
      return null;
    }
    
    return this.formatScoreInfo(scoreData);
  }
  
  /**
   * Parse score from string format like "243/8(291" or "243/8(50.0)" or "150/5"
   */
  private parseScoreString(scoreStr: string, oversStr?: any): ScoreInfo | null {
    if (!scoreStr) {
      return null;
    }
    
    console.log('Parsing score string:', scoreStr);
    
    // Handle formats like "243/8(291" or "243/8(50.0)" or "150/5"
    // Extract runs, wickets, and balls/overs using regex
    const scoreMatch = scoreStr.match(/(\d+)\/(\d+)/);
    const ballsOrOversMatch = scoreStr.match(/\((\d+\.?\d*)/);
    
    if (scoreMatch) {
      const runs = parseInt(scoreMatch[1], 10) || 0;
      const wickets = parseInt(scoreMatch[2], 10) || 0;
      let overs = 0;
      
      // Try to get balls/overs from the score string itself
      if (ballsOrOversMatch) {
        const value = parseFloat(ballsOrOversMatch[1]) || 0;
        
        // If value is > 100, it's likely total balls, not overs
        // Convert balls to overs (6 balls = 1 over)
        if (value > 100) {
          const totalBalls = Math.floor(value);
          const completeOvers = Math.floor(totalBalls / 6);
          const remainingBalls = totalBalls % 6;
          overs = parseFloat(`${completeOvers}.${remainingBalls}`);
          console.log(`Converted ${totalBalls} balls to ${overs} overs`);
        } else {
          // Already in overs format
          overs = value;
        }
      } else if (oversStr) {
        const value = parseFloat(oversStr.toString()) || 0;
        // Apply same logic for oversStr parameter
        if (value > 100) {
          const totalBalls = Math.floor(value);
          const completeOvers = Math.floor(totalBalls / 6);
          const remainingBalls = totalBalls % 6;
          overs = parseFloat(`${completeOvers}.${remainingBalls}`);
        } else {
          overs = value;
        }
      }
      
      const displayText = overs > 0 
        ? `${runs}/${wickets} (${overs} ov)`
        : `${runs}/${wickets}`;
      
      const runRate = overs > 0 ? parseFloat((runs / overs).toFixed(2)) : 0;
      
      console.log('Parsed score:', { runs, wickets, overs, runRate, displayText });
      
      return {
        runs,
        wickets,
        overs,
        runRate,
        displayText
      };
    }
    
    return null;
  }
  
  /**
   * Format score data into ScoreInfo object
   */
  private formatScoreInfo(scoreData: any): ScoreInfo | null {
    if (!scoreData) {
      return null;
    }
    
    // Handle different score formats
    const runs = scoreData.runs || scoreData.r || 0;
    const wickets = scoreData.wickets || scoreData.w || 0;
    const overs = scoreData.overs || scoreData.ov || 0;
    const runRate = scoreData.runRate || scoreData.rr || 0;
    
    // Generate display text
    const displayText = `${runs}/${wickets} (${overs} ov)`;
    
    return {
      runs,
      wickets,
      overs,
      runRate,
      displayText
    };
  }
  
  /**
   * Parse match status from API response
   */
  private parseMatchStatus(apiMatch: any, scorecardData?: any): MatchStatus {
    // First check scorecard data if available
    if (scorecardData && scorecardData.status) {
      const statusStr = scorecardData.status.toLowerCase();
      if (statusStr.includes('live') || statusStr.includes('in progress')) {
        return MatchStatus.LIVE;
      } else if (statusStr.includes('innings break') || statusStr.includes('break')) {
        return MatchStatus.INNINGS_BREAK;
      } else if (statusStr.includes('completed') || statusStr.includes('finished')) {
        return MatchStatus.COMPLETED;
      }
    }
    
    const statusStr = (apiMatch.status || apiMatch.matchStatus || '').toLowerCase();
    
    // Check finished flag
    if (apiMatch.finished === true) {
      return MatchStatus.COMPLETED;
    }
    
    // Check deleted flag
    if (apiMatch.deleted === true) {
      return MatchStatus.ABANDONED;
    }
    
    // If not finished and not deleted, assume live or upcoming
    if (statusStr.includes('live') || statusStr.includes('in progress')) {
      return MatchStatus.LIVE;
    } else if (statusStr.includes('innings break') || statusStr.includes('break')) {
      return MatchStatus.INNINGS_BREAK;
    } else if (statusStr.includes('upcoming') || statusStr.includes('scheduled')) {
      return MatchStatus.UPCOMING;
    } else if (statusStr.includes('completed') || statusStr.includes('finished')) {
      return MatchStatus.COMPLETED;
    } else if (statusStr.includes('rain') || statusStr.includes('delayed')) {
      return MatchStatus.RAIN_DELAY;
    } else if (statusStr.includes('abandoned') || statusStr.includes('cancelled')) {
      return MatchStatus.ABANDONED;
    }
    
    // Default: if URL ends with '/live', assume it's live
    if (apiMatch.url && apiMatch.url.endsWith('/live')) {
      return MatchStatus.LIVE;
    }
    
    // Default to upcoming if status is unclear
    return MatchStatus.UPCOMING;
  }
  
  /**
   * Parse start time from API response
   */
  private parseStartTime(apiMatch: any, scorecardData?: any): Date {
    // Try scorecard data first
    if (scorecardData && scorecardData.startTime) {
      return new Date(scorecardData.startTime);
    }
    
    if (apiMatch.startTime) {
      return new Date(apiMatch.startTime);
    } else if (apiMatch.date) {
      return new Date(apiMatch.date);
    } else if (apiMatch.timestamp) {
      return new Date(apiMatch.timestamp);
    }
    
    // Default to current time if not available
    return new Date();
  }
  
  /**
   * Extract short name from full team name
   * Example: "India" -> "IND", "Australia" -> "AUS"
   */
  private extractShortName(fullName: string): string {
    if (!fullName) return 'TBD';
    
    // Common cricket team abbreviations
    const abbreviations: { [key: string]: string } = {
      'india': 'IND',
      'australia': 'AUS',
      'england': 'ENG',
      'pakistan': 'PAK',
      'south africa': 'SA',
      'new zealand': 'NZ',
      'sri lanka': 'SL',
      'west indies': 'WI',
      'bangladesh': 'BAN',
      'afghanistan': 'AFG',
      'ireland': 'IRE',
      'zimbabwe': 'ZIM'
    };
    
    const lowerName = fullName.toLowerCase();
    if (abbreviations[lowerName]) {
      return abbreviations[lowerName];
    }
    
    // Fallback: Take first 3 letters and uppercase
    return fullName.substring(0, 3).toUpperCase();
  }
  
  /**
   * Get default logo URL for team
   */
  private getDefaultLogoUrl(teamName: string): string {
    // Placeholder logo URL - replace with actual logo service
    return `/assets/images/teams/${this.extractShortName(teamName).toLowerCase()}.png`;
  }
  
  /**
   * Get status color CSS variable
   */
  private getStatusColorForStatus(status: MatchStatus): string {
    switch (status) {
      case MatchStatus.LIVE:
      case MatchStatus.INNINGS_BREAK:
        return 'var(--color-match-live)';
      case MatchStatus.UPCOMING:
        return 'var(--color-match-upcoming)';
      case MatchStatus.COMPLETED:
        return 'var(--color-match-completed)';
      case MatchStatus.RAIN_DELAY:
      case MatchStatus.ABANDONED:
        return 'var(--color-error)';
      default:
        return 'var(--color-text-secondary)';
    }
  }
  
  /**
   * Generate match ID from URL or other data
   */
  private generateMatchId(apiMatch: any): string {
    if (apiMatch.url) {
      // Extract ID from URL if possible
      const urlParts = apiMatch.url.split('/');
      return urlParts[urlParts.length - 1] || `match-${Date.now()}`;
    }
    
    // Fallback to timestamp-based ID
    return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
