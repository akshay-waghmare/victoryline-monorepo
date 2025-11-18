/**
 * Upcoming Matches Service
 * Purpose: Fetch and manage upcoming/scheduled matches from Feature 005 API
 * Created: 2025-11-18
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface UpcomingMatchDTO {
  id: number;
  source: string;
  sourceKey: string;
  seriesName: string;
  matchTitle: string;
  teamA: TeamDTO;
  teamB: TeamDTO;
  startTime: number; // Unix timestamp (seconds since epoch)
  venue?: VenueDTO;
  status: string;
  notes?: string;
  lastUpdated: number;
}

export interface TeamDTO {
  name: string;
  code?: string;
}

export interface VenueDTO {
  name?: string;
  city?: string;
  country?: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class UpcomingMatchesService {
  private apiUrl = environment.REST_API_URL + 'api/v1/matches/upcoming';

  constructor(private http: HttpClient) {}

  /**
   * Get upcoming matches with optional filters
   * @param page Page number (0-indexed)
   * @param size Number of items per page
   * @param status Filter by status (scheduled, postponed, cancelled)
   * @param sort Sort order (e.g., 'startTime,asc')
   */
  getUpcomingMatches(
    page: number = 0,
    size: number = 20,
    status?: string,
    sort: string = 'startTime,asc'
  ): Observable<PagedResponse<UpcomingMatchDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<PagedResponse<UpcomingMatchDTO>>>(this.apiUrl, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error('Failed to fetch upcoming matches');
        })
      );
  }

  /**
   * Get all upcoming scheduled matches (no pagination limit)
   */
  getAllScheduledMatches(): Observable<UpcomingMatchDTO[]> {
    return this.getUpcomingMatches(0, 100, 'scheduled').pipe(
      map(response => response.items)
    );
  }

  /**
   * Create or update an upcoming match
   * @param match Match data to create/update
   */
  createOrUpdateMatch(match: Partial<UpcomingMatchDTO>): Observable<UpcomingMatchDTO> {
    return this.http.post<ApiResponse<UpcomingMatchDTO>>(this.apiUrl, match)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error('Failed to create/update match');
        })
      );
  }

  /**
   * Get a single upcoming match by ID
   * @param id Match ID
   */
  getMatchById(id: number): Observable<UpcomingMatchDTO> {
    return this.http.get<ApiResponse<UpcomingMatchDTO>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error('Failed to fetch match');
        })
      );
  }

  /**
   * Delete an upcoming match
   * @param id Match ID
   */
  deleteMatch(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error('Failed to delete match');
          }
        })
      );
  }
}
