import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CricketService, PlayerStatsTeamDetailView } from '../../../cricket-odds/cricket-odds.service';

interface TeamSummary {
  externalId: string;
  name: string;
  shortName?: string;
  teamCode?: string;
}

@Component({
  selector: 'app-teams-page',
  templateUrl: './teams-page.component.html',
  styleUrls: ['./teams-page.component.css']
})
export class TeamsPageComponent implements OnInit, OnDestroy {
  teams: TeamSummary[] = [];
  isLoading = true;
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  selectedTeam: PlayerStatsTeamDetailView | null = null;
  selectedTeamSummary: TeamSummary | null = null;
  isDetailLoading = false;
  detailOpen = false;

  constructor(private cricketService: CricketService, private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle('Teams | Crickzen');
    this.loadTeams();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.loadTeams(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeams(query?: string): void {
    this.isLoading = true;
    this.cricketService.listTeams('crex', query).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (data) => { this.teams = data || []; this.isLoading = false; },
      () => { this.teams = []; this.isLoading = false; }
    );
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectTeam(team: TeamSummary): void {
    if (!team.externalId) { return; }
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedTeam = null;
    this.selectedTeamSummary = team;
    this.cricketService.getPlayerStatsTeam(team.externalId, 'crex').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (detail) => { this.selectedTeam = detail; this.isDetailLoading = false; },
      () => { this.selectedTeam = null; this.isDetailLoading = false; }
    );
  }

  closeDetail(): void {
    this.selectedTeam = null;
    this.selectedTeamSummary = null;
    this.detailOpen = false;
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

  trackByExternalId(index: number, item: TeamSummary): string {
    return item.externalId;
  }
}
