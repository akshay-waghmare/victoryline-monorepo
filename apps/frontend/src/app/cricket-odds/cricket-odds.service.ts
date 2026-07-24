import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, concat, EMPTY } from 'rxjs';
import { tap, filter, catchError, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorage } from '../token.storage';

/**
 * Stale-While-Revalidate cache entry.
 * Stores serialized JSON + timestamp for TTL checks.
 */
interface CacheEntry {
  data: string;   // JSON-serialized payload
  ts: number;     // epoch ms when cached
}

export interface PlayerStatsSnapshotView {
  category: string;
  label: string;
  capturedAt?: number | null;
  payload?: any;
}

export interface PlayerStatsSquadPlayerView {
  externalId?: string;
  name: string;
  shortName?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  imageUrl?: string;
  captain?: boolean;
  wicketKeeper?: boolean;
  probable?: boolean;
  announced?: boolean;
  lineupOrder?: number;
  stats?: PlayerStatsSnapshotView[];
}

export interface PlayerStatsTeamView {
  externalId?: string;
  name: string;
  shortName?: string;
  teamCode?: string;
  squad?: PlayerStatsSquadPlayerView[];
}

export interface PlayerStatsSeriesView {
  externalId?: string;
  name?: string;
  shortName?: string;
  seasonName?: string;
}

export interface PlayerStatsMatchView {
  url?: string;
  matchExternalKey?: string;
  liveMatchId?: number;
  source?: string;
  series?: PlayerStatsSeriesView | null;
  teams?: PlayerStatsTeamView[];
}

export interface PlayerStatsPlayerDetailView {
  url?: string;
  source?: string;
  externalId?: string;
  name?: string;
  shortName?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  imageUrl?: string;
  stats?: PlayerStatsSnapshotView[];
}

export interface PlayerStatsTeamDetailView {
  url?: string;
  source?: string;
  externalId?: string;
  name?: string;
  shortName?: string;
  teamCode?: string;
  stats?: PlayerStatsSnapshotView[];
}

export interface PlayerStatsSeriesDetailView {
  url?: string;
  source?: string;
  series?: PlayerStatsSeriesView | null;
  standings?: PlayerStatsSnapshotView[];
  stats?: PlayerStatsSnapshotView[];
}

@Injectable({
  providedIn: 'root'
})
export class CricketService {
  private entity_bet_history = environment.REST_API_URL + 'cricket-data/'+'bet/history';
  private profitLossEndpoint = environment.REST_API_URL + 'cricket-data/'+'bet/profit-loss';
  private lastUpdatedCricketData = environment.REST_API_URL + 'cricket-data';
  private  placeBetEndpoint = environment.REST_API_URL + 'cricket-data/' + 'placeBet';
  private  getAllbetsFormatch = environment.REST_API_URL + 'cricket-data/' + 'bets/';
  private  getMatchInfoDetails = environment.REST_API_URL + 'cricket-data/' + 'match-info/get';
  private  getScorecardDetails = environment.REST_API_URL + 'cricket-data/' + 'sC4-stats/get';
  private  getPlayerStatsDetails = environment.REST_API_URL + 'crawler/player-stats/match';
  private  getPlayerStatsPlayerDetails = environment.REST_API_URL + 'crawler/player-stats/player';
  private  getPlayerStatsTeamDetails = environment.REST_API_URL + 'crawler/player-stats/team';
  private  getPlayerStatsSeriesDetails = environment.REST_API_URL + 'crawler/player-stats/series';
  private  getPlayerStatsSeriesStandingsDetails = environment.REST_API_URL + 'crawler/player-stats/series/standings';
  private listPlayersEndpoint = environment.REST_API_URL + 'crawler/player-stats/players';
  private listTeamsEndpoint = environment.REST_API_URL + 'crawler/player-stats/teams/list';
  private listSeriesEndpoint = environment.REST_API_URL + 'crawler/player-stats/series/list';
  private  getAllbetsFormatchNonUserBased= environment.REST_API_URL + 'cricket-data/' + 'get-match-bet-with-exposure/';

  /** In-memory cache for match data (stale-while-revalidate) */
  private matchDataCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for match info */
  private matchInfoCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for scorecard data */
  private scorecardCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for player stats snapshots */
  private playerStatsCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for player/team/series detail reads */
  private playerStatsReferenceCache: Map<string, CacheEntry> = new Map();
  /** Max age before cache is considered stale (5 minutes) */
  private readonly CACHE_MAX_AGE_MS = 5 * 60 * 1000;
  /** SessionStorage key prefix */
  private readonly CACHE_PREFIX = 'vl_cache_';
  

  constructor(private http: HttpClient , private tokenStorage:TokenStorage,
     ) {
    // Restore caches from sessionStorage on startup
    this.restoreCachesFromStorage();
  }

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + this.tokenStorage.getToken()
  });

  // ─── Cache helpers ───────────────────────────────────────────────

  /** Write to both in-memory map and sessionStorage */
  private setCache(cache: Map<string, CacheEntry>, storageKey: string, key: string, data: any): void {
    const entry: CacheEntry = { data: JSON.stringify(data), ts: Date.now() };
    cache.set(key, entry);
    const storage = this.getSessionStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(this.CACHE_PREFIX + storageKey + '_' + key, JSON.stringify(entry));
    } catch (_) { /* quota exceeded – non-critical */ }
  }

  private getCacheEntry(cache: Map<string, CacheEntry>, storageKey: string, key: string): CacheEntry | null {
    if (!key) {
      return null;
    }

    const entry = cache.get(key);
    if (entry) {
      return entry;
    }

    const storage = this.getSessionStorage();
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(this.CACHE_PREFIX + storageKey + '_' + key);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        cache.set(key, parsed);
        return parsed;
      }
    } catch (_) { /* corrupted – ignore */ }

    return null;
  }

  /** Read from in-memory map; returns null if missing */
  private getCache(cache: Map<string, CacheEntry>, storageKey: string, key: string): any | null {
    const entry = this.getCacheEntry(cache, storageKey, key);
    return entry ? JSON.parse(entry.data) : null;
  }

  private clearCache(cache: Map<string, CacheEntry>, storageKey: string, key: string): void {
    if (!key) {
      return;
    }

    cache.delete(key);

    const storage = this.getSessionStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(this.CACHE_PREFIX + storageKey + '_' + key);
    } catch (_) { /* non-critical */ }
  }

  hasFreshPlayerStatsMatchCache(matchUrl?: string, externalMatchKey?: string): boolean {
    const cacheKey = externalMatchKey || matchUrl || '';
    const entry = this.getCacheEntry(this.playerStatsCache, 'playerstats', cacheKey);
    if (!entry) {
      return false;
    }
    return (Date.now() - entry.ts) <= this.CACHE_MAX_AGE_MS;
  }

  /** Restore in-memory maps from sessionStorage on service init */
  private restoreCachesFromStorage(): void {
    const storage = this.getSessionStorage();
    if (!storage) {
      return;
    }

    try {
      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);
        if (fullKey && fullKey.startsWith(this.CACHE_PREFIX)) {
          const raw = storage.getItem(fullKey);
          if (!raw) continue;
          const entry: CacheEntry = JSON.parse(raw);
          const remainder = fullKey.substring(this.CACHE_PREFIX.length);
          if (remainder.startsWith('match_')) {
            this.matchDataCache.set(remainder.substring('match_'.length), entry);
          } else if (remainder.startsWith('info_')) {
            this.matchInfoCache.set(remainder.substring('info_'.length), entry);
          } else if (remainder.startsWith('sc_')) {
            this.scorecardCache.set(remainder.substring('sc_'.length), entry);
          } else if (remainder.startsWith('playerstats_')) {
            this.playerStatsCache.set(remainder.substring('playerstats_'.length), entry);
          } else if (remainder.startsWith('playerstatsref_')) {
            this.playerStatsReferenceCache.set(remainder.substring('playerstatsref_'.length), entry);
          }
        }
      }
    } catch (_) { /* non-critical */ }
  }

  private getSessionStorage(): Storage | null {
    if (typeof window === 'undefined' || (window as any).__SSR__ || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage;
  }

  /**
   * Merge WebSocket partial updates into the existing cache.
   * WebSocket sends individual fields (e.g. {batsman_data: [...]}, {team_odds: {...}})
   * so we must merge rather than replace to keep all fields intact.
   */
  updateMatchDataCache(url: string, partialData: any): void {
    if (!partialData || typeof partialData !== 'object') return;
    const existing = this.getCache(this.matchDataCache, 'match', url);
    const merged = existing ? { ...existing, ...partialData } : partialData;
    this.setCache(this.matchDataCache, 'match', url, merged);
  }

  // ─── Stale-While-Revalidate: Match Data ──────────────────────────

  /**
   * Returns an Observable that:
   * 1. Immediately emits cached data (if available) for instant display
   * 2. Then emits fresh data from server when it arrives
   * 3. Caches the fresh response for future visits
   */
  getLastUpdatedData(url: string): Observable<any> {
    const cached = this.getCache(this.matchDataCache, 'match', url);
    const http$ = this.http.get<any>(`${this.lastUpdatedCricketData}/last-updated-data?url=${url}`).pipe(
      tap(data => {
        if (data) {
          this.setCache(this.matchDataCache, 'match', url, data);
        }
      }),
      catchError(err => {
        if (err && err.status === 404) {
          this.clearCache(this.matchDataCache, 'match', url);
        }
        console.warn('SWR: HTTP error fetching match data, using cache if available', err.status);
        return EMPTY; // Don't propagate error if cache was already emitted
      })
    );

    if (cached) {
      // Emit cached immediately, then fresh from server
      return concat(of(cached), http$);
    }
    return http$;
  }

  placeBet(betDetails: any): Observable<any> {
    return this.http.post<any>(this.placeBetEndpoint, betDetails , {headers:this.headers});
  }

  getUserBetsForMatch(matchUrl: any): Observable<any> {
    return this.http.get<any>(`${this.getAllbetsFormatch}?url=${matchUrl}`, {headers: this.headers});
  }

  /**
   * Stale-while-revalidate for match info.
   * Emits cached data instantly, then fresh data from server.
   */
  getMatchInfo(url: string): Observable<any> {
    const cached = this.getCache(this.matchInfoCache, 'info', url);
    const http$ = this.http.get<any>(`${this.getMatchInfoDetails}?url=${encodeURIComponent(url)}`).pipe(
      // Mobile browsers can leave a fetch pending while the radio changes or
      // Safari resumes a backgrounded tab. Let the caller settle to its
      // route-based fallback instead of holding the Details spinner forever.
      timeout(8000),
      tap(data => {
        if (data) {
          this.setCache(this.matchInfoCache, 'info', url, data);
        }
      }),
      catchError(err => {
        console.warn('SWR: HTTP error fetching match info, using cache if available', err.status);
        return EMPTY;
      })
    );

    if (cached) {
      return concat(of(cached), http$);
    }
    return http$;
  }

  /**
   * Stale-while-revalidate for scorecard data.
   * Emits cached data instantly, then fresh data from server.
   */
  getScorecardInfo(url: string): Observable<any> {
    const cached = this.getCache(this.scorecardCache, 'sc', url);
    const http$ = this.http.get<any>(`${this.getScorecardDetails}?url=${encodeURIComponent(url)}`).pipe(
      tap(data => {
        if (data) {
          this.setCache(this.scorecardCache, 'sc', url, data);
        }
      }),
      catchError(err => {
        console.warn('SWR: HTTP error fetching scorecard, using cache if available', err.status);
        return EMPTY;
      })
    );

    if (cached) {
      return concat(of(cached), http$);
    }
    return http$;
  }

  getPlayerStatsMatch(matchUrl?: string, externalMatchKey?: string): Observable<PlayerStatsMatchView | null> {
    const cacheKey = externalMatchKey || matchUrl || '';
    if (!cacheKey) {
      return of(null);
    }

    const cached = this.getCache(this.playerStatsCache, 'playerstats', cacheKey);
    let params = new HttpParams();
    if (matchUrl && !externalMatchKey) {
      params = params.set('url', matchUrl);
    }
    if (externalMatchKey) {
      params = params.set('externalMatchKey', externalMatchKey);
    }

    const http$ = this.http.get<PlayerStatsMatchView>(this.getPlayerStatsDetails, { params: params }).pipe(
      tap(data => {
        if (data) {
          this.setCache(this.playerStatsCache, 'playerstats', cacheKey, data);
        }
      }),
      catchError(err => {
        if (err && err.status !== 404) {
          console.warn('SWR: HTTP error fetching player stats, using cache if available', err.status);
        }
        return cached ? EMPTY : of(null);
      })
    );

    if (cached) {
      return concat(of(cached), http$);
    }
    return http$;
  }

  getPlayerStatsPlayer(externalId?: string, source?: string): Observable<PlayerStatsPlayerDetailView | null> {
    return this.getPlayerStatsReference<PlayerStatsPlayerDetailView>(
      this.getPlayerStatsPlayerDetails,
      'player',
      externalId,
      source
    );
  }

  getPlayerStatsTeam(externalId?: string, source?: string): Observable<PlayerStatsTeamDetailView | null> {
    return this.getPlayerStatsReference<PlayerStatsTeamDetailView>(
      this.getPlayerStatsTeamDetails,
      'team',
      externalId,
      source
    );
  }

  getPlayerStatsSeries(externalId?: string, source?: string): Observable<PlayerStatsSeriesDetailView | null> {
    return this.getPlayerStatsReference<PlayerStatsSeriesDetailView>(
      this.getPlayerStatsSeriesDetails,
      'series',
      externalId,
      source
    );
  }

  getPlayerStatsSeriesStandings(externalId?: string, source?: string): Observable<PlayerStatsSeriesDetailView | null> {
    return this.getPlayerStatsReference<PlayerStatsSeriesDetailView>(
      this.getPlayerStatsSeriesStandingsDetails,
      'series-standings',
      externalId,
      source
    );
  }

  listPlayers(source?: string, query?: string): Observable<any[]> {
    let params = new HttpParams();
    if (source) { params = params.set('source', source); }
    if (query) { params = params.set('q', query); }
    return this.http.get<any[]>(this.listPlayersEndpoint, { params: params }).pipe(
      catchError(() => of([]))
    );
  }

  listTeams(source?: string, query?: string): Observable<any[]> {
    let params = new HttpParams();
    if (source) { params = params.set('source', source); }
    if (query) { params = params.set('q', query); }
    return this.http.get<any[]>(this.listTeamsEndpoint, { params: params }).pipe(
      catchError(() => of([]))
    );
  }

  listSeries(source?: string, query?: string): Observable<any[]> {
    let params = new HttpParams();
    if (source) { params = params.set('source', source); }
    if (query) { params = params.set('q', query); }
    return this.http.get<any[]>(this.listSeriesEndpoint, { params: params }).pipe(
      catchError(() => of([]))
    );
  }

  private getPlayerStatsReference<T>(endpoint: string, scope: string, externalId?: string, source?: string): Observable<T | null> {
    if (!externalId) {
      return of(null);
    }

    const cacheKey = `${scope}|${source || 'default'}|${externalId}`;
    const cached = this.getCache(this.playerStatsReferenceCache, 'playerstatsref', cacheKey);
    let params = new HttpParams().set('externalId', externalId);
    if (source) {
      params = params.set('source', source);
    }

    const http$: Observable<T | null> = this.http.get<T>(endpoint, { params: params }).pipe(
      tap(data => {
        if (data) {
          this.setCache(this.playerStatsReferenceCache, 'playerstatsref', cacheKey, data);
        }
      }),
      catchError(err => {
        if (err && err.status !== 404) {
          console.warn('SWR: HTTP error fetching player stats reference data, using cache if available', err.status);
        }
        return cached ? EMPTY : of(null as T | null);
      })
    );

    if (cached) {
      return concat(of(cached), http$);
    }
    return http$;
  }

  getUserBetsForMatchNonUserBased(): Observable<any> {
    return this.http.get<any>(this.getAllbetsFormatchNonUserBased, {headers: this.headers});
  }

  getUserBetHistory(): Observable<any> {
    return this.http.get(this.entity_bet_history, { headers: this.headers });
  }

  getProfitLoss(startDate: Date, endDate: Date): Observable<any> {
    const startOfDay = this.getStartOfDay(startDate).toISOString();
    const endOfDay = this.getEndOfDay(endDate).toISOString();
    let params = new HttpParams().set('startDate', startOfDay).set('endDate', endOfDay);
    return this.http.get(this.profitLossEndpoint, { headers: this.headers, params: params });
  }

 

  getStartOfDay(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      return new Date();
    }
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  getEndOfDay(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      return new Date();
    }
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

}
