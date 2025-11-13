import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { CommentaryEntry, CommentaryType, CommentaryPage } from '../../../shared/models/match.models';
import { MatchLiveFacade } from '../../match-live.facade';
import { MatchApiService } from '../../match-api.service';
import { AnalyticsService } from '../../analytics.service';

@Component({
  selector: 'app-commentary-list',
  templateUrl: './commentary-list.component.html',
  styleUrls: ['./commentary-list.component.css'],
  animations: [
    /**
     * Fade-in animation for new commentary entries
     * Triggered when new balls are added via live updates
     * Duration: 300ms ease-out
     * Respects prefers-reduced-motion via CSS
     */
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class CommentaryListComponent implements OnInit, OnDestroy {
  @Input() matchId!: string;

  commentaryEntries: CommentaryEntry[] = [];
  isLoading = false;
  loadingMore = false;
  currentPage = 1;
  pageSize = 30;
  totalPages = 1;
  hasMore = false;

  private commentarySub?: Subscription;

  constructor(
    private liveFacade: MatchLiveFacade,
    private api: MatchApiService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    if (!this.matchId) {
      console.error('[CommentaryList] matchId is required');
      return;
    }

    this.loadInitialCommentary();
    this.subscribeToLiveUpdates();
  }

  ngOnDestroy(): void {
    if (this.commentarySub) {
      this.commentarySub.unsubscribe();
    }
  }

  private loadInitialCommentary(): void {
    this.isLoading = true;
    this.api.getCommentary(this.matchId, this.currentPage, this.pageSize).subscribe(
      (response: any) => {
        if (response.success && response.data) {
          const page: CommentaryPage = response.data;
          this.commentaryEntries = page.entries || [];
          this.currentPage = page.page;
          this.totalPages = page.totalPages;
          this.hasMore = this.currentPage < this.totalPages;
        }
        this.isLoading = false;
      },
      error => {
        console.error('[CommentaryList] Failed to load initial commentary:', error);
        this.isLoading = false;
      }
    );
  }

  private subscribeToLiveUpdates(): void {
    this.commentarySub = this.liveFacade.getCommentaryStream().subscribe((newEntry: CommentaryEntry) => {
      if (newEntry && newEntry.matchId === this.matchId) {
        // Prepend new entry (latest-first ordering)
        this.commentaryEntries.unshift(newEntry);
        this.analytics.mark('commentary_append_start');
        this.analytics.mark('commentary_append_end');
        this.analytics.measure('commentary_append', 'commentary_append_start', 'commentary_append_end');
      }
    });
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;

    this.loadingMore = true;
    const nextPage = this.currentPage + 1;

    this.api.getCommentary(this.matchId, nextPage, this.pageSize).subscribe(
      (response: any) => {
        if (response.success && response.data) {
          const page: CommentaryPage = response.data;
          // Append older entries at the end
          this.commentaryEntries.push(...(page.entries || []));
          this.currentPage = page.page;
          this.hasMore = this.currentPage < this.totalPages;
          this.analytics.trackCommentaryLoadMore(this.matchId, this.currentPage);
        }
        this.loadingMore = false;
      },
      error => {
        console.error('[CommentaryList] Failed to load more commentary:', error);
        this.loadingMore = false;
      }
    );
  }

  getEntryClass(entry: CommentaryEntry): string {
    if (entry.type === CommentaryType.WICKET) {
      return 'commentary-wicket';
    } else if (entry.type === CommentaryType.BOUNDARY) {
      return 'commentary-boundary';
    } else if (entry.type === CommentaryType.OVER_SUMMARY) {
      return 'commentary-over-summary';
    }
    return 'commentary-ball';
  }

  getEntryIcon(entry: CommentaryEntry): string {
    switch (entry.type) {
      case CommentaryType.WICKET: return '✕'; // Cross for wicket
      case CommentaryType.BOUNDARY: return '4';
      case CommentaryType.OVER_SUMMARY: return '●';
      default: return '';
    }
  }

  get shouldVirtualize(): boolean {
    return this.commentaryEntries.length > 200;
  }

  /**
   * TrackBy function for *ngFor performance optimization
   * @param index Array index
   * @param entry Commentary entry
   * @returns Unique identifier for entry
   */
  trackByEntryId(index: number, entry: CommentaryEntry): string {
    return entry.id;
  }

  /**
   * Get ARIA label for commentary entry
   * @param entry Commentary entry
   * @returns Descriptive label for screen readers
   */
  getAriaLabel(entry: CommentaryEntry): string {
    const ballInfo = `Over ${entry.overBall}`;
    const typeLabel = entry.type === CommentaryType.WICKET ? 'Wicket' :
                      entry.type === CommentaryType.BOUNDARY ? 'Boundary' :
                      entry.type === CommentaryType.OVER_SUMMARY ? 'Over summary' :
                      'Ball';
    return `${typeLabel} - ${ballInfo}: ${entry.text}`;
  }

  /**
   * Get relative time string from timestamp
   * @param timestamp ISO 8601 timestamp
   * @returns Relative time string (e.g., "2m ago")
   */
  getRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  }
}
