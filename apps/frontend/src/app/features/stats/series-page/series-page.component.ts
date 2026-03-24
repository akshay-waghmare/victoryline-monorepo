import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CricketService, PlayerStatsSeriesDetailView } from '../../../cricket-odds/cricket-odds.service';

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
  seriesList: SeriesSummary[] = [];
  isLoading = true;
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  selectedSeries: PlayerStatsSeriesDetailView | null = null;
  selectedStandings: PlayerStatsSeriesDetailView | null = null;
  isDetailLoading = false;

  constructor(private cricketService: CricketService, private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle('Series | Crickzen');
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
  }

  loadSeries(query?: string): void {
    this.isLoading = true;
    this.cricketService.listSeries('crex', query).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (data) => { this.seriesList = data || []; this.isLoading = false; },
      () => { this.seriesList = []; this.isLoading = false; }
    );
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectSeries(series: SeriesSummary): void {
    if (!series.externalId) { return; }
    this.isDetailLoading = true;
    this.selectedSeries = null;
    this.selectedStandings = null;

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
  }

  getStatPayload(stats: any[], category: string): any[] {
    if (!stats) { return []; }
    const snap = stats.find(s => s.category === category);
    if (!snap || !snap.payload) { return []; }
    if (Array.isArray(snap.payload)) { return snap.payload; }
    return [];
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
    return Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object';
  }

  trackByExternalId(index: number, item: SeriesSummary): string {
    return item.externalId;
  }
}
