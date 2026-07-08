import { MatchesListComponent } from './matches-list.component';
import { MatchStatus, MatchCardViewModel } from '../../models/match-card.models';

function createMatch(id: string, status: MatchStatus, hoursAhead: number): MatchCardViewModel {
  var now = Date.now();
  return {
    id: id,
    status: status,
    matchUrl: 'https://crex.com/cricket-live-score/' + id,
    externalMatchKey: id,
    venue: 'Test venue',
    seriesName: 'Test series',
    startTime: new Date(now + (hoursAhead * 60 * 60 * 1000)),
    lastUpdated: new Date(now),
    displayStatus: status,
    statusColor: '#00ff00',
    timeDisplay: 'Soon',
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

function createComponentShape(): MatchesListComponent {
  var component = Object.create(MatchesListComponent.prototype) as MatchesListComponent;
  component.allMatches = [];
  component.filteredMatches = [];
  component.visibleMatches = [];
  component.upcomingMatchGroups = [];
  component.crawlableMatches = [];
  component.liveDiscoveryMatches = [];
  component.upcomingDiscoveryMatches = [];
  component.recentDiscoveryMatches = [];
  component.selectedStatus = MatchStatus.LIVE;
  component.searchQuery = '';
  (component as any).visibleMatchCount = 12;
  return component;
}

describe('MatchesListComponent discovery sections', () => {
  it('keeps upcoming links crawlable even when the live tab is active', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123A', MatchStatus.LIVE, -1);
    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123B', MatchStatus.UPCOMING, 60);
    var result = createMatch('recent-a-vs-recent-b-123C', MatchStatus.COMPLETED, -12);

    component.allMatches = [live, upcoming, result];

    component.applyFilters();

    expect(component.selectedStatus).toBe(MatchStatus.LIVE);
    expect(component.visibleMatches.some(function(match) { return match.id === 'upcoming-a-vs-upcoming-b-123B'; })).toBe(false);
    expect(component.upcomingDiscoveryMatches.some(function(match) { return match.id === 'upcoming-a-vs-upcoming-b-123B'; })).toBe(true);
    expect(component.crawlableMatches.some(function(match) { return match.id === 'upcoming-a-vs-upcoming-b-123B'; })).toBe(true);
  });

  it('builds at-a-glance summaries that stay scoreboard-first across match states', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123A', MatchStatus.LIVE, -1);
    live.team1.score = {
      runs: 176,
      wickets: 6,
      overs: 20,
      runRate: 8.8,
      displayText: '176/6 (20)'
    } as any;
    live.team2.score = {
      runs: 123,
      wickets: 2,
      overs: 12.5,
      runRate: 9.8,
      displayText: '123/2 (12.5)'
    } as any;

    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123B', MatchStatus.UPCOMING, 18);
    upcoming.timeDisplay = 'Tomorrow 6:00 AM';
    upcoming.venue = 'Grand Prairie Stadium';

    var result = createMatch('recent-a-vs-recent-b-123C', MatchStatus.COMPLETED, -12);
    result.resultSummary = 'Team One won by 5 wickets';

    component.allMatches = [live, upcoming, result];
    component.applyFilters();

    expect(component.getStatusCardSummary(MatchStatus.LIVE)).toContain('176/6 (20)');
    expect(component.getStatusCardSummary(MatchStatus.UPCOMING)).toContain('Tomorrow 6:00 AM');
    expect(component.getStatusCardSummary(MatchStatus.COMPLETED)).toBe('Team One won by 5 wickets');
  });
});
