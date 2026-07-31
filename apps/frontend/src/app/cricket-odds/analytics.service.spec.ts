import { AnalyticsService } from './analytics.service';

describe('AnalyticsService intelligence event bridge', () => {
  it('forwards events to gtag and dataLayer when configured', () => {
    const service = new AnalyticsService();
    const gtag = jasmine.createSpy('gtag');
    const dataLayer: any[] = [];
    (window as any).gtag = gtag;
    (window as any).dataLayer = dataLayer;

    service.trackIntelligenceEvent('prediction_view', { lifecycle: 'live' });

    expect(gtag).toHaveBeenCalledWith('event', 'prediction_view', { lifecycle: 'live' });
    expect(dataLayer[0]).toEqual({ event: 'prediction_view', lifecycle: 'live' });
    delete (window as any).gtag;
    delete (window as any).dataLayer;
  });

  it('adds route and browser attribution to canonical match views', () => {
    const service = new AnalyticsService();
    const dataLayer: any[] = [];
    const originalUrl = window.location.href;
    (window as any).dataLayer = dataLayer;
    window.history.replaceState({}, '', '/cric-live/example-match?utm_source=search&utm_medium=organic&utm_campaign=live-intent');

    service.trackCanonicalMatchView({
      matchSlug: 'example-match',
      matchPath: '/cric-live/example-match',
      lifecycle: 'live',
      surface: 'cric-live'
    });

    expect(dataLayer[0].event).toBe('match_view');
    expect(dataLayer[0].match_slug).toBe('example-match');
    expect(dataLayer[0].match_path).toBe('/cric-live/example-match');
    expect(dataLayer[0].lifecycle).toBe('live');
    expect(dataLayer[0].utm_source).toBe('search');
    expect(dataLayer[0].utm_medium).toBe('organic');
    expect(dataLayer[0].anonymous_session_id).toBeTruthy();

    window.history.replaceState({}, '', originalUrl);
    delete (window as any).dataLayer;
    window.sessionStorage.removeItem('crickzen_analytics_session_id');
  });
});
