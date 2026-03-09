import { LiveHeroViewModel } from './live-hero.models';
import {
  getLiveHeroResultSummary,
  getLiveHeroStatusLabel,
  shouldShowLiveHeroChase
} from './live-hero-display.utils';

describe('live hero display utils', () => {
  function buildView(overrides: Partial<LiveHeroViewModel> = {}): LiveHeroViewModel {
    return {
      matchId: 'match-1',
      status: 'LIVE',
      timestamp: '2026-03-08T20:08:29.345Z',
      score: {
        teamCode: 'KRB',
        teamName: 'Karachi Region Blues',
        runs: 180,
        wickets: 6,
        overs: '20.0',
        runRateLabel: 'CRR 9.00',
        status: 'LIVE',
        resultSummary: null,
        currentBall: null
      },
      chase: {
        isChasing: true,
        runsRemaining: 41,
        ballsRemaining: 18,
        requiredRunRateLabel: 'RRR 13.67'
      },
      batters: [],
      bowler: null,
      partnershipLabel: null,
      odds: null,
      staleness: {
        tier: 'FRESH',
        ageSeconds: 5,
        message: null,
        nextRetryAllowed: null
      },
      quickLinks: [],
      currentStriker: null,
      lastValidStriker: null,
      ...overrides
    };
  }

  it('falls back to match info final result text when snapshot result is missing', () => {
    const view = buildView();

    expect(getLiveHeroResultSummary(view, {
      final_result_text: 'Karachi Region Blues won by 40 runs'
    })).toBe('Karachi Region Blues won by 40 runs');
  });

  it('hides chase summary once a completed result is available', () => {
    const view = buildView();

    expect(shouldShowLiveHeroChase(view, {
      final_result_text: 'Karachi Region Blues won by 40 runs'
    })).toBe(false);
  });

  it('hides chase summary when chase values are not finite numbers', () => {
    const view = buildView({
      chase: {
        isChasing: true,
        runsRemaining: null as any,
        ballsRemaining: null as any
      }
    });

    expect(shouldShowLiveHeroChase(view)).toBe(false);
  });

  it('marks the status label as completed when match info already has a final result', () => {
    const view = buildView();

    expect(getLiveHeroStatusLabel(view, {
      final_result_text: 'Karachi Region Blues won by 40 runs'
    })).toBe('Completed');
  });
});
