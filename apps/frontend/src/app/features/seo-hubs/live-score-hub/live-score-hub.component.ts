import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { catchError, map, takeUntil, timeout } from 'rxjs/operators';

import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, filterCompletedMatches, filterLiveMatches, filterUpcomingMatches, filterUpcomingMatchesInHours, prioritizeUpcomingMatchesForDiscovery, sortMatchesByPriority } from '../../../core/utils/match-utils';
import { MatchCardViewModel, MatchStatus } from '../../matches/models/match-card.models';
import { MatchesService } from '../../matches/services/matches.service';
import { MetaTagsService } from '../../../seo/meta-tags.service';
import { StructuredDataService } from '../../../seo/structured-data.service';
import { MatchFreshnessLink, buildFreshnessDiscoveryLinksForMatches } from '../../../seo/match-freshness-links';

type SeoHubType = 'liveScore' | 'liveCricketScore' | 'today' | 'ipl' | 'scheduleToday' | 'iplSchedule' | 'archive';

interface HubConfig {
  type: SeoHubType;
  canonicalPath: string;
  eyebrow: string;
  title: string;
  intro: string;
  primaryKicker: string;
  primaryHeading: string;
  primarySummary: string;
  discoveryKicker: string;
  discoveryHeading: string;
  discoverySummary: string;
  fallbackCardText: string;
  faqHeading: string;
  faqs: HubFaq[];
  emptyText: string;
}

interface HubFallbackLink {
  href: string;
  label: string;
}

interface HubFaq {
  question: string;
  answer: string;
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
  private readonly discoveryUpcomingWindowHours = 48;
  readonly displayTimezone = 'Asia/Kolkata';
  readonly displayTimezoneLabel = 'IST';

  config: HubConfig = this.getConfig('liveScore');
  allMatches: MatchCardViewModel[] = [];
  liveSectionMatches: MatchCardViewModel[] = [];
  upcomingSectionMatches: MatchCardViewModel[] = [];
  recentSectionMatches: MatchCardViewModel[] = [];
  discoveryMatches: MatchCardViewModel[] = [];
  liveMatches: MatchCardViewModel[] = [];
  upcomingMatches: MatchCardViewModel[] = [];
  completedMatches: MatchCardViewModel[] = [];
  sitemapLinks: HubFallbackLink[] = [];
  fallbackSitemapMatches: HubFallbackLink[] = [];
  primaryFallbackLinks: HubFallbackLink[] = [];
  visibleSitemapLinks: HubFallbackLink[] = [];
  discoveryFallbackLinks: HubFallbackLink[] = [];
  // Upcoming fixtures are a first-class SSR discovery lane. It must not wait
  // for the heavier live-score/scorecard fan-out to settle.
  prematchDiscoveryLinks: HubFallbackLink[] = [];
  resultSupportLinks: MatchFreshnessLink[] = [];
  archivePageLinks: number[] = [];
  archivePage = 1;
  isLoading = true;
  hasError = false;

  MatchStatus = MatchStatus;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private matchesService: MatchesService,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService
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
      this.loadPrematchDiscoveryLinks();
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
          if (this.config.type === 'archive' && this.sitemapLinks.length === 0) {
            this.loadSitemapLinks();
          }
        },
        () => {
          this.allMatches = [];
          this.liveSectionMatches = [];
          this.upcomingSectionMatches = [];
          this.recentSectionMatches = [];
          this.discoveryMatches = [];
          this.liveMatches = [];
          this.upcomingMatches = [];
          this.completedMatches = [];
          this.isLoading = false;
          this.hasError = true;
          this.applyMatches();
          this.loadSitemapLinks();
        }
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.structuredDataService.clearPageSchemas();
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

  trackBySupportLink(index: number, link: MatchFreshnessLink): string {
    return link.href;
  }

  trackByFaq(index: number, faq: HubFaq): string {
    return faq.question;
  }

  getMatchStatusLabel(match: MatchCardViewModel): string {
    if (!match) {
      return 'Match';
    }

    if (match.status === MatchStatus.UPCOMING) {
      return this.config.type === 'scheduleToday' ? 'Upcoming fixture' : 'Upcoming live score';
    }
    if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED) {
      return 'Result';
    }
    return 'Live now';
  }

  getArchiveHref(page: number): string {
    return page <= 1 ? '/live-score/archive' : '/live-score/archive/' + page;
  }

  getMatchCardDescription(match: MatchCardViewModel): string {
    if (!match) {
      return 'Cricket match page with live score, scorecard, toss update, playing XI, and match result context.';
    }

    var teams = this.getMatchLabel(match);
    var series = match.seriesName || 'Cricket match';
    var venue = match.venue || 'Venue TBD';

    if (this.config.type === 'scheduleToday') {
      var timingIntent = this.isTodayMatch(match) ? 'today match time' : 'match date and time';
      return series + ' fixture with ' + timingIntent + ', venue, teams, and live score link.';
    }

    if (this.config.type === 'iplSchedule') {
      return 'IPL 2026 fixture link with schedule, scorecard, toss update, playing XI, and match result path.';
    }

    if (this.config.type === 'ipl') {
      return 'IPL live score today page for ' + teams + ' with scorecard, toss update, playing XI, and match updates.';
    }

    if (this.config.type === 'today') {
      return 'Today match live score page for ' + teams + ' with scorecard, toss update, playing XI, and result updates.';
    }

    if (this.config.type === 'archive') {
      return 'Indexed cricket match page for scorecard, match result, venue stats, and historical live score context.';
    }

    return series + ' at ' + venue + ' with live score today, scorecard, toss update, playing XI, and match result.';
  }

  private applyMatches(): void {
    var matches = this.getMatchesForHub(this.config.type);
    this.liveSectionMatches = this.limitUnique(filterLiveMatches(matches), 12);
    this.upcomingSectionMatches = this.limitUnique(this.getUpcomingPriorityMatches(matches), this.config.type === 'scheduleToday' ? 18 : 14);
    this.recentSectionMatches = this.limitUnique(filterCompletedMatches(matches), 12);
    var primaryHrefs = this.collectMatchHrefs(
      ([] as MatchCardViewModel[])
        .concat(this.liveSectionMatches)
        .concat(this.upcomingSectionMatches)
        .concat(this.recentSectionMatches)
    );
    this.resultSupportLinks = this.buildResultSupportLinks(matches)
      .filter((link) => !!link && !primaryHrefs[link.href]);
    var renderedHrefs = this.extendHrefSet(primaryHrefs, this.resultSupportLinks);
    this.discoveryMatches = this.limitUnique(this.buildDiscoveryMatches(matches, renderedHrefs), 120);
    this.visibleSitemapLinks = this.getVisibleSitemapLinks();
    this.fallbackSitemapMatches = this.shouldUseSitemapFallback()
      ? this.getPrimaryFallbackLinks()
      : [];
    this.primaryFallbackLinks = this.fallbackSitemapMatches;
    this.discoveryFallbackLinks = this.shouldUseSitemapFallback()
      ? this.getDiscoveryFallbackLinks()
      : [];
    if (this.prematchDiscoveryLinks.length > 0) {
      this.discoveryFallbackLinks = this.uniqueFallbackLinks(
        this.prematchDiscoveryLinks.concat(this.discoveryFallbackLinks)
      ).slice(0, 220);
    }
    this.archivePageLinks = this.buildArchivePageLinks();
    this.updateStructuredData();
  }

  private loadSitemapLinks(): void {
    this.http.get('/sitemaps/sitemap-archive-0001.xml', { responseType: 'text' })
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
        this.applyMatches();
      });
  }

  private loadPrematchDiscoveryLinks(): void {
    this.http.get('/api/cricket-data/match-cohorts', { params: { _ts: Date.now().toString(), includeArchive: 'false' } })
      .pipe(
        timeout(this.sitemapRequestTimeoutMs),
        map((response: any) => {
          var rows = response && Array.isArray(response.upcoming) ? response.upcoming : [];
          return rows
            .filter((match: any) => this.isEligiblePrematchRecord(match))
            .map((match: any) => {
              var href = buildCanonicalMatchPath(match);
              if (!href) {
                return null;
              }
              return { href: href, label: buildCanonicalMatchLinkLabel(match) } as HubFallbackLink;
            })
            .filter((link: HubFallbackLink | null): link is HubFallbackLink => !!link)
            .slice(0, 220);
        }),
        catchError(() => [] as any),
        takeUntil(this.destroy$)
      )
      .subscribe((links: HubFallbackLink[]) => {
        this.prematchDiscoveryLinks = this.uniqueFallbackLinks(links || []);
        // Let SSR publish the crawlable upcoming lane immediately; the live
        // score fan-out can continue hydrating without blocking first HTML.
        if (this.isServerRender() && this.prematchDiscoveryLinks.length > 0) {
          this.isLoading = false;
        }
        this.applyMatches();
      });
  }

  private isEligiblePrematchRecord(match: any): boolean {
    if (!match || String(match.status || match.lifecycleCohort || '').toUpperCase() !== MatchStatus.UPCOMING) {
      return false;
    }

    var canonicalRecord = {
      matchUrl: match.matchUrl || match.url || match.match_link || match.matchLink,
      externalMatchKey: match.externalMatchKey || match.external_match_key,
      id: match.id
    };
    var href = buildCanonicalMatchPath(canonicalRecord as any);
    if (!href) {
      return false;
    }

    var rawStart = match.scheduledStartTime || match.startTime || match.matchDate || match.match_date
      || match.startDate || match.start_date;
    var rawStartText = String(rawStart || '').trim();
    var start = /^\d+$/.test(rawStartText) ? parseInt(rawStartText, 10) : Date.parse(rawStartText);
    if (start > 0 && start < 100000000000) {
      start *= 1000;
    }

    return isFinite(start) && start > Date.now();
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
    return this.getPrimaryFallbackLinks();
  }

  private getPrimaryFallbackLinks(): HubFallbackLink[] {
    var links = this.sitemapLinks || [];
    if (this.config.type === 'archive') {
      var start = Math.max(0, (this.archivePage - 1) * this.archivePageSize);
      return links.slice(start, start + this.archivePageSize);
    }

    if (this.config.type === 'ipl' || this.config.type === 'iplSchedule') {
      var iplLinks = this.filterFallbackLinksByIntent(links, 'ipl');
      return (iplLinks.length > 0 ? iplLinks : links).slice(0, 90);
    }

    if (this.config.type === 'scheduleToday') {
      return [];
    }

    if (this.config.type === 'today') {
      return [];
    }

    return links.slice(0, 140);
  }

  private getDiscoveryFallbackLinks(): HubFallbackLink[] {
    var links = this.sitemapLinks || [];
    if (links.length === 0) {
      return [];
    }

    if (this.config.type === 'archive') {
      var archiveStart = Math.max(0, this.archivePage * this.archivePageSize);
      var archiveLinks = links.slice(archiveStart, archiveStart + 220);
      return archiveLinks.length > 0 ? archiveLinks : links.slice(0, 220);
    }

    if (this.config.type === 'ipl' || this.config.type === 'iplSchedule') {
      var filtered = this.filterFallbackLinksByIntent(links, 'ipl');
      if (filtered.length >= 120) {
        return filtered.slice(0, 220);
      }
      return this.uniqueFallbackLinks(filtered.concat(links.slice(160, 340))).slice(0, 220);
    }

    if (this.config.type === 'scheduleToday') {
      return [];
    }

    if (this.config.type === 'today') {
      return [];
    }

    return links.slice(40, 260).length > 0 ? links.slice(40, 260) : links.slice(0, 220);
  }

  private filterFallbackLinksByIntent(links: HubFallbackLink[], intent: 'ipl'): HubFallbackLink[] {
    return (links || []).filter((link) => {
      var text = ((link && link.href) || '') + ' ' + ((link && link.label) || '');
      text = text.toLowerCase();

      if (intent === 'ipl') {
        return text.indexOf('ipl') !== -1
          || text.indexOf('indian premier league') !== -1;
      }

      return false;
    });
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
    if (type === 'archive') {
      var canonicalMatches = this.limitUnique(filterCompletedMatches(this.allMatches), 1000);
      var start = Math.max(0, (this.archivePage - 1) * this.archivePageSize);
      return canonicalMatches.slice(start, start + this.archivePageSize);
    }

    if (type === 'ipl' || type === 'iplSchedule') {
      return this.allMatches.filter((match) => this.isIplMatch(match));
    }

    if (type === 'today') {
      return this.limitUnique(([] as MatchCardViewModel[])
        .concat(filterLiveMatches(this.allMatches))
        .concat(this.getUpcomingPriorityMatches(this.allMatches))
        .concat(filterCompletedMatches(this.allMatches).slice(0, 16)), 96);
    }

    if (type === 'scheduleToday') {
      return this.limitUnique(([] as MatchCardViewModel[])
        .concat(this.getUpcomingPriorityMatches(this.allMatches))
        .concat(filterLiveMatches(this.allMatches))
        .concat(filterCompletedMatches(this.allMatches).slice(0, 12)), 96);
    }

    return this.limitUnique(([] as MatchCardViewModel[])
      .concat(filterLiveMatches(this.allMatches))
      .concat(this.getUpcomingPriorityMatches(this.allMatches))
      .concat(filterCompletedMatches(this.allMatches))
      .concat(this.allMatches), 160);
  }

  private getUpcomingPriorityMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
    if (this.config.type === 'today' || this.config.type === 'scheduleToday') {
      return this.limitUnique(
        filterUpcomingMatchesInHours(matches, 0, this.discoveryUpcomingWindowHours),
        48
      );
    }

    var todayUpcoming = filterUpcomingMatches(matches).filter((match) => this.isTodayMatch(match));
    var prioritizedUpcoming = prioritizeUpcomingMatchesForDiscovery(matches, 12, this.discoveryUpcomingWindowHours);

    return this.limitUnique(([] as MatchCardViewModel[])
      .concat(prioritizedUpcoming)
      .concat(todayUpcoming)
      .concat(filterUpcomingMatches(matches)), 48);
  }

  private buildDiscoveryMatches(matches: MatchCardViewModel[], excludedHrefs: { [key: string]: boolean } = {}): MatchCardViewModel[] {
    var seen: { [key: string]: boolean } = {};
    return (matches || []).filter((match) => {
      var href = buildCanonicalMatchPath(match);
      if (!href || excludedHrefs[href] || seen[href]) {
        return false;
      }
      seen[href] = true;
      return true;
    });
  }

  private collectMatchHrefs(matches: MatchCardViewModel[]): { [key: string]: boolean } {
    var hrefs: { [key: string]: boolean } = {};
    (matches || []).forEach((match) => {
      var href = buildCanonicalMatchPath(match);
      if (href) {
        hrefs[href] = true;
      }
    });
    return hrefs;
  }

  private extendHrefSet(base: { [key: string]: boolean }, links: MatchFreshnessLink[]): { [key: string]: boolean } {
    var result: { [key: string]: boolean } = {};
    Object.keys(base || {}).forEach((href) => result[href] = true);
    (links || []).forEach((link) => {
      if (link && link.href) {
        result[link.href] = true;
      }
    });
    return result;
  }

  private buildResultSupportLinks(matches: MatchCardViewModel[]): MatchFreshnessLink[] {
    // Match reports are not deployed yet. The archive must expose completed canonical
    // match pages only, rather than linking crawlers and users to known 404 routes.
    if (this.config.type === 'archive') {
      return [];
    }

    var completedMatches = this.limitUnique(filterCompletedMatches(matches), 12);
    return buildFreshnessDiscoveryLinksForMatches(completedMatches, 12)
      .filter(function(link) { return link.type === 'result'; });
  }

  private shouldUseSitemapFallback(): boolean {
    if (this.config.type === 'archive' || this.config.type === 'today' || this.config.type === 'scheduleToday') {
      return false;
    }

    return this.sitemapLinks.length > 0
      && this.liveSectionMatches.length === 0
      && this.upcomingSectionMatches.length === 0
      && this.recentSectionMatches.length === 0
      && this.discoveryMatches.length === 0;
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
    var total = this.limitUnique(filterCompletedMatches(this.allMatches), 1000).length;
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

  private updateStructuredData(): void {
    var currentUrl = 'https://www.crickzen.com' + this.config.canonicalPath;
    var items: any[] = [
      this.structuredDataService.page({
        type: 'CollectionPage',
        name: this.config.title + ' | Crickzen',
        description: this.config.intro,
        url: currentUrl
      }),
      this.structuredDataService.breadcrumbs(this.getBreadcrumbTrail()),
      this.structuredDataService.itemList({
        name: this.config.title + ' hub links',
        url: currentUrl,
        description: 'Visible navigation links from this lifecycle hub into other real cricket discovery surfaces.',
        items: [
          { name: 'Live score', url: 'https://www.crickzen.com/live-score', description: 'Open the main live-score hub.' },
          { name: 'Live cricket score', url: 'https://www.crickzen.com/live-cricket-score', description: 'Open the live-cricket-score intent hub.' },
          { name: 'Live score today', url: 'https://www.crickzen.com/live-score/today', description: 'Open today match live-score links.' },
          { name: 'IPL live score', url: 'https://www.crickzen.com/live-score/ipl', description: 'Open IPL-focused live-score links.' },
          { name: 'Cricket schedule today', url: 'https://www.crickzen.com/cricket-schedule/today', description: 'Open the schedule-first hub for upcoming fixtures.' },
          { name: 'IPL 2026 schedule', url: 'https://www.crickzen.com/cricket-schedule/ipl-2026', description: 'Open IPL fixture and result links.' },
          { name: 'Match archive', url: 'https://www.crickzen.com/live-score/archive', description: 'Open the retained archive of completed match pages.' },
          { name: 'Cricket series', url: 'https://www.crickzen.com/series', description: 'Open the current lightweight series tables and standings surface.' }
        ]
      })
    ];

    if (this.config.faqs.length > 0 && !this.isLoading) {
      items.push(this.structuredDataService.faqPage(this.config.faqs));
    }

    var primaryItems = this.getPrimaryStructuredLinks();
    if (primaryItems.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: this.config.title + ' primary match links',
        url: currentUrl,
        description: 'The primary visible canonical match links shown on this lifecycle hub.',
        items: primaryItems
      }));
    }

    var discoveryItems = this.getDiscoveryStructuredLinks();
    if (discoveryItems.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: this.config.title + ' discovery links',
        url: currentUrl,
        description: 'Additional visible canonical match links retained for discovery from this lifecycle hub.',
        items: discoveryItems
      }));
    }

    var resultItems = this.resultSupportLinks.map(function(link) {
      return {
        name: link.label,
        url: 'https://www.crickzen.com' + link.href,
        description: link.summary
      };
    });
    if (resultItems.length > 0) {
      items.push(this.structuredDataService.itemList({
        name: this.config.title + ' result support links',
        url: currentUrl,
        description: 'Visible result and highlights support links retained from recent completed fixtures.',
        items: resultItems
      }));
    }

    this.structuredDataService.setPageSchemas(items);
  }

  private getBreadcrumbTrail(): Array<{ name: string; url: string }> {
    var items: Array<{ name: string; url: string }> = [
      { name: 'Home', url: 'https://www.crickzen.com/' }
    ];

    if (this.config.type === 'today' || this.config.type === 'ipl' || this.config.type === 'archive') {
      items.push({ name: 'Live score', url: 'https://www.crickzen.com/live-score' });
    }

    if (this.config.type === 'scheduleToday' || this.config.type === 'iplSchedule') {
      items.push({ name: 'Cricket schedule', url: 'https://www.crickzen.com/cricket-schedule/today' });
    }

    if (this.config.canonicalPath !== '/live-score' && this.config.canonicalPath !== '/cricket-schedule/today') {
      items.push({ name: this.config.title, url: 'https://www.crickzen.com' + this.config.canonicalPath });
      return items;
    }

    if (this.config.canonicalPath === '/live-score') {
      items.push({ name: 'Cricket live score today', url: 'https://www.crickzen.com/live-score' });
    }

    if (this.config.canonicalPath === '/cricket-schedule/today') {
      items.push({ name: 'Cricket schedule today', url: 'https://www.crickzen.com/cricket-schedule/today' });
    }

    return items;
  }

  private getPrimaryStructuredLinks(): Array<{ name: string; url: string; description: string }> {
    var matches = this.limitUnique(([] as MatchCardViewModel[])
      .concat(this.liveSectionMatches)
      .concat(this.upcomingSectionMatches)
      .concat(this.recentSectionMatches), 48);

    if (matches.length > 0) {
      return matches.map((match) => ({
        name: this.getMatchLabel(match),
        url: 'https://www.crickzen.com' + this.getMatchHref(match),
        description: this.getMatchCardDescription(match)
      }));
    }

    return (this.fallbackSitemapMatches || []).map((link) => ({
      name: link.label,
      url: 'https://www.crickzen.com' + link.href,
      description: this.config.fallbackCardText
    }));
  }

  private getDiscoveryStructuredLinks(): Array<{ name: string; url: string; description: string }> {
    if (this.discoveryMatches.length > 0) {
      return this.discoveryMatches.map((match) => ({
        name: this.getMatchLabel(match),
        url: 'https://www.crickzen.com' + this.getMatchHref(match),
        description: this.getMatchCardDescription(match)
      }));
    }

    return (this.discoveryFallbackLinks || []).map((link) => ({
      name: link.label,
      url: 'https://www.crickzen.com' + link.href,
      description: this.config.fallbackCardText
    }));
  }

  private getConfig(type: SeoHubType): HubConfig {
    switch (type) {
      case 'today':
        return {
          type: 'today',
          canonicalPath: '/live-score/today',
          eyebrow: 'Today live score',
          title: 'Live Score Today',
          intro: 'Follow today match live score, cricket live score today, live cricket score today, and today cricket match scorecard updates with toss, playing XI, venue stats, and match result links.',
          primaryKicker: 'Today match live score',
          primaryHeading: 'Today live, upcoming, and recent cricket matches',
          primarySummary: 'Prioritised links for live matches today, upcoming matches today, and recent completed matches with scorecard paths.',
          discoveryKicker: 'Today discovery links',
          discoveryHeading: 'More today match live score and scorecard pages',
          discoverySummary: 'Extra crawlable match links keep the today hub connected to canonical live score and result pages.',
          fallbackCardText: 'Canonical match page with live score today, today cricket match scorecard, toss update, playing XI, and match result context.',
          faqHeading: 'Live score today FAQ',
          faqs: [
            {
              question: 'Where can I check today cricket match live score?',
              answer: 'Use this page to open today match live score pages with scorecard, toss update, playing XI, venue stats, and match result context.'
            },
            {
              question: 'How often is the live score updated?',
              answer: 'Live score pages refresh from the match feed as new score, match-info, and scorecard updates arrive.'
            },
            {
              question: 'Can I see toss and playing XI updates?',
              answer: 'Yes. Each linked match page keeps toss update and playing XI sections visible, with honest placeholders before confirmed news arrives.'
            },
            {
              question: 'Where can I see today match scorecard?',
              answer: 'Open any linked canonical match page to follow today cricket match scorecard, result, and venue details.'
            }
          ],
          emptyText: 'No today match live score links are available yet. Upcoming and recent match links are listed below for discovery.'
        };
      case 'ipl':
        return {
          type: 'ipl',
          canonicalPath: '/live-score/ipl',
          eyebrow: 'IPL live score',
          title: 'IPL Live Score Today',
          intro: 'Track IPL live score today, IPL scorecard, IPL match live updates, and IPL 2026 live score links with toss, playing XI, venue stats, and match result pages.',
          primaryKicker: 'IPL scorecard links',
          primaryHeading: 'IPL live score today and match updates',
          primarySummary: 'IPL-focused links for live score, scorecard, toss update, playing XI, and IPL 2026 match result intent.',
          discoveryKicker: 'IPL discovery graph',
          discoveryHeading: 'More IPL live score and schedule links',
          discoverySummary: 'IPL pages stay connected to fixtures, scorecards, and canonical match pages while broader discovery remains available if the feed is thin.',
          fallbackCardText: 'IPL match page with live score today, IPL scorecard, toss update, playing XI, and IPL match result context.',
          faqHeading: 'IPL live score FAQ',
          faqs: [
            {
              question: 'Where can I check IPL live score today?',
              answer: 'Use this IPL hub to open canonical IPL match pages for live score today, scorecard, toss update, and playing XI.'
            },
            {
              question: 'Does this page show IPL scorecard and toss updates?',
              answer: 'The hub links to match pages that keep scorecard, toss update, playing XI, venue stats, and match result sections together.'
            },
            {
              question: 'Can I follow IPL 2026 match updates here?',
              answer: 'Yes. IPL 2026 live score and schedule links remain connected through this hub and the IPL schedule page.'
            }
          ],
          emptyText: 'No IPL match links are available in the current feed yet. Check the archive and schedule links below.'
        };
      case 'scheduleToday':
        return {
          type: 'scheduleToday',
          canonicalPath: '/cricket-schedule/today',
          eyebrow: 'Today schedule',
          title: 'Cricket Schedule Today',
          intro: 'Browse cricket schedule today with today cricket match time, today match list, cricket fixtures today, venue, tournament, and live score links.',
          primaryKicker: 'Today match list',
          primaryHeading: 'Today cricket fixtures, time, venue, and live score links',
          primarySummary: 'Schedule-first match cards show teams, tournament, match time, venue, and the canonical live score path.',
          discoveryKicker: 'Fixture discovery links',
          discoveryHeading: 'More cricket fixtures and live score pages',
          discoverySummary: 'Additional crawlable links help users and crawlers move from schedule intent to canonical scorecard and result pages.',
          fallbackCardText: 'Today cricket schedule link with match time, teams, tournament, venue, and live score path.',
          faqHeading: 'Cricket schedule today FAQ',
          faqs: [
            {
              question: 'Where can I see today cricket schedule?',
              answer: 'This schedule hub lists today match links with time, venue, tournament, teams, and live score access.'
            },
            {
              question: 'Does the schedule include match time and venue?',
              answer: 'When the feed provides it, each card shows match time and venue; otherwise the match page keeps the latest available schedule context.'
            },
            {
              question: 'Can I open live score from the schedule page?',
              answer: 'Yes. Each fixture links directly to its canonical live score and scorecard page.'
            }
          ],
          emptyText: 'No scheduled matches for today are available yet. Live and recent match links are listed below.'
        };
      case 'iplSchedule':
        return {
          type: 'iplSchedule',
          canonicalPath: '/cricket-schedule/ipl-2026',
          eyebrow: 'IPL 2026 schedule',
          title: 'IPL 2026 Schedule And Live Score',
          intro: 'Find IPL 2026 schedule, IPL 2026 fixtures, IPL match list, IPL live score links, scorecards, toss updates, playing XI, and match result pages.',
          primaryKicker: 'IPL 2026 fixtures',
          primaryHeading: 'IPL 2026 match list, fixtures, and live score links',
          primarySummary: 'Schedule-focused IPL links keep fixtures, scorecards, live updates, and result pages connected.',
          discoveryKicker: 'IPL schedule discovery',
          discoveryHeading: 'More IPL fixtures, scorecards, and results',
          discoverySummary: 'Use these links to move between IPL schedule intent and canonical match result or live score pages.',
          fallbackCardText: 'IPL 2026 fixture page with schedule, IPL live score, scorecard, toss update, playing XI, and match result context.',
          faqHeading: 'IPL 2026 schedule FAQ',
          faqs: [
            {
              question: 'Where can I see IPL 2026 schedule?',
              answer: 'This page groups IPL 2026 fixtures and links each match to its canonical live score and scorecard page.'
            },
            {
              question: 'Can I open IPL live score from the fixture list?',
              answer: 'Yes. Every listed IPL fixture links to the match page used for live score, toss, playing XI, scorecard, and result updates.'
            },
            {
              question: 'Does this page include IPL match result links?',
              answer: 'Completed IPL matches continue to link to durable scorecard and match result pages.'
            }
          ],
          emptyText: 'No IPL 2026 schedule links are available in the current feed yet. Check back as fixtures sync.'
        };
      case 'archive':
        return {
          type: 'archive',
          canonicalPath: this.archivePage <= 1 ? '/live-score/archive' : '/live-score/archive/' + this.archivePage,
          eyebrow: 'Match archive',
          title: 'Cricket Match Discovery Archive',
          intro: 'Explore indexed cricket match pages with direct links to live scores, scorecards, toss updates, playing XI, venue stats, and match results.',
          primaryKicker: 'Indexed match archive',
          primaryHeading: 'Paginated cricket live score and scorecard archive',
          primarySummary: 'Archive pages expose older canonical match URLs so crawlers can discover match results beyond today and IPL hubs.',
          discoveryKicker: 'Archive pagination',
          discoveryHeading: 'More archived cricket scorecard pages',
          discoverySummary: 'Paginated discovery links reduce orphan match URLs without forcing every archive URL onto the homepage.',
          fallbackCardText: 'Archived canonical match page with scorecard, match result, toss update, playing XI, and venue stats.',
          faqHeading: 'Cricket match archive FAQ',
          faqs: [
            {
              question: 'Why does Crickzen have a match archive?',
              answer: 'The archive gives users and crawlers a clear path to older live score, scorecard, and match result pages.'
            },
            {
              question: 'Are archived match pages canonical?',
              answer: 'Yes. Archive links point to canonical `/cric-live/` match pages, not duplicate live-score URLs.'
            },
            {
              question: 'Can I find completed match scorecards here?',
              answer: 'Yes. Completed match pages remain available for scorecard, result, and venue context when data is available.'
            }
          ],
          emptyText: 'No archive match links are available yet.'
        };
      case 'liveCricketScore':
        return {
          type: 'liveCricketScore',
          canonicalPath: '/live-cricket-score',
          eyebrow: 'Live cricket score',
          title: 'Live Cricket Score',
          intro: 'Track live cricket score, live score cricket, ball-by-ball match updates, scorecard, toss update, playing XI, venue stats, and cricket match result links.',
          primaryKicker: 'Live cricket score centre',
          primaryHeading: 'Live cricket score, scorecard, and commentary-style updates',
          primarySummary: 'A keyword-focused live cricket score hub inspired by ranking cricket sites, while still linking to Crickzen canonical match pages.',
          discoveryKicker: 'Live score discovery graph',
          discoveryHeading: 'More live cricket score and scorecard pages',
          discoverySummary: 'These SSR-visible links connect the live cricket score hub to current, recent, and archived canonical match pages.',
          fallbackCardText: 'Canonical match page with live cricket score, scorecard, toss update, playing XI, venue stats, and match result context.',
          faqHeading: 'Live cricket score FAQ',
          faqs: [
            {
              question: 'Where can I check live cricket score?',
              answer: 'Use this page to open live cricket score pages with scorecard, toss update, playing XI, venue stats, and match result context.'
            },
            {
              question: 'Why does Crickzen have a live cricket score hub?',
              answer: 'Top cricket sites use clear live cricket score hubs and match pages. This hub gives users and crawlers a direct path to canonical Crickzen match pages.'
            },
            {
              question: 'Does this page replace `/cric-live/` match pages?',
              answer: 'No. The hub links to canonical `/cric-live/` match pages so we keep one stable match URL while improving live cricket score discovery.'
            }
          ],
          emptyText: 'No live cricket score links are available yet. Upcoming and recent match links will appear as the feed syncs.'
        };
      case 'liveScore':
      default:
        return {
          type: 'liveScore',
          canonicalPath: '/live-score',
          eyebrow: 'Cricket live score hub',
          title: 'Live Cricket Matches & Scores Today',
          intro: 'Follow live cricket matches and live scores today with direct links for scorecards, toss updates, playing XI, venue stats, and match results.',
          primaryKicker: 'Live score centre',
          primaryHeading: 'Live cricket matches, scores, and match updates',
          primarySummary: 'A central crawlable hub for live, upcoming, and completed cricket match pages.',
          discoveryKicker: 'Canonical discovery graph',
          discoveryHeading: 'More cricket live score and scorecard pages',
          discoverySummary: 'These extra links keep canonical match pages reachable through SSR HTML rather than sitemap-only discovery.',
          fallbackCardText: 'Canonical match page with live cricket score today, scorecard, toss update, playing XI, venue stats, and match result context.',
          faqHeading: 'Cricket live score FAQ',
          faqs: [
            {
              question: 'Where can I follow live cricket matches today?',
              answer: 'Use this hub to open canonical live match pages with live score today, scorecard, toss update, playing XI, and result updates.'
            },
            {
              question: 'Are these live score pages crawlable?',
              answer: 'Yes. The links are rendered in raw SSR HTML so users and search crawlers can reach canonical match pages.'
            },
            {
              question: 'Does Crickzen show scorecard and match result pages?',
              answer: 'Each match page keeps scorecard, venue stats, toss, playing XI, and match result sections available as data arrives.'
            }
          ],
          emptyText: 'No live score match links are available yet. Upcoming and recent match links will appear as the feed syncs.'
        };
    }
  }
}
