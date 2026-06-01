import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatchApiService } from '../../match-api.service';

type MatchInfoTone = 'default' | 'accent' | 'warning' | 'success' | 'danger' | 'neutral';

interface MatchInfoMetaCard {
  icon: string;
  label: string;
  value: string;
  tone?: MatchInfoTone;
}

interface MatchInfoOfficial {
  label: string;
  value: string;
}

interface MatchInfoVenueStat {
  label: string;
  value: string;
  hint?: string;
}

interface MatchInfoResultPill {
  label: string;
  tone: MatchInfoTone;
  title: string;
}

interface MatchInfoRecentMatch {
  title: string;
  subtitle: string;
  scoreline: string;
  result: string;
  pill: MatchInfoResultPill;
}

interface MatchInfoFormSection {
  name: string;
  summary: string;
  insight: string;
  insightTone: MatchInfoTone;
  streak: MatchInfoResultPill[];
  matches: MatchInfoRecentMatch[];
}

interface MatchInfoComparisonRow {
  label: string;
  firstValue: string;
  secondValue: string;
  winner: 'first' | 'second' | 'tied';
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
  expandedFormTeams: { [teamName: string]: boolean } = {};

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

  get summaryEyebrow(): string {
    if (this.seriesName) {
      return this.seriesName;
    }

    return 'Match info';
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

  get statusTone(): MatchInfoTone {
    if (this.isCompletedMatch()) {
      return 'success';
    }

    if (this.isUpcomingMatch()) {
      return 'accent';
    }

    return 'warning';
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

  get summaryCards(): MatchInfoMetaCard[] {
    var cards: MatchInfoMetaCard[] = [];

    if (this.matchDate) {
      cards.push({
        icon: 'schedule',
        label: this.isUpcomingMatch() ? 'Starts' : 'Date & time',
        value: this.formatDateTime(this.matchDate),
        tone: 'accent'
      });
    }

    cards.push({
      icon: 'location_on',
      label: 'Venue',
      value: this.venueLocation ? this.venueName + ' - ' + this.venueLocation : this.venueName,
      tone: 'default'
    });

    if (this.tossInfo !== 'Toss information not available') {
      cards.push({
        icon: 'sports_cricket',
        label: 'Toss',
        value: this.tossInfo,
        tone: 'warning'
      });
    }

    if (cards.length < 4 && this.seriesName) {
      cards.push({
        icon: 'emoji_events',
        label: 'Series',
        value: this.seriesName,
        tone: 'default'
      });
    }

    return cards.slice(0, 4);
  }

  get summaryNarrative(): string {
    var summary = this.resultSummary;
    if (summary) {
      return summary;
    }

    if (this.tossInfo !== 'Toss information not available') {
      return this.tossInfo;
    }

    if (this.matchDate && this.venueName !== 'Venue not available') {
      return 'Starts ' + this.formatDateTime(this.matchDate) + ' at ' + this.venueName + '.';
    }

    if (this.matchDate) {
      return 'Starts ' + this.formatDateTime(this.matchDate) + '.';
    }

    if (this.venueName !== 'Venue not available') {
      return 'Venue: ' + this.venueName + '.';
    }

    return '';
  }

  get formSections(): MatchInfoFormSection[] {
    var raw = this.source && this.source.team_form ? this.source.team_form : null;
    var sections: MatchInfoFormSection[] = [];
    var keys: string[] = [];
    var index: number;

    if (!raw || typeof raw !== 'object') {
      return sections;
    }

    keys = Object.keys(raw);
    for (index = 0; index < keys.length; index++) {
      var teamKey = keys[index];
      var matches = raw[teamKey];
      if (!Array.isArray(matches) || !matches.length) {
        continue;
      }

      var streak = matches.slice(0, 5).map((match: any) => this.buildResultPill(teamKey, match));
      sections.push({
        name: this.formatTeamLabel(teamKey),
        summary: this.buildFormSummary(streak),
        insight: this.buildFormInsight(streak),
        insightTone: this.buildFormInsightTone(streak),
        streak: streak,
        matches: matches.slice(0, 3).map((match: any) => this.buildRecentMatch(teamKey, match))
      });
    }

    return sections.slice(0, 2);
  }

  get comparisonTeams(): string[] {
    var source = this.source;
    var comparison = source && source.team_comparison ? source.team_comparison : null;
    return comparison ? Object.keys(comparison).slice(0, 2) : [];
  }

  get comparisonRows(): MatchInfoComparisonRow[] {
    var rows: MatchInfoComparisonRow[] = [];
    var teams = this.comparisonTeams;
    var definitions = [
      { key: 'matches_played', label: 'Matches played', highlight: false },
      { key: 'win_percentage', label: 'Win rate', highlight: true },
      { key: 'avg_score', label: 'Avg score', highlight: true },
      { key: 'highest_score', label: 'Highest score', highlight: true },
      { key: 'lowest_score', label: 'Lowest score', highlight: false }
    ];
    var comparison = this.source && this.source.team_comparison ? this.source.team_comparison : null;
    var first: any;
    var second: any;
    var index: number;

    if (!comparison || teams.length < 2) {
      return rows;
    }

    first = comparison[teams[0]] || {};
    second = comparison[teams[1]] || {};

    for (index = 0; index < definitions.length; index++) {
      var definition = definitions[index];
      var firstValue = this.asDisplayValue(first[definition.key]);
      var secondValue = this.asDisplayValue(second[definition.key]);
      var winner: 'first' | 'second' | 'tied' = 'tied';

      if (firstValue || secondValue) {
        if (definition.highlight) {
          winner = this.resolveComparisonWinner(firstValue, secondValue);
        }

        rows.push({
          label: definition.label,
          firstValue: firstValue || '-',
          secondValue: secondValue || '-',
          winner: winner
        });
      }
    }

    return rows;
  }

  get venueHeadline(): string | null {
    var stats = this.source && this.source.venue_stats ? this.source.venue_stats : null;
    var batFirst = stats ? this.parsePercent(stats.win_bat_first) : null;
    var bowlFirst = stats ? this.parsePercent(stats.win_bowl_first) : null;

    if (batFirst !== null && bowlFirst !== null) {
      if (batFirst > bowlFirst) {
        return 'Batting first has had the edge at ' + this.venueName + '.';
      }

      if (bowlFirst > batFirst) {
        return 'Chasing has been friendlier than setting a target at ' + this.venueName + '.';
      }
    }

    if (stats && stats.matches) {
      return stats.matches + ' recent matches give us the venue baseline below.';
    }

    if (this.venueCapacity) {
      return 'Venue capacity: ' + this.formatNumber(this.venueCapacity) + ' spectators.';
    }

    return null;
  }

  get venueStats(): MatchInfoVenueStat[] {
    var source = this.source;
    var stats = source && source.venue_stats ? source.venue_stats : null;
    var cards: MatchInfoVenueStat[] = [];

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

    if (this.asDisplayValue(stats.matches)) {
      cards.push({
        label: 'Matches',
        value: this.asDisplayValue(stats.matches)
      });
    }

    if (this.asDisplayValue(stats.avg_1st_inns)) {
      cards.push({
        label: 'Avg 1st inns',
        value: this.asDisplayValue(stats.avg_1st_inns)
      });
    }

    if (this.asDisplayValue(stats.avg_2nd_inns)) {
      cards.push({
        label: 'Avg 2nd inns',
        value: this.asDisplayValue(stats.avg_2nd_inns)
      });
    }

    if (this.asDisplayValue(stats.win_bat_first)) {
      cards.push({
        label: 'Bat first wins',
        value: this.asDisplayValue(stats.win_bat_first)
      });
    }

    if (this.asDisplayValue(stats.win_bowl_first)) {
      cards.push({
        label: 'Bowl first wins',
        value: this.asDisplayValue(stats.win_bowl_first)
      });
    }

    return cards;
  }

  get showVenueSection(): boolean {
    return this.venueStats.length > 0;
  }

  get showComparisonSection(): boolean {
    return this.comparisonRows.length > 0;
  }

  get resultSummary(): string {
    var source = this.source;
    if (!source) {
      return '';
    }

    return source.final_result_text || source.lastKnownState || '';
  }

  toggleFormSection(teamName: string): void {
    this.expandedFormTeams[teamName] = !this.isFormExpanded(teamName);
  }

  isFormExpanded(teamName: string): boolean {
    return !!this.expandedFormTeams[teamName];
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

  private resolveComparisonWinner(firstValue: string, secondValue: string): 'first' | 'second' | 'tied' {
    var firstNumber = this.parseNumber(firstValue);
    var secondNumber = this.parseNumber(secondValue);

    if (firstNumber === null || secondNumber === null || firstNumber === secondNumber) {
      return 'tied';
    }

    return firstNumber > secondNumber ? 'first' : 'second';
  }

  private formatNumber(value: string): string {
    var parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return value;
    }

    return parsed.toLocaleString();
  }

  private asDisplayValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    var text = String(value).trim();
    if (!text || text.toLowerCase() === 'no data') {
      return '';
    }

    return text;
  }

  private buildFormSummary(streak: MatchInfoResultPill[]): string {
    var wins = 0;
    var losses = 0;
    var draws = 0;
    var neutral = 0;
    var parts: string[] = [];
    var index: number;

    for (index = 0; index < streak.length; index++) {
      var pill = streak[index];
      if (pill.label === 'W') {
        wins += 1;
      } else if (pill.label === 'L') {
        losses += 1;
      } else if (pill.label === 'D') {
        draws += 1;
      } else {
        neutral += 1;
      }
    }

    if (wins) {
      parts.push(wins + 'W');
    }
    if (losses) {
      parts.push(losses + 'L');
    }
    if (draws) {
      parts.push(draws + 'D');
    }
    if (neutral) {
      parts.push(neutral + 'N');
    }

    if (!parts.length) {
      return 'Recent results unavailable';
    }

    return parts.join(' • ') + ' in last ' + streak.length;
  }

  private buildFormInsight(streak: MatchInfoResultPill[]): string {
    var meaningful = streak.filter(function(pill: MatchInfoResultPill): boolean {
      return pill.label !== '-' && pill.label !== 'N';
    });
    var recent = meaningful.slice(0, 3).map(function(pill: MatchInfoResultPill): string {
      return pill.label;
    });
    var wins = recent.filter(function(label: string): boolean { return label === 'W'; }).length;
    var losses = recent.filter(function(label: string): boolean { return label === 'L'; }).length;

    if (!meaningful.length) {
      return 'Results still filling in';
    }

    if (recent.length >= 3 && recent[0] === 'W' && recent[1] === 'W' && recent[2] === 'W') {
      return 'Three-match winning run';
    }

    if (recent.length >= 3 && recent[0] === 'L' && recent[1] === 'L' && recent[2] === 'L') {
      return 'Three straight losses';
    }

    if (recent.length >= 2 && recent[0] === 'W' && recent[1] === 'W') {
      return 'Won last 2';
    }

    if (recent.length >= 2 && recent[0] === 'L' && recent[1] === 'L') {
      return 'Lost last 2';
    }

    if (recent[0] === 'W') {
      return 'Won last match';
    }

    if (recent[0] === 'L') {
      return 'Lost last match';
    }

    if (wins > losses) {
      return 'Slight positive trend';
    }

    if (losses > wins) {
      return 'Under pressure lately';
    }

    return 'Mixed recent run';
  }

  private buildFormInsightTone(streak: MatchInfoResultPill[]): MatchInfoTone {
    var firstMeaningful = streak.filter(function(pill: MatchInfoResultPill): boolean {
      return pill.label !== '-' && pill.label !== 'N';
    })[0];

    if (!firstMeaningful) {
      return 'neutral';
    }

    if (firstMeaningful.label === 'W') {
      return 'success';
    }

    if (firstMeaningful.label === 'L') {
      return 'danger';
    }

    return 'neutral';
  }

  private buildRecentMatch(teamKey: string, match: any): MatchInfoRecentMatch {
    return {
      title: match && match.match_name ? match.match_name : 'Recent match',
      subtitle: match && match.series_name ? match.series_name : 'Previous outing',
      scoreline: this.buildScoreline(match && match.teams ? match.teams : []),
      result: this.formatDetailedResult(teamKey, match),
      pill: this.buildResultPill(teamKey, match)
    };
  }

  private buildScoreline(teams: any[]): string {
    if (!Array.isArray(teams) || !teams.length) {
      return 'Score unavailable';
    }

    var parts = teams.map((team: any) => {
      var innings = team && Array.isArray(team.innings) ? team.innings : [];
      var scoreParts = innings.map((entry: any) => {
        var score = this.asDisplayValue(entry && entry.team_score);
        var overs = this.asDisplayValue(entry && entry.team_over);

        if (!score && !overs) {
          return '';
        }

        if (score && overs) {
          return score + ' (' + overs + ')';
        }

        return score || overs;
      }).filter(Boolean);

      if (!scoreParts.length) {
        return this.formatTeamLabel(team && team.team_name ? team.team_name : 'Team');
      }

      return this.formatTeamLabel(team && team.team_name ? team.team_name : 'Team') + ' ' + scoreParts.join(' & ');
    }).filter(Boolean);

    return parts.length ? parts.join(' - ') : 'Score unavailable';
  }

  private buildResultPill(teamKey: string, match: any): MatchInfoResultPill {
    var result = match && match.result ? String(match.result).trim() : '';
    var lower = result.toLowerCase();
    var compact = lower.replace(/[^a-z]+/g, '');

    if (!lower) {
      return { label: '-', tone: 'neutral', title: 'Result unavailable' };
    }

    if (compact === 'w' || compact === 'win' || compact === 'won') {
      return { label: 'W', tone: 'success', title: result };
    }

    if (compact === 'l' || compact === 'loss' || compact === 'lost') {
      return { label: 'L', tone: 'danger', title: result };
    }

    if (compact === 'd' || compact === 't' || compact === 'draw' || compact === 'tied' || compact === 'tie') {
      return { label: 'D', tone: 'neutral', title: result };
    }

    if (compact === 'n' || compact === 'nr' || compact === 'a' || compact === 'abandoned') {
      return { label: 'N', tone: 'neutral', title: result };
    }

    if (lower.indexOf('no result') !== -1 || lower.indexOf('abandon') !== -1) {
      return { label: 'N', tone: 'neutral', title: result };
    }

    if (lower.indexOf('draw') !== -1 || lower.indexOf('tie') !== -1) {
      return { label: 'D', tone: 'neutral', title: result };
    }

    if (lower.indexOf('won') !== -1) {
      if (this.didTeamWin(teamKey, match, result)) {
        return { label: 'W', tone: 'success', title: result };
      }

      return { label: 'L', tone: 'danger', title: result };
    }

    return { label: '-', tone: 'neutral', title: result };
  }

  private formatDetailedResult(teamKey: string, match: any): string {
    var raw = match && match.result ? String(match.result).trim() : '';
    var pill = this.buildResultPill(teamKey, match);
    var teamName = this.formatTeamLabel(teamKey);

    if (!raw) {
      return 'Result unavailable';
    }

    if (raw.length === 1 || raw.toLowerCase() === 'win' || raw.toLowerCase() === 'loss' || raw.toLowerCase() === 'lost' || raw.toLowerCase() === 'won') {
      if (pill.label === 'W') {
        return teamName + ' won';
      }

      if (pill.label === 'L') {
        return teamName + ' lost';
      }
    }

    if (pill.label === 'D' && (raw.length <= 2 || raw.toLowerCase() === 'draw' || raw.toLowerCase() === 'tied')) {
      return 'Match tied or drawn';
    }

    if (pill.label === 'N' && (raw.length <= 2 || raw.toLowerCase() === 'nr' || raw.toLowerCase() === 'a')) {
      return 'No result';
    }

    return raw;
  }

  private didTeamWin(teamKey: string, match: any, result: string): boolean {
    var currentAliases = this.buildTeamAliases(teamKey);
    var teams = match && Array.isArray(match.teams) ? match.teams : [];
    var teamNames = teams.map((team: any) => team && team.team_name ? String(team.team_name) : '').filter(Boolean);
    var matchingTeamName = this.findAliasMatch(result, teamNames);

    if (matchingTeamName) {
      return this.aliasSetsOverlap(currentAliases, this.buildTeamAliases(matchingTeamName));
    }

    return this.aliasesInText(currentAliases, result);
  }

  private findAliasMatch(text: string, names: string[]): string | null {
    var index: number;

    for (index = 0; index < names.length; index++) {
      if (this.aliasesInText(this.buildTeamAliases(names[index]), text)) {
        return names[index];
      }
    }

    return null;
  }

  private aliasSetsOverlap(first: string[], second: string[]): boolean {
    var index: number;

    for (index = 0; index < first.length; index++) {
      if (second.indexOf(first[index]) !== -1) {
        return true;
      }
    }

    return false;
  }

  private aliasesInText(aliases: string[], text: string): boolean {
    var normalizedText = this.normalizeComparableText(text);
    var index: number;

    for (index = 0; index < aliases.length; index++) {
      if (normalizedText.indexOf(aliases[index]) !== -1) {
        return true;
      }
    }

    return false;
  }

  private buildTeamAliases(teamName: string): string[] {
    var readable = this.formatTeamLabel(teamName);
    var normalized = this.normalizeComparableText(readable);
    var aliases: string[] = [];
    var compact = normalized.replace(/\s+/g, '');
    var words = normalized.split(' ').filter(Boolean);
    var initials = words.map(function(word: string): string {
      return word.charAt(0);
    }).join('');
    var index: number;

    if (normalized) {
      aliases.push(normalized);
    }

    if (compact && aliases.indexOf(compact) === -1) {
      aliases.push(compact);
    }

    if (initials && initials.length > 1 && aliases.indexOf(initials) === -1) {
      aliases.push(initials);
    }

    for (index = 0; index < words.length; index++) {
      if (words[index].length > 2 && aliases.indexOf(words[index]) === -1) {
        aliases.push(words[index]);
      }
    }

    return aliases;
  }

  private normalizeComparableText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatTeamLabel(value: string): string {
    if (!value) {
      return 'Team';
    }

    var label = String(value).replace(/[_-]+/g, ' ').trim();

    if (!label) {
      return 'Team';
    }

    if (label.toUpperCase() === label) {
      return label;
    }

    return label.replace(/\b\w/g, function(letter: string): string {
      return letter.toUpperCase();
    });
  }
}
