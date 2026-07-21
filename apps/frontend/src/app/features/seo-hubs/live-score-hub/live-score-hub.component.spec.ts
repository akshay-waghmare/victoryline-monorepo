import { LiveScoreHubComponent } from './live-score-hub.component';
import { MatchStatus, MatchCardViewModel } from '../../matches/models/match-card.models';

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

function createComponentShape(): LiveScoreHubComponent {
  var component = Object.create(LiveScoreHubComponent.prototype) as LiveScoreHubComponent;
  component.allMatches = [];
  component.liveMatches = [];
  component.upcomingMatches = [];
  component.completedMatches = [];
  component.discoveryMatches = [];
  component.liveSectionMatches = [];
  component.upcomingSectionMatches = [];
  component.recentSectionMatches = [];
  component.sitemapLinks = [];
  component.fallbackSitemapMatches = [];
  component.primaryFallbackLinks = [];
  component.discoveryFallbackLinks = [];
  component.resultSupportLinks = [];
  component.archivePageLinks = [];
  component.archivePage = 1;
  component.config = { type: 'today' } as any;
  return component;
}

describe('LiveScoreHubComponent discovery priorities', () => {
  it('prioritizes 12-48 hour upcoming matches ahead of farther fixtures in today hub discovery sections', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123A', MatchStatus.LIVE, -1);
    var nearUpcoming = createMatch('upcoming-a-vs-upcoming-b-123B', MatchStatus.UPCOMING, 24);
    var farUpcoming = createMatch('future-a-vs-future-b-123C', MatchStatus.UPCOMING, 96);

    component.allMatches = [live, nearUpcoming, farUpcoming];
    component.liveMatches = [live];
    component.upcomingMatches = [nearUpcoming, farUpcoming];
    component.completedMatches = [];

    (component as any).applyMatches();

    expect(component.upcomingSectionMatches.some(function(match) { return match.id === 'upcoming-a-vs-upcoming-b-123B'; })).toBe(true);
    expect(component.upcomingSectionMatches[0].id).toBe('upcoming-a-vs-upcoming-b-123B');
  });

  it('retains completed result-support links for archive intent', () => {
    var component = createComponentShape();
    var completedA = createMatch('india-vs-australia-1st-odi-123A', MatchStatus.COMPLETED, -18);
    var completedB = createMatch('england-vs-south-africa-2nd-t20-123B', MatchStatus.COMPLETED, -8);

    component.config = { type: 'archive' } as any;
    component.allMatches = [completedA, completedB];
    component.completedMatches = [completedA, completedB];

    (component as any).applyMatches();

    expect(component.resultSupportLinks.length).toBe(2);
    expect(component.resultSupportLinks.every(function(link) { return link.href.indexOf('/cricket-match-report/') === 0; })).toBe(true);
  });

  it('does not expose live or upcoming matches from the archive hub', () => {
    var component = createComponentShape();
    var live = createMatch('live-a-vs-live-b-123C', MatchStatus.LIVE, -1);
    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123D', MatchStatus.UPCOMING, 24);
    var completed = createMatch('completed-a-vs-completed-b-123E', MatchStatus.COMPLETED, -24);

    component.config = { type: 'archive' } as any;
    component.allMatches = [live, upcoming, completed];
    component.sitemapLinks = [{ href: '/cric-live/live-a-vs-live-b-123C', label: 'Live match' }] as any;

    (component as any).applyMatches();

    expect(component.liveSectionMatches.length).toBe(0);
    expect(component.upcomingSectionMatches.length).toBe(0);
    expect(component.recentSectionMatches.length).toBe(1);
    expect(component.fallbackSitemapMatches.length).toBe(0);
  });
});
