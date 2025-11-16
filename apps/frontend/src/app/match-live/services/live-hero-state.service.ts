import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RxStompService } from '@stomp/ng2-stompjs';
import { CricketService } from '../../cricket-odds/cricket-odds.service';
import {
  LegacyCricketData,
  LegacyMatchOdds,
  LegacyOverBall,
  LiveHeroConfig,
  LiveHeroState,
  LiveHeroViewModel,
  LiveMatchSnapshotDto,
  OddsQuoteDto,
  ParticipantSummaryDto,
  BowlerSummaryDto,
  InningsScoreDto,
  StalenessSignalDto,
  StalenessTier
} from './live-hero.models';
import { LiveHeroDataAdapter } from './live-hero-data.adapter';

@Injectable({ providedIn: 'root' })
export class LiveHeroStateService {
  private readonly stateSubject = new BehaviorSubject<LiveHeroState>({ loading: true, view: null });
  private readonly viewSubject = new BehaviorSubject<LiveHeroViewModel | null>(null);
  private httpSubscription = new Subscription();
  private wsSubscription: Subscription | null = null;

  private currentMatchId: string | null = null;
  private currentLegacyData: LegacyCricketData | null = null;
  private latestSnapshot: LiveMatchSnapshotDto | null = null;
  private currentConfig: LiveHeroConfig | undefined;
  private pollingEnabled = false;

  readonly state$: Observable<LiveHeroState> = this.stateSubject.asObservable();
  readonly view$: Observable<LiveHeroViewModel | null> = this.viewSubject.asObservable();

  constructor(
    private readonly cricketService: CricketService,
    private readonly rxStomp: RxStompService,
    private readonly adapter: LiveHeroDataAdapter
  ) {}

  init(matchId: string, config?: LiveHeroConfig) {
    if (!matchId) {
      console.warn('[LiveHeroStateService] init called without matchId');
      return;
    }

    if (this.currentMatchId === matchId) {
      this.currentConfig = config;
      this.emitView();
      return;
    }

    this.teardown();

    this.currentMatchId = matchId;
    this.currentConfig = config;
    this.latestSnapshot = null;
    this.currentLegacyData = null;
    this.stateSubject.next({ loading: true, view: null });
    this.viewSubject.next(null);

    this.fetchInitialSnapshot(matchId);
    this.subscribeToLegacyUpdates(matchId);
  }

  manualRetry() {
    if (!this.currentMatchId) {
      return;
    }
    this.fetchInitialSnapshot(this.currentMatchId);
  }

  setPollingEnabled(enabled: boolean) {
    this.pollingEnabled = enabled;
  }

  destroy() {
    this.teardown();
  }

  private fetchInitialSnapshot(matchId: string) {
    const sub = this.cricketService.getLastUpdatedData(matchId).pipe(
      tap(snapshot => this.mergeLegacyData(snapshot, true)),
      catchError(err => {
        console.error('[LiveHeroStateService] Initial snapshot load failed', err);
        this.pushError('SNAPSHOT_LOAD_FAILED');
        this.clearLoading();
        return of(null);
      })
    ).subscribe();

    this.httpSubscription.add(sub);
  }

  private emitView() {
    if (!this.latestSnapshot) {
      return;
    }

    const view = this.adapter.mapSnapshot(this.latestSnapshot, {
      scorecard: null,
      config: this.currentConfig
    });

    this.viewSubject.next(view);
    this.stateSubject.next({
      loading: false,
      view: view,
      error: null
    });
  }

  private pushError(message: string) {
    const current = this.stateSubject.getValue();
    this.stateSubject.next({
      loading: current.loading,
      view: current.view || null,
      error: message
    });
  }

  private clearLoading() {
    const current = this.stateSubject.getValue();
    if (!current.loading) {
      return;
    }
    this.stateSubject.next({
      loading: false,
      view: current.view || null,
      error: current.error
    });
  }

  private teardown() {
    this.httpSubscription.unsubscribe();
    this.httpSubscription = new Subscription();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
    this.currentMatchId = null;
    this.currentLegacyData = null;
    this.latestSnapshot = null;
    this.currentConfig = undefined;
  }
  private subscribeToLegacyUpdates(matchId: string) {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }

    const topic = `/topic/cricket.${matchId}.*`;
    // Legacy stream emits partial JSON patches per field (team_odds, batsman_data, etc.).
    this.wsSubscription = this.rxStomp.watch(topic).subscribe(
      message => {
        const payload = this.safeParse(message.body);
        if (payload) {
          this.mergeLegacyData(payload, true);
        }
      },
      error => {
        console.error('[LiveHeroStateService] Legacy websocket stream error', error);
      }
    );
  }

  private mergeLegacyData(payload: any, markFresh: boolean) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    // Normalize payload onto LegacyCricketData so the adapter can stay agnostic of transport shape.
    const normalized = this.normalizeLegacyPayload(payload, markFresh);
    const next: LegacyCricketData = {
      ...(this.currentLegacyData || {})
    };
    const target = next as Record<string, any>;

    (Object.keys(normalized) as (keyof LegacyCricketData)[]).forEach(key => {
      const value = normalized[key];
      if (value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        target[key as string] = value.slice();
      } else if (value && typeof value === 'object') {
        target[key as string] = { ...(value as any) };
      } else {
        target[key as string] = value;
      }
    });

    this.currentLegacyData = next;
    this.updateSnapshotFromLegacy();
  }

  private updateSnapshotFromLegacy() {
    if (!this.currentMatchId || !this.currentLegacyData) {
      return;
    }

    const snapshot = this.buildSnapshotFromLegacy(this.currentLegacyData, this.currentMatchId);
    this.latestSnapshot = snapshot;
    this.emitView();
  }

  private buildSnapshotFromLegacy(data: LegacyCricketData, matchId: string): LiveMatchSnapshotDto {
    const updatedAtMs = this.resolveTimestamp(data);
    const innings = this.buildInnings(data);
    const batters = this.buildBatters(data);
    const bowler = this.buildBowler(data);
    const odds = this.buildOdds(data, updatedAtMs);
    const staleness = this.buildStaleness(updatedAtMs);

    return {
      id: matchId,
      status: this.deriveStatus(data),
      timestamp: new Date(updatedAtMs).toISOString(),
      innings,
      chaseContext: null,
      batters,
      bowler,
      partnership: null,
      odds,
      currentBall: this.resolveCurrentBall(data),
      staleness
    };
  }

  private buildInnings(data: LegacyCricketData): InningsScoreDto {
    const score = this.parseScoreParts(data.score);
    const runRateSource = data.crr != null ? data.crr : data.currentRunRate;
    const runRate = this.parseNumeric(runRateSource);

    return {
      teamCode: this.deriveTeamCode(data.batting_team || score.teamName),
      teamName: data.batting_team || score.teamName || 'Batting Team',
      runs: score.runs,
      wickets: score.wickets,
      overs: this.formatOversLabel(data.over, data.score),
      runRate,
      projected: null,
      resultSummary: data.final_result_text || null
    };
  }

  private buildBatters(data: LegacyCricketData): ParticipantSummaryDto[] {
    const entries = Array.isArray(data.batsman_data) ? data.batsman_data : [];
    const recentBalls = this.extractRecentBalls(data);

    const source = entries.slice(0, 2);
    while (source.length < 2) {
      source.push(null);
    }

    return source.map((batter, index) => ({
      id: batter && batter.name ? batter.name.replace(/\s+/g, '-').toLowerCase() : `batter-${index}`,
      name: batter && batter.name ? batter.name : 'Batter',
      role: 'UNKNOWN' as ParticipantSummaryDto['role'],
      runs: this.parseNumeric(batter && batter.score),
      balls: this.parseNumeric(batter && batter.ballsFaced),
      fours: this.parseNumeric(batter && batter.fours),
      sixes: this.parseNumeric(batter && batter.sixes),
      strikeRate: this.parseNumeric(batter && batter.strikeRate),
      isOnStrike: batter && batter.onStrike != null ? !!batter.onStrike : index === 0,
      recentBalls: index === 0 ? recentBalls : []
    }));
  }

  private buildBowler(data: LegacyCricketData): BowlerSummaryDto | null {
    const entry = Array.isArray(data.bowler_data) && data.bowler_data.length ? data.bowler_data[0] : null;
    if (!entry) {
      return null;
    }

    const runsConceded = this.parseNumeric(entry.score);
    const economyValue = this.parseNumeric(entry.economyRate);
    const hasEconomySource = entry.economyRate !== null && entry.economyRate !== undefined && entry.economyRate !== '';

    return {
      id: entry.name ? entry.name.replace(/\s+/g, '-').toLowerCase() : 'bowler',
      name: entry.name || 'Bowler',
      overs: this.formatBowlerOvers(entry.ballsBowled),
      maidens: null,
      runsConceded,
      wickets: this.parseNumeric(entry.wicketsTaken),
      economy: hasEconomySource ? economyValue : null,
      lastOverFigure: null
    };
  }

  private buildOdds(data: LegacyCricketData, timestampMs: number): OddsQuoteDto | null {
    const resolved = this.resolveOddsSource(data);
    if (!resolved) {
      return null;
    }

    const decimal = this.parseOddsValue(resolved.value);
    const provider = resolved.provider || null;
    const timestamp = new Date(timestampMs).toISOString();

    if (decimal == null) {
      return {
        label: resolved.label,
        value: null,
        format: 'DECIMAL',
        trend: 'UNKNOWN',
        provider,
        timestamp,
        jurisdictionEnabled: false
      };
    }

    return {
      label: resolved.label,
      value: decimal,
      format: 'DECIMAL',
      trend: 'UNKNOWN',
      provider,
      timestamp,
      jurisdictionEnabled: true
    };
  }

  private buildStaleness(timestampMs: number): StalenessSignalDto {
    const ageSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
    let tier: StalenessTier = 'FRESH';
    if (ageSeconds >= 120) {
      tier = 'ERROR';
    } else if (ageSeconds >= 30) {
      tier = 'WARNING';
    }

    return {
      tier,
      ageSeconds,
      message: tier === 'ERROR' ? 'Live data delayed' : null,
      nextRetryAllowed: null
    };
  }

  private deriveStatus(data: LegacyCricketData): LiveMatchSnapshotDto['status'] {
    if (data.final_result_text) {
      return 'COMPLETED';
    }
    return 'LIVE';
  }

  private parseScoreParts(raw: unknown): { runs: number; wickets: number; teamName?: string } {
    if (raw == null) {
      return { runs: 0, wickets: 0 };
    }

    const text = String(raw);
    const slashMatch = text.match(/(\d+)\s*[-\/]\s*(\d+)/);
    let runs = slashMatch ? parseInt(slashMatch[1], 10) : NaN;
    let wickets = slashMatch ? parseInt(slashMatch[2], 10) : NaN;

    if (!isFinite(runs) || !isFinite(wickets)) {
      const digits = text.match(/\d+/g) || [];
      runs = isFinite(runs) ? runs : (digits.length ? parseInt(digits[0], 10) : 0);
      wickets = isFinite(wickets) ? wickets : (digits.length > 1 ? parseInt(digits[1], 10) : 0);
    }

    const teamMatch = text.match(/^([A-Za-z&\-\.\s]+)/);
    const teamName = teamMatch ? teamMatch[1].trim() : undefined;

    return { runs, wickets, teamName };
  }

  private formatOversLabel(raw: unknown, fallbackField: unknown): string {
    if (raw !== null && raw !== undefined && raw !== '') {
      const numeric = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isFinite(numeric)) {
        const whole = Math.floor(numeric);
        const fraction = Math.round((numeric - whole) * 10);
        const clamped = Math.max(0, Math.min(5, fraction));
        return `${whole}.${clamped}`;
      }
    }

    if (fallbackField) {
      const match = String(fallbackField).match(/\(([^)]*?)ov\)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '0.0';
  }

  private formatBowlerOvers(raw: unknown): string {
    if (raw == null) {
      return '0.0';
    }

    if (typeof raw === 'number') {
      const whole = Math.floor(raw);
      const fraction = Math.round((raw - whole) * 10);
      return `${whole}.${Math.max(0, Math.min(5, fraction))}`;
    }

    const text = String(raw);
    const cleaned = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(cleaned)) {
      return '0.0';
    }

    const whole = Math.floor(cleaned);
    const fraction = Math.round((cleaned - whole) * 10);
    return `${whole}.${Math.max(0, Math.min(5, fraction))}`;
  }

  private parseNumeric(value: unknown): number {
    if (typeof value === 'number') {
      return isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.\-]+/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private deriveTeamCode(name?: string | null): string {
    if (!name) {
      return 'TEAM';
    }

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return 'TEAM';
    }

    const initials = parts.map(part => part.charAt(0).toUpperCase()).join('');
    if (initials.length >= 2 && initials.length <= 4) {
      return initials;
    }

    return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TEAM';
  }

  private extractRecentBalls(data: LegacyCricketData): string[] {
    const overs = Array.isArray(data.overs_data) ? data.overs_data : null;
    if (overs && overs.length) {
      const preferred = overs.find(item => (item.overNumber || '').toLowerCase().includes('this over'))
        || overs[overs.length - 1];
      if (preferred && Array.isArray(preferred.balls)) {
        const values = preferred.balls
          .map(ball => this.normalizeBallOutcome(ball))
          .filter((value): value is string => !!value);
        if (values.length) {
          return values.slice(-6);
        }
      }
    }

    if (data.runs_on_ball) {
      if (Array.isArray(data.runs_on_ball)) {
        return data.runs_on_ball
          .map(item => (item != null ? String(item).trim() : ''))
          .filter(token => token.length > 0)
          .slice(-6);
      }

      const tokens = String(data.runs_on_ball)
        .split(/[\s,]+/)
        .filter(token => token.length > 0);
      if (tokens.length) {
        return tokens.slice(-6);
      }
    }

    return [];
  }

  private normalizeBallOutcome(value: string | LegacyOverBall | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }

    const outcome = value.outcome != null
      ? value.outcome
      : (value.score != null ? value.score : value.runs);
    if (outcome == null) {
      return null;
    }

    const result = String(outcome).trim();
    return result.length ? result : null;
  }

  private resolveTimestamp(data: LegacyCricketData): number {
    const normalized = this.normalizeTimestamp(data.lastUpdated);
    return normalized != null ? normalized : Date.now();
  }

  private resolveOddsSource(data: LegacyCricketData): { value: unknown; label: string; provider?: string } | null {
    const teamOdds = data.team_odds || null;
    const matchOdds = Array.isArray(data.match_odds) ? (data.match_odds as LegacyMatchOdds[]) : null;

    if (teamOdds !== null && (teamOdds.backOdds != null || teamOdds.layOdds != null)) {
      return {
        value: teamOdds.backOdds != null ? teamOdds.backOdds : teamOdds.layOdds,
        label: data.fav_team ? `${data.fav_team} odds` : 'Win Odds'
      };
    }

    if (matchOdds !== null && matchOdds.length > 0) {
      const primary = matchOdds.find(entry => entry != null && entry.odds != null) || matchOdds[0];
      if (primary != null && primary.odds != null) {
        return {
          value: primary.odds.backOdds != null ? primary.odds.backOdds : primary.odds.layOdds,
          label: primary.teamName ? `${primary.teamName} odds` : 'Win Odds'
        };
      }
    }

    return null;
  }

  private parseOddsValue(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'number') {
      return isFinite(value) ? value : null;
    }

    const text = String(value);
    const match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }

    const parsed = parseFloat(match[0]);
    return isNaN(parsed) ? null : parsed;
  }

  private resolveCurrentBall(data: LegacyCricketData): string | number | null {
    if (data.current_ball !== undefined && data.current_ball !== null) {
      if (typeof data.current_ball === 'number') {
        return isFinite(data.current_ball) ? data.current_ball : null;
      }

      const trimmed = String(data.current_ball).trim();
      if (trimmed && trimmed.toLowerCase() !== 'null') {
        return trimmed;
      }
    }

    return null;
  }

  private normalizeLegacyPayload(payload: any, markFresh: boolean): Partial<LegacyCricketData> {
    const patch: Partial<LegacyCricketData> = {};

    const mappings: Array<[keyof LegacyCricketData, string]> = [
      ['score', 'score'],
      ['over', 'over'],
      ['crr', 'crr'],
      ['currentRunRate', 'currentRunRate'],
      ['requiredRunRate', 'requiredRunRate'],
      ['fav_team', 'fav_team'],
      ['batting_team', 'batting_team'],
      ['final_result_text', 'final_result_text'],
      ['team_odds', 'team_odds'],
      ['match_odds', 'match_odds'],
      ['batsman_data', 'batsman_data'],
      ['bowler_data', 'bowler_data'],
      ['session_odds', 'session_odds'],
      ['overs_data', 'overs_data'],
      ['runs_on_ball', 'runs_on_ball'],
      ['current_ball', 'current_ball'],
      ['toss_won_country', 'toss_won_country'],
      ['updatedTimeStamp', 'updatedTimeStamp'],
      ['lastUpdated', 'lastUpdated']
    ];

    mappings.forEach(([target, source]) => {
      if (payload[source] !== undefined) {
        (patch as any)[target] = payload[source];
      }
    });

    if (payload.currentBall !== undefined) {
      patch.current_ball = payload.currentBall;
    }

    const timestampSource = patch.lastUpdated != null
      ? patch.lastUpdated
      : (patch.updatedTimeStamp != null
        ? patch.updatedTimeStamp
        : (payload.last_updated != null ? payload.last_updated : payload.updated_time_stamp));

    const timestamp = this.normalizeTimestamp(timestampSource);

    if (timestamp) {
      patch.lastUpdated = timestamp;
    } else if (markFresh) {
      patch.lastUpdated = Date.now();
    }

    if (patch.updatedTimeStamp !== undefined) {
      delete patch.updatedTimeStamp;
    }

    return patch;
  }

  private normalizeTimestamp(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'number') {
      if (!isFinite(value) || value <= 0) {
        return null;
      }
      return value < 10_000_000_000 ? value * 1000 : value;
    }

    if (typeof value === 'string') {
      const numeric = Number(value);
      if (!isNaN(numeric)) {
        return this.normalizeTimestamp(numeric);
      }

      const parsed = Date.parse(value);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private safeParse(body: any): any {
    if (body == null) {
      return null;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (error) {
        console.warn('[LiveHeroStateService] Failed to parse websocket payload', error);
        return null;
      }
    }

    return body;
  }
}
