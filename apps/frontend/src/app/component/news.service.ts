import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface NewsItem {
  newsId: string;
  title: string;
  body: string;
  mediaUrl: string;
  newsUrl: string;
  credit: string;
  createdTimestamp: number;
  fetchedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  private newsUrl = environment.REST_API_URL + 'cricket-data/news';

  constructor(private http: HttpClient) {}

  getNews(): Observable<NewsItem[]> {
    return this.http.get<NewsItem[]>(this.newsUrl).pipe(
      // News is a secondary homepage lane. Never make the first paint wait
      // for a slow upstream feed or an unavailable external source.
      timeout(2500),
      map(items => items || []),
      switchMap(items => {
        if (items.length > 0 || !this.isLocalDevelopment()) {
          return of(items);
        }

        // Keep localhost useful when its news table has not been seeded yet.
        return this.http.get<NewsItem[]>('https://www.crickzen.com/api/cricket-data/news').pipe(
          timeout(2500),
          map(fallbackItems => fallbackItems || []),
          catchError(() => of(items))
        );
      }),
      catchError(err => {
        console.error('Failed to fetch news:', err);
        return of([]);
      })
    );
  }

  private isLocalDevelopment(): boolean {
    return typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  }

  /** Convert Unix timestamp to relative time string */
  getTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
