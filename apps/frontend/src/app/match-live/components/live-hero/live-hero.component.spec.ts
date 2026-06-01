import { of } from 'rxjs';

import { LiveHeroComponent } from './live-hero.component';

describe('LiveHeroComponent current ball display', () => {
  let component: LiveHeroComponent;

  beforeEach(() => {
    component = new LiveHeroComponent({
      state$: of({ loading: false, view: null, error: null }),
      view$: of(null),
      init: () => undefined,
      destroy: () => undefined,
      manualRetry: () => undefined
    } as any);
  });

  it('shows the mapped wicket outcome for coded wicket events', () => {
    expect(component.getCurrentBallKind('^4')).toBe('wicket');
    expect(component.getCurrentBallDisplay('^4')).toBe('Run Out');
    expect(component.getCurrentBallLabel('^4')).toBe('Run Out');
    expect(component.isCurrentBallImpact('^4')).toBe(true);
  });

  it('shows a readable generic wicket label when no specific outcome exists', () => {
    expect(component.getCurrentBallDisplay('w')).toBe('Wicket');
    expect(component.getCurrentBallLabel('w')).toBe('Wicket');
  });

  it('keeps non-wicket current ball formatting unchanged', () => {
    expect(component.getCurrentBallDisplay('wd')).toBe('Wd');
    expect(component.getCurrentBallKind('wd')).toBe('wide');
    expect(component.getCurrentBallDisplay('4')).toBe('4');
    expect(component.getCurrentBallKind('4')).toBe('four');
  });

  it('prefers a completed fallback view over a stale live view', () => {
    const staleLiveView: any = {
      status: 'LIVE',
      completedScores: null,
      score: { resultSummary: null }
    };
    const completedFallback: any = {
      status: 'COMPLETED',
      completedScores: {
        team1: { teamName: 'Ireland Women', runs: 99, wickets: 5, overs: '14.1' },
        team2: { teamName: 'West Indies Women', runs: 141, wickets: 8, overs: '20.0' },
        resultText: 'Ireland Women won by 1 run (DLS METHOD)'
      },
      score: {
        resultSummary: 'Ireland Women won by 1 run (DLS METHOD)'
      }
    };

    component.fallbackView = completedFallback;

    expect(component.shouldPreferFallback(staleLiveView)).toBe(true);
    expect(component.getActiveView(staleLiveView)).toBe(completedFallback);
    expect(component.shouldShowLiveOnlySections(completedFallback)).toBe(false);
  });
});
