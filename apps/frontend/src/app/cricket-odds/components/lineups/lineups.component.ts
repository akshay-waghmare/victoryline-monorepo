import { Component, Input, OnInit } from '@angular/core';
import { MatchApiService } from '../../match-api.service';
import { Team, Player, PlayerRole } from '../../../shared/models/match.models';

@Component({
  selector: 'app-lineups',
  templateUrl: './lineups.component.html',
  styleUrls: ['./lineups.component.css']
})
export class LineupsComponent implements OnInit {
  @Input() matchId?: string;
  @Input() playingXIData?: any; // Existing lineup data from parent

  teams: Team[] = [];
  isLoading = false;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    if (this.playingXIData) {
      this.parseExistingLineupData();
    } else if (this.matchId) {
      // this.loadLineups(); // Future API implementation
      console.warn('[LineupsComponent] API fetch not yet implemented');
    }
  }

  private parseExistingLineupData(): void {
    // Parse existing playing XI data to match our model
    if (this.playingXIData && this.playingXIData.playing_xi) {
      const teamNames = Object.keys(this.playingXIData.playing_xi);
      this.teams = teamNames.map((teamName, index) => ({
        id: `team-${index}`,
        name: teamName,
        shortName: teamName,
        players: this.playingXIData.playing_xi[teamName].map((p: any) => ({
          id: p.playerId || `player-${p.playerName}`,
          name: p.playerName,
          role: this.mapRole(p.playerRole),
          isPlayingXI: true
        }))
      }));
      console.log('[Lineups] Parsed teams:', this.teams);
    }
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
}
