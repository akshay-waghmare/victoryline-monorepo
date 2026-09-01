import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  isProfileRoute = false;

  constructor(
    private cricketService: CricketService,
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');
    if (externalId) {
      this.isProfileRoute = true;
      this.openTeamProfile(externalId, this.route.snapshot.paramMap.get('slug') || 'team');
      return;
    }
    this.titleService.setTitle('Teams | CrickZen');
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
    this.router.navigate(['/teams', team.externalId, this.toSlug(team.name)]);
  }

  getTeamHref(team: TeamSummary): string {
    if (!team || !team.externalId) { return '/teams'; }
    return '/teams/' + encodeURIComponent(team.externalId) + '/' + this.toSlug(team.name);
  }

  private openTeamProfile(externalId: string, slug: string): void {
    const name = slug.replace(/-/g, ' ');
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedTeam = null;
    this.selectedTeamSummary = { externalId: externalId, name: name };
    this.titleService.setTitle(name + ' Team Stats | CrickZen');
    this.cricketService.getPlayerStatsTeam(externalId, 'crex').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (detail) => {
        this.selectedTeam = detail;
        if (detail && detail.name) { this.titleService.setTitle(detail.name + ' Team Stats | CrickZen'); }
        this.isDetailLoading = false;
      },
      () => { this.selectedTeam = null; this.isDetailLoading = false; }
    );
  }

  closeDetail(): void {
    if (this.isProfileRoute) {
      this.location.back();
      return;
    }
    this.selectedTeam = null;
    this.selectedTeamSummary = null;
    this.detailOpen = false;
  }

  getTeamInitials(team: any): string {
    if (!team) { return '?'; }
    if (team.teamCode) { return team.teamCode.substring(0, 3); }
    if (team.name) { return team.name.substring(0, 3).toUpperCase(); }
    return '?';
  }

  getTeamBadgeColor(code: string | undefined | null): string {
    const colors = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#2e9e4f', '#f4a213', '#e53935', '#00897b', '#78909c'];
    if (!code) { return colors[0]; }
    let hash = 0;
    for (let i = 0; i < code.length; i++) { hash = (hash + code.charCodeAt(i)) % colors.length; }
    return colors[hash];
  }

  getTeamRanking(): any {
    if (!this.selectedTeam || !this.selectedTeam.stats) { return null; }
    const s = this.selectedTeam.stats.find(x => x.category === 'team_ranking_men_s_teams_ranking');
    return (s && s.payload && !Array.isArray(s.payload)) ? s.payload : null;
  }

  private getAboutStat(): any {
    if (!this.selectedTeam || !this.selectedTeam.stats) { return null; }
    const s = this.selectedTeam.stats.find(x => x.category === 'team_section_about');
    return s ? s.payload : null;
  }

  getAboutFoundingYear(): string {
    const about = this.getAboutStat();
    if (!about || !about.headers || about.headers.length < 2) { return ''; }
    return about.headers[1] || '';
  }

  getAboutBoard(): string {
    const about = this.getAboutStat();
    if (!about || !about.rows || !about.rows.length || !about.headers || !about.headers.length) { return ''; }
    const key = about.headers[1];
    return (key && about.rows[0] && about.rows[0][key]) ? about.rows[0][key] : '';
  }

  getAboutBio(): string {
    const about = this.getAboutStat();
    if (!about || !about.rows || about.rows.length < 2 || !about.headers || !about.headers.length) { return ''; }
    const key = about.headers[1];
    return (key && about.rows[1] && about.rows[1][key]) ? about.rows[1][key] : '';
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

  getTableHeaders(payload: any): string[] {
    if (!payload) { return []; }
    if (payload.headers && Array.isArray(payload.headers)) { return payload.headers; }
    if (Array.isArray(payload) && payload.length > 0) { return Object.keys(payload[0]); }
    if (payload.rows && Array.isArray(payload.rows) && payload.rows.length > 0) {
      return Object.keys(payload.rows[0]);
    }
    return [];
  }

  private readonly HIDDEN_KEYS = [
    'pageHeading', 'pageTitle', 'sectionCount', 'section',
    'externalId', 'crexId', 'crex_id', 'source', 'provider', 'url'
  ];

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

  getOtherStats(): any[] {
    const handled = ['team_ranking_men_s_teams_ranking', 'team_section_about'];
    if (!this.selectedTeam || !this.selectedTeam.stats) { return []; }
    const result: any[] = [];
    for (let i = 0; i < this.selectedTeam.stats.length; i++) {
      const stat = this.selectedTeam.stats[i];
      if (handled.indexOf(stat.category) !== -1 || !stat.payload) { continue; }
      if (!this.isArrayPayload(stat.payload) && this.getObjectEntries(stat.payload).length === 0) { continue; }
      result.push(stat);
    }
    return result;
  }

  formatStatLabel(category: string): string {
    const words = category.split('_');
    const titled: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.length > 0) { titled.push(w.charAt(0).toUpperCase() + w.slice(1)); }
    }
    return titled.join(' ');
  }

  bioExpanded = false;
  toggleBio(): void { this.bioExpanded = !this.bioExpanded; }

  getStatPayload(stats: any[], category: string): any[] {
    if (!stats) { return []; }
    const snap = stats.find(s => s.category === category);
    if (!snap || !snap.payload) { return []; }
    return this.getPayloadRows(snap.payload);
  }

  trackByExternalId(index: number, item: TeamSummary): string {
    return item.externalId;
  }

  private toSlug(value: string): string {
    return (value || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'team';
  }
}
