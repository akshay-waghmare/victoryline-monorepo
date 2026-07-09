import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../cricket-odds/analytics.service';
import { MetaTagsService } from '../../seo/meta-tags.service';
import { StructuredDataService } from '../../seo/structured-data.service';
import { MatchSeoService } from '../../seo/match-seo.service';
import { MatchIntelligenceDataService, MatchIntelligenceSnapshot } from './match-intelligence-data.service';

const MATCH_INTELLIGENCE_STATE_PREFIX = 'match_intelligence_snapshot_';

interface MatchInsightModule {
  key: 'state' | 'explanation' | 'policy' | 'turning-point' | 'reasons';
  kicker: string;
  title: string;
  body: string;
  bullets?: string[];
}

interface MatchUtilityCard {
  key: 'run-rate' | 'par-score' | 'watchpoint';
  kicker: string;
  title: string;
  body: string;
}

interface MatchIntelligenceViewModel {
  slug: string;
  canonicalMatchPath: string;
  intelligencePath: string;
  title: string;
  description: string;
  h1: string;
  seriesLabel: string;
  teamsLabel: string;
  lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown';
  statusLabel: string;
  freshnessLabel: string;
  freshnessState: 'fresh' | 'stale' | 'unavailable';
  probabilityLabel: string | null;
  probabilityTeamLabel: string | null;
  probabilityCardBody: string;
  whatChangedBody: string;
  whyChangedBody: string;
  whatMattersNextBody: string;
  supportLabel: string;
  capabilityTier: 'free' | 'registered' | 'premium';
  modelUnavailable: boolean;
  stateLabel: string;
  indexingPolicy: string;
  insightModules: MatchInsightModule[];
  utilityCards: MatchUtilityCard[];
}

@Component({
  selector: 'app-match-intelligence',
  templateUrl: './match-intelligence.component.html',
  styleUrls: ['./match-intelligence.component.css']
})
export class MatchIntelligenceComponent implements OnInit, OnDestroy {
  slug = '';
  viewModel: MatchIntelligenceViewModel | null = null;
  isLoading = true;

  private subscriptions = new Subscription();
  private snapshot: MatchIntelligenceSnapshot | null = null;
  private trackedEvents: { [key: string]: boolean } = {};

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private matchIntelligenceDataService: MatchIntelligenceDataService,
    private analyticsService: AnalyticsService,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService,
    private matchSeoService: MatchSeoService,
    private transferState: TransferState
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        this.slug = (params.get('slug') || '').trim();
        this.loadSurface();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.structuredDataService.clearPageSchemas();
  }

  getCanonicalMatchHref(): string {
    return this.viewModel ? this.viewModel.canonicalMatchPath : '/matches';
  }

  onInsightModuleToggle(moduleKey: string, open: boolean): void {
    if (!open || !this.viewModel) {
      return;
    }

    this.trackOnce('explanation_expand_' + moduleKey, 'explanation_expand', {
      match_path: this.viewModel.canonicalMatchPath,
      intelligence_path: this.viewModel.intelligencePath,
      lifecycle: this.viewModel.lifecycle,
      interaction_type: 'expand_module',
      module: moduleKey,
      surface: 'match-intelligence'
    });

    this.trackOnce('prediction_interaction_' + moduleKey, 'prediction_interaction', {
      match_path: this.viewModel.canonicalMatchPath,
      intelligence_path: this.viewModel.intelligencePath,
      lifecycle: this.viewModel.lifecycle,
      interaction_type: 'expand_module',
      module: moduleKey,
      surface: 'match-intelligence'
    });
  }

  onUtilityCardClick(cardKey: string): void {
    if (!this.viewModel) {
      return;
    }

    this.trackOnce('prediction_interaction_utility_' + cardKey, 'prediction_interaction', {
      match_path: this.viewModel.canonicalMatchPath,
      intelligence_path: this.viewModel.intelligencePath,
      lifecycle: this.viewModel.lifecycle,
      interaction_type: 'view_utility',
      module: cardKey,
      surface: 'match-intelligence'
    });
  }

  onBackToMatchClick(): void {
    if (!this.viewModel) {
      return;
    }

    this.trackOnce('prediction_interaction_back_to_match', 'prediction_interaction', {
      match_path: this.viewModel.canonicalMatchPath,
      intelligence_path: this.viewModel.intelligencePath,
      lifecycle: this.viewModel.lifecycle,
      interaction_type: 'return_to_match',
      module: 'navigation',
      surface: 'match-intelligence'
    });
  }

  private loadSurface(): void {
    this.isLoading = true;
    this.snapshot = null;
    this.viewModel = null;
    this.trackedEvents = {};

    if (!this.slug) {
      this.isLoading = false;
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      var stateKey = this.getTransferStateKey(this.slug);
      var ssrSnapshot = this.transferState.get<MatchIntelligenceSnapshot | null>(stateKey, null);
      if (ssrSnapshot) {
        this.snapshot = ssrSnapshot;
        this.rebuildViewModel();
        this.transferState.remove(stateKey);
      }
    }

    this.subscriptions.add(
      this.matchIntelligenceDataService.loadSnapshot(this.slug).subscribe((snapshot) => {
        this.snapshot = snapshot;
        if (!isPlatformBrowser(this.platformId)) {
          this.transferState.set(this.getTransferStateKey(this.slug), snapshot);
        }
        this.rebuildViewModel();
      })
    );
  }

  private rebuildViewModel(): void {
    var snapshot = this.snapshot;
    var seo = this.matchSeoService.build({
      routeSlug: this.slug,
      requestedPath: '/cric-live/' + this.slug,
      matchInfo: snapshot ? snapshot.matchInfo : null,
      currentMatch: snapshot ? snapshot.currentMatch : null
    });

    var lifecycle = snapshot ? snapshot.lifecycle : 'unknown';
    var intelligencePath = '/match-intelligence/' + this.slug;
    var canonicalMatchPath = seo.canonicalPath || ('/cric-live/' + this.slug);
    var probability = this.resolveWinProbability();
    var probabilityTeam = this.resolveProbabilityTeam();
    var modelUnavailable = probability === null;
    var freshnessState = snapshot ? snapshot.freshnessState : 'unavailable';
    var title = this.buildTitle(seo.teams, lifecycle, seo.shortTeams);
    var description = this.buildDescription(seo.teams, seo.series, lifecycle, modelUnavailable);
    var h1 = this.buildH1(seo.teams, lifecycle);

    this.viewModel = {
      slug: this.slug,
      canonicalMatchPath: canonicalMatchPath,
      intelligencePath: intelligencePath,
      title: title,
      description: description,
      h1: h1,
      seriesLabel: seo.series || seo.breadcrumbSeries || 'Cricket Series',
      teamsLabel: seo.teams,
      lifecycle: lifecycle,
      statusLabel: this.resolveStatusLabel(),
      freshnessLabel: this.resolveFreshnessLabel(),
      freshnessState: freshnessState,
      probabilityLabel: probability !== null ? probability.toFixed(0) + '%' : null,
      probabilityTeamLabel: probabilityTeam,
      probabilityCardBody: this.buildProbabilityCardBody(lifecycle, probabilityTeam),
      whatChangedBody: this.buildWhatChangedBody(lifecycle, probabilityTeam),
      whyChangedBody: this.buildWhyChangedBody(lifecycle, probabilityTeam),
      whatMattersNextBody: this.buildWhatMattersNextBody(lifecycle),
      supportLabel: this.buildSupportLabel(lifecycle),
      capabilityTier: 'free',
      modelUnavailable: modelUnavailable,
      stateLabel: this.resolveStateLabel(lifecycle, freshnessState, modelUnavailable),
      indexingPolicy: 'This route stays noindex until the explanation depth, freshness proof, and distinct search job clear the Spec 044 release gate.',
      insightModules: this.buildInsightModules(lifecycle, probabilityTeam, seo.teams, seo.series),
      utilityCards: this.buildUtilityCards(lifecycle)
    };

    this.applyMetaAndSchemas();
    this.trackViewEvents();
    this.isLoading = false;
  }

  private applyMetaAndSchemas(): void {
    if (!this.viewModel) {
      return;
    }

    var canonicalUrl = 'https://www.crickzen.com' + this.viewModel.intelligencePath;
    this.metaTagsService.setPageMeta(this.viewModel.intelligencePath, {
      title: this.viewModel.title,
      description: this.viewModel.description,
      canonicalUrl: canonicalUrl,
      robots: 'noindex,follow',
      og: {
        title: this.viewModel.title,
        description: this.viewModel.description,
        url: canonicalUrl
      }
    });

    this.structuredDataService.setPageSchemas([
      this.structuredDataService.breadcrumbs([
        { name: 'Cricket', url: 'https://www.crickzen.com/matches' },
        { name: this.viewModel.seriesLabel, url: 'https://www.crickzen.com/series' },
        { name: this.viewModel.teamsLabel + ' Match Intelligence', url: canonicalUrl }
      ]),
      this.structuredDataService.page({
        name: this.viewModel.h1,
        description: this.viewModel.description,
        url: canonicalUrl
      })
    ]);
  }

  private trackViewEvents(): void {
    if (!this.viewModel) {
      return;
    }

    this.trackOnce('prediction_view', 'prediction_view', {
      match_path: this.viewModel.canonicalMatchPath,
      intelligence_path: this.viewModel.intelligencePath,
      lifecycle: this.viewModel.lifecycle,
      capability_tier: this.viewModel.capabilityTier,
      model_available: !this.viewModel.modelUnavailable,
      freshness_state: this.viewModel.freshnessState,
      surface: 'match-intelligence'
    });

    if (this.viewModel.modelUnavailable) {
      this.trackOnce('model_unavailable', 'model_unavailable', {
        match_path: this.viewModel.canonicalMatchPath,
        intelligence_path: this.viewModel.intelligencePath,
        lifecycle: this.viewModel.lifecycle,
        freshness_state: this.viewModel.freshnessState,
        surface: 'match-intelligence'
      });
    }
  }

  private trackOnce(key: string, eventName: string, properties: Record<string, any>): void {
    if (this.trackedEvents[key]) {
      return;
    }

    this.trackedEvents[key] = true;
    this.analyticsService.trackIntelligenceEvent(eventName, properties);
  }

  private resolveStatusLabel(): string {
    if (this.snapshot && this.snapshot.matchInfo && (this.snapshot.matchInfo.match_status || this.snapshot.matchInfo.status)) {
      return String(this.snapshot.matchInfo.match_status || this.snapshot.matchInfo.status).replace(/_/g, ' ');
    }
    return this.snapshot && this.snapshot.currentMatch ? this.snapshot.currentMatch.displayStatus : 'Match status unavailable';
  }

  private resolveFreshnessLabel(): string {
    if (this.snapshot && this.snapshot.freshnessState === 'fresh') {
      return 'Model freshness: updated from current match feed';
    }
    if (this.snapshot && this.snapshot.freshnessState === 'stale') {
      return 'Model freshness: feed available but freshness timestamp missing';
    }
    return 'Model freshness: unavailable';
  }

  private resolveWinProbability(): number | null {
    var publicProbability = this.snapshot && this.snapshot.matchData ? this.snapshot.matchData.win_probability_pct : null;
    if (publicProbability !== undefined && publicProbability !== null) {
      var normalizedPublic = parseFloat(String(publicProbability));
      if (isFinite(normalizedPublic) && normalizedPublic >= 0 && normalizedPublic <= 100) {
        return normalizedPublic;
      }
    }

    var odds = this.snapshot && this.snapshot.matchData && this.snapshot.matchData.team_odds;
    if (!odds || odds.backOdds === undefined || odds.backOdds === null) {
      return null;
    }

    var value = parseFloat(String(odds.backOdds));
    if (!isFinite(value) || value <= 0) {
      return null;
    }

    return Math.max(0, Math.min(100, 100 / ((value + 100) / 100)));
  }

  private resolveProbabilityTeam(): string | null {
    if (this.snapshot && this.snapshot.matchData && this.snapshot.matchData.team_odds && this.snapshot.matchData.team_odds.favTeam) {
      return String(this.snapshot.matchData.team_odds.favTeam).trim();
    }
    return null;
  }

  private resolveStateLabel(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', freshnessState: 'fresh' | 'stale' | 'unavailable', modelUnavailable: boolean): string {
    var statusLabel = this.resolveStatusLabel().toLowerCase();
    if (statusLabel.indexOf('postpon') !== -1) {
      return 'Postponed';
    }
    if (lifecycle === 'completed') {
      return 'Completed';
    }
    if (modelUnavailable && freshnessState === 'unavailable') {
      return 'Model unavailable';
    }
    if (freshnessState === 'stale') {
      return 'Stale model data';
    }
    if (lifecycle === 'upcoming') {
      return 'Upcoming';
    }
    if (lifecycle === 'live') {
      return 'Live';
    }
    return 'Loading match state';
  }

  private buildProbabilityCardBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', probabilityTeam: string | null): string {
    var insight = this.getPublicInsight();
    if (insight) {
      return insight;
    }

    if (lifecycle === 'upcoming') {
      return probabilityTeam
        ? probabilityTeam + ' currently leads the available model direction, but the match still depends on toss, venue conditions, and playing-XI confirmation.'
        : 'This surface will explain the current model direction, match setup, and what matters next once prediction signals are available.';
    }

    if (lifecycle === 'completed') {
      return 'This completed-state intelligence surface is intended to explain where the match swung, how the pressure changed, and which phase mattered most to the final result.';
    }

    return probabilityTeam
      ? probabilityTeam + ' is currently ahead on the available win-probability signal. The goal of this route is to connect that lean to visible score pressure and public-safe reasons.'
      : 'This surface is ready for live explanation, but the current sample does not yet have enough model data to publish a trustworthy probability direction.';
  }

  private buildWhatChangedBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', probabilityTeam: string | null): string {
    var swing = this.getLatestSwingLabel();
    var commentary = this.getLatestCommentaryText();
    var projection = this.getProjectionLabel();

    if (lifecycle === 'upcoming') {
      if (projection) {
        return 'The current preview still sits in the setup phase, with ' + projection + ' as the clearest early signal before toss and XI confirmation.';
      }
      return probabilityTeam
        ? probabilityTeam + ' holds the early lean, but the real match story has not started yet.'
        : 'No decisive public match shift is available yet because the pre-match setup is still forming.';
    }

    if (lifecycle === 'completed') {
      if (swing) {
        return swing + ' became the clearest public signal for where control moved in the final result.';
      }
      return 'The result is locked in, so the important job is identifying the decisive over, wicket phase, or chase-pressure swing that actually flipped control.';
    }

    if (swing) {
      return swing;
    }
    if (commentary) {
      return 'The latest public update points to this shift: ' + commentary;
    }
    if (probabilityTeam) {
      return probabilityTeam + ' is ahead on the public signal, but the feed still needs a clearer event-level swing summary.';
    }
    return 'The public feed does not yet contain a trustworthy event-level change summary for this match window.';
  }

  private buildWhyChangedBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', probabilityTeam: string | null): string {
    var reasons = this.getReasons();
    var pressureZone = this.getPressureZoneLabel();
    var venueLabel = this.getVenueLabel();

    if (reasons.length) {
      return reasons[0];
    }

    if (lifecycle === 'upcoming') {
      if (venueLabel) {
        return 'The pre-match lean matters because the venue profile currently reads as ' + venueLabel + ', so toss and innings shape can change the story quickly.';
      }
      return probabilityTeam
        ? 'The current lean is still conditional because toss, playing XI balance, and venue behavior have not fully resolved yet.'
        : 'Without a usable model signal, the honest explanation is that the preview still lacks enough public inputs.';
    }

    if (lifecycle === 'completed') {
      if (pressureZone) {
        return 'The result likely settled when the match moved into a ' + pressureZone + ' pressure state and the losing side could not reverse it.';
      }
      return 'The completed explanation should focus on the phase where wickets, pace of scoring, or chase pressure stopped the recovery path.';
    }

    if (pressureZone) {
      return 'The current public read points to a ' + pressureZone + ' pressure phase, which usually explains why win probability starts to move faster.';
    }
    if (venueLabel) {
      return 'Venue context still matters here because this match is behaving like a ' + venueLabel + ' surface rather than a neutral one.';
    }
    return probabilityTeam
      ? 'The visible score pressure and innings state support the current lean, even though the explanation feed is still lighter than the final contract target.'
      : 'No trustworthy model direction is available, so this route stays descriptive instead of pretending certainty.';
  }

  private buildWhatMattersNextBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    var sessionSignal = this.getSessionSignalLabel();
    var target = this.getTargetLabel();

    if (lifecycle === 'upcoming') {
      return 'Watch toss, lineup confirmation, and the first innings context before the model-backed prediction narrative is expanded.';
    }

    if (lifecycle === 'completed') {
      return 'Use the scorecard and commentary archive to verify where the match flipped, then move to the next eligible match intelligence page instead of stopping at the result.';
    }

    if (sessionSignal) {
      return 'Watch the next over band and the session line around ' + sessionSignal + ', because that is the clearest public threshold for the next probability swing.';
    }
    if (target) {
      return 'Watch whether the chase stays in touch with ' + target + ', because the next few overs will decide whether pressure keeps building or releases.';
    }
    return 'Use this route for deeper probability and match-state interpretation while keeping the canonical match page as the score-first live entry point.';
  }

  private buildSupportLabel(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    if (lifecycle === 'upcoming') {
      return 'This prediction shell is strongest once toss, venue read, and playing XI are confirmed.';
    }
    if (lifecycle === 'completed') {
      return 'This completed shell should mature into a true turning-point explainer with innings swings and pressure-change context.';
    }
    return 'This live shell is strongest when probability, commentary, and score pressure all agree on the same match story.';
  }

  private buildInsightModules(
    lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown',
    probabilityTeam: string | null,
    teams: string,
    series: string
  ): MatchInsightModule[] {
    var modules: MatchInsightModule[] = [
      {
        key: 'state',
        kicker: 'Match state',
        title: this.buildStateModuleTitle(lifecycle),
        body: this.buildStateModuleBody(lifecycle, teams, series)
      },
      {
        key: 'explanation',
        kicker: 'Why the model leans here',
        title: this.buildExplanationModuleTitle(probabilityTeam),
        body: this.buildExplanationModuleBody(lifecycle, probabilityTeam),
        bullets: this.getReasons()
      },
      {
        key: 'policy',
        kicker: 'Release policy',
        title: 'Why this route is still held out of indexing',
        body: 'Spec 044 keeps this surface out of search until it offers unique explanation value beyond the canonical match page, proves stable SSR metadata on direct refresh, and keeps freshness honest.'
      }
    ];

    if (lifecycle === 'completed') {
      modules.splice(2, 0, {
        key: 'turning-point',
        kicker: 'Turning point',
        title: this.buildTurningPointTitle(),
        body: this.buildTurningPointBody(),
        bullets: this.getLastSwings()
      });
    }

    if (lifecycle !== 'completed' && this.getReasons().length) {
      modules.splice(2, 0, {
        key: 'reasons',
        kicker: 'Key reasons',
        title: 'Why this public read currently makes sense',
        body: 'These are the clearest public-safe reasons available from the current feed and explanation layer.',
        bullets: this.getReasons()
      });
    }

    return modules;
  }

  private buildUtilityCards(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): MatchUtilityCard[] {
    if (lifecycle === 'completed') {
      return [
        {
          key: 'watchpoint',
          kicker: 'Next path',
          title: 'Completed matches should send you somewhere useful',
          body: 'The next product step here is a proper turning-point recap plus links into the next live or upcoming intelligence surface.'
        }
      ];
    }

    return [
      {
        key: 'run-rate',
        kicker: 'Pressure read',
        title: 'Run-rate pressure',
        body: this.buildRunRatePressureBody()
      },
      {
        key: 'par-score',
        kicker: 'Par score',
        title: 'Par-score checkpoint',
        body: this.buildParScoreBody(lifecycle)
      },
      {
        key: 'watchpoint',
        kicker: 'Watch next',
        title: 'Next-phase watchpoint',
        body: this.buildWatchpointBody(lifecycle)
      }
    ];
  }

  private buildStateModuleTitle(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    if (lifecycle === 'upcoming') {
      return 'Pre-match context is still forming';
    }
    if (lifecycle === 'completed') {
      return 'The result is settled, but the explanation layer is not finished yet';
    }
    return 'The live state should lead the intelligence story';
  }

  private buildStateModuleBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', teams: string, series: string): string {
    var seriesText = series ? (' in ' + series) : '';
    if (lifecycle === 'upcoming') {
      return teams + seriesText + ' is still in the preview window, so toss, venue cues, and lineup certainty matter more than any early model direction.';
    }
    if (lifecycle === 'completed') {
      return teams + seriesText + ' has moved into the archive state, so this route now needs turning-point review, pressure swings, and final-phase explanation rather than live monitoring language.';
    }
    return teams + seriesText + ' is in an active match window. The best version of this route should connect live score pressure, wickets, over phase, and commentary-backed momentum into one readable view.';
  }

  private buildExplanationModuleTitle(probabilityTeam: string | null): string {
    return probabilityTeam
      ? probabilityTeam + ' currently leads the public signal'
      : 'The current feed does not support a trustworthy lean';
  }

  private buildExplanationModuleBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', probabilityTeam: string | null): string {
    var sessionSignalsAvailable = !!(this.snapshot && this.snapshot.matchData && this.snapshot.matchData.session_odds);
    var commentarySignalsAvailable = !!this.getLatestCommentaryText();

    if (!probabilityTeam) {
      return 'The route intentionally refuses to fake certainty. Until the feed produces a usable team-odds signal, the honest job is to explain what is missing and push users back to the score-first canonical page.';
    }

    if (lifecycle === 'upcoming') {
      return probabilityTeam + ' is the current favorite in the available public model, but this remains conditional. Toss outcome, confirmed XI balance, and venue behavior can still move the pre-match story before the first ball.';
    }

    if (lifecycle === 'completed') {
      return probabilityTeam + ' finished as the strongest side in the public signal, but the completed-state product still needs proper swing explanation: where the pressure flipped, whether the model was early or late, and which phase actually settled the result.';
    }

    return probabilityTeam
      + ' leads the public probability signal right now.'
      + (sessionSignalsAvailable ? ' Session odds are also available, which means this route can evolve into a more specific over-phase explanation.' : ' Session odds are not visible here yet, so the explanation still leans on broad match direction.')
      + (commentarySignalsAvailable ? ' Commentary is present, which gives us the raw material for a real "what changed" layer instead of static copy.' : ' Commentary-backed reasoning is still thin, so the story remains a first-step shell.');
  }

  private buildTurningPointTitle(): string {
    var turningPoint = this.getTurningPointLabel();
    return turningPoint || 'The decisive shift still needs to be made explicit';
  }

  private buildTurningPointBody(): string {
    var turningPoint = this.getTurningPointLabel();
    var swing = this.getLatestSwingLabel();
    if (turningPoint && swing) {
      return turningPoint + '. ' + swing;
    }
    if (turningPoint) {
      return turningPoint + '. This route should connect that phase to the result with a clear before-and-after explanation.';
    }
    return 'The completed-state intelligence product still needs a contract-backed turning-point summary instead of a generic result recap.';
  }

  private buildRunRatePressureBody(): string {
    var target = this.getTargetNumber();
    var score = this.getScoreNumbers();
    var overs = this.getOversNumber();
    if (target !== null && score.runs !== null && overs !== null && overs > 0 && overs < 20) {
      var remainingRuns = target - score.runs;
      var remainingOvers = 20 - overs;
      if (remainingRuns > 0 && remainingOvers > 0) {
        var requiredRate = remainingRuns / remainingOvers;
        return 'Required rate is about ' + requiredRate.toFixed(1) + ' per over from here, which is the cleanest public pressure signal available right now.';
      }
    }
    return 'This module should compare current tempo with the chase requirement once target and over state are cleanly available.';
  }

  private buildParScoreBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    var venueAverage = this.getVenueAverageScore();
    var score = this.getScoreNumbers();
    if (venueAverage !== null && score.runs !== null && lifecycle !== 'upcoming') {
      if (score.runs >= venueAverage) {
        return 'Current score is already around or above the visible venue average of ' + venueAverage + ', which usually means the batting side has built a workable platform.';
      }
      return 'Current score is still below the visible venue average of ' + venueAverage + ', so the batting side still has work to do to reach a par checkpoint.';
    }
    if (venueAverage !== null) {
      return 'The venue average currently reads around ' + venueAverage + ', which gives the preview a public par-score anchor before the innings unfolds.';
    }
    return 'This module should explain whether the current score sits above par, near par, or below par once venue data is available.';
  }

  private buildWatchpointBody(lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    var pressureZone = this.getPressureZoneLabel();
    if (lifecycle === 'upcoming') {
      return 'The first important trigger is toss and lineup confirmation, because that is the earliest point where the preview can shift from setup to real prediction value.';
    }
    if (pressureZone) {
      return 'The next watchpoint is whether the match stays in a ' + pressureZone + ' pressure zone over the next phase, because that is where the next visible swing should come from.';
    }
    return 'The next watchpoint should be the next over cluster, wicket window, or scoring threshold that can visibly move control.';
  }

  private getLatestCommentaryText(): string | null {
    var commentary = this.snapshot && this.snapshot.matchData ? this.snapshot.matchData.commentary : null;
    if (!commentary || !Array.isArray(commentary) || !commentary.length) {
      return null;
    }

    var latest = commentary[0];
    if (!latest) {
      return null;
    }

    return String(latest.commentary || latest.text || latest.event || '').trim() || null;
  }

  private getPublicInsight(): string | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.insight || data.public_insight) : null;
    return value ? String(value).trim() || null : null;
  }

  private getProjectionLabel(): string | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.projection_label || data.projectionLabel) : null;
    return value ? String(value).trim() || null : null;
  }

  private getVenueLabel(): string | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.venue_label || data.venueLabel || data.venue) : null;
    return value ? String(value).trim() || null : null;
  }

  private getPressureZoneLabel(): string | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.pressure_zones || data.pressureZones) : null;
    if (Array.isArray(value) && value.length) {
      return String(value[0]).trim() || null;
    }
    return value ? String(value).trim() || null : null;
  }

  private getTurningPointLabel(): string | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.turning_point || data.turningPoint) : null;
    return value ? String(value).trim() || null : null;
  }

  private getLatestSwingLabel(): string | null {
    var swings = this.getLastSwings();
    return swings.length ? swings[0] : null;
  }

  private getLastSwings(): string[] {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.last_swings || data.lastSwings || data.probability_swing) : null;
    if (!value) {
      return [];
    }

    var items = Array.isArray(value) ? value : [value];
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object') {
          return String(item.label || item.summary || item.text || item.swing || '').trim();
        }
        return '';
      })
      .filter((item) => !!item)
      .slice(0, 3);
  }

  private getReasons(): string[] {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.reasons || data.reason_list || data.reasonList) : null;
    if (!value) {
      return [];
    }

    var items = Array.isArray(value) ? value : [value];
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object') {
          return String(item.label || item.summary || item.reason || item.text || '').trim();
        }
        return '';
      })
      .filter((item) => !!item)
      .slice(0, 4);
  }

  private getSessionSignalLabel(): string | null {
    var sessionOdds = this.snapshot && this.snapshot.matchData ? this.snapshot.matchData.session_odds : null;
    if (!sessionOdds || !Array.isArray(sessionOdds) || !sessionOdds.length) {
      return null;
    }

    var top = sessionOdds[0];
    if (!top) {
      return null;
    }

    return String(top.session || top.title || top.label || top.betname || '').trim() || null;
  }

  private getTargetLabel(): string | null {
    var target = this.getTargetNumber();
    return target !== null ? String(target) : null;
  }

  private getTargetNumber(): number | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? data.target : null;
    if (value === undefined || value === null || value === '') {
      return null;
    }
    var parsed = parseFloat(String(value));
    return isFinite(parsed) ? parsed : null;
  }

  private getVenueAverageScore(): number | null {
    var data = this.snapshot && this.snapshot.matchData;
    var value = data ? (data.venue_avg_score || data.venueAvgScore) : null;
    if (value === undefined || value === null || value === '') {
      return null;
    }
    var parsed = parseFloat(String(value));
    return isFinite(parsed) ? parsed : null;
  }

  private getOversNumber(): number | null {
    var data = this.snapshot && this.snapshot.matchData;
    var overs = data ? data.overs : null;
    if (!overs) {
      return null;
    }
    var parsed = parseFloat(String(overs).replace(/[^\d.]/g, ''));
    return isFinite(parsed) ? parsed : null;
  }

  private getScoreNumbers(): { runs: number | null; wickets: number | null } {
    var data = this.snapshot && this.snapshot.matchData;
    var score = data ? data.score : null;
    if (!score) {
      return { runs: null, wickets: null };
    }

    var parts = String(score).split('/');
    var runs = parts.length ? parseInt(parts[0], 10) : NaN;
    var wickets = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
    return {
      runs: isFinite(runs) ? runs : null,
      wickets: isFinite(wickets) ? wickets : null
    };
  }

  private getTransferStateKey(slug: string) {
    return makeStateKey<MatchIntelligenceSnapshot | null>(MATCH_INTELLIGENCE_STATE_PREFIX + slug);
  }

  private buildTitle(teams: string, lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', shortTeams: string): string {
    if (lifecycle === 'upcoming') {
      return teams + ' Prediction & Match Intelligence | ' + shortTeams;
    }
    if (lifecycle === 'completed') {
      return teams + ' Turning Point & Match Intelligence | ' + shortTeams;
    }
    return teams + ' Live Win Probability & Match Intelligence | ' + shortTeams;
  }

  private buildDescription(teams: string, series: string, lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown', modelUnavailable: boolean): string {
    var baseSeries = series ? (' in ' + series) : '';
    if (lifecycle === 'upcoming') {
      return 'Preview ' + teams + baseSeries + ' with model direction, match setup, and what matters next on Crickzen match intelligence.';
    }
    if (lifecycle === 'completed') {
      return 'Review ' + teams + baseSeries + ' with turning-point framing, result context, and next-step analysis on Crickzen match intelligence.';
    }
    if (modelUnavailable) {
      return 'Track ' + teams + baseSeries + ' on Crickzen match intelligence with honest model availability, lifecycle context, and score-first return paths.';
    }
    return 'Track ' + teams + baseSeries + ' with live win probability, match-state interpretation, and what matters next on Crickzen match intelligence.';
  }

  private buildH1(teams: string, lifecycle: 'upcoming' | 'live' | 'completed' | 'unknown'): string {
    if (lifecycle === 'upcoming') {
      return teams + ' Match Intelligence And Prediction Snapshot';
    }
    if (lifecycle === 'completed') {
      return teams + ' Match Intelligence And Turning Point Review';
    }
    return teams + ' Live Match Intelligence';
  }
}
