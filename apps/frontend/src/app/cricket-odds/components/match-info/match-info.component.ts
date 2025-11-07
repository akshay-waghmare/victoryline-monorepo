import { Component, Input, OnInit } from '@angular/core';
import { MatchApiService } from '../../match-api.service';

@Component({
  selector: 'app-match-info',
  templateUrl: './match-info.component.html',
  styleUrls: ['./match-info.component.css']
})
export class MatchInfoComponent implements OnInit {
  @Input() matchId!: string;
  @Input() matchInfo?: any; // Existing match info from parent

  matchData: any = null;
  isLoading = false;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    if (this.matchInfo) {
      this.matchData = this.matchInfo;
      console.log('[MatchInfo] Using existing match info data');
    } else if (this.matchId) {
      this.loadMatchInfo();
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
    if (this.matchInfo?.venue) return this.matchInfo.venue;
    if (this.matchData?.venue?.name) return this.matchData.venue.name;
    return 'Venue not available';
  }

  get venueLocation(): string {
    if (!this.matchData?.venue) return '';
    const city = this.matchData.venue.city || '';
    const country = this.matchData.venue.country || '';
    return [city, country].filter(Boolean).join(', ');
  }

  get venueCapacity(): string | null {
    return this.matchData?.venue?.capacity || null;
  }

  get seriesName(): string {
    return this.matchInfo?.series_name || this.matchData?.series || 'Series not available';
  }

  get matchFormat(): string {
    return this.matchData?.format || 'Format not available';
  }

  get matchStatus(): string {
    return this.matchData?.status || 'Status not available';
  }

  get matchDate(): string {
    return this.matchInfo?.match_date || this.matchData?.startTime || null;
  }

  get tossInfo(): string {
    if (this.matchInfo?.toss_info) return this.matchInfo.toss_info;
    if (this.matchData?.toss) {
      const decision = this.matchData.toss.decision === 'BAT' ? 'bat' : 'field';
      return `Toss won and chose to ${decision}`;
    }
    return 'Toss information not available';
  }

  get officials(): any {
    return this.matchData?.officials || {};
  }
}
