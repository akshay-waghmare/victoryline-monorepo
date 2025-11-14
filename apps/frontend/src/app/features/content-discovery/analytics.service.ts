import { Injectable } from '@angular/core';

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  category: string;      // 'Discovery', 'Search', 'Filter', 'Recommendation'
  action: string;        // 'click', 'search', 'filter_change', 'clear_history'
  label?: string;        // Additional context
  value?: number;        // Numeric value (e.g., result count)
  metadata?: any;        // Additional structured data
  timestamp: Date;
}

/**
 * Analytics service for tracking user interactions
 * Emits events that can be consumed by Google Analytics, Mixpanel, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  constructor() {
    // Initialize analytics tracking
    console.log('[Analytics] Service initialized');
  }

  /**
   * Track a custom event
   */
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: any
  ): void {
    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      metadata,
      timestamp: new Date()
    };

    // Store event in memory
    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift(); // Remove oldest event
    }

    // Log to console in development
    if (this.isDevelopment()) {
      console.log('[Analytics]', event);
    }

    // Send to analytics platforms
    this.sendToGoogleAnalytics(event);
    this.sendToCustomEndpoint(event);
  }

  /**
   * Track search query
   */
  trackSearch(query: string, resultCount: number): void {
    this.trackEvent(
      'Discovery',
      'search',
      query,
      resultCount,
      { query, resultCount, timestamp: new Date() }
    );
  }

  /**
   * Track autocomplete selection
   */
  trackAutocompleteSelection(matchId: string, matchTitle: string, position: number): void {
    this.trackEvent(
      'Discovery',
      'autocomplete_select',
      matchTitle,
      position,
      { matchId, matchTitle, position }
    );
  }

  /**
   * Track filter change
   */
  trackFilterChange(filterType: string, filterValue: string, resultCount: number): void {
    this.trackEvent(
      'Discovery',
      'filter_change',
      `${filterType}:${filterValue}`,
      resultCount,
      { filterType, filterValue, resultCount }
    );
  }

  /**
   * Track recommendation click
   */
  trackRecommendationClick(matchId: string, matchTitle: string, position: number, reason?: string): void {
    this.trackEvent(
      'Discovery',
      'recommendation_click',
      matchTitle,
      position,
      { matchId, matchTitle, position, reason }
    );
  }

  /**
   * Track recently viewed match click
   */
  trackRecentlyViewedClick(matchId: string, matchTitle: string, position: number): void {
    this.trackEvent(
      'Discovery',
      'recently_viewed_click',
      matchTitle,
      position,
      { matchId, matchTitle, position }
    );
  }

  /**
   * Track match card click from All Matches
   */
  trackMatchClick(matchId: string, matchTitle: string, source: 'all_matches' | 'search_results'): void {
    this.trackEvent(
      'Discovery',
      'match_click',
      matchTitle,
      undefined,
      { matchId, matchTitle, source }
    );
  }

  /**
   * Track history clear action
   */
  trackHistoryClear(itemCount: number): void {
    this.trackEvent(
      'Discovery',
      'clear_history',
      undefined,
      itemCount,
      { itemCount }
    );
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events from memory
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Send to Google Analytics (gtag.js)
   */
  private sendToGoogleAnalytics(event: AnalyticsEvent): void {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.metadata
      });
    }
  }

  /**
   * Send to custom analytics endpoint
   * Replace with your own analytics backend
   */
  private sendToCustomEndpoint(event: AnalyticsEvent): void {
    // TODO: Implement custom analytics endpoint
    // Example: this.http.post('/api/analytics/events', event).subscribe();
  }

  /**
   * Check if running in development mode
   */
  private isDevelopment(): boolean {
    return !window.location.hostname.includes('production-domain.com');
  }
}
