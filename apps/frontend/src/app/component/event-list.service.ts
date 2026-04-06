import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RxStompService } from '@stomp/ng2-stompjs';
import { map } from 'rxjs/operators';
import { N_ROUTES } from 'src/app/constants/constants';

@Injectable({
  providedIn: 'root'
})
export class EventListService {
  private live_matches_url = environment.REST_API_URL + 'cricket-data/' + 'live-matches';
  private upcoming_matches_url = environment.REST_API_URL + 'cricket-data/' + 'upcoming-matches';
  private completed_matches_url = environment.REST_API_URL + 'cricket-data/' + 'completed-matches';
  private entity_url = environment.REST_API_URL + 'events';
  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });
  constructor(private _http: HttpClient, private rxStompService: RxStompService) {
  }
  
  getUserBetsForMatch(matchUrl: any) {
    throw new Error('Method not implemented.');
  }
  getEvents(): Observable<any> {
    return this.getNoCache(this.entity_url);
  }

  getLiveMatches() {
    return this.getNoCache(this.live_matches_url);
  }

  getUpcomingMatches() {
    return this.getNoCache(this.upcoming_matches_url);
  }

  getCompletedMatches() {
    return this.getNoCache(this.completed_matches_url);
  }

  subscribeToEventsTopic(): Observable<any> {
    return this.rxStompService.watch('/topic/live-matches');
  }

  subscribeToBetStatusTopic(): Observable<any> {
    return this.rxStompService.watch('/topic/bet-status');
  }

  /// this url will be sent to the backend to activate the scraping logic for the new match
  sendLinkToBackend(urlToSend: String) {
    //post request to the backend with the url as payload
    return this._http.post(environment.REST_API_URL + 'cricket-data/' + 'scrape-live-match', { url: urlToSend });
  }

  getResultsWithIcons() {
    return this.getEvents().pipe(
      map(data => {
        return data.map(({ id, name }) => {
          const entry = N_ROUTES.filter(x => x.title === name);
          const icon = entry[0]['icon'];
          return ({ id, name, title: name, icon: icon, path: entry[0]['path'] });
        });
      })
    );
  }

  private getNoCache(url: string): Observable<any> {
    return this._http.get(url, {
      headers: this.noCacheHeaders,
      params: new HttpParams().set('_ts', Date.now().toString())
    });
  }
}
