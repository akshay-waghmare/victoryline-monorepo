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
    {} as any
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
});
