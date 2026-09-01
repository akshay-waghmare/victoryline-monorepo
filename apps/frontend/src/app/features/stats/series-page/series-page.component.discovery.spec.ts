import { MatchCardViewModel, MatchStatus } from '../../matches/models/match-card.models';
import { SeriesPageComponent } from './series-page.component';

function createMatch(id: string, seriesName: string, hoursAhead: number): MatchCardViewModel {
  var now = Date.now();
  return {
    id: id,
    status: MatchStatus.UPCOMING,
    matchUrl: 'https://crex.com/cricket-live-score/' + id,
    externalMatchKey: id,
    venue: 'Test venue',
    seriesName: seriesName,
    startTime: new Date(now + (hoursAhead * 60 * 60 * 1000)),
    lastUpdated: new Date(now),
    displayStatus: 'Upcoming',
    statusColor: '#00aaff',
    timeDisplay: 'Soon',
    isLive: false,
    canAnimate: false,
    isHovered: false,
    isSelected: false,
    staleness: 'fresh',
    resultSummary: '',
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
  } as MatchCardViewModel;
}

function createComponentShape(): SeriesPageComponent {
  var component = Object.create(SeriesPageComponent.prototype) as SeriesPageComponent;
  component.upcomingDiscoveryGroups = [];
  (component as any).maxDiscoverySeriesGroups = 4;
  (component as any).maxDiscoveryMatchesPerSeries = 4;
  return component;
}

describe('SeriesPageComponent discovery grouping', () => {
  it('groups upcoming canonical links by series and deduplicates repeated match URLs', () => {
    var component = createComponentShape();
    var matches = [
      createMatch('ind-vs-aus-1st-test-123A', 'Border Gavaskar Trophy 2026', 18),
      createMatch('ind-vs-aus-1st-test-123A', 'Border Gavaskar Trophy 2026', 18),
      createMatch('ind-vs-aus-2nd-test-123B', 'Border Gavaskar Trophy 2026', 28),
      createMatch('eng-vs-sa-1st-odi-123C', 'England vs South Africa ODI Series', 22)
    ];

    var groups = (component as any).buildSeriesDiscoveryGroups(matches);

    expect(groups.length).toBe(2);
    expect(groups[0].seriesName).toBe('Border Gavaskar Trophy 2026');
    expect(groups[0].matches.length).toBe(2);
    expect(groups[0].totalMatches).toBe(2);
    expect(groups[1].seriesName).toBe('England vs South Africa ODI Series');
    expect(groups[1].matches.length).toBe(1);
  });

  it('caps visible groups and visible links per series while tracking total matches', () => {
    var component = createComponentShape();
    var matches: MatchCardViewModel[] = [];

    for (var groupIndex = 1; groupIndex <= 5; groupIndex++) {
      for (var matchIndex = 1; matchIndex <= 5; matchIndex++) {
        matches.push(
          createMatch(
            'series-' + groupIndex + '-match-' + matchIndex + '-123' + groupIndex + matchIndex,
            'Series ' + groupIndex,
            12 + groupIndex + matchIndex
          )
        );
      }
    }

    var groups = (component as any).buildSeriesDiscoveryGroups(matches);

    expect(groups.length).toBe(4);
    expect(groups[0].matches.length).toBe(4);
    expect(groups[0].totalMatches).toBe(5);
  });

  it('formats slug fallbacks as readable series-intent headings', () => {
    var component = createComponentShape();

    expect(component.toDisplaySeriesName('england-one-day-cup-2026')).toBe('England One Day Cup 2026');
    expect(component.toDisplaySeriesName('w-t20i-in-switzerland-2026')).toBe('W T20I In Switzerland 2026');
  });

  it('builds self-contained answer-first copy for a series profile section', () => {
    var component = createComponentShape();
    component.isProfileRoute = true;
    component.activeSection = 'table';
    component.selectedSeriesSummary = {
      externalId: 'ipl-2026',
      name: 'IPL 2026',
      seasonName: '2026'
    };
    component.profileMatches = [];
    component.selectedSeries = null;
    component.selectedStandings = null;

    expect(component.getSeriesProfileHeading()).toBe('IPL 2026 Points Table & Standings');
    expect(component.getSeriesProfileTitle()).toBe('IPL 2026 Points Table & Standings | CrickZen');
    expect(component.getSeriesProfileDescription()).toContain('Current IPL 2026 points table and standings');
    expect(component.getSeriesProfileBluf()).toContain('IPL 2026 tracks fixtures, results, points table and team statistics');
    expect(component.getSeriesStandingsAnswer()).toContain('IPL 2026 points table is unavailable');
  });
});
