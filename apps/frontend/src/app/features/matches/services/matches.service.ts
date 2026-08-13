/**
 * Matches Service
 * Purpose: Data transformation and match management
 * Created: 2025-11-06
 */

import { Injectable, Optional } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, of, combineLatest, timer, merge, EMPTY } from 'rxjs';
import { map, switchMap, catchError, shareReplay, timeout, debounceTime, filter, startWith, distinctUntilChanged } from 'rxjs/operators';

import { MatchCardViewModel, MatchStatus, TeamInfo, ScoreInfo } from '../models/match-card.models';
import { EventListService } from '../../../component/event-list.service';
import { getStatusDisplayText, formatTimeDisplay, calculateStaleness } from '../models/match-status';
import { ballsToOvers, extractSlugFromUrl, sortMatchesByPriority } from '../../../core/utils/match-utils';

interface ScheduleResponse {
  success?: boolean;
  data?: any[];
  lastUpdated?: number;
  source?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  // The discovery catalogue feeds /series as well as home and /matches. The
  // local proxy can take longer than five seconds while a scraper refresh is
  // in flight; timing out one lane made the series centre look empty despite
  // the backend already having fixtures.
  // Keep catalog SSR inside the frontend's eight-second render budget. A
  // catalog snapshot is useful even when one upstream lane is slow; optional
  // scorecard/detail data must not extend this critical path.
  private readonly matchesRequestTimeoutMs = 5000;

  // Singleton shared stream — all components subscribe to the same timer + WebSocket triggers.
  // This prevents multiple components (Home, MatchesList) from each creating their own
  // independent polling loops and multiplying HTTP requests.
  private readonly sharedMatches$: Observable<MatchCardViewModel[]> | null;

  constructor(
    private eventListService: EventListService,
    @Optional() private router?: Router
  ) {
    // WebSocket-triggered refresh: backend pushes to /topic/live-matches on every scraper update.
    // Debounce to 3s so rapid scraper bursts don't hammer the backend with repeated fetches.
    const wsRefresh$ = this.isBrowser()
      ? this.eventListService.subscribeToEventsTopic().pipe(
          debounceTime(3000),
          catchError(() => EMPTY)
        )
      : EMPTY;

    if (this.isBrowser()) {
      const refresh$ = merge(timer(0, 30000), wsRefresh$);

      // Catalog data belongs to discovery surfaces (home, /matches, hubs, and
      // series pages). A canonical /cric-live/{slug} page owns one match and
      // must not keep the global catalog fan-out alive in the background.
      // Route-gating the shared stream also tears down its timer and socket
      // trigger when navigation enters a match page.
      const catalogSurface$ = this.router
        ? this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).urlAfterRedirects || ''),
            startWith(this.router.url || ''),
            map(url => this.isCatalogSurface(url)),
            distinctUntilChanged()
          )
        : of(true);

      this.sharedMatches$ = catalogSurface$.pipe(
        switchMap(isCatalogSurface => isCatalogSurface ? refresh$ : EMPTY),
        switchMap(() => this.getAllMatches()),
        shareReplay(1)
      );
      return;
    }

    // SSR requests should fetch a fresh snapshot per render instead of
    // reusing one cached observable across the whole Node process.
    this.sharedMatches$ = null;
  }

  /**
   * Get live matches with automatic refresh.
   * Returns a singleton observable shared by all subscribers — Home, MatchesList, etc.
   * Refreshes every 30s via timer AND immediately on WebSocket push from backend.
   */
  getLiveMatchesWithAutoRefresh(): Observable<MatchCardViewModel[]> {
    if (!this.isBrowser() || !this.sharedMatches$) {
      return this.getAllMatches();
    }

    return this.sharedMatches$;
  }

  /**
   * Stop auto-refresh (retained for backwards compatibility — teardown is managed by subscriptions).
   */
  stopAutoRefresh(): void {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !(window as any).__SSR__;
  }

  private isCatalogSurface(url: string): boolean {
    const path = (url || '').split('?')[0].split('#')[0].replace(/\/$/, '') || '/';

    return path === '/'
      || path === '/matches'
      || path.startsWith('/live-score')
      || path.startsWith('/cricket-schedule')
      || path === '/series'
      || path.startsWith('/series/');
  }

  /**
   * Get live matches transformed to MatchCardViewModel
   * T042 - Data transformation logic (API response → MatchCardViewModel)
   */
  getLiveMatches(): Observable<MatchCardViewModel[]> {
    return this.eventListService.getLiveMatches().pipe(
      timeout(this.matchesRequestTimeoutMs),
      switchMap((response: any) => {
        if (!Array.isArray(response)) {
          return of([]);
        }

        // Trust backend-persisted lifecycle state for live feed filtering.
        const activeMatches = response.filter((item: any) =>
          this.isLiveFeedStatus(this.parseMatchStatus(item))
        );

        // If no active matches, return empty array
        if (activeMatches.length === 0) {
          return of([]);
        }

        // The catalog feed is intentionally metadata-only. Scorecards are
        // loaded by the detail/scorecard surface for one selected match; they
        // must never be fetched for every live match on every catalog refresh.
        return of(this.transformActiveMatches(activeMatches, activeMatches.map(() => null)));
      }),
      catchError(() => {
        return of([]);
      })
    );
  }

  private transformActiveMatches(activeMatches: any[], scorecardDataArray: any[]): MatchCardViewModel[] {
    return activeMatches.map((match, index) => {
      const transformed = this.transformToViewModel(match, scorecardDataArray[index]);
      // Scorecard status strings like "Day 1 completed" must not override the live feed.
      if (transformed.status === MatchStatus.COMPLETED || transformed.status === MatchStatus.UPCOMING) {
        transformed.status = MatchStatus.LIVE;
        transformed.displayStatus = getStatusDisplayText(MatchStatus.LIVE);
        transformed.isLive = true;
        transformed.canAnimate = true;
      }
      return transformed;
    });
  }

  getAllMatches(): Observable<MatchCardViewModel[]> {
    return combineLatest([
      this.getLiveMatches(),
      this.getUpcomingMatches(),
      this.getCompletedMatches()
    ]).pipe(
      map(([liveMatches, upcomingMatches, completedMatches]) =>
        sortMatchesByPriority(this.dedupeMatches([
          ...liveMatches,
          ...upcomingMatches,
          ...completedMatches
        ]))
      )
    );
  }

  private getUpcomingMatches(): Observable<MatchCardViewModel[]> {
    return this.eventListService.getUpcomingMatches().pipe(
      timeout(this.matchesRequestTimeoutMs),
      map((response: ScheduleResponse | any[]) => this.transformScheduleMatches(response, MatchStatus.UPCOMING)),
      catchError(() => {
        return of([]);
      })
    );
  }

  private getCompletedMatches(): Observable<MatchCardViewModel[]> {
    return this.eventListService.getCompletedMatches().pipe(
      timeout(this.matchesRequestTimeoutMs),
      map((response: ScheduleResponse | any[]) => this.transformScheduleMatches(response, MatchStatus.COMPLETED)),
      catchError(() => {
        return of([]);
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

    // Prefer explicit venue sources. Slug-derived tournament text is too noisy to
    // reuse as venue on homepage cards when the live feed is thin.
    const venue = this.resolveVenue(apiMatch, scorecardData);
    const startTime = this.parseStartTime(apiMatch, scorecardData);

    // Parse last updated timestamp
    const lastUpdated = apiMatch.lastUpdated
      ? new Date(apiMatch.lastUpdated)
      : apiMatch.lastStateUpdatedAt
      ? new Date(apiMatch.lastStateUpdatedAt)
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
      seriesName: apiMatch.seriesName || urlData.tournament,
      matchFormat: apiMatch.matchFormat || this.extractMatchFormat(apiMatch.url || ''),
      resultSummary: apiMatch.resultSummary || '',
      externalMatchKey: apiMatch.externalMatchKey,
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

  private transformScheduleMatches(response: ScheduleResponse | any[], forceStatus: MatchStatus): MatchCardViewModel[] {
    const payload = this.extractSchedulePayload(response);
    return payload.map(match => {
      // Always force the status from the source endpoint so that
      // stale status strings in the API data don't mis-categorize matches.
      match.status = forceStatus;
      const viewModel = this.transformToViewModel(match, null);

      // For completed matches, parse scores from resultSummary if teams have no score
      if (forceStatus === MatchStatus.COMPLETED && match.resultSummary) {
        this.enrichScoresFromResultSummary(viewModel, match.resultSummary);
      }

      return viewModel;
    });
  }

  private extractSchedulePayload(response: ScheduleResponse | any[]): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  /**
   * Parse match data from URL
   * URL format: https://crex.com/scoreboard/VKE/1UP/2nd-TEST/6S/IE/ind-a-vs-sa-a-2nd-test-south-africa-a-tour-of-india-2025/live
   */
  private parseUrlData(url: string): any {
    if (!url) {
      return { team1: '', team2: '', tournament: 'Tournament' };
    }

    try {
      const matchPart = extractSlugFromUrl(url) || this.extractSlugCandidate(url);
      if (!matchPart) {
        return { team1: '', team2: '', tournament: 'Tournament' };
      }

      // Find the "-vs-" separator
      const vsIndex = matchPart.indexOf('-vs-');
      if (vsIndex === -1) {
        return { team1: '', team2: '', tournament: matchPart };
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

      let team2Name = '';
      let tournament = 'Tournament';

      if (matchTypeMatch) {
        const matchTypeIndex = afterVs.indexOf(matchTypeMatch[0]);
        team2Name = this.formatTeamName(afterVs.substring(0, matchTypeIndex - 1));
        tournament = this.formatTournamentName(afterVs.substring(matchTypeIndex));
      } else {
        const splitPoint = this.findTeam2Boundary(afterVs);
        if (splitPoint > 0) {
          team2Name = this.formatTeamName(afterVs.substring(0, splitPoint));
          tournament = this.formatTournamentName(afterVs.substring(splitPoint + 1));
        } else {
          team2Name = this.formatTeamName(afterVs);
          tournament = 'Tournament';
        }
      }

      return {
        team1: team1Name,
        team2: team2Name,
        tournament: tournament
      };
    } catch (error) {
      console.error('Error parsing URL:', url, error);
      return { team1: '', team2: '', tournament: 'Tournament' };
    }
  }

  /**
   * Format team name from URL slug
   */
  private formatTeamName(slug: string): string {
    if (!slug) return 'Unknown';

    const cleaned = slug
      .replace(/-(live|live-score|scorecard|commentary|match-details)$/i, '')
      .replace(/\b(match|live|updates|scorecard|commentary)\b.*$/i, '')
      .replace(/-\d+[a-z]{0,2}$/i, '')
      .trim();

    return cleaned
      .split('-')
      .filter(Boolean)
      .map(word => this.formatSlugWord(word))
      .join(' ')
      .trim();
  }

  /**
   * Format tournament name from URL slug
   */
  private formatTournamentName(slug: string): string {
    if (!slug) return 'Tournament';

    const cleaned = slug
      .replace(/\bmatch-updates\b.*$/i, '')
      .replace(/\b(live-score|scorecard|commentary|live)\b.*$/i, '')
      .replace(/-\b[A-Z0-9]{3,5}\b$/i, '')
      .trim();

    return cleaned
      .split('-')
      .filter(Boolean)
      .map(word => this.formatSlugWord(word))
      .join(' ')
      .trim();
  }

  /**
   * Parse team information from API response
   */
  private parseTeamInfo(apiMatch: any, teamKey: string, index: number, urlData?: any, scorecardData?: any): TeamInfo {
    // Try to get team data from various possible API structures
    const teamData = apiMatch[teamKey] || (apiMatch.teams && apiMatch.teams[index]) || {};
    const fallbackTeamName = 'TBD';
    const scorecardInnings = this.findScorecardInningsForTeam(apiMatch, teamKey, index, urlData, scorecardData);
    const scorecardTeamCode = scorecardInnings && scorecardInnings.team_code
      ? this.normalizeTeamLabel(scorecardInnings.team_code)
      : '';

    const explicitTeamName = this.normalizeTeamLabel(apiMatch[`${teamKey}Name`]);
    const urlTeamName = this.normalizeTeamLabel(urlData && urlData[teamKey]);
    const rawTeamName = this.normalizeTeamLabel(typeof teamData === 'string' ? teamData : '');
    const structuredTeamName = this.normalizeTeamLabel(teamData.fullName || teamData.teamName || teamData.name);

    let teamName = explicitTeamName || structuredTeamName || rawTeamName || urlTeamName || scorecardTeamCode || fallbackTeamName;
    if (this.isLikelyShortTeamName(teamName) && urlTeamName && !this.isLikelyShortTeamName(urlTeamName)) {
      teamName = urlTeamName;
    }

    const explicitShortName = this.normalizeTeamLabel(teamData.shortName || teamData.short_code || teamData.abbreviation);
    const shortName = explicitShortName || scorecardTeamCode || this.extractShortName(teamName);

    // Parse score if available from scorecard data
    const score = this.parseScore(teamData, apiMatch, index, scorecardData);

    return {
      id: teamData.id || (apiMatch.id ? apiMatch.id + '-' + teamKey : 'unknown-' + teamKey),
      name: teamName,
      shortName,
      logoUrl: this.getDefaultLogoUrl(teamName),
      score
    };
  }

  /**
   * Parse score information from scorecard data or team data
   */
  private parseScore(teamData: any, apiMatch: any, teamIndex: number, scorecardData?: any): ScoreInfo | null {
    // First try to get score from scorecard data
    const scorecardInnings = this.findScorecardInningsForTeam(
      apiMatch,
      teamIndex === 0 ? 'team1' : 'team2',
      teamIndex,
      this.parseUrlData(apiMatch.url),
      scorecardData
    );
    if (scorecardInnings && scorecardInnings.team_score) {
        const scoreStr = scorecardInnings.team_score;
        // Parse score string like "243/8(291" or "243/8(50.0)"
        return this.parseScoreString(scoreStr);
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
        if (teamScore) {
          return this.formatScoreInfo(teamScore);
        }
      }
    }

    // Fallback: Try various possible score data structures from old API
    const scoreData = teamData.score || (apiMatch.scores && apiMatch.scores[teamIndex]);

    if (!scoreData) {
      return null;
    }

    return this.formatScoreInfo(scoreData);
  }

  /**
   * CREX catalog order is not guaranteed to be batting order.  Scorecards are
   * keyed by innings, so resolve their team by name before falling back to the
   * historic positional mapping.  This keeps a chase card from showing the
   * first-innings total under the chasing team.
   */
  private findScorecardInningsForTeam(apiMatch: any, teamKey: string, index: number, urlData?: any, scorecardData?: any): any | null {
    const innings = scorecardData && scorecardData.match_stats_by_innings && scorecardData.match_stats_by_innings.innings;
    if (!innings) {
      return null;
    }

    const teamData = apiMatch[teamKey] || (apiMatch.teams && apiMatch.teams[index]) || {};
    const candidates = [
      apiMatch[`${teamKey}Name`],
      typeof teamData === 'string' ? teamData : '',
      teamData.fullName,
      teamData.teamName,
      teamData.name,
      urlData && urlData[teamKey]
    ].map(value => this.normalizeTeamLabel(value)).filter(Boolean);

    const entries = Object.keys(innings).map(key => innings[key]).filter(Boolean);
    const matched = entries.find((inning: any) => {
      const inningNames = [inning.team_name, inning.teamName, inning.team_code]
        .map(value => this.normalizeTeamLabel(value))
        .filter(Boolean);
      return candidates.some(candidate => inningNames.indexOf(candidate) !== -1);
    });
    if (matched) {
      return matched;
    }

    return innings[index === 0 ? '1st_inning' : '2nd_inning'] || null;
  }

  /**
   * Parse score from string format like "243/8(291" or "243/8(50.0)" or "150/5"
   */
  private parseScoreString(scoreStr: string, oversStr?: any): ScoreInfo | null {
    if (!scoreStr) {
      return null;
    }

    // Handle formats like "243/8(291" or "243/8(50.0)" or "150/5"
    // Extract runs, wickets, and balls/overs using regex
  const scoreMatch = scoreStr.match(/(\d+)[\/-](\d+)/);
  const ballsOrOversMatch = scoreStr.match(/\(([^)]+)\)/);

    if (scoreMatch) {
      const runs = parseInt(scoreMatch[1], 10) || 0;
      const wickets = parseInt(scoreMatch[2], 10) || 0;
      let overs = 0;

      // Try to get balls/overs from the score string itself
      if (ballsOrOversMatch) {
        const raw = (ballsOrOversMatch[1] || '').toString();
        const normalized = ballsToOvers(raw);
        overs = normalized ? parseFloat(normalized) : 0;
      } else if (oversStr) {
        const normalized = ballsToOvers(oversStr);
        overs = normalized ? parseFloat(normalized) : 0;
      }

      const displayText = overs > 0
        ? `${runs}/${wickets} (${overs} ov)`
        : `${runs}/${wickets}`;

      const runRate = overs > 0 ? parseFloat((runs / overs).toFixed(2)) : 0;

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
   * Enrich card scores from resultSummary when scorecard data is unavailable.
   * Handles two formats:
   *   1. With slash: "CDE 189/620.0" → 189/6 (20.0 ov)
   *   2. All-out (no slash): "NOD 11916.3" → 119/10 (16.3 ov)
   */
  private enrichScoresFromResultSummary(viewModel: MatchCardViewModel, resultSummary: string): void {
    if (!resultSummary) { return; }

    const parsed: Array<{ teamName: string; runs: number; wickets: number; overs: number }> = [];

    // Pass 1: scores with "/" separator
    const slashPattern = /([A-Za-z][A-Za-z\s&.-]*?)\s+(\d+)\/(\d{1,2}?)\s*\(?(\d+\.\d+)\)?/g;
    let entry: RegExpExecArray | null;
    const matchedTeams = new Set<string>();

    while ((entry = slashPattern.exec(resultSummary)) !== null) {
      const teamName = entry[1].trim();
      matchedTeams.add(teamName);
      parsed.push({
        teamName,
        runs: parseInt(entry[2], 10),
        wickets: parseInt(entry[3], 10),
        overs: parseFloat(entry[4])
      });
    }

    // Pass 2: all-out scores without "/" (e.g., "NOD 11916.3")
    const allOutPattern = /([A-Za-z][A-Za-z\s&.-]*?)\s+(\d+)\.(\d)/g;
    while ((entry = allOutPattern.exec(resultSummary)) !== null) {
      const teamName = entry[1].trim();
      if (matchedTeams.has(teamName)) { continue; }
      // Skip "Won", "Match", etc.
      if (/^(Won|Match|Draw|Tied|No)/i.test(teamName)) { continue; }

      const numberPart = entry[2]; // e.g. "11916"
      const decimal = entry[3];    // e.g. "3"
      let runs = 0, overs = 0;

      if (numberPart.length >= 3) {
        const twoDigitOvers = parseInt(numberPart.slice(-2), 10);
        if (twoDigitOvers >= 1 && twoDigitOvers <= 50) {
          runs = parseInt(numberPart.slice(0, -2), 10);
          overs = parseFloat(twoDigitOvers + '.' + decimal);
        } else {
          runs = parseInt(numberPart.slice(0, -1), 10);
          overs = parseFloat(numberPart.slice(-1) + '.' + decimal);
        }
      } else if (numberPart.length >= 2) {
        runs = parseInt(numberPart.slice(0, -1), 10);
        overs = parseFloat(numberPart.slice(-1) + '.' + decimal);
      }

      if (runs > 0) {
        matchedTeams.add(teamName);
        parsed.push({ teamName, runs, wickets: 10, overs });
      }
    }

    if (parsed.length === 0) { return; }

    // Assign first parsed score to team1, second to team2
    if (!viewModel.team1.score && parsed.length >= 1) {
      const s = parsed[0];
      const rr = s.overs > 0 ? parseFloat((s.runs / s.overs).toFixed(2)) : 0;
      viewModel.team1.score = {
        runs: s.runs,
        wickets: s.wickets,
        overs: s.overs,
        runRate: rr,
        displayText: `${s.runs}/${s.wickets} (${s.overs} ov)`
      };
      if (!viewModel.team1.shortName && s.teamName) {
        viewModel.team1.shortName = s.teamName;
      }
    }

    if (!viewModel.team2.score && parsed.length >= 2) {
      const s = parsed[1];
      const rr = s.overs > 0 ? parseFloat((s.runs / s.overs).toFixed(2)) : 0;
      viewModel.team2.score = {
        runs: s.runs,
        wickets: s.wickets,
        overs: s.overs,
        runRate: rr,
        displayText: `${s.runs}/${s.wickets} (${s.overs} ov)`
      };
      if (!viewModel.team2.shortName && s.teamName) {
        viewModel.team2.shortName = s.teamName;
      }
    }
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

    if (statusStr.includes('live') || statusStr.includes('in progress')) {
      return MatchStatus.LIVE;
    } else if (statusStr.includes('innings break') || statusStr.includes('break')) {
      return MatchStatus.INNINGS_BREAK;
    } else if (statusStr.includes('upcoming') || statusStr.includes('scheduled')) {
      return MatchStatus.UPCOMING;
    } else if (statusStr.includes('abandoned') || statusStr.includes('cancelled')) {
      return MatchStatus.ABANDONED;
    } else if (statusStr.includes('completed') || statusStr.includes('finished')) {
      return MatchStatus.COMPLETED;
    } else if (statusStr.includes('rain') || statusStr.includes('delayed')) {
      return MatchStatus.RAIN_DELAY;
    }

    // Check finished flag
    if (apiMatch.finished === true) {
      return MatchStatus.COMPLETED;
    }

    // Check deleted flag after explicit status handling
    if (apiMatch.deleted === true) {
      return apiMatch.resultSummary ? MatchStatus.COMPLETED : MatchStatus.ABANDONED;
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

    if (apiMatch.scheduledStartTime) {
      return new Date(apiMatch.scheduledStartTime);
    }

    if (apiMatch.startTime) {
      return new Date(apiMatch.startTime);
    } else if (apiMatch.date) {
      return new Date(apiMatch.date);
    } else if (apiMatch.timestamp) {
      return new Date(apiMatch.timestamp);
    } else if (apiMatch.lastStateUpdatedAt) {
      return new Date(apiMatch.lastStateUpdatedAt);
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

  private normalizeTeamLabel(value: any): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    return /^(null|undefined)$/i.test(normalized) ? '' : normalized;
  }

  private dedupeMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
    const byKey = new Map<string, MatchCardViewModel>();
    for (const match of matches) {
      const key = this.extractCrexApiKey(match.matchUrl) || match.externalMatchKey || match.matchUrl || match.id;
      const current = byKey.get(key);
      if (!current || this.matchQuality(match) > this.matchQuality(current)
          || (this.matchQuality(match) === this.matchQuality(current) && match.lastUpdated > current.lastUpdated)) {
        byKey.set(key, match);
      }
    }
    return Array.from(byKey.values());
  }

  private extractCrexApiKey(url: string): string {
    const match = String(url || '').split(/[?#]/)[0].match(/-match-updates-([A-Za-z0-9]+)$/);
    return match ? match[1] : '';
  }

  private matchQuality(match: MatchCardViewModel): number {
    const usableNames = match.team1.name !== 'TBD' && match.team2.name !== 'TBD' ? 2 : 0;
    return usableNames + (String(match.matchUrl || '').indexOf('-vs-') !== -1 ? 1 : 0);
  }

  private isLikelyShortTeamName(name: string): boolean {
    const normalized = this.normalizeTeamLabel(name);
    if (!normalized) {
      return true;
    }

    const compact = normalized.replace(/[\s.-]/g, '');
    return compact.length <= 4 || /^[A-Z0-9\s.-]+$/.test(normalized);
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
    if (apiMatch.externalMatchKey) {
      return apiMatch.externalMatchKey;
    }
    if (apiMatch.url) {
      // Extract ID from URL if possible
      const slug = extractSlugFromUrl(apiMatch.url);
      return slug || `match-${Date.now()}`;
    }

    // Fallback to timestamp-based ID
    return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMatchFormat(url: string): string {
    if (!url) {
      return '';
    }

    const lowered = url.toLowerCase();
    if (lowered.indexOf('test') !== -1) {
      return 'TEST';
    }
    if (lowered.indexOf('odi') !== -1) {
      return 'ODI';
    }
    if (lowered.indexOf('t20') !== -1) {
      return 'T20';
    }
    return '';
  }

  private extractSlugCandidate(url: string): string | null {
    const segments = url.split('/').filter(Boolean);
    for (let index = segments.length - 1; index >= 0; index--) {
      const segment = segments[index];
      if (segment.indexOf('-vs-') !== -1) {
        return segment;
      }
    }

    return null;
  }

  private isLiveFeedStatus(status: MatchStatus): boolean {
    return status === MatchStatus.LIVE
      || status === MatchStatus.INNINGS_BREAK
      || status === MatchStatus.RAIN_DELAY;
  }

  private resolveVenue(apiMatch: any, scorecardData?: any): string {
    const explicitVenue = this.normalizeTeamLabel(apiMatch && apiMatch.venue);
    if (explicitVenue) {
      return explicitVenue;
    }

    const scorecardVenue = this.normalizeTeamLabel(scorecardData && scorecardData.venue);
    if (scorecardVenue) {
      return scorecardVenue;
    }

    return 'Venue TBD';
  }

  private findTeam2Boundary(value: string): number {
    if (!value) {
      return -1;
    }

    const segments = value.split('-').filter(Boolean);
    if (segments.length <= 1) {
      return -1;
    }

    const boundaryTokens = new Set([
      'qualifier', 'eliminator', 'final', 'semi-final', 'semifinal', 'quarter-final', 'quarterfinal',
      'test', 'odi', 't20', 't20i', 't10', 'match', 'cup', 'league', 'trophy', 'series', 'championship'
    ]);

    let tokenIndex = -1;
    for (let index = 0; index < segments.length; index++) {
      const token = segments[index].toLowerCase();
      const previous = index > 0 ? segments[index - 1].toLowerCase() : '';

      if (/^\d+(st|nd|rd|th)$/i.test(token) || /^\d+$/.test(token)) {
        tokenIndex = index;
        break;
      }

      if (boundaryTokens.has(token) || boundaryTokens.has(previous + '-' + token)) {
        tokenIndex = index;
        break;
      }
    }

    if (tokenIndex <= 0) {
      return -1;
    }

    return segments.slice(0, tokenIndex).join('-').length;
  }

  private formatSlugWord(word: string): string {
    if (!word) {
      return '';
    }

    if (/^[a-z]{1,4}-w$/i.test(word)) {
      return word.toUpperCase();
    }

    if (/^[a-z]{1,4}$/i.test(word)) {
      return word.toUpperCase();
    }

    if (/^\d+(st|nd|rd|th)$/i.test(word)) {
      return word.toLowerCase();
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
}
