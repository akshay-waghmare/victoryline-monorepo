import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
      map(items => items || []),
      catchError(err => {
        console.error('Failed to fetch news:', err);
        return of([]);
      })
    );
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
