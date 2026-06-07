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
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, extractSlugFromUrl, filterCompletedMatches, filterLiveMatches, filterUpcomingMatches } from '../core/utils/match-utils';
import { MatchCardViewModel } from '../features/matches/models/match-card.models';
import { MatchesService } from '../features/matches/services/matches.service';

type HomeTab = 'live' | 'upcoming' | 'results';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private carouselElement: HTMLDivElement | null = null;
  private readonly carouselScrollListener = () => this.updateCarouselControls();

  @ViewChild('matchesCarouselRef', { read: ElementRef })
  set matchesCarouselRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.bindCarousel(ref ? ref.nativeElement : null);
  }

  liveMatches: MatchCardViewModel[] = [];
  upcomingMatches: MatchCardViewModel[] = [];
  recentMatches: MatchCardViewModel[] = [];
  activeMatches: MatchCardViewModel[] = [];
  discoveryMatches: MatchCardViewModel[] = [];

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
    private blogListService: BlogListService,
    private newsService: NewsService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
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
        this.upcomingMatches = filterUpcomingMatches(matches).slice(0, 6);
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
        this.recentMatches = [];
        this.activeMatches = [];
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
    this.totalTrackedMatches = this.liveMatches.length + this.upcomingMatches.length + this.recentMatches.length;
    this.syncActiveMatches();
    this.discoveryMatches = this.buildDiscoveryMatches();
    this.updateCarouselControlsSoon();
    this.changeDetectorRef.markForCheck();
  }

  private syncActiveMatches(): void {
    switch (this.activeTab) {
      case 'live':
        this.activeMatches = this.liveMatches;
        break;
      case 'upcoming':
        this.activeMatches = this.upcomingMatches;
        break;
      default:
        this.activeMatches = this.recentMatches;
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

  private buildDiscoveryMatches(): MatchCardViewModel[] {
    var candidates = ([] as MatchCardViewModel[])
      .concat(this.liveMatches.slice(0, 4))
      .concat(this.upcomingMatches.slice(0, 3))
      .concat(this.recentMatches.slice(0, 3));
    var seen: { [key: string]: boolean } = {};

    return candidates.filter(match => {
      var href = buildCanonicalMatchPath(match);
      if (!href || seen[href]) {
        return false;
      }

      seen[href] = true;
      return true;
    }).slice(0, 8);
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
