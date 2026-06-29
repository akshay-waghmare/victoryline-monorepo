import { MatchStatus } from '../features/matches/models/match-card.models';
import { buildFreshnessDiscoveryLinksForMatches, buildFreshnessLinksFromMatch, buildFreshnessLinksFromSlug, getPrimaryFreshnessLinkForMatch } from './match-freshness-links';

describe('match-freshness-links', () => {
  it('prefers full team names over short codes in freshness support labels', () => {
    var links = buildFreshnessLinksFromMatch({
      matchUrl: 'https://crex.com/cricket-live-score/dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      externalMatchKey: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      id: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      status: MatchStatus.UPCOMING,
      team1: { name: 'Derbyshire', shortName: 'DBS' },
      team2: { name: 'Yorkshire', shortName: 'YOR' }
    } as any);

    expect(links[0].label).toBe('Derbyshire vs Yorkshire preview');
    expect(links[1].label).toBe('Derbyshire vs Yorkshire live updates');
    expect(links[2].label).toBe('Derbyshire vs Yorkshire result and highlights');
  });

  it('recovers human-readable team names from the slug when refreshed match data is thin', () => {
    var links = buildFreshnessLinksFromMatch({
      matchUrl: 'https://crex.com/scoreboard/ABC/DEF/dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK/live',
      externalMatchKey: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      id: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      status: MatchStatus.LIVE,
      team1: null,
      team2: null
    } as any);

    expect(links[0].label).toBe('DBS vs YOR preview');
    expect(links[1].label).toBe('DBS vs YOR live updates');
    expect(links[2].label).toBe('DBS vs YOR result and highlights');
  });

  it('does not keep Team 1 and Team 2 when real slug tokens are available', () => {
    var links = buildFreshnessLinksFromMatch({
      matchUrl: 'https://crex.com/cricket-live-score/los-angeles-knight-riders-vs-seattle-orcas-14th-match-major-league-cricket-2026-match-updates-1119',
      externalMatchKey: 'los-angeles-knight-riders-vs-seattle-orcas-14th-match-major-league-cricket-2026-match-updates-1119',
      id: 'los-angeles-knight-riders-vs-seattle-orcas-14th-match-major-league-cricket-2026-match-updates-1119',
      status: MatchStatus.UPCOMING,
      team1: { name: 'Team 1', shortName: '' },
      team2: { name: 'Team 2', shortName: '' }
    } as any);

    expect(links[0].label).toBe('Los Angeles Knight Riders vs Seattle Orcas preview');
  });

  it('chooses the lifecycle-appropriate primary freshness link for a live match', () => {
    var link = getPrimaryFreshnessLinkForMatch({
      matchUrl: 'https://crex.com/cricket-live-score/dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      externalMatchKey: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      id: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
      status: MatchStatus.LIVE,
      team1: { name: 'Derbyshire', shortName: 'DBS' },
      team2: { name: 'Yorkshire', shortName: 'YOR' }
    } as any);

    expect(link && link.type).toBe('live-updates');
    expect(link && link.label).toBe('Derbyshire vs Yorkshire live updates');
  });

  it('builds multiple deduplicated freshness discovery links from qualifying matches', () => {
    var links = buildFreshnessDiscoveryLinksForMatches([
      {
        matchUrl: 'https://crex.com/cricket-live-score/dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        externalMatchKey: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        id: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        status: MatchStatus.UPCOMING,
        team1: { name: 'Derbyshire', shortName: 'DBS' },
        team2: { name: 'Yorkshire', shortName: 'YOR' }
      },
      {
        matchUrl: 'https://crex.com/cricket-live-score/ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX',
        externalMatchKey: 'ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX',
        id: 'ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX',
        status: MatchStatus.UPCOMING,
        team1: { name: 'Hampshire', shortName: 'HAM' },
        team2: { name: 'Sussex', shortName: 'SUS' }
      },
      {
        matchUrl: 'https://crex.com/cricket-live-score/dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        externalMatchKey: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        id: 'dbs-vs-yor-63rd-match-t20-blast-2026-match-updates-ZWK',
        status: MatchStatus.UPCOMING,
        team1: { name: 'Derbyshire', shortName: 'DBS' },
        team2: { name: 'Yorkshire', shortName: 'YOR' }
      }
    ] as any, 4);

    expect(links.length).toBe(2);
    expect(links[0].type).toBe('preview');
    expect(links[1].type).toBe('preview');
  });

  it('builds slug-based fallback freshness links when SSR only has route context', () => {
    var links = buildFreshnessLinksFromSlug(
      'pak-w-vs-sa-w-11th-match-womens-t20-world-cup-2026-match-updates-X0Z',
      MatchStatus.LIVE,
      'PAK W',
      'SA W'
    );

    expect(links.length).toBe(3);
    expect(links[0].type).toBe('live-updates');
    expect(links[0].href).toContain('/cricket-live-updates/pak-w-vs-sa-w-11th-match-womens-t20-world-cup-2026-match-updates-X0Z');
    expect(links[1].type).toBe('preview');
    expect(links[2].type).toBe('result');
  });
});
