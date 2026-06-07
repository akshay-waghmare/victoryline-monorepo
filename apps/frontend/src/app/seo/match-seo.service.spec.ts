import { MatchSeoService } from './match-seo.service';

describe('MatchSeoService canonical lifecycle', () => {
  var service: MatchSeoService;
  var slug = 'ind-vs-aus-2nd-test-2026-match-updates-222B';

  beforeEach(() => {
    service = new MatchSeoService();
  });

  it('keeps one canonical path across prematch, live, and completed states', () => {
    var upcoming = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug,
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Upcoming', series_name: 'Border Gavaskar Trophy' }
    });
    var live = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug,
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Live', series_name: 'Border Gavaskar Trophy' }
    });
    var completed = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug,
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Result', resultSummary: 'India won by 6 wickets', series_name: 'Border Gavaskar Trophy' }
    });

    expect(upcoming.canonicalPath).toBe('/cric-live/' + slug);
    expect(live.canonicalPath).toBe('/cric-live/' + slug);
    expect(completed.canonicalPath).toBe('/cric-live/' + slug);
    expect(upcoming.routeIntent.lifecycle).toBe('prematch');
    expect(live.routeIntent.lifecycle).toBe('live');
    expect(completed.routeIntent.lifecycle).toBe('postmatch');
  });

  it('folds legacy live and scorecard routes back to the base canonical path', () => {
    var liveRoute = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug + '/live',
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Live' }
    });
    var scorecardRoute = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug + '/match-scorecard',
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Result', resultSummary: 'India won by 6 wickets' }
    });

    expect(liveRoute.routeIntent.surface).toBe('live');
    expect(liveRoute.canonicalDecision.disposition).toBe('base');
    expect(liveRoute.canonicalPath).toBe('/cric-live/' + slug);
    expect(scorecardRoute.routeIntent.surface).toBe('scorecard');
    expect(scorecardRoute.canonicalDecision.disposition).toBe('base');
    expect(scorecardRoute.canonicalPath).toBe('/cric-live/' + slug);
  });

  it('noindexes unknown child surfaces while keeping the canonical target on the base path', () => {
    var unknownSurface = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug + '/custom-view',
      matchInfo: { team1_name: 'India', team2_name: 'Australia', match_status: 'Live' }
    });

    expect(unknownSurface.routeIntent.surface).toBe('unknown');
    expect(unknownSurface.canonicalDecision.disposition).toBe('noindex');
    expect(unknownSurface.robots).toBe('noindex,follow');
    expect(unknownSurface.canonicalPath).toBe('/cric-live/' + slug);
    expect(unknownSurface.isIndexable).toBe(false);
  });

  it('keeps unresolved numeric routes out of the index', () => {
    var unresolved = service.build({
      routeSlug: '445',
      requestedPath: '/cric-live/445',
      matchInfo: { match_status: 'Live' },
      isFallback: true
    });

    expect(unresolved.canonicalDecision.disposition).toBe('noindex');
    expect(unresolved.robots).toBe('noindex,follow');
    expect(unresolved.isIndexable).toBe(false);
  });
});
