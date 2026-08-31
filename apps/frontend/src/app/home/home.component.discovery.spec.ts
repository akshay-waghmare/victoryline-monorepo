import { HomeComponent } from './home.component';
import { MatchStatus, MatchCardViewModel } from '../features/matches/models/match-card.models';

function createMatch(id: string, status: MatchStatus): MatchCardViewModel {
  return {
    id: id,
    status: status,
    matchUrl: 'https://crex.com/cricket-live-score/' + id,
    externalMatchKey: id,
    venue: 'Test venue',
    seriesName: 'Test series',
    startTime: new Date('2026-06-12T12:00:00Z'),
    lastUpdated: new Date('2026-06-12T12:00:00Z'),
    displayStatus: status,
    statusColor: '#00ff00',
    timeDisplay: 'Now',
    isLive: status === MatchStatus.LIVE,
    canAnimate: status === MatchStatus.LIVE,
    isHovered: false,
    isSelected: false,
    staleness: 'fresh',
    resultSummary: status === MatchStatus.COMPLETED ? 'Completed' : '',
    team1: {
      id: 'team-1',
      name: 'Team One',
      shortName: 'T1',
      logoUrl: '',
      score: null
    },
    team2: {
      id: 'team-2',
      name: 'Team Two',
      shortName: 'T2',
      logoUrl: '',
      score: null
    }
  } as unknown as MatchCardViewModel;
}

function createComponentShape(): HomeComponent {
  var component = Object.create(HomeComponent.prototype) as HomeComponent;
  component.liveMatches = [];
  component.upcomingMatches = [];
  component.allUpcomingMatches = [];
  component.recentMatches = [];
  return component;
}

describe('HomeComponent discovery matches', () => {
  it('keeps live and upcoming matches ahead of recent results in the quick-link rail', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123A', MatchStatus.LIVE);
    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123B', MatchStatus.UPCOMING);
    upcoming.startTime = new Date(Date.now() + (18 * 60 * 60 * 1000));
    var recent = createMatch('recent-a-vs-recent-b-123C', MatchStatus.COMPLETED);

    component.liveMatches = [live];
    component.upcomingMatches = [upcoming];
    component.allUpcomingMatches = [upcoming];
    component.recentMatches = [recent];

    var matches = (component as any).buildDiscoveryMatches() as MatchCardViewModel[];

    expect(matches.length).toBe(3);
    expect(matches[0].id).toBe('live-a-vs-live-b-123A');
    expect(matches[1].id).toBe('upcoming-a-vs-upcoming-b-123B');
    expect(matches[2].id).toBe('recent-a-vs-recent-b-123C');
  });

  it('falls back to recent results when no live or upcoming matches exist', () => {
    var component = createComponentShape();
    component.recentMatches = [createMatch('recent-a-vs-recent-b-123C', MatchStatus.COMPLETED)];

    var matches = (component as any).buildDiscoveryMatches() as MatchCardViewModel[];

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('recent-a-vs-recent-b-123C');
  });

  it('uses the full upcoming feed for discovery so 12-48 hour previews are not trimmed out', () => {
    var component = createComponentShape();
    var soon = createMatch('soon-a-vs-soon-b-123D', MatchStatus.UPCOMING);
    soon.startTime = new Date(Date.now() + (2 * 60 * 60 * 1000));
    var sample = createMatch('sample-a-vs-sample-b-123E', MatchStatus.UPCOMING);
    sample.startTime = new Date(Date.now() + (18 * 60 * 60 * 1000));

    component.upcomingMatches = [soon];
    component.allUpcomingMatches = [soon, sample];

    var matches = (component as any).buildDiscoveryMatches() as MatchCardViewModel[];

    expect(matches.some(function(match) { return match.id === 'sample-a-vs-sample-b-123E'; })).toBe(true);
  });

  it('builds at-a-glance cards with live, upcoming, and result context in scoreboard-first order', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123A', MatchStatus.LIVE);
    live.team1.score = {
      runs: 176,
      wickets: 6,
      overs: 20,
      runRate: 8.8,
      displayText: '176/6 (20)'
    };
    live.team2.score = {
      runs: 123,
      wickets: 2,
      overs: 12.5,
      runRate: 9.59,
      displayText: '123/2 (12.5)'
    };

    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123B', MatchStatus.UPCOMING);
    upcoming.timeDisplay = 'Tomorrow 6:00 AM';

    var recent = createMatch('recent-a-vs-recent-b-123C', MatchStatus.COMPLETED);
    recent.resultSummary = 'Team One won by 5 wickets';

    component.liveMatches = [live];
    component.upcomingMatches = [upcoming];
    component.allUpcomingMatches = [upcoming];
    component.recentMatches = [recent];

    var cards = (component as any).buildGlanceCards();

    expect(cards.map(function(card: any) { return card.tab; })).toEqual(['live', 'upcoming', 'results']);
    expect(cards[0].summary).toContain('T1 176/6 (20)');
    expect(cards[1].summary).toContain('Tomorrow 6:00 AM');
    expect(cards[2].summary).toBe('Team One won by 5 wickets');
  });

  it('maps homepage series labels to crawlable current-series surfaces', () => {
    var component = createComponentShape();

    expect(component.getHomeSeriesHref('England One Day Cup 2026')).toBe('/series/current/england-one-day-cup-2026');
    expect(component.getHomeSeriesHref('Women\'s T20I — Switzerland 2026')).toBe('/series/current/women-s-t20i-switzerland-2026');
  });

  it('filters the homepage without following the series discovery href', () => {
    var component = createComponentShape();
    (component as any).getSeriesTab = function() { return 'upcoming'; };
    (component as any).syncActiveMatches = function() {};
    (component as any).resetMatchesCarouselPosition = function() {};
    (component as any).revealSelectedSeries = function() {};
    (component as any).changeDetectorRef = { markForCheck: function() {} };
    var prevented = false;
    var stopped = false;

    component.selectSeries('Test series', {
      preventDefault: function() { prevented = true; },
      stopPropagation: function() { stopped = true; }
    } as any);

    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
    expect(component.selectedSeries).toBe('Test series');
  });
});
