import { Injectable } from '@angular/core';
import {
  BowlerSummaryDto,
  ChaseContextDto,
  LiveHeroBatterView,
  LiveHeroBowlerView,
  LiveHeroChaseSummary,
  LiveHeroConfig,
  LiveHeroOddsView,
  LiveHeroQuickLink,
  LiveHeroScoreSummary,
  LiveHeroStalenessView,
  LiveHeroViewModel,
  LiveMatchSnapshotDto,
  OddsQuoteDto,
  ParticipantSummaryDto,
  PartnershipSummaryDto,
  ScorecardBatterDto,
  ScorecardBowlerDto,
  ScorecardSnapshotDto,
  StalenessSignalDto
} from './live-hero.models';

@Injectable({ providedIn: 'root' })
export class LiveHeroDataAdapter {
  private readonly defaultQuickLinks: LiveHeroQuickLink[] = [
    { id: 'commentary', label: 'Commentary', target: '#commentary' },
    { id: 'scorecard', label: 'Scorecard', target: '#scorecard' },
    { id: 'info', label: 'Match Info', target: '#match-info' }
  ];

  mapSnapshot(
    snapshot: LiveMatchSnapshotDto,
    options: { scorecard?: ScorecardSnapshotDto | null; config?: LiveHeroConfig; lastValidStriker?: LiveHeroBatterView | null } = {}
  ): LiveHeroViewModel {
    const scorecardData = options.scorecard || null;
    const config = options.config;

    const score = this.buildScoreSummary(snapshot);
    const chase = this.buildChaseSummary(snapshot.chaseContext != null ? snapshot.chaseContext : null);
    const snapshotBatters = snapshot.batters != null ? snapshot.batters : null;
    const scorecardBatters = scorecardData && scorecardData.batters ? scorecardData.batters : [];
    const batters = this.buildBatters(snapshotBatters, scorecardBatters);
    const snapshotBowler = snapshot.bowler != null ? snapshot.bowler : null;
    const scorecardBowlers = scorecardData && scorecardData.bowlers ? scorecardData.bowlers : [];
    const bowler = this.buildBowler(snapshotBowler, scorecardBowlers);
    const snapshotPartnership = snapshot.partnership != null ? snapshot.partnership : null;
    const scorecardPartnership = scorecardData && scorecardData.partnership ? scorecardData.partnership : null;
    const partnershipLabel = this.buildPartnershipLabel(snapshotPartnership || scorecardPartnership || null);
    const odds = this.buildOdds(snapshot.odds != null ? snapshot.odds : null);
    const staleness = this.buildStaleness(snapshot.staleness);
    const quickLinks = (config && config.quickLinks && config.quickLinks.length)
      ? config.quickLinks
      : this.defaultQuickLinks;

    // Find the current striker (batsman who is on strike)
    const currentStriker = batters.find(batter => batter.isOnStrike && 
      !batter.name.toLowerCase().includes('unknown') && 
      !batter.name.toLowerCase().includes('batter')) || null;

    // Use last valid striker if current one is not available
    const lastValidStriker = options.lastValidStriker || null;
    const displayStriker = currentStriker || lastValidStriker;

    return {
      matchId: snapshot.id,
      status: snapshot.status,
      timestamp: snapshot.timestamp,
      score,
      chase,
      batters,
      bowler,
      partnershipLabel,
      odds,
      staleness,
      quickLinks,
      currentStriker: displayStriker,
      lastValidStriker: currentStriker || lastValidStriker
    };
  }

  private buildScoreSummary(snapshot: LiveMatchSnapshotDto): LiveHeroScoreSummary {
    const innings = snapshot.innings;
    const runRateLabel = `CRR ${this.toRate(innings.runRate)}`;
    const projectedLabel = innings.projected != null ? `Proj ${Math.round(innings.projected)}` : undefined;
    const currentBall = this.normalizeCurrentBall(snapshot.currentBall);

    return {
      teamCode: innings.teamCode,
      teamName: innings.teamName,
      runs: innings.runs,
      wickets: innings.wickets,
      overs: innings.overs,
      runRateLabel,
      projectedLabel,
      status: snapshot.status,
      resultSummary: innings.resultSummary != null ? innings.resultSummary : null,
      currentBall
    };
  }

  private buildChaseSummary(context: ChaseContextDto | null): LiveHeroChaseSummary {
    if (!context) {
      return { isChasing: false };
    }

    return {
      isChasing: true,
      target: context.target,
      runsRemaining: Math.max(context.runsRemaining, 0),
      ballsRemaining: Math.max(context.ballsRemaining, 0),
      requiredRunRateLabel: `RRR ${this.toRate(context.requiredRunRate)}`,
      winProbabilityLabel: context.winProbability != null ? `${context.winProbability.toFixed(0)}%` : undefined
    };
  }

  private buildBatters(
    snapshotBatters: ParticipantSummaryDto[] | null,
    fallbackBatters: ScorecardBatterDto[]
  ): LiveHeroBatterView[] {
    const fallbackCandidates: ParticipantSummaryDto[] = fallbackBatters.slice(0, 2).map((item, index) => ({
      id: item.playerId,
      name: item.name,
      role: 'UNKNOWN' as ParticipantSummaryDto['role'],
      runs: item.runs,
      balls: item.balls,
      fours: item.fours,
      sixes: item.sixes,
      strikeRate: item.strikeRate,
      isOnStrike: index === 0,
      recentBalls: [] as string[]
    }));

    const candidates: ParticipantSummaryDto[] = (snapshotBatters && snapshotBatters.length)
      ? snapshotBatters
      : fallbackCandidates;

    return candidates.slice(0, 2).map(batter => ({
      id: batter.id,
      name: batter.name || 'Batter',
      role: batter.role,
      runs: batter.runs != null ? batter.runs : 0,
      balls: batter.balls != null ? batter.balls : 0,
      fours: batter.fours != null ? batter.fours : 0,
      sixes: batter.sixes != null ? batter.sixes : 0,
      strikeRateLabel: this.toRate(batter.strikeRate != null ? batter.strikeRate : 0),
      isOnStrike: !!batter.isOnStrike,
      recentBalls: batter.recentBalls ? batter.recentBalls.slice(-6) : []
    }));
  }

  private buildBowler(
    bowler: BowlerSummaryDto | null,
    fallbackBowlers: ScorecardBowlerDto[]
  ): LiveHeroBowlerView | null {
    const source = bowler || fallbackBowlers[0];
    if (!source) {
      return null;
    }

    if (this.isLiveBowler(source)) {
      return {
        id: source.id,
        name: source.name || 'Bowler',
        overs: source.overs,
        maidens: source.maidens != null ? source.maidens : null,
        runs: source.runsConceded,
        wickets: source.wickets,
        economyLabel: `ECO ${this.toRate(source.economy != null ? source.economy : this.deriveEconomy(source))}`,
        lastOverFigure: source.lastOverFigure != null ? source.lastOverFigure : null
      };
    }

    return {
      id: source.playerId,
      name: source.name || 'Bowler',
      overs: source.overs,
      maidens: source.maidens != null ? source.maidens : null,
      runs: source.runs,
      wickets: source.wickets,
      economyLabel: `ECO ${this.toRate(source.economy)}`,
      lastOverFigure: source.lastOverFigure != null ? source.lastOverFigure : null
    };
  }

  private buildPartnershipLabel(partnership: PartnershipSummaryDto | null | undefined): string | null {
    if (!partnership) {
      return null;
    }

    const parts: string[] = [];
    parts.push(`${partnership.runs} (${partnership.balls})`);
    if (partnership.description) {
      parts.push(partnership.description);
    }
    return parts.join(' · ');
  }

  private buildOdds(odds: OddsQuoteDto | null): LiveHeroOddsView | null {
    if (!odds) {
      return null;
    }

    if (!odds.jurisdictionEnabled) {
      return {
        label: odds.label || 'Win Odds',
        valueLabel: 'Odds unavailable',
        trend: 'UNKNOWN',
        provider: odds.provider != null ? odds.provider : null,
        timestampLabel: odds.timestamp != null ? odds.timestamp : null,
        jurisdictionEnabled: false
      };
    }

    return {
      label: odds.label || 'Win Odds',
      valueLabel: this.formatOddsValue(odds),
      trend: odds.trend != null ? odds.trend : 'UNKNOWN',
      provider: odds.provider != null ? odds.provider : null,
      timestampLabel: odds.timestamp != null ? odds.timestamp : null,
      jurisdictionEnabled: true
    };
  }

  private buildStaleness(signal: StalenessSignalDto): LiveHeroStalenessView {
    return {
      tier: signal.tier,
      ageSeconds: signal.ageSeconds,
      message: signal.message != null ? signal.message : null,
      nextRetryAllowed: signal.nextRetryAllowed != null ? signal.nextRetryAllowed : null
    };
  }

  private formatOddsValue(odds: OddsQuoteDto): string {
    if (odds.value == null) {
      return 'N/A';
    }

    switch (odds.format) {
      case 'PERCENT':
        return `${odds.value.toFixed(0)}%`;
      case 'DECIMAL':
        return odds.value.toFixed(2);
      case 'FRACTIONAL':
        return odds.value.toFixed(2); // Placeholder until fractional formatting required
      default:
        return String(odds.value);
    }
  }

  private toRate(value: number): string {
    if (!isFinite(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  }

  private deriveEconomy(bowler: BowlerSummaryDto | ScorecardBowlerDto): number {
    const overs = typeof bowler.overs === 'string' ? this.oversToFloat(bowler.overs) : bowler.overs;
    if (!overs) {
      return 0;
    }
    const runs = this.isLiveBowler(bowler) ? bowler.runsConceded : bowler.runs;
    return runs / overs;
  }

  private oversToFloat(overs: string): number {
    const [whole, fraction] = overs.split('.');
    const balls = parseInt(fraction || '0', 10);
    return parseInt(whole, 10) + balls / 6;
  }

  private isLiveBowler(value: BowlerSummaryDto | ScorecardBowlerDto): value is BowlerSummaryDto {
    return (value as BowlerSummaryDto).runsConceded !== undefined;
  }

  private normalizeCurrentBall(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const raw = typeof value === 'number' ? value.toString() : String(value).trim();
    if (!raw || raw.toLowerCase() === 'null') {
      return null;
    }

    // Handle special cases
    if (raw === 'Ball') {
      return 'Ball Start';
    }
    if (raw === 'Stumps') {
      return 'Stumps';
    }

    return raw;
  }
}
