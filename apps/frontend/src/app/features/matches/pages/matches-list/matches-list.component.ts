/**
 * Matches List Page Component
 * Purpose: Display all cricket matches in a grid with filtering and search
 * Created: 2025-11-06
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';
import { MatchesService } from '../../services/matches.service';
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, extractSlugFromUrl } from '../../../../core/utils/match-utils';
import { formatCalendarDate } from '../../models/match-status';
import { 
  sortMatchesByPriority, 
  filterMatchesByStatus, 
  searchMatches, 
  filterLiveMatches, 
  prioritizeUpcomingMatchesForDiscovery,
  filterUpcomingMatches, 
  filterCompletedMatches 
} from '../../../../core/utils/match-utils';
import { Tab } from '../../../../shared/components/tab-nav/tab-nav.component';
import { MetaTagsService } from '../../../../seo/meta-tags.service';
import { StructuredDataService } from '../../../../seo/structured-data.service';
import { MatchFreshnessLink, buildFreshnessDiscoveryLinksForMatches } from '../../../../seo/match-freshness-links';

@Component({
  selector: 'app-matches-list',
  templateUrl: './matches-list.component.html',
  styleUrls: ['./matches-list.component.css']
})
export class MatchesListComponent implements OnInit, OnDestroy {
  private static readonly SWIPE_DISTANCE_PX = 72;
  private readonly swipeableStatuses: MatchStatus[] = [
    MatchStatus.LIVE,
    MatchStatus.UPCOMING,
    MatchStatus.COMPLETED
  ];
  private readonly pageSizeByStatus: { [key: string]: number } = {
    [MatchStatus.LIVE]: 12,
    [MatchStatus.UPCOMING]: 24,
    [MatchStatus.COMPLETED]: 24
  };
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private suppressNavigationUntil = 0;
  private hasInitializedStatus = false;
  private visibleMatchCount = this.pageSizeByStatus[MatchStatus.LIVE];

  // Match data
  allMatches: MatchCardViewModel[] = [];
  filteredMatches: MatchCardViewModel[] = [];
  visibleMatches: MatchCardViewModel[] = [];
  upcomingMatchGroups: { label: string; matches: MatchCardViewModel[] }[] = [];
  crawlableMatches: MatchCardViewModel[] = [];
  liveDiscoveryMatches: MatchCardViewModel[] = [];
  upcomingDiscoveryMatches: MatchCardViewModel[] = [];
  recentDiscoveryMatches: MatchCardViewModel[] = [];
  freshnessDiscoveryLinks: MatchFreshnessLink[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Filter state
  selectedStatus: MatchStatus = MatchStatus.LIVE;
  searchQuery = '';
  
  // Tab navigation configuration
  filterTabs: Tab[] = [
    { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: 0 },
    { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: 0 },
    { id: MatchStatus.COMPLETED, label: 'Results', icon: 'check_circle', count: 0 }
  ];
  
  // Expose MatchStatus enum to template
  MatchStatus = MatchStatus;
  
  // Unsubscribe subject
  private destroy$ = new Subject<void>();
  
  constructor(
    private matchesService: MatchesService,
    private router: Router,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService
  ) {}

  ngOnInit(): void {
    this.metaTagsService.setPageMeta('/matches', {
      title: 'Cricket Matches | Live, Upcoming & Completed | Crickzen',
      description: 'Browse live, upcoming, and recently completed cricket matches with direct links to scores, commentary, scorecards, and match updates.',
      canonicalUrl: 'https://www.crickzen.com/matches',
      robots: 'index,follow'
    });
    this.updateStructuredData();
    this.loadMatches();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.structuredDataService.clearPageSchemas();
  }
  
  /**
   * Load matches from service with auto-refresh every 30 seconds
   */
  loadMatches(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.matchesService.getLiveMatchesWithAutoRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (matches) => {
          this.allMatches = sortMatchesByPriority(matches);
          if (!this.hasInitializedStatus) {
            this.selectedStatus = this.getDefaultStatus();
            this.resetVisibleMatchCount();
            this.hasInitializedStatus = true;
          }
          this.updateTabCounts();
          this.applyFilters();
          this.isLoading = false;
          this.updateStructuredData();
          console.log('Matches auto-refreshed:', matches.length);
        },
        (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load matches. Please try again later.';
          this.isLoading = false;
          this.updateStructuredData();
          console.error('Error loading matches:', error);
        }
      );
  }
  
  /**
   * Apply filters and search to matches
   */
  applyFilters(): void {
    let matches = [...this.allMatches];
    
    // Apply status filter
    if (this.selectedStatus === MatchStatus.UPCOMING) {
      matches = filterUpcomingMatches(matches);
    } else {
      matches = filterMatchesByStatus(matches, this.selectedStatus);
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      matches = searchMatches(matches, this.searchQuery.trim());
    }
    
    this.filteredMatches = matches;
    this.visibleMatches = matches.slice(0, this.visibleMatchCount);
    this.upcomingMatchGroups = this.selectedStatus === MatchStatus.UPCOMING
      ? this.buildUpcomingGroups(this.visibleMatches)
      : [];
    this.liveDiscoveryMatches = this.uniqueMatches(filterLiveMatches(this.allMatches), 8);
    this.upcomingDiscoveryMatches = this.uniqueMatches(
      prioritizeUpcomingMatchesForDiscovery(this.allMatches, 30, 120),
      16
    );
    this.recentDiscoveryMatches = this.uniqueMatches(filterCompletedMatches(this.allMatches), 8);
    this.freshnessDiscoveryLinks = this.buildFreshnessDiscoveryLinks();
    this.crawlableMatches = this.uniqueMatches(([] as MatchCardViewModel[])
      .concat(this.liveDiscoveryMatches)
      .concat(this.upcomingDiscoveryMatches)
      .concat(this.recentDiscoveryMatches)
      .concat(this.visibleMatches), 48);
    this.updateStructuredData();
  }
  
  /**
   * Update tab counts based on current matches
   */
  updateTabCounts(): void {
    this.filterTabs = [
      { id: MatchStatus.LIVE, label: 'Live', icon: 'sports_cricket', count: this.liveMatchesCount },
      { id: MatchStatus.UPCOMING, label: 'Upcoming', icon: 'schedule', count: this.upcomingMatchesCount },
      { id: MatchStatus.COMPLETED, label: 'Results', icon: 'check_circle', count: this.completedMatchesCount }
    ];
  }
  
  /**
   * Handle tab change from tab-nav component
   */
  onTabChange(tabId: string): void {
    this.selectedStatus = tabId as MatchStatus;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle status filter change
   */
  onStatusFilterChange(status: MatchStatus): void {
    this.selectedStatus = status;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle search query change
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.resetVisibleMatchCount();
    this.applyFilters();
  }
  
  /**
   * Handle match card click
   */
  onMatchClick(match: MatchCardViewModel): void {
    if (Date.now() < this.suppressNavigationUntil) {
      return;
    }

    // Navigate to match details page (cric-live/:path)
    const slug = this.getMatchSlug(match);
    if (slug) {
      this.router.navigate(['/cric-live', slug], { state: { match: match } });
    } else {
      console.warn('Unable to derive match slug for navigation', match);
    }
  }
  
  /**
   * Handle details button click
   */
  onDetailsClick(match: MatchCardViewModel): void {
    // Navigate to match details page (cric-live/:path)
    const slug = this.getMatchSlug(match);
    if (slug) {
      this.router.navigate(['/cric-live', slug], { state: { match: match } });
    } else {
      console.warn('Unable to derive match slug for navigation', match);
    }
  }

  onResultsTouchStart(event: TouchEvent): void {
    if (!this.isSwipeGestureTarget(event.target)) {
      this.resetSwipeTracking();
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      return;
    }

    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;
  }

  onResultsTouchEnd(event: TouchEvent): void {
    if (this.swipeStartX === null || this.swipeStartY === null) {
      return;
    }

    const changedTouch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;

    if (!changedTouch) {
      this.resetSwipeTracking();
      return;
    }

    const deltaX = changedTouch.clientX - this.swipeStartX;
    const deltaY = changedTouch.clientY - this.swipeStartY;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (horizontalDistance >= MatchesListComponent.SWIPE_DISTANCE_PX && horizontalDistance > verticalDistance * 1.15) {
      this.suppressNavigationUntil = Date.now() + 400;
      this.shiftSelectedStatus(deltaX < 0 ? 1 : -1);
    }

    this.resetSwipeTracking();
  }

  /**
   * Derive the match slug used by the cric-live/:path route from the full match URL or data
   * Expects a crex.com URL ending with '/<slug>/live'. Falls back to match.id if it's already a slug.
   */
  private getMatchSlug(match: MatchCardViewModel): string | null {
    var path = buildCanonicalMatchPath(match);
    if (path) {
      return path.replace(/^\/cric-live\//, '');
    }

    const url = match.matchUrl;
    return url ? extractSlugFromUrl(url) : null;
  }
  
  /**
   * Refresh matches
   */
  onRefresh(): void {
    this.loadMatches();
  }
  
  /**
   * Get count of matches by status
   */
  getMatchCount(status: MatchStatus): number {
    return filterMatchesByStatus(this.allMatches, status).length;
  }
  
  /**
   * Get live matches count
   */
  get liveMatchesCount(): number {
    return filterLiveMatches(this.allMatches).length;
  }
  
  /**
   * Get upcoming matches count
   */
  get upcomingMatchesCount(): number {
    return filterUpcomingMatches(this.allMatches).length;
  }
  
  /**
   * Get completed matches count
   */
  get completedMatchesCount(): number {
    return filterCompletedMatches(this.allMatches).length;
  }
  
  /**
   * TrackBy function for ngFor optimization
   */
  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  getMatchHref(match: MatchCardViewModel): string {
    return buildCanonicalMatchPath(match) || '/matches';
  }

  getMatchLinkLabel(match: MatchCardViewModel): string {
    return buildCanonicalMatchLinkLabel(match);
  }

  trackByFreshnessType(index: number, link: MatchFreshnessLink): string {
    return link.type + '-' + index;
  }

  getStatusCardSummary(status: MatchStatus): string {
    switch (status) {
      case MatchStatus.UPCOMING:
        return this.buildUpcomingStatusSummary();
      case MatchStatus.COMPLETED:
        return this.buildCompletedStatusSummary();
      case MatchStatus.LIVE:
      default:
        return this.buildLiveStatusSummary();
    }
  }

  getEmptyStateMessage(): string {
    if (this.searchQuery) {
      return 'No matches found';
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'No upcoming matches scheduled';
      case MatchStatus.COMPLETED:
        return 'No recent completed matches';
      case MatchStatus.LIVE:
        return 'No live matches right now';
      default:
        return 'No matches found';
    }
  }

  getEmptyStateHint(): string {
    if (this.searchQuery) {
      return 'Try adjusting your search';
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Check back later for new fixtures';
      case MatchStatus.COMPLETED:
        return 'Completed matches will appear here after results are synced';
      case MatchStatus.LIVE:
        return 'Upcoming and completed matches are available in the other tabs';
      default:
        return 'Check back later for updates';
    }
  }

  getSelectedStatusTitle(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Upcoming fixtures';
      case MatchStatus.COMPLETED:
        return 'Recent results';
      case MatchStatus.LIVE:
        return 'Live matches';
      default:
        return 'Matches';
    }
  }

  getStatusDescription(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Fixture timing, venue context, and quick entry into each match centre.';
      case MatchStatus.COMPLETED:
        return 'Finished matches with scorelines and the full scorecard path kept close.';
      case MatchStatus.LIVE:
        return 'Live scorecards, commentary, lineups, and match detail tabs in one place.';
      default:
        return 'Live scores, fixtures, and results.';
    }
  }

  getResultSummaryCopy(): string {
    const shownCount = this.visibleMatches.length;
    const totalCount = this.filteredMatches.length;

    if (this.searchQuery.trim()) {
      return `${shownCount} of ${totalCount} matches shown for "${this.searchQuery.trim()}".`;
    }

    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return `${shownCount} of ${totalCount} fixtures visible, grouped by match day.`;
      case MatchStatus.COMPLETED:
        return `${shownCount} of ${totalCount} results visible, newest first.`;
      case MatchStatus.LIVE:
        return `${shownCount} of ${totalCount} live matches visible.`;
      default:
        return `${shownCount} of ${totalCount} matches visible.`;
    }
  }

  isUpcomingGroupedView(): boolean {
    return this.selectedStatus === MatchStatus.UPCOMING && this.upcomingMatchGroups.length > 0;
  }

  private shiftSelectedStatus(direction: 1 | -1): void {
    const currentIndex = this.swipeableStatuses.indexOf(this.selectedStatus);
    const nextIndex = Math.max(0, Math.min(this.swipeableStatuses.length - 1, currentIndex + direction));

    if (nextIndex === currentIndex) {
      return;
    }

    this.selectedStatus = this.swipeableStatuses[nextIndex];
    this.resetVisibleMatchCount();
    this.applyFilters();
  }

  private isSwipeGestureTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element) {
      return false;
    }

    return !element.closest('input, button, a');
  }

  private resetSwipeTracking(): void {
    this.swipeStartX = null;
    this.swipeStartY = null;
  }

  private buildUpcomingGroups(matches: MatchCardViewModel[]): { label: string; matches: MatchCardViewModel[] }[] {
    const groups: { [key: string]: { label: string; matches: MatchCardViewModel[] } } = {};

    matches.forEach(match => {
      const startTime = match.startTime;
      const key = isNaN(startTime.getTime())
        ? 'Scheduled'
        : `${startTime.getFullYear()}-${startTime.getMonth()}-${startTime.getDate()}`;

      if (!groups[key]) {
        groups[key] = {
          label: key === 'Scheduled' ? 'Scheduled' : formatCalendarDate(startTime),
          matches: []
        };
      }

      groups[key].matches.push(match);
    });

    return Object.keys(groups).map(key => groups[key]);
  }

  private uniqueMatches(matches: MatchCardViewModel[], limit: number): MatchCardViewModel[] {
    const seen: { [key: string]: boolean } = {};

    return (matches || []).filter(match => {
      const href = buildCanonicalMatchPath(match);
      if (!href || seen[href]) {
        return false;
      }

      seen[href] = true;
      return true;
    }).slice(0, limit);
  }

  private buildLiveStatusSummary(): string {
    var match = filterLiveMatches(this.allMatches)[0];
    if (!match) {
      return 'Open the live lane as soon as a tracked match begins.';
    }

    var scoreline = this.getCompactScoreline(match);
    if (scoreline) {
      return this.getCompactTeams(match) + ' is live. ' + scoreline + '.';
    }

    return this.getCompactTeams(match) + ' is live now.';
  }

  private buildUpcomingStatusSummary(): string {
    var match = prioritizeUpcomingMatchesForDiscovery(this.allMatches, 0, 48)[0];
    if (!match) {
      return 'Upcoming start times and venues will show here when fixtures arrive.';
    }

    return this.getCompactTeams(match) + ' starts ' + this.getCompactStartLabel(match) + this.getCompactVenueSuffix(match) + '.';
  }

  private buildCompletedStatusSummary(): string {
    var match = filterCompletedMatches(this.allMatches)[0];
    if (!match) {
      return 'Fresh results will appear here once tracked matches finish.';
    }

    if (match.resultSummary) {
      return match.resultSummary;
    }

    return this.getCompactTeams(match) + ' has a completed scorecard ready to open.';
  }

  private getCompactTeams(match: MatchCardViewModel): string {
    return this.getTeamLabel(match.team1 && (match.team1.shortName || match.team1.name))
      + ' vs '
      + this.getTeamLabel(match.team2 && (match.team2.shortName || match.team2.name));
  }

  private getTeamLabel(value: string | undefined): string {
    return value || 'Match';
  }

  private getCompactStartLabel(match: MatchCardViewModel): string {
    if (match.timeDisplay) {
      return match.timeDisplay;
    }

    try {
      return new Date(match.startTime).toLocaleString('en-IN', {
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        month: 'short'
      });
    } catch (error) {
      return 'soon';
    }
  }

  private getCompactVenueSuffix(match: MatchCardViewModel): string {
    return match.venue ? ' at ' + match.venue : '';
  }

  private getCompactScoreline(match: MatchCardViewModel): string | null {
    if (match.team1 && match.team1.score && match.team2 && match.team2.score) {
      return match.team1.shortName + ' ' + match.team1.score.displayText + ' | '
        + match.team2.shortName + ' ' + match.team2.score.displayText;
    }

    if (match.team1 && match.team1.score) {
      return match.team1.shortName + ' ' + match.team1.score.displayText;
    }

    if (match.team2 && match.team2.score) {
      return match.team2.shortName + ' ' + match.team2.score.displayText;
    }

    return null;
  }

  get canLoadMore(): boolean {
    return this.visibleMatches.length < this.filteredMatches.length;
  }

  onLoadMore(): void {
    this.visibleMatchCount += this.getPageSize(this.selectedStatus);
    this.applyFilters();
  }

  get loadMoreLabel(): string {
    switch (this.selectedStatus) {
      case MatchStatus.UPCOMING:
        return 'Show more upcoming matches';
      case MatchStatus.COMPLETED:
        return 'Show more results';
      default:
        return 'Show more live matches';
    }
  }

  private getDefaultStatus(): MatchStatus {
    if (this.liveMatchesCount > 0) {
      return MatchStatus.LIVE;
    }
    if (this.upcomingMatchesCount > 0) {
      return MatchStatus.UPCOMING;
    }
    return MatchStatus.COMPLETED;
  }

  private resetVisibleMatchCount(): void {
    this.visibleMatchCount = this.getPageSize(this.selectedStatus);
  }

  private getPageSize(status: MatchStatus): number {
    return this.pageSizeByStatus[status] || 24;
  }

  private updateStructuredData(): void {
    var items: any[] = [
      this.structuredDataService.page({
        type: 'CollectionPage',
        name: 'Cricket matches on Crickzen',
        description: 'Browse live matches, upcoming fixtures, and recent results with direct paths into commentary, scorecards, lineups, and match details.',
        url: 'https://www.crickzen.com/matches'
      }),
      this.structuredDataService.breadcrumbs([
        { name: 'Home', url: 'https://www.crickzen.com/' },
        { name: 'Matches', url: 'https://www.crickzen.com/matches' }
      ]),
      this.structuredDataService.itemList({
        name: 'Related match hubs',
        url: 'https://www.crickzen.com/matches',
        description: 'Visible navigation from the matches page into the main cricket discovery hubs.',
        items: [
          {
            name: 'Cricket live score today',
            url: 'https://www.crickzen.com/live-score',
            description: 'Open the main live-score hub.'
          },
          {
            name: 'Cricket schedule today',
            url: 'https://www.crickzen.com/cricket-schedule/today',
            description: 'Open the schedule-first hub for upcoming fixtures.'
          },
          {
            name: 'Cricket match archive',
            url: 'https://www.crickzen.com/live-score/archive',
            description: 'Open the archive for retained result pages.'
          },
          {
            name: 'Cricket series',
            url: 'https://www.crickzen.com/series',
            description: 'Browse the current lightweight series tables and standings surface.'
          }
        ]
      })
    ];

    if (this.liveDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Live cricket match links',
        url: 'https://www.crickzen.com/matches',
        description: 'Canonical match pages for live matches shown from the matches page.',
        items: this.toStructuredMatchLinks(this.liveDiscoveryMatches)
      }));
    }

    if (this.upcomingDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Upcoming cricket fixture links',
        url: 'https://www.crickzen.com/matches',
        description: 'Canonical match pages surfaced before start time from the matches page.',
        items: this.toStructuredMatchLinks(this.upcomingDiscoveryMatches)
      }));
    }

    if (this.recentDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Recent cricket result links',
        url: 'https://www.crickzen.com/matches',
        description: 'Canonical match pages retained after completion from the matches page.',
        items: this.toStructuredMatchLinks(this.recentDiscoveryMatches)
      }));
    }

    if (this.freshnessDiscoveryLinks.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Freshness-support match pages from the matches list',
        url: 'https://www.crickzen.com/matches',
        description: 'Preview, live-update, and result support pages exposed from the matches list SSR graph.',
        items: this.freshnessDiscoveryLinks.map((link) => ({
          name: link.label,
          url: 'https://www.crickzen.com' + link.href,
          description: link.summary
        }))
      }));
    }

    this.structuredDataService.setPageSchemas(items);
  }

  private toStructuredMatchLinks(matches: MatchCardViewModel[]): Array<{ name: string; url: string; description: string }> {
    return (matches || []).map((match) => ({
      name: this.getMatchLinkLabel(match),
      url: 'https://www.crickzen.com' + this.getMatchHref(match),
      description: this.buildStructuredMatchDescription(match)
    }));
  }

  private buildStructuredMatchDescription(match: MatchCardViewModel): string {
    var venue = match && match.venue ? ' at ' + match.venue : '';

    if (match && match.status === MatchStatus.UPCOMING) {
      return 'Upcoming cricket fixture with preview details, toss context, lineups, and live score path' + venue + '.';
    }

    if (match && match.status === MatchStatus.COMPLETED) {
      return 'Completed cricket match with result, scorecard, commentary archive, and match detail path' + venue + '.';
    }

    return 'Live cricket match with commentary, scorecard, lineups, and match details' + venue + '.';
  }

  private buildFreshnessDiscoveryLinks(): MatchFreshnessLink[] {
    return ([] as MatchFreshnessLink[])
      .concat(buildFreshnessDiscoveryLinksForMatches(this.upcomingDiscoveryMatches.slice(0, 3), 3))
      .concat(buildFreshnessDiscoveryLinksForMatches(this.liveDiscoveryMatches.slice(0, 3), 3))
      .concat(buildFreshnessDiscoveryLinksForMatches(this.recentDiscoveryMatches.slice(0, 3), 3))
      .filter((link, index, items) => items.findIndex((candidate) => candidate.href === link.href) === index);
  }
}
