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
    // Placeholder: integrate with backend analytics or third-party (GA, Mixpanel, etc.)
    console.log('[Analytics]', eventName, properties || {});
    
    // Example integration point:
    // if (window['gtag']) {
    //   window['gtag']('event', eventName, properties);
    // }
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
