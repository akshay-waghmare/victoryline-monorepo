import { Injectable } from '@angular/core';

export interface CanonicalMatchViewContext {
  matchSlug: string;
  matchPath: string;
  lifecycle: 'upcoming' | 'live' | 'completed';
  surface: string;
}

/**
 * AnalyticsService
 * Hooks for instrumentation and metrics tracking.
 * Event taxonomy: tab_change, commentary_load_more, snapshot_refresh, staleness_state_change
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor() {}

  trackEvent(eventName: string, properties?: Record<string, any>) {
    var payload = properties || {};
    console.log('[Analytics]', eventName, payload);

    // Use whichever provider the host page has configured, while keeping
    // local SSR and provider-less development safe.
    if (typeof window !== 'undefined') {
      var host = window as any;
      var deliveredToGtag = false;
      if (typeof host.gtag === 'function') {
        try {
          host.gtag('event', eventName, payload);
          deliveredToGtag = true;
        } catch (_) {
          // Fall through to the dataLayer bridge when a host gtag shim fails.
        }
      }
      // A normal gtag implementation already writes into dataLayer. Pushing a
      // second object here double-counts the same GA4 event, so dataLayer is a
      // fallback only when gtag is unavailable or failed.
      if (!deliveredToGtag && Array.isArray(host.dataLayer)) {
        host.dataLayer.push(Object.assign({ event: eventName }, payload));
      }
      if (typeof host.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        host.dispatchEvent(new CustomEvent('crickzen:analytics', {
          detail: { eventName: eventName, properties: payload }
        }));
      }
    }
  }

  // Predefined event helpers
  trackTabChange(tabName: string, matchId: string) {
    this.trackEvent('tab_change', { tab_name: tabName, match_id: matchId });
  }

  trackCommentaryLoadMore(matchId: string, page: number) {
    this.trackEvent('commentary_load_more', { match_id: matchId, page });
  }

  trackSnapshotRefresh(matchId: string, latencyMs?: number) {
    this.trackEvent('snapshot_refresh', { match_id: matchId, latency_ms: latencyMs });
  }

  trackStalenessStateChange(matchId: string, level: string, secondsSinceUpdate: number) {
    this.trackEvent('staleness_state_change', { match_id: matchId, level, seconds_since_update: secondsSinceUpdate });
  }

  trackIntelligenceEvent(eventName: string, properties?: Record<string, any>) {
    // Keep every intelligence interaction joinable to its originating
    // canonical match view. Caller-provided fields intentionally win so
    // lifecycle/surface-specific instrumentation can remain explicit.
    this.trackEvent(eventName, Object.assign(
      {},
      this.getBrowserAttribution(),
      properties || {}
    ));
  }

  trackCanonicalMatchView(context: CanonicalMatchViewContext): void {
    if (!context || !context.matchSlug || !context.matchPath) {
      return;
    }

    this.trackEvent('match_view', Object.assign({
      match_slug: context.matchSlug,
      match_path: context.matchPath,
      lifecycle: context.lifecycle,
      surface: context.surface
    }, this.getBrowserAttribution()));
  }

  private getBrowserAttribution(): Record<string, string | null> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        anonymous_session_id: null,
        landing_path: null,
        referrer_host: null,
        source_attribution: 'server'
      };
    }

    var search = window.location && window.location.search ? window.location.search : '';
    var params = new URLSearchParams(search);
    var referrerHost = this.getReferrerHost(document.referrer || '');
    var utmSource = params.get('utm_source');

    return {
      anonymous_session_id: this.getAnonymousSessionId(),
      landing_path: (window.location.pathname || '') + search,
      referrer_host: referrerHost,
      source_attribution: utmSource ? 'utm:' + utmSource : (referrerHost || 'direct'),
      utm_source: utmSource,
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign')
    };
  }

  private getAnonymousSessionId(): string | null {
    var storageKey = 'crickzen_analytics_session_id';
    try {
      var existing = window.sessionStorage.getItem(storageKey);
      if (existing) {
        return existing;
      }

      var cryptoApi = (window as any).crypto;
      var generated = cryptoApi && typeof cryptoApi.randomUUID === 'function'
        ? cryptoApi.randomUUID()
        : 'cz-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      window.sessionStorage.setItem(storageKey, generated);
      return generated;
    } catch (_) {
      // Privacy mode or a storage policy can reject sessionStorage. Keep the
      // event useful without creating a durable browser identifier.
      return null;
    }
  }

  private getReferrerHost(referrer: string): string | null {
    if (!referrer) {
      return null;
    }

    try {
      return new URL(referrer).hostname || null;
    } catch (_) {
      return null;
    }
  }

  // Performance mark helpers
  mark(name: string) {
    if (performance && performance.mark) {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark: string) {
    if (performance && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name, 'measure');
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration;
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
          return duration;
        }
      } catch (e) {
        console.warn('[Performance] Could not measure:', e);
      }
    }
    return null;
  }
}
