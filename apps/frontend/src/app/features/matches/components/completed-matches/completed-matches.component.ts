/**
 * Completed Matches Component
 * Feature: 006-completed-matches-display
 * Purpose: Display last 20 completed matches with series information
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, retry, delay, retryWhen, scan, tap } from 'rxjs/operators';
import { MatchesService } from '../../services/matches.service';
import { CompletedMatch } from '../../../../shared/models/completed-match.models';

@Component({
  selector: 'app-completed-matches',
  templateUrl: './completed-matches.component.html',
  styleUrls: ['./completed-matches.component.css']
})
export class CompletedMatchesComponent implements OnInit, OnDestroy {
  
  matches: CompletedMatch[] = [];
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private retryCount = 0;
  private maxRetries = 3;

  constructor(private matchesService: MatchesService) {}

  ngOnInit(): void {
    this.loadCompletedMatches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load completed matches from API with exponential backoff retry (T033)
   */
  loadCompletedMatches(): void {
    this.loading = true;
    this.error = null;
    this.retryCount = 0;

    this.matchesService.getCompletedMatches()
      .pipe(
        retryWhen(errors => errors.pipe(
          scan((retryCount, error) => {
            this.retryCount = retryCount + 1;
            if (this.retryCount > this.maxRetries) {
              throw error;
            }
            const delayMs = Math.pow(2, this.retryCount - 1) * 1000;
            console.log(`Retry attempt ${this.retryCount} after ${delayMs / 1000}s`);
            return this.retryCount;
          }, 0),
          tap(retryCount => delay(Math.pow(2, retryCount - 1) * 1000))
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(
        (matches) => {
          this.matches = matches;
          this.loading = false;
          console.log('Loaded completed matches:', matches.length);
        },
        (error) => {
          this.error = 'Failed to load completed matches. Please try again.';
          this.loading = false;
          console.error('Error loading completed matches after retries:', error);
        }
      );
  }

  /**
   * Retry loading matches
   */
  retry(): void {
    this.loadCompletedMatches();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Navigate to match details
   */
  viewMatchDetails(match: CompletedMatch): void {
    if (match.matchLink) {
      window.open(match.matchLink, '_blank');
    }
  }

  /**
   * Track by function for ngFor performance
   */
  trackByMatchId(index: number, match: CompletedMatch): number {
    return match.matchId;
  }
}
