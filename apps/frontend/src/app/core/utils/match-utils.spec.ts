import { MatchStatus } from '../../features/matches/models/match-card.models';
import { buildCanonicalMatchLinkLabel, buildCanonicalMatchPath, extractMatchRouteSuffix, extractSlugFromUrl, getRecentBallDisplay, normalizeMatchRoutePath } from './match-utils';

describe('match-utils recent ball helpers', () => {
  it('formats wicket and boundary events for compact display', () => {
    expect(getRecentBallDisplay('w')).toEqual({
      raw: 'w',
      display: 'W',
      fullLabel: 'Wicket',
      kind: 'wicket'
    });

    expect(getRecentBallDisplay('4')).toEqual({
      raw: '4',
      display: '4',
      fullLabel: 'Four',
      kind: 'four'
    });

    expect(getRecentBallDisplay('6')).toEqual({
      raw: '6',
      display: '6',
      fullLabel: 'Six',
      kind: 'six'
    });

    expect(getRecentBallDisplay('^1')).toEqual({
      raw: '^1',
      display: 'W',
      fullLabel: 'Bowled',
      kind: 'wicket'
    });
  });

  it('formats extras codes into readable labels', () => {
    expect(getRecentBallDisplay('lb1')).toEqual({
      raw: 'lb1',
      display: 'LB1',
      fullLabel: 'Leg bye 1',
      kind: 'extra'
    });

    expect(getRecentBallDisplay('wd')).toEqual({
      raw: 'wd',
      display: 'WD',
      fullLabel: 'Wide',
      kind: 'extra'
    });
  });

  it('extracts slugs from legacy and new CREX URL formats', () => {
    expect(extractSlugFromUrl('https://crex.com/scoreboard/ABC/DEF/sample-match-slug/live')).toBe('sample-match-slug');
    expect(extractSlugFromUrl('https://crex.com/scoreboard/ABC/DEF/sample-match-slug/scorecard')).toBe('sample-match-slug');
    expect(extractSlugFromUrl('https://crex.com/scoreboard/ABC/DEF/sample-match-slug/info')).toBe('sample-match-slug');
    expect(extractSlugFromUrl('https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC')).toBe('abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
    expect(extractSlugFromUrl('https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-scorecard')).toBe('abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
    expect(extractSlugFromUrl('https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-details')).toBe('abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
  });

  it('extracts route suffixes from canonical and legacy match paths', () => {
    expect(extractMatchRouteSuffix('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/live')).toBe('live');
    expect(extractMatchRouteSuffix('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/scorecard')).toBe('scorecard');
    expect(extractMatchRouteSuffix('https://www.crickzen.com/cric-live/series/finals/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-scorecard?tab=batting')).toBe('match-scorecard');
    expect(extractMatchRouteSuffix('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC')).toBeNull();
  });

  it('normalizes legacy and nested match paths back to the base canonical route', () => {
    expect(normalizeMatchRoutePath('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/live')).toBe('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
    expect(normalizeMatchRoutePath('/cric-live/series/finals/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/scorecard')).toBe('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
    expect(normalizeMatchRoutePath('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/custom-view')).toBe('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');
    expect(normalizeMatchRoutePath('/cric-live/445')).toBeNull();
  });

  it('builds canonical match paths from url, external key, or slug-like id', () => {
    expect(buildCanonicalMatchPath({
      matchUrl: 'https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC',
      externalMatchKey: '',
      id: 'match-1'
    } as any)).toBe('/cric-live/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC');

    expect(buildCanonicalMatchPath({
      matchUrl: '',
      externalMatchKey: 'rcb-vs-mi-1st-match-ipl-2026-match-updates-123A',
      id: 'match-2'
    } as any)).toBe('/cric-live/rcb-vs-mi-1st-match-ipl-2026-match-updates-123A');

    expect(buildCanonicalMatchPath({
      matchUrl: '',
      externalMatchKey: '',
      id: 'ind-vs-aus-2nd-test-2026-match-updates-222B'
    } as any)).toBe('/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B');

    expect(buildCanonicalMatchPath({
      matchUrl: '',
      externalMatchKey: '445',
      id: '445'
    } as any)).toBeNull();
  });

  it('builds concise match-link labels that reflect lifecycle intent', () => {
    var baseMatch = {
      team1: { name: 'India', shortName: 'IND' },
      team2: { name: 'Australia', shortName: 'AUS' }
    } as any;

    expect(buildCanonicalMatchLinkLabel({ ...baseMatch, status: MatchStatus.LIVE })).toBe('India vs Australia live score');
    expect(buildCanonicalMatchLinkLabel({ ...baseMatch, status: MatchStatus.UPCOMING })).toBe('India vs Australia match preview');
    expect(buildCanonicalMatchLinkLabel({ ...baseMatch, status: MatchStatus.COMPLETED })).toBe('India vs Australia result');
  });
});
