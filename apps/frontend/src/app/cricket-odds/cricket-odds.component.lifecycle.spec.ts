import { CricketOddsComponent } from './cricket-odds.component';
import { of } from 'rxjs';

function createComponent(): CricketOddsComponent {
  var cricketService = {
    getMatchInfo: function() { return of(null); },
    getScorecardInfo: function() { return of(null); },
    hasFreshPlayerStatsMatchCache: function() { return false; },
    getPlayerStatsMatch: function() { return of(null); },
    listSeries: function() { return of([]); },
    getPlayerStatsSeriesStandings: function() { return of(null); }
  };
  var structuredDataService = {
    breadcrumbs: function(items: any) { return { '@type': 'BreadcrumbList', itemListElement: items }; },
    article: function(input: any) { return Object.assign({ '@type': 'Article' }, input); },
    newsArticle: function(input: any) { return Object.assign({ '@type': 'NewsArticle' }, input); },
    itemList: function(input: any) { return Object.assign({ '@type': 'ItemList' }, input); },
    faqPage: function(items: any) { return { '@type': 'FAQPage', mainEntity: items }; },
    sportsEvent: function(input: any) { return Object.assign({ '@type': 'SportsEvent' }, input); },
    liveBlogPosting: function(input: any) { return Object.assign({ '@type': 'LiveBlogPosting' }, input); },
    setPageSchemas: function() {},
    getPageSchemas: function() { return []; },
    clearPageSchemas: function() {}
  };

  return new CricketOddsComponent(
    {} as any,
    cricketService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    structuredDataService as any,
    { snapshot: { params: { path: 'team-a-vs-team-b-123A' }, queryParamMap: { get: function() { return null; } } } } as any,
    { url: '/cric-live/team-a-vs-team-b-123A' } as any,
    { run: function(work: Function) { return work(); } } as any,
    { get: function() { return null; }, hasKey: function() { return false; }, set: function() {}, remove: function() {} } as any,
    {} as any,
    {} as any
  );
}

describe('CricketOddsComponent lifecycle tab defaults', () => {
  function setIndexableMatchSeo(component: CricketOddsComponent): void {
    component.matchSeo = {
      canonicalPath: '/cric-live/india-vs-australia-1st-match-world-cup-2026-match-updates-123A',
      canonicalUrl: 'https://www.crickzen.com/cric-live/india-vs-australia-1st-match-world-cup-2026-match-updates-123A',
      title: 'India vs Australia Live Score | Crickzen',
      description: 'India vs Australia match coverage.',
      ogImageUrl: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
      h1: 'India vs Australia Live Score',
      robots: 'index,follow',
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS',
      series: 'World Cup 2026',
      breadcrumbSeries: 'World Cup',
      statusLabel: 'Live',
      summary: 'India vs Australia match coverage.',
      isIndexable: true,
      routeIntent: {} as any,
      canonicalDecision: {} as any
    } as any;
  }

  it('renders one populated lifecycle answer with score, series, venue, and result facts', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = {
      match_status: 'COMPLETED',
      series_name: 'World Cup 2026',
      venue: 'Wankhede Stadium',
      final_result_text: 'India beat Australia by 5 wickets.',
      match_date: '2026-08-25T13:30:00.000Z'
    } as any;
    component.currentMatch = { resultSummary: 'India beat Australia by 5 wickets.' } as any;

    expect(component.getCanonicalMatchAeoState()).toBe('populated');
    var block = component.getCanonicalMatchAeoBlock();
    expect(block && block.lifecycle).toBe('completed');
    expect(block && block.answer).toContain('India beat Australia by 5 wickets.');
    expect(block && block.facts.some(function(fact) { return fact.label === 'Venue'; })).toBe(true);
  });

  it('keeps the lifecycle answer out of the indexable surface while match metadata is loading', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = null;
    component.isLoadingMatchInfo = true;
    (component as any).canonicalMatchAeoDataState = 'loading';

    expect(component.getCanonicalMatchAeoState()).toBe('loading');
    expect(component.getCanonicalMatchAeoBlock()).toBeNull();
  });

  it('keeps the lifecycle answer out of the indexable surface after an authoritative metadata error', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = null;
    component.isLoadingMatchInfo = false;
    (component as any).canonicalMatchAeoDataState = 'error';

    expect(component.getCanonicalMatchAeoState()).toBe('error');
    expect(component.getCanonicalMatchAeoBlock()).toBeNull();
  });

  it('hydrates the same populated match answer before any browser refetch', () => {
    var component = createComponent();
    var ssrMatchInfo = {
      match_status: 'INNINGS_BREAK',
      series_name: 'World Cup 2026',
      venue: 'Wankhede Stadium',
      match_date: '2026-08-25T13:30:00.000Z'
    };
    (component as any).transferState = {
      get: jasmine.createSpy('get').and.returnValue(ssrMatchInfo),
      remove: jasmine.createSpy('remove')
    };
    spyOn<any>(component, 'isBrowser').and.returnValue(true);
    setIndexableMatchSeo(component);
    component.matchInfo = (component as any).getHydratedState('cricket_match_info');
    (component as any).canonicalMatchAeoDataState = 'populated';

    var hydratedBlock = component.getCanonicalMatchAeoBlock();
    expect((component as any).transferState.get).toHaveBeenCalledWith('cricket_match_info', null);
    expect(hydratedBlock && hydratedBlock.lifecycle).toBe('innings-break');
    expect(hydratedBlock && hydratedBlock.answer).toContain('India vs Australia');
  });

  it('keeps a transferred innings-break answer populated while match-info retries', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = { match_status: 'LIVE' } as any;
    component.cricObj = {
      current_ball: 'Stumps',
      score: '265-8',
      batting_team: 'SL',
      over: 83.4
    } as any;
    (component as any).isFallbackMatchInfo = true;
    (component as any).canonicalMatchAeoDataState = 'error';

    expect(component.getCanonicalMatchAeoState()).toBe('populated');
    var block = component.getCanonicalMatchAeoBlock();
    expect(block && block.lifecycle).toBe('innings-break');
    expect(block && block.answer).toContain('SL 265/8');
  });

  it('uses the verified live snapshot score instead of a stale catalogue fallback', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = { match_status: 'INNINGS_BREAK' } as any;
    component.heroFallbackView = {
      score: { teamName: 'IND vs SL', runs: 0, wickets: 0, overs: '0.0' }
    } as any;
    component.cricObj = {
      current_ball: 'Stumps',
      score: '265-8',
      score_update: 'Stumps',
      batting_team: 'SL',
      over: 83.4
    } as any;

    var block = component.getCanonicalMatchAeoBlock();
    expect(block && block.answer).toContain('SL 265/8');
    expect(block && block.answer).not.toContain('0/0');
    expect(block && block.facts.some(function(fact) {
      return fact.label === 'Score' && fact.value.indexOf('SL 265/8') !== -1;
    })).toBe(true);
  });

  it('does not publish a 0/0 catalogue shell when a live snapshot is unavailable', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = { match_status: 'INNINGS_BREAK' } as any;
    component.heroFallbackView = {
      score: { teamName: 'IND vs SL', runs: 0, wickets: 0, overs: '0.0' }
    } as any;

    var block = component.getCanonicalMatchAeoBlock();
    expect(block && block.answer).toContain('does not include the current score');
    expect(block && block.answer).not.toContain('0/0');
  });

  it('treats verified stumps context as live-like before direct status arrives', () => {
    var component = createComponent();
    setIndexableMatchSeo(component);
    component.matchInfo = {} as any;
    component.currentMatch = { lastKnownState: 'Stumps' } as any;
    component.heroFallbackView = {
      score: { teamName: 'IND vs SL', runs: 0, wickets: 0, overs: '0.0' }
    } as any;

    var block = component.getCanonicalMatchAeoBlock();
    expect(block && block.lifecycle).toBe('innings-break');
    expect(block && block.answer).toContain('does not include the current score');
    expect(block && block.answer).not.toContain('0/0');
  });

  it('does not erase a transferred cricket snapshot when a refresh returns empty', () => {
    var component = createComponent();
    component.cricObj = {
      score: '265-8',
      batting_team: 'SL',
      over: 83.4,
      current_ball: 'Stumps'
    } as any;

    (component as any).parseCricObjData(null);

    expect(component.cricObj.score).toBe('265-8');
    expect(component.cricObj.current_ball).toBe('Stumps');
  });

  it('tracks the canonical page view when browser hydration reuses match-info', () => {
    var component = createComponent();
    var trackCanonicalMatchView = jasmine.createSpy('trackCanonicalMatchView');
    component.currentUrl = 'team-a-vs-team-b-123A';
    component.matchInfo = { match_status: 'LIVE' } as any;
    (component as any).analyticsService = { trackCanonicalMatchView: trackCanonicalMatchView };
    spyOn<any>(component, 'isBrowser').and.returnValue(true);

    component.fetchMatchInfo('team-a-vs-team-b-123A');

    expect(trackCanonicalMatchView).toHaveBeenCalledWith({
      matchSlug: 'team-a-vs-team-b-123A',
      matchPath: '/cric-live/team-a-vs-team-b-123A',
      lifecycle: 'live',
      surface: 'cric-live'
    });
  });

  it('tracks authoritative SSR match-info before route fallback replaces it', () => {
    var component = createComponent();
    var trackCanonicalMatchView = jasmine.createSpy('trackCanonicalMatchView');
    component.matchInfo = { match_status: 'LIVE' } as any;
    (component as any).analyticsService = { trackCanonicalMatchView: trackCanonicalMatchView };
    (component as any).cricketService.getLastUpdatedData = function() { return of(null); };
    (component as any).rxStompService = { watch: function() { return of(null); } };
    spyOn<any>(component, 'isBrowser').and.returnValue(true);
    spyOn<any>(component, 'loadCanonicalIntelligence');
    spyOn<any>(component, 'populateFallbackMatchInfo');
    spyOn<any>(component, 'resolveRouteMatch');
    spyOn<any>(component, 'fetchMatchInfo');

    (component as any).fetchCricketData();

    expect(trackCanonicalMatchView).toHaveBeenCalledWith(jasmine.objectContaining({
      lifecycle: 'live',
      matchSlug: 'team-a-vs-team-b-123A'
    }));
  });

  it('defaults live matches to commentary', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.currentMatch = { status: 'LIVE' } as any;

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(0);
  });

  it('defaults upcoming matches to match details', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(0);
  });

  it('defaults completed matches to scorecard', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.matchInfo = { match_status: 'COMPLETED' };

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(2);
  });

  it('respects explicit scorecard routes over lifecycle defaults', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A/scorecard';
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(2);
  });

  it('does not treat the initial tab event as a user override', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';

    component.onTabChange({ index: 0 } as any);
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection();

    expect(component.selectedTabIndex).toBe(0);
  });

  it('keeps a bare completed canonical URL when its lifecycle default tab initializes', () => {
    var component = createComponent();
    var navigate = jasmine.createSpy('navigate');
    (component as any).router = {
      url: '/cric-live/team-a-vs-team-b-123A',
      navigate: navigate
    };
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.matchInfo = { match_status: 'COMPLETED' };

    component.onTabChange({ index: 2 } as any);

    expect(navigate).not.toHaveBeenCalled();
    expect(component.selectedTabIndex).toBe(2);
  });

  it('retains a stopped provider row when the canonical match lifecycle is completed', () => {
    var component = createComponent();

    var intelligence = (component as any).buildCanonicalIntelligence({
      lifecycle: 'completed',
      freshnessState: 'stale',
      publicPrediction: {
        status: 'stopped',
        batting_team: 'EDR',
        win_probability_pct: 100,
        prediction_history: [
          { over: '17.5', win_probability_pct: 99 },
          { over: '18.1', win_probability_pct: 100 }
        ],
        updated_at: '2026-08-01T11:50:52.732993',
        model_label: 'T20 all-gender v2'
      }
    });

    expect(intelligence.lifecycle).toBe('completed');
    expect(intelligence.probability).toBe(100);
    expect(intelligence.headline).toContain('finished');
    expect(intelligence.nextStep).toContain('scorecard');
  });

  it('adds a lifecycle-specific next step to live and upcoming canonical intelligence', () => {
    var component = createComponent();
    var live = (component as any).buildCanonicalIntelligence({
      lifecycle: 'live',
      freshnessState: 'fresh',
      publicPrediction: { batting_team: 'IND', win_probability_pct: 64, updated_at: '2026-08-01T20:00:00Z' }
    });
    var upcoming = (component as any).buildCanonicalIntelligence({
      lifecycle: 'upcoming',
      freshnessState: 'fresh',
      publicPrediction: { batting_team: 'AUS', win_probability_pct: 53, updated_at: '2026-08-01T20:00:00Z' }
    });

    expect(live.nextStep).toContain('next scoring phase');
    expect(upcoming.nextStep).toContain('toss and confirmed XI');
  });

  it('preserves a real user tab change over later lifecycle defaults', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.selectedTabIndex = 0;

    component.onTabChange({ index: 2 } as any);
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection();

    expect(component.selectedTabIndex).toBe(2);
  });

  it('does not refetch the three match catalogs when resolving a route slug', () => {
    var component = createComponent();
    var catalogs = {
      getLiveMatches: jasmine.createSpy('getLiveMatches'),
      getUpcomingMatches: jasmine.createSpy('getUpcomingMatches'),
      getCompletedMatches: jasmine.createSpy('getCompletedMatches')
    };
    (component as any).eventListService = catalogs;
    spyOn<any>(component, 'updateSeriesFallbackContext');
    spyOn<any>(component, 'updatePageTitle');
    spyOn<any>(component, 'fetchPlayerStatsForMatch');

    (component as any).resolveRouteMatch('team-a-vs-team-b-123A');

    expect(catalogs.getLiveMatches).not.toHaveBeenCalled();
    expect(catalogs.getUpcomingMatches).not.toHaveBeenCalled();
    expect(catalogs.getCompletedMatches).not.toHaveBeenCalled();
    expect((component as any).fetchPlayerStatsForMatch).toHaveBeenCalled();
  });

  it('loads scorecard only when the scorecard tab is active after metadata arrives', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A/scorecard';
    component.selectedTabIndex = (component as any).tabIndexByKey.scorecard;
    spyOn<any>(component, 'ensureDataForTab');
    spyOn<any>(component, 'updatePageTitle');
    spyOn<any>(component, 'updateSeriesFallbackContext');
    (component as any).cricketService.getMatchInfo = jasmine.createSpy('getMatchInfo').and.returnValue({
      subscribe: function(next: Function) {
        next({ match_status: 'LIVE', venue_stats: { win_bat_first: '50%' } });
        return { unsubscribe: function() {} };
      }
    });

    component.fetchMatchInfo('team-a-vs-team-b-123A');

    expect((component as any).ensureDataForTab).toHaveBeenCalledWith(
      (component as any).tabIndexByKey.scorecard
    );
    expect((component as any).updateSeriesFallbackContext).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'LIVE' })
    );
  });

  it('settles the Details tab with fallback information when match-info completes without data', () => {
    var component = createComponent();
    spyOn<any>(component, 'populateFallbackMatchInfo');
    spyOn<any>(component, 'syncMatchTabSelection');
    (component as any).cricketService.getMatchInfo = jasmine.createSpy('getMatchInfo').and.returnValue({
      subscribe: function(_next: Function, _error: Function, complete: Function) {
        complete();
        return { unsubscribe: function() {} };
      }
    });

    component.fetchMatchInfo('team-a-vs-team-b-123A');

    expect(component.isLoadingMatchInfo).toBe(false);
    expect((component as any).populateFallbackMatchInfo).toHaveBeenCalled();
    expect((component as any).syncMatchTabSelection).toHaveBeenCalled();
  });

  it('hydrates completed route identity from match-info before resolving retained entities', () => {
    var component = createComponent();
    spyOn<any>(component, 'updateSeriesFallbackContext');
    spyOn<any>(component, 'updatePageTitle');
    (component as any).cricketService.getMatchInfo = jasmine.createSpy('getMatchInfo').and.returnValue({
      subscribe: function(next: Function) {
        next({
          match_status: 'COMPLETED',
          match_name: 'The Hundred 2026',
          url: 'https://crex.com/cricket-live-score/ls-vs-sb-16th-match-the-hundred-2026-men-match-updates-ZKU',
          team_comparison: { LS: {}, SB: {} },
          venue_stats: {}
        });
        return { unsubscribe: function() {} };
      }
    });

    component.fetchMatchInfo('ls-vs-sb-16th-match-the-hundred-2026-men-match-updates-ZKU');

    expect((component as any).updateSeriesFallbackContext).toHaveBeenCalledWith(jasmine.objectContaining({
      status: 'COMPLETED',
      seriesName: 'The Hundred 2026',
      team1: jasmine.objectContaining({ shortName: 'LS' }),
      team2: jasmine.objectContaining({ shortName: 'SB' })
    }));
  });

  it('loads Details when Material selects the tab from an already-matching child route', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A/match-details';
    spyOn<any>(component, 'ensureDataForTab');

    component.onTabChange({ index: (component as any).tabIndexByKey.details } as any);

    expect((component as any).ensureDataForTab).toHaveBeenCalledWith(
      (component as any).tabIndexByKey.details
    );
  });

  it('does not try to load scorecard data for upcoming matches', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'UPCOMING' };
    component.scorecardData = { innings: [1] } as any;

    component.fetchScorecardInfo('team-a-vs-team-b-123A');

    expect(component.isLoadingScorecard).toBe(false);
    expect(component.scorecardData).toBeNull();
  });

  it('builds an upcoming hero fallback as a scheduled fixture rather than live match state', () => {
    var component = createComponent();
    var view = (component as any).buildHeroFallbackView({
      externalMatchKey: 'ind-vs-aus-1st-t20-123A',
      status: 'UPCOMING',
      scheduledStartTime: '2026-08-02T13:30:00.000Z',
      team1: { name: 'India', shortName: 'IND' },
      team2: { name: 'Australia', shortName: 'AUS' }
    });

    expect(view.status).toBe('UPCOMING');
    expect(view.score.teamName).toBe('IND vs AUS');
    expect(view.score.resultSummary).toBeNull();
  });

  it('uses honest upcoming commentary placeholder copy in the canonical intent rail', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'UPCOMING' };
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS'
    } as any;

    expect(component.getCommentaryIntentLabel()).toContain('India vs Australia');
    expect(component.getCommentaryIntentLabel()).toContain('IND vs AUS');
    expect(component.getCommentaryIntentLabel()).toContain('will begin here');
  });

  it('surfaces the latest commentary text in the canonical intent rail when updates exist', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'LIVE' };
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS'
    } as any;
    component.commentaryEntries = [
      { text: '16.2 FOUR! Driven through covers for four more runs.' }
    ];

    expect(component.getCommentaryIntentLabel()).toContain('India vs Australia live commentary');
    expect(component.getCommentaryIntentLabel()).toContain('FOUR!');
  });

  it('keeps scorecard copy honest before innings data exists', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'UPCOMING' };
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS'
    } as any;

    expect(component.getScorecardIntentLabel()).toContain('India vs Australia scorecard');
    expect(component.getScorecardIntentLabel()).toContain('IND vs AUS');
    expect(component.getScorecardIntentLabel()).toContain('will populate');
  });

  it('exposes short-team jump labels for commentary and scorecard intent', () => {
    var component = createComponent();
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS'
    } as any;

    expect(component.getCommentaryJumpLabel()).toBe('IND vs AUS commentary');
    expect(component.getScorecardJumpLabel()).toBe('IND vs AUS scorecard');
  });

  it('prioritizes preview support links for upcoming lineups and details sections', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'UPCOMING' };
    component.freshnessLinks = [
      { href: '/cricket-match-preview/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS preview', summary: 'Preview', type: 'preview' },
      { href: '/cricket-live-updates/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS live updates', summary: 'Live', type: 'live-updates' },
      { href: '/cricket-match-report/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS result and highlights', summary: 'Result', type: 'result' }
    ] as any;

    expect(component.getLineupsSupportLinks().map(function(link) { return link.type; })).toEqual(['preview']);
    expect(component.getDetailsSupportLinks().map(function(link) { return link.type; })).toEqual(['preview', 'live-updates']);
    expect(component.getScorecardSupportLinks().map(function(link) { return link.type; })).toEqual(['preview', 'live-updates']);
  });

  it('retains result support links for completed scorecard and match-info sections', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'COMPLETED' };
    component.freshnessLinks = [
      { href: '/cricket-match-preview/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS preview', summary: 'Preview', type: 'preview' },
      { href: '/cricket-live-updates/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS live updates', summary: 'Live', type: 'live-updates' },
      { href: '/cricket-match-report/ind-vs-aus-1st-odi-123A', label: 'IND vs AUS result and highlights', summary: 'Result', type: 'result' }
    ] as any;

    expect(component.getScorecardSupportLinks().map(function(link) { return link.type; })).toEqual(['result']);
    expect(component.getLineupsSupportLinks().map(function(link) { return link.type; })).toEqual(['result']);
    expect(component.getDetailsSupportLinks().map(function(link) { return link.type; })).toEqual(['result', 'live-updates']);
  });

  it('publishes only authoritative team entity links for retained completed matches', () => {
    var component = createComponent();
    component.currentMatch = {
      team1: { id: 'match-1-team1', name: 'Synthetic Team' },
      team2: { id: 'team-22', name: 'Australia Women' }
    } as any;
    component.playerStatsMatch = {
      teams: [
        { externalId: 'team-11', name: 'Pakistan Women' },
        { externalId: 'team-22', name: 'Australia Women' }
      ]
    } as any;

    expect(component.getMatchTeamEntityLinks()).toEqual([
      { label: 'Pakistan Women team profile', href: '/teams/team-11/pakistan-women' },
      { label: 'Australia Women team profile', href: '/teams/team-22/australia-women' }
    ]);
  });

  it('resolves retained entity links through one exact series directory match', () => {
    var component = createComponent();
    component.currentMatch = {
      status: 'COMPLETED',
      externalMatchKey: 'ls-vs-sb-16th-match-the-hundred-2026-men-match-updates-ZKU',
      seriesName: 'The Hundred 2026 Men',
      team1: { shortName: 'LS' },
      team2: { shortName: 'SB' }
    } as any;
    (component as any).cricketService.listSeries = jasmine.createSpy('listSeries').and.returnValue(of([
      { externalId: 'series:the-hundred-2026-men-2AW', name: 'The Hundred 2026 Men' }
    ]));
    (component as any).cricketService.getPlayerStatsSeriesStandings = jasmine.createSpy('getPlayerStatsSeriesStandings').and.returnValue(of({
      standings: [{ payload: [
        { teamExternalId: 'team:london-spirit', teamName: 'London Spirit', teamCode: 'LS' },
        { teamExternalId: 'team:southern-brave', teamName: 'Southern Brave', teamCode: 'SB' },
        { teamExternalId: 'team:welsh-fire', teamName: 'Welsh Fire', teamCode: 'WF' }
      ] }]
    }));

    (component as any).resolveRetainedEntityNavigation(component.currentMatch);

    expect(component.getSeriesSurfaceHref()).toBe('/series/series%3Athe-hundred-2026-men-2AW/the-hundred-2026-men');
    expect(component.getMatchTeamEntityLinks()).toEqual([
      { label: 'London Spirit team profile', href: '/teams/team%3Alondon-spirit/london-spirit' },
      { label: 'Southern Brave team profile', href: '/teams/team%3Asouthern-brave/southern-brave' }
    ]);
  });

  it('builds visible match FAQs only from answerable match data', () => {
    var component = createComponent();
    component.currentMatch = { resultSummary: 'India beat Australia by 5 wickets.' } as any;
    component.matchInfo = {
      match_status: 'COMPLETED',
      toss_info: 'India won the toss and chose to bat.',
      venue: 'Wankhede Stadium',
      final_result_text: 'India beat Australia by 5 wickets.'
    } as any;
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS'
    } as any;

    expect(component.getMatchFaqItems().map(function(item) { return item.question; })).toContain('Who won the toss?');
    expect(component.getMatchFaqItems().map(function(item) { return item.question; })).toContain('What is the venue for the match?');
    expect(component.getMatchFaqItems().map(function(item) { return item.question; })).toContain('Who won the match?');
  });

  it('builds curated live match updates from commentary and synthetic match state', () => {
    var component = createComponent();
    component.matchInfo = {
      match_status: 'LIVE',
      toss_info: 'India won the toss and chose to bat.',
      updated_at: '2026-06-29T12:30:00.000Z'
    } as any;
    component.matchSeo = {
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS',
      series: 'World Cup'
    } as any;
    component.commentaryEntries = [
      { id: '1', type: 'WICKET', text: 'WICKET! Rohit holes out to deep midwicket.', timestamp: '2026-06-29T12:31:00.000Z', overBall: '12.4' },
      { id: '2', type: 'OVER_SUMMARY', text: 'End of over 10: India are 85/2 after 10 overs.', timestamp: '2026-06-29T12:20:00.000Z', totalScore: '85/2' }
    ];

    expect(component.getLiveMatchUpdates().length).toBeGreaterThan(1);
    expect(component.getLiveMatchUpdates().some(function(update) { return update.headline === 'Wicket'; })).toBe(true);
    expect(component.getLiveMatchUpdates().some(function(update) { return update.headline === 'Toss update'; })).toBe(true);
  });

  it('emits FAQPage and LiveBlogPosting only when canonical visible content supports them', () => {
    var component = createComponent();
    component.matchInfo = {
      match_status: 'LIVE',
      toss_info: 'India won the toss and chose to bat.',
      updated_at: '2026-06-29T12:30:00.000Z',
      match_date: '2026-06-29T12:00:00.000Z',
      venue: 'Wankhede Stadium'
    } as any;
    component.currentMatch = { lastUpdated: '2026-06-29T12:32:00.000Z' } as any;
    component.matchSeo = {
      canonicalPath: '/cric-live/ind-vs-aus-world-cup-final-123A',
      canonicalUrl: 'https://www.crickzen.com/cric-live/ind-vs-aus-world-cup-final-123A',
      title: 'India vs Australia Live Score, World Cup Final',
      description: 'Follow India vs Australia live score and match updates.',
      ogImageUrl: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
      h1: 'India vs Australia Live Score, World Cup Final',
      robots: 'index,follow',
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS',
      series: 'World Cup Final',
      breadcrumbSeries: 'World Cup',
      statusLabel: 'Live',
      summary: 'India vs Australia live score, commentary, and scorecard for the World Cup Final.',
      isIndexable: true
    } as any;
    component.commentaryEntries = [
      { id: '1', type: 'WICKET', text: 'WICKET! Rohit holes out to deep midwicket.', timestamp: '2026-06-29T12:31:00.000Z', overBall: '12.4' },
      { id: '2', type: 'OVER_SUMMARY', text: 'End of over 10: India are 85/2 after 10 overs.', timestamp: '2026-06-29T12:20:00.000Z', totalScore: '85/2' },
      { id: '3', type: 'COMMENTARY', text: 'India need 24 runs from 18 balls and the required rate keeps climbing.', timestamp: '2026-06-29T12:34:00.000Z' }
    ];

    var items = (component as any).buildStructuredDataItems();
    var types = (items || []).map(function(item: any) { return item['@type']; });

    expect(types).toContain('FAQPage');
    expect(types).toContain('LiveBlogPosting');
    expect(types).toContain('NewsArticle');
    expect((component as any).getNewsArticleEligibilityReason((component as any).getLiveMatchUpdates())).toBe('eligible');
  });

  it('keeps upcoming match pages on the normal Article contract', () => {
    var component = createComponent();
    component.matchInfo = {
      match_status: 'UPCOMING',
      updated_at: '2026-06-29T12:30:00.000Z',
      match_date: '2026-06-29T14:00:00.000Z',
      venue: 'Wankhede Stadium'
    } as any;
    component.matchSeo = {
      canonicalPath: '/cric-live/ind-vs-aus-world-cup-final-123A',
      canonicalUrl: 'https://www.crickzen.com/cric-live/ind-vs-aus-world-cup-final-123A',
      title: 'India vs Australia Upcoming Match',
      description: 'See the India vs Australia match schedule and venue.',
      ogImageUrl: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
      h1: 'India vs Australia Upcoming Match',
      robots: 'index,follow',
      teams: 'India vs Australia',
      team1: 'India',
      team2: 'Australia',
      team1Short: 'IND',
      team2Short: 'AUS',
      shortTeams: 'IND vs AUS',
      series: 'World Cup Final',
      breadcrumbSeries: 'World Cup',
      statusLabel: 'Upcoming',
      summary: 'India vs Australia match schedule and venue.',
      isIndexable: true
    } as any;

    var items = (component as any).buildStructuredDataItems();
    var types = (items || []).map(function(item: any) { return item['@type']; });

    expect(types).toContain('Article');
    expect(types).not.toContain('NewsArticle');
  });

  it('does not emit LiveBlogPosting for low-value sparse canonical pages', () => {
    var component = createComponent();
    component.matchInfo = {
      match_status: 'LIVE',
      updated_at: '2026-06-29T12:30:00.000Z',
      match_date: '2026-06-29T12:00:00.000Z'
    } as any;
    component.matchSeo = {
      canonicalPath: '/cric-live/team-a-vs-team-b-123A',
      canonicalUrl: 'https://www.crickzen.com/cric-live/team-a-vs-team-b-123A',
      title: 'Canada vs Nepal Live Score',
      description: 'Follow Canada vs Nepal live score.',
      ogImageUrl: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
      h1: 'Canada vs Nepal Live Score',
      robots: 'index,follow',
      teams: 'Canada vs Nepal',
      team1: 'Canada',
      team2: 'Nepal',
      team1Short: 'CAN',
      team2Short: 'NEP',
      shortTeams: 'CAN vs NEP',
      series: 'Regional Cup',
      breadcrumbSeries: 'Regional Cup',
      statusLabel: 'Live',
      summary: 'Canada vs Nepal live score.',
      isIndexable: true
    } as any;
    component.commentaryEntries = [
      { id: '1', type: 'COMMENTARY', text: 'Single to midwicket.', timestamp: '2026-06-29T12:31:00.000Z' }
    ];

    var items = (component as any).buildStructuredDataItems();
    var types = (items || []).map(function(item: any) { return item['@type']; });

    expect(types).not.toContain('LiveBlogPosting');
    expect(types).toContain('Article');
    expect(types).not.toContain('NewsArticle');
    expect((component as any).getNewsArticleEligibilityReason((component as any).getLiveMatchUpdates())).toBe('not_high_value_coverage');
  });

  it('does not treat synthetic summaries as editorial NewsArticle evidence', () => {
    var component = createComponent();
    component.matchInfo = {
      match_status: 'LIVE',
      venue: 'Wankhede Stadium'
    } as any;
    component.matchSeo = {
      teams: 'India vs Australia',
      series: 'World Cup Final',
      title: 'India vs Australia Live Score',
      isIndexable: true
    } as any;

    var syntheticUpdates = [
      { id: 'synthetic-1', body: 'Toss update is available from the official feed.', timestamp: '2026-06-29T12:30:00.000Z', source: 'synthetic' },
      { id: 'synthetic-2', body: 'Live score context will update as play progresses.', timestamp: '2026-06-29T12:31:00.000Z', source: 'synthetic' },
      { id: 'synthetic-3', body: 'Result context is being confirmed by the official feed.', timestamp: '2026-06-29T12:32:00.000Z', source: 'synthetic' }
    ];

    expect((component as any).getNewsArticleEligibilityReason(syntheticUpdates)).toBe('insufficient_timestamped_commentary');
    expect((component as any).shouldEmitNewsArticle(syntheticUpdates)).toBe(false);
  });

  it('requires a real modification timestamp even with substantive commentary', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'LIVE', venue: 'Wankhede Stadium' } as any;
    component.matchSeo = { teams: 'India vs Australia', series: 'World Cup Final' } as any;
    var updates = [1, 2, 3].map(function(index) {
      return {
        id: 'commentary-' + index,
        body: 'A substantive official commentary update with context ' + index,
        timestamp: '2026-06-29T12:3' + index + ':00.000Z',
        source: 'commentary'
      };
    });

    expect((component as any).getNewsArticleEligibilityReason(updates)).toBe('missing_real_modification_time');
  });
});

describe('CricketOddsComponent player stats retry platform guard', () => {
  var routeMatch = { url: 'team-a-vs-team-b-123A', externalMatchKey: 'team-a-vs-team-b-123A' };

  function mockPlayerStatsNotFound(component: CricketOddsComponent) {
    var service = (component as any).cricketService;
    service.hasFreshPlayerStatsMatchCache = function() { return false; };
    service.getPlayerStatsMatch = jasmine.createSpy('getPlayerStatsMatch').and.returnValue(of(null));
    return service;
  }

  it('does not schedule a retry during SSR when the player-stats snapshot 404s', () => {
    (window as any).__SSR__ = true;
    try {
      var component = createComponent();
      var service = mockPlayerStatsNotFound(component);

      (component as any).fetchPlayerStatsForMatch(routeMatch, 'team-a-vs-team-b-123A');

      expect(component.playerStatsError).toBe(true);
      expect((component as any).playerStatsRetryAttempt).toBe(0);
      expect((component as any).playerStatsRetryTimer).toBeNull();
      expect(service.getPlayerStatsMatch.calls.count()).toBe(1);
    } finally {
      delete (window as any).__SSR__;
    }
  });

  it('keeps browser-side retries after a player-stats 404 and caps them at three', () => {
    jasmine.clock().install();
    try {
      var component = createComponent();
      var service = mockPlayerStatsNotFound(component);

      (component as any).fetchPlayerStatsForMatch(routeMatch, 'team-a-vs-team-b-123A');

      expect(component.playerStatsError).toBe(true);
      expect((component as any).playerStatsRetryAttempt).toBe(1);
      expect((component as any).playerStatsRetryTimer).not.toBeNull();
      expect(service.getPlayerStatsMatch.calls.count()).toBe(1);

      jasmine.clock().tick(3000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(2);
      expect((component as any).playerStatsRetryAttempt).toBe(2);

      jasmine.clock().tick(6000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(3);
      expect((component as any).playerStatsRetryAttempt).toBe(3);

      jasmine.clock().tick(9000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(4);

      jasmine.clock().tick(12000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(4);
      expect((component as any).playerStatsRetryTimer).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('clears a pending browser retry when a fresh fetch starts', () => {
    jasmine.clock().install();
    try {
      var component = createComponent();
      var service = mockPlayerStatsNotFound(component);

      (component as any).fetchPlayerStatsForMatch(routeMatch, 'team-a-vs-team-b-123A');
      expect((component as any).playerStatsRetryTimer).not.toBeNull();

      // A fresh fetch cancels the pending retry and runs immediately.
      (component as any).fetchPlayerStatsForMatch(routeMatch, 'team-a-vs-team-b-123A');

      expect(service.getPlayerStatsMatch.calls.count()).toBe(2);
      expect((component as any).playerStatsRetryAttempt).toBe(2);

      // The replacement retry honours the growing backoff (3000 * attempt),
      // so nothing fires at the old 3-second point.
      jasmine.clock().tick(3000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(2);

      jasmine.clock().tick(3000);
      expect(service.getPlayerStatsMatch.calls.count()).toBe(3);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
