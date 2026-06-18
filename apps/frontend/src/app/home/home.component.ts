import { isPlatformBrowser } from '@angular/common';
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

type HomeTab = 'live' | 'upcoming' | 'results';

interface HomeGlanceCard {
  metric: string;
  metricLabel: string;
  summary: string;
  tab: HomeTab;
  title: string;
  tone: 'live' | 'upcoming' | 'results';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly maxHomeMatchesPerTab = 12;
  private carouselElement: HTMLDivElement | null = null;
  private readonly carouselScrollListener = () => this.updateCarouselControls();

  @ViewChild('matchesCarouselRef', { read: ElementRef })
  set matchesCarouselRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.bindCarousel(ref ? ref.nativeElement : null);
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

  isLoadingMatches = true;
  hasMatchError = false;
  activeTab: HomeTab = 'live';
  totalTrackedMatches = 0;
  canScrollLeft = false;
  canScrollRight = false;

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
    private blogListService: BlogListService,
    private newsService: NewsService,
    private changeDetectorRef: ChangeDetectorRef,
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

    this.newsService.getNews().subscribe(
      (items) => {
        this.newsItems = items;
        this.isLoadingNews = false;
        this.changeDetectorRef.markForCheck();
      },
      () => {
        this.newsItems = [];
        this.isLoadingNews = false;
        this.changeDetectorRef.markForCheck();
      }
    );

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

    this.loadMatches();
  }

  ngOnDestroy(): void {
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }

    this.matchesService.stopAutoRefresh();
    this.bindCarousel(null);
  }

  loadMatches(): void {
    this.isLoadingMatches = true;
    this.hasMatchError = false;

    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }

    this.matchSubscription = this.matchesService.getLiveMatchesWithAutoRefresh().subscribe(
      (matches) => {
        this.liveMatches = filterLiveMatches(matches);
        this.allUpcomingMatches = filterUpcomingMatches(matches);
        this.upcomingMatches = this.allUpcomingMatches.slice(0, 6);
        this.recentMatches = filterCompletedMatches(matches).slice(0, 6);

        if (this.isLoadingMatches) {
          this.activeTab = this.getBestAvailableTab();
        }

        this.isLoadingMatches = false;
        this.hasMatchError = false;
        this.refreshHomeState();
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
        this.changeDetectorRef.markForCheck();
      }
    );
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
    this.syncActiveMatches();
    this.resetMatchesCarouselPosition();
    this.changeDetectorRef.markForCheck();
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
    this.changeDetectorRef.markForCheck();
  }

  private syncActiveMatches(): void {
    switch (this.activeTab) {
      case 'live':
        // Protect homepage SSR from rendering an unexpectedly inflated catalog.
        this.activeMatches = this.liveMatches.slice(0, this.maxHomeMatchesPerTab);
        break;
      case 'upcoming':
        this.activeMatches = this.upcomingMatches.slice(0, this.maxHomeMatchesPerTab);
        break;
      default:
        this.activeMatches = this.recentMatches.slice(0, this.maxHomeMatchesPerTab);
        break;
    }
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
