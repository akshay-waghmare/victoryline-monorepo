import { CricketOddsComponent } from './cricket-odds.component';

function createComponent(): CricketOddsComponent {
  return new CricketOddsComponent(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { snapshot: { params: { path: 'team-a-vs-team-b-123A' }, queryParamMap: { get: function() { return null; } } } } as any,
    { url: '/cric-live/team-a-vs-team-b-123A' } as any,
    {} as any,
    { get: function() { return null; }, hasKey: function() { return false; }, set: function() {}, remove: function() {} } as any
  );
}

describe('CricketOddsComponent lifecycle tab defaults', () => {
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

    expect(component.selectedTabIndex).toBe(1);
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

    expect(component.selectedTabIndex).toBe(1);
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
});
