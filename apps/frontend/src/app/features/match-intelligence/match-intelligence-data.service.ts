import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, map, switchMap } from 'rxjs/operators';
import { CricketService } from '../../cricket-odds/cricket-odds.service';
import { MatchStatus, MatchCardViewModel } from '../matches/models/match-card.models';
import { MatchesService } from '../matches/services/matches.service';
import { extractSlugFromUrl } from '../../core/utils/match-utils';
import { environment } from 'src/environments/environment';

interface PublicPredictionMatch {
  slug: string;
  title: string;
  league?: string;
  status?: string;
  score?: string | null;
  overs?: string | null;
  batting_team?: string | null;
  bowling_team?: string | null;
  win_probability_pct?: number | null;
  projection_label?: string | null;
  insight?: string | null;
  updated_at?: string | null;
  detail_url?: string | null;
}

interface PublicPredictionMatchesResponse {
  matches?: PublicPredictionMatch[];
}

export interface MatchIntelligenceSnapshot {
  slug: string;
  currentMatch: MatchCardViewModel | null;
  matchInfo: any;
  matchData: any;
  publicPrediction: PublicPredictionMatch | null;
  lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown';
  freshnessState: 'fresh' | 'stale' | 'unavailable';
}

@Injectable({ providedIn: 'root' })
export class MatchIntelligenceDataService {
  constructor(
    private http: HttpClient,
    private cricketService: CricketService,
    private matchesService: MatchesService
  ) {}

  loadSnapshot(slug: string): Observable<MatchIntelligenceSnapshot> {
    return forkJoin([
      this.matchesService.getAllMatches().pipe(
        catchError(() => of([]))
      ),
      this.loadPublicPredictionMatches().pipe(
        catchError(() => of([]))
      )
    ]).pipe(
      switchMap(([matches, publicMatches]) => {
        var currentMatch = (matches || []).find((item) => this.matchesRouteSlug(item, slug)) || null;
        var sourceUrl = currentMatch && currentMatch.matchUrl ? currentMatch.matchUrl : slug;

        return forkJoin([
          of(currentMatch),
          this.cricketService.getMatchInfo(sourceUrl).pipe(
            defaultIfEmpty(null),
            catchError(() => of(null))
          ),
          this.cricketService.getLastUpdatedData(sourceUrl).pipe(
            defaultIfEmpty(null),
            catchError(() => of(null))
          ),
          of(publicMatches || [])
        ]);
      }),
      map(([currentMatch, matchInfo, matchData, publicMatches]) => {
        var lifecycle = this.resolveLifecycle(currentMatch, matchInfo);
        var publicPrediction = this.findPublicPrediction(slug, currentMatch, matchInfo, publicMatches || []);
        var mergedMatchData = this.mergePublicPrediction(matchData, publicPrediction);
        var freshnessState = this.resolveFreshnessState(mergedMatchData);

        return {
          slug: slug,
          currentMatch: currentMatch,
          matchInfo: matchInfo,
          matchData: mergedMatchData,
          publicPrediction: publicPrediction,
          lifecycle: lifecycle,
          freshnessState: freshnessState
        };
      })
    );
  }

  private resolveLifecycle(currentMatch: MatchCardViewModel | null, matchInfo: any): 'upcoming' | 'live' | 'completed' | 'unknown' {
    var status = currentMatch ? currentMatch.status : null;
    if (status === MatchStatus.COMPLETED) {
      return 'completed';
    }
    if (status === MatchStatus.LIVE || status === MatchStatus.INNINGS_BREAK || status === MatchStatus.RAIN_DELAY) {
      return 'live';
    }
    if (status === MatchStatus.UPCOMING) {
      return 'upcoming';
    }

    var infoStatus = String((matchInfo && (matchInfo.match_status || matchInfo.status)) || '').toLowerCase();
    if (infoStatus.indexOf('complete') !== -1 || infoStatus.indexOf('result') !== -1 || infoStatus.indexOf('won') !== -1) {
      return 'completed';
    }
    if (infoStatus.indexOf('live') !== -1 || infoStatus.indexOf('inning') !== -1 || infoStatus.indexOf('delay') !== -1) {
      return 'live';
    }
    if (infoStatus.indexOf('upcoming') !== -1 || infoStatus.indexOf('start') !== -1 || infoStatus.indexOf('toss') !== -1) {
      return 'upcoming';
    }

    return 'unknown';
  }

  private resolveFreshnessState(matchData: any): 'fresh' | 'stale' | 'unavailable' {
    if (!matchData) {
      return 'unavailable';
    }

    if (matchData.lastUpdated || matchData.updatedAt || matchData.last_updated || matchData.updated_at) {
      return 'fresh';
    }

    return 'stale';
  }

  private loadPublicPredictionMatches(): Observable<PublicPredictionMatch[]> {
    var publicPredictionApiUrl = this.isBrowser()
      ? environment.MODEL_PUBLIC_API_URL
      : 'http://127.0.0.1:4000' + environment.MODEL_PUBLIC_API_URL;
    if (!publicPredictionApiUrl) {
      return of([]);
    }

    return this.http.get<PublicPredictionMatchesResponse>(publicPredictionApiUrl + '/matches').pipe(
      map((response) => (response && Array.isArray(response.matches)) ? response.matches : []),
      catchError(() => of([]))
    );
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !(window as any).__SSR__;
  }

  private findPublicPrediction(slug: string, currentMatch: MatchCardViewModel | null, matchInfo: any, publicMatches: PublicPredictionMatch[]): PublicPredictionMatch | null {
    if (!publicMatches || !publicMatches.length) {
      return null;
    }

    var currentMatchupKey = this.extractMatchupKey(
      (currentMatch && currentMatch.matchUrl) || (matchInfo && (matchInfo.match_url || matchInfo.matchUrl)) || ''
    );
    if (currentMatchupKey) {
      var keyMatch = publicMatches.find((item) => this.extractMatchupKey(item && item.slug) === currentMatchupKey);
      if (keyMatch) {
        return keyMatch;
      }
    }

    var routeTeams = this.extractRouteTeams(slug);
    if (routeTeams) {
      var routeMatch = publicMatches.find((item) => {
        var predictionTeams = this.extractRouteTeams(item && item.slug);
        if (predictionTeams &&
          ((this.teamNameMatches(routeTeams[0], predictionTeams[0]) && this.teamNameMatches(routeTeams[1], predictionTeams[1])) ||
            (this.teamNameMatches(routeTeams[0], predictionTeams[1]) && this.teamNameMatches(routeTeams[1], predictionTeams[0])))) {
          return true;
        }

        var title = this.normalizeTitle(item && item.title);
        var routeAbbreviations = [routeTeams[0].slice(0, 3), routeTeams[1].slice(0, 3)];
        return title.indexOf(routeAbbreviations[0]) !== -1 && title.indexOf(routeAbbreviations[1]) !== -1;
      });
      if (routeMatch) {
        return routeMatch;
      }
    }

    var team1 = this.normalizeTeamName((matchInfo && (matchInfo.team1_name || matchInfo.team1Name)) || (currentMatch && currentMatch.team1 && currentMatch.team1.name) || '');
    var team2 = this.normalizeTeamName((matchInfo && (matchInfo.team2_name || matchInfo.team2Name)) || (currentMatch && currentMatch.team2 && currentMatch.team2.name) || '');
    if (!team1 || !team2) {
      return null;
    }

    var exact = publicMatches.find((item) => {
      var normalizedTitle = this.normalizeTitle(item && item.title);
      return normalizedTitle === (team1 + ' vs ' + team2) || normalizedTitle === (team2 + ' vs ' + team1);
    });
    if (exact) {
      return exact;
    }

    return publicMatches.find((item) => {
      var normalizedTitle = this.normalizeTitle(item && item.title);
      return normalizedTitle.indexOf(team1) !== -1 && normalizedTitle.indexOf(team2) !== -1;
    }) || null;
  }

  private mergePublicPrediction(matchData: any, publicPrediction: PublicPredictionMatch | null): any {
    if (!publicPrediction) {
      return matchData;
    }

    var merged = Object.assign({}, matchData || {});
    if (publicPrediction.win_probability_pct !== undefined && publicPrediction.win_probability_pct !== null) {
      merged.win_probability_pct = publicPrediction.win_probability_pct;
    }
    if (publicPrediction.projection_label) {
      merged.projection_label = publicPrediction.projection_label;
    }
    if (publicPrediction.insight) {
      merged.insight = publicPrediction.insight;
    }
    if (publicPrediction.updated_at) {
      merged.updated_at = publicPrediction.updated_at;
    }
    if (publicPrediction.score && !merged.score) {
      merged.score = publicPrediction.score;
    }
    if (publicPrediction.overs && !merged.overs) {
      merged.overs = publicPrediction.overs;
    }
    if (publicPrediction.batting_team && !merged.batting_team) {
      merged.batting_team = publicPrediction.batting_team;
    }
    if (publicPrediction.bowling_team && !merged.bowling_team) {
      merged.bowling_team = publicPrediction.bowling_team;
    }
    return merged;
  }

  private normalizeTeamName(value: string): string {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private normalizeTitle(value: string): string {
    return this.normalizeTeamName(value)
      .replace(/\bversus\b/g, 'vs')
      .replace(/\s+v\s+/g, ' vs ');
  }

  private extractMatchupKey(value: string): string | null {
    var slug = extractSlugFromUrl(String(value || ''));
    if (!slug) {
      slug = String(value || '').trim().toLowerCase();
    }

    if (!slug) {
      return null;
    }

    var parts = slug.split('-vs-');
    if (parts.length !== 2) {
      return null;
    }

    var left = parts[0].split('-').filter(Boolean).pop();
    var right = parts[1].split('-').filter(Boolean)[0];
    if (!left || !right) {
      return null;
    }

    return left + '-vs-' + right;
  }

  private matchesRouteSlug(match: MatchCardViewModel, routeSlug: string): boolean {
    var matchSlug = extractSlugFromUrl((match && match.matchUrl) || '');
    if (matchSlug === routeSlug) {
      return true;
    }

    var routeParts = this.extractRouteTeams(routeSlug);
    var matchParts = this.extractRouteTeams(matchSlug);
    if (!routeParts || !matchParts) {
      return false;
    }

    return this.teamNameMatches(routeParts[0], matchParts[0]) &&
      this.teamNameMatches(routeParts[1], matchParts[1]) ||
      this.teamNameMatches(routeParts[0], matchParts[1]) &&
      this.teamNameMatches(routeParts[1], matchParts[0]);
  }

  private extractRouteTeams(value: string): [string, string] | null {
    var slug = extractSlugFromUrl(String(value || '')) || String(value || '').trim().toLowerCase();
    var parts = slug.split('-vs-');
    if (parts.length !== 2) {
      return null;
    }

    var left = parts[0].split('-').filter(Boolean).pop();
    var right = parts[1].split('-').filter(Boolean)[0];
    return left && right ? [left, right] : null;
  }

  private teamNameMatches(left: string, right: string): boolean {
    return left === right ||
      (left.length >= 3 && right.length >= 3 && (left.indexOf(right) === 0 || right.indexOf(left) === 0));
  }
}
