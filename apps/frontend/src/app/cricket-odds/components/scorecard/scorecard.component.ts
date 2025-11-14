import { Component, Input, OnInit } from '@angular/core';
import { MatchApiService } from '../../match-api.service';
import { Innings } from '../../../shared/models/match.models';

@Component({
  selector: 'app-match-scorecard',
  templateUrl: './scorecard.component.html',
  styleUrls: ['./scorecard.component.css']
})
export class ScorecardComponent implements OnInit {
  @Input() matchId?: string;
  @Input() scorecardInfo?: any; // Existing scorecard data from parent

  innings: Innings[] = [];
  isLoading = false;
  selectedInningsIndex = 0;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    if (this.scorecardInfo) {
      // Use existing data if provided
      this.parseExistingScorecardData();
    } else if (this.matchId) {
      // Fetch from API if matchId provided (future implementation)
      // this.loadScorecard();
      console.warn('[ScorecardComponent] API fetch not yet implemented, matchId:', this.matchId);
    }
  }

  private parseExistingScorecardData(): void {
    // Parse existing scorecard data structure to match our model
    if (this.scorecardInfo && this.scorecardInfo.innings) {
      this.innings = this.scorecardInfo.innings;
      console.log('[Scorecard] Using existing scorecard data');
    }
  }

  private loadScorecard(): void {
    this.isLoading = true;
    this.api.getScorecard(this.matchId).subscribe(
      (response: any) => {
        if (response.success && response.data) {
          this.innings = response.data.innings || [];
        }
        this.isLoading = false;
      },
      error => {
        console.error('[Scorecard] Failed to load scorecard:', error);
        this.isLoading = false;
      }
    );
  }

  selectInnings(index: number): void {
    this.selectedInningsIndex = index;
  }

  get selectedInnings(): Innings | null {
    return this.innings[this.selectedInningsIndex] || null;
  }

  calculateStrikeRate(runs: number, balls: number): string {
    if (balls === 0) { return '0.00'; }
    return ((runs / balls) * 100).toFixed(2);
  }

  calculateEconomy(runs: number, overs: number): string {
    if (overs === 0) { return '0.00'; }
    return (runs / overs).toFixed(2);
  }

  formatOvers(overs: number): string {
    const fullOvers = Math.floor(overs);
    const balls = Math.round((overs - fullOvers) * 10);
    return `${fullOvers}.${balls}`;
  }
}
