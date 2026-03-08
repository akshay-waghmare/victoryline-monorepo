import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, concat } from 'rxjs';
import { tap, filter } from 'rxjs/operators';
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
  private  getAllbetsFormatchNonUserBased = environment.REST_API_URL + 'cricket-data/' + 'get-match-bet-with-exposure/';

  /** In-memory cache for match data (stale-while-revalidate) */
  private matchDataCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for match info */
  private matchInfoCache: Map<string, CacheEntry> = new Map();
  /** In-memory cache for scorecard data */
  private scorecardCache: Map<string, CacheEntry> = new Map();
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
    try {
      sessionStorage.setItem(this.CACHE_PREFIX + storageKey + '_' + key, JSON.stringify(entry));
    } catch (_) { /* quota exceeded – non-critical */ }
  }

  /** Read from in-memory map; returns null if missing */
  private getCache(cache: Map<string, CacheEntry>, storageKey: string, key: string): any | null {
    const entry = cache.get(key);
    if (entry) {
      return JSON.parse(entry.data);
    }
    // Fallback: try sessionStorage (cold start after navigation)
    try {
      const raw = sessionStorage.getItem(this.CACHE_PREFIX + storageKey + '_' + key);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        cache.set(key, parsed); // re-hydrate in-memory
        return JSON.parse(parsed.data);
      }
    } catch (_) { /* corrupted – ignore */ }
    return null;
  }

  /** Restore in-memory maps from sessionStorage on service init */
  private restoreCachesFromStorage(): void {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const fullKey = sessionStorage.key(i);
        if (fullKey && fullKey.startsWith(this.CACHE_PREFIX)) {
          const raw = sessionStorage.getItem(fullKey);
          if (!raw) continue;
          const entry: CacheEntry = JSON.parse(raw);
          const remainder = fullKey.substring(this.CACHE_PREFIX.length);
          if (remainder.startsWith('match_')) {
            this.matchDataCache.set(remainder.substring('match_'.length), entry);
          } else if (remainder.startsWith('info_')) {
            this.matchInfoCache.set(remainder.substring('info_'.length), entry);
          } else if (remainder.startsWith('sc_')) {
            this.scorecardCache.set(remainder.substring('sc_'.length), entry);
          }
        }
      }
    } catch (_) { /* non-critical */ }
  }

  /** Update cache when WebSocket pushes arrive (called by component) */
  updateMatchDataCache(url: string, data: any): void {
    this.setCache(this.matchDataCache, 'match', url, data);
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
      tap(data => {
        if (data) {
          this.setCache(this.matchInfoCache, 'info', url, data);
        }
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