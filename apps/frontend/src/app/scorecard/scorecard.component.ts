import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ballsToOvers, normalizeTeamScoreString } from '../core/utils/match-utils';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { PlayerStatsMatchView } from '../cricket-odds/cricket-odds.service';

@Component({
  selector: 'app-scorecard',
  templateUrl: './scorecard.component.html',
  styleUrls: ['./scorecard.component.css']
})
export class ScorecardComponent implements OnInit, OnChanges {

  @Input() scorecardInfo: any;
  @Input() playerStatsMatch?: PlayerStatsMatchView | null;
  @Output() playerSelected = new EventEmitter<string>();

  private readonly emptyBatsmanStats = {
    runs: 0,
    balls_faced: 0,
    fours: 0,
    sixes: 0,
    status: '',
    dismissal_code: '',
    bowler_code: '',
    player_caught: ''
  };

  private readonly emptyBowlerStats = {
    overs: 0,
    maidens: 0,
    runs: 0,
    wickets: 0
  };
  
  match_info: any;
  batting: any;
  bowling: any;
  fall_of_wickets: any;
  partnerships: any;
  inningsKeys: string[];
  selectedInning: string;

  ngOnInit() {
    this.initializeScorecard();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.scorecardInfo && !changes.scorecardInfo.firstChange) {
      this.initializeScorecard();
    }
  }

  private initializeScorecard(): void {
    const scorecardData = {
      match_info: {
        team: "SLW",
        score: "43-3",
        overs: "10.0"
      },
      batting: {
        team: "SLW",
        batters: [
          {
            "name": "Vishmi Gunaratne",
            "runs": 0,
            "balls": 10,
            "fours": 0,
            "sixes": 0,
            "strike_rate": 0.00,
            "dismissal": "lbw b Schutt"
          },
          {
            "name": "Chamari Athapaththu (C)",
            "runs": 3,
            "balls": 12,
            "fours": 0,
            "sixes": 0,
            "strike_rate": 25.00,
            "dismissal": "lbw b Gardner"
          },
          {
            "name": "Harshitha Madavi Samarawickrama",
            "runs": 20,
            "balls": 28,
            "fours": 2,
            "sixes": 0,
            "strike_rate": 71.43,
            "dismissal": "Batting"
          },
          {
            "name": "Kavisha Dilhari",
            "runs": 5,
            "balls": 6,
            "fours": 0,
            "sixes": 0,
            "strike_rate": 83.33,
            "dismissal": "lbw b Molineux"
          },
          {
            "name": "Nilakshi de Silva",
            "runs": 7,
            "balls": 9,
            "fours": 0,
            "sixes": 0,
            "strike_rate": 77.78,
            "dismissal": "Batting"
          }
        ],
        extras: {
          byes: 0,
          leg_byes: 1,
          wides: 2,
          no_balls: 5,
          penalty: 0,
          total: 8
        }
      },
      bowling: {
        team: "Australia",
        bowlers: [
          {
            "name": "Megan Schutt",
            "overs": 3.0,
            "maidens": 1,
            "runs_conceded": 8,
            "wickets": 1,
            "economy_rate": 2.67
          },
          {
            "name": "Ashleigh Gardner",
            "overs": 3.0,
            "maidens": 1,
            "runs_conceded": 10,
            "wickets": 1,
            "economy_rate": 3.33
          },
          {
            "name": "Darcie Brown",
            "overs": 1.0,
            "maidens": 0,
            "runs_conceded": 12,
            "wickets": 0,
            "economy_rate": 12.00
          },
          {
            "name": "Sophie Molineux",
            "overs": 1.0,
            "maidens": 0,
            "runs_conceded": 4,
            "wickets": 1,
            "economy_rate": 4.00
          },
          {
            "name": "Georgia Wareham",
            "overs": 1.0,
            "maidens": 0,
            "runs_conceded": 5,
            "wickets": 0,
            "economy_rate": 5.00
          },
          {
            "name": "Annabel Sutherland",
            "overs": 1.0,
            "maidens": 0,
            "runs_conceded": 3,
            "wickets": 0,
            "economy_rate": 3.00
          }
        ]
      },
      fall_of_wickets: [
        {
          "batsman": "Vishmi Gunaratne",
          "score": "6-1",
          "overs": "3.0"
        },
        {
          "batsman": "Chamari Athapaththu (C)",
          "score": "6-2",
          "overs": "3.2"
        },
        {
          "batsman": "Kavisha Dilhari",
          "score": "25-3",
          "overs": "6.4"
        }
      ],
      partnerships: [
        {
          "partnership": "1ST WICKET",
          "batter1": "Vishmi Gunaratne",
          "batter1_score": "0(10)",
          "partnership_score": "6 (20)",
          "batter2": "Chamari Athapaththu",
          "batter2_score": "3 (10)"
        },
        {
          "partnership": "2ND WICKET",
          "batter1": "Chamari Athapaththu",
          "batter1_score": "0(2)",
          "partnership_score": "0 (2)",
          "batter2": "Harshitha Madavi\nSamarawickrama",
          "batter2_score": "0 (0)"
        },
        {
          "partnership": "3RD WICKET",
          "batter1": "Harshitha Madavi\nSamarawickrama",
          "batter1_score": "9(17)",
          "partnership_score": "19 (23)",
          "batter2": "Kavisha Dilhari",
          "batter2_score": "5 (6)"
        },
        {
          "partnership": "4TH WICKET",
          "batter1": "Harshitha Madavi\nSamarawickrama",
          "batter1_score": "11(11)",
          "partnership_score": "18 (20)",
          "batter2": "Nilakshi de Silva",
          "batter2_score": "7 (9)"
        }
      ]
    };

    this.match_info = scorecardData.match_info;
    this.batting = scorecardData.batting;
    this.bowling = scorecardData.bowling;
    this.fall_of_wickets = scorecardData.fall_of_wickets;
    this.partnerships = scorecardData.partnerships;
    this.inningsKeys = [];
    this.selectedInning = '';

    if(this.scorecardInfo && this.scorecardInfo.match_stats_by_innings.innings){
      this.inningsKeys = Object.keys(this.scorecardInfo.match_stats_by_innings.innings);
      console.log(this.inningsKeys);
      if (this.inningsKeys.length > 0) {
        this.selectedInning = this.inningsKeys[0];
      }
    }
  }

  canInspectPlayer(playerName: string): boolean {
    if (!playerName || !this.normalizePlayerKey(playerName)) {
      return false;
    }

    if (!this.playerStatsMatch || !this.playerStatsMatch.teams) {
      return true;
    }

    const normalizedTarget = this.normalizePlayerKey(playerName);
    for (let teamIndex = 0; teamIndex < this.playerStatsMatch.teams.length; teamIndex++) {
      const squad = this.playerStatsMatch.teams[teamIndex].squad || [];
      for (let playerIndex = 0; playerIndex < squad.length; playerIndex++) {
        const player = squad[playerIndex];
        const possibleMatches = [
          this.normalizePlayerKey(player.name),
          this.normalizePlayerKey(player.shortName)
        ];

        if (possibleMatches.indexOf(normalizedTarget) !== -1 && player.externalId) {
          return true;
        }
      }
    }

    return true;
  }

  selectPlayer(playerName: string): void {
    if (!this.canInspectPlayer(playerName)) {
      return;
    }

    this.playerSelected.emit(playerName);
  }

  selectInning(inningKey: string): void {
    this.selectedInning = inningKey;
  }

  onTabChange(event: MatTabChangeEvent) {
    if (event.index >= 0 && event.index < this.inningsKeys.length) {
      this.selectedInning = this.inningsKeys[event.index];
    }
  }

  private getInningStats(inningKey?: string): any {
    const key = inningKey || this.selectedInning;
    if (!key || !this.scorecardInfo) { return null; }
    const inn = this.scorecardInfo.match_stats_by_innings;
    if (!inn) { return null; }
    return (inn.innings && inn.innings[key]) ? inn.innings[key] : null;
  }

  getBatsmanKeys(inningKey?: string): string[] {
    const stats = this.getInningStats(inningKey);
    return (stats && stats.batsman_stats) ? Object.keys(stats.batsman_stats) : [];
  }

  getBatsmenWhoPlayed(inningKey?: string): string[] {
    const stats = this.getInningStats(inningKey);
    return this.getBatsmanKeys(inningKey).filter(k => {
      const bStats = stats && stats.batsman_stats && stats.batsman_stats[k];
      return !bStats || bStats.status !== 'yet_to_bat';
    });
  }

  getYetToBatKeys(inningKey?: string): string[] {
    const stats = this.getInningStats(inningKey);
    return this.getBatsmanKeys(inningKey).filter(k => {
      const bStats = stats && stats.batsman_stats && stats.batsman_stats[k];
      return bStats && bStats.status === 'yet_to_bat';
    });
  }

  getBowlerKeys(inningKey?: string): string[] {
    const stats = this.getInningStats(inningKey);
    return (stats && stats.bowlers_stats) ? Object.keys(stats.bowlers_stats) : [];
  }

  getBatsmanStats(batterKey: string, inningKey?: string): any {
    const stats = this.getInningStats(inningKey);
    return (stats && stats.batsman_stats && stats.batsman_stats[batterKey])
      ? stats.batsman_stats[batterKey]
      : this.emptyBatsmanStats;
  }

  getBowlerStats(bowlerKey: string, inningKey?: string): any {
    const stats = this.getInningStats(inningKey);
    return (stats && stats.bowlers_stats && stats.bowlers_stats[bowlerKey])
      ? stats.bowlers_stats[bowlerKey]
      : this.emptyBowlerStats;
  }

  getInningLabel(inningKey: string): string {
    const inn = this.scorecardInfo &&
                this.scorecardInfo.match_stats_by_innings &&
                this.scorecardInfo.match_stats_by_innings.innings;
    const stats = inn && inn[inningKey];
    const team = (stats && stats.team_code) ? stats.team_code : '';
    const label = inningKey.replace(/_/g, ' ').replace(/\binning\b/i, 'Inning');
    return team ? `${team} - ${label}` : label;
  }

  isCurrentlyBatting(batterKey: string, inningKey?: string): boolean {
    const stats = this.getInningStats(inningKey);
    const bStats = stats && stats.batsman_stats && stats.batsman_stats[batterKey];
    return !!(bStats && bStats.status === 'currently_batting');
  }

  getDismissalText(batterKey: string, inningKey?: string): string {
    const stats = this.getInningStats(inningKey);
    const bStats = stats && stats.batsman_stats && stats.batsman_stats[batterKey];
    if (!bStats) { return ''; }
    const status = bStats.status;
    const dismissal_code = bStats.dismissal_code;
    const bowler_code = bStats.bowler_code;
    const player_caught = bStats.player_caught;
    if (status === 'currently_batting') { return 'not out'; }
    if (status === 'yet_to_bat') { return 'yet to bat'; }
    if (!dismissal_code) { return ''; }
    const dc = dismissal_code.toLowerCase();
    if (dc === 'c' || dc === 'caught') {
      const catcher = player_caught ? ` ${player_caught}` : '';
      const bowler = bowler_code ? ` b ${bowler_code}` : '';
      return `c${catcher}${bowler}`;
    }
    if (dc === '^3' || dc === 'c&b' || dc === 'caught and bowled' || dc === 'caughtandbowled') {
      const bowler = bowler_code || player_caught;
      return bowler ? `c & b ${bowler}` : 'c & b';
    }
    if (dc === 'lbw') { return bowler_code ? `lbw b ${bowler_code}` : 'lbw'; }
    if (dc === 'b' || dc === 'bowled') { return bowler_code ? `b ${bowler_code}` : 'bowled'; }
    if (dc === 'run out') {
      const fielder = player_caught ? ` (${player_caught})` : '';
      return `run out${fielder}`;
    }
    if (dc === 'st' || dc === 'stumped') {
      const wk = player_caught ? ` ${player_caught}` : '';
      return bowler_code ? `st${wk} b ${bowler_code}` : `stumped${wk}`;
    }
    if (dc === 'hit wicket') { return bowler_code ? `hit wicket b ${bowler_code}` : 'hit wicket'; }
    if (dc === 'obstructed') { return 'obstructed the field'; }
    if (dc === 'handled') { return 'handled the ball'; }
    return dismissal_code;
  }

  calculateStrikeRate(runs: number, balls: number): number {
    if (balls === 0) return 0;
    return (runs / balls) * 100;
  }

  calculateEconomyRate(runs: number, overs: number): number {
    if (overs === 0) return 0;
    return runs / overs;
  }

  calculateOvers(teamScore: string): string {
    if (!teamScore) return '';
    const match = teamScore.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return ballsToOvers(match[1]);
    }
    return '';
  }

  // Normalize raw team_score strings like "155/9(102" -> "155/9 (10.2)"
  // - Ensures a space before the opening parenthesis
  // - Adds a missing closing parenthesis if absent
  // - Converts digits-only inside parentheses to proper overs with a decimal
  formatTeamScore(raw: string): string {
    if (!raw) {
      return raw;
    }
    return normalizeTeamScoreString(raw);
  }

  private toOvers(digits: string): string {
    // Delegate to shared util
    return ballsToOvers(digits) || digits;
  }

  private normalizePlayerKey(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .replace(/\(c\)|\(wk\)|†/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}
