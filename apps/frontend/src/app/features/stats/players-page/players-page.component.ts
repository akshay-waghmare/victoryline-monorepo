import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CricketService, PlayerStatsPlayerDetailView } from '../../../cricket-odds/cricket-odds.service';

interface PlayerSummary {
  externalId: string;
  name: string;
  shortName?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-players-page',
  templateUrl: './players-page.component.html',
  styleUrls: ['./players-page.component.css']
})
export class PlayersPageComponent implements OnInit, OnDestroy {
  players: PlayerSummary[] = [];
  isLoading = true;
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  selectedPlayer: PlayerStatsPlayerDetailView | null = null;
  selectedPlayerSummary: PlayerSummary | null = null;
  isDetailLoading = false;
  detailOpen = false;

  constructor(
    private cricketService: CricketService,
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Players | Crickzen');
    this.loadPlayers();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.loadPlayers(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlayers(query?: string): void {
    this.isLoading = true;
    this.cricketService.listPlayers('crex', query).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (data) => {
        this.players = data || [];
        this.isLoading = false;
      },
      () => {
        this.players = [];
        this.isLoading = false;
      }
    );
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectPlayer(player: PlayerSummary): void {
    if (!player.externalId) { return; }
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedPlayer = null;
    this.selectedPlayerSummary = player;
    this.cricketService.getPlayerStatsPlayer(player.externalId, 'crex').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (detail) => {
        this.selectedPlayer = detail;
        this.isDetailLoading = false;
      },
      () => {
        this.selectedPlayer = null;
        this.isDetailLoading = false;
      }
    );
  }

  closeDetail(): void {
    this.selectedPlayer = null;
    this.selectedPlayerSummary = null;
    this.detailOpen = false;
  }

  getRoleBadgeClass(role: string): string {
    if (!role) { return ''; }
    const r = role.toLowerCase();
    if (r.indexOf('bat') >= 0) { return 'role-batter'; }
    if (r.indexOf('bowl') >= 0) { return 'role-bowler'; }
    if (r.indexOf('all') >= 0) { return 'role-allrounder'; }
    if (r.indexOf('keeper') >= 0 || r.indexOf('wk') >= 0) { return 'role-keeper'; }
    return '';
  }

  getPlayerInitials(player: any): string {
    if (!player) { return '?'; }
    const name: string = player.name || '';
    if (!name) { return '?'; }
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) { return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); }
    return name.substring(0, 2).toUpperCase();
  }

  getPlayerBadgeColor(role: string): string {
    if (!role) { return '#78909c'; }
    const r = role.toLowerCase();
    if (r.indexOf('bat') >= 0) { return '#1565c0'; }
    if (r.indexOf('bowl') >= 0) { return '#b71c1c'; }
    if (r.indexOf('all') >= 0) { return '#2e7d32'; }
    if (r.indexOf('keeper') >= 0 || r.indexOf('wk') >= 0) { return '#6a1b9a'; }
    return '#78909c';
  }

  getOtherPlayerStats(): any[] {
    const handled = ['career_batting', 'career_bowling', 'recent_form', 'player_profile'];
    if (!this.selectedPlayer || !this.selectedPlayer.stats) { return []; }
    const result: any[] = [];
    for (let i = 0; i < this.selectedPlayer.stats.length; i++) {
      const s = this.selectedPlayer.stats[i];
      if (handled.indexOf(s.category) !== -1 || !s.payload) { continue; }
      if (!this.isArrayPayload(s.payload) && this.getObjectEntries(s.payload).length === 0) { continue; }
      result.push(s);
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

  isArrayPayload(payload: any): boolean {
    if (!payload) { return false; }
    if (payload.rows && Array.isArray(payload.rows)) { return true; }
    return Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object';
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

  getStatPayload(stats: any[], category: string): any[] {
    if (!stats) { return []; }
    const snap = stats.find(s => s.category === category);
    if (!snap || !snap.payload) { return []; }
    const p = snap.payload;
    // Handle {headers, rows} structure from CREX scraper
    if (p.rows && Array.isArray(p.rows)) { return p.rows; }
    if (Array.isArray(p)) { return p; }
    return [];
  }

  getStatProfile(stats: any[]): any {
    if (!stats) { return null; }
    const snap = stats.find(s => s.category === 'player_profile');
    if (!snap || !snap.payload) { return null; }
    return snap.payload.profile || snap.payload;
  }

  trackByExternalId(index: number, item: PlayerSummary): string {
    return item.externalId;
  }
}
