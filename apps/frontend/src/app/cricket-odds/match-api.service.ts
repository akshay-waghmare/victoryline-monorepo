import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchApiService {
  private readonly base = environment.REST_API_URL.replace(/\/$/, '') + '/api/v1';

  constructor(private http: HttpClient) {}

  getSnapshot(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/snapshot`);
  }

  getCommentary(matchId: string, page = 1, pageSize = 30): Observable<any> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/commentary`, { params });
  }

  getScorecard(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/scorecard`);
  }

  getLineups(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/lineups`);
  }

  getMatchInfo(matchId: string): Observable<any> {
    return this.http.get(`${this.base}/matches/${encodeURIComponent(matchId)}/info`);
  }
}
