import { Component, Inject, NgZone, OnDestroy, OnInit, Optional } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { RxStompService } from '@stomp/ng2-stompjs';
import { merge, Subject, Subscription, timer } from 'rxjs';
import { filter, switchMap, take, takeUntil, timeout } from 'rxjs/operators';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { REQUEST } from '@nguniversal/express-engine/tokens';

import {
  CricketService,
  PlayerStatsMatchView,
  PlayerStatsPlayerDetailView,
  PlayerStatsSeriesDetailView,
  PlayerStatsSeriesView,
  PlayerStatsTeamDetailView,
  PlayerStatsTeamView,
  PlayerStatsSquadPlayerView,
  PlayerStatsSnapshotView
} from './cricket-odds.service';
import { TokenStorage } from '../token.storage';
import { EventListService } from '../component/event-list.service';
import { AuthService } from '../auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { buildLegacyCricketTopicPaths } from '../core/utils/cricket-websocket-topics';
import { extractMatchRouteSuffix, extractSlugFromUrl, getRecentBallDisplay, normalizeMatchRoutePath, RecentBallKind } from '../core/utils/match-utils';
import { upsertCommentaryEntries } from './commentary.utils';
import { LiveHeroViewModel } from '../match-live/services/live-hero.models';
import { MatchSeoViewModel } from '../seo/match-seo.models';
import { MatchSeoService } from '../seo/match-seo.service';
import { MetaTagsService } from '../seo/meta-tags.service';
import { getCommentaryUpdateIntent, getCommentaryUpdateLabel, isMeaningfulCommentaryUpdate } from '../seo/live-update-heuristics';
import { StructuredDataLocationInput, StructuredDataService } from '../seo/structured-data.service';
import { MatchFreshnessLink, buildFreshnessLinksFromMatch, buildFreshnessLinksFromSlug } from '../seo/match-freshness-links';
import { LiveMatchUpdate } from '../shared/models/match.models';
import { AnalyticsService } from './analytics.service';
import { MatchIntelligenceDataService, MatchIntelligenceSnapshot } from '../features/match-intelligence/match-intelligence-data.service';

const MATCH_INFO_KEY = makeStateKey<any>('cricket_match_info');
const CRICKET_DATA_KEY = makeStateKey<any>('cricket_data_snapshot');

interface FormattedExposure {
  win: number;
  lose: number;
}

interface Bet {
  teamName: string;
  betType: string;
  amount: number;
  odd: number;
  isSessionBet: boolean;
  sessionName: string;
  matchUrl: string;
}

interface RecentBallView {
  key: string;
  rawScore: string;
  score: string;
  fullLabel: string;
  kind: RecentBallKind;
  animate: boolean;
}

interface PlayerStatsSelectionEvent {
  playerName: string;
  externalId?: string;
  teamName?: string;
  teamExternalId?: string;
  role?: string;
}

interface TeamStatsSelectionEvent {
  teamName: string;
  externalId?: string;
}

interface CoverageSummaryFact {
  label: string;
  value: string;
}

interface MatchFaqItem {
  question: string;
  answer: string;
}

interface CanonicalIntelligenceView {
  lifecycle: 'upcoming' | 'live' | 'completed';
  probability: number;
  headline: string;
  reason: string;
  nextStep: string;
  updatedAt: string | null;
  modelLabel: string | null;
}

type MatchPageTabKey = 'commentary' | 'details' | 'scorecard' | 'lineups' | 'intelligence';

@Component({
  selector: 'app-cricket-odds',
  templateUrl: './cricket-odds.component.html',
  styleUrls: ['./cricket-odds.component.css']
})
export class CricketOddsComponent implements OnInit, OnDestroy {

  formattedExposures: Record<string, FormattedExposure> = {};
  sessionOddsListDisplay: Array<{ session: string, backOdds: string, layOdds: string }> = [];
  batsmanDataList: Array<any> = [];
  bowlerDataList: Array<any> = [];

  favTeam: string = '-';
  backOdds: number = 0; // Example: Back odds for the favorite team.
  layOdds: number = 1; // Example: Lay odds for the favorite team.

  session: string = '-';
  sessionBackOdds: string = '-';
  sessionLayOdds: string = '-';

  showBetting: boolean = false; // Initially, hide betting options
  selectedOdds: number = 0; // Initial odds value
  betAmount: number = 0; // Initial bet amount
  oddsStep: number = 0.1; // Initial step value
  // Store the previous odds value
  prevOdds: number = this.selectedOdds;

  showBettingFor: string = ''; // To trac which section is clicked

  layButtonActive: boolean = false;

  selectedBetType: string = ''; // Initialize as 'back' or 'lay' based on user selection


  currentMatchIndex: number | null = null; 

  displayedColumns: string[] = ['teamName','type','amount', 'odd', 'status']; // Add more column names here

  quickStakeAmounts: number[] = [50, 100, 500, 1000, 1500, 2000, 2500, 3000]; // Define your quick stake amounts


  private destroy$: Subject<void> = new Subject<void>();

  totalPotentialWin: number = 0;
  totalPotentialLoss: number = 0;
  winFormattedKey: string = '';
  loseFormattedKey: string = '';
  
  matchInfo: any;
  scorecardData: any;
  commentaryEntries: any[] = [];
  matchAnnouncement: string = '';
  isLoadingMatchInfo: boolean = false;
  isLoadingScorecard: boolean = false;

  last6Balls: RecentBallView[] = []; // Initialize empty array, will be populated from API data
  cricetTopicSubscription: any;
  cricObj: any;
  private recentBallRenderToken: number = 0;
  private lastLiveBallEventToken: string | null = null;

  private tossWonCountrySubject: Subject<string> = new Subject<string>();
  private batOrBallSelectedSubject: Subject<string> = new Subject<string>();
  tossWonCountry: string;
  batOrBallSelected: string;
  testMatchOdds: any[];
  betType: string;
  loggedUser: string;
  matchUrl: any;
  isBetProcessing: boolean;
  betStatusSubscription: any;

  userBets: any[] = []; // To store the bets
  updatedUserData: any;
  battingTeam: any;
  sessionExposures: any;

  // Property to hold the match URL
  currentUrl: string;
  currentRequestedPath: string = '';
  playerStatsMatch: PlayerStatsMatchView | null = null;
  isLoadingPlayerStats: boolean = false;
  playerStatsError: boolean = false;
  seriesPageUrlFallback: string | null = null;
  private retainedEntityTeams: PlayerStatsTeamView[] = [];
  private retainedEntityResolutionKey: string | null = null;
  private isResolvingRetainedEntities: boolean = false;
  private resolvedSeriesContext: PlayerStatsSeriesView | null = null;
  private lastResolvedRouteSlug: string | null = null;
  private lastFetchedRouteKey: string | null = null;
  private playerStatsRetryAttempt: number = 0;
  private playerStatsRetryTimer: any = null;
  private routeMatchHint: any = null;
  statsExplorerSource: 'lineups' | 'scorecard' | null = null;
  selectedStatsExplorerType: 'player' | 'team' | 'series' | null = null;
  selectedStatsExplorerPlayer: PlayerStatsSquadPlayerView | null = null;
  selectedStatsExplorerTeam: PlayerStatsTeamView | null = null;
  selectedPlayerStatsDetail: PlayerStatsPlayerDetailView | null = null;
  selectedTeamStatsDetail: PlayerStatsTeamDetailView | null = null;
  selectedSeriesStatsDetail: PlayerStatsSeriesDetailView | null = null;
  isLoadingStatsExplorer: boolean = false;
  statsExplorerErrorMessage: string | null = null;
  
  // 002-match-details-ux: Match ID for new components (T039+)
  matchId: string | null = null;
  currentMatch: any = null; // Hold full match object if available
  showLiveHero: boolean = true;
  heroFallbackView: LiveHeroViewModel | null = null;
  private isFallbackMatchInfo: boolean = false;
  matchSeo: MatchSeoViewModel | null = null;
  freshnessLinks: MatchFreshnessLink[] = [];
  private hasTrackedIntelligenceCtaImpression: boolean = false;
  private hasTrackedCanonicalMatchView: boolean = false;
  canonicalIntelligence: CanonicalIntelligenceView | null = null;
  private canonicalIntelligenceSubscription: Subscription | null = null;

  // Toggle to hide/show odds sections
  showOdds: boolean = true;
  // Toggle to show odds as probability bar
  viewAsProbability: boolean = false;



  teamComparisonKeys: string[] = [];
  teamComparisonSubKeys: string[] = [];
  venueStatsKeys: string[] = [];
  playingXIKeys: string[] = [];
  teamFormKeys: string[] = [];
  bowlFirstPercentage: number;
  winBatFirstPercentage: number;
  winBowlFirstPercentage: number;
  scorecardInfo: any;
  selectedTabIndex: number = 0;
  matchDetailsOpen: boolean = false;
  private hasUserSelectedTab: boolean = false;
  private readonly tabIndexByKey: { [key in MatchPageTabKey]: number } = {
    commentary: 0,
    details: 0,
    scorecard: 2,
    lineups: 3,
    intelligence: 4
  };


  constructor(private rxStompService: RxStompService,
              private cricketService: CricketService,
              private tokenStorage:TokenStorage,
              private snackBar: MatSnackBar,
              private eventListService:EventListService,
              private authService : AuthService,
              private metaTagsService: MetaTagsService,
              private matchSeoService: MatchSeoService,
              private structuredDataService: StructuredDataService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private ngZone: NgZone,
              private transferState: TransferState,
              private analyticsService: AnalyticsService,
              private matchIntelligenceDataService: MatchIntelligenceDataService,
              @Optional() @Inject(REQUEST) private request: any = null) { }

  trackByCommentaryId(index: number, entry: any): string {
    return (entry && entry.id) || (entry && entry.overBall) || String(index);
  }

  trackByLiveMatchUpdate(index: number, update: LiveMatchUpdate): string {
    return (update && update.id) || String(index);
  }

  ngOnDestroy() {
    this.tossWonCountrySubject.complete();
    this.batOrBallSelectedSubject.complete();

    // Unsubscribe from all subscriptions and subject
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cricetTopicSubscription) {
      this.cricetTopicSubscription.unsubscribe();
    }
    if (this.canonicalIntelligenceSubscription) {
      this.canonicalIntelligenceSubscription.unsubscribe();
      this.canonicalIntelligenceSubscription = null;
    }
  }

  checkIfCountryAndOptionSet() {
    if (this.tossWonCountry && this.batOrBallSelected) {
      console.log('Country and option set');
    }
  }
  // Function to show toast message
  showToast(message: string, action: string, duration: number = 3000) {
    this.snackBar.open(message, action, {
      duration: duration,
    });
  }
  ngOnInit(): void {
    // Phase 7 (T036): Hide odds by default on mobile viewports
    this.showOdds = this.isBrowser() ? window.innerWidth > 768 : true;
    this.resetMatchPageScroll();

    const routeMatchKey = this.normalizeRouteMatchKey(this.activatedRoute.snapshot.params['path']
      || this.activatedRoute.snapshot.params['url']
      || '');
    const legacyMatchUrl = this.activatedRoute.snapshot.queryParamMap.get('url');
    this.currentUrl = routeMatchKey;
    this.currentRequestedPath = this.getRequestedMatchPath();
    this.matchDetailsOpen = this.resolveRequestedTabKey() === 'details';
    this.routeMatchHint = this.getNavigationMatchHint(routeMatchKey);
    if (this.routeMatchHint) {
      this.applyRouteMatchHint(this.routeMatchHint);
    }
    this.syncMatchTabSelection(true);
    
    // 002-match-details-ux: Extract matchId from URL or route params
    this.matchId = this.activatedRoute.snapshot.queryParamMap.get('matchId') 
          || this.activatedRoute.snapshot.params['matchId']
          || routeMatchKey
          || this.extractMatchIdFromUrl(this.currentUrl);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$),
      switchMap(() => this.activatedRoute.params),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // The component instance is intentionally retained while users move
      // between match tabs, so refresh the requested path before deriving
      // the selected tab from the route.
      this.currentRequestedPath = this.getRequestedMatchPath();
      this.matchDetailsOpen = this.resolveRequestedTabKey() === 'details';
      const nextMatchKey = this.normalizeRouteMatchKey(this.activatedRoute.snapshot.params['path']
        || this.activatedRoute.snapshot.params['url']
        || '');

      // Supporting routes such as scorecard and lineups belong to the same
      // match entity. Keep the active socket and rendered match surface in
      // place instead of treating each tab as a fresh match-page load.
      if (nextMatchKey && nextMatchKey === this.lastFetchedRouteKey) {
        this.syncMatchTabSelection(true);
        this.ensureDataForTab(this.selectedTabIndex);
        this.resetMatchPageScroll(true);
        return;
      }

      // A different match starts a fresh surface and should receive the same
      // deterministic content focus as child-route navigation.
      this.resetMatchPageScroll(true);

      // Unsubscribe from WebSocket subscription when the route changes
      if (this.cricetTopicSubscription) {
        this.cricetTopicSubscription.unsubscribe();
      }
      this.hasUserSelectedTab = false;
      this.fetchCricketData();
    });

    this.tossWonCountrySubject.subscribe((tossWonCountry) => {
      this.tossWonCountry = tossWonCountry;
      // this.checkIfCountryAndOptionSet();
    });

    this.batOrBallSelectedSubject.subscribe((batOrBallSelected) => {
      this.batOrBallSelected = batOrBallSelected;
      // this.checkIfCountryAndOptionSet();
    });

    // Hydrate from SSR TransferState to avoid re-fetch flash on client
    if (this.isBrowser()) {
      const ssrMatchInfo = this.transferState.get(MATCH_INFO_KEY, null);
      if (ssrMatchInfo) {
        this.matchInfo = ssrMatchInfo;
        this.isFallbackMatchInfo = false;
      }
      const ssrCricketData = this.transferState.get(CRICKET_DATA_KEY, null);
      if (ssrCricketData) {
        this.parseCricObjData(ssrCricketData);
      }
      this.transferState.remove(MATCH_INFO_KEY);
      this.transferState.remove(CRICKET_DATA_KEY);
    }

    //watching live score for cricet data
    this.fetchCricketData();

    if (this.isBrowser() && legacyMatchUrl && routeMatchKey) {
      this.stripLegacyMatchUrlParam(routeMatchKey);
    }

    //fetch user details from tokenStorage
    const user = this.tokenStorage.getUser();
    this.loggedUser =  JSON.parse(user);

    //this.loadUserBets();

  }
  


  private fetchCricketData() {
    const params = this.activatedRoute.snapshot.params;
    const match = this.normalizeRouteMatchKey(params['path']); // Use 'path' instead of 'match'
    // Initial component setup and the first NavigationEnd can both reach this
    // method. Keep one data stream alive instead of briefly tearing down and
    // recreating the page, which caused visible refresh/loading flashes.
    if (match && this.lastFetchedRouteKey === match) {
      return;
    }
    this.lastFetchedRouteKey = match || this.lastFetchedRouteKey;
    const isSameRouteMatch = !!(match && this.lastResolvedRouteSlug && this.lastResolvedRouteSlug === match);

    this.currentUrl = match || '';
    this.currentRequestedPath = this.getRequestedMatchPath(match);
    this.matchUrl = this.currentMatch && this.currentMatch.url ? this.currentMatch.url : (match || '');
    this.matchId = this.activatedRoute.snapshot.queryParamMap.get('matchId')
                  || params['matchId']
                  || match
                  || this.matchId;
    this.syncMatchTabSelection(true);
    this.loadCanonicalIntelligence(match);

    if (!isSameRouteMatch) {
      this.playerStatsRetryAttempt = 0;
      if (this.playerStatsRetryTimer) {
        clearTimeout(this.playerStatsRetryTimer);
        this.playerStatsRetryTimer = null;
      }
      this.resetStatsExplorerState();
      this.playerStatsMatch = null;
      this.playerStatsError = false;
      this.currentMatch = null;
      this.resolvedSeriesContext = null;
      this.seriesPageUrlFallback = null;
      this.lastLiveBallEventToken = null;
      this.lastResolvedRouteSlug = match;
      this.hasTrackedIntelligenceCtaImpression = false;
      this.hasTrackedCanonicalMatchView = false;
    }

    this.populateFallbackMatchInfo();

    if (this.routeMatchHint && this.routeSlugMatches(match, this.routeMatchHint)) {
      this.applyRouteMatchHint(this.routeMatchHint);
    }

    this.resolveRouteMatch(match);

    this.cricketService.getLastUpdatedData(match).subscribe(data => {
      this.parseCricObjData(data);
    });
    //watching live score for cricket data
    if (this.isBrowser()) {
      if (this.cricetTopicSubscription) {
        this.cricetTopicSubscription.unsubscribe();
      }

      const topics = buildLegacyCricketTopicPaths(match);
      if (topics.length > 0) {
        this.cricetTopicSubscription = merge.apply(null, topics.map(topic => this.rxStompService.watch(topic))).subscribe((data) => {
          this.ngZone.run(() => {
            this.parseCricObjData(data);
            // Cache WebSocket updates for instant load on next visit
            try {
              const parsed = data && 'body' in data ? JSON.parse(data.body) : data;
              if (parsed) {
                this.cricketService.updateMatchDataCache(match, parsed);
              }
            } catch (_) { /* non-critical */ }
          });
        });
      }
    }
    
    // Fetch match info for hero component
    this.fetchMatchInfo(this.matchId || match);
  }

  private loadCanonicalIntelligence(routeSlug: string): void {
    if (this.canonicalIntelligenceSubscription) {
      this.canonicalIntelligenceSubscription.unsubscribe();
      this.canonicalIntelligenceSubscription = null;
    }
    this.canonicalIntelligence = null;
    if (!routeSlug) {
      return;
    }

    const applySnapshot = (snapshot: MatchIntelligenceSnapshot) => {
      this.canonicalIntelligence = this.buildCanonicalIntelligence(snapshot);
    };

    if (this.isBrowser()) {
      this.canonicalIntelligenceSubscription = timer(0, 30000).pipe(
        switchMap(() => this.matchIntelligenceDataService.loadSnapshot(routeSlug)),
        takeUntil(this.destroy$)
      ).subscribe(applySnapshot, () => {
        this.canonicalIntelligence = null;
      });
      return;
    }

    this.matchIntelligenceDataService.loadSnapshot(routeSlug).pipe(
      takeUntil(this.destroy$)
    ).subscribe(applySnapshot, () => {
      this.canonicalIntelligence = null;
    });
  }

  private buildCanonicalIntelligence(snapshot: MatchIntelligenceSnapshot): CanonicalIntelligenceView | null {
    const prediction: any = snapshot && snapshot.publicPrediction;
    if (!prediction || prediction.win_probability_pct === null || prediction.win_probability_pct === undefined) {
      return null;
    }

    const probability = Number(prediction.win_probability_pct);
    if (isNaN(probability) || probability < 0 || probability > 100) {
      return null;
    }

    const publicStatus = String(prediction.status || '').toLowerCase();
    // The canonical match resolver owns lifecycle identity. A retained model
    // row can be marked `stopped` once its live writer is halted even though
    // the authoritative match record has reached COMPLETED. Preserve the
    // replay's final answer only when that canonical lifecycle is explicit.
    const lifecycle = snapshot.lifecycle === 'completed' || publicStatus === 'completed' || publicStatus === 'complete'
      ? 'completed'
      : (snapshot.lifecycle === 'upcoming' ? 'upcoming' : 'live');
    const history = Array.isArray(prediction.prediction_history) ? prediction.prediction_history : [];

    // A completed replay is historic by design; live and upcoming figures need
    // the same five-minute freshness rule as the public model feed.
    if (lifecycle === 'completed') {
      if (history.length < 2) {
        return null;
      }
    } else if (snapshot.freshnessState !== 'fresh') {
      return null;
    }

    const team = String(prediction.batting_team || prediction.title || 'The batting side');
    const fallbackReason = lifecycle === 'completed'
      ? 'This completed replay retains the final model state and probability path from the match.'
      : lifecycle === 'upcoming'
        ? 'This opening model view can change when toss, confirmed XI, and conditions are known.'
        : 'This live model view updates with the match state and should be read alongside the score.';

    return {
      lifecycle: lifecycle,
      probability: Math.round(probability),
      headline: lifecycle === 'completed'
        ? team + ' finished with a ' + Math.round(probability) + '% final model probability.'
        : lifecycle === 'upcoming'
          ? team + ' has a ' + Math.round(probability) + '% opening win probability.'
          : team + ' currently has a ' + Math.round(probability) + '% win probability.',
      reason: String(prediction.insight || (prediction.reasons && prediction.reasons[0]) || fallbackReason),
      nextStep: lifecycle === 'completed'
        ? 'Review the scorecard and probability path to see where the result turned, then continue to the relevant team or series.'
        : lifecycle === 'upcoming'
          ? 'Check back after toss and confirmed XI, when the opening view can be refreshed with the latest match context.'
          : 'Follow the next scoring phase and the next probability update; the live score remains the primary match state.',
      updatedAt: prediction.updated_at ? String(prediction.updated_at) : null,
      modelLabel: prediction.model_label ? String(prediction.model_label) : null
    };
  }

  private parseCricObjData(data) {
    // Check if 'data' has a 'body' property
    if(data && 'body' in data){
      this.cricObj = JSON.parse(data.body);
    } else {
      this.cricObj = data;
    }

    // Store parsed cricket data in TransferState on the server for client hydration
    if (!this.isBrowser() && this.cricObj) {
      this.transferState.set(CRICKET_DATA_KEY, this.cricObj);
    }

    // Your existing logic for handling received cricket data...s
    if (this.cricObj) {
      // Check and handle the "team_odds" field
      if (this.cricObj.team_odds !== undefined && this.cricObj.team_odds !== null) {
        const teamOddsValue = this.cricObj.team_odds;
        this.backOdds = teamOddsValue.backOdds;
        this.layOdds = teamOddsValue.layOdds;
        console.log("Team Odds:", teamOddsValue);
      }


      if (this.cricObj.toss_won_country !== undefined) {
        this.tossWonCountrySubject.next(this.cricObj.toss_won_country);
      }

      if (this.cricObj.batsman_data !== undefined && Array.isArray(this.cricObj.batsman_data)) {
        const batsmanData = this.cricObj.batsman_data;
  
        // Create a temporary array to build the new data
        const tempBatsmanList = [];
  
        // Iterate through the batsman_data array
        batsmanData.forEach(playerInfo => {
          if (!playerInfo.name.includes('Unknown')) { // Skip if the name contains 'Unknown'
            const strikeRate = (playerInfo.score / playerInfo.ballsFaced) * 100; // Strike rate calculation
            tempBatsmanList.push({
              name: playerInfo.name,
              score: playerInfo.score,
              ballsFaced: playerInfo.ballsFaced,
              fours: playerInfo.fours,
              sixes: playerInfo.sixes,
              strikeRate: strikeRate.toFixed(2),
              onStrike: playerInfo.onStrike
            });
          }
        });
        
        // Only update if we have data to prevent flickering
        if (tempBatsmanList.length > 0) {
          this.batsmanDataList = tempBatsmanList;
        }
    
        console.log("Parsed Batsman Data List:", this.batsmanDataList);
      }

      if (this.cricObj.bowler_data !== undefined && Array.isArray(this.cricObj.bowler_data)) {
        const bowlerData = this.cricObj.bowler_data;

        // Create a temporary array to build the new data
        const tempBowlerList = [];
  
        // Iterate through the bowler_data array
        bowlerData.forEach(playerInfo => {
          if (!playerInfo.name.includes('Unknown')) { // Skip if the name contains 'Unknown'
            const ballsBowled = parseInt(playerInfo.ballsBowled, 10) || 0;
            const oversBowled = Math.floor(ballsBowled / 6);
            const ballsInCurrentOver = ballsBowled % 6;
            const oversDisplay = `${oversBowled}.${ballsInCurrentOver}`;
            // Prefer scraper-provided economyRate; fallback to calculation
            let econ = playerInfo.economyRate;
            if (!econ || econ === '0.00') {
              const scoreNum = parseInt(playerInfo.score, 10) || 0;
              econ = oversBowled > 0 ? (scoreNum / oversBowled).toFixed(2) : '0.00';
            }
            // Extract just runs from score (may be "23(3.0)" combined format)
            let runs = playerInfo.score;
            if (typeof runs === 'string' && runs.includes('(')) {
              runs = runs.split('(')[0];
            }
            tempBowlerList.push({
              name: playerInfo.name,
              score: runs,
              ballsBowled: oversDisplay,
              economyRate: econ,
              wicketsTaken: playerInfo.wicketsTaken,
              dotBalls: playerInfo.dotBalls
            });
          }
        });
        
        // Only update if we have data to prevent flickering
        if (tempBowlerList.length > 0) {
          this.bowlerDataList = tempBowlerList;
        }
        
        console.log("Parsed Bowler Data List:", this.bowlerDataList);
      }
      
      if (this.cricObj.session_odds !== undefined) {
        const sessionOddsList = this.cricObj.session_odds;
  
        if (Array.isArray(sessionOddsList) && sessionOddsList.length > 0) {
          this.sessionOddsListDisplay = this.cricObj.session_odds.sort((a, b) => {
            // Parse sessionOver as a number and sort by ascending order
            return Number(a.sessionOver) - Number(b.sessionOver);
          });
          this.sessionOddsListDisplay = sessionOddsList.map((sessionOdds) => ({
            session: sessionOdds.sessionOver + ' Over',
            backOdds: sessionOdds.sessionBackOdds,
            layOdds: sessionOdds.sessionLayOdds
          }));

        }
      }
      if (this.cricObj.bat_or_ball_selected !== undefined) {
        const bat_or_ball_selected = this.cricObj.bat_or_ball_selected;
        this.batOrBallSelectedSubject.next(bat_or_ball_selected);
      }

      if (this.cricObj.batting_team !== undefined && this.cricObj.batting_team !== null) {
        this.battingTeam = this.cricObj.batting_team;
      }

      //check and handle the "overs_data" field
      if (this.cricObj.overs_data !== undefined && this.cricObj.overs_data !== null) {
        const oversDataValue = this.cricObj.overs_data;
        console.log("Full Overs Data:", oversDataValue);
        
        // Try to find "This Over:" first
        let thisOverData = this.cricObj.overs_data.find(over => over.overNumber === "This Over:");
        
        // If not found, try the last over in the array
        if (!thisOverData && Array.isArray(this.cricObj.overs_data) && this.cricObj.overs_data.length > 0) {
          thisOverData = this.cricObj.overs_data[this.cricObj.overs_data.length - 1];
          console.log("Using last over data:", thisOverData);
        }
        
        if (thisOverData !== undefined && thisOverData.balls) {
          console.log("Processing balls:", thisOverData.balls);
          // Prepare the last6Balls array with the data
          const tempBalls = this.buildRecentBalls(thisOverData.balls);
          
          console.log("Processed temp balls:", tempBalls);
          
          // Only update if we have valid ball data
          if (tempBalls.length > 0 && this.getRecentBallSignature(tempBalls) !== this.getRecentBallSignature(this.last6Balls)) {
            this.last6Balls = tempBalls;
            console.log("Updated last6Balls:", this.last6Balls);
          } else {
            console.log("No valid ball data found after processing");
          }
        } else {
          console.log("No thisOverData or balls found");
        }
      } else {
        console.log("No overs_data available");
      }

      if ((this.cricObj.overs_data === undefined || this.cricObj.overs_data === null) && this.tryAppendRecentBallFromLiveUpdate()) {
        console.log("Updated last6Balls from live update:", this.last6Balls);
      }

      // Fallback: derive last 6 balls from runs_on_ball stream if still empty
      if (this.last6Balls.length === 0 && this.cricObj.runs_on_ball) {
        const raw = String(this.cricObj.runs_on_ball).trim();
        // Tokenize by space or comma
        const tokens = raw.split(/[,\s]+/).filter(t => t.length > 0);
        const lastSix = this.buildRecentBalls(tokens.slice(-6));
        if (lastSix.length > 0) {
          this.last6Balls = lastSix;
          console.log("Fallback last6Balls from runs_on_ball:", this.last6Balls);
        }
      }

      // Handle commentary data from WebSocket/API
      if (this.cricObj.commentary !== undefined && Array.isArray(this.cricObj.commentary)) {
        const newEntries: any[] = this.cricObj.commentary;
        if (newEntries.length > 0) {
          this.commentaryEntries = upsertCommentaryEntries(this.commentaryEntries, newEntries).slice(0, 200);
        }
      }

      if (this.cricObj.match_announcement !== undefined && this.cricObj.match_announcement !== null) {
        this.matchAnnouncement = String(this.cricObj.match_announcement).trim();
      }

      // Check and handle the "runs_on_ball" field
      if (this.cricObj.match_odds !== undefined && this.cricObj.match_odds !== null) {
        const testMatchOddsValue = this.cricObj.match_odds;

        console.log("Test Match Odds:", testMatchOddsValue);
        this.testMatchOdds = testMatchOddsValue;
        console.log("Test Match Odds:", this.testMatchOdds);
        
      }

      // Check and handle the "fav_team" field
      if (this.cricObj.fav_team !== undefined && this.cricObj.fav_team !== null) {
        const favTeamValue = this.cricObj.fav_team;
        if (this.favTeam !== favTeamValue) {
          this.favTeam = favTeamValue;
        }
        console.log("Favorite Team:", favTeamValue);
      }
    } else {
      console.log("No cricket data received.");
    }
  }

  // Function to show betting options
  showBettingOptions(section) {

    this.showBetting = false;
  this.layButtonActive = false;
  this.selectedOdds = 0;
  this.betAmount = 0;
  this.showBettingFor = '';



    this.showBetting = true;
    this.selectedOdds = this.backOdds;
    this.prevOdds = this.selectedOdds;

    this.showBettingFor = section;

    this.betAmount = 0; // Clear the stakes when clicking on odds again


    if (this.showBettingFor == 'teamSectionBackOdds' || this.showBettingFor === 'sessionBackOdds') {
      if (this.layButtonActive) {
        this.layButtonActive = false;
      }
    }

    if (this.showBettingFor == 'teamSectionBackOdds') {
      this.selectedBetType = 'back';
      this.selectedOdds = this.backOdds;
    }

    if (this.showBettingFor == 'layOdds') {
      this.selectedBetType = 'lay';
      this.layButtonActive = true;
      this.selectedOdds = this.layOdds;
    }

    if (this.showBettingFor =='sessionBackOdds') {
      this.selectedBetType = 'no';
      this.selectedOdds = Number(this.sessionBackOdds);
    }

    if(this.showBettingFor == 'sessionLayOdds'){
      this.layButtonActive = true;
      this.selectedBetType = 'yes';
      this.selectedOdds = Number(this.sessionLayOdds);
    }

  }

  private buildRecentBalls(balls: any[]): RecentBallView[] {
    if (!Array.isArray(balls) || balls.length === 0) {
      return [];
    }

    var mappedBalls = balls
      .map((ball) => this.toRecentBallView(ball))
      .filter((ball): ball is RecentBallView => !!ball);

    if (mappedBalls.length === 0) {
      return mappedBalls;
    }

    this.recentBallRenderToken += 1;
    var latestIndex = mappedBalls.length - 1;

    return mappedBalls.map((ball, index) => ({
      key: index + '-' + ball.rawScore + '-' + this.recentBallRenderToken,
      rawScore: ball.rawScore,
      score: ball.score,
      fullLabel: ball.fullLabel,
      kind: ball.kind,
      animate: index === latestIndex && this.isImpactBall(ball.kind),
    }));
  }

  private toRecentBallView(ball: any): RecentBallView | null {
    var ballValue = typeof ball === 'string'
      ? ball.trim()
      : (ball && (ball.score || ball.runs || ball.toString()));
    var recentBall = getRecentBallDisplay(ballValue);

    if (!recentBall.raw) {
      return null;
    }

    return {
      key: '',
      rawScore: recentBall.raw,
      score: recentBall.display,
      fullLabel: recentBall.fullLabel,
      kind: recentBall.kind,
      animate: false
    };
  }

  private getRecentBallSignature(balls: RecentBallView[]): string {
    return balls.map((ball) => ball.rawScore).join('|');
  }

  private isImpactBall(kind: RecentBallKind): boolean {
    return kind === 'four' || kind === 'six' || kind === 'wicket';
  }

  // Function to cancel the bet
  cancelBet() {
    this.showBetting = false;
    this.showBettingFor = '';
    if (this.layButtonActive) {
      this.layButtonActive = false;
    }
  }

  resetBettingState() {
    this.showBetting = false;
    this.layButtonActive = false;
    this.selectedOdds = 0;
    this.prevOdds = 0;
    this.selectedBetType = '';
    this.betAmount = 0;
  }
  // Function to place the bet (you can add your logic here)
  placeBet() {

    const betDetails = {
      betType: this.selectedBetType,
      teamName: this.favTeam,
      odd: 1 + (Number(this.selectedOdds)/100),
      amount: Number(this.betAmount),
      matchUrl: this.matchUrl // Adding the match url to betDetails
    };
    // Add your logic to handle the bet placement here

    this.showBetting = false;
    this.isBetProcessing = true;
    
    console.log('Placing bet...');
    console.log('Selected Odds: ', this.selectedOdds);
    console.log('Bet Amount: ', this.betAmount);

    this.cricketService.placeBet(betDetails).pipe(timeout(10000)).subscribe({
      next: (response: any) => {
        console.log('Bet response received for match bet', response);
        
        // Assuming response.bet contains the bet object
        if (response.bet) {
          const bet = response.bet;
    
          if (bet.status === "Confirmed") {
            this.showToast('Bet placed and confirmed!', 'Close');
          } else if (bet.status === "Cancelled") {
            this.showToast('Bet was cancelled: ' + bet.teamName, 'Close');
          } else {
            this.showToast('Bet status: ' + bet.status, 'Close');
          }
        } else {
          this.showToast('No bet found in the response', 'Close');
        }
    
        this.isBetProcessing = false;
        this.loadUserBets();
      },
      error: (error: any) => {
        if (error.name === 'TimeoutError') {
          console.error('Error placing bet: Request timed out', error);
          this.showToast('Error placing bet: Request timed out', 'Close');
        } else {
          console.error('Error placing bet', error);
          this.showToast('Error placing bet: ' + error.message, 'Close');
        }
        this.isBetProcessing = false;
      }
    });
  }
  getTruncatedTeamName(fullName: string, maxLength: number = 15): string {
    if (fullName.length > maxLength) {
      return fullName.slice(0, maxLength) + '...'; // Truncate and append '...'
    }
    return fullName; // No truncation needed
  }
  placeTestBet(match) {
    
    const betDetails = {
      betType: this.betType,
      teamName: match.teamName,
      odd: Number(this.selectedOdds),
      amount: Number(this.betAmount),
      matchUrl: this.matchUrl // Adding the match url to betDetails
    };
    // Example logic for placing a bet
    console.log(`Placing a ${this.betType} bet on team ${match.teamName} with odds ${this.selectedOdds} and amount ${this.betAmount}`);
    this.showBetting = false;
    this.isBetProcessing = true;
    // Send this data to your backend or process it as needed

    this.cricketService.placeBet(betDetails).subscribe({
      next: (response) => {
        this.showToast('Bet placed waiting for confirmation!', 'Close');
        console.log('Bet placed successfully', response);
        this.showBetting = false; // Hide betting options
        // Additional success handling
        this.checkBetConfirmation(response.betId);
      },
      error: (error) => {
        console.error('Error placing bet', error);
        this.showToast('Error placing bet: ' + error.message, 'Close');
        this.isBetProcessing = false;
        // Error handling
      }
    });
  }

  checkBetConfirmation(betId: number) {
    // Implement WebSocket subscription or polling to check bet status
    // Once confirmed:
    this.betStatusSubscription = this.eventListService.subscribeToBetStatusTopic().subscribe(bet => {
      console.log("Bet status received here after confirmation  ", bet);
      // parse bet json
      const parsedBet = JSON.parse(bet.body);
      if(parsedBet.status === 'Confirmed' && parsedBet.betId === betId) {
        console.log("setting is bet processing to false after confirmation");
        this.showToast('Bet placed Confirmed!', 'Close');
        this.isBetProcessing = false;
        this.loadUserBets();
        this.authService.updateUserDetails(parsedBet.user);
      }
      if(parsedBet.status === 'Cancelled' && parsedBet.betId === betId) {
        console.log("setting is bet processing to false after cancellation");
        this.showToast('Error placing bet', 'Close');
        this.isBetProcessing = false;
        this.loadUserBets();
      }
    });
    // Update UI based on bet confirmation
  }

  updateOddsStep() {
    if (this.selectedOdds > this.prevOdds) {
      // Incrementing odds
      this.oddsStep = this.selectedOdds > 9 ? 1 : 0.1;

    } else if (this.selectedOdds < this.prevOdds) {
      // Decrementing odds
      this.oddsStep = this.selectedOdds > 9 ? -1 : -0.1;
    } else {
      // No change in odds
      this.oddsStep = 0.1;
      return;
    }

    this.selectedOdds = this.prevOdds + this.oddsStep;
    this.selectedOdds = Number(this.selectedOdds.toFixed(1));
    // Update the previous odds value
    this.prevOdds = this.selectedOdds;
  }

  handleOddsBlur() {
    if (this.selectedOdds != null && !isNaN(Number(this.selectedOdds))) {
      this.selectedOdds = parseFloat(Number(this.selectedOdds).toFixed(1));
    } else {
      this.selectedOdds = 0; // or some default value
    }
  }

  handleOddsInputChange(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.selectedOdds = parseFloat(inputValue);
  }

  // Function to toggle the active state of the "lay" button
  toggleLayButton() {
    this.layButtonActive = true;
  }

  // Example modification of the showBettingOptions method to accept match context
  // overload this showBettingOptions method to accept match context
    
  showBettingOptionsForTestMatch(section:string,  index: number , betType:string) {
    this.showBetting = true;
    // If it's a test match, set the selected odds and amount based on the match parameter
    this.currentMatchIndex = index; // Set the current match index
    this.betType = betType;
    
    const match = this.testMatchOdds[index]; // Access the match using the index
    this.betAmount = 0; // Clear the stakes when clicking on odds again


    if (betType === 'back') {
      this.selectedOdds = match.odds.backOdds;
    } else if (betType === 'lay') {
      this.selectedOdds = match.odds.layOdds;
    }
    this.showBettingFor = section;
    // Additional logic to handle the lay button state...
    if (this.showBettingFor == 'testMatchOdds' && betType === 'lay') {
      this.layButtonActive = true;
    }
    if (this.showBettingFor == 'testMatchOdds' && betType === 'back') {
      this.layButtonActive = false;
    }

  }

  loadUserBets(): void {
    this.cricketService.getUserBetsForMatch(this.matchUrl).subscribe(
      (response) => {
        console.log(response);
        if(response.bets.length > 0){
          this.userBets= response.bets;
          this.updatedUserData = this.userBets[0].user;
          this.authService.updateUserDetails(this.updatedUserData);
        }

        if (response && response.adjustedExposures) {
          this.formattedExposures = this.formatAndGroupExposures(response.adjustedExposures);
          // Select the first team to display
          const teamNames = Object.keys(this.formattedExposures);
          if (teamNames.length > 0) {

            let teamName = teamNames[0];
            this.totalPotentialWin = this.formattedExposures[teamName].win;
            this.totalPotentialLoss = this.formattedExposures[teamName].lose;
            this.winFormattedKey = `${teamName} Win`;
            this.loseFormattedKey = `${teamName} Lose`;
          }

          
  
          if (response.sessionExposures) {
            this.sessionExposures = this.formatSessionExposures(response.sessionExposures);
          }
          
          console.log('Total Potential Win:', this.totalPotentialWin);
          console.log('Total Potential Loss:', this.totalPotentialLoss);
          console.log('Win Formatted Key:', this.winFormattedKey);
          console.log('Lose Formatted Key:', this.loseFormattedKey);
        }


      }, 
      (error) => {
        console.error('Error fetching bets:', error);
      }
    );
  }

  // Set the stake amount based on the quick stake button clicked
  setStake(amount: number) {
    this.betAmount += amount;
  }

  formatSessionExposures(sessionExposures: any): any[] {
    const formattedSessionExposures: any[] = [];
    Object.keys(sessionExposures).forEach(key => {
      formattedSessionExposures.push({
        name: key,
        amount: sessionExposures[key]
      });
    });
    return formattedSessionExposures;
  }

  formatAdjustedExposures(exposures: any): any {
    const formattedExposures = {};

    Object.keys(exposures).forEach(key => {
        const parts = key.split(' ');
        const teamName = parts[0];
        const outcome = parts[parts.length - 1].toLowerCase();
        const formattedKey = `${teamName} ${outcome}`;
        formattedExposures[formattedKey] = exposures[key];

        if (outcome === 'win') {
            this.totalPotentialWin = exposures[key];
            this.winFormattedKey = formattedKey;
            
        } else if (outcome === 'lose') {
            this.totalPotentialLoss = exposures[key];
            this.loseFormattedKey = formattedKey;
        }
    });

    return formattedExposures;
}

onTabChange(event: MatTabChangeEvent) {
  this.selectedTabIndex = event.index;

  // Give each primary match surface its own shareable, crawlable URL. The
  // match SEO policy still canonicalizes these supporting routes back to the
  // stable /cric-live/{slug} URL, so this improves intent capture without
  // creating canonical duplicates.
  var slug = this.getCanonicalMatchSlug();
  var routeByIndex: { [index: number]: string } = {
    0: 'commentary',
    1: 'match-details',
    2: 'scorecard',
    3: 'lineups',
    4: 'match-intelligence'
  };
  var keyByIndex: { [index: number]: MatchPageTabKey } = {
    0: 'commentary',
    1: 'details',
    2: 'scorecard',
    3: 'lineups',
    4: 'intelligence'
  };

  // MatTabGroup also emits when its selected index is updated from the route.
  // Compare against that route, not a potentially stale previous index, so a
  // real user tap is never discarded after moving between child routes.
  var requestedKey = this.resolveRequestedTabKey();
  if (requestedKey && this.tabIndexByKey[requestedKey] === event.index) {
    // A direct child URL (especially after mobile browser restoration) can
    // select Material's tab before the component's first fetch settles.
    // Re-run the tab's lightweight loader; it is internally de-duplicated.
    this.ensureDataForTab(event.index);
    return;
  }

  // A bare canonical match URL deliberately picks a useful lifecycle default
  // (completed => scorecard, upcoming => details) after its data arrives.
  // Material emits selectedTabChange for that programmatic choice as well.
  // Treat it as rendering state, not as a user navigation: otherwise a
  // canonical completed URL silently turns into its /scorecard child route
  // during hydration and breaks URL-level SSR/browser parity.
  if (!requestedKey
    && !this.hasUserSelectedTab
    && this.tabIndexByKey[this.resolveLifecycleDefaultTab()] === event.index) {
    this.ensureDataForTab(event.index);
    return;
  }

  this.hasUserSelectedTab = true;
  this.ensureDataForTab(event.index);

  if (!slug) {
    return;
  }

  var suffix = routeByIndex[event.index];
  if (suffix) {
    this.router.navigate(['/cric-live', slug, suffix]);
  }
}

jumpToMatchSection(target: MatchPageTabKey, event?: Event): void {
  if (event) {
    event.preventDefault();
  }

  var index = this.tabIndexByKey[target];
  if (index === undefined || index === null) {
    return;
  }

  this.selectedTabIndex = index;
  this.hasUserSelectedTab = true;
  if (target === 'details') {
    this.matchDetailsOpen = true;
    this.fetchMatchInfo(this.matchId || this.currentUrl);
  }
  this.ensureDataForTab(index);

  if (!this.isBrowser()) {
    return;
  }

  var targetId = target === 'details' ? 'match-info' : target;
  setTimeout(function() {
    var section = document.getElementById(targetId);
    if (section && section.scrollIntoView) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + targetId);
    }
  }, 30);
}

onMatchDetailsToggle(event: Event): void {
  var disclosure = event.target as HTMLDetailsElement;
  this.matchDetailsOpen = !!(disclosure && disclosure.open);

  if (this.matchDetailsOpen && !this.matchInfo && !this.isLoadingMatchInfo) {
    this.fetchMatchInfo(this.matchId || this.currentUrl);
  }
}

fetchScorecardInfo(matchUrl:string){
  if (!this.shouldLoadScorecard()) {
    this.isLoadingScorecard = false;
    this.scorecardData = null;
    return;
  }

  this.isLoadingScorecard = true;
  var scorecardRequest = this.cricketService.getScorecardInfo(matchUrl);
  if (!this.isBrowser()) {
    // Do not let a slow missing scorecard force SSR to fall back to the bare Angular shell.
    scorecardRequest = scorecardRequest.pipe(timeout(2500));
  }

  scorecardRequest.pipe(takeUntil(this.destroy$)).subscribe(
    data => {
      this.scorecardData = data;
      this.isLoadingScorecard = false;
      console.log('Match Scorecard:', this.scorecardData);
    },
    error => {
      this.isLoadingScorecard = false;
      this.scorecardData = null;
      console.error('Error fetching match scorecard:', error);
    }
  );
}

fetchMatchInfo(matchUrl:string) {
  if (this.isLoadingMatchInfo) {
    return;
  }

  if (this.matchInfo && !this.isFallbackMatchInfo) {
    // SSR hydration has already supplied authoritative match metadata.  It
    // must still produce the one canonical browser page-view event; otherwise
    // only client-side refetches are visible in the analytics funnel.
    this.trackCanonicalMatchView();
    return;
  }

  this.isLoadingMatchInfo = true;
  this.cricketService.getMatchInfo(matchUrl).subscribe(
    data => {
      if (!data || typeof data !== 'object') {
        // The stale-while-revalidate service can complete without emitting
        // when a mobile request is interrupted or the upstream returns an
        // empty response. Do not leave the Details tab on its spinner.
        this.isLoadingMatchInfo = false;
        this.populateFallbackMatchInfo();
        this.syncMatchTabSelection();
        return;
      }
      this.matchInfo = data;
      this.isFallbackMatchInfo = false;
      this.isLoadingMatchInfo = false;
      var resolvedStatus = data && (data.match_status || data.status);
      if (resolvedStatus) {
        // Match-info is the authoritative direct-route identity source. Keep
        // the series and short team codes on the route match so retained SSR
        // navigation can resolve only the matching series standings.
        var metadataTeamCodes = data && data.team_comparison && typeof data.team_comparison === 'object'
          ? Object.keys(data.team_comparison).filter((code) => !!String(code || '').trim())
          : [];
        var existingMatch = this.currentMatch || {};
        this.currentMatch = Object.assign({}, this.currentMatch || {}, {
          status: resolvedStatus,
          url: data.url || (this.currentMatch && (this.currentMatch.url || this.currentMatch.matchUrl)) || matchUrl,
          seriesName: data.series_name || data.match_name || existingMatch.seriesName,
          team1: metadataTeamCodes[0] ? Object.assign({}, existingMatch.team1 || {}, { shortName: metadataTeamCodes[0] }) : existingMatch.team1,
          team2: metadataTeamCodes[1] ? Object.assign({}, existingMatch.team2 || {}, { shortName: metadataTeamCodes[1] }) : existingMatch.team2
        });
        this.showLiveHero = this.isLiveLikeStatus(resolvedStatus);
        this.heroFallbackView = this.buildHeroFallbackView(this.currentMatch);
        // Direct canonical SSR begins with a route-only match identity, so the
        // retained completed-record resolver cannot safely run until this
        // response establishes lifecycle and series metadata. Re-enter the
        // fallback context here so its HTTP work remains inside the SSR zone.
        this.updateSeriesFallbackContext(this.currentMatch);
      }
      this.syncMatchTabSelection();
      // Supporting routes are lazy: only load their data after the match
      // metadata has established the lifecycle (especially upcoming vs live).
      this.ensureDataForTab(this.selectedTabIndex);
      console.log('Match Info:', this.matchInfo);

      // Store in TransferState on the server for client hydration
      if (!this.isBrowser()) {
        this.transferState.set(MATCH_INFO_KEY, data);
      }

      // T045: Update browser tab title with team names (Feature 008 - SEO)
      this.updatePageTitle();
      this.trackCanonicalMatchView();

      // Extract keys
      this.teamComparisonKeys = Object.keys(this.matchInfo.team_comparison || {});
      if (this.teamComparisonKeys.length) {
        this.teamComparisonSubKeys = Object.keys(this.matchInfo.team_comparison[this.teamComparisonKeys[0]]);
      }
      this.venueStatsKeys = Object.keys(this.matchInfo.venue_stats || {});
      this.playingXIKeys = Object.keys(this.matchInfo.playing_xi || {});
      this.teamFormKeys = Object.keys(this.matchInfo.team_form || {});

      this.setVenuePercentages();
    },
    error => {
      this.isLoadingMatchInfo = false;
      console.error('Error fetching match info:', error);
      this.populateFallbackMatchInfo();
      this.syncMatchTabSelection();
    },
    () => {
      // `getMatchInfo` intentionally turns network failures into an empty
      // observable so cached data can still win. A no-cache mobile request
      // therefore reaches complete rather than error; settle it here.
      if (this.isLoadingMatchInfo) {
        this.isLoadingMatchInfo = false;
        this.populateFallbackMatchInfo();
        this.syncMatchTabSelection();
      }
    }
  );
}

private trackCanonicalMatchView(): void {
  if (this.hasTrackedCanonicalMatchView || !this.isBrowser()) {
    return;
  }

  var matchSlug = this.getCanonicalMatchSlug();
  var lifecycle = this.getCanonicalAnalyticsLifecycle();
  if (!matchSlug || !lifecycle) {
    return;
  }

  this.hasTrackedCanonicalMatchView = true;
  this.analyticsService.trackCanonicalMatchView({
    matchSlug: matchSlug,
    matchPath: '/cric-live/' + matchSlug,
    lifecycle: lifecycle,
    surface: 'cric-live'
  });
}

private getCanonicalAnalyticsLifecycle(): 'upcoming' | 'live' | 'completed' | null {
  if (this.canonicalIntelligence && this.canonicalIntelligence.lifecycle) {
    return this.canonicalIntelligence.lifecycle;
  }

  var status = this.getResolvedMatchStatus();
  if (this.isCompletedStatus(status)) {
    return 'completed';
  }
  if (this.isUpcomingStatus(status)) {
    return 'upcoming';
  }
  if (this.isLiveLikeStatus(status)) {
    return 'live';
  }
  return null;
}

private resolveRouteMatch(matchSlug: string): void {
  if (!matchSlug) {
    return;
  }

  // The route slug is already a complete match identity. The old resolver
  // refetched live + upcoming + completed catalogs just to find that same
  // match, which caused three disruptive requests on every match surface.
  // Navigation state may provide richer card metadata; direct URLs use this
  // lightweight identity until match-info responds.
  var routeMatch = this.currentMatch && this.routeSlugMatches(matchSlug, this.currentMatch)
    ? this.currentMatch
    : {
        url: this.matchUrl || matchSlug,
        externalMatchKey: this.matchId || matchSlug,
        status: null
      };

  this.currentMatch = routeMatch;
  this.applyServerRetainedEntityNavigation(matchSlug);
  // A direct mobile URL has no navigation-state card.  Seed the hero with a
  // non-blocking fallback immediately so a failed live-snapshot request can
  // never leave the first screen on an infinite loader.
  this.heroFallbackView = this.buildHeroFallbackView(routeMatch);
  this.updateSeriesFallbackContext(routeMatch);
  this.updatePageTitle();
  this.fetchPlayerStatsForMatch(routeMatch, matchSlug);
}

private applyServerRetainedEntityNavigation(matchSlug: string): void {
  var navigation = this.request && this.request.retainedEntityNavigation;
  if (!navigation || navigation.slug !== matchSlug || !navigation.series || !navigation.series.externalId) {
    return;
  }
  this.resolvedSeriesContext = navigation.series;
  this.retainedEntityTeams = Array.isArray(navigation.teams) ? navigation.teams : [];
  this.retainedEntityResolutionKey = matchSlug;
}

private getNavigationMatchHint(routeMatchKey: string): any {
  if (!this.isBrowser()) {
    return null;
  }
  var state = window && window.history ? window.history.state : null;
  var match = state && state.match ? state.match : null;
  if (!match || !this.routeSlugMatches(routeMatchKey, match)) {
    return null;
  }
  return match;
}

private applyRouteMatchHint(match: any): void {
  if (!match) {
    return;
  }

  this.currentMatch = match;
  this.showLiveHero = this.isLiveLikeStatus(match.status);
  this.heroFallbackView = this.buildHeroFallbackView(match);
  this.updateSeriesFallbackContext(match);

  if (!this.matchUrl && match.matchUrl) {
    this.matchUrl = match.matchUrl;
  } else if (!this.matchUrl && match.url) {
    this.matchUrl = match.url;
  }

  if (!this.matchInfo || this.isFallbackMatchInfo) {
    this.populateFallbackMatchInfo(match);
  }
  this.updatePageTitle();
  this.syncMatchTabSelection();
}

private routeSlugMatches(matchSlug: string, match: any): boolean {
  if (!match) {
    return false;
  }

  var externalKey = match.externalMatchKey;
  if (externalKey && externalKey === matchSlug) {
    return true;
  }

  var sourceUrl = match.url || match.matchUrl;
  var urlSlug = sourceUrl ? extractSlugFromUrl(sourceUrl) : null;
  if (urlSlug && urlSlug === matchSlug) {
    return true;
  }

  if (match.id && match.id === matchSlug) {
    return true;
  }

  return !!(sourceUrl && sourceUrl.indexOf(matchSlug) !== -1);
}

private isLiveLikeStatus(status: string | null | undefined): boolean {
  var normalized = this.normalizeMatchStatus(status);
  return normalized === 'LIVE' || normalized === 'INNINGS_BREAK' || normalized === 'RAIN_DELAY';
}

private fetchPlayerStatsForMatch(match?: any, fallbackExternalKey?: string): void {
  var externalMatchKey = match && match.externalMatchKey ? match.externalMatchKey : (this.matchId || fallbackExternalKey);
  var matchUrl = externalMatchKey ? undefined : (match && match.url ? match.url : (this.matchUrl || this.currentUrl));
  var hasFreshCachedSnapshot = this.cricketService.hasFreshPlayerStatsMatchCache(matchUrl, externalMatchKey);

  if (!matchUrl && !externalMatchKey) {
    return;
  }

  if (this.playerStatsRetryTimer) {
    clearTimeout(this.playerStatsRetryTimer);
    this.playerStatsRetryTimer = null;
  }

  this.isLoadingPlayerStats = !hasFreshCachedSnapshot && !this.hasPlayerStatsData();
  this.playerStatsError = false;

  this.cricketService.getPlayerStatsMatch(matchUrl, externalMatchKey)
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (data: PlayerStatsMatchView | null) => {
        this.isLoadingPlayerStats = false;
        if (data && data.teams && data.teams.length > 0) {
          this.playerStatsMatch = this.mergeSeriesFallbackIntoMatch(data);
          this.playerStatsError = false;
          this.playerStatsRetryAttempt = 0;
          return;
        }
        if (!this.playerStatsMatch) {
          this.playerStatsError = true;
          this.schedulePlayerStatsRetry(match, fallbackExternalKey);
        }
      },
      error => {
        console.error('Error loading player stats snapshot:', error);
        this.isLoadingPlayerStats = false;
        this.playerStatsError = true;
      }
    );
}

private schedulePlayerStatsRetry(match?: any, fallbackExternalKey?: string): void {
  // Never retry during SSR: a pending setTimeout keeps the Universal zone
  // unstable, so the server render timeout ships the thin fallback shell
  // instead of the full match page. The browser hydrates and runs its own
  // fetch + retry cycle there.
  if (!this.isBrowser()) {
    return;
  }
  if (this.playerStatsRetryAttempt >= 3) {
    return;
  }
  this.playerStatsRetryAttempt += 1;
  this.playerStatsRetryTimer = setTimeout(() => {
    this.playerStatsRetryTimer = null;
    this.fetchPlayerStatsForMatch(match || this.currentMatch, fallbackExternalKey || this.matchId || undefined);
  }, 3000 * this.playerStatsRetryAttempt);
}

private stripLegacyMatchUrlParam(matchSlug: string): void {
  this.router.navigate(['/cric-live', matchSlug], { replaceUrl: true });
}

private tryAppendRecentBallFromLiveUpdate(): boolean {
  if (!this.cricObj) {
    return false;
  }

  var candidateBall = this.cricObj.current_ball;
  if (candidateBall === undefined || candidateBall === null || String(candidateBall).trim() === '') {
    candidateBall = this.cricObj.score_update;
  }
  if (candidateBall === undefined || candidateBall === null || String(candidateBall).trim() === '') {
    candidateBall = this.cricObj.runs_on_ball;
  }

  if (candidateBall === undefined || candidateBall === null || String(candidateBall).trim() === '') {
    return false;
  }

  var recentBall = this.toRecentBallView(candidateBall);
  if (!recentBall || recentBall.kind === 'other') {
    return false;
  }

  var overToken = this.cricObj.over !== undefined && this.cricObj.over !== null
    ? String(this.cricObj.over).trim()
    : '';
  var eventToken = overToken + '|' + recentBall.rawScore;
  if (eventToken === this.lastLiveBallEventToken) {
    return false;
  }

  this.lastLiveBallEventToken = eventToken;

  var existingBalls = this.last6Balls.map((ball) => ball.rawScore);
  if (!overToken && existingBalls.length > 0 && existingBalls[existingBalls.length - 1] === recentBall.rawScore) {
    return false;
  }

  existingBalls.push(recentBall.rawScore);
  this.last6Balls = this.buildRecentBalls(existingBalls.slice(-6));
  return true;
}

hasPlayerStatsData(): boolean {
  return !!(this.playerStatsMatch && this.playerStatsMatch.teams && this.playerStatsMatch.teams.length);
}

getPlayerStatsTeams(): PlayerStatsTeamView[] {
  return this.playerStatsMatch && this.playerStatsMatch.teams ? this.playerStatsMatch.teams : [];
}

getDeduplicatedSquadTeams(): PlayerStatsTeamView[] {
  var teams = this.getPlayerStatsTeams();
  var result: PlayerStatsTeamView[] = [];
  var seenSquadKeys: string[] = [];
  for (var i = 0; i < teams.length; i++) {
    var team = teams[i];
    if (!team || !team.squad || !team.squad.length) { continue; }
    // Build a fingerprint from first 3 player externalIds to detect duplicate squads
    var fp = team.squad.slice(0, 3).map(function(p) { return p.externalId || p.name || ''; }).join('|');
    var isDupe = false;
    for (var j = 0; j < seenSquadKeys.length; j++) {
      if (seenSquadKeys[j] === fp) { isDupe = true; break; }
    }
    if (isDupe) { continue; }
    seenSquadKeys.push(fp);
    result.push(team);
  }
  return result;
}

openSquadPlayer(player: PlayerStatsSquadPlayerView, team: PlayerStatsTeamView): void {
  if (!player) {
    return;
  }
  if (!player.externalId) {
    this.loadPlayerStatsDetailFromGlobalSearch(player.name, 'lineups', player.role);
    return;
  }
  this.loadPlayerStatsDetail(player, team, 'lineups');
}

trackByPlayerStatsTeam(index: number, team: PlayerStatsTeamView): string {
  return team && (team.externalId || team.name) ? String(team.externalId || team.name) : 'team-' + index;
}

trackByPlayerStatsPlayer(index: number, player: PlayerStatsSquadPlayerView): string {
  return player && (player.externalId || player.name) ? String(player.externalId || player.name) : 'player-' + index;
}

getPlayerStatsSummary(player: PlayerStatsSquadPlayerView): string {
  var batting = this.findPlayerSnapshot(player, 'live_batting');
  var bowling = this.findPlayerSnapshot(player, 'live_bowling');
  var seed = this.findPlayerSnapshot(player, 'seed_context');

  if (batting && batting.payload) {
    var battingPayload = batting.payload;
    var battingParts: string[] = [];
    if (battingPayload.score != null && battingPayload.ballsFaced != null) {
      battingParts.push(battingPayload.score + ' (' + battingPayload.ballsFaced + ')');
    }
    if (battingPayload.strikeRate != null) {
      battingParts.push('SR ' + battingPayload.strikeRate);
    }
    return battingParts.join(' • ') || 'Live batting snapshot';
  }

  if (bowling && bowling.payload) {
    var bowlingPayload = bowling.payload;
    var bowlingParts: string[] = [];
    if (bowlingPayload.wicketsTaken != null && bowlingPayload.score != null) {
      bowlingParts.push(bowlingPayload.wicketsTaken + '/' + bowlingPayload.score);
    }
    if (bowlingPayload.ballsBowled != null) {
      bowlingParts.push(bowlingPayload.ballsBowled + ' balls');
    }
    if (bowlingPayload.economyRate != null) {
      bowlingParts.push('Econ ' + bowlingPayload.economyRate);
    }
    return bowlingParts.join(' • ') || 'Live bowling snapshot';
  }

  if (seed && seed.payload) {
    var seedPayload = seed.payload;
    var seedParts: string[] = [];
    if (player.role) {
      seedParts.push(player.role);
    } else if (seedPayload.playerRole) {
      seedParts.push(seedPayload.playerRole);
    }
    if (player.lineupOrder != null) {
      seedParts.push('XI #' + player.lineupOrder);
    } else if (seedPayload.lineupOrder != null) {
      seedParts.push('XI #' + seedPayload.lineupOrder);
    }
    return seedParts.join(' • ') || 'Playing XI snapshot ready';
  }

  return player.role ? player.role : 'Snapshot pending';
}

getPlayerStatsUpdatedAt(player: PlayerStatsSquadPlayerView): number | null {
  if (!player || !player.stats || player.stats.length === 0) {
    return null;
  }
  var timestamps = player.stats
    .map(function(stat: PlayerStatsSnapshotView) { return stat && stat.capturedAt ? stat.capturedAt : null; })
    .filter(function(value: number | null) { return value !== null; }) as number[];
  if (!timestamps.length) {
    return null;
  }
  return Math.max.apply(null, timestamps);
}

private findPlayerSnapshot(player: PlayerStatsSquadPlayerView, category: string): PlayerStatsSnapshotView | null {
  if (!player || !player.stats) {
    return null;
  }
  for (var i = 0; i < player.stats.length; i++) {
    if (player.stats[i] && player.stats[i].category === category) {
      return player.stats[i];
    }
  }
  return null;
}

resetStatsExplorerState(): void {
  this.statsExplorerSource = null;
  this.selectedStatsExplorerType = null;
  this.selectedStatsExplorerPlayer = null;
  this.selectedStatsExplorerTeam = null;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = false;
  this.statsExplorerErrorMessage = null;
}

shouldShowStatsExplorer(): boolean {
  return !!(this.matchId && (
    this.hasPlayerStatsData() ||
    this.hasSeriesStatsContext() ||
    this.isLoadingPlayerStats ||
    this.playerStatsError ||
    this.hasSelectedStatsExplorer()
  ));
}

hasSelectedStatsExplorer(): boolean {
  return !!(this.selectedStatsExplorerType && (
    (this.selectedStatsExplorerType === 'player' && this.selectedPlayerStatsDetail) ||
    (this.selectedStatsExplorerType === 'team' && this.selectedTeamStatsDetail) ||
    (this.selectedStatsExplorerType === 'series' && this.selectedSeriesStatsDetail)
  ));
}

hasSeriesStatsContext(): boolean {
  return !!(this.getPlayerStatsSeries() && this.getPlayerStatsSeries().externalId) || !!this.seriesPageUrlFallback;
}

openPlayerStatsFromLineups(selection: PlayerStatsSelectionEvent): void {
  var team = this.findTeamReference(selection.teamExternalId, selection.teamName);
  var player = this.findPlayerReference(selection.externalId, selection.playerName, team);

  // Fallback: search all teams by name if reference lookup failed
  if (!player || !player.externalId) {
    var byName = this.findPlayerByName(selection.playerName);
    if (byName && byName.player && byName.player.externalId) {
      player = byName.player;
      team = byName.team;
    }
  }

  if (!player || !player.externalId) {
    // Upcoming lineups commonly arrive before the match-level player snapshot.
    // Resolve the selected player from the player catalog only when requested,
    // instead of making the click depend on background match ingestion.
    this.loadPlayerStatsDetailFromGlobalSearch(selection.playerName, 'lineups', selection.role);
    return;
  }

  this.loadPlayerStatsDetail(player, team, 'lineups');
}

openPlayerStatsFromScorecard(playerName: string): void {
  var resolved = this.findPlayerByName(playerName);
  if (resolved && resolved.player && resolved.player.externalId) {
    this.loadPlayerStatsDetail(resolved.player, resolved.team, 'scorecard');
    return;
  }

  this.loadPlayerStatsDetailFromGlobalSearch(playerName);
}

openTeamStatsFromSelection(selection: TeamStatsSelectionEvent, source: 'lineups' | 'scorecard' = 'lineups'): void {
  var team = this.findTeamReference(selection.externalId, selection.teamName);
  if (!team || !team.externalId) {
    this.showToast('Team stats are not available yet.', 'Dismiss');
    return;
  }

  this.loadTeamStatsDetail(team, source);
}

openTeamStats(team: PlayerStatsTeamView, source: 'lineups' | 'scorecard' = 'lineups'): void {
  if (!team || !team.externalId) {
    this.showToast('Team stats are not available yet.', 'Dismiss');
    return;
  }

  this.loadTeamStatsDetail(team, source);
}

openSeriesStandings(source: 'lineups' | 'scorecard' = 'lineups'): void {
  var series = this.getPlayerStatsSeries();
  if ((!series || !series.externalId) && this.seriesPageUrlFallback) {
    if (!this.isBrowser()) {
      return;
    }
    window.open(this.seriesPageUrlFallback, '_blank');
    return;
  }

  if (!series || !series.externalId) {
    this.showToast('Tournament standings are not available yet.', 'Dismiss');
    return;
  }

  this.statsExplorerSource = source;
  this.selectedStatsExplorerType = 'series';
  this.selectedStatsExplorerPlayer = null;
  this.selectedStatsExplorerTeam = null;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = true;
  this.statsExplorerErrorMessage = null;

  this.cricketService.getPlayerStatsSeriesStandings(series.externalId, this.getPlayerStatsSource())
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (data: PlayerStatsSeriesDetailView | null) => {
        this.isLoadingStatsExplorer = false;
        if (data) {
          this.selectedSeriesStatsDetail = data;
          return;
        }
        this.statsExplorerErrorMessage = 'Tournament standings are not available for this series yet.';
      },
      error => {
        console.error('Error loading series standings:', error);
        this.isLoadingStatsExplorer = false;
        this.statsExplorerErrorMessage = 'Tournament standings could not be loaded right now.';
      }
    );
}

closeStatsExplorerSelection(): void {
  this.statsExplorerSource = null;
  this.selectedStatsExplorerType = null;
  this.selectedStatsExplorerPlayer = null;
  this.selectedStatsExplorerTeam = null;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = false;
  this.statsExplorerErrorMessage = null;
}

getPlayerStatsSeries(): PlayerStatsSeriesView | null {
  // A partial per-match payload can name a series without its stable ID. Do
  // not let that shadow the request-prefetched, authoritative retained-series
  // entity used for canonical SSR links.
  if (this.playerStatsMatch && this.playerStatsMatch.series && this.playerStatsMatch.series.externalId) {
    return this.playerStatsMatch.series;
  }
  return this.resolvedSeriesContext;
}

private mergeSeriesFallbackIntoMatch(data: PlayerStatsMatchView): PlayerStatsMatchView {
  if (!data) {
    return data;
  }

  if (data.series && data.series.externalId) {
    this.resolvedSeriesContext = data.series;
    return data;
  }

  if (!this.resolvedSeriesContext) {
    return data;
  }

  return {
    ...data,
    series: {
      ...this.resolvedSeriesContext,
      ...(data.series || {})
    }
  };
}

private updateSeriesFallbackContext(match: any): void {
  var matchUrl = match && match.url ? match.url : (this.matchUrl || this.currentUrl || '');
  var seriesCode = this.extractSeriesCodeFromUrl(matchUrl);
  var seriesName = match && match.seriesName ? String(match.seriesName).trim() : '';

  this.seriesPageUrlFallback = this.buildSeriesPageUrl(seriesName, seriesCode);
  this.resolvedSeriesContext = seriesName ? {
    externalId: seriesCode || undefined,
    name: seriesName,
    shortName: seriesName
  } : null;

  this.resolveRetainedEntityNavigation(match);
}

private resolveRetainedEntityNavigation(match: any): void {
  if (!match || !this.isCompletedStatus(match.status) || this.hasPlayerStatsData()) {
    return;
  }

  var seriesName = String(match.seriesName || (this.matchSeo && this.matchSeo.series) || '').trim();
  var matchKey = String(match.externalMatchKey || match.url || this.getCanonicalMatchSlug() || '').trim();
  if (!seriesName || !matchKey || this.isResolvingRetainedEntities || this.retainedEntityResolutionKey === matchKey) {
    return;
  }

  this.isResolvingRetainedEntities = true;
  this.retainedEntityResolutionKey = matchKey;
  // The direct route's match-info callback can be delivered outside Angular's
  // tracked zone on Universal. Re-enter it explicitly: otherwise the list
  // request starts after SSR declares stability and the canonical document
  // ships before its exact entity identities exist.
  this.ngZone.run(() => {
    this.cricketService.listSeries(undefined, seriesName)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((seriesList: PlayerStatsSeriesView[]) => {
        var matchingSeries = (seriesList || []).filter((series) =>
          this.isExactRetainedSeriesMatch(series, seriesName, matchKey)
          && !!(series && series.externalId)
        );
        if (matchingSeries.length !== 1) {
          this.isResolvingRetainedEntities = false;
          return;
        }

        var series = matchingSeries[0];
        this.resolvedSeriesContext = series;
        this.cricketService.getPlayerStatsSeriesStandings(series.externalId)
          .pipe(take(1), takeUntil(this.destroy$))
          .subscribe((detail: PlayerStatsSeriesDetailView | null) => {
            this.retainedEntityTeams = this.extractRetainedSeriesTeams(detail, match);
            this.isResolvingRetainedEntities = false;
          }, () => {
            this.isResolvingRetainedEntities = false;
          });
      }, () => {
        this.isResolvingRetainedEntities = false;
      });
  });
}

private isExactRetainedSeriesMatch(series: PlayerStatsSeriesView, seriesName: string, matchKey: string): boolean {
  var candidate = this.normalizeComparableText(series && series.name);
  var base = this.normalizeComparableText(seriesName);
  if (!candidate || !base) {
    return false;
  }
  if (candidate === base) {
    return true;
  }
  var qualifier = /(?:^|-)women(?:-|$)/i.test(matchKey) ? 'women'
    : /(?:^|-)men(?:-|$)/i.test(matchKey) ? 'men' : '';
  return !!qualifier && candidate === base + ' ' + qualifier;
}

private extractRetainedSeriesTeams(detail: PlayerStatsSeriesDetailView | null, match: any): PlayerStatsTeamView[] {
  var codes = [match && match.team1 && match.team1.shortName, match && match.team2 && match.team2.shortName]
    .map((value) => this.normalizeComparableText(value))
    .filter((value) => !!value);
  if (!detail || !codes.length) {
    return [];
  }

  var result: PlayerStatsTeamView[] = [];
  var seen: { [key: string]: boolean } = {};
  var groups: any[] = ([] as any[]).concat((detail as any).standings || [], (detail as any).stats || []);
  groups.forEach((group) => {
    var rows = group && group.payload;
    if (!Array.isArray(rows)) {
      return;
    }
    rows.forEach((row) => {
      var externalId = String(row && (row.teamExternalId || row.externalId) || '').trim();
      var code = this.normalizeComparableText(row && (row.teamCode || row.shortName));
      var name = String(row && (row.teamName || row.name || row.Team) || '').trim();
      if (!externalId || !name || !code || codes.indexOf(code) === -1 || seen[externalId]) {
        return;
      }
      seen[externalId] = true;
      result.push({ externalId: externalId, name: name, shortName: row.teamCode || row.shortName, teamCode: row.teamCode });
    });
  });

  return result;
}

private extractSeriesCodeFromUrl(url: string | null | undefined): string | null {
  if (!url || url.indexOf('/scoreboard/') === -1) {
    return null;
  }

  var trimmed = String(url).trim();
  var segments = trimmed.split('/scoreboard/')[1].split('/');
  if (segments.length < 2 || !segments[1]) {
    return null;
  }

  try {
    return decodeURIComponent(segments[1]).toUpperCase();
  } catch (_) {
    return String(segments[1]).toUpperCase();
  }
}

private buildSeriesPageUrl(seriesName: string, seriesCode: string | null): string | null {
  var normalizedName = this.slugifySeriesName(seriesName);
  if (!normalizedName || !seriesCode) {
    return null;
  }
  return 'https://crex.com/series/' + normalizedName + '-' + seriesCode;
}

private slugifySeriesName(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

getStatsExplorerHeading(): string {
  switch (this.selectedStatsExplorerType) {
    case 'player':
      return (this.selectedPlayerStatsDetail && this.selectedPlayerStatsDetail.name) || (this.selectedStatsExplorerPlayer && this.selectedStatsExplorerPlayer.name) || 'Player details';
    case 'team':
      return (this.selectedTeamStatsDetail && this.selectedTeamStatsDetail.name) || (this.selectedStatsExplorerTeam && this.selectedStatsExplorerTeam.name) || 'Team details';
    case 'series':
      var playerStatsSeries = this.getPlayerStatsSeries();
      return (this.selectedSeriesStatsDetail && this.selectedSeriesStatsDetail.series && this.selectedSeriesStatsDetail.series.name)
        || (playerStatsSeries && playerStatsSeries.name)
        || 'Tournament table';
    default:
      return 'Stats explorer';
  }
}

getStatsExplorerSubheading(): string {
  if (this.selectedStatsExplorerType === 'player' && this.selectedPlayerStatsDetail) {
    var playerMeta: string[] = [];
    if (this.selectedPlayerStatsDetail.role) {
      playerMeta.push(this.selectedPlayerStatsDetail.role);
    }
    if (this.selectedPlayerStatsDetail.country) {
      playerMeta.push(this.selectedPlayerStatsDetail.country);
    }
    return playerMeta.join(' • ');
  }

  if (this.selectedStatsExplorerType === 'team' && this.selectedTeamStatsDetail) {
    return this.selectedTeamStatsDetail.teamCode || this.selectedTeamStatsDetail.shortName || '';
  }

  if (this.selectedStatsExplorerType === 'series') {
    var series = this.selectedSeriesStatsDetail && this.selectedSeriesStatsDetail.series
      ? this.selectedSeriesStatsDetail.series
      : this.getPlayerStatsSeries();
    if (!series) {
      return '';
    }

    return [series.shortName, series.seasonName].filter(Boolean).join(' • ');
  }

  return 'Tap a player, team or tournament table to inspect richer CREX stats.';
}

hasSnapshotCards(stats: PlayerStatsSnapshotView[] | null | undefined): boolean {
  return !!(stats && stats.length);
}

trackByStatsSnapshot(index: number, snapshot: PlayerStatsSnapshotView): string {
  return snapshot && (snapshot.category || snapshot.label)
    ? String(snapshot.category || snapshot.label)
    : 'snapshot-' + index;
}

isSnapshotObjectPayload(payload: any): boolean {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return false;
  }
  // Not a table wrapper {headers, rows} or recent_form {batting, bowling}
  if (this.isHeaderRowsPayload(payload) || this.isRecentFormPayload(payload)) {
    return false;
  }
  // If it has a nested 'profile' key, unwrap it
  if (payload.profile && typeof payload.profile === 'object' && !Array.isArray(payload.profile)) {
    return true;
  }
  return true;
}

isHeaderRowsPayload(payload: any): boolean {
  return !!payload
    && !Array.isArray(payload)
    && typeof payload === 'object'
    && Array.isArray(payload.rows)
    && payload.rows.length > 0;
}

isRecentFormPayload(payload: any): boolean {
  return !!payload
    && !Array.isArray(payload)
    && typeof payload === 'object'
    && (Array.isArray(payload.batting) || Array.isArray(payload.bowling));
}

unwrapPayloadRows(payload: any): any[] {
  if (this.isHeaderRowsPayload(payload)) {
    return payload.rows;
  }
  return [];
}

getHeaderRowsColumns(payload: any): string[] {
  if (!this.isHeaderRowsPayload(payload)) {
    return [];
  }

  var headers = Array.isArray(payload.headers) ? payload.headers.filter(Boolean) : [];
  if (headers.length) {
    return headers;
  }

  return this.getSnapshotTableColumns(payload.rows);
}

unwrapProfileEntries(payload: any): Array<{ key: string; value: string }> {
  var source = (payload && payload.profile && typeof payload.profile === 'object')
    ? payload.profile
    : payload;
  if (!source || Array.isArray(source) || typeof source !== 'object') {
    return [];
  }
  var skipKeys = ['bio', 'pageTitle', 'url', 'sourceMatchUrl', 'headers', 'rows', 'batting', 'bowling'];
  return Object.keys(source)
    .filter(function(key: string) { return skipKeys.indexOf(key) === -1; })
    .filter(function(key: string) {
      var v = source[key];
      return v !== null && v !== undefined && v !== '' && typeof v !== 'object';
    })
    .map(function(key: string) {
      return { key: key, value: String(source[key]) };
    });
}

getRecentFormBatting(payload: any): any[] {
  if (!payload || !Array.isArray(payload.batting)) { return []; }
  // Skip the header-like first entry
  return payload.batting.filter(function(entry: any) {
    return entry && entry.scorecard_url && entry.scorecard_url !== payload.batting[0].scorecard_url;
  }).slice(0, 10);
}

getRecentFormBowling(payload: any): any[] {
  if (!payload || !Array.isArray(payload.bowling)) { return []; }
  return payload.bowling.filter(function(entry: any) {
    return entry && entry.scorecard_url && entry.scorecard_url !== payload.bowling[0].scorecard_url;
  }).slice(0, 10);
}

isSnapshotTablePayload(payload: any): boolean {
  return Array.isArray(payload)
    && payload.length > 0
    && payload.every(function(row: any) {
      return !!row && !Array.isArray(row) && typeof row === 'object';
    });
}

isSnapshotPrimitiveList(payload: any): boolean {
  return Array.isArray(payload) && !this.isSnapshotTablePayload(payload);
}

getSnapshotPayloadEntries(payload: any): Array<{ key: string; value: any }> {
  if (!this.isSnapshotObjectPayload(payload)) {
    return [];
  }

  // For profile payloads, use the unwrapper
  if (payload && payload.profile && typeof payload.profile === 'object') {
    return this.unwrapProfileEntries(payload);
  }

  var skipKeys = ['headers', 'rows', 'batting', 'bowling', 'bio', 'pageTitle', 'url', 'sourceMatchUrl'];
  return Object.keys(payload)
    .filter(function(key: string) { return skipKeys.indexOf(key) === -1; })
    .filter(function(key: string) {
      var v = payload[key];
      return typeof v !== 'object' || v === null;
    })
    .map(function(key: string) {
      return {
        key: key,
        value: payload[key]
      };
    });
}

getSnapshotTableColumns(rows: any[]): string[] {
  if (!rows || !rows.length) {
    return [];
  }

  var preferredOrder = ['position', 'rank', 'teamName', 'name', 'matches', 'wins', 'losses', 'ties', 'points', 'rating', 'netRunRate'];
  var discoveredKeys: string[] = [];

  rows.forEach(function(row: any) {
    Object.keys(row || {}).forEach(function(key: string) {
      if (discoveredKeys.indexOf(key) === -1) {
        discoveredKeys.push(key);
      }
    });
  });

  var ordered = preferredOrder.filter(function(key: string) {
    return discoveredKeys.indexOf(key) !== -1;
  });
  var remainder = discoveredKeys.filter(function(key: string) {
    return ordered.indexOf(key) === -1;
  });

  return ordered.concat(remainder);
}

getSelectedSeriesStandingsRows(): any[] {
  if (!this.selectedSeriesStatsDetail || !this.selectedSeriesStatsDetail.standings) {
    return [];
  }

  for (var i = 0; i < this.selectedSeriesStatsDetail.standings.length; i++) {
    var snapshot = this.selectedSeriesStatsDetail.standings[i];
    if (snapshot && this.isSnapshotTablePayload(snapshot.payload)) {
      return snapshot.payload;
    }
  }

  return [];
}

getSelectedSeriesStandingsColumns(): string[] {
  return this.getSnapshotTableColumns(this.getSelectedSeriesStandingsRows());
}

getSelectedSeriesAdditionalStats(): PlayerStatsSnapshotView[] {
  if (!this.selectedSeriesStatsDetail || !this.selectedSeriesStatsDetail.stats) {
    return [];
  }

  var standingCategories = (this.selectedSeriesStatsDetail.standings || [])
    .map(function(snapshot: PlayerStatsSnapshotView) {
      return snapshot.category;
    })
    .filter(Boolean);

  return this.selectedSeriesStatsDetail.stats.filter(function(snapshot: PlayerStatsSnapshotView) {
    return standingCategories.indexOf(snapshot.category) === -1;
  });
}

trackByStandingsRow(index: number, row: any): string {
  if (!row) {
    return 'standing-' + index;
  }

  return String(row.teamExternalId || row.externalId || row.teamName || row.name || index);
}

standingsRowHasTeam(row: any): boolean {
  return !!(row && (row.teamExternalId || row.externalId));
}

openStandingsTeam(row: any): void {
  if (!row) {
    return;
  }

  this.openTeamStatsFromSelection({
    externalId: row.teamExternalId || row.externalId,
    teamName: row.teamName || row.name || row.team
  }, this.statsExplorerSource || 'lineups');
}

formatSnapshotLabel(value: string): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(function(part: string) {
      if (part.length <= 3) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

formatSnapshotValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.map((item: any) => this.formatSnapshotValue(item)).join(' • ');
  }

  if (typeof value === 'object') {
    return this.formatSnapshotObjectValue(value);
  }

  return String(value);
}

private formatSnapshotObjectValue(value: any): string {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return String(value || '—');
  }

  var entries = Object.keys(value)
    .filter(function(key: string) {
      var item = value[key];
      return item !== null && item !== undefined && item !== '';
    })
    .slice(0, 6)
    .map((key: string) => {
      var item = value[key];
      if (Array.isArray(item)) {
        item = item.map((child: any) => this.formatSnapshotValue(child)).join(', ');
      } else if (item && typeof item === 'object') {
        item = this.formatSnapshotObjectValue(item);
      }
      return this.formatSnapshotLabel(key) + ': ' + String(item);
    });

  return entries.length ? entries.join(' • ') : '—';
}

private loadPlayerStatsDetail(
  player: PlayerStatsSquadPlayerView,
  team: PlayerStatsTeamView | null,
  source: 'lineups' | 'scorecard'
): void {
  if (!player || !player.externalId) {
    this.notifyPlayerStatsUnavailable(player && player.name, player && player.role, player && player.wicketKeeper);
    return;
  }

  this.router.navigate(['/player', player.externalId, this.slugifyPlayerName(player.name)]);
  return;

  this.statsExplorerSource = source;
  this.selectedStatsExplorerType = 'player';
  this.selectedStatsExplorerPlayer = player;
  this.selectedStatsExplorerTeam = team;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = true;
  this.statsExplorerErrorMessage = null;

  this.cricketService.getPlayerStatsPlayer(player.externalId, this.getPlayerStatsSource())
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (data: PlayerStatsPlayerDetailView | null) => {
        this.isLoadingStatsExplorer = false;
        if (data) {
          this.selectedPlayerStatsDetail = data;
          return;
        }
        this.statsExplorerErrorMessage = 'Detailed player stats are not available for this player yet.';
      },
      error => {
        console.error('Error loading player details:', error);
        this.isLoadingStatsExplorer = false;
        this.statsExplorerErrorMessage = 'Detailed player stats could not be loaded right now.';
      }
    );
}

private loadPlayerStatsDetailFromGlobalSearch(
  playerName: string,
  source: 'lineups' | 'scorecard' = 'scorecard',
  role?: string
): void {
  var normalizedName = this.normalizeComparableText(playerName);
  if (!normalizedName) {
    this.notifyPlayerStatsUnavailable(undefined, role);
    return;
  }

  this.statsExplorerSource = source;
  this.selectedStatsExplorerType = 'player';
  this.selectedStatsExplorerPlayer = {
    name: playerName
  };
  this.selectedStatsExplorerTeam = null;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = true;
  this.statsExplorerErrorMessage = null;

  this.cricketService.listPlayers('crex', playerName)
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (players: PlayerStatsSquadPlayerView[]) => {
        var player = this.findBestGlobalPlayerMatch(players, playerName);
        if (!player || !player.externalId) {
          // Match seeds can expose a player name before their asynchronous
          // roster task writes the CREX id. Let the profile endpoint hydrate
          // and persist this deterministic CREX slug on the user's click.
          this.loadPlayerStatsDetail({
            externalId: 'player:' + this.slugifyPlayerName(playerName),
            name: playerName,
            role: role
          } as PlayerStatsSquadPlayerView, null, source);
          return;
        }

        this.loadPlayerStatsDetail(player, null, source);
      },
      error => {
        console.error('Error searching player details:', error);
        this.isLoadingStatsExplorer = false;
        this.statsExplorerErrorMessage = 'Detailed player stats could not be loaded right now.';
        this.showToast('Detailed player stats could not be loaded for ' + playerName + ' right now.', 'Dismiss', 5000);
      }
    );
}

private notifyPlayerStatsUnavailable(playerName?: string, role?: string, wicketKeeper?: boolean): void {
  var name = String(playerName || 'this player').trim();
  var roleLabel = this.getPlayerRoleShortLabel(role, wicketKeeper);
  var suffix = roleLabel && name.toUpperCase().indexOf('(' + roleLabel + ')') === -1
    ? ' (' + roleLabel + ')'
    : '';
  this.showToast('Detailed player stats are not available for ' + name + suffix + ' yet.', 'Dismiss', 5000);
}

private getPlayerRoleShortLabel(role?: string, wicketKeeper?: boolean): string | undefined {
  var normalized = String(role || '').toUpperCase();
  if (wicketKeeper || normalized.indexOf('KEEP') >= 0 || normalized === 'WK') {
    return 'WK';
  }
  if (normalized.indexOf('BAT') >= 0) {
    return 'BAT';
  }
  if (normalized.indexOf('BOWL') >= 0) {
    return 'BOWL';
  }
  if (normalized.indexOf('ALL') >= 0 || normalized.indexOf('ROUND') >= 0) {
    return 'AR';
  }
  return undefined;
}

private findBestGlobalPlayerMatch(players: PlayerStatsSquadPlayerView[], playerName: string): PlayerStatsSquadPlayerView | null {
  if (!players || !players.length) {
    return null;
  }

  var normalizedTarget = this.normalizeComparableText(playerName);
  var exact = players.find((player: PlayerStatsSquadPlayerView) => {
    return [
      this.normalizeComparableText(player && player.name),
      this.normalizeComparableText(player && player.shortName)
    ].indexOf(normalizedTarget) !== -1;
  });

  if (exact) {
    return exact;
  }

  var contained = players.find((player: PlayerStatsSquadPlayerView) => {
    var fullName = this.normalizeComparableText(player && player.name);
    var shortName = this.normalizeComparableText(player && player.shortName);
    return (fullName && (fullName.indexOf(normalizedTarget) !== -1 || normalizedTarget.indexOf(fullName) !== -1))
      || (shortName && (shortName.indexOf(normalizedTarget) !== -1 || normalizedTarget.indexOf(shortName) !== -1));
  });

  return contained || players[0];
}

private loadTeamStatsDetail(team: PlayerStatsTeamView, source: 'lineups' | 'scorecard'): void {
  if (!team || !team.externalId) {
    this.showToast('Team stats are not available yet.', 'Dismiss');
    return;
  }

  this.statsExplorerSource = source;
  this.selectedStatsExplorerType = 'team';
  this.selectedStatsExplorerPlayer = null;
  this.selectedStatsExplorerTeam = team;
  this.selectedPlayerStatsDetail = null;
  this.selectedTeamStatsDetail = null;
  this.selectedSeriesStatsDetail = null;
  this.isLoadingStatsExplorer = true;
  this.statsExplorerErrorMessage = null;

  this.cricketService.getPlayerStatsTeam(team.externalId, this.getPlayerStatsSource())
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (data: PlayerStatsTeamDetailView | null) => {
        if (data) {
          this.isLoadingStatsExplorer = false;
          this.selectedTeamStatsDetail = data;
          return;
        }
        this.loadFallbackTeamStatsDetail(team);
      },
      error => {
        console.error('Error loading team details:', error);
        this.loadFallbackTeamStatsDetail(team);
      }
    );
}

private loadFallbackTeamStatsDetail(team: PlayerStatsTeamView): void {
  var series = this.getPlayerStatsSeries();
  if (!series || !series.externalId) {
    this.isLoadingStatsExplorer = false;
    this.selectedTeamStatsDetail = this.buildFallbackTeamStatsDetail(team, null);
    this.statsExplorerErrorMessage = null;
    return;
  }

  this.cricketService.getPlayerStatsSeriesStandings(series.externalId, this.getPlayerStatsSource())
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (seriesData: PlayerStatsSeriesDetailView | null) => {
        this.isLoadingStatsExplorer = false;
        this.selectedTeamStatsDetail = this.buildFallbackTeamStatsDetail(team, seriesData);
        this.statsExplorerErrorMessage = null;
      },
      error => {
        console.error('Error loading fallback team standings:', error);
        this.isLoadingStatsExplorer = false;
        this.selectedTeamStatsDetail = this.buildFallbackTeamStatsDetail(team, null);
        this.statsExplorerErrorMessage = null;
      }
    );
}

private getPlayerStatsSource(): string | undefined {
  return this.playerStatsMatch && this.playerStatsMatch.source ? this.playerStatsMatch.source : undefined;
}

private findPlayerByName(playerName: string): { player: PlayerStatsSquadPlayerView; team: PlayerStatsTeamView | null } | null {
  var normalizedTarget = this.normalizeComparableText(playerName);
  var teams = this.getPlayerStatsTeams();

  for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    var team = teams[teamIndex];
    var squad = team && team.squad ? team.squad : [];

    for (var playerIndex = 0; playerIndex < squad.length; playerIndex++) {
      var player = squad[playerIndex];
      var playerTokens = [
        this.normalizeComparableText(player.name),
        this.normalizeComparableText(player.shortName)
      ];

      if (playerTokens.indexOf(normalizedTarget) !== -1) {
        return {
          player: player,
          team: team
        };
      }
    }
  }

  return null;
}

  private findPlayerReference(
    externalId?: string,
    playerName?: string,
    team?: PlayerStatsTeamView | null
  ): PlayerStatsSquadPlayerView | null {
  var normalizedExternalId = externalId || '';
  var normalizedName = this.normalizeComparableText(playerName);
  var teams = team ? [team] : this.getPlayerStatsTeams();

  for (var teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    var squad = teams[teamIndex] && teams[teamIndex].squad ? teams[teamIndex].squad : [];
    for (var playerIndex = 0; playerIndex < squad.length; playerIndex++) {
      var player = squad[playerIndex];
      if (normalizedExternalId && player.externalId === normalizedExternalId) {
        return player;
      }

      if (normalizedName && [
        this.normalizeComparableText(player.name),
        this.normalizeComparableText(player.shortName)
      ].indexOf(normalizedName) !== -1) {
        return player;
      }
    }
  }

  return null;
}

private findTeamReference(externalId?: string, teamName?: string): PlayerStatsTeamView | null {
  var teams = this.getPlayerStatsTeams();
  var normalizedName = this.normalizeComparableText(teamName);

  for (var index = 0; index < teams.length; index++) {
    var team = teams[index];
    if (externalId && team.externalId === externalId) {
      return team;
    }

    if (normalizedName && [
      this.normalizeComparableText(team.name),
      this.normalizeComparableText(team.shortName),
      this.normalizeComparableText(team.teamCode)
    ].indexOf(normalizedName) !== -1) {
      return team;
    }
  }

  return null;
}

private normalizeComparableText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .replace(/\(c\)|\(wk\)|†/g, '')
    .replace(/[^a-z0-9]/g, '');
}

private buildFallbackTeamStatsDetail(
  team: PlayerStatsTeamView,
  seriesData: PlayerStatsSeriesDetailView | null
): PlayerStatsTeamDetailView {
  var stats: PlayerStatsSnapshotView[] = [];
  var squad = team && team.squad ? team.squad : [];
  var playerNames = squad
    .map(function(player: PlayerStatsSquadPlayerView) {
      return player && player.name ? player.name : '';
    })
    .filter(Boolean);

  if (playerNames.length) {
    stats.push({
      category: 'current_squad',
      label: 'Current squad',
      payload: playerNames
    });
  }

  var captain = squad.find(function(player: PlayerStatsSquadPlayerView) {
    return !!(player && player.captain);
  });
  var wicketKeeper = squad.find(function(player: PlayerStatsSquadPlayerView) {
    return !!(player && player.wicketKeeper);
  });
  stats.push({
    category: 'match_context',
    label: 'Match context',
    payload: {
      squadSize: squad.length,
      announcedPlayers: squad.filter(function(player: PlayerStatsSquadPlayerView) { return !!player && player.announced !== false; }).length,
      captain: captain ? captain.name : undefined,
      wicketKeeper: wicketKeeper ? wicketKeeper.name : undefined
    }
  });

  var standingRow = this.findSeriesStandingForTeam(team, seriesData);
  if (standingRow) {
    stats.unshift({
      category: 'tournament_standing',
      label: 'Tournament standing',
      payload: standingRow
    });
  }

  return {
    externalId: team.externalId,
    name: team.name,
    shortName: team.shortName,
    teamCode: team.teamCode,
    source: this.getPlayerStatsSource(),
    url: seriesData && seriesData.url ? seriesData.url : undefined,
    stats: stats
  };
}

private findSeriesStandingForTeam(
  team: PlayerStatsTeamView,
  seriesData: PlayerStatsSeriesDetailView | null
): any | null {
  if (!team || !seriesData || !seriesData.standings) {
    return null;
  }

  var normalizedTargets = [
    this.normalizeComparableText(team.name),
    this.normalizeComparableText(team.shortName),
    this.normalizeComparableText(team.teamCode)
  ].filter(Boolean);

  for (var i = 0; i < seriesData.standings.length; i++) {
    var snapshot = seriesData.standings[i];
    if (!snapshot || !this.isSnapshotTablePayload(snapshot.payload)) {
      continue;
    }

    for (var j = 0; j < snapshot.payload.length; j++) {
      var row = snapshot.payload[j];
      if (!row) {
        continue;
      }

      var rowExternalId = row.teamExternalId || row.externalId;
      if (team.externalId && rowExternalId && team.externalId === rowExternalId) {
        return row;
      }

      var rowTargets = [
        this.normalizeComparableText(row.teamName),
        this.normalizeComparableText(row.name),
        this.normalizeComparableText(row.team),
        this.normalizeComparableText(row.teamCode)
      ].filter(Boolean);

      for (var k = 0; k < rowTargets.length; k++) {
        if (normalizedTargets.indexOf(rowTargets[k]) !== -1) {
          return row;
        }
      }
    }
  }

  return null;
}

private populateFallbackMatchInfo(match: any = this.currentMatch): void {
  if (!match) {
    var fallbackKey = this.matchUrl || this.currentUrl || this.matchId;
    if (!fallbackKey) {
      return;
    }
    match = {
      externalMatchKey: extractSlugFromUrl(fallbackKey) || fallbackKey,
      url: fallbackKey,
      status: 'LIVE'
    };
  }

  this.matchInfo = {
    url: match.url || this.matchUrl,
    match_name: this.buildFallbackMatchTitle(match),
    series_name: match.seriesName || match.venue || this.buildFallbackSeriesName(match),
    match_date: match.scheduledStartTime ? new Date(match.scheduledStartTime).toISOString() : null,
    venue: match.venue || match.seriesName || 'Venue TBD',
    toss_info: match.resultSummary || match.lastKnownState || this.buildFallbackStatusLabel(match.status),
    final_result_text: match.resultSummary || match.lastKnownState || null,
    match_status: match.status,
    status: match.status,
    lastKnownState: match.lastKnownState || null,
    team_comparison: {},
    venue_stats: {},
    playing_xi: null,
    team_form: {}
  };
  this.isFallbackMatchInfo = true;
  this.updatePageTitle();
  this.teamComparisonKeys = [];
  this.teamComparisonSubKeys = [];
  this.venueStatsKeys = [];
  this.playingXIKeys = [];
  this.teamFormKeys = [];
  this.syncMatchTabSelection();
}

private syncMatchTabSelection(force: boolean = false): void {
  if (this.hasUserSelectedTab && !force) {
    return;
  }

  var key = this.resolveRequestedTabKey() || this.resolveLifecycleDefaultTab();
  this.selectedTabIndex = this.tabIndexByKey[key];
}

private slugifyPlayerName(value: string | null | undefined): string {
  return String(value || 'player').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'player';
}

private resolveRequestedTabKey(): MatchPageTabKey | null {
  var suffix = extractMatchRouteSuffix(this.currentRequestedPath || (this.router && this.router.url ? this.router.url : ''));

  switch (suffix) {
    case 'live':
    case 'commentary':
      return 'commentary';
    case 'scorecard':
    case 'match-scorecard':
      return 'scorecard';
    case 'info':
    case 'match-details':
      return 'details';
    case 'lineups':
      return 'lineups';
    case 'intelligence':
    case 'match-intelligence':
      return 'intelligence';
    default:
      return null;
  }
}

private resolveLifecycleDefaultTab(): MatchPageTabKey {
  var status = this.getResolvedMatchStatus();

  if (this.isCompletedStatus(status)) {
    return 'scorecard';
  }

  if (this.isUpcomingStatus(status)) {
    return 'details';
  }

  return 'commentary';
}

private ensureDataForTab(index: number): void {
  var match = this.matchId || this.activatedRoute.snapshot.params['path'];
  if (!match) {
    return;
  }

  if (index === this.tabIndexByKey.scorecard) {
    this.fetchScorecardInfo(match);
    return;
  }

  if (index === this.tabIndexByKey.lineups && !this.matchInfo) {
    this.fetchMatchInfo(match);
  }
}

private shouldLoadScorecard(): boolean {
  return !this.isUpcomingStatus(this.getResolvedMatchStatus());
}

private getResolvedMatchStatus(): string {
  return (this.matchInfo && (this.matchInfo.match_status || this.matchInfo.status))
    || (this.currentMatch && (this.currentMatch.status || this.currentMatch.displayStatus))
    || '';
}

/**
 * A terminal catalogue result must never share the generic live hero with a
 * stale 0/0 snapshot. Completed pages use the compact result summary until a
 * richer completed-intelligence module is available.
 */
shouldRenderLiveHero(): boolean {
  return !this.isCompletedStatus(this.getResolvedMatchStatus());
}

shouldRenderCompletedSummary(): boolean {
  return !!this.matchInfo && this.isCompletedStatus(this.getResolvedMatchStatus());
}

private normalizeMatchStatus(status: string | null | undefined): string {
  return String(status || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

private isUpcomingStatus(status: string | null | undefined): boolean {
  var normalized = this.normalizeMatchStatus(status);
  return normalized === 'UPCOMING'
    || normalized === 'SCHEDULED'
    || normalized === 'FIXTURE'
    || normalized === 'NOT_STARTED'
    || normalized.indexOf('UPCOMING') !== -1
    || normalized.indexOf('SCHEDULE') !== -1
    || normalized.indexOf('NOT_STARTED') !== -1
    || normalized.indexOf('FIXTURE') !== -1;
}

private isCompletedStatus(status: string | null | undefined): boolean {
  var normalized = this.normalizeMatchStatus(status);
  return normalized === 'COMPLETED'
    || normalized === 'ABANDONED'
    || normalized === 'RESULT'
    || normalized === 'FINISHED'
    || normalized.indexOf('COMPLETE') !== -1
    || normalized.indexOf('RESULT') !== -1
    || normalized.indexOf('FINISH') !== -1
    || normalized.indexOf('ABANDON') !== -1
    || normalized.indexOf('NO_RESULT') !== -1;
}

private buildHeroFallbackView(match: any): LiveHeroViewModel | null {
  if (!match) {
    return null;
  }

  var score = this.isLiveLikeStatus(match.status)
    ? this.extractLiveFallbackScore(match)
    : this.extractFallbackScore(match);
  var timestampMs = match.lastStateUpdatedAt || match.lastUpdated || match.scheduledStartTime || Date.now();
  var oversValue = this.parseOversValue(score.overs);
  var runRate = oversValue > 0 ? score.runs / oversValue : 0;
  // Keep scheduled fixtures distinct from completed results when the live
  // snapshot is not yet available.
  var normalizedStatus = this.normalizeMatchStatus(match.status);
  var status = this.isLiveLikeStatus(match.status)
    ? match.status
    : (this.isUpcomingStatus(normalizedStatus) ? 'UPCOMING' : (normalizedStatus || 'UPCOMING'));

  // Build a clean formatted result summary with both teams' scores
  var formattedResult = match.resultSummary || match.lastKnownState || null;
  if (!this.isLiveLikeStatus(match.status) && score.allScores.length >= 2) {
    var parts: string[] = score.allScores.map(function(s) {
      return s.teamName + ' ' + s.runs + '/' + s.wickets + ' (' + s.overs + ')';
    });
    var winnerLine = '';
    var winnerMatch = String(formattedResult || '').match(/([A-Za-z][A-Za-z\s&.-]*?)\s+Won[^,]*/i);
    if (winnerMatch) {
      winnerLine = winnerMatch[0].trim();
    }
    formattedResult = parts.join('  •  ') + (winnerLine ? ' — ' + winnerLine : '');
  } else if (score.allScores.length === 1) {
    formattedResult = score.allScores[0].teamName + ' ' + score.allScores[0].runs + '/' + score.allScores[0].wickets + ' (' + score.allScores[0].overs + ')';
  }

  return {
    matchId: match.externalMatchKey || this.matchId || 'match',
    status: status,
    timestamp: new Date(timestampMs).toISOString(),
    score: {
      teamCode: score.teamCode,
      teamName: score.teamName,
      runs: score.runs,
      wickets: score.wickets,
      overs: score.overs,
      runRateLabel: 'CRR ' + runRate.toFixed(2),
      status: status,
      resultSummary: formattedResult,
      currentBall: null
    },
    chase: {
      isChasing: false
    },
    batters: [],
    bowler: null,
    partnershipLabel: null,
    odds: null,
    staleness: {
      tier: 'FRESH',
      ageSeconds: 0,
      message: null,
      nextRetryAllowed: null
    },
    quickLinks: [
      { id: 'commentary', label: 'Commentary', target: '#commentary' },
      { id: 'scorecard', label: 'Scorecard', target: '#scorecard' },
      { id: 'info', label: 'Match Info', target: '#match-info' }
    ],
    currentStriker: null,
    lastValidStriker: null,
    completedScores: !this.isLiveLikeStatus(match.status) && score.allScores.length >= 2 ? {
      team1: score.allScores[0],
      team2: score.allScores[1],
      resultText: (function() {
        var wm = String(formattedResult || '').match(/([A-Za-z][A-Za-z\s&.-]*?)\s+Won[^•]*/i);
        return wm ? wm[0].trim() : 'Match Completed';
      })()
    } : null
  };
}

private extractLiveFallbackScore(match: any): { teamCode: string; teamName: string; runs: number; wickets: number; overs: string; allScores: Array<{ teamName: string; runs: number; wickets: number; overs: string }> } {
  var candidates = [match && match.team1, match && match.team2].filter(function(team: any) {
    return !!(team && team.score);
  });
  var selectedTeam = candidates.length > 1 ? candidates[candidates.length - 1] : candidates[0];

  if (!selectedTeam) {
    return this.extractFallbackScore(match);
  }

  var score = selectedTeam.score || {};
  var overs = score.overs !== null && score.overs !== undefined ? String(score.overs) : '0.0';
  var runs = score.runs !== null && score.runs !== undefined ? Number(score.runs) : 0;
  var wickets = score.wickets !== null && score.wickets !== undefined ? Number(score.wickets) : 0;
  var teamName = selectedTeam.shortName || selectedTeam.name || 'Batting Team';
  var allScores = candidates.map(function(team: any) {
    var teamScore = team.score || {};
    return {
      teamName: team.shortName || team.name || 'Team',
      runs: teamScore.runs !== null && teamScore.runs !== undefined ? Number(teamScore.runs) : 0,
      wickets: teamScore.wickets !== null && teamScore.wickets !== undefined ? Number(teamScore.wickets) : 0,
      overs: teamScore.overs !== null && teamScore.overs !== undefined ? String(teamScore.overs) : '0.0'
    };
  });

  return {
    teamCode: selectedTeam.shortName || (teamName.length <= 4 ? teamName.toUpperCase() : teamName.slice(0, 3).toUpperCase()),
    teamName: teamName,
    runs: isNaN(runs) ? 0 : runs,
    wickets: isNaN(wickets) ? 0 : wickets,
    overs: overs,
    allScores: allScores
  };
}

private extractFallbackScore(match: any): { teamCode: string; teamName: string; runs: number; wickets: number; overs: string; allScores: Array<{ teamName: string; runs: number; wickets: number; overs: string }> } {
  var summary = String(match && (match.resultSummary || match.lastKnownState || '')).trim();
  var winnerMatch = summary.match(/([A-Za-z][A-Za-z\s&.-]*?)\s+Won/i);
  var winnerKey = winnerMatch && winnerMatch[1] ? winnerMatch[1].replace(/\s+/g, '').toLowerCase() : null;
  var parsedScores: Array<{ teamName: string; runs: number; wickets: number; overs: string }> = [];
  var entry: RegExpExecArray | null;
  var matchedTeams: { [key: string]: boolean } = {};

  // Pass 1: scores with "/" separator
  var scorePattern = /([A-Za-z][A-Za-z\s&.-]*?)\s+(\d+)\/(\d{1,2}?)\s*\(?(\d+\.\d+)\)?/g;
  while ((entry = scorePattern.exec(summary)) !== null) {
    var tn = entry[1].trim();
    matchedTeams[tn] = true;
    parsedScores.push({
      teamName: tn,
      runs: parseInt(entry[2], 10),
      wickets: parseInt(entry[3], 10),
      overs: entry[4]
    });
  }

  // Pass 2: all-out scores without "/" (e.g., "NOD 11916.3")
  var allOutPattern = /([A-Za-z][A-Za-z\s&.-]*?)\s+(\d+)\.(\d)/g;
  while ((entry = allOutPattern.exec(summary)) !== null) {
    var tn2 = entry[1].trim();
    if (matchedTeams[tn2]) { continue; }
    if (/^(Won|Match|Draw|Tied|No)/i.test(tn2)) { continue; }
    var numberPart = entry[2];
    var decimal = entry[3];
    var runs = 0, overs = 0;
    if (numberPart.length >= 3) {
      var twoDigit = parseInt(numberPart.slice(-2), 10);
      if (twoDigit >= 1 && twoDigit <= 50) {
        runs = parseInt(numberPart.slice(0, -2), 10);
        overs = parseFloat(twoDigit + '.' + decimal);
      } else {
        runs = parseInt(numberPart.slice(0, -1), 10);
        overs = parseFloat(numberPart.slice(-1) + '.' + decimal);
      }
    } else if (numberPart.length >= 2) {
      runs = parseInt(numberPart.slice(0, -1), 10);
      overs = parseFloat(numberPart.slice(-1) + '.' + decimal);
    }
    if (runs > 0) {
      matchedTeams[tn2] = true;
      parsedScores.push({ teamName: tn2, runs: runs, wickets: 10, overs: overs.toString() });
    }
  }

  var selected = parsedScores[0] || {
    teamName: this.buildFallbackMatchTitle(match),
    runs: 0,
    wickets: 0,
    overs: '0.0'
  };

  if (winnerKey) {
    var winnerScore = parsedScores.find(item => item.teamName.replace(/\s+/g, '').toLowerCase() === winnerKey);
    if (winnerScore) {
      selected = winnerScore;
    }
  } else if (parsedScores.length > 1) {
    selected = parsedScores[parsedScores.length - 1];
  }

  return {
    teamCode: selected.teamName.length <= 4 ? selected.teamName.toUpperCase() : selected.teamName.slice(0, 3).toUpperCase(),
    teamName: selected.teamName,
    runs: selected.runs,
    wickets: selected.wickets,
    overs: selected.overs,
    allScores: parsedScores
  };
}

private parseOversValue(value: string): number {
  if (!value) {
    return 0;
  }

  if (value.indexOf('.') === -1) {
    return parseFloat(value) || 0;
  }

  var parts = value.split('.');
  var wholeOvers = parseInt(parts[0], 10) || 0;
  var balls = parseInt(parts[1], 10) || 0;
  return wholeOvers + (balls / 6);
}

getFallbackResultSummary(): string | null {
  if (!this.currentMatch) {
    return null;
  }

  return this.currentMatch.resultSummary || this.currentMatch.lastKnownState || null;
}

getMatchShellTitle(): string {
  if (this.matchInfo && this.matchInfo.match_name) {
    return this.matchInfo.match_name;
  }

  if (this.currentMatch && this.currentMatch.team1 && this.currentMatch.team2) {
    return this.currentMatch.team1.name + ' vs ' + this.currentMatch.team2.name;
  }

  return this.buildFallbackMatchTitle(this.currentMatch);
}

getMatchShellStatus(): string {
  var rawStatus = (this.matchInfo && (this.matchInfo.match_status || this.matchInfo.status))
    || (this.currentMatch && (this.currentMatch.displayStatus || this.currentMatch.status))
    || 'Match Centre';

  return this.formatStatusLabel(rawStatus);
}

getMatchShellSeries(): string | null {
  return (this.matchInfo && this.matchInfo.series_name)
    || (this.currentMatch && this.currentMatch.seriesName)
    || null;
}

getMatchShellVenue(): string | null {
  return (this.matchInfo && this.matchInfo.venue)
    || (this.currentMatch && this.currentMatch.venue)
    || null;
}

getMatchShellContextNote(): string | null {
  return (this.matchInfo && (this.matchInfo.toss_info || this.matchInfo.lastKnownState))
    || this.getFallbackResultSummary()
    || null;
}

getMatchIntentFullPair(): string {
  return this.matchSeo ? this.matchSeo.teams : this.getMatchShellTitle();
}

getMatchIntentShortPair(): string {
  if (this.matchSeo && this.matchSeo.shortTeams) {
    return this.matchSeo.shortTeams;
  }

  var team1Short = this.resolveIntentTeamShortName('team1');
  var team2Short = this.resolveIntentTeamShortName('team2');
  if (team1Short && team2Short) {
    return team1Short + ' vs ' + team2Short;
  }

  return this.getMatchIntentFullPair();
}

getMatchIntentCombinedLabel(): string {
  var fullPair = this.getMatchIntentFullPair();
  var shortPair = this.getMatchIntentShortPair();

  if (!shortPair || shortPair === fullPair) {
    return fullPair;
  }

  return fullPair + ' (' + shortPair + ')';
}

  getCommentaryJumpLabel(): string {
    return this.getMatchIntentShortPair() + ' commentary';
  }

  getCoverageSummaryFacts(): CoverageSummaryFact[] {
    var facts: CoverageSummaryFact[] = [];
    var score = this.getCoverageScoreSummaryValue();
    var tournament = this.getMatchShellSeries();
    var venue = this.getMatchShellVenue();
    var toss = this.getCoverageTossSummaryValue();
    var startTime = this.getCoverageStartTimeLabel();
    var updated = this.getCoverageUpdatedLabel();

    if (score) {
      facts.push({ label: 'Score', value: score });
    }

    facts.push({ label: 'Status', value: this.getMatchShellStatus() });

    if (tournament) {
      facts.push({ label: 'Tournament', value: tournament });
    }

    if (venue) {
      facts.push({ label: 'Venue', value: venue });
    }

    if (toss) {
      facts.push({ label: 'Toss', value: toss });
    }

    if (startTime) {
      facts.push({ label: 'Start time', value: startTime });
    }

    if (updated) {
      facts.push({ label: 'Last updated', value: updated });
    }

    return facts.slice(0, 6);
  }

  getLiveMatchUpdates(): LiveMatchUpdate[] {
    var seen: { [key: string]: boolean } = {};
    var updates = (this.commentaryEntries || [])
      .filter((entry) => this.isMeaningfulLiveUpdateEntry(entry))
      .slice(0, 6)
      .map((entry, index) => this.buildLiveMatchUpdateFromCommentary(entry, index))
      .filter((entry): entry is LiveMatchUpdate => !!entry);

    this.buildSyntheticLiveMatchUpdates().forEach(function(update) {
      updates.push(update);
    });

    return updates
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((update) => {
        var key = update.type + '|' + update.body.toLowerCase();
        if (seen[key]) {
          return false;
        }

        seen[key] = true;
        return true;
      })
      .slice(0, 6);
  }

  getMatchFaqItems(): MatchFaqItem[] {
    var items: MatchFaqItem[] = [];
    var teams = this.matchSeo ? this.matchSeo.teams : this.getMatchIntentFullPair();
    var score = this.getCoverageScoreSummaryValue();
    var toss = this.getCoverageTossSummaryValue();
    var venue = this.getMatchShellVenue();
    var result = this.getFallbackResultSummary();

    if (teams) {
      items.push({
        question: 'Where can I follow ' + teams + ' live score today?',
        answer: 'Follow ' + teams + ' live score today on this page with scorecard, toss update, commentary, playing XI, and match updates.'
      });
    }

    if (toss) {
      items.push({
        question: 'Who won the toss?',
        answer: toss
      });
    }

    if (venue) {
      items.push({
        question: 'What is the venue for the match?',
        answer: venue
      });
    }

    if (score) {
      items.push({
        question: 'What is the current score?',
        answer: score
      });
    }

    if (result && this.isCompletedStatus(this.getResolvedMatchStatus())) {
      items.push({
        question: 'Who won the match?',
        answer: result
      });
    }

    return items;
  }

  getScorecardJumpLabel(): string {
    return this.getMatchIntentShortPair() + ' scorecard';
  }

getLineupsJumpLabel(): string {
  return this.getMatchIntentShortPair() + ' lineups';
}

getDetailsJumpLabel(): string {
  return this.getMatchIntentShortPair() + ' match details';
}

getCommentarySectionKicker(): string {
  return this.getMatchIntentFullPair() + ' commentary';
}

getCommentarySectionTitle(): string {
  return this.getMatchIntentShortPair() + ' ball-by-ball commentary';
}

getScorecardSectionKicker(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getMatchIntentFullPair() + ' result and scorecard';
  }

  return this.getMatchIntentFullPair() + ' scorecard';
}

getScorecardSectionTitle(): string {
  return this.getMatchIntentShortPair() + ' scorecard and innings detail';
}

getScorecardSectionSummary(): string {
  if (this.scorecardData && this.scorecardData.innings && this.scorecardData.innings.length) {
    return 'Batting, bowling, partnerships, and innings detail for this match.';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'The final innings tables and result details will appear here.';
  }

  return 'Batting, bowling, overs, wickets, and innings context will appear here as play progresses.';
}

getLineupsSectionKicker(): string {
  return this.getMatchIntentFullPair() + ' team news';
}

getLineupsSectionTitle(): string {
  return this.getMatchIntentShortPair() + ' playing XI and lineups';
}

getLineupsSectionSummary(): string {
  return this.getLineupsIntentLabel();
}

getCommentaryEmptyStateLabel(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getMatchIntentCombinedLabel() + ' commentary archive is not available for this match.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return this.getMatchIntentCombinedLabel() + ' commentary will begin here once the toss is complete and live updates start.';
  }

  return this.getMatchIntentCombinedLabel() + ' commentary has not arrived from the live feed yet.';
}

getDetailsIntroKicker(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'Supporting match detail';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'More match detail';
  }

  return 'Supporting live detail';
}

getDetailsIntroTitle(): string {
  var teams = this.getMatchIntentCombinedLabel();

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'More detail for ' + teams;
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Everything else for ' + teams;
  }

  return 'Extra context for ' + teams;
}

getDetailsIntroSummary(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getSeoScorecardLabel();
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Use this section for the start time, venue context, toss status, playing XI updates, and fixture-specific pre-match detail before the first ball.';
  }

  return 'Use this section for supporting context while commentary stays primary for the live match.';
}

getBreadcrumbSeriesLabel(): string {
  return this.matchSeo && this.matchSeo.breadcrumbSeries
    ? this.matchSeo.breadcrumbSeries
    : 'Series';
}

getSeriesSurfaceHref(): string {
  var series = this.getPlayerStatsSeries();
  var externalId = series && series.externalId
    ? String(series.externalId).trim()
    : this.extractSeriesCodeFromUrl(this.matchUrl || this.currentUrl || '');
  var seriesName = series && (series.name || series.shortName)
    ? (series.name || series.shortName || '')
    : this.getBreadcrumbSeriesLabel();

  if (!externalId || !seriesName || seriesName === 'Series') {
    return '/series';
  }

  return '/series/' + encodeURIComponent(externalId) + '/' + this.slugifySeriesName(seriesName);
}

getCanonicalEntitySeriesHref(): string {
  // Retained canonical SSR receives this context from the request prefetch.
  // Prefer it over a partial match snapshot so the public anchor uses the
  // stable series entity ID that was actually verified with its standings.
  if (this.resolvedSeriesContext && this.resolvedSeriesContext.externalId) {
    var retainedSeriesName = this.resolvedSeriesContext.name || this.resolvedSeriesContext.shortName || '';
    if (retainedSeriesName) {
      return '/series/' + encodeURIComponent(this.resolvedSeriesContext.externalId) + '/' + this.slugifySeriesName(retainedSeriesName);
    }
  }
  return this.getSeriesSurfaceHref();
}

getSeriesSurfaceLinkLabel(): string {
  var series = this.getBreadcrumbSeriesLabel();
  return series === 'Series' ? 'Cricket series' : series + ' series hub';
}

getMatchTeamEntityLinks(): Array<{ label: string; href: string }> {
  var links: Array<{ label: string; href: string }> = [];
  var seen: { [key: string]: boolean } = {};
  var candidates: Array<{ externalId?: string; id?: string; name?: string; shortName?: string }> = [];

  // Player-stats team IDs are authoritative when available. The match-card
  // fallback is retained for SSR, but synthetic `match-team1` IDs must never
  // be published as team-profile routes.
  this.getPlayerStatsTeams().forEach(function(team) { candidates.push(team); });
  this.retainedEntityTeams.forEach(function(team) { candidates.push(team); });
  if (this.currentMatch) {
    candidates.push(this.currentMatch.team1, this.currentMatch.team2);
  }

  candidates.forEach((team) => {
    if (!team) {
      return;
    }
    var externalId = String(team.externalId || team.id || '').trim();
    var name = String(team.name || team.shortName || '').trim();
    if (!this.isNavigableTeamEntityId(externalId) || !name || seen[externalId]) {
      return;
    }
    seen[externalId] = true;
    links.push({
      label: name + ' team profile',
      href: '/teams/' + encodeURIComponent(externalId) + '/' + this.slugifySeriesName(name)
    });
  });

  return links;
}

private isNavigableTeamEntityId(value: string): boolean {
  return !!value
    && !/^unknown-/i.test(value)
    && !/-team[12]$/i.test(value)
    && !/^team[12]$/i.test(value);
}

getFreshnessSupportLinks(): MatchFreshnessLink[] {
  return this.resolveFreshnessSupportLinks();
}

getPreviewSupportHref(): string | null {
  return this.buildSupportHref('preview');
}

getLiveUpdatesSupportHref(): string | null {
  return this.buildSupportHref('live-updates');
}

getResultSupportHref(): string | null {
  return this.buildSupportHref('result');
}

getPreviewSupportLabel(): string {
  return this.getMatchIntentShortPair() + ' preview';
}

getLiveUpdatesSupportLabel(): string {
  return this.getMatchIntentShortPair() + ' live updates';
}

getResultSupportLabel(): string {
  return this.getMatchIntentShortPair() + ' result and highlights';
}

getDetailsSupportLinks(): MatchFreshnessLink[] {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['result', 'live-updates']);
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['preview', 'live-updates']);
  }

  return this.getFreshnessSupportLinksByType(['live-updates', 'result']);
}

getScorecardSupportLinks(): MatchFreshnessLink[] {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['result']);
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['preview', 'live-updates']);
  }

  return this.getFreshnessSupportLinksByType(['live-updates', 'result']);
}

getLineupsSupportLinks(): MatchFreshnessLink[] {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['result']);
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return this.getFreshnessSupportLinksByType(['preview']);
  }

  return this.getFreshnessSupportLinksByType(['live-updates', 'preview']);
}

private getFreshnessSupportLinksByType(types: Array<'preview' | 'live-updates' | 'result'>): MatchFreshnessLink[] {
  var source = this.resolveFreshnessSupportLinks();
  if (!source || !source.length) {
    return [];
  }

  var ordered: MatchFreshnessLink[] = [];
  var seen: { [key: string]: boolean } = {};

  (types || []).forEach(function(type) {
    source.forEach(function(link) {
      if (!link || link.type !== type || !link.href || seen[link.href]) {
        return;
      }

      seen[link.href] = true;
      ordered.push(link);
    });
  });

  return ordered;
}

private resolveFreshnessSupportLinks(): MatchFreshnessLink[] {
  if (this.freshnessLinks && this.freshnessLinks.length > 0) {
    return this.freshnessLinks;
  }

  return this.buildFallbackFreshnessLinks();
}

private buildSupportHref(type: 'preview' | 'live-updates' | 'result'): string | null {
  var slug = this.getCanonicalMatchSlug();
  if (!slug) {
    return null;
  }

  if (type === 'preview') {
    return '/cricket-match-preview/' + slug;
  }

  if (type === 'result') {
    return '/cricket-match-report/' + slug;
  }

  return '/cricket-live-updates/' + slug;
}

getPrimaryLifecycleHubHref(): string {
  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return '/cricket-schedule/today';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return '/live-score/archive';
  }

  return '/live-score';
}

getPrimaryLifecycleHubLabel(): string {
  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Cricket schedule today';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'Cricket match archive';
  }

  return 'Cricket live score today';
}

  getMatchIntelligenceHref(): string | null {
    var slug = this.getCanonicalMatchSlug();
    return slug && this.isMatchIntelligenceEligible() ? '/match-intelligence/' + slug : null;
}

getMatchIntelligenceCtaLabel(): string {
  var teams = this.getMatchIntentShortPair();

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Open ' + teams + ' prediction';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'Open ' + teams + ' turning-point view';
  }

  return 'Open ' + teams + ' match intelligence';
}

getMatchIntelligenceCtaSummary(): string {
  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'See the free pre-match prediction shell with model direction, setup context, and what matters before the first ball.';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'Review the free completed-match shell for turning-point framing and next-step analysis without disturbing the scorecard archive.';
  }

  return 'Use the free intelligence surface for win probability, what changed, and what matters next while the canonical match page stays score-first.';
}

  isMatchIntelligenceEligible(): boolean {
    return !!this.getCanonicalMatchSlug();
}

trackMatchIntelligenceImpression(): void {
  if (this.hasTrackedIntelligenceCtaImpression || !this.isMatchIntelligenceEligible()) {
    return;
  }

  this.hasTrackedIntelligenceCtaImpression = true;
  this.analyticsService.trackIntelligenceEvent('intelligence_cta_impression', {
    match_path: '/cric-live/' + this.getCanonicalMatchSlug(),
    intelligence_path: this.getMatchIntelligenceHref(),
    lifecycle: this.getResolvedMatchStatus(),
    surface: 'cric-live'
  });
}

onMatchIntelligenceCtaClick(): void {
  var href = this.getMatchIntelligenceHref();
  if (!href) {
    return;
  }

  this.analyticsService.trackIntelligenceEvent('intelligence_cta_click', {
    match_path: '/cric-live/' + this.getCanonicalMatchSlug(),
    intelligence_path: href,
    lifecycle: this.getResolvedMatchStatus(),
    surface: 'cric-live'
  });
}

getCanonicalIntentKicker(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'Canonical result page';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Canonical match preview page';
  }

  return 'Canonical live score page';
}

getCanonicalIntentTitle(): string {
  var teams = this.getMatchIntentCombinedLabel();

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return teams + ' result, scorecard and match context';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return teams + ' preview, playing XI and live score tracker';
  }

  return teams + ' commentary, scorecard and live score';
}

getCanonicalIntentSummary(): string {
  var shortTeams = this.getMatchIntentShortPair();

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return 'This single canonical page keeps the final result, full scorecard, innings summary, and match context together after the game finishes for ' + shortTeams + '.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'This single canonical page starts as the preview surface, then becomes the live score, commentary, scorecard, toss, and playing XI page once play begins for ' + shortTeams + '.';
  }

  return 'This single canonical page carries the live score, commentary, scorecard, lineups, toss context, and match state while the innings unfold for ' + shortTeams + '.';
}

getCommentaryIntentLabel(): string {
  var latestCommentary = this.getLatestCommentarySummary();
  var fullPair = this.getMatchIntentFullPair();
  var shortPair = this.getMatchIntentShortPair();
  if (latestCommentary) {
    return fullPair + ' live commentary for ' + shortPair + ': ' + latestCommentary.replace(/^Latest commentary:\s*/i, '');
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' ball-by-ball commentary is archived here when live updates were captured during the match.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' live commentary for ' + shortPair + ' will begin here once the toss is complete and live updates start.';
  }

  return fullPair + ' live commentary for ' + shortPair + ' will populate here as soon as the official ball-by-ball feed starts updating.';
}

getScorecardIntentLabel(): string {
  var fullPair = this.getMatchIntentFullPair();
  var shortPair = this.getMatchIntentShortPair();
  if (this.scorecardData && this.scorecardData.innings && this.scorecardData.innings.length) {
    return fullPair + ' scorecard is available with ' + this.scorecardData.innings.length + ' innings, batting cards, bowling figures, and result context for ' + shortPair + '.';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' final scorecard is syncing and will appear here with innings tables, partnerships, and result details.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' scorecard for ' + shortPair + ' will populate when innings data is available, while preview detail stays here before the first ball.';
  }

  return fullPair + ' live scorecard for ' + shortPair + ' will populate here with batting, bowling, overs, wickets, and innings context as play progresses.';
}

getLineupsIntentLabel(): string {
  var fullPair = this.getMatchIntentFullPair();
  var shortPair = this.getMatchIntentShortPair();
  if (this.matchInfo && this.matchInfo.playing_xi) {
    return fullPair + ' playing XI is available with team combinations, player roles, and lineup context for ' + shortPair + ' in the Lineups tab.';
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' official lineups remain available here once the final XIs are confirmed for the match archive.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return fullPair + ' playing XI for ' + shortPair + ' will appear once the teams are confirmed at the toss.';
  }

  return fullPair + ' lineups for ' + shortPair + ' will appear here as soon as the official XIs are confirmed by the match centre.';
}

getMatchDetailsIntentLabel(): string {
  var fullPair = this.getMatchIntentFullPair();
  var status = this.getMatchShellStatus();
  var dateTime = this.getSeoDateTimeLabel();
  var venue = this.getSeoVenueLabel();

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return fullPair + '. ' + status + '. ' + dateTime + '. ' + venue;
  }

  if (this.isCompletedStatus(this.getResolvedMatchStatus())) {
    return fullPair + '. ' + status + '. ' + venue + '. Use the result and scorecard sections for the final outcome and innings detail.';
  }

  return fullPair + '. ' + status + '. ' + venue + '. Use this section for venue, toss, and match-state context while commentary stays primary.';
}

private resolveIntentTeamShortName(key: 'team1' | 'team2'): string {
  var fromSeo = this.matchSeo && (key === 'team1' ? this.matchSeo.team1Short : this.matchSeo.team2Short);
  if (fromSeo) {
    return fromSeo;
  }

  var fromCurrentMatch = this.currentMatch && this.currentMatch[key] && (
    this.currentMatch[key].shortName
    || this.currentMatch[key].short_code
    || this.currentMatch[key].abbreviation
  );
  if (fromCurrentMatch) {
    return this.normalizeIntentShortTeamName(fromCurrentMatch);
  }

  var fullName = this.matchSeo
    ? (key === 'team1' ? this.matchSeo.team1 : this.matchSeo.team2)
    : this.cleanIntentTeamName(this.matchInfo && this.matchInfo[key + '_name']);

  return this.buildIntentShortTeamName(fullName);
}

private buildIntentShortTeamName(fullName: string): string {
  var normalized = this.cleanIntentTeamName(fullName);
  if (!normalized) {
    return '';
  }

  if (this.isLikelyIntentShortTeamName(normalized)) {
    return this.normalizeIntentShortTeamName(normalized);
  }

  var shorthandMap: { [key: string]: string } = {
    'india': 'IND',
    'australia': 'AUS',
    'england': 'ENG',
    'pakistan': 'PAK',
    'south africa': 'SA',
    'new zealand': 'NZ',
    'sri lanka': 'SL',
    'west indies': 'WI',
    'bangladesh': 'BAN',
    'afghanistan': 'AFG',
    'ireland': 'IRE',
    'zimbabwe': 'ZIM',
    'thailand': 'THA',
    'uzbekistan': 'UZB'
  };
  var lowered = normalized.toLowerCase();
  if (shorthandMap[lowered]) {
    return shorthandMap[lowered];
  }

  var tokens = normalized.split(/[\s-]+/).filter(Boolean).filter(function(token) {
    return ['and', 'of', 'the'].indexOf(token.toLowerCase()) === -1;
  });
  if (tokens.length > 1) {
    return tokens.slice(0, 4).map(function(token) {
      return token.charAt(0).toUpperCase();
    }).join('');
  }

  return normalized.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

private normalizeIntentShortTeamName(value: string): string {
  return this.cleanIntentTeamName(value).toUpperCase();
}

private cleanIntentTeamName(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

private isLikelyIntentShortTeamName(value: string): boolean {
  var compact = this.cleanIntentTeamName(value).replace(/[\s.-]/g, '');
  return compact.length > 0 && (compact.length <= 4 || /^[A-Z0-9\s.-]+$/.test(value));
}

getSeoTournamentLabel(): string {
  return (this.matchSeo && this.matchSeo.series)
    || this.getMatchShellSeries()
    || 'Tournament details will be updated as soon as the match feed provides the competition name.';
}

getSeoDateTimeLabel(): string {
  var value = (this.matchInfo && this.matchInfo.match_date)
    || (this.currentMatch && (this.currentMatch.scheduledStartTime || this.currentMatch.startTime))
    || null;

  if (!value) {
    return 'Match date and start time will be confirmed from the official schedule feed.';
  }

  var parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

getSeoVenueLabel(): string {
  return this.getMatchShellVenue()
    || 'Venue details will be updated when the match centre receives the official ground information.';
}

getSeoLiveScoreLabel(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus()) && this.getFallbackResultSummary()) {
    return this.getFallbackResultSummary() || '';
  }

  if (this.heroFallbackView && this.heroFallbackView.score) {
    var heroScore = this.heroFallbackView.score;
    return heroScore.teamName + ' ' + heroScore.runs + '/' + heroScore.wickets + ' (' + heroScore.overs + ' ov)'
      + (heroScore.resultSummary ? ' - ' + heroScore.resultSummary : '');
  }

  if (this.cricObj && this.cricObj.score_update) {
    return String(this.cricObj.score_update);
  }

  if (this.matchInfo && this.matchInfo.final_result_text) {
    return String(this.matchInfo.final_result_text);
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'This fixture is scheduled and the live score block will switch into innings context as soon as play begins.';
  }

  return 'Live score block will update with runs, wickets, overs, innings context, and match result as soon as the feed receives official data.';
}

getSeoTossLabel(): string {
  if (this.isCompletedStatus(this.getResolvedMatchStatus()) && this.getFallbackResultSummary()) {
    return 'Toss context is no longer the main story. Use the scorecard and final result details for the completed match view.';
  }

  if (this.tossWonCountry && this.batOrBallSelected) {
    return this.tossWonCountry + ' won the toss and chose to ' + this.batOrBallSelected + '.';
  }

  if (this.matchInfo && this.matchInfo.toss_info) {
    return String(this.matchInfo.toss_info);
  }

  return 'Toss update is not announced yet. We will update toss time, toss winner, and bat/ball decision here before the match starts.';
}

getSeoPlayingXiLabel(): string {
  if (this.matchInfo && this.matchInfo.playing_xi) {
    return 'Playing XI is available in the Lineups tab with team squads and player roles.';
  }

  return 'Playing XI is not confirmed yet. Expected playing 11 and final lineup updates will appear here when teams are announced.';
}

getSeoScorecardLabel(): string {
  if (this.scorecardData && this.scorecardData.innings && this.scorecardData.innings.length) {
    return 'Full scorecard is available with ' + this.scorecardData.innings.length + ' innings.';
  }

  if (this.scorecardData) {
    return 'Scorecard data is available below and will continue to refresh with batting, bowling, and innings details.';
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return 'Scorecard will populate after play begins, while fixture details, toss status, and lineup updates stay available ahead of start.';
  }

  return 'Scorecard section will show batting score, bowling figures, fall of wickets, partnerships, and match result once data is available.';
}

getSeoVenueStatsLabel(): string {
  if (this.matchInfo && this.matchInfo.venue_stats && Object.keys(this.matchInfo.venue_stats).length > 0) {
    return 'Venue stats are available for pitch behavior, bat-first trends, and chase context.';
  }

  return 'Venue stats will be updated with pitch context, average scores, bat-first trend, and chase record when reliable data is available.';
}

getSeoTeamFormLabel(): string {
  var hasForm = this.matchInfo && this.matchInfo.team_form && Object.keys(this.matchInfo.team_form).length > 0;
  var hasComparison = this.matchInfo && this.matchInfo.team_comparison && Object.keys(this.matchInfo.team_comparison).length > 0;

  if (hasForm || hasComparison) {
    return 'Team form and head-to-head context is available in this match centre for recent results and matchup signals.';
  }

  return 'Team form and head-to-head data will be added when recent-match and comparison feeds are available for both teams.';
}

getSeoFaqMatchResultAnswer(): string {
  if (this.getFallbackResultSummary()) {
    return this.getFallbackResultSummary() || '';
  }

  return 'The match result will be updated here after the final ball or official result confirmation.';
}

getSeoLanguageKeywordCopy(): string {
  var teams = this.matchSeo ? this.matchSeo.teams : this.getMatchShellTitle();
  return teams + ' live score today, aaj ka match live score, today cricket match live score Hindi, live score Marathi, scorecard, toss update, playing XI, and match result are tracked on this single canonical page.';
}

private getCoverageScoreSummaryValue(): string | null {
  var value = this.getSeoLiveScoreLabel();
  if (!value) {
    return null;
  }

  if (/^This fixture is scheduled/i.test(value) || /^Live score block will update/i.test(value)) {
    return null;
  }

  return value;
}

private getCoverageTossSummaryValue(): string | null {
  if (this.tossWonCountry && this.batOrBallSelected) {
    return this.tossWonCountry + ' won the toss and chose to ' + this.batOrBallSelected + '.';
  }

  if (this.matchInfo && this.matchInfo.toss_info) {
    return String(this.matchInfo.toss_info);
  }

  return null;
}

private getCoverageStartTimeLabel(): string | null {
  var value = this.getSeoDateTimeLabel();
  return /will be confirmed/i.test(value) ? null : value;
}

private getCoverageUpdatedLabel(): string | null {
  var candidates = [
    this.currentMatch && this.currentMatch.lastStateUpdatedAt,
    this.currentMatch && this.currentMatch.lastUpdated,
    this.matchInfo && this.matchInfo.updated_at,
    this.matchInfo && this.matchInfo.updatedAt
  ];

  for (var index = 0; index < candidates.length; index++) {
    var parsed = this.formatCoverageDateTime(candidates[index]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

private formatCoverageDateTime(value: any): string | null {
  if (!value) {
    return null;
  }

  var parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

private getLatestCommentarySummary(): string | null {
  if (!this.commentaryEntries || this.commentaryEntries.length === 0) {
    return null;
  }

  var latest = this.commentaryEntries[0];
  var primary = this.getCommentaryPrimaryText(latest);
  var secondary = this.getCommentarySecondaryText(latest);
  var text = primary + (secondary ? ' ' + secondary : '');
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) {
    return null;
  }

  return this.truncateIntentCopy('Latest commentary: ' + text, 170);
}

private truncateIntentCopy(value: string, maxLength: number): string {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, Math.max(0, maxLength - 3)).trim() + '...';
}

private shouldEmitLiveBlogPosting(updates: LiveMatchUpdate[]): boolean {
  if (!updates || updates.length < 3) {
    return false;
  }

  if (!this.isHighValueLiveCoverageMatch()) {
    return false;
  }

  if (this.isUpcomingStatus(this.getResolvedMatchStatus())) {
    return false;
  }

  return updates.filter((update) => update.body.replace(/[0-9/().:-]/g, '').trim().length >= 20).length >= 3;
}

private isHighValueLiveCoverageMatch(): boolean {
  var haystack = [
    this.matchSeo && this.matchSeo.teams,
    this.matchSeo && this.matchSeo.series,
    this.getMatchShellSeries(),
    this.getMatchShellTitle()
  ].join(' ').toLowerCase();

  return /(india|ipl|world cup|final|playoff|semi[- ]final|qualifier)/i.test(haystack);
}

private buildSyntheticLiveMatchUpdates(): LiveMatchUpdate[] {
  var updates: LiveMatchUpdate[] = [];
  var fallbackTimestamp = this.getFallbackLiveUpdateTimestamp() || new Date().toISOString();
  var toss = this.getCoverageTossSummaryValue();
  var result = this.getFallbackResultSummary();
  var status = this.getResolvedMatchStatus();

  if (toss) {
    updates.push({
      id: 'synthetic-toss',
      type: 'toss',
      timestamp: fallbackTimestamp,
      displayTime: this.formatCoverageDateTime(fallbackTimestamp) || 'Updated',
      headline: 'Toss update',
      body: toss,
      important: true
    });
  }

  if (!this.isUpcomingStatus(status) && !this.isCompletedStatus(status) && this.commentaryEntries.length === 0) {
    updates.push({
      id: 'synthetic-start',
      type: 'start',
      timestamp: fallbackTimestamp,
      displayTime: this.formatCoverageDateTime(fallbackTimestamp) || 'Updated',
      headline: 'Match start',
      body: this.getMatchIntentFullPair() + ' is live. Scorecard, commentary, and match updates will continue to refresh on this page.',
      important: true
    });
  }

  if (result && this.isCompletedStatus(status)) {
    updates.push({
      id: 'synthetic-result',
      type: 'result',
      timestamp: fallbackTimestamp,
      displayTime: this.formatCoverageDateTime(fallbackTimestamp) || 'Updated',
      headline: 'Result update',
      body: result,
      important: true
    });
  }

  return updates;
}

private buildLiveMatchUpdateFromCommentary(entry: any, index: number): LiveMatchUpdate | null {
  if (!entry) {
    return null;
  }

  var timestamp = this.extractLiveUpdateTimestamp(entry) || this.getFallbackLiveUpdateTimestamp();
  var body = this.buildLiveUpdateBody(entry);
  if (!timestamp || !body) {
    return null;
  }

  var type = this.getLiveUpdateType(entry);
  return {
    id: String((entry && entry.id) || ('commentary-update-' + index)),
    type: type,
    timestamp: timestamp,
    displayTime: this.formatCoverageDateTime(timestamp) || 'Updated',
    headline: this.buildLiveUpdateHeadline(entry, type),
    body: body,
    innings: entry && entry.inningsNumber ? Number(entry.inningsNumber) : undefined,
    over: this.resolveLiveUpdateOver(entry),
    score: this.resolveLiveUpdateScore(entry),
    important: this.isImportantLiveUpdateType(type)
  };
}

private isMeaningfulLiveUpdateEntry(entry: any): boolean {
  if (!entry) {
    return false;
  }

  var text = this.buildLiveUpdateBody(entry);
  return isMeaningfulCommentaryUpdate(entry.type, text);
}

private getLiveUpdateType(entry: any): LiveMatchUpdate['type'] {
  if (String((entry && entry.type) || '').toUpperCase() === 'OVER_SUMMARY') {
    return 'over_summary';
  }

  switch (getCommentaryUpdateIntent(entry && entry.type, this.buildLiveUpdateBody(entry))) {
    case 'toss':
      return 'toss';
    case 'wicket':
      return 'wicket';
    case 'innings-break':
      return 'innings_break';
    case 'milestone':
      return 'milestone';
    case 'chase':
      return 'chase_equation';
    case 'weather':
      return 'general';
    case 'boundary':
      return 'general';
    default:
      return /won by|wins by|match-winning|result/.test(this.buildLiveUpdateBody(entry).toLowerCase()) ? 'result' : 'general';
  }
}

private buildLiveUpdateHeadline(entry: any, type: LiveMatchUpdate['type']): string {
  var fallbackLabel = this.getCommentaryEventLabel(entry) || 'Match update';
  switch (type) {
    case 'toss':
      return getCommentaryUpdateLabel('toss', fallbackLabel);
    case 'wicket':
      return 'Wicket';
    case 'over_summary':
      return 'Over summary';
    case 'milestone':
      return 'Milestone update';
    case 'innings_break':
      return 'Innings break';
    case 'chase_equation':
      return 'Chase equation';
    case 'result':
      return 'Result update';
    default:
      return getCommentaryUpdateLabel(getCommentaryUpdateIntent(entry && entry.type, this.buildLiveUpdateBody(entry)), fallbackLabel);
  }
}

private buildLiveUpdateBody(entry: any): string {
  if (!entry) {
    return '';
  }

  if (String(entry.type || '').toUpperCase() === 'OVER_SUMMARY') {
    return this.getOverSummaryText(entry);
  }

  var primary = this.getCommentaryPrimaryText(entry);
  var secondary = this.getCommentarySecondaryText(entry);
  return (primary + (secondary ? ' ' + secondary : '')).replace(/\s+/g, ' ').trim();
}

private extractLiveUpdateTimestamp(entry: any): string | null {
  if (!entry) {
    return null;
  }

  var candidates = [entry.updatedAt, entry.updated_at, entry.createdAt, entry.created_at, entry.timestamp, entry.time, entry.date];
  for (var index = 0; index < candidates.length; index++) {
    var parsed = this.toIsoDate(candidates[index]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

private getFallbackLiveUpdateTimestamp(): string | null {
  return this.toIsoDate(this.matchInfo && (this.matchInfo.updated_at || this.matchInfo.updatedAt))
    || this.toIsoDate(this.currentMatch && this.currentMatch.lastUpdated)
    || this.getStructuredDataDateModified(this.getStructuredDataStartDate())
    || this.getStructuredDataStartDate();
}

private resolveLiveUpdateOver(entry: any): string | undefined {
  if (!entry) {
    return undefined;
  }

  if (entry.overBall) {
    return String(entry.overBall);
  }

  if (entry.overNumber !== undefined && entry.overNumber !== null) {
    return 'Over ' + String(entry.overNumber);
  }

  return undefined;
}

private resolveLiveUpdateScore(entry: any): string | undefined {
  if (!entry) {
    return undefined;
  }

  if (entry.totalScore) {
    return String(entry.totalScore);
  }

  if (entry.score) {
    return String(entry.score);
  }

  if (String(entry.type || '').toUpperCase() === 'OVER_SUMMARY') {
    return this.getOverSummaryScore(entry) || undefined;
  }

  return undefined;
}

private isImportantLiveUpdateType(type: LiveMatchUpdate['type']): boolean {
  return type === 'toss' || type === 'wicket' || type === 'innings_break' || type === 'result' || type === 'milestone';
}

private formatStatusLabel(value: string): string {
  if (!value) {
    return 'Match Centre';
  }

  if (value.toUpperCase() === value) {
    return value
      .toLowerCase()
      .split('_')
      .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
      .join(' ');
  }

  return value;
}

private buildFallbackMatchTitle(match: any): string {
  var source = match && (match.externalMatchKey || extractSlugFromUrl(match.url || '') || this.matchId);
  if (!source) {
    return 'Match Details';
  }

  var vsMatch = source.match(/^([a-z0-9]+)-vs-([a-z0-9]+)-/i);
  if (vsMatch) {
    return this.formatSlugToken(vsMatch[1]) + ' vs ' + this.formatSlugToken(vsMatch[2]);
  }

  return this.titleCaseSlug(source);
}

private buildFallbackSeriesName(match: any): string {
  var source = match && (extractSlugFromUrl(match.url || '') || match.externalMatchKey);
  return source ? this.titleCaseSlug(source.replace(/^.*-vs-.*?-/, '')) : 'Match Summary';
}

private buildFallbackStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return 'Match details are currently unavailable.';
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

private formatSlugToken(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 4) {
    return value.toUpperCase();
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

private titleCaseSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => this.formatSlugToken(part))
    .join(' ');
}

  /**
   * T045: Update browser tab title with team names and match status
   * Feature 008 - Match Page Title SEO Optimization
   * 
   * Implements client-side title updates during SPA navigation
   * CRITICAL: Must match prerender.js generateMatchPageTitle() exactly to avoid ranking risk
   */
  private updatePageTitle(): void {
    this.matchSeo = this.matchSeoService.build({
      routeSlug: this.currentUrl || this.matchId || '',
      requestedPath: this.currentRequestedPath,
      matchUrl: this.matchUrl,
      matchInfo: this.matchInfo,
      currentMatch: this.currentMatch,
      isFallback: this.isFallbackMatchInfo
    });

    this.metaTagsService.setPageMeta(this.matchSeo.canonicalPath, {
      title: this.matchSeo.title,
      description: this.matchSeo.description,
      canonicalUrl: this.matchSeo.canonicalUrl,
      robots: this.matchSeo.robots,
      og: {
        title: this.matchSeo.title,
        description: this.matchSeo.description,
        image: this.matchSeo.ogImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        url: this.matchSeo.canonicalUrl
      },
      twitter: {
        card: 'summary_large_image',
        site: '@crickzen',
        image: this.matchSeo.ogImageUrl
      }
    });

    this.freshnessLinks = this.currentMatch
      ? buildFreshnessLinksFromMatch(this.currentMatch)
      : this.buildFallbackFreshnessLinks();

    this.updateStructuredData();
  }

  /**
   * Extract URL slug from match URL - matches prerender.js extractUrlSlug()
   */
  private extractUrlSlug(url: string): string | null {
    return extractSlugFromUrl(url);
  }

  private buildFallbackFreshnessLinks(): MatchFreshnessLink[] {
    var slug = this.getCanonicalMatchSlug();
    if (!slug || !this.matchSeo) {
      return [];
    }

    return buildFreshnessLinksFromSlug(
      slug,
      this.getResolvedMatchStatus(),
      this.matchSeo.team1,
      this.matchSeo.team2
    );
  }

  private getCanonicalMatchSlug(): string {
    return this.currentUrl
      || this.matchId
      || (this.matchSeo && this.matchSeo.canonicalPath ? this.matchSeo.canonicalPath.replace(/^\/cric-live\//, '') : '')
      || '';
  }

  getMatchEntityNavigationLinks(): Array<{ label: string; href: string; active: boolean }> {
    var slug = this.getCanonicalMatchSlug();
    if (!slug) {
      return [];
    }

    var currentSurface = this.getMatchRouteSurfaceKey();
    var links: Array<{ label: string; href: string; active: boolean }> = [
      { label: 'Live Match', href: '/cric-live/' + slug, active: currentSurface === 'base' || currentSurface === 'live' },
      { label: 'Commentary', href: '/cric-live/' + slug + '/commentary', active: currentSurface === 'commentary' },
      { label: 'Scorecard', href: '/cric-live/' + slug + '/scorecard', active: currentSurface === 'scorecard' },
      { label: 'Match Details', href: '/cric-live/' + slug + '/match-details', active: currentSurface === 'details' },
      { label: 'Lineups', href: '/cric-live/' + slug + '/lineups', active: currentSurface === 'lineups' }
    ];

    if (this.isMatchIntelligenceEligible()) {
      links.push({ label: 'Match Intelligence', href: '/match-intelligence/' + slug, active: currentSurface === 'intelligence' });
    }

    return links;
  }

  getMatchEntityNavigationHref(surface: 'commentary' | 'scorecard' | 'lineups' | 'details'): string {
    var slug = this.getCanonicalMatchSlug();
    return slug ? '/cric-live/' + slug + '/' + (surface === 'details' ? 'match-details' : surface) : '/matches';
  }

  getMatchRouteLabel(): string {
    var labels: { [key: string]: string } = {
      base: 'Match hub',
      live: 'Live match',
      commentary: 'Live commentary',
      scorecard: 'Match scorecard',
      details: 'Match details',
      lineups: 'Playing XI and lineups',
      intelligence: 'Match intelligence'
    };
    return labels[this.getMatchRouteSurfaceKey()] || 'Match centre';
  }

  private getMatchRouteSurfaceKey(): string {
    var suffix = extractMatchRouteSuffix(this.currentRequestedPath || (this.router && this.router.url ? this.router.url : ''));
    switch (suffix) {
      case 'live': return 'live';
      case 'commentary': return 'commentary';
      case 'scorecard':
      case 'match-scorecard': return 'scorecard';
      case 'match-details':
      case 'info': return 'details';
      case 'lineups': return 'lineups';
      default: return 'base';
    }
  }

  private getAbsoluteMatchRouteUrl(): string {
    var path = this.currentRequestedPath || (this.router && this.router.url ? this.router.url : '');
    if (!path || path.indexOf('/cric-live/') !== 0) {
      path = '/cric-live/' + this.getCanonicalMatchSlug();
    }
    return 'https://www.crickzen.com' + path.split('?')[0].split('#')[0];
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !(window as any).__SSR__;
  }

  private resetMatchPageScroll(focusContent: boolean = false): void {
    if (!this.isBrowser()) {
      return;
    }

    var hasFocusedContent = false;
    const reset = () => {
      if (focusContent && !hasFocusedContent) {
        var content = document.querySelector('.match-page-content') as HTMLElement;
        if (content) {
          content.setAttribute('tabindex', '-1');
          try {
            content.focus({ preventScroll: true } as any);
          } catch (_error) {
            content.focus();
          }
          hasFocusedContent = true;
        }
      }
      window.scrollTo(0, 0);
    };
    reset();
    // Route reuse keeps this component mounted between child URLs. Explicitly
    // reset after the tab body and browser restoration settle, and move focus
    // away from links near the footer so mobile Chrome/Safari cannot pull the
    // viewport back down to the previously focused element.
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(reset);
    }
    setTimeout(reset, 0);
    setTimeout(reset, 100);
    setTimeout(reset, 350);
  }

  private updateStructuredData(): void {
    var items = this.buildStructuredDataItems();
    if (items && items.length > 0) {
      // On the browser, if the SSR-injected JSON-LD already contains a
      // SportsEvent but the client-side rebuild does not (because API calls
      // to /api/ are blocked by robots.txt in Google's renderer), preserve
      // the SSR schemas rather than wiping them. This prevents hydration
      // from destroying the SportsEvent rich-result eligibility that SSR
      // correctly established.
      if (this.isBrowser()) {
        var hasSportsEvent = items.some(function(item) {
          return item && item['@type'] === 'SportsEvent';
        });
        if (!hasSportsEvent) {
          var existingSchemas = this.structuredDataService.getPageSchemas();
          var ssrHasSportsEvent = existingSchemas.some(function(item) {
            return item && item['@type'] === 'SportsEvent';
          });
          if (ssrHasSportsEvent) {
            return;
          }
        }
      }
      this.structuredDataService.setPageSchemas(items);
      return;
    }

    // On the browser, don't clear SSR schemas if they exist — the client
    // may simply not have finished loading match data yet. Clearing would
    // destroy correctly-rendered SSR JSON-LD (especially SportsEvent).
    if (this.isBrowser()) {
      var existing = this.structuredDataService.getPageSchemas();
      if (existing && existing.length > 0) {
        return;
      }
    }
    this.structuredDataService.clearPageSchemas();
  }

  private buildStructuredDataItems(): any[] | null {
    if (!this.matchSeo || !this.matchSeo.isIndexable) {
      return null;
    }

    if (!this.matchSeo.team1 || !this.matchSeo.team2 || this.matchSeo.team1 === 'Team A' || this.matchSeo.team2 === 'Team B') {
      return null;
    }

    var routeUrl = this.getAbsoluteMatchRouteUrl();
    var matchEntityId = this.matchSeo.canonicalUrl + '#match';
    var breadcrumbs = this.structuredDataService.breadcrumbs([
      { name: 'Cricket', url: 'https://www.crickzen.com/matches' },
      { name: this.getBreadcrumbSeriesLabel(), url: 'https://www.crickzen.com' + this.getSeriesSurfaceHref() },
      { name: this.matchSeo.teams, url: this.matchSeo.canonicalUrl },
      ...(this.getMatchRouteSurfaceKey() !== 'base' ? [{ name: this.getMatchRouteLabel(), url: routeUrl }] : [])
    ]);
    var items: any[] = [breadcrumbs, {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': routeUrl + '#webpage',
      name: this.matchSeo.h1,
      description: this.matchSeo.description,
      url: routeUrl,
      mainEntity: { '@id': matchEntityId },
      isPartOf: { '@type': 'WebSite', name: 'Crickzen', url: 'https://www.crickzen.com' }
    }];
    var startDate = this.getStructuredDataStartDate();
    var location = this.getStructuredDataLocation();
    var dateModified = this.getStructuredDataDateModified(startDate);
    var liveMatchUpdates = this.getLiveMatchUpdates();
    var faqItems = this.getMatchFaqItems();
    // Event rich results require both a reliable start time and a venue. Do
    // not publish a structurally-invalid SportsEvent while a sparse payload is
    // still being reconciled; the SSR snapshot preserves a known venue.
    var sportsEventSchema = startDate && location ? this.structuredDataService.sportsEvent({
      name: this.matchSeo.h1,
      url: this.matchSeo.canonicalUrl,
      description: this.matchSeo.summary,
      homeTeam: this.matchSeo.team1,
      awayTeam: this.matchSeo.team2,
      startDate: startDate,
      location: location || undefined,
      status: this.getStructuredDataStatus(),
      offersUrl: this.matchSeo.canonicalUrl,
      image: this.matchSeo.ogImageUrl,
      organizerName: 'Crickzen',
      organizerUrl: 'https://www.crickzen.com'
    }) : null;
    if (sportsEventSchema) {
      sportsEventSchema['@id'] = matchEntityId;
    }

    items.unshift(this.structuredDataService.article({
      headline: this.matchSeo.title,
      description: this.matchSeo.description,
      url: this.matchSeo.canonicalUrl,
      image: this.matchSeo.ogImageUrl,
      datePublished: startDate || dateModified || undefined,
      dateModified: dateModified || startDate || undefined,
      authorName: 'Crickzen Sports Desk'
    }));

    // Keep support and freshness links in visible SSR HTML, but do not model
    // them as ItemLists. Google evaluates those lists as Carousel candidates,
    // where this page's navigational links have no rich-result purpose.

    if (faqItems.length > 0) {
      items.push(this.structuredDataService.faqPage(faqItems));
    }

    if (this.shouldEmitLiveBlogPosting(liveMatchUpdates)) {
      items.unshift(this.structuredDataService.liveBlogPosting({
        headline: this.matchSeo.title,
        description: this.matchSeo.description,
        url: this.matchSeo.canonicalUrl,
        image: this.matchSeo.ogImageUrl,
        datePublished: startDate || dateModified || undefined,
        dateModified: dateModified || startDate || undefined,
        coverageStartTime: startDate || dateModified || undefined,
        coverageEndTime: dateModified || startDate || undefined,
        authorName: 'Crickzen Sports Desk',
        articleSection: 'Live Match Updates',
        about: sportsEventSchema || undefined,
        liveBlogUpdates: liveMatchUpdates.map((update, index) => ({
          headline: update.headline,
          url: this.matchSeo.canonicalUrl + '#live-update-' + (index + 1),
          datePublished: update.timestamp,
          articleBody: update.body
        }))
      }));
    }

    if (sportsEventSchema) {
      items.unshift(sportsEventSchema);
    }

    return items;
  }

  private getStructuredDataDateModified(fallbackDate: string | null): string | null {
    var candidates = [
      this.currentMatch && this.currentMatch.lastStateUpdatedAt,
      this.currentMatch && this.currentMatch.lastUpdated,
      this.matchInfo && this.matchInfo.updated_at,
      this.matchInfo && this.matchInfo.updatedAt,
      fallbackDate
    ];

    for (var index = 0; index < candidates.length; index++) {
      var parsed = this.toIsoDate(candidates[index]);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  private getStructuredDataStartDate(): string | null {
    var candidates = [
      this.currentMatch && this.currentMatch.scheduledStartTime,
      this.currentMatch && this.currentMatch.startTime,
      this.matchInfo && this.matchInfo.start_date,
      this.matchInfo && this.matchInfo.match_date
    ];

    for (var index = 0; index < candidates.length; index++) {
      var parsed = this.toIsoDate(candidates[index]);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  private getStructuredDataLocation(): StructuredDataLocationInput | null {
    var venue = this.matchInfo && this.matchInfo.venue ? this.matchInfo.venue : null;
    var location = this.buildStructuredDataLocationFromVenue(venue);
    if (location) {
      return location;
    }

    var fallbackVenue = this.currentMatch && this.currentMatch.venue ? this.currentMatch.venue : null;
    return this.buildStructuredDataLocationFromVenue(fallbackVenue);
  }

  private buildStructuredDataLocationFromVenue(venue: any): StructuredDataLocationInput | null {
    if (!venue) {
      return null;
    }

    if (typeof venue === 'string') {
      var venueName = this.cleanStructuredDataVenueName(venue);
      if (!venueName) {
        return null;
      }

      var parts = venueName.split(',').map(function(part) {
        return part.trim();
      }).filter(function(part) {
        return !!part;
      });
      var address: any = {};

      if (parts.length >= 2) {
        address.addressLocality = parts[1];
      }

      if (parts.length >= 3) {
        address.addressRegion = parts[2];
      }

      if (parts.length >= 4) {
        address.addressCountry = parts.slice(3).join(', ');
      }

      return {
        name: venueName,
        address: Object.keys(address).length > 0 ? address : undefined
      };
    }

    var name = this.cleanStructuredDataVenueName(venue.name || venue.venue || venue.ground || venue.stadium || '');
    if (!name) {
      return null;
    }

    var address: any = {};
    if (venue.address && typeof venue.address === 'string') {
      address.streetAddress = venue.address;
    }
    if (venue.city) {
      address.addressLocality = venue.city;
    }
    if (venue.state || venue.region) {
      address.addressRegion = venue.state || venue.region;
    }
    if (venue.country) {
      address.addressCountry = venue.country;
    }

    return {
      name: name,
      address: Object.keys(address).length > 0 ? address : undefined
    };
  }

  private cleanStructuredDataVenueName(value: string): string | null {
    var cleaned = String(value || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return null;
    }

    if (/^(venue tbd|venue not available|tbd|n\/a|na)$/i.test(cleaned)) {
      return null;
    }

    if (/match updates|^\d+(st|nd|rd|th)\s+match\b/i.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  private getStructuredDataStatus(): 'Scheduled' | 'LiveEvent' | 'EventCompleted' {
    var status = String((this.matchInfo && (this.matchInfo.match_status || this.matchInfo.status))
      || (this.currentMatch && this.currentMatch.status)
      || '').toLowerCase();

    if (/complete|finished|result|won by|draw|tied/.test(status)) {
      return 'EventCompleted';
    }

    if (/live|in progress|delayed|stumps/.test(status)) {
      return 'LiveEvent';
    }

    return 'Scheduled';
  }

  private toIsoDate(value: any): string | null {
    if (!value) {
      return null;
    }

    var normalizedValue = value;
    if (typeof value === 'string' && !/\b(?:19|20)\d{2}\b/.test(value)) {
      // CREX-style match labels often contain a weekday, day, month and time,
      // but no year (for example "Tuesday, 28 July, 5:30 AM").  Date.parse
      // then chooses an arbitrary historic year, which is worse than omitting
      // an Event.  The canonical match slug carries the scheduled season year.
      var slugYearMatch = String(this.matchId || '').match(/\b((?:19|20)\d{2})\b/);
      if (!slugYearMatch) {
        return null;
      }

      var timeSuffixMatch = value.match(/,\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*$/i);
      if (!timeSuffixMatch) {
        return null;
      }

      normalizedValue = value.slice(0, timeSuffixMatch.index) + ' ' + slugYearMatch[1] + ', ' + timeSuffixMatch[1];
    }

    var parsed = new Date(normalizedValue);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  setVenuePercentages() {
    // Ensure that win_bat_first exists and is a string
    const batFirstStr: string = this.matchInfo.venue_stats.win_bat_first || '0%';
    this.winBatFirstPercentage = this.parsePercentage(batFirstStr);
    this.winBowlFirstPercentage = 100 - this.winBatFirstPercentage;

    // Optional: Validate percentages
    if (this.winBatFirstPercentage < 0 || this.winBatFirstPercentage > 100) {
      console.warn('win_bat_first percentage out of bounds:', this.winBatFirstPercentage);
      this.winBatFirstPercentage = Math.max(0, Math.min(this.winBatFirstPercentage, 100));
      this.winBowlFirstPercentage = 100 - this.winBatFirstPercentage;
    }
  }

  parsePercentage(value: string): number {
    // Remove '%' and convert to number
    const num = parseFloat(value.replace('%', ''));
    return isNaN(num) ? 0 : num;
  }

getPlayerIcon(role: string): string {
  if (role.toLowerCase().includes('batter')) {
    return 'sports_cricket';
  } else if (role.toLowerCase().includes('bowler')) {
    return 'emoji_events';
  } else if (role.toLowerCase().includes('all rounder')) {
    return 'autorenew';
  } else if (role.toLowerCase().includes('wk')) {
    return 'sports';
  } else {
    return 'person';
  }
}

calculateBowlFirstPercentage(): void {
  this.bowlFirstPercentage = 100 - this.matchInfo.venue_stats.win_bat_first;
}

getTeamLogo(team: string): string {
  // Return the path to the team's logo
  return `assets/team-logos/${team.toLowerCase()}.png`;
}

getResultClass(result: string): string {
  switch (result) {
    case 'W':
      return 'win';
    case 'L':
      return 'loss';
    case 'D':
      return 'draw';
    default:
      return '';
  }
}

formatAndGroupExposures(exposures: any): Record<string, FormattedExposure> {
  const formattedExposures: Record<string, FormattedExposure> = {};

  Object.keys(exposures).forEach(key => {
    const parts = key.replace('Adjusted', '').trim().split(' ');
    const teamName = parts.slice(0, -1).join(' '); 
    const outcome = parts[parts.length - 1].toLowerCase(); 

    if (!formattedExposures[teamName]) {
      formattedExposures[teamName] = { win: 0, lose: 0 };
    }

    if (outcome === 'win') {
      formattedExposures[teamName].win = exposures[key];
    } else if (outcome === 'lose') {
      formattedExposures[teamName].lose = exposures[key];
    }
  });

  return formattedExposures;
}

// Function to clear the stake
clearStake() {
  this.betAmount = 0;
}

placeSessionBet() {
  if (this.betAmount <= 0) {
    // Handle invalid bet
    return;
  }

  let bet: Bet = {
    teamName: this.battingTeam,
    betType: this.selectedBetType,
    amount: Number(this.betAmount),
    odd: Number(this.selectedOdds),
    isSessionBet: true, // Explicitly set as boolean true
    sessionName: this.session,
    matchUrl: this.matchUrl
  };

  this.isBetProcessing = true;

  this.cricketService.placeBet(bet).pipe(timeout(10000)).subscribe({
    next: (response: any) => {
      console.log('Bet response received for match bet', response);
      
      // Assuming response.bet contains the bet object
      if (response.bet) {
        const bet = response.bet;
  
        if (bet.status === "Confirmed") {
          this.showToast('Bet placed and confirmed!', 'Close');
        } else if (bet.status === "Cancelled") {
          this.showToast('Bet was cancelled: ' + bet.teamName, 'Close');
        } else {
          this.showToast('Bet status: ' + bet.status, 'Close');
        }
      } else {
        this.showToast('No bet found in the response', 'Close');
      }
  
      this.isBetProcessing = false;
      this.loadUserBets();
    },
    error: (error: any) => {
      if (error.name === 'TimeoutError') {
        console.error('Error placing bet: Request timed out', error);
        this.showToast('Error placing bet: Request timed out', 'Close');
      } else {
        console.error('Error placing bet', error);
        this.showToast('Error placing bet: ' + error.message, 'Close');
      }
      this.isBetProcessing = false;
    }
  });
}

  // 002-match-details-ux: Helper to extract matchId from URL
  private extractMatchIdFromUrl(url: string): string | null {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (trimmed && trimmed.indexOf('/') === -1 && /[-\d]/.test(trimmed)) {
      return trimmed;
    }

    const extractedSlug = extractSlugFromUrl(trimmed);
    if (extractedSlug) {
      return extractedSlug;
    }
    
    // Try to extract match ID from various URL patterns
    // Example patterns: /match/12345, ?matchId=12345, /cricket-odds/12345
    const patterns = [
      /\/match\/([^\/\?]+)/,
      /matchId=([^&]+)/,
      /\/cricket-odds\/([^\/\?]+)/,
      /\/(\d+)$/  // numeric ID at end
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  private normalizeRouteMatchKey(routeMatchKey: string): string {
    if (!routeMatchKey) {
      return '';
    }

    const normalizedFromParam = normalizeMatchRoutePath(routeMatchKey);
    if (normalizedFromParam) {
      return normalizedFromParam.replace(/^\/cric-live\//, '');
    }

    const extractedFromParam = extractSlugFromUrl(routeMatchKey);
    if (extractedFromParam) {
      return extractedFromParam;
    }

    const currentRouteUrl = this.router && this.router.url ? this.router.url : '';
    const normalizedFromCurrentUrl = normalizeMatchRoutePath(currentRouteUrl);
    if (normalizedFromCurrentUrl) {
      return normalizedFromCurrentUrl.replace(/^\/cric-live\//, '');
    }

    const extractedFromCurrentUrl = extractSlugFromUrl(currentRouteUrl);
    if (extractedFromCurrentUrl) {
      return extractedFromCurrentUrl;
    }

    return routeMatchKey;
  }

  private getRequestedMatchPath(routeSlug?: string): string {
    const currentRouteUrl = this.router && this.router.url ? this.router.url : '';
    const cleanRouteUrl = currentRouteUrl ? currentRouteUrl.split('?')[0].split('#')[0] : '';
    if (cleanRouteUrl && cleanRouteUrl.indexOf('/cric-live/') === 0) {
      return cleanRouteUrl;
    }

    const normalized = normalizeMatchRoutePath(cleanRouteUrl || routeSlug || '');
    if (normalized) {
      return normalized;
    }

    return routeSlug ? '/cric-live/' + routeSlug : '/matches';
  }


  getProbability(odds: any): string {
    const num = Number(odds);
    if (!num || isNaN(num) || num <= 0) return '0%';
    // Odds format: 68 means decimal odds 1.68 → probability = 100 / 1.68 = 59.5%
    return (10000 / (100 + num)).toFixed(1) + '%';
  }

  getProbabilityPercent(odds: any): number {
    const num = Number(odds);
    if (!num || isNaN(num) || num <= 0) return 0;
    // Odds format: 68 means decimal odds 1.68 → probability = 100 / 1.68
    return 10000 / (100 + num);
  }
  getBarWidth(odds: any, otherOdds: any): string {
    const p1 = this.getProbabilityPercent(odds);
    const p2 = this.getProbabilityPercent(otherOdds);
    if (p1 + p2 === 0) return '50%';
    return (p1 / (p1 + p2) * 100).toFixed(1) + '%';
  }

  getCommentaryClass(entry: any): string {
    switch (entry.type) {
      case 'WICKET': return 'commentary-wicket';
      case 'OVER_SUMMARY': return 'commentary-over-summary';
      case 'BOUNDARY':
        if (entry.runs === 6 || (Array.isArray(entry.highlights) && entry.highlights.includes('SIX'))) {
          return 'commentary-six';
        }
        return 'commentary-boundary';
      default: return 'commentary-ball';
    }
  }

  getCommentaryIcon(entry: any): string {
    switch (entry.type) {
      case 'WICKET': return '✕';
      case 'OVER_SUMMARY': return '●';
      case 'BOUNDARY':
        if (entry.runs === 6 || (Array.isArray(entry.highlights) && entry.highlights.includes('SIX'))) {
          return '6';
        }
        return '4';
      default: return '';
    }
  }

  getRunsBadge(entry: any): string {
    if (entry.type === 'WICKET') return 'W';
    if (entry.type === 'OVER_SUMMARY') return '';
    // Detect wide/no-ball from text
    const text = (entry.text || '').toUpperCase();
    if (text.includes('WIDE BALL') || text.includes('WIDE!')) return 'wd';
    if (text.includes('NO BALL') || text.includes('NO-BALL')) return 'nb';
    const runs = this.getCommentaryRunsValue(entry);
    if (runs !== null) return String(runs);
    return '';
  }

  getRunsBadgeClass(entry: any): string {
    if (entry.type === 'WICKET') return 'runs-badge--wicket';
    // Detect wide/no-ball from text
    const text = (entry.text || '').toUpperCase();
    if (text.includes('WIDE BALL') || text.includes('WIDE!')) return 'runs-badge--wide';
    if (text.includes('NO BALL') || text.includes('NO-BALL')) return 'runs-badge--noball';
    const runs = this.getCommentaryRunsValue(entry);
    const r = runs === null ? Number.NaN : Number(runs);
    if (r === 4) return 'runs-badge--four';
    if (r === 6) return 'runs-badge--six';
    if (r === 0) return 'runs-badge--dot';
    return 'runs-badge--run';
  }

  isCommentaryLive(): boolean {
    var status = String((this.matchInfo && (this.matchInfo.match_status || this.matchInfo.status))
      || (this.currentMatch && (this.currentMatch.displayStatus || this.currentMatch.status))
      || (this.cricObj && this.cricObj.matchType)
      || '').toLowerCase();

    if (!status) {
      return this.cricObj ? this.cricObj.matchType !== 'COMPLETED' : true;
    }

    return !/complete|finished|result|won by|draw|tied/.test(status);
  }

  getCommentaryStatusLabel(): string {
    return this.isCommentaryLive() ? 'Live' : 'Completed';
  }

  getCommentaryEventLabel(entry: any): string {
    if (!entry) {
      return '';
    }

    if (entry.type === 'WICKET') {
      return 'Wicket';
    }

    var text = String(entry.text || '').toUpperCase();
    if (text.includes('WIDE BALL') || text.includes('WIDE!')) {
      return 'Wide';
    }
    if (text.includes('NO BALL') || text.includes('NO-BALL')) {
      return 'No ball';
    }

    if (entry.type === 'BOUNDARY') {
      if (entry.runs === 6 || (Array.isArray(entry.highlights) && entry.highlights.includes('SIX'))) {
        return 'Six';
      }
      if (entry.runs === 4) {
        return 'Four';
      }
      return 'Boundary';
    }

    return '';
  }

  getOverSummaryLabel(entry: any): string {
    var overNumber = entry && entry.overNumber !== undefined && entry.overNumber !== null
      ? String(entry.overNumber)
      : '';

    if (!overNumber) {
      return 'Over break';
    }

    return 'Over ' + overNumber;
  }

  getOverSummaryScore(entry: any): string {
    return entry && entry.totalScore ? String(entry.totalScore) : '';
  }

  getOverSummaryText(entry: any): string {
    var text = String((entry && entry.text) || '').trim();
    if (!text) {
      return '';
    }

    text = text.replace(/^End of over\s+\d+(?:\.\d+)?\s*:\s*/i, '');
    text = text.replace(/\s+\|\s+/g, ' • ');
    return text;
  }

  getCommentaryPrimaryText(entry: any): string {
    var text = String((entry && entry.text) || '').trim();
    if (!text) {
      return '';
    }

    var structuredParts = this.splitCommentaryText(text);
    return structuredParts.primary;
  }

  getCommentarySecondaryText(entry: any): string {
    var text = String((entry && entry.text) || '').trim();
    if (!text) {
      return '';
    }

    var structuredParts = this.splitCommentaryText(text);
    return structuredParts.secondary;
  }

  private getCommentaryRunsValue(entry: any): number | null {
    if (!entry) {
      return null;
    }

    if (entry.runs !== undefined && entry.runs !== null && entry.runs !== '') {
      var directRuns = Number(entry.runs);
      if (!Number.isNaN(directRuns)) {
        return directRuns;
      }
    }

    var text = String(entry.text || '').trim().toUpperCase();
    if (!text) {
      return null;
    }

    if (text.includes('NO RUN')) {
      return 0;
    }

    var runMatch = text.match(/\b([1-6])\s+(RUN|RUNS|BYE|BYES|LEG BYE|LEG BYES)\b/);
    if (runMatch) {
      return Number(runMatch[1]);
    }

    if (text.startsWith('FOUR') || text.includes(' FOUR,')) {
      return 4;
    }

    if (text.startsWith('SIX') || text.includes(' SIX,')) {
      return 6;
    }

    return null;
  }

  private splitCommentaryText(text: string): { primary: string; secondary: string } {
    var cleanText = String(text || '').trim().replace(/\s+/g, ' ');
    if (!cleanText) {
      return { primary: '', secondary: '' };
    }

    var firstCommaIndex = cleanText.indexOf(',');
    if (firstCommaIndex === -1) {
      return { primary: cleanText, secondary: '' };
    }

    var primary = cleanText.slice(0, firstCommaIndex).trim();
    var secondary = cleanText.slice(firstCommaIndex + 1).trim();

    return {
      primary: primary || cleanText,
      secondary
    };
  }
}
