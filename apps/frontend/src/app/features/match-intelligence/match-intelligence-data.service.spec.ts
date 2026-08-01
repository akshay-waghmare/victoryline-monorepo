import { MatchIntelligenceDataService } from './match-intelligence-data.service';
import { MatchStatus } from '../matches/models/match-card.models';

describe('MatchIntelligenceDataService freshness and public metric mapping', () => {
  let service: MatchIntelligenceDataService;

  beforeEach(() => {
    service = new MatchIntelligenceDataService({} as any, {} as any, {} as any);
  });

  it('marks a recent model timestamp fresh', () => {
    const state = (service as any).resolveFreshnessState({
      updated_at: new Date(Date.now() - 30 * 1000).toISOString()
    });

    expect(state).toBe('fresh');
  });

  it('treats legacy timezone-less provider timestamps as UTC', () => {
    const state = (service as any).resolveFreshnessState({
      updated_at: new Date(Date.now() - 30 * 1000).toISOString().replace('Z', '')
    });

    expect(state).toBe('fresh');
  });

  it('marks an old model timestamp stale', () => {
    const state = (service as any).resolveFreshnessState({
      updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString()
    });

    expect(state).toBe('stale');
  });

  it('marks absent model data unavailable', () => {
    expect((service as any).resolveFreshnessState(null)).toBe('unavailable');
  });

  it('uses the configured model origin for server-side requests', () => {
    const originalProcess = (global as any).process;
    (global as any).process = { env: { MODEL_API_URL: 'http://crickzen-dashboard:8000/' } };

    expect((service as any).getPublicPredictionApiUrl())
      .toBe('http://crickzen-dashboard:8000/api/public');

    (global as any).process = originalProcess;
  });

  it('merges public intelligence metrics without exposing raw model fields', () => {
    const merged = (service as any).mergePublicPrediction(
      { score: '228/4' },
      {
        win_probability_pct: 61,
        expected_final_score: 296,
        resource_win_probability_pct: 58,
        score_vs_par: -3,
        reasons: ['Expected final 296, 38 above the venue average.'],
        last_swings: [{ over: '40.0', win_probability_pct: 61 }]
      }
    );

    expect(merged.expected_final_score).toBe(296);
    expect(merged.resource_win_probability_pct).toBe(58);
    expect(merged.score_vs_par).toBe(-3);
    expect(merged.last_swings.length).toBe(1);
    expect(merged.reasons).toEqual(['Expected final 296, 38 above the venue average.']);
    expect(merged.features).toBeUndefined();
  });

  it('classifies upcoming, live, and completed lifecycle states', () => {
    const resolve = (service as any).resolveLifecycle.bind(service);
    expect(resolve({ status: MatchStatus.UPCOMING }, null)).toBe('upcoming');
    expect(resolve({ status: MatchStatus.LIVE }, null)).toBe('live');
    expect(resolve({ status: MatchStatus.COMPLETED }, null)).toBe('completed');
    expect(resolve(null, { status: 'Match result: won by 5 wickets' })).toBe('completed');
    expect(resolve(null, null, { status: 'running' })).toBe('live');
    expect(resolve(null, null, { status: 'upcoming' })).toBe('upcoming');
  });

  it('matches abbreviated canonical teams to full-name model slugs', () => {
    expect((service as any).extractRouteTeams('ess-vs-sur-107th-match-t20-blast-2026-match-updates-ZXR'))
      .toEqual(['ess', 'sur']);
    expect((service as any).extractRouteTeams('essex-vs-surrey-ntb-win-probability'))
      .toEqual(['essex', 'surrey']);
    expect((service as any).teamNameMatches('ess', 'essex')).toBe(true);
    expect((service as any).teamNameMatches('sur', 'surrey')).toBe(true);
    expect((service as any).extractRouteTeams('ireland-vs-west-indies-odi-women-win-probability'))
      .toEqual(['ireland', 'west-indies']);
    expect((service as any).teamNameMatches('wi', 'west-indies')).toBe(true);
  });

  it('matches womens abbreviated routes to full-name model slugs', () => {
    const routeTeams = (service as any).extractRouteTeams(
      'hk-w-vs-ugn-w-1st-match-womens-t20i-quadrangular-series-in-namibia-2026-match-updates-1319'
    );
    const predictionTeams = (service as any).extractRouteTeams('hong-kong-vs-ugn-t20-win-probability');

    expect(routeTeams).toEqual(['hk', 'ugn']);
    expect(predictionTeams).toEqual(['hong-kong', 'ugn']);
    expect((service as any).teamNameMatches(routeTeams[0], predictionTeams[0])).toBe(true);
    expect((service as any).teamNameMatches(routeTeams[1], predictionTeams[1])).toBe(true);
  });

  it('matches a public prediction by canonical URL when its CREX key uses uppercase letters', () => {
    const routeSlug = 'tan-w-vs-ugn-w-5th-match-womens-t20i-quadrangular-series-in-namibia-2026-match-updates-131d';
    const prediction = {
      slug: 'w-vs-ugn-t20-win-probability',
      title: 'W vs UGN',
      match_url: 'https://crex.com/cricket-live-score/tan-w-vs-ugn-w-5th-match-womens-t20i-quadrangular-series-in-namibia-2026-match-updates-131D',
      win_probability_pct: 43
    };

    expect((service as any).findPublicPrediction(routeSlug, null, null, [prediction])).toBe(prediction);
  });
});
