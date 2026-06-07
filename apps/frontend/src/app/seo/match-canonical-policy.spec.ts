import { buildBaseMatchCanonicalPath, createMatchRouteIntent, deriveMatchLifecycleState, evaluateMatchCanonicalPolicy } from './match-canonical-policy';

describe('match canonical policy', () => {
  it('keeps the base route self-canonicalized across lifecycle changes', () => {
    var intent = createMatchRouteIntent({
      requestedPath: '/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B',
      routeSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      normalizedSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      surface: 'base',
      lifecycle: 'prematch',
      isResolvable: true
    });

    var decision = evaluateMatchCanonicalPolicy(intent);
    expect(decision.disposition).toBe('self');
    expect(decision.canonicalPath).toBe('/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B');
    expect(decision.robots).toBe('index,follow');
  });

  it('folds live and scorecard child surfaces back to the base canonical', () => {
    var liveDecision = evaluateMatchCanonicalPolicy(createMatchRouteIntent({
      requestedPath: '/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B/live',
      routeSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      normalizedSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      surface: 'live',
      lifecycle: 'live',
      suffix: 'live',
      isLegacyAlias: true,
      isResolvable: true
    }));

    var scorecardDecision = evaluateMatchCanonicalPolicy(createMatchRouteIntent({
      requestedPath: '/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B/scorecard',
      routeSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      normalizedSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      surface: 'scorecard',
      lifecycle: 'postmatch',
      suffix: 'scorecard',
      isLegacyAlias: true,
      isResolvable: true
    }));

    expect(liveDecision.disposition).toBe('base');
    expect(liveDecision.canonicalPath).toBe('/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B');
    expect(scorecardDecision.disposition).toBe('base');
    expect(scorecardDecision.canonicalPath).toBe('/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B');
  });

  it('marks unknown surfaces and unresolved routes as noindex', () => {
    var unknownSurfaceDecision = evaluateMatchCanonicalPolicy(createMatchRouteIntent({
      requestedPath: '/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B/custom-view',
      routeSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      normalizedSlug: 'ind-vs-aus-2nd-test-2026-match-updates-222B',
      surface: 'unknown',
      lifecycle: 'live',
      suffix: 'custom-view',
      isResolvable: true
    }));

    var unresolvedDecision = evaluateMatchCanonicalPolicy(createMatchRouteIntent({
      requestedPath: '/cric-live/445',
      routeSlug: '445',
      normalizedSlug: null,
      surface: 'base',
      lifecycle: 'unknown',
      isResolvable: false
    }));

    expect(unknownSurfaceDecision.disposition).toBe('noindex');
    expect(unknownSurfaceDecision.robots).toBe('noindex,follow');
    expect(unresolvedDecision.disposition).toBe('noindex');
    expect(unresolvedDecision.canonicalPath).toBeNull();
  });

  it('derives lifecycle states from status labels and result text', () => {
    expect(deriveMatchLifecycleState('Upcoming', '')).toBe('prematch');
    expect(deriveMatchLifecycleState('Live', '')).toBe('live');
    expect(deriveMatchLifecycleState('Result', 'India won by 6 wickets')).toBe('postmatch');
  });

  it('builds canonical paths only for slug-based match identities', () => {
    expect(buildBaseMatchCanonicalPath('ind-vs-aus-2nd-test-2026-match-updates-222B')).toBe('/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B');
    expect(buildBaseMatchCanonicalPath('445')).toBeNull();
  });
});
