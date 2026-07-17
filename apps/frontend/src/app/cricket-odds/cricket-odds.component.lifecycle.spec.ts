import { CricketOddsComponent } from './cricket-odds.component';

function createComponent(): CricketOddsComponent {
  var structuredDataService = {
    breadcrumbs: function(items: any) { return { '@type': 'BreadcrumbList', itemListElement: items }; },
    article: function(input: any) { return Object.assign({ '@type': 'Article' }, input); },
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
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    structuredDataService as any,
    { snapshot: { params: { path: 'team-a-vs-team-b-123A' }, queryParamMap: { get: function() { return null; } } } } as any,
    { url: '/cric-live/team-a-vs-team-b-123A' } as any,
    {} as any,
    { get: function() { return null; }, hasKey: function() { return false; }, set: function() {}, remove: function() {} } as any,
    {} as any
  );
}

describe('CricketOddsComponent lifecycle tab defaults', () => {
  it('defaults live matches to commentary', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.currentMatch = { status: 'LIVE' } as any;

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(1);
  });

  it('defaults upcoming matches to match details', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection(true);

    expect(component.selectedTabIndex).toBe(2);
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

    expect(component.selectedTabIndex).toBe(1);
  });

  it('does not treat the initial tab event as a user override', () => {
    var component = createComponent();
    component.currentRequestedPath = '/cric-live/team-a-vs-team-b-123A';

    component.onTabChange({ index: 0 } as any);
    component.matchInfo = { match_status: 'UPCOMING' };

    (component as any).syncMatchTabSelection();

    expect(component.selectedTabIndex).toBe(0);
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

  it('does not try to load scorecard data for upcoming matches', () => {
    var component = createComponent();
    component.matchInfo = { match_status: 'UPCOMING' };
    component.scorecardData = { innings: [1] } as any;

    component.fetchScorecardInfo('team-a-vs-team-b-123A');

    expect(component.isLoadingScorecard).toBe(false);
    expect(component.scorecardData).toBeNull();
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

  it('builds visible match FAQs only from answerable match data', () => {
    var component = createComponent();
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
    var types = items.map(function(item: any) { return item['@type']; });

    expect(types).toContain('FAQPage');
    expect(types).toContain('LiveBlogPosting');
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
      title: 'Team A vs Team B Live Score',
      description: 'Follow Team A vs Team B live score.',
      ogImageUrl: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
      h1: 'Team A vs Team B Live Score',
      robots: 'index,follow',
      teams: 'Team A vs Team B',
      team1: 'Team A',
      team2: 'Team B',
      team1Short: 'TA',
      team2Short: 'TB',
      shortTeams: 'TA vs TB',
      series: 'Regional Cup',
      breadcrumbSeries: 'Regional Cup',
      statusLabel: 'Live',
      summary: 'Team A vs Team B live score.',
      isIndexable: true
    } as any;
    component.commentaryEntries = [
      { id: '1', type: 'COMMENTARY', text: 'Single to midwicket.', timestamp: '2026-06-29T12:31:00.000Z' }
    ];

    var items = (component as any).buildStructuredDataItems();
    var types = items.map(function(item: any) { return item['@type']; });

    expect(types).not.toContain('LiveBlogPosting');
  });
});
