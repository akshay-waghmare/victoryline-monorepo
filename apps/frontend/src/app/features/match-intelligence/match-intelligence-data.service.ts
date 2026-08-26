import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, map, switchMap, timeout } from 'rxjs/operators';
import { CricketService } from '../../cricket-odds/cricket-odds.service';
import { MatchStatus, MatchCardViewModel } from '../matches/models/match-card.models';
import { extractSlugFromUrl } from '../../core/utils/match-utils';
import { environment } from 'src/environments/environment';

declare const process: any;

export interface PublicPredictionMatch {
  slug: string;
  title: string;
  league?: string;
  status?: string;
  probability_team?: string | null;
  score?: string | null;
  overs?: string | null;
  batting_team?: string | null;
  bowling_team?: string | null;
  win_probability_pct?: number | null;
  projection_label?: string | null;
  insight?: string | null;
  updated_at?: string | number | null;
  detail_url?: string | null;
  match_url?: string | null;
  format_label?: string | null;
  model_mode?: string | null;
  model_source?: string | null;
  model_label?: string | null;
  expected_final_score?: number | null;
  projected_score?: number | null;
  innings?: number | null;
  current_run_rate?: number | null;
  required_run_rate?: number | null;
  venue_average_score?: number | null;
  resource_pct?: number | null;
  resource_win_probability_pct?: number | null;
  score_vs_par?: number | null;
  pressure_index?: number | null;
  last_swings?: Array<{ over?: string; score?: string; win_probability_pct?: number; label?: string; innings?: number }>;
  prediction_history?: Array<{ over?: string; score?: string; win_probability_pct?: number; expected_final_score?: number; projected_score?: number; innings?: number }>;
  reasons?: string[];
  explanation_pack?: {
    venue_behaviour?: string | null;
    toss_impact?: string | null;
    expected_score?: number | null;
    expected_wickets?: number | null;
    turning_point?: { over?: string; score?: string; label?: string } | null;
    probability_swing?: { before?: number; after?: number; delta?: number | null } | null;
  };
  historical_archive_id?: string | null;
  historical_snapshot?: boolean;
  prediction_snapshot_at?: string | null;
  final_winner?: string | null;
}

interface PublicPredictionMatchesResponse {
  matches?: PublicPredictionMatch[];
}

interface PublicPredictionMatchResponse {
  match?: PublicPredictionMatch;
}

export interface PublicPredictionHistoryRecord {
  archive_id: string;
  status: string;
  archived_at?: string | null;
  league?: string | null;
  match_label: string;
  match_url?: string | null;
  public_slug_aliases?: string[];
  prediction?: {
    timestamp?: string | null;
    predicted_side?: string | null;
    predicted_probability_pct?: number | null;
    model_label?: string | null;
  };
  outcome?: {
    winner?: string | null;
    evidence?: string | null;
    verified_at?: string | null;
  };
  integrity?: {
    source?: string | null;
    source_sha256?: string | null;
  };
}

export interface PublicPredictionCalibrationBucket {
  lower: number;
  upper: number;
  forecast_mean?: number | null;
  observed_rate?: number | null;
  count: number;
}

export interface PublicPredictionHistorySummary {
  status: 'not_ready' | 'collecting' | 'ready';
  league: string;
  record_count: number;
  eligible_match_count: number;
  excluded_record_count: number;
  metrics: {
    accuracy_pct?: number | null;
    wins: number;
    losses: number;
    brier?: number | null;
    ece?: number | null;
    log_loss?: number | null;
  };
  calibration: PublicPredictionCalibrationBucket[];
  definitions: { [key: string]: string };
  generated_at?: string;
  records?: PublicPredictionHistoryRecord[];
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
  private readonly freshnessLimitMs = 5 * 60 * 1000;
  private readonly openingArtifactFreshnessLimitMs = 24 * 60 * 60 * 1000;

  constructor(
    private http: HttpClient,
    private cricketService: CricketService
  ) {}

  loadSnapshot(slug: string): Observable<MatchIntelligenceSnapshot> {
    return forkJoin([
      this.loadPublicPredictionMatches().pipe(
        catchError(() => of([]))
      ),
      this.cricketService.getMatchInfo(slug).pipe(
        timeout(5000),
        defaultIfEmpty(null),
        catchError(() => of(null))
      ),
      this.cricketService.getLastUpdatedData(slug).pipe(
        timeout(5000),
        defaultIfEmpty(null),
        catchError(() => of(null))
      )
    ]).pipe(
      map(([publicMatches, matchInfo, matchData]) => {
        // The route slug is already the authoritative match key. Do not load
        // the entire live/upcoming/completed catalog just to resolve one page.
        var currentMatch = null;
        var publicPrediction = this.findPublicPrediction(slug, currentMatch, matchInfo, publicMatches || []);
        var lifecycle = this.resolveLifecycle(currentMatch, matchInfo, publicPrediction);
        var mergedMatchData = this.mergePublicPrediction(matchData, publicPrediction);
        var freshnessState = this.resolveFreshnessState(mergedMatchData, publicPrediction, lifecycle);

        return {
          slug: slug,
          currentMatch: currentMatch,
          matchInfo: matchInfo,
          matchData: mergedMatchData,
          publicPrediction: publicPrediction,
          lifecycle: lifecycle,
          freshnessState: freshnessState
        };
      }),
      switchMap((snapshot) => {
        var publicPrediction = snapshot.publicPrediction;
        if (!publicPrediction || !publicPrediction.slug) {
          return this.loadPublicPredictionBySource(slug).pipe(
            map((detail) => detail ? Object.assign({}, snapshot, {
              publicPrediction: detail,
              matchData: this.mergePublicPrediction(snapshot.matchData, detail),
              lifecycle: this.resolveLifecycle(snapshot.currentMatch, snapshot.matchInfo, detail),
              freshnessState: this.resolveFreshnessState(
                this.mergePublicPrediction(snapshot.matchData, detail),
                detail,
                this.resolveLifecycle(snapshot.currentMatch, snapshot.matchInfo, detail)
              )
            }) : snapshot),
            catchError(() => of(snapshot))
          );
        }

        return this.loadPublicPredictionDetail(publicPrediction.slug).pipe(
          map((detail) => {
            if (!detail) {
              return snapshot;
            }
            var mergedMatchData = this.mergePublicPrediction(snapshot.matchData, detail);
            return Object.assign({}, snapshot, {
              publicPrediction: detail,
              matchData: mergedMatchData,
              freshnessState: this.resolveFreshnessState(mergedMatchData, detail, snapshot.lifecycle)
            });
          }),
          catchError(() => of(snapshot))
        );
      })
    );
  }

  private resolveLifecycle(currentMatch: MatchCardViewModel | null, matchInfo: any, publicPrediction?: PublicPredictionMatch | null): 'upcoming' | 'live' | 'completed' | 'unknown' {
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

    var publicStatus = String((publicPrediction && publicPrediction.status) || '').toLowerCase();
    if (publicStatus === 'running' || publicStatus === 'live') {
      return 'live';
    }
    if (publicStatus === 'completed' || publicStatus === 'complete') {
      return 'completed';
    }
    if (publicStatus === 'upcoming' || publicStatus === 'scheduled') {
      return 'upcoming';
    }

    return 'unknown';
  }

  private resolveFreshnessState(
    matchData: any,
    publicPrediction?: PublicPredictionMatch | null,
    lifecycle?: 'upcoming' | 'live' | 'completed' | 'unknown'
  ): 'fresh' | 'stale' | 'unavailable' {
    if (!matchData) {
      return 'unavailable';
    }

    // Prefer the public model timestamp when it is available. The score-feed
    // `lastUpdated` can be a numeric epoch and describes a different handoff;
    // letting it mask `updated_at` can suppress an otherwise fresh model view.
    var timestamp = matchData.updated_at || matchData.updatedAt || matchData.last_updated || matchData.lastUpdated;
    if (timestamp) {
      var parsed = typeof timestamp === 'number' ? timestamp : this.parseProviderTimestamp(timestamp);
      if (!isNaN(parsed)) {
        // Opening rows are immutable, bounded historical artifacts rather
        // than live score updates.  Their serving contract enforces a 24-hour
        // TTL; applying the live five-minute clock would hide a valid upcoming
        // answer between artifact refreshes.
        var isOpeningArtifact = lifecycle === 'upcoming'
          && String((publicPrediction && publicPrediction.model_source) || '').toLowerCase() === 'opening_team_strength';
        var limit = isOpeningArtifact ? this.openingArtifactFreshnessLimitMs : this.freshnessLimitMs;
        return Date.now() - parsed <= limit ? 'fresh' : 'stale';
      }
    }

    return 'stale';
  }

  private parseProviderTimestamp(value: any): number {
    if (typeof value === 'number') {
      return value;
    }

    var timestamp = String(value || '').trim();
    if (!timestamp) {
      return NaN;
    }

    // The model writer historically emitted UTC ISO timestamps without a
    // timezone suffix. Treat that legacy contract as UTC rather than allowing
    // each browser locale to reinterpret the same live update differently.
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)) {
      timestamp += 'Z';
    }

    return Date.parse(timestamp);
  }

  loadPublicPredictionMatches(): Observable<PublicPredictionMatch[]> {
    var publicPredictionApiUrl = this.getPublicPredictionApiUrl();
    if (!publicPredictionApiUrl) {
      return of([]);
    }

    return this.http.get<PublicPredictionMatchesResponse>(publicPredictionApiUrl + '/matches').pipe(
      timeout(4000),
      map((response) => (response && Array.isArray(response.matches)) ? response.matches : []),
      catchError(() => of([]))
    );
  }

  loadPublicPredictionDetail(slug: string): Observable<PublicPredictionMatch | null> {
    var publicPredictionApiUrl = this.getPublicPredictionApiUrl();
    if (!publicPredictionApiUrl || !slug) {
      return of(null);
    }

    return this.http.get<PublicPredictionMatchResponse>(
      publicPredictionApiUrl + '/matches/' + encodeURIComponent(slug)
    ).pipe(
      timeout(4000),
      map((response) => response && response.match ? response.match : null),
      catchError(() => of(null))
    );
  }

  loadPublicPredictionHistory(league?: string): Observable<PublicPredictionHistorySummary | null> {
    var publicPredictionApiUrl = this.getPublicPredictionApiUrl();
    if (!publicPredictionApiUrl) {
      return of(null);
    }
    var query = league ? '?league=' + encodeURIComponent(league) : '';
    return this.http.get<PublicPredictionHistorySummary>(publicPredictionApiUrl + '/history' + query).pipe(
      timeout(4000),
      map((response) => response || null),
      catchError(() => of(null))
    );
  }

  loadPublicPredictionHistoricalDetail(archiveId: string): Observable<PublicPredictionHistoryRecord | null> {
    var publicPredictionApiUrl = this.getPublicPredictionApiUrl();
    if (!publicPredictionApiUrl || !archiveId) {
      return of(null);
    }
    return this.http.get<{ record?: PublicPredictionHistoryRecord }>(
      publicPredictionApiUrl + '/history/' + encodeURIComponent(archiveId)
    ).pipe(
      timeout(4000),
      map((response) => response && response.record ? response.record : null),
      catchError(() => of(null))
    );
  }

  private loadPublicPredictionBySource(routeSlug: string): Observable<PublicPredictionMatch | null> {
    var publicPredictionApiUrl = this.getPublicPredictionApiUrl();
    if (!publicPredictionApiUrl || !routeSlug) {
      return of(null);
    }
    var matchUrl = 'https://crex.com/cricket-live-score/' + routeSlug;
    return this.http.get<PublicPredictionMatchResponse>(
      publicPredictionApiUrl + '/matches/resolve?match_url=' + encodeURIComponent(matchUrl)
    ).pipe(
      timeout(4000),
      map((response) => response && response.match ? response.match : null),
      catchError(() => of(null))
    );
  }

  private getPublicPredictionApiUrl(): string {
    if (this.isBrowser()) {
      return environment.MODEL_PUBLIC_API_URL;
    }

    // SSR runs inside the frontend container, where 127.0.0.1 is the
    // frontend itself. Use the explicitly configured dashboard origin so the
    // canonical HTML can include the same fresh public model answer a browser
    // receives through the edge proxy.
    var runtimeProcess: any = typeof process !== 'undefined' ? process : null;
    var serverModelApiUrl = runtimeProcess && runtimeProcess.env && runtimeProcess.env.MODEL_API_URL;
    if (serverModelApiUrl) {
      return String(serverModelApiUrl).replace(/\/+$/, '') + '/api/public';
    }

    return 'http://127.0.0.1:4000' + environment.MODEL_PUBLIC_API_URL;
  }

  /**
   * Public surfaces must not display a percentage when its timestamp is
   * missing or outside the contract's freshness window. Opening rows are
   * bounded historical artifacts and use their longer, explicit TTL.
   */
  isPublicPredictionFresh(prediction: PublicPredictionMatch | null): boolean {
    if (!prediction || !prediction.updated_at) {
      return false;
    }

    var timestamp = typeof prediction.updated_at === 'number'
      ? prediction.updated_at
      : this.parseProviderTimestamp(prediction.updated_at);
    if (isNaN(timestamp)) {
      return false;
    }

    var status = String(prediction.status || '').toLowerCase();
    var isOpeningArtifact = (status === 'upcoming' || status === 'scheduled')
      && String(prediction.model_source || '').toLowerCase() === 'opening_team_strength';
    var freshnessLimit = isOpeningArtifact ? this.openingArtifactFreshnessLimitMs : this.freshnessLimitMs;
    return Date.now() - timestamp <= freshnessLimit;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !(window as any).__SSR__;
  }

  private findPublicPrediction(slug: string, currentMatch: MatchCardViewModel | null, matchInfo: any, publicMatches: PublicPredictionMatch[]): PublicPredictionMatch | null {
    if (!publicMatches || !publicMatches.length) {
      return null;
    }

    // The prediction service retains the exact CREX source URL. Prefer this
    // over display-name matching: live states can abbreviate a team label
    // (for example TAN-W becoming W), but the canonical route remains stable.
    // CREX match identifiers can contain uppercase suffixes (for example
    // `...-131D`).  Angular routes preserve that spelling while a browser or
    // an earlier normalization step may lowercase it, so canonical matching
    // must be explicitly case-insensitive.
    var routeSlug = (extractSlugFromUrl(slug) || String(slug || '').trim()).toLowerCase();
    if (routeSlug) {
      var urlMatch = publicMatches.find((item) =>
        String(extractSlugFromUrl(String(item && item.match_url || '')) || '').toLowerCase() === routeSlug
      );
      if (urlMatch) {
        return urlMatch;
      }

      // A canonical route has an exact CREX source identity.  Never pair a
      // retained result with a current live row simply because abbreviated
      // team names overlap; the caller will resolve the exact source URL from
      // the retained public archive when the rolling feed no longer contains
      // this match.
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
    if (publicPrediction.format_label) {
      merged.format_label = publicPrediction.format_label;
    }
    if (publicPrediction.model_mode) {
      merged.model_mode = publicPrediction.model_mode;
    }
    if (publicPrediction.model_source) {
      merged.model_source = publicPrediction.model_source;
    }
    if (publicPrediction.model_label) {
      merged.model_label = publicPrediction.model_label;
    }
    if (publicPrediction.expected_final_score !== undefined) {
      merged.expected_final_score = publicPrediction.expected_final_score;
    }
    if (publicPrediction.projected_score !== undefined) {
      merged.projected_score = publicPrediction.projected_score;
    }
    ['innings', 'current_run_rate', 'required_run_rate', 'venue_average_score', 'resource_pct',
      'resource_win_probability_pct', 'score_vs_par', 'pressure_index', 'last_swings',
      'prediction_history'].forEach((key) => {
      if ((publicPrediction as any)[key] !== undefined) {
        merged[key] = (publicPrediction as any)[key];
      }
    });
    if (publicPrediction.reasons !== undefined) {
      merged.reasons = publicPrediction.reasons;
    }
    if (publicPrediction.explanation_pack !== undefined) {
      merged.explanation_pack = publicPrediction.explanation_pack;
    }
    return merged;
  }

  private normalizeTeamName(value: string): string {
    return String(value || '')
      .replace(/\bwomen\b/gi, '')
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

    var leftParts = parts[0].split('-').filter(Boolean);
    var left = leftParts.pop();
    if (left === 'w' && leftParts.length) {
      left = leftParts.pop() + '-w';
    }
    var rightSlug = parts[1];
    // Public model slugs use full hyphenated names (for example west-indies),
    // while canonical match slugs often use abbreviations (wi-w).
    var right = rightSlug.indexOf('west-indies') === 0 ? 'west-indies' : rightSlug.split('-').filter(Boolean)[0];
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

    var left = this.extractTeamToken(parts[0]);
    var right = this.extractTeamToken(parts[1]);
    return left && right ? [left, right] : null;
  }

  private extractTeamToken(value: string): string | null {
    var token = String(value || '').toLowerCase();
    var knownTeams = [
      'new-zealand', 'west-indies', 'south-africa', 'sri-lanka', 'united-arab-emirates',
      'england', 'india', 'australia', 'ireland', 'bangladesh', 'pakistan', 'afghanistan',
      'zimbabwe', 'namibia', 'scotland', 'nepal', 'netherlands', 'hong-kong', 'uganda',
      'wi', 'nz', 'sa', 'sl', 'uae', 'hk', 'ugn'
    ];
    var match = knownTeams.find((team) => token === team || token.indexOf(team + '-') === 0);
    if (match) {
      return match;
    }

    var parts = token.split('-').filter(Boolean);
    // Match routes commonly append an event label or opaque match id after
    // the team token (for example `sur-107th-match-...-zxr`). When the
    // complete team name is not in the known list, the leading segment is the
    // stable team token; using the final segment would incorrectly treat the
    // event id as the team.
    if (parts.length > 1) {
      if (parts[1] === 'w' || parts[1] === 'women') {
        return (parts[0] || '') + '-w';
      }
      return parts[0] || null;
    }
    var last = parts.pop();
    if (last === 'w' && parts.length) {
      return parts.pop() + '-w';
    }
    return last || null;
  }

  private teamNameMatches(left: string, right: string): boolean {
    var normalizedLeft = this.normalizeTeamToken(left);
    var normalizedRight = this.normalizeTeamToken(right);
    return normalizedLeft === normalizedRight ||
      (normalizedLeft.length >= 3 && normalizedRight.length >= 3 &&
        (normalizedLeft.indexOf(normalizedRight) === 0 || normalizedRight.indexOf(normalizedLeft) === 0));
  }

  private normalizeTeamToken(value: string): string {
    var token = String(value || '').toLowerCase().replace(/-w$/, '').replace(/-women$/, '').replace(/\s+women$/, '');
    var aliases: { [key: string]: string } = {
      'wi': 'west-indies',
      'west-indies': 'west-indies',
      'nz': 'new-zealand',
      'new-zealand': 'new-zealand',
      'sa': 'south-africa',
      'south-africa': 'south-africa',
      'sl': 'sri-lanka',
      'sri-lanka': 'sri-lanka',
      'hk': 'hong-kong',
      'hong-kong': 'hong-kong',
      'ugn': 'uganda',
      'uganda': 'uganda',
      'uae': 'united-arab-emirates',
      'ire': 'ireland',
      'ireland': 'ireland'
    };
    return aliases[token] || token;
  }
}
