import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatchApiService } from '../../match-api.service';
import { PlayerRole } from '../../../shared/models/match.models';
import { PlayerStatsMatchView, PlayerStatsSquadPlayerView, PlayerStatsTeamView } from '../../cricket-odds.service';

interface LineupPlayerView {
  id: string;
  name: string;
  role: PlayerRole;
  isPlayingXI: boolean;
  externalId?: string;
  captain?: boolean;
  wicketKeeper?: boolean;
  probable?: boolean;
}

interface LineupTeamView {
  id: string;
  name: string;
  shortName: string;
  externalId?: string;
  players: LineupPlayerView[];
}

@Component({
  selector: 'app-lineups',
  templateUrl: './lineups.component.html',
  styleUrls: ['./lineups.component.css']
})
export class LineupsComponent implements OnInit, OnChanges {
  @Input() matchId?: string;
  @Input() playingXIData?: any; // Existing lineup data from parent
  @Input() playerStatsMatch?: PlayerStatsMatchView | null;
  @Output() playerSelected = new EventEmitter<{ playerName: string; externalId?: string; teamName?: string; teamExternalId?: string; role?: string }>();
  @Output() teamSelected = new EventEmitter<{ teamName: string; externalId?: string }>();

  teams: LineupTeamView[] = [];
  isLoading = false;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    this.buildTeams();
    if (!this.teams.length && this.matchId) {
      // this.loadLineups(); // Future API implementation
      console.warn('[LineupsComponent] API fetch not yet implemented');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.playingXIData || changes.playerStatsMatch) {
      this.buildTeams();
    }
  }

  private buildTeams(): void {
    if (this.playingXIData || (this.playerStatsMatch && this.playerStatsMatch.teams && this.playerStatsMatch.teams.length)) {
      this.parseExistingLineupData();
      return;
    }

    this.teams = [];
  }

  private parseExistingLineupData(): void {
    // Parse existing playing XI data to match our model
    if (this.playingXIData && this.playingXIData.playing_xi) {
      const teamNames = Object.keys(this.playingXIData.playing_xi);
      this.teams = teamNames.map((teamName, index) => {
        const lineupEntries = this.playingXIData.playing_xi[teamName] || [];
        const lineupPlayerNames = lineupEntries.map((p: any) => this.sanitizePlayerName(p.playerName));
        const snapshotTeam = this.findSnapshotTeam(teamName, lineupPlayerNames);
        const players = lineupEntries.map((p: any) => {
          const playerName = this.sanitizePlayerName(p.playerName);
          const snapshotPlayer = this.findSnapshotPlayer(snapshotTeam, playerName);

          return {
            id: p.playerId || (snapshotPlayer && snapshotPlayer.externalId) || `player-${playerName}`,
            name: playerName,
            role: this.mapRole((snapshotPlayer && snapshotPlayer.role) || p.playerRole),
            isPlayingXI: true,
            externalId: snapshotPlayer && snapshotPlayer.externalId,
            captain: snapshotPlayer && snapshotPlayer.captain,
            wicketKeeper: snapshotPlayer && snapshotPlayer.wicketKeeper,
            probable: snapshotPlayer && snapshotPlayer.probable && !snapshotPlayer.announced
          } as LineupPlayerView;
        });

        return {
          id: `team-${index}`,
          name: teamName,
          shortName: teamName,
          externalId: snapshotTeam && snapshotTeam.externalId,
          players: players
        } as LineupTeamView;
      });
      console.log('[Lineups] Parsed teams:', this.teams);
      return;
    }

    if (this.playerStatsMatch && this.playerStatsMatch.teams) {
      this.teams = this.playerStatsMatch.teams.map((team, index) => ({
        id: team.externalId || `team-${index}`,
        name: team.name,
        shortName: team.shortName || team.name,
        externalId: team.externalId,
        players: (team.squad || []).map((player, playerIndex) => this.mapSnapshotPlayer(player, playerIndex))
      }));
    }
  }

  // Remove redundant role words appended to the player's name, since we show role separately
  private sanitizePlayerName(name: string): string {
    if (!name) return name;
    let s = String(name).trim();
    // Iteratively strip known role descriptors from the end (with or without leading space)
    const patterns = [
      /\s*(Batter|Batsman)\s*$/i,
      /\s*(Bowler)\s*$/i,
      /\s*(All\s*[- ]?Rounder)\s*$/i,
      /\s*(Wicket\s*Keeper)\s*$/i
    ];
    let prev: string;
    do {
      prev = s;
      for (var i = 0; i < patterns.length; i++) {
        s = s.replace(patterns[i], '');
      }
      s = s.replace(/\s{2,}/g, ' ').trim();
    } while (s !== prev);
    return s;
  }

  private mapRole(roleStr: string): PlayerRole {
    const normalized = (roleStr && roleStr.toUpperCase()) || '';
    if (normalized.includes('BAT')) return PlayerRole.BATSMAN;
    if (normalized.includes('BOWL')) return PlayerRole.BOWLER;
    if (normalized.includes('ALL') || normalized.includes('ROUND')) return PlayerRole.ALL_ROUNDER;
    if (normalized.includes('KEEP') || normalized.includes('WK')) return PlayerRole.WICKET_KEEPER;
    return PlayerRole.UNKNOWN;
  }

  private loadLineups(): void {
    this.isLoading = true;
    this.api.getLineups(this.matchId).subscribe(
      (response: any) => {
        if (response.success && response.data) {
          this.teams = response.data.teams || [];
        }
        this.isLoading = false;
      },
      error => {
        console.error('[Lineups] Failed to load lineups:', error);
        this.isLoading = false;
      }
    );
  }

  getRoleIcon(role: PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN: return 'sports_cricket';
      case PlayerRole.BOWLER: return 'sports_baseball';
      case PlayerRole.ALL_ROUNDER: return 'sports';
      case PlayerRole.WICKET_KEEPER: return 'sports_handball';
      default: return 'person';
    }
  }

  getRoleLabel(role: PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN: return 'Batsman';
      case PlayerRole.BOWLER: return 'Bowler';
      case PlayerRole.ALL_ROUNDER: return 'All-Rounder';
      case PlayerRole.WICKET_KEEPER: return 'Wicket Keeper';
      default: return 'Player';
    }
  }

  getRoleClass(role: PlayerRole): string {
    return `role-${role.toLowerCase().replace('_', '-')}`;
  }

  hasPlayerDetails(player: LineupPlayerView): boolean {
    return !!(player && player.externalId);
  }

  getPlayerHref(player: LineupPlayerView): string {
    if (!player || !player.externalId) { return ''; }
    return '/player/' + encodeURIComponent(player.externalId) + '/' + this.toSlug(player.name);
  }

  getTeamHref(team: LineupTeamView): string {
    if (!team || !team.externalId) { return ''; }
    return '/teams/' + encodeURIComponent(team.externalId) + '/' + this.toSlug(team.name);
  }

  selectPlayer(team: LineupTeamView, player: LineupPlayerView): void {
    this.playerSelected.emit({
      playerName: player.name,
      externalId: player.externalId,
      teamName: team.name,
      teamExternalId: team.externalId,
      role: this.getRoleShortLabel(player)
    });
  }

  private getRoleShortLabel(player: LineupPlayerView): string | undefined {
    if (!player) {
      return undefined;
    }
    if (player.wicketKeeper || player.role === PlayerRole.WICKET_KEEPER) {
      return 'WK';
    }
    if (player.role === PlayerRole.BATSMAN) {
      return 'BAT';
    }
    if (player.role === PlayerRole.BOWLER) {
      return 'BOWL';
    }
    if (player.role === PlayerRole.ALL_ROUNDER) {
      return 'AR';
    }
    return undefined;
  }

  selectTeam(team: LineupTeamView): void {
    if (!team || !team.externalId) {
      return;
    }

    this.teamSelected.emit({
      teamName: team.name,
      externalId: team.externalId
    });
  }

  trackByTeam(index: number, team: LineupTeamView): string {
    return team && (team.externalId || team.name) ? String(team.externalId || team.name) : 'team-' + index;
  }

  trackByPlayer(index: number, player: LineupPlayerView): string {
    return player && (player.externalId || player.name) ? String(player.externalId || player.name) : 'player-' + index;
  }

  private toSlug(value: string): string {
    return (value || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'player';
  }

  private mapSnapshotPlayer(player: PlayerStatsSquadPlayerView, index: number): LineupPlayerView {
    return {
      id: player.externalId || `player-${index}`,
      name: player.name,
      role: this.mapRole(player.role || ''),
      isPlayingXI: true,
      externalId: player.externalId,
      captain: player.captain,
      wicketKeeper: player.wicketKeeper,
      probable: player.probable && !player.announced
    };
  }

  private findSnapshotTeam(teamName: string, lineupPlayerNames?: string[]): PlayerStatsTeamView | null {
    if (!this.playerStatsMatch || !this.playerStatsMatch.teams) {
      return null;
    }

    const normalizedTarget = this.normalizeKey(teamName);
    for (let index = 0; index < this.playerStatsMatch.teams.length; index++) {
      const team = this.playerStatsMatch.teams[index];
      const possibleMatches = [
        this.normalizeKey(team.name),
        this.normalizeKey(team.shortName),
        this.normalizeKey(team.teamCode)
      ];

      if (possibleMatches.indexOf(normalizedTarget) !== -1) {
        return team;
      }
    }

    if (lineupPlayerNames && lineupPlayerNames.length) {
      let bestMatch: PlayerStatsTeamView | null = null;
      let bestScore = 0;

      for (let index = 0; index < this.playerStatsMatch.teams.length; index++) {
        const team = this.playerStatsMatch.teams[index];
        let score = 0;

        for (let playerIndex = 0; playerIndex < lineupPlayerNames.length; playerIndex++) {
          if (this.findSnapshotPlayer(team, lineupPlayerNames[playerIndex])) {
            score += 1;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = team;
        }
      }

      if (bestMatch && bestScore > 0) {
        return bestMatch;
      }
    }

    return null;
  }

  private findSnapshotPlayer(team: PlayerStatsTeamView | null, playerName: string): PlayerStatsSquadPlayerView | null {
    if (!team || !team.squad) {
      return null;
    }

    const normalizedTarget = this.normalizeKey(playerName);
    for (let index = 0; index < team.squad.length; index++) {
      const player = team.squad[index];
      const possibleMatches = [
        this.normalizeKey(player.name),
        this.normalizeKey(player.shortName)
      ];

      if (possibleMatches.indexOf(normalizedTarget) !== -1) {
        return player;
      }
    }

    return null;
  }

  private normalizeKey(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .replace(/\(c\)|\(wk\)|†/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}
