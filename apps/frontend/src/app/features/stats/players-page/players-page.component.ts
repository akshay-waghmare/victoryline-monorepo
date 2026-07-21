import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CricketService, PlayerStatsPlayerDetailView } from '../../../cricket-odds/cricket-odds.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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

interface PlayerRecentFormRow {
  match: string;
  performance: string;
  scorecardUrl?: string;
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
  isProfileRoute = false;

  constructor(
    private cricketService: CricketService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private titleService: Title,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');
    if (externalId) {
      this.isProfileRoute = true;
      this.openPlayerProfile(externalId, this.route.snapshot.paramMap.get('slug') || 'player');
      return;
    }

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
    this.router.navigate(['/player', player.externalId, this.toSlug(this.getPlayerDisplayName(player))]);
  }

  getPlayerHref(player: PlayerSummary): string {
    if (!player || !player.externalId) { return '/players'; }
    return '/player/' + encodeURIComponent(player.externalId) + '/' + this.toSlug(this.getPlayerDisplayName(player));
  }

  private openPlayerProfile(externalId: string, slug: string): void {
    const name = this.getPlayerDisplayName({ externalId: externalId, name: slug.replace(/-/g, ' ') });
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    this.isDetailLoading = true;
    this.detailOpen = true;
    this.selectedPlayer = null;
    this.selectedPlayerSummary = { externalId: externalId, name: name };
    this.titleService.setTitle(name + ' Cricket Profile | Crickzen');
    this.cricketService.getPlayerStatsPlayer(externalId, 'crex').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (detail) => {
        this.selectedPlayer = detail;
        if (detail && detail.name) {
          this.titleService.setTitle(this.getPlayerDisplayName(detail) + ' Cricket Profile | Crickzen');
        }
        if (!detail || !detail.stats || detail.stats.length === 0) {
          this.notifyStatsUnavailable(this.selectedPlayerSummary && this.selectedPlayerSummary.name);
        }
        this.isDetailLoading = false;
        this.resetProfileViewport();
      },
      () => {
        this.selectedPlayer = null;
        this.isDetailLoading = false;
        this.notifyStatsUnavailable(this.selectedPlayerSummary && this.selectedPlayerSummary.name);
        this.resetProfileViewport();
      }
    );
  }

  private resetProfileViewport(): void {
    if (!this.isProfileRoute || typeof window === 'undefined') { return; }

    window.setTimeout(() => {
      window.scrollTo(0, 0);
      const heading = document.getElementById('player-profile-heading');
      if (heading && heading.focus) {
        heading.focus();
      }
    }, 0);
  }

  private notifyStatsUnavailable(playerName?: string): void {
    this.snackBar.open(
      'Detailed player stats are not available for ' + (playerName || 'this player') + ' yet.',
      'Dismiss',
      { duration: 5000 }
    );
  }

  closeDetail(): void {
    if (this.isProfileRoute) {
      this.location.back();
      return;
    }
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
    const name: string = this.getPlayerDisplayName(player);
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

  getRecentFormRows(discipline: 'batting' | 'bowling'): PlayerRecentFormRow[] {
    if (!this.selectedPlayer || !this.selectedPlayer.stats) { return []; }
    const snapshot = this.selectedPlayer.stats.find(s => s.category === 'recent_form');
    const rows = snapshot && snapshot.payload && snapshot.payload[discipline];
    if (!Array.isArray(rows)) { return []; }

    return rows
      .filter(row => row && !/^recent\s*form\s*>?$/i.test(String(row.match || '').trim()))
      .map(row => this.normalizeRecentFormRow(row));
  }

  private normalizeRecentFormRow(row: any): PlayerRecentFormRow {
    let match = String(row.match || '').trim();
    let performance = String(row.performance || '').trim();

    // Some CREX rows carry the fixture and performance in the opposite fields.
    if (this.looksLikeFixture(performance) && !this.looksLikeFixture(match)) {
      const originalMatch = match;
      match = performance;
      performance = originalMatch;
    }

    if (performance === '*' && match) {
      performance = match + ' *';
      match = 'Match detail unavailable';
    }

    return {
      match: match || 'Match detail unavailable',
      performance: performance || '—',
      scorecardUrl: row.scorecard_url || row.scorecardUrl || undefined
    };
  }

  private looksLikeFixture(value: string): boolean {
    return /\bvs\b|,\s*(?:test|odi|t20)\b/i.test(value || '');
  }

  getPlayerDisplayName(player: any): string {
    if (!player || !player.name) { return ''; }
    const rolePattern = /\s*(?:batter|bowler|all\s*rounder|wicket[-\s]*keeper)\s*$/i;
    return String(player.name)
      .replace(/\r?\n/g, ' ')
      .replace(rolePattern, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getActivePlayerRole(): string {
    const profile = this.getActivePlayerProfile();
    return (profile && profile.role)
      || (this.selectedPlayer && this.selectedPlayer.role)
      || (this.selectedPlayerSummary && this.selectedPlayerSummary.role)
      || '';
  }

  getActivePlayerProfile(): any {
    return this.selectedPlayer ? this.getStatProfile(this.selectedPlayer.stats) : null;
  }

  getProfileFact(key: string, fallback?: string): string {
    const profile = this.getActivePlayerProfile();
    return (profile && profile[key]) || fallback || '';
  }

  formatPlayerAttribute(value: string | null | undefined): string {
    return String(value || '')
      .replace(/\s*\.\s*/g, ' · ')
      .replace(/\s+/g, ' ')
      .replace(/(^|\s)([a-z])/g, (match, prefix, letter) => prefix + letter.toUpperCase())
      .trim();
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

  private toSlug(value: string): string {
    return String(value || 'player').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'player';
  }
}
