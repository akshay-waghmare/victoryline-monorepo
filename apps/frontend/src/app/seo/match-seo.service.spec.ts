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

  it('keeps a live Hundred Match Intelligence title truthful even though the child route is noindex', () => {
    var intelligence = service.build({
      routeSlug: 'ls-vs-tr-8th-match-the-hundred-2026-men-match-updates-ZKC',
      requestedPath: '/cric-live/ls-vs-tr-8th-match-the-hundred-2026-men-match-updates-ZKC/match-intelligence',
      matchInfo: {
        team1_name: 'London Spirit',
        team2_name: 'Trent Rockets',
        match_status: 'Live',
        series_name: 'The Hundred 2026'
      }
    });

    expect(intelligence.robots).toBe('noindex,follow');
    expect(intelligence.title).toBe('London Spirit vs Trent Rockets, The Hundred 2026 – Live Score & Win Probability | CrickZen');
    expect(intelligence.description).toContain('live score, match updates, and win probability');
    expect(intelligence.h1).toBe('London Spirit vs Trent Rockets Live Cricket Score');
    expect(intelligence.title).not.toContain('Not Available');
  });

  it('uses a team-only live title when the series is not available', () => {
    var partial = service.build({
      routeSlug: 'abc-vs-def',
      requestedPath: '/cric-live/abc-vs-def/match-intelligence',
      matchInfo: { team1_name: 'Alpha CC', team2_name: 'Delta CC', match_status: 'Live' }
    });

    expect(partial.title).toBe('Alpha CC vs Delta CC – Live Cricket Score | CrickZen');
    expect(partial.title).not.toContain('Not Available');
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
    expect(unresolved.title).toBe('Live Cricket Match – Score & Win Probability | CrickZen');
    expect(unresolved.h1).toBe('Live Cricket Match');
  });

  it('keeps full team names in concise metadata without literal truncation', () => {
    var seo = service.build({
      routeSlug: 'so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W',
      requestedPath: '/cric-live/so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W',
      matchInfo: {
        team1_name: 'Texas Super Kings',
        team2_name: 'Seattle Orcas',
        match_status: 'Upcoming',
        series_name: 'Major League Cricket 2026'
      }
    });

    expect(seo.title).toBe('Texas Super Kings vs Seattle Orcas Live Score, Match Preview & Playing XI | TSK vs SO');
    expect(seo.h1).toBe('Texas Super Kings vs Seattle Orcas Live Score, Preview & Playing XI (TSK vs SO)');
    expect(seo.description).toBe('Track Texas Super Kings vs Seattle Orcas live score before start with match preview, toss updates, playing XI, venue details, and fixture context in Major League Cricket 2026. TSK vs SO coverage stays on this canonical match page.');
    expect(seo.shortTeams).toBe('TSK vs SO');
    expect(seo.title).not.toContain('...');
    expect(seo.description).not.toContain('...');
  });

  it('uses lifecycle-aware live metadata to capture commentary and scorecard intent', () => {
    var seo = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug,
      matchInfo: {
        team1_name: 'India',
        team2_name: 'Australia',
        match_status: 'Live',
        series_name: 'Border Gavaskar Trophy'
      }
    });

    expect(seo.title).toBe('India vs Australia Live Score, Commentary & Scorecard | IND vs AUS');
    expect(seo.h1).toBe('India vs Australia Live Score, Commentary & Scorecard (IND vs AUS)');
    expect(seo.description).toContain('ball-by-ball commentary');
    expect(seo.description).toContain('IND vs AUS commentary and scorecard');
  });

  it('uses lifecycle-aware completed metadata to capture result and full scorecard intent', () => {
    var seo = service.build({
      routeSlug: slug,
      requestedPath: '/cric-live/' + slug,
      matchInfo: {
        team1_name: 'India',
        team2_name: 'Australia',
        match_status: 'Result',
        resultSummary: 'India won by 6 wickets',
        series_name: 'Border Gavaskar Trophy'
      }
    });

    expect(seo.title).toBe('India vs Australia Match Result & Full Scorecard | IND vs AUS');
    expect(seo.h1).toBe('India vs Australia Match Result & Scorecard (IND vs AUS)');
    expect(seo.summary).toContain('full scorecard');
    expect(seo.summary).toContain('IND vs AUS');
  });

  it('rejects placeholder team and series metadata in favor of the canonical slug context', () => {
    var seo = service.build({
      routeSlug: 'br-vs-sgr-12th-match-afghanistan-national-t20-cup-2026-match-updates-11S9',
      requestedPath: '/cric-live/br-vs-sgr-12th-match-afghanistan-national-t20-cup-2026-match-updates-11S9',
      matchInfo: {
        team1_name: 'BR',
        team2_name: 'SGR',
        team1_short_name: 'TEAM 1',
        team2_short_name: 'TEAM 2',
        match_status: 'Result',
        series_name: 'No match name'
      }
    });

    expect(seo.shortTeams).toBe('BR vs SGR');
    expect(seo.series).toBe('Afghanistan National T20 Cup 2026');
    expect(seo.title).not.toContain('TEAM 1');
    expect(seo.h1).not.toContain('TEAM 2');
    expect(seo.description).not.toContain('No match name');
  });

  it('uses the canonical slug series when the schedule feed series is polluted', () => {
    var seo = service.build({
      routeSlug: 'so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W',
      requestedPath: '/cric-live/so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W',
      matchInfo: {
        team1_name: 'Texas Super Kings',
        team2_name: 'Seattle Orcas',
        match_status: 'Upcoming',
        series_name: 'Texas Super Kings 12:30 AM 1stT20, MLC 2026 Seattle Orcas'
      }
    });

    expect(seo.series).toBe('Major League Cricket 2026');
    expect(seo.breadcrumbSeries).toBe('Major League Cricket');
  });

  it('uses the canonical slug series when the feed series is polluted by live status text', () => {
    var seo = service.build({
      routeSlug: 'nam-vs-vid-1st-unofficial-test-2026-match-updates-11AA',
      requestedPath: '/cric-live/nam-vs-vid-1st-unofficial-test-2026-match-updates-11AA',
      matchInfo: {
        team1_name: 'Namibia',
        team2_name: 'Vidarbha',
        match_status: 'Toss Delayed',
        series_name: 'NAM Yet to bat Toss Delayed VID Yet to bat'
      }
    });

    expect(seo.series).toBe('1st Unofficial Test 2026');
    expect(seo.breadcrumbSeries).toBe('1st Unofficial Test');
  });
});
