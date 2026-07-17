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
});
