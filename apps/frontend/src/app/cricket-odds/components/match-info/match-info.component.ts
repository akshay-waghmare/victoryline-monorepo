import { Component, Input, OnInit } from '@angular/core';
import { MatchApiService } from '../../match-api.service';

@Component({
  selector: 'app-match-details-info',
  templateUrl: './match-info.component.html',
  styleUrls: ['./match-info.component.css']
})
export class MatchDetailsInfoComponent implements OnInit {
  @Input() matchId?: string;
  @Input() matchInfo?: any; // Existing match info from parent

  matchData: any = null;
  isLoading = false;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    if (this.matchInfo) {
      this.matchData = this.matchInfo;
      console.log('[MatchDetailsInfo] Using existing match info data');
    } else if (this.matchId) {
      // this.loadMatchInfo(); // Future API implementation
      console.warn('[MatchDetailsInfo] API fetch not yet implemented');
    }
  }

  private loadMatchInfo(): void {
    this.isLoading = true;
    this.api.getMatchInfo(this.matchId).subscribe(
      (response: any) => {
        if (response.success && response.data) {
          this.matchData = response.data;
        }
        this.isLoading = false;
      },
      error => {
        console.error('[MatchInfo] Failed to load match info:', error);
        this.isLoading = false;
      }
    );
  }

  get venueName(): string {
    if (this.matchInfo && this.matchInfo.venue) return this.matchInfo.venue;
    if (this.matchData && this.matchData.venue && this.matchData.venue.name) return this.matchData.venue.name;
    return 'Venue not available';
  }

  get venueLocation(): string {
    if (!this.matchData || !this.matchData.venue) return '';
    const city = this.matchData.venue.city || '';
    const country = this.matchData.venue.country || '';
    return [city, country].filter(Boolean).join(', ');
  }

  get venueCapacity(): string | null {
    return (this.matchData && this.matchData.venue && this.matchData.venue.capacity) || null;
  }

  get seriesName(): string {
    if (this.matchInfo && this.matchInfo.series_name) return this.matchInfo.series_name;
    if (this.matchData && this.matchData.series) return this.matchData.series;
    return 'Series not available';
  }

  get matchFormat(): string {
    return (this.matchData && this.matchData.format) || 'Format not available';
  }

  get matchStatus(): string {
    return (this.matchData && this.matchData.status) || 'Status not available';
  }

  get matchDate(): string {
    if (this.matchInfo && this.matchInfo.match_date) return this.matchInfo.match_date;
    if (this.matchData && this.matchData.startTime) return this.matchData.startTime;
    return null;
  }

  get tossInfo(): string {
    if (this.matchInfo && this.matchInfo.toss_info) return this.matchInfo.toss_info;
    if (this.matchData && this.matchData.toss) {
      const decision = this.matchData.toss.decision === 'BAT' ? 'bat' : 'field';
      return `Toss won and chose to ${decision}`;
    }
    return 'Toss information not available';
  }

  get officials(): any {
    return (this.matchData && this.matchData.officials) || {};
  }
}
