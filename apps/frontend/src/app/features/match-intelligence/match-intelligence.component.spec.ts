import { MatchIntelligenceComponent } from './match-intelligence.component';
import { isHundredMatch } from './prediction-format-eligibility';

describe('MatchIntelligenceComponent chart and lifecycle language', () => {
  it('maps public swings into bounded chart points', () => {
    const context: any = {
      snapshot: {
        publicPrediction: {
          last_swings: [
            { over: '1.5', score: '11/0', win_probability_pct: 76, label: 'start' },
            { over: '3.2', score: '27/0', win_probability_pct: 92, label: '+16%' },
            { over: '4.4', score: '40/0', win_probability_pct: 98, label: '+6%' }
          ]
        }
      },
      getPredictionHistory: () => []
    };

    const points = (MatchIntelligenceComponent.prototype as any).getSwingPoints.call(context);

    expect(points.length).toBe(3);
    expect(points[0]).toEqual({ over: '1.5', score: '11/0', probability: 76, label: 'start', innings: 1 });
    expect(points[2].probability).toBe(98);
  });

  it('keeps unavailable chart data empty instead of inventing points', () => {
    const points = (MatchIntelligenceComponent.prototype as any).getSwingPoints.call({
      snapshot: { publicPrediction: null },
      getPredictionHistory: () => []
    });

    expect(points).toEqual([]);
  });

  it('converts cricket over.ball notation into ball-based positions', () => {
    const parseChartOver = (MatchIntelligenceComponent.prototype as any).parseChartOver;

    expect(parseChartOver.call({}, '19.3')).toBe(19.5);
    expect(parseChartOver.call({}, '2.4')).toBeCloseTo(2.6667, 3);
  });

  it('plots innings points on a chronological two-innings scale', () => {
    const points = (MatchIntelligenceComponent.prototype as any).getProbabilityChartPoints.call({
      getSwingPoints: () => [
        { over: '2.4', score: '25/1', probability: 39, label: 'current', innings: 2 },
        { over: '19.3', score: '170/6', probability: 71, label: 'start', innings: 1 }
      ],
      getChartInningsOvers: () => 20,
      resolvePointInnings: (innings: number) => innings,
      parseChartOver: (value: string) => (MatchIntelligenceComponent.prototype as any).parseChartOver.call({}, value)
    });

    expect(points[0].x).toBe(19.5);
    expect(points[1].x).toBe(22.67);
    expect(points[1].y).toBe(39);
  });

  it('maps public prediction history without inventing missing score views', () => {
    const history = (MatchIntelligenceComponent.prototype as any).getPredictionHistory.call({
      snapshot: {
        publicPrediction: {
          prediction_history: [
            { over: '10.0', score: '72/1', win_probability_pct: 58, expected_final_score: 164, projected_score: 158 },
            { over: '12.0', score: '91/2', win_probability_pct: 54 }
          ]
        }
      }
    });

    expect(history[0]).toEqual({ over: '10.0', score: '72/1', probability: 58, expectedFinal: 164, projected: 158, innings: 1 });
    expect(history[1].expectedFinal).toBeNull();
    expect(history[1].projected).toBeNull();
  });

  it('keeps expected-finish comparison bars bounded to the shared maximum', () => {
    const context: any = {
      snapshot: {
        matchData: { expected_final_score: 296, venue_avg_score: 257.7 }
      },
      getExpectedFinalNumber: () => 296,
      getVenueAverageScore: () => 257.7
    };

    const expected = (MatchIntelligenceComponent.prototype as any).getComparisonBarWidth.call(context, 296);
    const venue = (MatchIntelligenceComponent.prototype as any).getComparisonBarWidth.call(context, 257.7);

    expect(expected).toBe(100);
    expect(venue).toBeGreaterThan(80);
    expect(venue).toBeLessThan(100);
  });

  it('explains stale confidence without presenting probability as certainty', () => {
    const narrative = (MatchIntelligenceComponent.prototype as any).getConfidenceNarrative.call({
      snapshot: { freshnessState: 'stale' },
      resolveWinProbability: () => 78
    });

    expect(narrative).toContain('confidence is reduced');
    expect(narrative).toContain('older than the freshness window');
  });

  it('emits the intelligence CTA impression with the prediction view', () => {
    const events: string[] = [];
    const context: any = {
      viewModel: {
        canonicalMatchPath: '/cric-live/a-vs-b',
        intelligencePath: '/match-intelligence/a-vs-b',
        lifecycle: 'live',
        capabilityTier: 'free',
        modelUnavailable: false,
        freshnessState: 'fresh'
      },
      trackedEvents: {},
      trackOnce: (_key: string, name: string) => events.push(name)
    };

    (MatchIntelligenceComponent.prototype as any).trackViewEvents.call(context);

    expect(events).toContain('prediction_view');
    expect(events).toContain('intelligence_cta_impression');
  });

  it('renders batting and bowling teams from the public payload', () => {
    const cards = (MatchIntelligenceComponent.prototype as any).getMetricCards.call({
      snapshot: {
        matchData: {
          batting_team: 'Nepal',
          bowling_team: 'JSY'
        }
      },
      resolveProbabilityTeam: () => null,
      getTeamMetric: (key: string) => key === 'batting_team' ? 'Nepal' : 'JSY',
      getInningsLabel: () => null,
      getMetricLabel: () => null,
      getExpectedFinalLabel: () => null
    });

    expect(cards[0]).toEqual({ label: 'Batting', value: 'Nepal' });
    expect(cards[1]).toEqual({ label: 'Bowling', value: 'JSY' });
  });

  it('uses contract-backed turning-point data for completed-state copy', () => {
    const context: any = {
      getTurningPointLabel: () => 'over 42.3 at 238/6',
      getLatestSwingLabel: () => 'probability moved 58% to 71%'
    };

    const title = (MatchIntelligenceComponent.prototype as any).buildStateModuleTitle.call(context, 'completed');
    const body = (MatchIntelligenceComponent.prototype as any).buildStateModuleBody.call(context, 'completed', 'Nepal vs JSY', ' in Nepal tour');

    expect(title).toContain('Turning point: over 42.3 at 238/6');
    expect(body).toContain('recorded turning point');
    expect(body).toContain('probability moved 58% to 71%');
  });

  it('recognizes The Hundred as held out from prediction surfaces', () => {
    expect(isHundredMatch(
      'https://crex.com/cricket-live-score/mil-vs-srl-1st-match-the-hundred-2026-men-match-updates-ZK5'
    )).toBe(true);
  });
});
