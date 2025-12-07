/**
 * Unit tests for MatchesListComponent - Completed Matches functionality
 * Feature: 008-completed-matches (US1 - T033, T034, T035, T036, T037)
 * Created: December 7, 2025
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MatchesListComponent } from './matches-list.component.ts';
import { MatchesService } from '../../services/matches.service';
import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';

describe('MatchesListComponent - Completed Matches', () => {
  let component: MatchesListComponent;
  let fixture: ComponentFixture<MatchesListComponent>;
  let matchesService: jasmine.SpyObj<MatchesService>;
  let router: jasmine.SpyObj<Router>;

  const mockCompletedMatches: MatchCardViewModel[] = [
    {
      id: '1',
      matchUrl: 'https://crex.com/match-1/live',
      status: MatchStatus.COMPLETED,
      statusText: 'Completed',
      displayStatus: 'Completed',
      statusColor: 'var(--color-match-completed)',
      team1: {
        name: 'India',
        shortName: 'IND',
        logoUrl: '/assets/images/teams/ind.png',
        score: {
          runs: 285,
          wickets: 7,
          overs: 50.0,
          displayText: '285/7 (50.0)'
        }
      },
      team2: {
        name: 'Australia',
        shortName: 'AUS',
        logoUrl: '/assets/images/teams/aus.png',
        score: {
          runs: 280,
          wickets: 10,
          overs: 49.2,
          displayText: '280/10 (49.2)'
        }
      },
      venue: 'Melbourne Cricket Ground',
      startTime: new Date('2025-12-01T10:00:00'),
      lastUpdated: new Date('2025-12-01T16:30:00'),
      timeDisplay: '6 hours ago',
      isStaleLiveData: false
    },
    {
      id: '2',
      matchUrl: 'https://crex.com/match-2/live',
      status: MatchStatus.COMPLETED,
      statusText: 'Completed',
      displayStatus: 'Completed',
      statusColor: 'var(--color-match-completed)',
      team1: {
        name: 'England',
        shortName: 'ENG',
        logoUrl: '/assets/images/teams/eng.png',
        score: {
          runs: 220,
          wickets: 9,
          overs: 50.0,
          displayText: '220/9 (50.0)'
        }
      },
      team2: {
        name: 'Pakistan',
        shortName: 'PAK',
        logoUrl: '/assets/images/teams/pak.png',
        score: {
          runs: 225,
          wickets: 5,
          overs: 47.3,
          displayText: '225/5 (47.3)'
        }
      },
      venue: 'Lords',
      startTime: new Date('2025-12-02T14:00:00'),
      lastUpdated: new Date('2025-12-02T20:00:00'),
      timeDisplay: '4 hours ago',
      isStaleLiveData: false
    }
  ];

  beforeEach(async () => {
    const matchesServiceSpy = jasmine.createSpyObj('MatchesService', [
      'getLiveMatchesWithAutoRefresh',
      'getCompletedMatches'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [MatchesListComponent],
      imports: [FormsModule],
      providers: [
        { provide: MatchesService, useValue: matchesServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    matchesService = TestBed.inject(MatchesService) as jasmine.SpyObj<MatchesService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    // Default mock for live matches
    matchesService.getLiveMatchesWithAutoRefresh.and.returnValue(of([]));

    fixture = TestBed.createComponent(MatchesListComponent);
    component = fixture.componentInstance;
  });

  /**
   * T033: Verify Completed tab click triggers loadCompletedMatches()
   */
  it('should call loadCompletedMatches when Completed tab is clicked', () => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));
    spyOn(component, 'loadCompletedMatches').and.callThrough();

    fixture.detectChanges(); // Initial load

    // Simulate tab change to Completed
    component.onTabChange(MatchStatus.COMPLETED);

    expect(component.loadCompletedMatches).toHaveBeenCalled();
    expect(matchesService.getCompletedMatches).toHaveBeenCalled();
  });

  /**
   * T034: Verify loading state is set during API call
   */
  it('should set isLoadingCompleted to true during API call', () => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));

    fixture.detectChanges();

    expect(component.isLoadingCompleted).toBe(false);

    component.loadCompletedMatches();

    // Should be true while loading (before observable completes)
    expect(component.isLoadingCompleted).toBe(true);
  });

  it('should set isLoadingCompleted to false after successful API call', (done) => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));

    fixture.detectChanges();

    component.loadCompletedMatches();

    // After subscription completes
    setTimeout(() => {
      expect(component.isLoadingCompleted).toBe(false);
      expect(component.completedMatches.length).toBe(2);
      done();
    }, 100);
  });

  /**
   * T035: Verify error message displays on API failure
   */
  it('should display error message when API call fails', (done) => {
    matchesService.getCompletedMatches.and.returnValue(throwError({ status: 500 }));

    fixture.detectChanges();

    component.loadCompletedMatches();

    setTimeout(() => {
      expect(component.hasCompletedError).toBe(true);
      expect(component.completedErrorMessage).toContain('Unable to load completed matches');
      expect(component.isLoadingCompleted).toBe(false);
      done();
    }, 100);
  });

  /**
   * T036: Verify retry button calls loadCompletedMatches() again
   */
  it('should call loadCompletedMatches when retry button is clicked', () => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));
    spyOn(component, 'loadCompletedMatches').and.callThrough();

    fixture.detectChanges();

    // Trigger retry
    component.retryLoadCompletedMatches();

    expect(component.loadCompletedMatches).toHaveBeenCalled();
  });

  /**
   * T037: Verify empty state shows when no matches returned
   */
  it('should handle empty completed matches array', (done) => {
    matchesService.getCompletedMatches.and.returnValue(of([]));

    fixture.detectChanges();

    component.loadCompletedMatches();

    setTimeout(() => {
      expect(component.completedMatches).toBeDefined();
      expect(component.completedMatches.length).toBe(0);
      expect(component.isLoadingCompleted).toBe(false);
      expect(component.hasCompletedError).toBe(false);
      done();
    }, 100);
  });

  it('should update tab counts after loading completed matches', (done) => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));
    spyOn(component, 'updateTabCounts').and.callThrough();

    fixture.detectChanges();

    component.loadCompletedMatches();

    setTimeout(() => {
      expect(component.updateTabCounts).toHaveBeenCalled();
      expect(component.completedMatchesCount).toBe(2);
      done();
    }, 100);
  });

  it('should display completed matches when Completed tab is active', (done) => {
    matchesService.getCompletedMatches.and.returnValue(of(mockCompletedMatches));

    fixture.detectChanges();

    component.onTabChange(MatchStatus.COMPLETED);

    setTimeout(() => {
      component.applyFilters();
      expect(component.filteredMatches.length).toBe(2);
      expect(component.selectedStatus).toBe(MatchStatus.COMPLETED);
      done();
    }, 100);
  });
});
