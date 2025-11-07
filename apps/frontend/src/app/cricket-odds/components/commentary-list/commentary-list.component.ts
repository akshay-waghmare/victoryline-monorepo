import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommentaryEntry, CommentaryType, CommentaryPage } from '../../../shared/models/match.models';
import { MatchLiveFacade } from '../../match-live.facade';
import { MatchApiService } from '../../match-api.service';
import { AnalyticsService } from '../../analytics.service';

@Component({
  selector: 'app-commentary-list',
  templateUrl: './commentary-list.component.html',
  styleUrls: ['./commentary-list.component.css']
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
}
