import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService]
    });
    service = TestBed.get(AnalyticsService);

    // Clear events before each test
    service.clearEvents();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Event Tracking', () => {
    it('should track search events', () => {
      service.trackSearch('test query', 10);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('content_discovery');
      expect(events[0].action).toBe('search');
      expect(events[0].label).toBe('test query');
      expect(events[0].value).toBe(10);
    });

    it('should track autocomplete selection', () => {
      service.trackAutocompleteSelection('match123', 'Team A vs Team B', 2);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('content_discovery');
      expect(events[0].action).toBe('autocomplete_select');
      expect(events[0].label).toBe('Team A vs Team B');
      expect(events[0].metadata ? .matchId ).toBe('match123');
      expect(events[0].metadata ? .position ).toBe(2);
    });

    it('should track filter changes', () => {
      service.trackFilterChange('type', 'live', 15);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('content_discovery');
      expect(events[0].action).toBe('filter_change');
      expect(events[0].metadata ? .filterType ).toBe('type');
      expect(events[0].metadata ? .filterValue ).toBe('live');
      expect(events[0].value).toBe(15);
    });

    it('should track recommendation clicks', () => {
      service.trackRecommendationClick('match456', 'India vs Pakistan', 1, 'similar_teams');
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('recommendations');
      expect(events[0].action).toBe('recommendation_click');
      expect(events[0].metadata ? .matchId ).toBe('match456');
      expect(events[0].metadata ? .position ).toBe(1);
      expect(events[0].metadata ? .reason ).toBe('similar_teams');
    });

    it('should track recently viewed clicks', () => {
      service.trackRecentlyViewedClick('match789', 'England vs Australia', 0);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('history');
      expect(events[0].action).toBe('recently_viewed_click');
      expect(events[0].metadata ? .matchId ).toBe('match789');
      expect(events[0].metadata ? .position ).toBe(0);
    });

    it('should track general match clicks', () => {
      service.trackMatchClick('match111', 'South Africa vs New Zealand', 'all_matches');
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('content_discovery');
      expect(events[0].action).toBe('match_click');
      expect(events[0].metadata ? .source ).toBe('all_matches');
    });

    it('should track history clear', () => {
      service.trackHistoryClear(8);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe('history');
      expect(events[0].action).toBe('clear_history');
      expect(events[0].value).toBe(8);
    });
  });

  describe('Event Storage', () => {
    it('should store events in memory', () => {
      service.trackSearch('query1', 5);
      service.trackSearch('query2', 8);
      service.trackSearch('query3', 12);

      const events = service.getEvents();
      expect(events.length).toBe(3);
    });

    it('should limit stored events to 1000', () => {
      // Track 1100 events
      for (let i = 0; i < 1100; i++) {
        service.trackSearch(`query${i}`, i);
      }

      const events = service.getEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });

    it('should maintain FIFO order (oldest events removed first)', () => {
      // Track 1050 events
      for (let i = 0; i < 1050; i++) {
        service.trackSearch(`query${i}`, i);
      }

      const events = service.getEvents();
      // First 50 events should be removed, so earliest should be query50
      const earliestEvent = events[0];
      expect(earliestEvent.label).toContain('50');
    });

    it('should clear all events', () => {
      service.trackSearch('test1', 1);
      service.trackSearch('test2', 2);
      expect(service.getEvents().length).toBe(2);

      service.clearEvents();
      expect(service.getEvents().length).toBe(0);
    });
  });

  describe('Event Timestamps', () => {
    it('should add timestamp to each event', () => {
      const before = Date.now();
      service.trackSearch('test', 5);
      const after = Date.now();

      const events = service.getEvents();
      expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should have unique timestamps for rapid events', (done) => {
      service.trackSearch('test1', 1);
      setTimeout(() => {
        service.trackSearch('test2', 2);

        const events = service.getEvents();
        expect(events[0].timestamp).not.toBe(events[1].timestamp);
        done();
      }, 10);
    });
  });

  describe('API Contract', () => {
    it('should have all tracking methods', () => {
      expect(service.trackSearch).toBeDefined();
      expect(service.trackAutocompleteSelection).toBeDefined();
      expect(service.trackFilterChange).toBeDefined();
      expect(service.trackRecommendationClick).toBeDefined();
      expect(service.trackRecentlyViewedClick).toBeDefined();
      expect(service.trackMatchClick).toBeDefined();
      expect(service.trackHistoryClear).toBeDefined();
    });

    it('should have getEvents method', () => {
      expect(service.getEvents).toBeDefined();
      expect(typeof service.getEvents).toBe('function');
    });

    it('should have clearEvents method', () => {
      expect(service.clearEvents).toBeDefined();
      expect(typeof service.clearEvents).toBe('function');
    });
  });

  describe('Google Analytics Integration', () => {
    it('should have sendToGoogleAnalytics method', () => {
      expect((service as any).sendToGoogleAnalytics).toBeDefined();
    });

    it('should handle missing gtag gracefully', () => {
      (window as any).gtag = undefined;
      expect(() => {
        service.trackSearch('test', 5);
      }).not.toThrow();
    });
  });

  describe('Development Mode', () => {
    it('should have isDevelopment method', () => {
      expect((service as any).isDevelopment).toBeDefined();
      expect(typeof (service as any).isDevelopment).toBe('function');
    });

    it('should return boolean from isDevelopment', () => {
      const isDev = (service as any).isDevelopment();
      expect(typeof isDev).toBe('boolean');
    });
  });

  describe('Event Metadata', () => {
    it('should preserve custom metadata', () => {
      service.trackRecommendationClick('m1', 'Match', 0, 'test_reason');
      const events = service.getEvents();

      expect(events[0].metadata ? .reason ).toBe('test_reason');
    });

    it('should handle events without metadata', () => {
      service.trackMatchClick('m1', 'Match', 'all_matches');
      const events = service.getEvents();

      expect(events[0].metadata).toBeDefined();
    });

    it('should not lose metadata when buffer is full', () => {
      // Fill buffer
      for (let i = 0; i < 1010; i++) {
        service.trackRecommendationClick(`m${i}`, `Match ${i}`, i, `reason${i}`);
      }

      const events = service.getEvents();
      // Check that recent events still have metadata
      const lastEvent = events[events.length - 1];
      expect(lastEvent.metadata ? .reason ).toBeTruthy();
    });
  });
});
