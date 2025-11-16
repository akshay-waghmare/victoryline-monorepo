import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStorage } from '../token.storage';

@Injectable({ providedIn: 'root' })
export class MatchApiService {
  private readonly base = environment.REST_API_URL.replace(/\/$/, '') + '/v1';

  constructor(private http: HttpClient, private tokenStorage: TokenStorage) {}

  private authHeaders(): HttpHeaders {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      Authorization: 'Bearer ' + token
    });
  }

  getSnapshot(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/snapshot`, {
      headers: this.authHeaders()
    });
  }

  getCommentary(matchId: string, page = 1, pageSize = 30): Observable<any> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/commentary`, {
      params,
      headers: this.authHeaders()
    });
  }

  getScorecard(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/scorecard`, {
      headers: this.authHeaders()
    });
  }

  getLineups(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/lineups`, {
      headers: this.authHeaders()
    });
  }

  getMatchInfo(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/info`, {
      headers: this.authHeaders()
    });
  }
}
