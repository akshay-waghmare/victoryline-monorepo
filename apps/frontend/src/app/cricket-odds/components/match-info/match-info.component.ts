import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatchApiService } from '../../match-api.service';

interface MatchInfoFact {
  icon: string;
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'warning' | 'success';
}

interface MatchInfoInsight {
  icon: string;
  title: string;
  text: string;
  tone: 'default' | 'accent' | 'warning' | 'success';
}

interface MatchInfoMiniStat {
  label: string;
  value: string;
  hint?: string;
}

interface MatchInfoTeamCard {
  name: string;
  metrics: MatchInfoMiniStat[];
  highlight?: string;
}

interface MatchInfoOfficial {
  label: string;
  value: string;
}

@Component({
  selector: 'app-match-details-info',
  templateUrl: './match-info.component.html',
  styleUrls: ['./match-info.component.css']
})
export class MatchDetailsInfoComponent implements OnInit, OnChanges {
  @Input() matchId?: string;
  @Input() matchInfo?: any;

  matchData: any = null;
  isLoading = false;

  constructor(private api: MatchApiService) {}

  ngOnInit(): void {
    this.syncMatchData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['matchInfo']) {
      this.syncMatchData();
    }
  }

  private syncMatchData(): void {
    if (this.matchInfo) {
      this.matchData = this.matchInfo;
    } else if (!this.matchData && this.matchId) {
      console.warn('[MatchDetailsInfo] Match info not supplied for match:', this.matchId);
    }
  }

  private loadMatchInfo(): void {
    if (!this.matchId) {
      return;
    }

    this.isLoading = true;
    this.api.getMatchInfo(this.matchId).subscribe(
      (response: any) => {
        if (response && response.success && response.data) {
          this.matchData = response.data;
        }
        this.isLoading = false;
      },
      error => {
        console.error('[MatchInfo] Failed to load match info:', error);
        this.isLoading = false;
      }
    );
  }

  private get source(): any {
    return this.matchInfo || this.matchData || null;
  }

  get hasData(): boolean {
    return !!this.source;
  }

  get matchTitle(): string {
    var source = this.source;
    if (!source) {
      return 'Match information';
    }

    return source.match_name || source.series_name || 'Match information';
  }

  get seriesName(): string {
    var source = this.source;
    if (!source) {
      return '';
    }

    return source.series_name || source.series || '';
  }

  get matchFormat(): string {
    var source = this.source;
    if (!source) {
      return 'Format not available';
    }

    return source.format || this.inferFormat(source.match_name) || 'Format not available';
  }

  get matchStatus(): string {
    var source = this.source;
    if (!source) {
      return 'Status unavailable';
    }

    var status = this.normalizeStatus(source.match_status || source.status);
    if (status) {
      return status;
    }

    if (this.isCompletedMatch()) {
      return 'Completed';
    }

    return 'Live';
  }

  get matchDate(): string | null {
    var source = this.source;
    if (!source) {
      return null;
    }

    return source.match_date || source.startTime || null;
  }

  get venueName(): string {
    var source = this.source;
    if (!source) {
      return 'Venue not available';
    }

    if (source.venue && typeof source.venue === 'string') {
      return source.venue;
    }

    if (source.venue && source.venue.name) {
      return source.venue.name;
    }

    return 'Venue not available';
  }

  get venueLocation(): string {
    var source = this.source;
    if (!source || !source.venue || typeof source.venue === 'string') {
      return '';
    }

    var city = source.venue.city || '';
    var country = source.venue.country || '';
    return [city, country].filter(Boolean).join(', ');
  }

  get venueCapacity(): string | null {
    var source = this.source;
    if (!source || !source.venue || typeof source.venue === 'string') {
      return null;
    }

    return source.venue.capacity || null;
  }

  get tossInfo(): string {
    var source = this.source;
    if (!source) {
      return 'Toss information not available';
    }

    if (source.toss_info) {
      return source.toss_info;
    }

    if (source.toss) {
      var decision = source.toss.decision === 'BAT' ? 'bat' : 'field';
      return 'Toss won and chose to ' + decision;
    }

    return 'Toss information not available';
  }

  get officialsList(): MatchInfoOfficial[] {
    var source = this.source;
    var officials = source && source.officials ? source.officials : {};
    var rows: MatchInfoOfficial[] = [];

    if (officials.umpire1) {
      rows.push({ label: 'Umpire 1', value: officials.umpire1 });
    }

    if (officials.umpire2) {
      rows.push({ label: 'Umpire 2', value: officials.umpire2 });
    }

    if (officials.thirdUmpire) {
      rows.push({ label: 'Third umpire', value: officials.thirdUmpire });
    }

    if (officials.referee) {
      rows.push({ label: 'Referee', value: officials.referee });
    }

    return rows;
  }

  get keyFacts(): MatchInfoFact[] {
    var facts: MatchInfoFact[] = [];

    facts.push({
      icon: 'flag',
      label: 'Status',
      value: this.matchStatus,
      tone: this.getStatusTone()
    });

    facts.push({
      icon: 'emoji_events',
      label: 'Format',
      value: this.matchFormat,
      tone: 'default'
    });

    if (this.matchDate) {
      facts.push({
        icon: 'schedule',
        label: this.isUpcomingMatch() ? 'Starts' : 'Date & time',
        value: this.formatDateTime(this.matchDate),
        tone: 'accent'
      });
    }

    if (this.seriesName) {
      facts.push({
        icon: 'military_tech',
        label: 'Series',
        value: this.seriesName,
        tone: 'default'
      });
    }

    facts.push({
      icon: 'location_on',
      label: 'Venue',
      value: this.venueLocation ? this.venueName + ' • ' + this.venueLocation : this.venueName,
      tone: 'default'
    });

    if (this.tossInfo !== 'Toss information not available') {
      facts.push({
        icon: 'sports_cricket',
        label: 'Toss',
        value: this.tossInfo,
        tone: 'warning'
      });
    }

    if (this.officialsList.length > 0) {
      facts.push({
        icon: 'gavel',
        label: 'Officials',
        value: String(this.officialsList.length),
        tone: 'default'
      });
    }

    return facts;
  }

  get smartInsights(): MatchInfoInsight[] {
    var insights: MatchInfoInsight[] = [];
    var statusInsight = this.buildStatusInsight();
    var tossInsight = this.buildTossInsight();
    var venueInsight = this.buildVenueInsight();
    var comparisonInsight = this.buildComparisonInsight();

    if (statusInsight) {
      insights.push(statusInsight);
    }

    if (tossInsight) {
      insights.push(tossInsight);
    }

    if (venueInsight) {
      insights.push(venueInsight);
    }

    if (comparisonInsight) {
      insights.push(comparisonInsight);
    }

    return insights.slice(0, 3);
  }

  get venueMiniStats(): MatchInfoMiniStat[] {
    var source = this.source;
    var stats = source && source.venue_stats ? source.venue_stats : null;
    var cards: MatchInfoMiniStat[] = [];

    if (!stats) {
      if (this.venueCapacity) {
        cards.push({
          label: 'Capacity',
          value: this.formatNumber(this.venueCapacity),
          hint: 'spectators'
        });
      }
      return cards;
    }

    if (stats.matches) {
      cards.push({
        label: 'Matches',
        value: String(stats.matches)
      });
    }

    if (stats.avg_1st_inns) {
      cards.push({
        label: 'Avg 1st inns',
        value: String(stats.avg_1st_inns)
      });
    }

    if (stats.avg_2nd_inns) {
      cards.push({
        label: 'Avg 2nd inns',
        value: String(stats.avg_2nd_inns)
      });
    }

    if (stats.win_bat_first) {
      cards.push({
        label: 'Bat first wins',
        value: String(stats.win_bat_first)
      });
    }

    if (stats.win_bowl_first) {
      cards.push({
        label: 'Bowl first wins',
        value: String(stats.win_bowl_first)
      });
    }

    return cards;
  }

  get teamCards(): MatchInfoTeamCard[] {
    var source = this.source;
    var comparison = source && source.team_comparison ? source.team_comparison : null;
    var cards: MatchInfoTeamCard[] = [];

    if (!comparison) {
      return cards;
    }

    var keys = Object.keys(comparison);
    for (var index = 0; index < keys.length; index++) {
      var teamName = keys[index];
      var teamData = comparison[teamName] || {};
      var metrics: MatchInfoMiniStat[] = [];

      if (teamData.win_percentage) {
        metrics.push({
          label: 'Win rate',
          value: String(teamData.win_percentage)
        });
      }

      if (teamData.avg_score) {
        metrics.push({
          label: 'Avg score',
          value: String(teamData.avg_score)
        });
      }

      if (teamData.highest_score) {
        metrics.push({
          label: 'High',
          value: String(teamData.highest_score)
        });
      }

      if (teamData.lowest_score) {
        metrics.push({
          label: 'Low',
          value: String(teamData.lowest_score)
        });
      }

      cards.push({
        name: teamName,
        metrics: metrics.slice(0, 4),
        highlight: this.buildTeamHighlight(teamName, teamData)
      });
    }

    return cards.slice(0, 2);
  }

  get showVenueSection(): boolean {
    return this.venueMiniStats.length > 0;
  }

  get showTeamSection(): boolean {
    return this.teamCards.length > 0;
  }

  private buildStatusInsight(): MatchInfoInsight | null {
    var source = this.source;
    if (!source) {
      return null;
    }

    if (this.isCompletedMatch()) {
      return {
        icon: 'check_circle',
        title: 'Result',
        text: source.final_result_text || source.lastKnownState || 'This match has been completed.',
        tone: 'success'
      };
    }

    if (this.isUpcomingMatch()) {
      return {
        icon: 'event',
        title: 'What to expect',
        text: this.matchDate
          ? 'Scheduled for ' + this.formatDateTime(this.matchDate) + '. Venue and toss context are ready below.'
          : 'Upcoming fixture. Venue and pre-match context are ready below.',
        tone: 'accent'
      };
    }

    return {
      icon: 'flash_on',
      title: 'Live situation',
      text: source.final_result_text || source.lastKnownState || 'Follow the live hero above for the latest score and momentum swing.',
      tone: 'warning'
    };
  }

  private buildTossInsight(): MatchInfoInsight | null {
    var toss = this.tossInfo;
    if (!toss || toss === 'Toss information not available') {
      return null;
    }

    var stats = this.source && this.source.venue_stats ? this.source.venue_stats : null;
    var batFirst = stats ? this.parsePercent(stats.win_bat_first) : null;
    var bowlFirst = stats ? this.parsePercent(stats.win_bowl_first) : null;
    var tossLower = toss.toLowerCase();
    var choseToBat = tossLower.indexOf('bat') !== -1;
    var choseToField = tossLower.indexOf('field') !== -1 || tossLower.indexOf('bowl') !== -1;
    var context = '';

    if (choseToBat && batFirst !== null) {
      context = ' Batting first has won ' + batFirst + '% of tracked games here.';
    } else if (choseToField && bowlFirst !== null) {
      context = ' Chasing or bowling first has won ' + bowlFirst + '% here.';
    }

    return {
      icon: 'sports_cricket',
      title: 'Toss angle',
      text: toss + context,
      tone: 'warning'
    };
  }

  private buildVenueInsight(): MatchInfoInsight | null {
    var stats = this.source && this.source.venue_stats ? this.source.venue_stats : null;
    if (!stats) {
      return null;
    }

    var summaryParts: string[] = [];

    if (stats.matches) {
      summaryParts.push(String(stats.matches) + ' matches tracked');
    }

    if (stats.avg_1st_inns) {
      summaryParts.push('avg 1st inns ' + stats.avg_1st_inns);
    }

    if (stats.avg_2nd_inns) {
      summaryParts.push('avg 2nd inns ' + stats.avg_2nd_inns);
    }

    if (summaryParts.length === 0) {
      return null;
    }

    return {
      icon: 'insights',
      title: 'Venue trend',
      text: summaryParts.join(' • '),
      tone: 'accent'
    };
  }

  private buildComparisonInsight(): MatchInfoInsight | null {
    var source = this.source;
    var comparison = source && source.team_comparison ? source.team_comparison : null;
    if (!comparison) {
      return null;
    }

    var keys = Object.keys(comparison);
    if (keys.length < 2) {
      return null;
    }

    var firstName = keys[0];
    var secondName = keys[1];
    var first = comparison[firstName] || {};
    var second = comparison[secondName] || {};
    var firstWin = this.parsePercent(first.win_percentage);
    var secondWin = this.parsePercent(second.win_percentage);
    var firstAvg = this.parseNumber(first.avg_score);
    var secondAvg = this.parseNumber(second.avg_score);
    var winner = '';
    var edgeParts: string[] = [];

    if (firstWin !== null && secondWin !== null && firstWin !== secondWin) {
      winner = firstWin > secondWin ? firstName : secondName;
      edgeParts.push(
        winner + ' have the stronger win rate (' +
        (winner === firstName ? first.win_percentage : second.win_percentage) + ')'
      );
    }

    if (firstAvg !== null && secondAvg !== null && firstAvg !== secondAvg) {
      var higherScoring = firstAvg > secondAvg ? firstName : secondName;
      edgeParts.push(
        higherScoring + ' score more on average (' +
        (higherScoring === firstName ? first.avg_score : second.avg_score) + ')'
      );
    }

    if (edgeParts.length === 0) {
      return null;
    }

    return {
      icon: 'compare_arrows',
      title: 'Team snapshot',
      text: edgeParts.join(' • '),
      tone: 'default'
    };
  }

  private buildTeamHighlight(teamName: string, teamData: any): string | undefined {
    if (!teamData) {
      return undefined;
    }

    if (teamData.matches_played && teamData.win_percentage) {
      return teamData.win_percentage + ' win rate across ' + teamData.matches_played + ' matches';
    }

    if (teamData.avg_score) {
      return 'Average score ' + teamData.avg_score;
    }

    return undefined;
  }

  private isCompletedMatch(): boolean {
    var source = this.source;
    if (!source) {
      return false;
    }

    var status = String(source.match_status || source.status || '').toLowerCase();
    var result = String(source.final_result_text || source.lastKnownState || '').toLowerCase();

    return status.indexOf('complete') !== -1
      || status.indexOf('finish') !== -1
      || status.indexOf('result') !== -1
      || result.indexOf('won') !== -1
      || result.indexOf('drawn') !== -1
      || result.indexOf('tied') !== -1;
  }

  private isUpcomingMatch(): boolean {
    var source = this.source;
    if (!source) {
      return false;
    }

    var status = String(source.match_status || source.status || '').toLowerCase();
    return status.indexOf('upcoming') !== -1
      || status.indexOf('schedule') !== -1
      || status.indexOf('fixture') !== -1
      || status.indexOf('not started') !== -1;
  }

  private normalizeStatus(value: string): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, function(letter: string): string {
        return letter.toUpperCase();
      });
  }

  private inferFormat(value: string): string | null {
    if (!value) {
      return null;
    }

    var upper = value.toUpperCase();
    if (upper.indexOf('TEST') !== -1) {
      return 'Test';
    }
    if (upper.indexOf('T20I') !== -1) {
      return 'T20I';
    }
    if (upper.indexOf('T20') !== -1) {
      return 'T20';
    }
    if (upper.indexOf('ODI') !== -1) {
      return 'ODI';
    }
    if (upper.indexOf('T10') !== -1) {
      return 'T10';
    }

    return null;
  }

  private getStatusTone(): 'default' | 'accent' | 'warning' | 'success' {
    if (this.isCompletedMatch()) {
      return 'success';
    }

    if (this.isUpcomingMatch()) {
      return 'accent';
    }

    return 'warning';
  }

  private formatDateTime(value: string): string {
    var parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private parsePercent(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    var parsed = parseFloat(String(value).replace('%', '').trim());
    return isNaN(parsed) ? null : parsed;
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    var parsed = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  private formatNumber(value: string): string {
    var parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return value;
    }

    return parsed.toLocaleString();
  }
}
