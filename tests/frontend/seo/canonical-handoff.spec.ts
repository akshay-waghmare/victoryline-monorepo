/**
 * Test: Live→Final Canonical Handoff
 * 
 * Validates that live match pages set canonical URL to final season-scoped URL
 * to preserve link equity while supporting social shares.
 */

import { MetaTagsService } from '../../../apps/frontend/src/app/seo/meta-tags.service';

describe('Live→Final Canonical Handoff', () => {
  let service: MetaTagsService;

  beforeEach(() => {
    service = new MetaTagsService();
  });

  it('should set canonical to final URL when isLive=true', () => {
    const finalUrl = '/match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29';
    const meta = service.buildMatchMeta({
      path: '/cric-live/12345',
      title: 'MI vs CSK - Live',
      description: 'Live score updates',
      isLive: true,
      finalUrl: finalUrl,
    });

    expect(meta.canonicalUrl).toBe('https://www.crickzen.com' + finalUrl);
    expect(meta.og?.url).toBe('https://www.crickzen.com' + finalUrl);
  });

  it('should use current path as canonical when isLive=false', () => {
    const meta = service.buildMatchMeta({
      path: '/match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29',
      title: 'MI vs CSK',
      description: 'Match summary',
      isLive: false,
    });

    expect(meta.canonicalUrl).toBe('https://www.crickzen.com/match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29');
  });

  it('should fallback to current path if finalUrl missing on live page', () => {
    const meta = service.buildMatchMeta({
      path: '/cric-live/12345',
      title: 'Live Match',
      description: 'Live updates',
      isLive: true,
      // finalUrl omitted
    });

    expect(meta.canonicalUrl).toBe('https://www.crickzen.com/cric-live/12345');
  });

  it('should build final URL from match data', () => {
    const finalUrl = service.buildFinalMatchUrl({
      tournament: 'IPL',
      season: '2023',
      homeTeam: 'Mumbai Indians',
      awayTeam: 'Chennai Super Kings',
      format: 'T20',
      date: '2023-05-29',
    });

    expect(finalUrl).toBe('/match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29');
  });

  it('should return null if match data incomplete', () => {
    const finalUrl = service.buildFinalMatchUrl({
      tournament: 'IPL',
      season: '2023',
      // missing teams, format, date
    });

    expect(finalUrl).toBeNull();
  });

  it('should preserve robots=index,follow on live pages', () => {
    const meta = service.buildMatchMeta({
      path: '/cric-live/12345',
      title: 'Live Match',
      description: 'Live updates',
      isLive: true,
      finalUrl: '/match/ipl/2023/mi-vs-csk/t20/2023-05-29',
    });

    expect(meta.robots).toBe('index,follow');
  });
});
