import { extractSlugFromUrl, getRecentBallDisplay } from './match-utils';

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
});
