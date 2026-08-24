import { isPlatformBrowser } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { BlogListService, BlogPost } from '../component/blog-list.service';
import { NewsItem, NewsService } from '../component/news.service';
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, extractSlugFromUrl, filterCompletedMatches, filterLiveMatches, filterUpcomingMatches, prioritizeUpcomingMatchesForDiscovery } from '../core/utils/match-utils';
import { MatchCardViewModel, MatchStatus } from '../features/matches/models/match-card.models';
import { MatchesService } from '../features/matches/services/matches.service';
import { MetaTagsService } from '../seo/meta-tags.service';
import { StructuredDataService } from '../seo/structured-data.service';

type HomeTab = 'live' | 'upcoming' | 'results';

interface HomeGlanceCard {
  metric: string;
  metricLabel: string;
  summary: string;
  tab: HomeTab;
  title: string;
  tone: 'live' | 'upcoming' | 'results';
}

const HOME_MATCHES_STATE_KEY = makeStateKey<MatchCardViewModel[]>('crickzen_home_matches');
const HOME_NEWS_STATE_KEY = makeStateKey<NewsItem[]>('crickzen_home_news');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  // Keep the homepage live lane aligned with the scraper's finite three-match
  // budget. Upcoming/results can remain broader without reintroducing a live
  // catalogue flood when a stale backend snapshot is served.
  private readonly maxHomeLiveMatches = 3;
  private readonly maxHomeMatchesPerTab = 6;
  private carouselElement: HTMLDivElement | null = null;
  private readonly carouselScrollListener = () => this.updateCarouselControls();
  private seriesLinksElement: HTMLDivElement | null = null;
  private readonly seriesScrollListener = () => this.updateSeriesControls();

  @ViewChild('matchesCarouselRef', { read: ElementRef })
  set matchesCarouselRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.bindCarousel(ref ? ref.nativeElement : null);
  }

  @ViewChild('seriesLinksRef', { read: ElementRef })
  set seriesLinksRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.bindSeriesLinks(ref ? ref.nativeElement : null);
  }

  liveMatches: MatchCardViewModel[] = [];
  upcomingMatches: MatchCardViewModel[] = [];
  allUpcomingMatches: MatchCardViewModel[] = [];
  recentMatches: MatchCardViewModel[] = [];
  activeMatches: MatchCardViewModel[] = [];
  discoveryMatches: MatchCardViewModel[] = [];
  liveDiscoveryMatches: MatchCardViewModel[] = [];
  upcomingDiscoveryMatches: MatchCardViewModel[] = [];
  recentDiscoveryMatches: MatchCardViewModel[] = [];
  glanceCards: HomeGlanceCard[] = [];
  selectedSeries: string | null = null;

  isLoadingMatches = true;
  hasMatchError = false;
  activeTab: HomeTab = 'live';
  totalTrackedMatches = 0;
  canScrollLeft = false;
  canScrollRight = false;
  canScrollSeriesLeft = false;
  canScrollSeriesRight = false;

  newsItems: NewsItem[] = [];
  isLoadingNews = true;
  blogPosts: BlogPost[] = [];

  private matchSubscription?: Subscription;
  readonly isBrowser: boolean;

  constructor(
    private matchesService: MatchesService,
    private router: Router,
    private metaService: Meta,
    private titleService: Title,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService,
    private blogListService: BlogListService,
    private newsService: NewsService,
    private changeDetectorRef: ChangeDetectorRef,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.metaTagsService.setPageMeta('/', {
      title: 'Crickzen | Live Cricket Scores & Real-time Updates | International & Domestic Matches',
      description: 'Stay updated with live cricket scores and real-time updates from international and domestic matches on Crickzen. Get ball-by-ball commentary, match analysis, and comprehensive cricket coverage.',
      canonicalUrl: 'https://www.crickzen.com/',
      robots: 'index,follow'
    });
    this.updateStructuredData();

    if (this.isBrowser) {
      // The SSR transfer-state script is emitted after the browser bundles.
      // Wait one task so it exists before the first client hydration read.
      setTimeout(() => {
        const hydratedNews = this.getHydratedState<NewsItem[]>(HOME_NEWS_STATE_KEY);
        if (hydratedNews) {
          this.transferState.remove(HOME_NEWS_STATE_KEY);
          this.applyNews(hydratedNews);
        } else {
          this.loadNews();
        }
        this.loadMatches();
      }, 0);
    } else {
      this.loadNews();
      this.loadMatches();
    }
  }

  private loadNews(): void {
    this.newsService.getNews().subscribe(
      (items) => {
        if (!this.isBrowser) {
          this.transferState.set(HOME_NEWS_STATE_KEY, items || []);
        }
        this.applyNews(items);
      },
      () => {
        if (!this.isBrowser) {
          this.transferState.set(HOME_NEWS_STATE_KEY, []);
        }
        this.applyNews([]);
      }
    );
  }

  private applyNews(items: NewsItem[]): void {
    this.newsItems = items || [];
    this.isLoadingNews = false;
    if (this.newsItems.length === 0) {
      this.loadBlogFallback();
    }
    this.changeDetectorRef.markForCheck();
  }

  private loadBlogFallback(): void {
    this.blogListService.getBlogPosts().subscribe(
      (data) => {
        this.blogPosts = data || [];
        this.changeDetectorRef.markForCheck();
      },
      () => {
        this.blogPosts = [];
        this.changeDetectorRef.markForCheck();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }
    this.matchesService.stopAutoRefresh();
    this.bindCarousel(null);
    this.bindSeriesLinks(null);
    this.structuredDataService.clearPageSchemas();
  }

  loadMatches(): void {
    this.isLoadingMatches = true;
    this.hasMatchError = false;

    if (this.isBrowser) {
      const hydratedMatches = this.normalizeHydratedMatches(
        this.getHydratedState<MatchCardViewModel[]>(HOME_MATCHES_STATE_KEY)
      );
      // An empty SSR payload can happen while the server-side match request is
      // still warming up. Do not let it suppress the browser's first real
      // request, otherwise cards only appear after a manual refresh.
      if (hydratedMatches && hydratedMatches.length > 0) {
        this.transferState.remove(HOME_MATCHES_STATE_KEY);
        this.applyMatches(hydratedMatches);
        return;
      }

      if (hydratedMatches !== null) {
        this.transferState.remove(HOME_MATCHES_STATE_KEY);
      }
    }

    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }

    this.matchSubscription = this.matchesService.getLiveMatchesWithAutoRefresh().subscribe(
      (matches) => {
        if (!this.isBrowser) {
          // The homepage renders a small, curated set of cards. Do not place
          // the complete live/upcoming/recent/archive catalogue in TransferState:
          // that turns a small SSR document into a multi-megabyte download and
          // leaves the visible cards behind the loading skeleton on slow links.
          this.transferState.set(HOME_MATCHES_STATE_KEY, this.buildHomeHydrationSnapshot(matches || []));
        }
        // Keep the SSR/hydrated cards visible when the first browser refresh
        // briefly returns an empty snapshot while the backend is warming up.
        // A later non-empty refresh can still replace them normally.
        if ((!matches || matches.length === 0) && this.totalTrackedMatches > 0) {
          this.isLoadingMatches = false;
          this.hasMatchError = false;
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.applyMatches(matches);
      },
      (error) => {
        console.error('Error loading matches:', error);
        this.liveMatches = [];
        this.upcomingMatches = [];
        this.allUpcomingMatches = [];
        this.recentMatches = [];
        this.activeMatches = [];
        this.glanceCards = [];
        this.totalTrackedMatches = 0;
        this.hasMatchError = true;
        this.isLoadingMatches = false;
        this.updateCarouselControls();
        this.updateStructuredData();
        this.changeDetectorRef.markForCheck();
      }
    );
  }

  private getHydratedState<T>(key: any): T | null {
    var hydrated: T | null = null;
    try {
      hydrated = this.transferState.get<T | null>(key, null);
    } catch (error) {
      console.warn('[HomeComponent] Could not read Angular transfer state:', error);
    }
    if (hydrated !== null && hydrated !== undefined && (!Array.isArray(hydrated) || hydrated.length > 0)) {
      return hydrated;
    }

    if (!this.isBrowser || typeof document === 'undefined') {
      return hydrated;
    }

    var stateElement = document.getElementById('crickzen-app-state');
    var encodedState = stateElement && stateElement.textContent;
    if (!encodedState) {
      return hydrated;
    }

    try {
      // Some SSR responses HTML-encode the JSON quotes as &q;. Decode only
      // this known wrapper format, then reuse the same TransferState payload.
      var decodedState = encodedState.replace(/&q;/g, '"');
      var state = JSON.parse(decodedState);
      var fallback = state && state[String(key)];
      if (fallback !== null && fallback !== undefined) {
        return fallback as T;
      }
    } catch (error) {
      console.warn('[HomeComponent] Could not decode SSR homepage state:', error);
    }

    return hydrated;
  }

  private normalizeHydratedMatches(matches: MatchCardViewModel[] | null): MatchCardViewModel[] | null {
    if (!Array.isArray(matches)) {
      return matches;
    }

    return matches.map((match) => ({
      ...match,
      startTime: match.startTime ? new Date(match.startTime as any) : match.startTime,
      lastUpdated: match.lastUpdated ? new Date(match.lastUpdated as any) : match.lastUpdated
    }));
  }

  private buildHomeHydrationSnapshot(matches: MatchCardViewModel[]): MatchCardViewModel[] {
    var live = filterLiveMatches(matches).slice(0, this.maxHomeLiveMatches);
    var upcoming = prioritizeUpcomingMatchesForDiscovery(filterUpcomingMatches(matches), 12, 48).slice(0, 48);
    var recent = filterCompletedMatches(matches).slice(0, 6);
    return ([] as MatchCardViewModel[]).concat(live, upcoming, recent);
  }

  private applyMatches(matches: MatchCardViewModel[]): void {
    this.liveMatches = filterLiveMatches(matches).slice(0, this.maxHomeLiveMatches);
    this.allUpcomingMatches = filterUpcomingMatches(matches);
    this.upcomingMatches = this.allUpcomingMatches.slice(0, 6);
    this.recentMatches = filterCompletedMatches(matches).slice(0, 6);

    if (this.isLoadingMatches) {
      this.activeTab = this.getBestAvailableTab();
    }

    this.isLoadingMatches = false;
    this.hasMatchError = false;
    this.refreshHomeState();
  }

  onMatchClick(match: MatchCardViewModel): void {
    this.updateMetaTagsForMatch(match);

    if (!match.matchUrl) {
      console.warn('No match URL available for navigation');
      return;
    }

    const matchUrlPath = extractSlugFromUrl(match.matchUrl);
    if (!matchUrlPath) {
      console.warn('Could not extract match slug from URL', match.matchUrl);
      return;
    }

    this.router.navigate(['cric-live', matchUrlPath]);
  }

  onDetailsClick(match: MatchCardViewModel): void {
    this.onMatchClick(match);
  }

  setActiveTab(tab: HomeTab): void {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;
    this.selectedSeries = null;
    this.syncActiveMatches();
    this.resetMatchesCarouselPosition();
    this.changeDetectorRef.markForCheck();
  }

  selectSeries(series: string, event: Event): void {
    this.selectedSeries = series;
    this.activeTab = this.getSeriesTab(series);
    this.syncActiveMatches();
    this.resetMatchesCarouselPosition();
    this.revealSelectedSeries(series);
    this.changeDetectorRef.markForCheck();
  }

  private revealSelectedSeries(series: string): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      return;
    }
    setTimeout(() => {
      var selected = document.querySelector('.home__series-link[data-series="' + series.replace(/"/g, '\\"') + '"]');
      if (selected) {
        (selected as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      this.updateSeriesControls();
    }, 0);
  }

  scrollSeriesLeft(): void {
    this.scrollSeriesLinks(-1);
  }

  scrollSeriesRight(): void {
    this.scrollSeriesLinks(1);
  }

  scrollLeft(): void {
    if (!this.carouselElement) {
      return;
    }

    const scrollAmount = this.carouselElement.offsetWidth * 0.84;
    this.carouselElement.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }

  scrollRight(): void {
    if (!this.carouselElement) {
      return;
    }

    const scrollAmount = this.carouselElement.offsetWidth * 0.84;
    this.carouselElement.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }

  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  trackByNewsId(index: number, item: NewsItem): string {
    return item.newsId;
  }

  getMatchHref(match: MatchCardViewModel): string {
    return buildCanonicalMatchPath(match) || '/matches';
  }

  getMatchLinkLabel(match: MatchCardViewModel): string {
    return buildCanonicalMatchLinkLabel(match);
  }

  getHomeSeriesLinks(): string[] {
    var seen: { [key: string]: boolean } = {};
    var matches = ([] as MatchCardViewModel[])
      .concat(this.liveMatches || [])
      .concat(this.allUpcomingMatches || this.upcomingMatches || [])
      .concat(this.recentMatches || []);

    return (matches || [])
      .map(match => this.normalizeSeriesName(match))
      .filter(series => {
        var key = series.toLowerCase();
        if (!series || seen[key]) {
          return false;
        }
        seen[key] = true;
        return true;
      })
      .slice(0, 6);
  }

  getHomeSeriesHref(series: string): string {
    return '/series/current/' + this.slugifySeriesName(series);
  }

  private slugifySeriesName(value: string | null | undefined): string {
    return (value || 'series')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'series';
  }

  private normalizeSeriesName(match: MatchCardViewModel | null): string {
    var value = (match && match.seriesName || '').replace(/\s+/g, ' ').trim();
    if (!value) {
      return '';
    }

    // Some live feeds replace the competition with toss/score text. The
    // canonical CREX slug remains the reliable competition source in that case.
    var matchUrl = (match && match.matchUrl || '').toLowerCase();
    var teams = ((match && match.team1 && (match.team1.name || match.team1.shortName) || '') + ' ' + (match && match.team2 && (match.team2.name || match.team2.shortName) || '')).toLowerCase();
    if (/pondicherry-premier-league-2026/.test(matchUrl) || /pondicherry|villianur mohit|ruby white town|\bvmk\b.*\brwt\b|\brwt\b.*\bvmk\b/.test(matchUrl + ' ' + teams + ' ' + value.toLowerCase())) {
      return 'PPL 2026';
    }
    if (/lanka-premier-league-2026|lpl-2026/.test(matchUrl) || /galle gallants|jaffna kings|\bgg\b.*\b(?:jk|jks)\b|\b(?:jk|jks)\b.*\bgg\b/.test(matchUrl + ' ' + teams + ' ' + value.toLowerCase())) {
      return 'LPL 2026';
    }

    // Scraper labels sometimes prepend the teams, start time, and fixture name
    // before the actual competition after a comma.
    if (value.indexOf(',') !== -1) {
      var commaParts = value.split(',');
      value = commaParts[commaParts.length - 1].trim();
    }

    // Remove a leading fixture number/format, e.g. "2nd T20 Bangladesh TOUR...".
    value = value.replace(/^\d{1,3}(st|nd|rd|th)\s+(TEST|ODI|T20I?|T10|FOUR[- ]DAY)\s+/i, '');
    // Also remove fixture labels that are not followed by a format, e.g.
    // "1st Semi Final T20 Blast Women" or "19th Match Pondicherry".
    value = value.replace(/^\d{1,3}(st|nd|rd|th)\s+(SEMI[- ]FINAL|FINAL|MATCH)\s+/i, '');
    var team2 = match && match.team2 && (match.team2.name || match.team2.shortName);
    if (team2) {
      value = value.replace(new RegExp('\\s+' + this.escapeRegExp(team2) + '$', 'i'), '');
    }
    value = value.replace(/^(?:[A-Z]{2,5}\s+)?(?:Yet to bat|Toss Delayed)(?:\s+(?:[A-Z]{2,5})\s+(?:Yet to bat|Toss Delayed))*\s*/i, '');
    return value.replace(/\s+TOUR\s+OF\s+/i, ' vs ').replace(/\s+/g, ' ').trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getSeriesTab(series: string): HomeTab {
    if ((this.liveMatches || []).some(match => this.normalizeSeriesName(match) === series)) {
      return 'live';
    }
    if ((this.upcomingMatches || []).some(match => this.normalizeSeriesName(match) === series)) {
      return 'upcoming';
    }
    return 'results';
  }

  getGlanceCardAriaLabel(card: HomeGlanceCard): string {
    return card.title + '. ' + card.metric + ' ' + card.metricLabel + '. ' + card.summary;
  }

  updateMetaTagsForMatch(match: MatchCardViewModel): void {
    const title = match.team1.name + ' vs ' + match.team2.name + ' - ' + match.displayStatus;
    const description = 'Live cricket score: ' + match.team1.name + ' vs ' + match.team2.name + ' at ' + match.venue;
    const keywords = match.team1.name + ', ' + match.team2.name + ', cricket match, live score, ' + match.venue;

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }

  openNews(url: string): void {
    if (this.isBrowser && url) {
      window.open(url, '_blank');
    }
  }

  openNewsItem(item: NewsItem): void {
    if (item.newsUrl) {
      this.openNews(item.newsUrl);
    }
  }

  getTimeAgo(timestamp: number): string {
    return this.newsService.getTimeAgo(timestamp);
  }

  parseLiveMatchUrl(url: string) {
    const result1 = this.extractTeamAndTournament(url);
    console.log('URL1 -> Team: ' + result1.teamName + ', Tournament: ' + result1.tournamentName);
    const parts = url.split('/').slice(2);

    const title = result1.tournamentName;
    const description = parts[2].replace(/-/g, ' ');
    const teams = result1.teamName;

    const extractedTeams = teams ? this.extractTeams(teams) : null;
    const team1 = extractedTeams ? extractedTeams.team1 : '';
    const team2 = extractedTeams ? extractedTeams.team2 : '';

    const matchUrl = parts[5];

    return {
      title: title,
      description: description,
      team1: team1,
      team2: team2,
      matchUrl: matchUrl
    };
  }

  private refreshHomeState(): void {
    var discoveryUpcomingSource = this.allUpcomingMatches && this.allUpcomingMatches.length > 0
      ? this.allUpcomingMatches
      : this.upcomingMatches;
    this.totalTrackedMatches = this.liveMatches.length + this.upcomingMatches.length + this.recentMatches.length;
    this.syncActiveMatches();
    this.liveDiscoveryMatches = this.uniqueDiscoveryMatches(this.liveMatches, 6);
    this.upcomingDiscoveryMatches = this.uniqueDiscoveryMatches(
      prioritizeUpcomingMatchesForDiscovery(discoveryUpcomingSource, 12, 48),
      12
    );
    this.recentDiscoveryMatches = this.uniqueDiscoveryMatches(this.recentMatches, 4);
    this.glanceCards = this.buildGlanceCards();
    this.discoveryMatches = this.buildDiscoveryMatches();
    this.updateCarouselControlsSoon();
    this.updateStructuredData();
    this.changeDetectorRef.markForCheck();
  }

  private updateStructuredData(): void {
    var items: any[] = [
      this.structuredDataService.page({
        name: 'Crickzen match centre at a glance',
        description: 'See what is live now, what starts next, and which result just landed before you dive into commentary, scorecards, or the full schedule.',
        url: 'https://www.crickzen.com/'
      }),
      this.structuredDataService.itemList({
        name: 'Homepage cricket hub links',
        url: 'https://www.crickzen.com/',
        description: 'Primary cricket navigation links visible in the homepage hero.',
        items: [
          {
            name: 'Cricket live score today',
            url: 'https://www.crickzen.com/live-score',
            description: 'Open the live-score hub for current matches, upcoming fixtures, and recent results.'
          },
          {
            name: 'Cricket matches and schedule',
            url: 'https://www.crickzen.com/matches',
            description: 'Browse the full list of live, upcoming, and completed cricket matches.'
          }
        ]
      })
    ];

    if (this.liveDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Live match pages on the homepage',
        url: 'https://www.crickzen.com/',
        description: 'Canonical match pages for matches already in play.',
        items: this.toStructuredMatchLinks(this.liveDiscoveryMatches)
      }));
    }

    if (this.upcomingDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Upcoming match pages on the homepage',
        url: 'https://www.crickzen.com/',
        description: 'Canonical match pages surfaced before the first ball.',
        items: this.toStructuredMatchLinks(this.upcomingDiscoveryMatches)
      }));
    }

    if (this.recentDiscoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Recent result pages on the homepage',
        url: 'https://www.crickzen.com/',
        description: 'Canonical match pages retained after completion.',
        items: this.toStructuredMatchLinks(this.recentDiscoveryMatches)
      }));
    }

    if (this.liveDiscoveryMatches.length > 0 || this.upcomingDiscoveryMatches.length > 0 || this.recentDiscoveryMatches.length > 0 || this.discoveryMatches.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: 'Homepage support hubs',
        url: 'https://www.crickzen.com/',
        description: 'Visible support hubs linked from the homepage discovery drawer.',
        items: [
          {
            name: 'Cricket live score today',
            url: 'https://www.crickzen.com/live-score',
            description: 'Open the main live-score hub.'
          },
          {
            name: 'Live cricket score',
            url: 'https://www.crickzen.com/live-cricket-score',
            description: 'Open the live-cricket-score intent hub.'
          },
          {
            name: 'Today match live score',
            url: 'https://www.crickzen.com/live-score/today',
            description: 'Open today-match live score pages.'
          },
          {
            name: 'Cricket schedule today',
            url: 'https://www.crickzen.com/cricket-schedule/today',
            description: 'Open the schedule-first hub for upcoming fixtures.'
          },
          {
            name: 'Match archive',
            url: 'https://www.crickzen.com/live-score/archive',
            description: 'Open retained result pages in the archive.'
          },
          {
            name: 'Cricket series',
            url: 'https://www.crickzen.com/series',
            description: 'Open the current lightweight series tables and standings surface.'
          }
        ]
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
      return 'Upcoming cricket fixture with preview context, lineups, toss, scorecard, and live score path' + venue + '.';
    }

    if (match && match.status === MatchStatus.COMPLETED) {
      return 'Completed cricket match with result, scorecard, commentary archive, and match details' + venue + '.';
    }

    return 'Live cricket match page with commentary, scorecard, lineups, and match details' + venue + '.';
  }

  private syncActiveMatches(): void {
    switch (this.activeTab) {
      case 'live':
        // Protect homepage SSR from rendering an unexpectedly inflated catalog.
        this.activeMatches = this.filterSeries(this.liveMatches).slice(0, this.maxHomeLiveMatches);
        break;
      case 'upcoming':
        this.activeMatches = this.filterSeries(this.upcomingMatches).slice(0, this.maxHomeMatchesPerTab);
        break;
      default:
        this.activeMatches = this.filterSeries(this.recentMatches).slice(0, this.maxHomeMatchesPerTab);
        break;
    }
  }

  private filterSeries(matches: MatchCardViewModel[]): MatchCardViewModel[] {
    if (!this.selectedSeries) {
      return matches || [];
    }
    return (matches || []).filter(match => this.normalizeSeriesName(match) === this.selectedSeries);
  }

  private getBestAvailableTab(): HomeTab {
    if (this.liveMatches.length > 0) {
      return 'live';
    }

    if (this.upcomingMatches.length > 0) {
      return 'upcoming';
    }

    return 'results';
  }

  private buildGlanceCards(): HomeGlanceCard[] {
    var cards: HomeGlanceCard[] = [];

    if (this.liveMatches.length > 0) {
      cards.push({
        metric: String(this.liveMatches.length),
        metricLabel: this.liveMatches.length === 1 ? 'match in play' : 'matches in play',
        summary: this.buildLiveGlanceSummary(this.liveMatches[0]),
        tab: 'live',
        title: 'Live now',
        tone: 'live'
      });
    }

    if (this.upcomingMatches.length > 0) {
      cards.push({
        metric: String(this.upcomingMatches.length),
        metricLabel: this.upcomingMatches.length === 1 ? 'match starting next' : 'matches coming up',
        summary: this.buildUpcomingGlanceSummary(this.getLeadUpcomingMatch()),
        tab: 'upcoming',
        title: 'Up next',
        tone: 'upcoming'
      });
    }

    if (this.recentMatches.length > 0) {
      cards.push({
        metric: String(this.recentMatches.length),
        metricLabel: this.recentMatches.length === 1 ? 'result ready' : 'results ready',
        summary: this.buildRecentGlanceSummary(this.recentMatches[0]),
        tab: 'results',
        title: 'Latest result',
        tone: 'results'
      });
    }

    return cards;
  }

  private buildDiscoveryMatches(): MatchCardViewModel[] {
    var liveMatches = this.liveDiscoveryMatches && this.liveDiscoveryMatches.length > 0
      ? this.liveDiscoveryMatches
      : this.uniqueDiscoveryMatches(this.liveMatches, 6);
    var upcomingMatches = this.upcomingDiscoveryMatches && this.upcomingDiscoveryMatches.length > 0
      ? this.upcomingDiscoveryMatches
      : this.uniqueDiscoveryMatches(prioritizeUpcomingMatchesForDiscovery(
        this.allUpcomingMatches && this.allUpcomingMatches.length > 0 ? this.allUpcomingMatches : this.upcomingMatches,
        12,
        48
      ), 12);
    var recentMatches = this.recentDiscoveryMatches && this.recentDiscoveryMatches.length > 0
      ? this.recentDiscoveryMatches
      : this.uniqueDiscoveryMatches(this.recentMatches, 4);

    var candidates = ([] as MatchCardViewModel[])
      .concat(liveMatches)
      .concat(upcomingMatches);

    if (candidates.length === 0) {
      candidates = candidates.concat(recentMatches);
    }

    return this.uniqueDiscoveryMatches(candidates.concat(recentMatches), 20);
  }

  private uniqueDiscoveryMatches(matches: MatchCardViewModel[], limit: number): MatchCardViewModel[] {
    var seen: { [key: string]: boolean } = {};

    return (matches || []).filter(match => {
      var href = buildCanonicalMatchPath(match);
      if (!href || seen[href]) {
        return false;
      }

      seen[href] = true;
      return true;
    }).slice(0, limit);
  }

  private getLeadUpcomingMatch(): MatchCardViewModel | null {
    var prioritized = prioritizeUpcomingMatchesForDiscovery(
      this.allUpcomingMatches && this.allUpcomingMatches.length > 0 ? this.allUpcomingMatches : this.upcomingMatches,
      0,
      48
    );

    if (prioritized.length > 0) {
      return prioritized[0];
    }

    return this.upcomingMatches.length > 0 ? this.upcomingMatches[0] : null;
  }

  private buildLiveGlanceSummary(match: MatchCardViewModel | null | undefined): string {
    if (!match) {
      return 'A live score card will appear here as soon as a tracked match starts.';
    }

    var scoreline = this.getCompactScoreline(match);
    var venue = this.getCompactVenue(match);
    var teams = this.getCompactTeams(match);

    if (scoreline) {
      return teams + ' is live' + (venue ? ' at ' + venue : '') + '. ' + scoreline + '.';
    }

    return teams + ' is live' + (venue ? ' at ' + venue : '') + '.';
  }

  private buildUpcomingGlanceSummary(match: MatchCardViewModel | null): string {
    if (!match) {
      return 'Upcoming start times and venues will appear here as soon as the feed has them.';
    }

    var timeLabel = this.getCompactStartLabel(match);
    var venue = this.getCompactVenue(match);

    return this.getCompactTeams(match) + ' starts ' + timeLabel + (venue ? ' at ' + venue : '') + '.';
  }

  private buildRecentGlanceSummary(match: MatchCardViewModel | null | undefined): string {
    if (!match) {
      return 'Recent results will appear here once a tracked match finishes.';
    }

    if (match.resultSummary) {
      return match.resultSummary;
    }

    return this.getCompactTeams(match) + ' has a completed scorecard ready to open.';
  }

  private getCompactTeams(match: MatchCardViewModel): string {
    return this.getTeamLabel(match.team1 && match.team1.shortName ? match.team1.shortName : match.team1 && match.team1.name)
      + ' vs '
      + this.getTeamLabel(match.team2 && match.team2.shortName ? match.team2.shortName : match.team2 && match.team2.name);
  }

  private getTeamLabel(value: string | undefined): string {
    return value || 'Match';
  }

  private getCompactVenue(match: MatchCardViewModel): string {
    return match && match.venue ? match.venue : '';
  }

  private getCompactStartLabel(match: MatchCardViewModel): string {
    if (match && match.timeDisplay) {
      return match.timeDisplay;
    }

    if (!match || !match.startTime) {
      return 'soon';
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

  private getCompactScoreline(match: MatchCardViewModel): string | null {
    if (!match) {
      return null;
    }

    if (match.status === MatchStatus.LIVE && match.team1 && match.team1.score && match.team2 && match.team2.score) {
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

  private bindCarousel(element: HTMLDivElement | null): void {
    if (this.carouselElement) {
      this.carouselElement.removeEventListener('scroll', this.carouselScrollListener);
    }

    this.carouselElement = element;

    if (this.carouselElement && this.isBrowser) {
      this.carouselElement.addEventListener('scroll', this.carouselScrollListener, { passive: true });
    }

    this.updateCarouselControls();
  }

  private bindSeriesLinks(element: HTMLDivElement | null): void {
    if (this.seriesLinksElement) {
      this.seriesLinksElement.removeEventListener('scroll', this.seriesScrollListener);
    }

    this.seriesLinksElement = element;

    if (this.seriesLinksElement && this.isBrowser) {
      this.seriesLinksElement.addEventListener('scroll', this.seriesScrollListener, { passive: true });
    }

    this.updateSeriesControls();
  }

  private scrollSeriesLinks(direction: number): void {
    if (!this.seriesLinksElement) {
      return;
    }

    this.seriesLinksElement.scrollBy({
      left: direction * Math.max(160, this.seriesLinksElement.clientWidth * 0.8),
      behavior: 'smooth'
    });
  }

  private updateSeriesControls(): void {
    if (!this.seriesLinksElement) {
      this.canScrollSeriesLeft = false;
      this.canScrollSeriesRight = false;
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.canScrollSeriesLeft = this.seriesLinksElement.scrollLeft > 4;
    this.canScrollSeriesRight = this.seriesLinksElement.scrollLeft < (this.seriesLinksElement.scrollWidth - this.seriesLinksElement.clientWidth - 4);
    this.changeDetectorRef.markForCheck();
  }

  private updateCarouselControlsSoon(): void {
    if (!this.isBrowser) {
      this.updateCarouselControls();
      return;
    }

    setTimeout(() => this.updateCarouselControls(), 0);
  }

  private updateCarouselControls(): void {
    if (!this.carouselElement) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.canScrollLeft = this.carouselElement.scrollLeft > 4;
    this.canScrollRight = this.carouselElement.scrollLeft < (this.carouselElement.scrollWidth - this.carouselElement.clientWidth - 4);
    this.changeDetectorRef.markForCheck();
  }

  private resetMatchesCarouselPosition(): void {
    if (!this.carouselElement) {
      return;
    }

    this.carouselElement.scrollTo({ left: 0, behavior: 'smooth' });
    this.updateCarouselControlsSoon();
  }

  extractTeamAndTournament(url: string): { teamName: string | null, tournamentName: string | null } {
    const pattern = /\/([a-z0-9\-]+)\/(live|scorecard)$/i;
    const match = url.match(pattern);

    if (match) {
      const fullMatch = match[1];
      const parts = fullMatch.split('-');

      if (parts.length >= 5) {
        const matchIndex = parts.indexOf('match');
        const teamPart = parts.slice(0, matchIndex - 1).join('-');
        const tournamentName = parts.slice(matchIndex + 1).join('-');

        return { teamName: teamPart, tournamentName: tournamentName };
      }
    }

    return { teamName: null, tournamentName: null };
  }

  extractTeams(matchString: string): { team1: string, team2: string } | null {
    if (matchString.includes('-vs-')) {
      const teams = matchString.split('-vs-');

      if (teams.length === 2) {
        return {
          team1: teams[0],
          team2: teams[1]
        };
      } else if (teams.length > 2) {
        const firstVsIndex = matchString.indexOf('-vs-');

        if (firstVsIndex !== -1) {
          const team1Part = matchString.substring(0, firstVsIndex);
          const team2Part = matchString.substring(firstVsIndex + 4);
          const team2Array = team2Part.split('-');
          const team2 = team2Array[0];

          return {
            team1: team1Part,
            team2: team2
          };
        }
      }
    }

    return null;
  }

  extractTournamentName(matchString: string): string | null {
    const matchPattern = /\d{1,2}(st|nd|rd|th)-match/i;
    const match = matchString.match(matchPattern);

    if (match) {
      const startIndex = match.index! + match[0].length;
      const tournamentName = matchString.substring(startIndex + 1);
      return tournamentName.trim();
    }

    return null;
  }
}
