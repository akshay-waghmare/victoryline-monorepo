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
  component.prematchDiscoveryLinks = [];
  component.resultSupportLinks = [];
  component.archivePageLinks = [];
  component.archivePage = 1;
  (component as any).archivePageSize = 80;
  (component as any).discoveryUpcomingWindowHours = 48;
  component.config = { type: 'today' } as any;
  (component as any).updateStructuredData = function() {};
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

  it('does not expose undeployed match-report links from the archive', () => {
    var component = createComponentShape();
    var completedA = createMatch('india-vs-australia-1st-odi-123A', MatchStatus.COMPLETED, -18);
    var completedB = createMatch('england-vs-south-africa-2nd-t20-123B', MatchStatus.COMPLETED, -8);

    component.config = { type: 'archive' } as any;
    component.allMatches = [completedA, completedB];
    component.completedMatches = [completedA, completedB];

    (component as any).applyMatches();

    expect(component.resultSupportLinks).toEqual([]);
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

  it('keeps schedule discovery inside the next 48 hours and removes primary duplicates', () => {
    var component = createComponentShape();
    component.config = { type: 'scheduleToday' } as any;
    var live = createMatch('live-a-vs-live-b-123F', MatchStatus.LIVE, -1);
    var upcoming = createMatch('upcoming-a-vs-upcoming-b-123G', MatchStatus.UPCOMING, 24);
    var farUpcoming = createMatch('far-a-vs-far-b-123H', MatchStatus.UPCOMING, 72);
    var completed = createMatch('completed-a-vs-completed-b-123I', MatchStatus.COMPLETED, -3);

    component.allMatches = [live, upcoming, farUpcoming, completed];
    component.liveMatches = [live];
    component.upcomingMatches = [upcoming, farUpcoming];
    component.completedMatches = [completed];

    (component as any).applyMatches();

    expect(component.upcomingSectionMatches.map(function(match) { return match.id; }))
      .toEqual(['upcoming-a-vs-upcoming-b-123G']);
    expect(component.discoveryMatches.some(function(match) { return match.id === 'live-a-vs-live-b-123F'; })).toBe(false);
    expect(component.discoveryMatches.some(function(match) { return match.id === 'upcoming-a-vs-upcoming-b-123G'; })).toBe(false);
    expect(component.discoveryMatches.some(function(match) { return match.id === 'completed-a-vs-completed-b-123I'; })).toBe(false);
  });

  it('does not use positional sitemap links as a schedule fallback', () => {
    var component = createComponentShape();
    component.config = { type: 'scheduleToday' } as any;
    component.sitemapLinks = [
      { href: '/cric-live/old-a-vs-old-b-1st-match-2025', label: 'Old match' }
    ] as any;

    (component as any).applyMatches();

    expect(component.fallbackSitemapMatches).toEqual([]);
    expect(component.discoveryFallbackLinks).toEqual([]);
  });

  it('requires a future scheduled start for raw upcoming SSR discovery rows', () => {
    var component = createComponentShape();
    var future = Date.now() + (24 * 60 * 60 * 1000);

    expect((component as any).isEligiblePrematchRecord({
      status: 'UPCOMING',
      scheduledStartTime: future,
      url: 'https://crex.com/cricket-live-score/real-a-vs-real-b-1st-match-cup-2026-match-updates-13ZZ'
    })).toBe(true);
    expect((component as any).isEligiblePrematchRecord({
      status: 'UPCOMING',
      url: 'https://crex.com/cricket-live-score/old-a-vs-old-b-1st-match-cup-2025'
    })).toBe(false);
    expect((component as any).isEligiblePrematchRecord({
      status: 'UPCOMING',
      scheduledStartTime: future,
      url: 'https://crex.com/cricket-live-score/tbc-vs-tbc-1st-match-cup-2026-match-updates-13C9'
    })).toBe(false);
  });
});
