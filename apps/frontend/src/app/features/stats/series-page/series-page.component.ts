import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CricketService, PlayerStatsSeriesDetailView } from '../../../cricket-odds/cricket-odds.service';
import { MetaTagsService } from '../../../seo/meta-tags.service';
import { StructuredDataService } from '../../../seo/structured-data.service';

interface SeriesSummary {
  externalId: string;
  name: string;
  shortName?: string;
  seasonName?: string;
}

@Component({
  selector: 'app-series-page',
  templateUrl: './series-page.component.html',
  styleUrls: ['./series-page.component.css']
})
export class SeriesPageComponent implements OnInit, OnDestroy {
  readonly seriesFaqs = [
    {
      question: 'What can I find on the Crickzen series page?',
      answer: 'The series page lists current cricket series and tournaments, then opens available tables, standings, and summary data inside the current series surface.'
    },
    {
      question: 'Does the series page include points tables and standings?',
      answer: 'Yes. When standings data is available for a series, Crickzen shows the points table and supporting series stats inside the detail view.'
    },
    {
      question: 'How does the series page connect to match discovery?',
      answer: 'This page acts as a lightweight series-intent surface that complements live-score, schedule, and match-result pages while deeper series enrichment is still in progress.'
    }
  ];

  seriesList: SeriesSummary[] = [];
  isLoading = true;
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  selectedSeries: PlayerStatsSeriesDetailView | null = null;
  selectedStandings: PlayerStatsSeriesDetailView | null = null;
  selectedSeriesSummary: SeriesSummary | null = null;
  isDetailLoading = false;
  detailOpen = false;

  constructor(
    private cricketService: CricketService,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService
  ) {}

  ngOnInit(): void {
    this.metaTagsService.setPageMeta('/series', {
      title: 'Cricket Series, Tournaments, Tables & Standings | Crickzen',
      description: 'Browse current cricket series and tournaments, then open available points tables, standings, and series summaries on Crickzen.',
      canonicalUrl: 'https://www.crickzen.com/series',
      robots: 'index,follow'
    });
    this.updateStructuredData();
    this.loadSeries();
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
        this.seriesList = data || [];
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

  selectSeries(series: SeriesSummary): void {
    if (!series.externalId) { return; }
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedSeries = null;
    this.selectedStandings = null;
    this.selectedSeriesSummary = series;

    forkJoin([
      this.cricketService.getPlayerStatsSeries(series.externalId, 'crex'),
      this.cricketService.getPlayerStatsSeriesStandings(series.externalId, 'crex')
    ]).pipe(takeUntil(this.destroy$)).subscribe(
      ([seriesDetail, standings]) => {
        this.selectedSeries = seriesDetail;
        this.selectedStandings = standings;
        this.isDetailLoading = false;
      },
      () => {
        this.selectedSeries = null;
        this.selectedStandings = null;
        this.isDetailLoading = false;
      }
    );
  }

  closeDetail(): void {
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
        name: 'Related cricket discovery links',
        url: 'https://www.crickzen.com/series',
        description: 'Visible navigation from the series page into the main live-score and match-discovery surfaces.',
        items: [
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
        ]
      }),
      this.structuredDataService.faqPage(this.seriesFaqs)
    ]);
  }
}
