import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { RxStompService } from '@stomp/ng2-stompjs';
import { forkJoin, merge, Subject } from 'rxjs';
import { filter, switchMap, takeUntil, timeout } from 'rxjs/operators';
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
import { extractSlugFromUrl, getRecentBallDisplay, RecentBallKind } from '../core/utils/match-utils';
import { upsertCommentaryEntries } from './commentary.utils';
import { LiveHeroViewModel } from '../match-live/services/live-hero.models';
import { MatchSeoViewModel } from '../seo/match-seo.models';
import { MatchSeoService } from '../seo/match-seo.service';
import { MetaTagsService } from '../seo/meta-tags.service';
import { StructuredDataService } from '../seo/structured-data.service';

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
}

interface TeamStatsSelectionEvent {
  teamName: string;
  externalId?: string;
}

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
  playerStatsMatch: PlayerStatsMatchView | null = null;
  isLoadingPlayerStats: boolean = false;
  playerStatsError: boolean = false;
  seriesPageUrlFallback: string | null = null;
  private resolvedSeriesContext: PlayerStatsSeriesView | null = null;
  private lastResolvedRouteSlug: string | null = null;
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
              private ngZone: NgZone) { }

  ngOnDestroy() {
    this.tossWonCountrySubject.complete();
    this.batOrBallSelectedSubject.complete();

    // Unsubscribe from all subscriptions and subject
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cricetTopicSubscription) {
      this.cricetTopicSubscription.unsubscribe();
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

    const routeMatchKey = this.activatedRoute.snapshot.params['path']
      || this.activatedRoute.snapshot.params['url']
      || '';
    const legacyMatchUrl = this.activatedRoute.snapshot.queryParamMap.get('url');
    this.currentUrl = routeMatchKey;
    this.routeMatchHint = this.getNavigationMatchHint(routeMatchKey);
    if (this.routeMatchHint) {
      this.applyRouteMatchHint(this.routeMatchHint);
    }
    
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
      // Unsubscribe from WebSocket subscription when the route changes
      if (this.cricetTopicSubscription) {
        this.cricetTopicSubscription.unsubscribe();
      }
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

    //watching live score for cricet data
    this.fetchCricketData();

    if (this.isBrowser() && legacyMatchUrl && routeMatchKey) {
      this.stripLegacyMatchUrlParam(routeMatchKey);
    }

    //fetch user details from tokenStorage
    const user = this.tokenStorage.getUser();
    this.loggedUser =  JSON.parse(user);

    //this.loadUserBets();

    // Fetch match info for hero component display
    if (this.matchId || this.currentUrl) {
      this.fetchMatchInfo(this.matchId || this.currentUrl);
    }

  }
  


  private fetchCricketData() {
    const params = this.activatedRoute.snapshot.params;
    const match = params['path']; // Use 'path' instead of 'match'
    const isSameRouteMatch = !!(match && this.lastResolvedRouteSlug && this.lastResolvedRouteSlug === match);

    this.currentUrl = match || '';
    this.matchUrl = this.currentMatch && this.currentMatch.url ? this.currentMatch.url : (match || '');
    this.matchId = this.activatedRoute.snapshot.queryParamMap.get('matchId')
                  || params['matchId']
                  || match
                  || this.matchId;

    if (!isSameRouteMatch) {
      this.resetStatsExplorerState();
      this.playerStatsMatch = null;
      this.playerStatsError = false;
      this.currentMatch = null;
      this.resolvedSeriesContext = null;
      this.seriesPageUrlFallback = null;
      this.lastLiveBallEventToken = null;
      this.lastResolvedRouteSlug = match;
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

  private parseCricObjData(data) {
    // Check if 'data' has a 'body' property
    if(data && 'body' in data){
      this.cricObj = JSON.parse(data.body);
    } else {
      this.cricObj = data;
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
          console.log('Commentary entries updated:', this.commentaryEntries.length);
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
  var match = this.matchId || this.activatedRoute.snapshot.params['path'];
  if (event.index === 1) { // Match Info tab is selected
    this.fetchMatchInfo(match);
  } else if (event.index === 2) { // Scorecard tab is selected
    this.fetchScorecardInfo(match);
  } else if (event.index === 3) { // Lineups tab is selected (002-match-details-ux)
    // Load match info if not already loaded (needed for playing XI data)
    if (!this.matchInfo) {
      this.fetchMatchInfo(match);
    }
  }
}

fetchScorecardInfo(matchUrl:string){

  this.cricketService.getScorecardInfo(matchUrl).subscribe(
    data => {
      this.scorecardData = data;
      console.log('Match Scorecard:', this.scorecardData);
    },
    error => {
      console.error('Error fetching match scorecard:', error);
    }
  );
}

fetchMatchInfo(matchUrl:string) {
  if (this.matchInfo && !this.isFallbackMatchInfo) {
    // Data already fetched, no need to fetch again
    return;
  }

  this.cricketService.getMatchInfo(matchUrl).subscribe(
    data => {
      this.matchInfo = data;
      this.isFallbackMatchInfo = false;
      console.log('Match Info:', this.matchInfo);

      // T045: Update browser tab title with team names (Feature 008 - SEO)
      this.updatePageTitle();

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
      console.error('Error fetching match info:', error);
      this.populateFallbackMatchInfo();
    }
  );
}

private resolveRouteMatch(matchSlug: string): void {
  if (!matchSlug) {
    return;
  }

  var directMatchUrl = this.matchUrl && this.matchUrl.indexOf('/scoreboard/') !== -1 ? this.matchUrl : null;
  if (directMatchUrl && directMatchUrl.indexOf('/scoreboard/') !== -1) {
    var directMatch = {
      url: directMatchUrl,
      externalMatchKey: this.matchId || matchSlug,
      seriesName: this.currentMatch && this.currentMatch.seriesName ? this.currentMatch.seriesName : null,
      status: this.currentMatch && this.currentMatch.status ? this.currentMatch.status : null
    };

    this.currentMatch = directMatch;
    this.updateSeriesFallbackContext(directMatch);
    this.fetchPlayerStatsForMatch(directMatch, matchSlug);
    this.fetchMatchInfo(matchSlug);
    this.fetchScorecardInfo(matchSlug);
    return;
  }

  forkJoin([
    this.eventListService.getLiveMatches(),
    this.eventListService.getUpcomingMatches(),
    this.eventListService.getCompletedMatches()
  ]).subscribe(
    (payloads: any[]) => {
      var liveMatches = this.extractMatchCollection(payloads[0]);
      var upcomingMatches = this.extractMatchCollection(payloads[1]);
      var completedMatches = this.extractMatchCollection(payloads[2]);
      var resolvedMatch = liveMatches
        .concat(upcomingMatches)
        .concat(completedMatches)
        .find(match => this.routeSlugMatches(matchSlug, match));

      if (!resolvedMatch) {
        this.fetchPlayerStatsForMatch(null, matchSlug);
        return;
      }

      this.currentMatch = resolvedMatch;
      this.showLiveHero = this.isLiveLikeStatus(resolvedMatch.status);
      this.heroFallbackView = this.buildHeroFallbackView(resolvedMatch);
      this.updateSeriesFallbackContext(resolvedMatch);

      var resolvedUrl = resolvedMatch.url || matchSlug;
      if (resolvedUrl && resolvedUrl !== this.matchUrl) {
        this.matchUrl = resolvedUrl;
      }

      this.fetchPlayerStatsForMatch(resolvedMatch, matchSlug);

      if (!this.showLiveHero) {
        this.populateFallbackMatchInfo(resolvedMatch);
      }

      if (matchSlug) {
        this.fetchMatchInfo(matchSlug);
        this.fetchScorecardInfo(matchSlug);
      }
    },
    error => {
      console.error('Error resolving route match details:', error);
    }
  );
}

  private extractMatchCollection(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
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
  return status === 'LIVE' || status === 'INNINGS_BREAK' || status === 'RAIN_DELAY';
}

private fetchPlayerStatsForMatch(match?: any, fallbackExternalKey?: string): void {
  var externalMatchKey = match && match.externalMatchKey ? match.externalMatchKey : (this.matchId || fallbackExternalKey);
  var matchUrl = externalMatchKey ? undefined : (match && match.url ? match.url : (this.matchUrl || this.currentUrl));
  var hasFreshCachedSnapshot = this.cricketService.hasFreshPlayerStatsMatchCache(matchUrl, externalMatchKey);

  if (!matchUrl && !externalMatchKey) {
    return;
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
          return;
        }
        if (!this.playerStatsMatch) {
          this.playerStatsError = true;
        }
      },
      error => {
        console.error('Error loading player stats snapshot:', error);
        this.isLoadingPlayerStats = false;
        this.playerStatsError = true;
      }
    );
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
  if (!player || !player.externalId) {
    this.showToast('Detailed player stats are not available yet for ' + (player && player.name || 'this player') + '.', 'Dismiss');
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
  return !!(this.matchId && (this.hasPlayerStatsData() || this.isLoadingPlayerStats || this.playerStatsError || this.hasSelectedStatsExplorer()));
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
    this.showToast('Detailed player stats are not available yet for ' + selection.playerName + '.', 'Dismiss');
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
  if (this.playerStatsMatch && this.playerStatsMatch.series) {
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
    name: seriesName,
    shortName: seriesName
  } : null;
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
    this.showToast('Detailed player stats are not available yet.', 'Dismiss');
    return;
  }

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

private loadPlayerStatsDetailFromGlobalSearch(playerName: string): void {
  var normalizedName = this.normalizeComparableText(playerName);
  if (!normalizedName) {
    this.showToast('Detailed player stats are not available for this player.', 'Dismiss');
    return;
  }

  this.statsExplorerSource = 'scorecard';
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
          this.isLoadingStatsExplorer = false;
          this.statsExplorerErrorMessage = 'Detailed player stats are not available for ' + playerName + '.';
          return;
        }

        this.loadPlayerStatsDetail(player, null, 'scorecard');
      },
      error => {
        console.error('Error searching player details:', error);
        this.isLoadingStatsExplorer = false;
        this.statsExplorerErrorMessage = 'Detailed player stats could not be loaded right now.';
      }
    );
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
  var status = this.isLiveLikeStatus(match.status) ? match.status : 'COMPLETED';

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

    this.updateStructuredData();
  }

  /**
   * Extract URL slug from match URL - matches prerender.js extractUrlSlug()
   */
  private extractUrlSlug(url: string): string | null {
    return extractSlugFromUrl(url);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !(window as any).__SSR__;
  }

  private updateStructuredData(): void {
    var items = this.buildStructuredDataItems();
    if (items && items.length > 0) {
      this.structuredDataService.setPageSchemas(items);
      return;
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

    var startDate = this.toIsoDate(this.matchInfo && this.matchInfo.match_date);
    var venue = this.matchInfo && this.matchInfo.venue && this.matchInfo.venue !== 'Venue TBD'
      ? this.matchInfo.venue
      : undefined;
    var sportsEvent = this.structuredDataService.sportsEvent({
      name: this.matchSeo.h1,
      url: this.matchSeo.canonicalUrl,
      description: this.matchSeo.summary,
      homeTeam: this.matchSeo.team1,
      awayTeam: this.matchSeo.team2,
      startDate: startDate || undefined,
      location: venue,
      status: this.getStructuredDataStatus()
    });
    var breadcrumbs = this.structuredDataService.breadcrumbs([
      { name: 'Home', url: 'https://www.crickzen.com/' },
      { name: 'Matches', url: 'https://www.crickzen.com/matches' },
      { name: this.matchSeo.teams, url: this.matchSeo.canonicalUrl }
    ]);

    return [sportsEvent, breadcrumbs];
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

    var parsed = new Date(value);
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
    if (entry.runs !== undefined && entry.runs !== null) return String(entry.runs);
    return '';
  }

  getRunsBadgeClass(entry: any): string {
    if (entry.type === 'WICKET') return 'runs-badge--wicket';
    // Detect wide/no-ball from text
    const text = (entry.text || '').toUpperCase();
    if (text.includes('WIDE BALL') || text.includes('WIDE!')) return 'runs-badge--wide';
    if (text.includes('NO BALL') || text.includes('NO-BALL')) return 'runs-badge--noball';
    const r = Number(entry.runs);
    if (r === 4) return 'runs-badge--four';
    if (r === 6) return 'runs-badge--six';
    if (r === 0) return 'runs-badge--dot';
    return 'runs-badge--run';
  }
}
