import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { catchError, map, takeUntil, timeout } from 'rxjs/operators';

import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, filterCompletedMatches, filterLiveMatches, filterUpcomingMatches, sortMatchesByPriority } from '../../../core/utils/match-utils';
import { MatchCardViewModel, MatchStatus } from '../../matches/models/match-card.models';
import { MatchesService } from '../../matches/services/matches.service';
import { MetaTagsService } from '../../../seo/meta-tags.service';

type SeoHubType = 'liveScore' | 'today' | 'ipl' | 'scheduleToday' | 'iplSchedule' | 'archive';

interface HubConfig {
  type: SeoHubType;
  canonicalPath: string;
  eyebrow: string;
  title: string;
  intro: string;
  emptyText: string;
}

interface HubFallbackLink {
  href: string;
  label: string;
}

@Component({
  selector: 'app-live-score-hub',
  templateUrl: './live-score-hub.component.html',
  styleUrls: ['./live-score-hub.component.css']
})
export class LiveScoreHubComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly archivePageSize = 80;
  private readonly sitemapRequestTimeoutMs = 2500;

  config: HubConfig = this.getConfig('liveScore');
  allMatches: MatchCardViewModel[] = [];
  primaryMatches: MatchCardViewModel[] = [];
  discoveryMatches: MatchCardViewModel[] = [];
  liveMatches: MatchCardViewModel[] = [];
  upcomingMatches: MatchCardViewModel[] = [];
  completedMatches: MatchCardViewModel[] = [];
  sitemapLinks: HubFallbackLink[] = [];
  visibleSitemapLinks: HubFallbackLink[] = [];
  archivePageLinks: number[] = [];
  archivePage = 1;
  isLoading = true;
  hasError = false;

  MatchStatus = MatchStatus;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private matchesService: MatchesService,
    private metaTagsService: MetaTagsService
  ) {}

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.archivePage = this.getArchivePage();
        this.config = this.getConfig((data && data.hubType) || 'liveScore');
        this.updateMeta();
        this.applyMatches();
      });

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.archivePage = this.getArchivePage();
        this.applyMatches();
      });

    if (this.isServerRender()) {
      this.loadSitemapLinks();
      return;
    }

    this.matchesService.getLiveMatchesWithAutoRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (matches) => {
          this.allMatches = sortMatchesByPriority(matches || []);
          this.liveMatches = filterLiveMatches(this.allMatches);
          this.upcomingMatches = filterUpcomingMatches(this.allMatches);
          this.completedMatches = filterCompletedMatches(this.allMatches);
          this.isLoading = false;
          this.hasError = false;
          this.applyMatches();
        },
        () => {
          this.allMatches = [];
          this.primaryMatches = [];
          this.discoveryMatches = [];
          this.liveMatches = [];
          this.upcomingMatches = [];
          this.completedMatches = [];
          this.isLoading = false;
          this.hasError = true;
        }
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMatchHref(match: MatchCardViewModel): string {
    return buildCanonicalMatchPath(match) || '/matches';
  }

  getMatchLabel(match: MatchCardViewModel): string {
    return buildCanonicalMatchLinkLabel(match);
  }

  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  trackByPage(index: number, page: number): number {
    return page;
  }

  trackByFallbackLink(index: number, link: HubFallbackLink): string {
    return link.href;
  }

  getMatchStatusLabel(match: MatchCardViewModel): string {
    if (!match) {
      return 'Match';
    }

    if (match.status === MatchStatus.UPCOMING) {
      return 'Upcoming';
    }
    if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED) {
      return 'Result';
    }
    return 'Live';
  }

  getArchiveHref(page: number): string {
    return page <= 1 ? '/live-score/archive' : '/live-score/archive/' + page;
  }

  private applyMatches(): void {
    if (!this.allMatches) {
      return;
    }

    var matches = this.getMatchesForHub(this.config.type);
    this.primaryMatches = this.limitUnique(matches, this.config.type === 'archive' ? this.archivePageSize : 36);
    this.discoveryMatches = this.limitUnique(this.allMatches, 120);
    this.visibleSitemapLinks = this.getVisibleSitemapLinks();
    this.archivePageLinks = this.buildArchivePageLinks();
  }

  private loadSitemapLinks(): void {
    this.isLoading = true;
    this.hasError = false;

    this.http.get('/sitemaps/sitemap-matches-0001.xml', { responseType: 'text' })
      .pipe(
        timeout(this.sitemapRequestTimeoutMs),
        map((xml) => this.parseSitemapLinks(xml || '')),
        catchError(() => {
          return [this.getSeedLinks()] as any;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((links: HubFallbackLink[]) => {
        this.sitemapLinks = this.uniqueFallbackLinks(links || []);
        this.visibleSitemapLinks = this.getVisibleSitemapLinks();
        this.archivePageLinks = this.buildArchivePageLinks();
        this.isLoading = false;
        this.hasError = false;
      });
  }

  private parseSitemapLinks(xml: string): HubFallbackLink[] {
    var links: HubFallbackLink[] = [];
    var pattern = /<loc>https:\/\/www\.crickzen\.com(\/cric-live\/[^<]+)<\/loc>/gi;
    var match: RegExpExecArray | null;

    while ((match = pattern.exec(xml)) !== null && links.length < 500) {
      var href = match[1];
      links.push({
        href: href,
        label: this.buildLabelFromHref(href)
      });
    }

    return links.length > 0 ? links : this.getSeedLinks();
  }

  private getVisibleSitemapLinks(): HubFallbackLink[] {
    var links = this.sitemapLinks || [];
    if (this.config.type === 'archive') {
      var start = Math.max(0, (this.archivePage - 1) * this.archivePageSize);
      return links.slice(start, start + this.archivePageSize);
    }

    return links.slice(0, 160);
  }

  private uniqueFallbackLinks(links: HubFallbackLink[]): HubFallbackLink[] {
    var seen: { [key: string]: boolean } = {};
    var unique: HubFallbackLink[] = [];

    links.forEach((link) => {
      if (!link || !link.href || seen[link.href]) {
        return;
      }

      seen[link.href] = true;
      unique.push(link);
    });

    return unique;
  }

  private buildLabelFromHref(href: string): string {
    var slug = String(href || '').replace(/^\/cric-live\//, '');
    var clean = slug.replace(/-match-updates-[a-z0-9]+$/i, '');
    var parts = clean.split('-').filter(Boolean);
    var vsIndex = parts.indexOf('vs');

    if (vsIndex > 0 && vsIndex < parts.length - 1) {
      var team1 = this.formatSlugTokens(parts.slice(0, vsIndex));
      var team2End = parts.findIndex((part, index) => index > vsIndex && /^\d+(st|nd|rd|th)$/i.test(part));
      var team2 = this.formatSlugTokens(parts.slice(vsIndex + 1, team2End > -1 ? team2End : Math.min(parts.length, vsIndex + 3)));
      return team1 + ' vs ' + team2 + ' live score';
    }

    return this.formatSlugTokens(parts.slice(0, 8)) + ' live score';
  }

  private formatSlugTokens(tokens: string[]): string {
    return tokens
      .filter(Boolean)
      .map((token) => token.length <= 4 ? token.toUpperCase() : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }

  private getSeedLinks(): HubFallbackLink[] {
    return [
      {
        href: '/cric-live/pak-w-vs-sa-w-11th-match-womens-t20-world-cup-2026-match-updates-X0Z',
        label: 'PAK W vs SA W live score'
      }
    ];
  }

  private isServerRender(): boolean {
    return typeof window === 'undefined' || !!((window as any).__SSR__);
  }

  private getMatchesForHub(type: SeoHubType): MatchCardViewModel[] {
    if (type === 'today') {
      return this.allMatches.filter((match) => this.isTodayMatch(match) || this.isLiveMatch(match));
    }

    if (type === 'ipl' || type === 'iplSchedule') {
      return this.allMatches.filter((match) => this.isIplMatch(match));
    }

    if (type === 'scheduleToday') {
      return this.upcomingMatches.filter((match) => this.isTodayMatch(match));
    }

    if (type === 'archive') {
      var canonicalMatches = this.limitUnique(this.allMatches, 1000);
      var start = Math.max(0, (this.archivePage - 1) * this.archivePageSize);
      return canonicalMatches.slice(start, start + this.archivePageSize);
    }

    return this.allMatches;
  }

  private limitUnique(matches: MatchCardViewModel[], limit: number): MatchCardViewModel[] {
    var seen: { [key: string]: boolean } = {};
    var result: MatchCardViewModel[] = [];

    (matches || []).forEach((match) => {
      var href = buildCanonicalMatchPath(match);
      if (!href || seen[href] || result.length >= limit) {
        return;
      }

      seen[href] = true;
      result.push(match);
    });

    return result;
  }

  private isTodayMatch(match: MatchCardViewModel): boolean {
    if (!match || !match.startTime || isNaN(match.startTime.getTime())) {
      return false;
    }

    var now = new Date();
    return match.startTime.getFullYear() === now.getFullYear()
      && match.startTime.getMonth() === now.getMonth()
      && match.startTime.getDate() === now.getDate();
  }

  private isLiveMatch(match: MatchCardViewModel): boolean {
    return !!match && (
      match.status === MatchStatus.LIVE
      || match.status === MatchStatus.INNINGS_BREAK
      || match.status === MatchStatus.RAIN_DELAY
    );
  }

  private isIplMatch(match: MatchCardViewModel): boolean {
    var text = [
      match && match.seriesName,
      match && match.matchUrl,
      match && match.id,
      match && match.externalMatchKey
    ].join(' ').toLowerCase();

    return text.indexOf('indian premier league') !== -1
      || /(^|[^a-z])ipl([^a-z]|$)/i.test(text);
  }

  private buildArchivePageLinks(): number[] {
    var total = this.sitemapLinks && this.sitemapLinks.length > 0
      ? this.sitemapLinks.length
      : this.limitUnique(this.allMatches, 1000).length;
    var pages = Math.max(1, Math.ceil(total / this.archivePageSize));
    var capped = Math.min(pages, 10);
    var result: number[] = [];

    for (var page = 1; page <= capped; page++) {
      result.push(page);
    }

    return result;
  }

  private getArchivePage(): number {
    var value = this.route.snapshot.paramMap.get('page');
    var parsed = value ? parseInt(value, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }

  private updateMeta(): void {
    this.metaTagsService.setPageMeta(this.config.canonicalPath, {
      title: this.config.title + ' | Crickzen',
      description: this.config.intro,
      canonicalUrl: 'https://www.crickzen.com' + this.config.canonicalPath,
      robots: 'index,follow',
      og: {
        title: this.config.title + ' | Crickzen',
        description: this.config.intro,
        url: 'https://www.crickzen.com' + this.config.canonicalPath
      },
      twitter: {
        card: 'summary'
      }
    });
  }

  private getConfig(type: SeoHubType): HubConfig {
    switch (type) {
      case 'today':
        return {
          type: 'today',
          canonicalPath: '/live-score/today',
          eyebrow: 'Today live score',
          title: 'Live Score Today',
          intro: 'Follow today match live score, scorecard, toss update, playing XI, venue stats, and cricket match result updates.',
          emptyText: 'No today match live score links are available yet. Upcoming and recent match links are listed below for discovery.'
        };
      case 'ipl':
        return {
          type: 'ipl',
          canonicalPath: '/live-score/ipl',
          eyebrow: 'IPL live score',
          title: 'IPL Live Score Today',
          intro: 'Track IPL live score today with scorecard, toss update, playing XI, venue stats, and match result links.',
          emptyText: 'No IPL match links are available in the current feed yet. Check the archive and schedule links below.'
        };
      case 'scheduleToday':
        return {
          type: 'scheduleToday',
          canonicalPath: '/cricket-schedule/today',
          eyebrow: 'Today schedule',
          title: 'Cricket Schedule Today',
          intro: 'Browse today cricket schedule with direct links to live score pages, scorecards, toss updates, playing XI, and match result trackers.',
          emptyText: 'No scheduled matches for today are available yet. Live and recent match links are listed below.'
        };
      case 'iplSchedule':
        return {
          type: 'iplSchedule',
          canonicalPath: '/cricket-schedule/ipl-2026',
          eyebrow: 'IPL 2026 schedule',
          title: 'IPL 2026 Schedule And Live Score',
          intro: 'Find IPL 2026 fixtures, live score links, scorecards, toss updates, playing XI, and match result pages.',
          emptyText: 'No IPL 2026 schedule links are available in the current feed yet. Check back as fixtures sync.'
        };
      case 'archive':
        return {
          type: 'archive',
          canonicalPath: this.archivePage <= 1 ? '/live-score/archive' : '/live-score/archive/' + this.archivePage,
          eyebrow: 'Match archive',
          title: 'Cricket Match Discovery Archive',
          intro: 'Explore indexed cricket match pages with direct links to live scores, scorecards, toss updates, playing XI, and match results.',
          emptyText: 'No archive match links are available yet.'
        };
      case 'liveScore':
      default:
        return {
          type: 'liveScore',
          canonicalPath: '/live-score',
          eyebrow: 'Cricket live score hub',
          title: 'Cricket Live Score Today',
          intro: 'Follow cricket live score today with direct match links for scorecard, toss update, playing XI, venue stats, and match result updates.',
          emptyText: 'No live score match links are available yet. Upcoming and recent match links will appear as the feed syncs.'
        };
    }
  }
}
