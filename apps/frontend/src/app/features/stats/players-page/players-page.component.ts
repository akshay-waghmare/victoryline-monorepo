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
  isDetailLoading = false;

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
    this.selectedPlayer = null;
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

  getStatPayload(stats: any[], category: string): any[] {
    if (!stats) { return []; }
    const snap = stats.find(s => s.category === category);
    if (!snap || !snap.payload) { return []; }
    if (Array.isArray(snap.payload)) { return snap.payload; }
    return [];
  }

  trackByExternalId(index: number, item: PlayerSummary): string {
    return item.externalId;
  }
}
