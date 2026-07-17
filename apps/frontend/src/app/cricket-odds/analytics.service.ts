import { Injectable } from '@angular/core';

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
      if (typeof host.gtag === 'function') {
        host.gtag('event', eventName, payload);
      }
      if (Array.isArray(host.dataLayer)) {
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
    this.trackEvent(eventName, properties || {});
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
