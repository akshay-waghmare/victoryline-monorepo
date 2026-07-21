import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, take } from 'rxjs/operators';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { CricketService, PlayerStatsSeriesDetailView } from '../../../cricket-odds/cricket-odds.service';
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, prioritizeUpcomingMatchesForDiscovery } from '../../../core/utils/match-utils';
import { MatchCardViewModel, MatchStatus } from '../../matches/models/match-card.models';
import { MatchesService } from '../../matches/services/matches.service';
import { MetaTagsService } from '../../../seo/meta-tags.service';
import { StructuredDataService } from '../../../seo/structured-data.service';
import { buildFreshnessPathFromSlug } from '../../../seo/match-freshness-links';

interface SeriesSummary {
  externalId: string;
  name: string;
  shortName?: string;
  seasonName?: string;
}

interface SeriesDiscoveryGroup {
  key: string;
  seriesName: string;
  matches: MatchCardViewModel[];
  totalMatches: number;
}

interface TeamSummary {
  externalId: string;
  name: string;
  shortName?: string;
  teamCode?: string;
}

@Component({
  selector: 'app-series-page',
  templateUrl: './series-page.component.html',
  styleUrls: ['./series-page.component.css']
})
export class SeriesPageComponent implements OnInit, OnDestroy {
  private readonly maxDiscoverySeriesGroups = 4;
  private readonly maxDiscoveryMatchesPerSeries = 4;
  seriesList: SeriesSummary[] = [];
  upcomingDiscoveryGroups: SeriesDiscoveryGroup[] = [];
  currentSeriesGroups: SeriesDiscoveryGroup[] = [];
  teamDirectory: TeamSummary[] = [];
  isLoading = true;
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private matchSubscription?: Subscription;

  selectedSeries: PlayerStatsSeriesDetailView | null = null;
  selectedStandings: PlayerStatsSeriesDetailView | null = null;
  selectedSeriesSummary: SeriesSummary | null = null;
  isDetailLoading = false;
  detailOpen = false;
  isProfileRoute = false;
  activeSection: 'matches' | 'table' | 'stats' = 'matches';
  profileMatches: MatchCardViewModel[] = [];
  private catalogueMatches: MatchCardViewModel[] = [];

  constructor(
    private cricketService: CricketService,
    private matchesService: MatchesService,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private titleService: Title,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');
    if (externalId) {
      this.isProfileRoute = true;
      this.activeSection = (this.route.snapshot.data['section'] || 'matches') as 'matches' | 'table' | 'stats';
      this.openSeriesProfile(externalId, this.route.snapshot.paramMap.get('slug') || 'series');
      this.loadDiscoveryMatches();
      return;
    }

    this.metaTagsService.setPageMeta('/series', {
      title: 'Cricket Series, Tournaments, Tables & Standings | Crickzen',
      description: 'Browse current cricket series and tournaments, then open available points tables, standings, and series summaries on Crickzen.',
      canonicalUrl: 'https://www.crickzen.com/series',
      robots: 'index,follow'
    });
    this.updateStructuredData();
    this.loadSeries();
    this.loadDiscoveryMatches();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.loadSeries(query);
    });
  }

  ngOnDestroy(): void {
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }
    this.matchesService.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.structuredDataService.clearPageSchemas();
  }

  loadSeries(query?: string): void {
    this.isLoading = true;
    this.cricketService.listSeries('crex', query).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (data) => {
        this.seriesList = (data || []).filter(series => this.isUsableSeriesEntry(series));
        this.isLoading = false;
        this.updateStructuredData();
      },
      () => {
        this.seriesList = [];
        this.isLoading = false;
        this.updateStructuredData();
      }
    );
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  private isUsableSeriesEntry(series: SeriesSummary): boolean {
    const name = String(series && (series.name || series.shortName) || '').trim();
    if (!name) { return false; }
    // The crawler currently exposes some upcoming fixtures through the series
    // list endpoint. They belong in Next fixtures, not in the competition list.
    return !/\b\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(name)
      && !/\b\d{1,3}(st|nd|rd|th)\s*(T20I?|ODI|Test|One Day|100B)\b/i.test(name);
  }

  getMatchHref(match: MatchCardViewModel): string {
    return buildCanonicalMatchPath(match) || '/matches';
  }

  getMatchLinkLabel(match: MatchCardViewModel): string {
    return buildCanonicalMatchLinkLabel(match);
  }

  getPreviewHref(match: MatchCardViewModel): string {
    var href = this.getMatchHref(match);
    if (!href || href === '/matches') {
      return '/matches';
    }

    return buildFreshnessPathFromSlug(href.replace(/^\/cric-live\//, ''), 'preview');
  }

  getSeriesDiscoverySummary(group: SeriesDiscoveryGroup): string {
    if (!group || !group.matches || !group.matches.length) {
      return 'Canonical match links will appear here when upcoming fixtures are available.';
    }

    var firstMatch = group.matches[0];
    var firstTime = firstMatch && firstMatch.timeDisplay ? firstMatch.timeDisplay : 'Soon';
    if (group.totalMatches === 1) {
      return '1 canonical match page plus its preview-support path in the current prematch discovery window. First start: ' + firstTime + '.';
    }

    return group.totalMatches + ' canonical match pages plus preview-support paths in the current prematch discovery window. First start: ' + firstTime + '.';
  }

  getSeriesDiscoveryCountLabel(group: SeriesDiscoveryGroup): string {
    if (!group) {
      return '';
    }

    if (group.totalMatches > group.matches.length) {
      return group.matches.length + ' of ' + group.totalMatches + ' links';
    }

    return group.totalMatches + ' links';
  }

  selectSeries(series: SeriesSummary): void {
    if (!series.externalId) { return; }
    this.router.navigate(['/series', series.externalId, this.toSlug(series.name)]);
  }

  private openSeriesProfile(externalId: string, slug: string): void {
    const name = slug.replace(/-/g, ' ');
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedSeries = null;
    this.selectedStandings = null;
    this.selectedSeriesSummary = { externalId: externalId, name: name };
    this.titleService.setTitle(name + ' Fixtures, Table & Stats | Crickzen');
    this.metaTagsService.setPageMeta('/series/' + encodeURIComponent(externalId) + '/' + encodeURIComponent(slug), {
      title: name + ' Fixtures, Table & Stats | Crickzen',
      description: 'Live, upcoming and recent ' + name + ' matches, points table and team statistics on Crickzen.',
      canonicalUrl: 'https://www.crickzen.com/series/' + encodeURIComponent(externalId) + '/' + encodeURIComponent(slug),
      robots: 'index,follow'
    });

    if (externalId === 'current') {
      this.profileMatches = this.filterProfileMatches(this.catalogueMatches);
      this.isDetailLoading = false;
      return;
    }

    this.isDetailLoading = true;
    const profileKey = makeStateKey<any>('series-profile:' + externalId);
    const hydrated = !isPlatformServer(this.platformId) ? this.transferState.get(profileKey, null) : null;
    if (hydrated) {
      this.applySeriesProfileBundle(hydrated, name);
      this.transferState.remove(profileKey);
      return;
    }
    forkJoin([
      this.cricketService.getPlayerStatsSeries(externalId, 'crex'),
      this.cricketService.getPlayerStatsSeriesStandings(externalId, 'crex'),
      this.cricketService.listTeams('crex')
    ]).pipe(takeUntil(this.destroy$)).subscribe(
      ([seriesDetail, standings, teams]) => {
        const bundle = { seriesDetail, standings, teams: teams || [] };
        this.applySeriesProfileBundle(bundle, name);
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(profileKey, bundle);
        }
      },
      () => {
        this.selectedSeries = null;
        this.selectedStandings = null;
        this.isDetailLoading = false;
      }
    );
  }

  private applySeriesProfileBundle(bundle: any, fallbackName: string): void {
    this.selectedSeries = bundle && bundle.seriesDetail || null;
    this.selectedStandings = bundle && bundle.standings || null;
    this.teamDirectory = bundle && bundle.teams || [];
    const resolvedName = (this.selectedSeries && this.selectedSeries.series && this.selectedSeries.series.name) || fallbackName;
    this.selectedSeriesSummary = {
      externalId: this.selectedSeries && this.selectedSeries.series && this.selectedSeries.series.externalId || this.selectedSeriesSummary!.externalId,
      name: resolvedName,
      seasonName: this.selectedSeries && this.selectedSeries.series && this.selectedSeries.series.seasonName
    };
    this.titleService.setTitle(resolvedName + ' Fixtures, Table & Stats | Crickzen');
    this.profileMatches = this.filterProfileMatches(this.catalogueMatches);
    this.isDetailLoading = false;
  }

  closeDetail(): void {
    if (this.isProfileRoute) {
      this.location.back();
      return;
    }
    this.selectedSeries = null;
    this.selectedStandings = null;
    this.selectedSeriesSummary = null;
    this.detailOpen = false;
  }

  getSeriesTypeLabel(name: string | null | undefined): string {
    if (!name) { return 'Series'; }
    if (/t20/i.test(name)) { return 'T20'; }
    if (/\bodi\b/i.test(name)) { return 'ODI'; }
    if (/\btest\b/i.test(name)) { return 'Test'; }
    if (/cup|trophy|championship|ipl|psl|bbl|cpl|sa20/i.test(name)) { return 'Tournament'; }
    return 'Series';
  }

  getSeriesTypeBadgeClass(name: string | null | undefined): string {
    const label = this.getSeriesTypeLabel(name);
    const map: { [key: string]: string } = {
      'T20': 'badge-t20', 'ODI': 'badge-odi', 'Test': 'badge-test',
      'Tournament': 'badge-tournament', 'Series': 'badge-series'
    };
    return map[label] || 'badge-series';
  }

  private readonly HIDDEN_KEYS = [
    'pageHeading', 'pageTitle', 'sectionCount', 'section',
    'externalId', 'crexId', 'crex_id', 'source', 'provider', 'url'
  ];

  getSeriesStandingsRows(): any[] {
    const POINTS_CATS = ['points_table_team_form', 'points_table', 'standings_table', 'team_standings'];
    const pools = [
      this.selectedStandings && this.selectedStandings.standings,
      this.selectedStandings && this.selectedStandings.stats,
      this.selectedSeries && this.selectedSeries.stats
    ];
    for (let p = 0; p < pools.length; p++) {
      const pool = pools[p];
      if (!pool) { continue; }
      for (let c = 0; c < POINTS_CATS.length; c++) {
        const found = pool.find(function(s: any) { return s.category === POINTS_CATS[c]; });
        if (found && found.payload) { return this.getPayloadRows(found.payload); }
      }
    }
    return [];
  }

  getSeriesSummary(): string {
    if (!this.selectedSeries || !this.selectedSeries.stats) { return ''; }
    const s = this.selectedSeries.stats.find(x => x.category === 'series_summary');
    if (!s || !s.payload) { return ''; }
    if (typeof s.payload === 'string') { return s.payload; }
    if (s.payload.summary) { return s.payload.summary; }
    if (s.payload.text) { return s.payload.text; }
    return '';
  }

  summaryExpanded = false;
  toggleSummary(): void { this.summaryExpanded = !this.summaryExpanded; }

  getSeriesOtherStats(): any[] {
    const skipped = ['series_summary', 'points_table_team_form', 'points_table', 'standings_table', 'team_standings'];
    const result: any[] = [];
    const pools = [
      this.selectedSeries && this.selectedSeries.stats,
      this.selectedStandings && this.selectedStandings.standings,
      this.selectedStandings && this.selectedStandings.stats
    ];
    for (let p = 0; p < pools.length; p++) {
      const pool = pools[p];
      if (!pool) { continue; }
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        if (skipped.indexOf(s.category) !== -1 || !s.payload) { continue; }
        if (!this.isArrayPayload(s.payload) && this.getObjectEntries(s.payload).length === 0) { continue; }
        result.push(s);
      }
    }
    return result;
  }

  getTableHeaders(payload: any): string[] {
    if (!payload) { return []; }
    if (payload.headers && Array.isArray(payload.headers)) { return payload.headers; }
    if (Array.isArray(payload) && payload.length > 0) { return Object.keys(payload[0]); }
    if (payload.rows && Array.isArray(payload.rows) && payload.rows.length > 0) {
      return Object.keys(payload.rows[0]);
    }
    return [];
  }

  getObjectEntries(payload: any): Array<{key: string, value: any}> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { return []; }
    const keys = Object.keys(payload);
    const result: Array<{key: string, value: any}> = [];
    for (let i = 0; i < keys.length; i++) {
      if (this.HIDDEN_KEYS.indexOf(keys[i]) !== -1) { continue; }
      const val = payload[keys[i]];
      if (val === null || val === undefined || val === '') { continue; }
      result.push({ key: keys[i], value: val });
    }
    return result;
  }

  formatStatLabel(category: string): string {
    if (!category) { return ''; }
    const words = category.split('_');
    const titled: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.length > 0) { titled.push(w.charAt(0).toUpperCase() + w.slice(1)); }
    }
    return titled.join(' ');
  }

  getStandingRowClass(index: number): string {
    if (index === 0) { return 'row-top'; }
    if (index === 1) { return 'row-second'; }
    return '';
  }

  getNrrClass(nrr: string): string {
    if (!nrr) { return ''; }
    const n = parseFloat(nrr);
    if (isNaN(n)) { return ''; }
    return n > 0 ? 'nrr-positive' : n < 0 ? 'nrr-negative' : '';
  }

  getAllStats(): any[] {
    let result: any[] = [];
    if (this.selectedSeries && this.selectedSeries.stats) {
      result = result.concat(this.selectedSeries.stats);
    }
    if (this.selectedStandings && this.selectedStandings.standings) {
      result = result.concat(this.selectedStandings.standings);
    }
    return result;
  }

  isArrayPayload(payload: any): boolean {
    if (!payload) { return false; }
    if (payload.rows && Array.isArray(payload.rows)) { return true; }
    return Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object';
  }

  getPayloadRows(payload: any): any[] {
    if (!payload) { return []; }
    if (payload.rows && Array.isArray(payload.rows)) { return payload.rows; }
    if (Array.isArray(payload)) { return payload; }
    return [];
  }

  getStatPayload(stats: any[], category: string): any[] {
    if (!stats) { return []; }
    const snap = stats.find(s => s.category === category);
    if (!snap || !snap.payload) { return []; }
    return this.getPayloadRows(snap.payload);
  }

  trackByExternalId(index: number, item: SeriesSummary): string {
    return item.externalId;
  }

  trackByDiscoveryGroup(index: number, group: SeriesDiscoveryGroup): string {
    return group.key;
  }

  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  getSeriesHref(series: SeriesSummary): string {
    return '/series/' + encodeURIComponent(series.externalId) + '/' + this.toSlug(series.name);
  }

  getCurrentSeriesHref(group: SeriesDiscoveryGroup): string {
    return '/series/current/' + this.toSlug(group.seriesName);
  }

  getSeriesLiveMatches(): MatchCardViewModel[] {
    return this.getProfileMatchesByStatus(MatchStatus.LIVE);
  }

  getSeriesUpcomingMatches(): MatchCardViewModel[] {
    return this.getProfileMatchesByStatus(MatchStatus.UPCOMING);
  }

  getSeriesRecentMatches(): MatchCardViewModel[] {
    return this.getProfileMatchesByStatus(MatchStatus.COMPLETED);
  }

  private getProfileMatchesByStatus(status: MatchStatus): MatchCardViewModel[] {
    return this.profileMatches.filter(match => match.status === status).slice(0, 8);
  }

  getTeamHref(row: any): string | null {
    const name = (row && (row.teamName || row.Team || row.teamCode)) || '';
    if (!name) { return null; }
    const normalizedName = this.normaliseForMatch(name);
    const team = this.teamDirectory.find(item => {
      return this.normaliseForMatch(item.name) === normalizedName ||
        this.normaliseForMatch(item.shortName || '') === normalizedName ||
        this.normaliseForMatch(item.teamCode || '') === normalizedName;
    });
    return team ? '/teams/' + encodeURIComponent(team.externalId) + '/' + this.toSlug(team.name) : null;
  }

  toSlug(value: string): string {
    return (value || 'series').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'series';
  }

  private updateStructuredData(): void {
    this.structuredDataService.setPageSchemas([
      this.structuredDataService.page({
        type: 'CollectionPage',
        name: 'Cricket series and standings on Crickzen',
        description: 'Browse current cricket series and tournaments, then open available points tables, standings, and summary data.',
        url: 'https://www.crickzen.com/series'
      }),
      this.structuredDataService.breadcrumbs([
        { name: 'Home', url: 'https://www.crickzen.com/' },
        { name: 'Series', url: 'https://www.crickzen.com/series' }
      ]),
      this.structuredDataService.itemList({
        name: 'Upcoming series matches',
        url: 'https://www.crickzen.com/series',
        description: 'Upcoming matches grouped by competition.',
        items: this.buildDiscoveryStructuredItems()
      })
    ]);
  }

  private loadDiscoveryMatches(): void {
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }

    const discoveryKey = makeStateKey<any>('series-discovery-catalogue');
    const hydrated = !isPlatformServer(this.platformId) ? this.transferState.get(discoveryKey, null) : null;
    if (hydrated) {
      this.applyDiscoveryMatches(hydrated);
      this.transferState.remove(discoveryKey);
      return;
    }

    let stream = this.matchesService.getLiveMatchesWithAutoRefresh();
    if (isPlatformServer(this.platformId)) {
      stream = stream.pipe(take(1));
    }
    this.matchSubscription = stream
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (matches) => {
          this.applyDiscoveryMatches(matches || []);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(discoveryKey, matches || []);
          }
        },
        () => {
          this.upcomingDiscoveryGroups = [];
          this.currentSeriesGroups = [];
          this.catalogueMatches = [];
          this.profileMatches = [];
          this.updateStructuredData();
        }
      );
  }

  private applyDiscoveryMatches(matches: MatchCardViewModel[]): void {
    this.catalogueMatches = matches || [];
    this.upcomingDiscoveryGroups = this.buildSeriesDiscoveryGroups(this.catalogueMatches);
    this.currentSeriesGroups = this.buildCurrentSeriesGroups(this.catalogueMatches);
    this.profileMatches = this.isProfileRoute ? this.filterProfileMatches(this.catalogueMatches) : [];
    this.updateStructuredData();
  }

  private filterProfileMatches(matches: MatchCardViewModel[]): MatchCardViewModel[] {
    const seriesName = this.normaliseForMatch((this.selectedSeries && this.selectedSeries.series && this.selectedSeries.series.name) || (this.selectedSeriesSummary && this.selectedSeriesSummary.name) || '');
    if (!seriesName) { return []; }
    return (matches || []).filter(match => {
      const candidate = this.normaliseForMatch(this.getCurrentSeriesLabel(match));
      return candidate === seriesName || candidate.indexOf(seriesName) >= 0 || seriesName.indexOf(candidate) >= 0;
    });
  }

  private normaliseForMatch(value: string): string {
    return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private buildSeriesDiscoveryGroups(matches: MatchCardViewModel[]): SeriesDiscoveryGroup[] {
    var prioritizedMatches = prioritizeUpcomingMatchesForDiscovery(matches || [], 30, 120);
    var orderedKeys: string[] = [];
    var seenHref: { [key: string]: boolean } = {};
    var grouped: { [key: string]: SeriesDiscoveryGroup } = {};

    for (var i = 0; i < prioritizedMatches.length; i++) {
      var match = prioritizedMatches[i];
      if (!match || match.status !== MatchStatus.UPCOMING) {
        continue;
      }

      var href = this.getMatchHref(match);
      if (!href || href === '/matches' || seenHref[href]) {
        continue;
      }

      seenHref[href] = true;
      var seriesName = this.getCurrentSeriesLabel(match) || this.getSeriesDiscoveryLabel(match);
      var key = seriesName.toLowerCase();

      if (!grouped[key]) {
        grouped[key] = {
          key: key,
          seriesName: seriesName,
          matches: [],
          totalMatches: 0
        };
        orderedKeys.push(key);
      }

      grouped[key].totalMatches += 1;
      if (grouped[key].matches.length < this.maxDiscoveryMatchesPerSeries) {
        grouped[key].matches.push(match);
      }
    }

    return orderedKeys
      .slice(0, this.maxDiscoverySeriesGroups)
      .map((key) => grouped[key])
      .filter((group) => !!group && group.matches.length > 0);
  }

  private buildCurrentSeriesGroups(matches: MatchCardViewModel[]): SeriesDiscoveryGroup[] {
    const grouped: { [key: string]: SeriesDiscoveryGroup } = {};
    const orderedKeys: string[] = [];
    const seenMatch: { [key: string]: boolean } = {};

    (matches || []).forEach(match => {
      const href = this.getMatchHref(match);
      if (!match || !href || href === '/matches' || seenMatch[href]) { return; }
      seenMatch[href] = true;
      const seriesName = this.getCurrentSeriesLabel(match);
      const key = this.normaliseForMatch(seriesName);
      if (!key) { return; }
      if (!grouped[key]) {
        grouped[key] = { key: key, seriesName: seriesName, matches: [], totalMatches: 0 };
        orderedKeys.push(key);
      }
      grouped[key].totalMatches += 1;
      if (grouped[key].matches.length < this.maxDiscoveryMatchesPerSeries) {
        grouped[key].matches.push(match);
      }
    });

    return orderedKeys.slice(0, 6).map(key => grouped[key]);
  }

  private getCurrentSeriesLabel(match: MatchCardViewModel): string {
    let value = ((match && match.seriesName) || '').replace(/\s+/g, ' ').trim();
    if (!value) { return ''; }
    const matchUrl = ((match && match.matchUrl) || '').toLowerCase();
    const teams = (((match && match.team1 && (match.team1.name || match.team1.shortName)) || '') + ' ' + ((match && match.team2 && (match.team2.name || match.team2.shortName)) || '')).toLowerCase();
    const haystack = (matchUrl + ' ' + teams + ' ' + value.toLowerCase());
    if (/pondicherry-premier-league-2026/.test(matchUrl) || /pondicherry|villianur mohit|ruby white town|\bvmk\b.*\brwt\b|\brwt\b.*\bvmk\b/.test(haystack)) { return 'PPL 2026'; }
    if (/lanka-premier-league-2026|lpl-2026/.test(matchUrl) || /galle gallants|jaffna kings|\bgg\b.*\b(?:jk|jks)\b|\b(?:jk|jks)\b.*\bgg\b/.test(haystack)) { return 'LPL 2026'; }
    if (value.indexOf(',') !== -1) { value = value.split(',').pop()!.trim(); }
    value = value.replace(/^\d{1,3}(st|nd|rd|th)\s+(TEST|ODI|T20I?|T10|FOUR[- ]DAY)\s+/i, '');
    value = value.replace(/^\d{1,3}(st|nd|rd|th)\s+(SEMI[- ]FINAL|FINAL|MATCH)\s+/i, '');
    const team2 = match && match.team2 && (match.team2.name || match.team2.shortName);
    if (team2) { value = value.replace(new RegExp('\\s+' + this.escapeRegExp(team2) + '$', 'i'), ''); }
    return value.replace(/\s+TOUR\s+OF\s+/i, ' vs ').replace(/\s+/g, ' ').trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getSeriesDiscoveryLabel(match: MatchCardViewModel): string {
    var seriesName = ((match && match.seriesName) || '').replace(/\s+/g, ' ').trim();
    if (seriesName) {
      return seriesName;
    }

    var team1 = match && match.team1 ? match.team1.shortName || match.team1.name : 'Team 1';
    var team2 = match && match.team2 ? match.team2.shortName || match.team2.name : 'Team 2';
    return team1 + ' vs ' + team2 + ' series';
  }

  private buildDiscoveryStructuredItems(): Array<{ name: string; url: string; description: string }> {
    var items = [
          {
            name: 'Cricket matches',
            url: 'https://www.crickzen.com/matches',
            description: 'Browse live, upcoming, and completed cricket matches.'
          },
          {
            name: 'Cricket live score today',
            url: 'https://www.crickzen.com/live-score',
            description: 'Open the live-score hub for current match pages.'
          },
          {
            name: 'Cricket schedule today',
            url: 'https://www.crickzen.com/cricket-schedule/today',
            description: 'Open the schedule-first hub for upcoming fixtures.'
          }
        ];

    for (var i = 0; i < this.upcomingDiscoveryGroups.length; i++) {
      var group = this.upcomingDiscoveryGroups[i];
      for (var j = 0; j < group.matches.length; j++) {
        var match = group.matches[j];
        var href = this.getMatchHref(match);
        if (!href || href === '/matches') {
          continue;
        }

        items.push({
          name: this.getMatchLinkLabel(match),
          url: 'https://www.crickzen.com' + href,
          description: group.seriesName + ' upcoming canonical match page on Crickzen.'
        });
      }
    }

    return items.slice(0, 20);
  }
}
