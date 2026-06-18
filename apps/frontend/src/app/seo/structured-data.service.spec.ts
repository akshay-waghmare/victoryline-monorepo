import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StructuredDataService,
        { provide: DOCUMENT, useValue: document }
      ]
    });

    service = TestBed.inject(StructuredDataService);
  });

  it('includes richer event fields when provided', () => {
    const event = service.sportsEvent({
      name: 'Texas Super Kings vs Seattle Orcas Live Score Today',
      url: 'https://www.crickzen.com/cric-live/example',
      description: 'Live score and match updates.',
      homeTeam: 'Texas Super Kings',
      awayTeam: 'Seattle Orcas',
      startDate: '2026-06-19T00:30:00.000Z',
      location: {
        name: 'Grand Prairie Cricket Stadium, Dallas',
        address: {
          addressLocality: 'Dallas',
          addressRegion: 'Texas',
          addressCountry: 'US'
        }
      },
      status: 'Scheduled',
      offersUrl: 'https://www.crickzen.com/cric-live/example',
      image: 'https://www.crickzen.com/assets/og/crickzen-default-1200x630.jpg',
      organizerName: 'Crickzen',
      organizerUrl: 'https://www.crickzen.com'
    });

    expect(event.startDate).toBe('2026-06-19T00:30:00.000Z');
    expect(event.location.address.addressLocality).toBe('Dallas');
    expect(event.organizer.name).toBe('Crickzen');
    expect(event.offers.url).toBe('https://www.crickzen.com/cric-live/example');
    expect(event.image).toEqual(['https://www.crickzen.com/assets/og/crickzen-default-1200x630.jpg']);
  });
});
