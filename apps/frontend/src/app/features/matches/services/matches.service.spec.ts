/**
 * Unit tests for MatchesService - Completed Matches functionality
 * Feature: 008-completed-matches (US1 - T030, T031, T032)
 * Created: December 7, 2025
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatchesService } from './matches.service';
import { EventListService } from '../../../component/event-list.service';
import { environment } from '../../../../environments/environment';

describe('MatchesService - Completed Matches', () => {
  let service: MatchesService;
  let httpMock: HttpTestingController;
  let eventListService: jasmine.SpyObj<EventListService>;

  const mockCompletedMatches = [
    {
      id: 1,
      url: 'https://crex.com/match-1/live',
      isDeleted: true,
      lastKnownState: 'India won by 7 wickets',
      deletionAttempts: 0,
      distributionDone: false
    },
    {
      id: 2,
      url: 'https://crex.com/match-2/live',
      isDeleted: true,
      lastKnownState: 'Australia won by 50 runs',
      deletionAttempts: 0,
      distributionDone: false
    }
  ];

  beforeEach(() => {
    const eventListServiceSpy = jasmine.createSpyObj('EventListService', ['getLiveMatches']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MatchesService,
        { provide: EventListService, useValue: eventListServiceSpy }
      ]
    });

    service = TestBed.inject(MatchesService);
    httpMock = TestBed.inject(HttpTestingController);
    eventListService = TestBed.inject(EventListService) as jasmine.SpyObj<EventListService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * T030: Verify getCompletedMatches() makes GET request to correct URL
   */
  it('should make GET request to /api/v1/matches/completed', () => {
    const expectedUrl = environment.REST_API_URL + 'api/v1/matches/completed';

    service.getCompletedMatches().subscribe();

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockCompletedMatches);
  });

  /**
   * T031: Verify response is mapped correctly from API data
   */
  it('should transform API response to MatchCardViewModel array', (done) => {
    const expectedUrl = environment.REST_API_URL + 'api/v1/matches/completed';

    service.getCompletedMatches().subscribe((matches) => {
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      
      // Verify first match is transformed correctly
      const firstMatch = matches[0];
      expect(firstMatch.status).toBe('COMPLETED');
      expect(firstMatch.statusText).toBe('Completed');
      
      done();
    });

    const req = httpMock.expectOne(expectedUrl);
    req.flush(mockCompletedMatches);
  });

  /**
   * T032: Verify error handling returns observable error
   */
  it('should handle HTTP error and return empty array', (done) => {
    const expectedUrl = environment.REST_API_URL + 'api/v1/matches/completed';

    service.getCompletedMatches().subscribe(
      (matches) => {
        // On error, service should return empty array (catchError)
        expect(matches).toBeDefined();
        expect(Array.isArray(matches)).toBe(true);
        expect(matches.length).toBe(0);
        done();
      },
      () => {
        fail('Should not emit error, should catch and return empty array');
      }
    );

    const req = httpMock.expectOne(expectedUrl);
    req.error(new ErrorEvent('Network error'), { status: 500 });
  });

  it('should return empty array when API returns empty array', (done) => {
    const expectedUrl = environment.REST_API_URL + 'api/v1/matches/completed';

    service.getCompletedMatches().subscribe((matches) => {
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
      done();
    });

    const req = httpMock.expectOne(expectedUrl);
    req.flush([]);
  });

  it('should return empty array when API returns non-array response', (done) => {
    const expectedUrl = environment.REST_API_URL + 'api/v1/matches/completed';

    service.getCompletedMatches().subscribe((matches) => {
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
      done();
    });

    const req = httpMock.expectOne(expectedUrl);
    req.flush(null);
  });
});
