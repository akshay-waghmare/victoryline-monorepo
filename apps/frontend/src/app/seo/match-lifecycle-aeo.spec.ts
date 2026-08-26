import { buildMatchLifecycleAeoBlock, deriveMatchLifecycleAeoLifecycle } from './match-lifecycle-aeo';

describe('match lifecycle AEO contract', () => {
  var base = {
    teams: 'India vs Australia',
    series: 'World Cup 2026',
    venue: 'Wankhede Stadium',
    scheduledLabel: 'Tue, 25 Aug 2026, 7:30 pm'
  };

  it('maps the canonical lifecycle vocabulary, including innings break and terminal states', () => {
    expect(deriveMatchLifecycleAeoLifecycle('UPCOMING')).toBe('upcoming');
    expect(deriveMatchLifecycleAeoLifecycle('LIVE')).toBe('live');
    expect(deriveMatchLifecycleAeoLifecycle('INNINGS_BREAK')).toBe('innings-break');
    expect(deriveMatchLifecycleAeoLifecycle('Innings break')).toBe('innings-break');
    expect(deriveMatchLifecycleAeoLifecycle('COMPLETED')).toBe('completed');
    expect(deriveMatchLifecycleAeoLifecycle('RAIN_DELAY')).toBe('delayed');
    expect(deriveMatchLifecycleAeoLifecycle('ABANDONED')).toBe('abandoned');
  });

  it('builds self-contained upcoming, live, and completed answers from the same canonical input shape', () => {
    var upcoming = buildMatchLifecycleAeoBlock(Object.assign({}, base, { status: 'UPCOMING' }));
    var live = buildMatchLifecycleAeoBlock(Object.assign({}, base, { status: 'LIVE', score: 'India 124/3 (16.2 overs)' }));
    var completed = buildMatchLifecycleAeoBlock(Object.assign({}, base, { status: 'COMPLETED', result: 'India beat Australia by 5 wickets' }));

    expect(upcoming && upcoming.answer).toContain('India vs Australia');
    expect(upcoming && upcoming.answer).toContain('upcoming');
    expect(live && live.answer).toContain('Current score: India 124/3 (16.2 overs).');
    expect(live && live.facts.some(function(fact) { return fact.label === 'Score'; })).toBe(true);
    expect(completed && completed.answer).toContain('Result: India beat Australia by 5 wickets.');
    expect(completed && completed.lifecycle).toBe('completed');
  });

  it('keeps model provenance secondary and only carries it when the caller has passed an eligible value', () => {
    var withoutModel = buildMatchLifecycleAeoBlock(Object.assign({}, base, { status: 'LIVE' }));
    var withModel = buildMatchLifecycleAeoBlock(Object.assign({}, base, {
      status: 'LIVE',
      modelAnswer: 'CrickZen model: IND 64% win probability, refreshed 25 Aug 2026 19:00 IST.'
    }));

    expect(withoutModel && withoutModel.modelAnswer).toBeNull();
    expect(withModel && withModel.modelAnswer).toContain('CrickZen model');
  });

  it('does not publish an AEO answer for unresolved or placeholder identity', () => {
    expect(buildMatchLifecycleAeoBlock({ teams: 'Cricket match', status: 'LIVE' })).toBeNull();
    expect(buildMatchLifecycleAeoBlock({ teams: 'India vs Australia', status: 'UNKNOWN' })).toBeNull();
  });

  it('produces the same answer contract for SSR and hydrated browser data', () => {
    var sourceData = Object.assign({}, base, {
      status: 'INNINGS_BREAK',
      score: 'India 188/6 (20 overs)'
    });
    var ssrBlock = buildMatchLifecycleAeoBlock(sourceData);
    var hydratedBlock = buildMatchLifecycleAeoBlock(Object.assign({}, sourceData));

    expect(hydratedBlock).toEqual(ssrBlock);
    expect(hydratedBlock && hydratedBlock.lifecycle).toBe('innings-break');
  });
});
