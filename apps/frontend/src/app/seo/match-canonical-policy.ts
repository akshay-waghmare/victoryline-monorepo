export type MatchRouteSurface = 'base' | 'live' | 'commentary' | 'scorecard' | 'report' | 'legacy' | 'unknown';

export type MatchLifecycleState = 'prematch' | 'live' | 'postmatch' | 'unknown';

export type MatchCanonicalDisposition = 'self' | 'base' | 'noindex';

export interface MatchRouteIntent {
  requestedPath: string;
  routeSlug: string;
  normalizedSlug: string | null;
  surface: MatchRouteSurface;
  lifecycle: MatchLifecycleState;
  suffix: string | null;
  isLegacyAlias: boolean;
  isResolvable: boolean;
}

export interface MatchCanonicalPolicyDecision {
  disposition: MatchCanonicalDisposition;
  canonicalPath: string | null;
  robots: 'index,follow' | 'noindex,follow';
  reason: string;
}

export interface MatchSurfacePolicyMap {
  base: MatchCanonicalDisposition;
  live: MatchCanonicalDisposition;
  commentary: MatchCanonicalDisposition;
  scorecard: MatchCanonicalDisposition;
  report: MatchCanonicalDisposition;
  legacy: MatchCanonicalDisposition;
  unknown: MatchCanonicalDisposition;
}

export const DEFAULT_MATCH_SURFACE_POLICY: MatchSurfacePolicyMap = {
  base: 'self',
  live: 'base',
  commentary: 'base',
  scorecard: 'base',
  report: 'base',
  legacy: 'base',
  unknown: 'noindex'
};

export function createMatchRouteIntent(input: {
  requestedPath?: string;
  routeSlug?: string;
  normalizedSlug?: string | null;
  surface?: MatchRouteSurface;
  lifecycle?: MatchLifecycleState;
  suffix?: string | null;
  isLegacyAlias?: boolean;
  isResolvable?: boolean;
}): MatchRouteIntent {
  return {
    requestedPath: (input.requestedPath || '').trim(),
    routeSlug: (input.routeSlug || '').trim(),
    normalizedSlug: normalizeCanonicalSlug(input.normalizedSlug || input.routeSlug || ''),
    surface: input.surface || 'unknown',
    lifecycle: input.lifecycle || 'unknown',
    suffix: input.suffix || null,
    isLegacyAlias: !!input.isLegacyAlias,
    isResolvable: !!input.isResolvable
  };
}

export function deriveMatchLifecycleState(statusLabel: any, lastKnownState?: any): MatchLifecycleState {
  var status = String(statusLabel || '').toLowerCase();
  var detail = String(lastKnownState || '').toLowerCase();

  if (/upcoming|scheduled|not started|preview/.test(status)) {
    return 'prematch';
  }

  if (/completed|finished|result|abandoned|stumps|drawn|tied/.test(status) || /won by|match drawn|match tied|no result/.test(detail)) {
    return 'postmatch';
  }

  if (/live|innings break|delay|rain/.test(status)) {
    return 'live';
  }

  return 'unknown';
}

export function buildBaseMatchCanonicalPath(slug: string | null | undefined): string | null {
  var normalized = normalizeCanonicalSlug(slug || '');
  return normalized ? '/cric-live/' + normalized : null;
}

export function evaluateMatchCanonicalPolicy(
  intent: MatchRouteIntent,
  policy: MatchSurfacePolicyMap = DEFAULT_MATCH_SURFACE_POLICY
): MatchCanonicalPolicyDecision {
  var canonicalPath = buildBaseMatchCanonicalPath(intent.normalizedSlug);

  if (!intent.isResolvable || !canonicalPath) {
    return {
      disposition: 'noindex',
      canonicalPath: null,
      robots: 'noindex,follow',
      reason: 'Route could not be resolved to a reliable canonical match slug.'
    };
  }

  var disposition = policy[intent.surface] || policy.unknown;

  if (disposition === 'noindex') {
    return {
      disposition: disposition,
      canonicalPath: null,
      robots: 'noindex,follow',
      reason: 'Surface is not approved as an indexable canonical page.'
    };
  }

  return {
    disposition: disposition,
    canonicalPath: canonicalPath,
    robots: 'index,follow',
    reason: disposition === 'self'
      ? 'Base match entity remains canonical for this route.'
      : 'Surface folds back to the base match entity canonical.'
  };
}

function normalizeCanonicalSlug(value: string): string | null {
  var slug = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return slug && slug.indexOf('-vs-') !== -1 ? slug : null;
}
