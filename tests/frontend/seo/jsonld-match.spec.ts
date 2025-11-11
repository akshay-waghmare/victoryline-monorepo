// Snapshot-like test scaffold for JSON-LD SportsEvent
// Note: This is a placeholder; integrate with your test runner as needed.
import { StructuredDataService } from '../../../apps/frontend/src/app/seo/structured-data.service';

describe('JSON-LD SportsEvent builder', () => {
  it('produces expected minimal fields', () => {
    const svc = new StructuredDataService();
    const json = svc.sportsEvent({
      name: 'Match 123',
      startDate: '2025-01-15T10:00:00Z',
      homeTeam: 'India',
      awayTeam: 'Australia',
      status: 'Scheduled',
    });
    expect(json).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: 'Match 123',
      startDate: '2025-01-15T10:00:00Z',
      eventStatus: 'Scheduled',
      location: undefined,
      offers: undefined,
      homeTeam: { '@type': 'SportsTeam', name: 'India' },
      awayTeam: { '@type': 'SportsTeam', name: 'Australia' },
    });
  });
});
