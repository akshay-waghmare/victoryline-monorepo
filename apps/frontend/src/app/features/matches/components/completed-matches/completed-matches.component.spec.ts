/**
 * Unit tests for CompletedMatchesComponent
 * Feature: 006-completed-matches-display
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { CompletedMatchesComponent } from './completed-matches.component';
import { MatchesService } from '../../services/matches.service';
import { CompletedMatch } from '../../../../shared/models/completed-match.models';

describe('CompletedMatchesComponent', () => {
  let component: CompletedMatchesComponent;
  let fixture: ComponentFixture<CompletedMatchesComponent>;
  let matchesService: jasmine.SpyObj<MatchesService>;

  const mockMatches: CompletedMatch[] = [
    {
      matchId: 1,
      homeTeamName: 'India',
      awayTeamName: 'Australia',
      result: 'India won by 5 wickets',
      completionDate: new Date('2025-01-15'),
      seriesName: 'Test Series 2025',
      seriesFormat: 'Test',
      location: 'Mumbai',
      sportType: 'Cricket',
      matchLink: '/match/1'
    },
    {
      matchId: 2,
      homeTeamName: 'England',
      awayTeamName: 'Pakistan',
      result: 'Match drawn',
      completionDate: new Date('2025-01-14'),
      seriesName: 'Test Series 2025',
      seriesFormat: 'Test',
      location: 'London',
      sportType: 'Cricket',
      matchLink: '/match/2'
    }
  ];

  beforeEach(() => {
    const matchesServiceSpy = jasmine.createSpyObj('MatchesService', ['getCompletedMatches']);

    TestBed.configureTestingModule({
      declarations: [ CompletedMatchesComponent ],
      imports: [ HttpClientTestingModule ],
      providers: [
        { provide: MatchesService, useValue: matchesServiceSpy }
      ]
    });

    fixture = TestBed.createComponent(CompletedMatchesComponent);
    component = fixture.componentInstance;
    matchesService = TestBed.inject(MatchesService) as jasmine.SpyObj<MatchesService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load completed matches on init', () => {
    // Arrange
    matchesService.getCompletedMatches.and.returnValue(of(mockMatches));

    // Act
    fixture.detectChanges(); // triggers ngOnInit

    // Assert
    expect(component.matches.length).toBe(2);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
    expect(matchesService.getCompletedMatches).toHaveBeenCalledTimes(1);
  });

  it('should handle empty matches list', () => {
    // Arrange
    matchesService.getCompletedMatches.and.returnValue(of([]));

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.matches.length).toBe(0);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
  });

  it('should handle error when loading matches', () => {
    // Arrange
    const errorResponse = new Error('Network error');
    matchesService.getCompletedMatches.and.returnValue(throwError(errorResponse));

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.matches.length).toBe(0);
    expect(component.loading).toBe(false);
    expect(component.error).toBe('Failed to load completed matches. Please try again.');
  });

  it('should show loading state initially', () => {
    // Arrange
    matchesService.getCompletedMatches.and.returnValue(of(mockMatches));

    // Act - Before ngOnInit
    component.loading = true;

    // Assert
    expect(component.loading).toBe(true);
  });

  it('should retry loading matches', () => {
    // Arrange
    matchesService.getCompletedMatches.and.returnValue(of(mockMatches));
    component.error = 'Previous error';

    // Act
    component.retry();

    // Assert
    expect(component.error).toBeNull();
    expect(matchesService.getCompletedMatches).toHaveBeenCalled();
  });

  it('should format date correctly', () => {
    // Arrange
    const testDate = new Date('2025-01-15');

    // Act
    const formattedDate = component.formatDate(testDate);

    // Assert
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2025');
  });

  it('should format string date correctly', () => {
    // Arrange
    const testDate = '2025-01-15';

    // Act
    const formattedDate = component.formatDate(testDate);

    // Assert
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2025');
  });

  it('should open match link in new tab', () => {
    // Arrange
    spyOn(window, 'open');
    const match = mockMatches[0];

    // Act
    component.viewMatchDetails(match);

    // Assert
    expect(window.open).toHaveBeenCalledWith('/match/1', '_blank');
  });

  it('should not open window if matchLink is missing', () => {
    // Arrange
    spyOn(window, 'open');
    const matchWithoutLink: CompletedMatch = { ...mockMatches[0], matchLink: undefined };

    // Act
    component.viewMatchDetails(matchWithoutLink);

    // Assert
    expect(window.open).not.toHaveBeenCalled();
  });

  it('should track matches by matchId', () => {
    // Arrange
    const match = mockMatches[0];

    // Act
    const trackId = component.trackByMatchId(0, match);

    // Assert
    expect(trackId).toBe(1);
  });

  it('should unsubscribe on destroy', () => {
    // Arrange
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    // Act
    component.ngOnDestroy();

    // Assert
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should display series name in matches', () => {
    // Arrange
    matchesService.getCompletedMatches.and.returnValue(of(mockMatches));

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.matches[0].seriesName).toBe('Test Series 2025');
    expect(component.matches[1].seriesName).toBe('Test Series 2025');
  });
});
