import { TestBed } from '@angular/core/testing';
import { MatchHistoryService } from './match-history.service';
import { MatchCardViewModel } from '../matches/models/match-card.models';

describe('MatchHistoryService', () => {
  let service: MatchHistoryService;
  let mockLocalStorage: { [key: string]: string };

  const createMockMatch = (id: string, team1: string, team2: string): MatchCardViewModel => ({
    id,
    team1: { name: team1, logoUrl: '', score: '' },
    team2: { name: team2, logoUrl: '', score: '' },
    status: 'upcoming',
    venue: 'Test Stadium',
    date: new Date().toISOString()
  });

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({
      providers: [MatchHistoryService]
    });
    service = TestBed.get(MatchHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Record Match View', () => {
    it('should record a match view', () => {
      const match = createMockMatch('m1', 'India', 'Pakistan');
      service.recordMatchView(match);
      
      const history = service.getRecentlyViewed();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('m1');
    });

    it('should not create duplicates for same match', () => {
      const match = createMockMatch('m1', 'India', 'Pakistan');
      service.recordMatchView(match);
      service.recordMatchView(match);
      
      const history = service.getRecentlyViewed();
      expect(history.length).toBe(1);
    });

    it('should move existing match to front when viewed again', () => {
      const match1 = createMockMatch('m1', 'India', 'Pakistan');
      const match2 = createMockMatch('m2', 'England', 'Australia');
      
      service.recordMatchView(match1);
      service.recordMatchView(match2);
      service.recordMatchView(match1); // View m1 again
      
      const history = service.getRecentlyViewed();
      expect(history[0].id).toBe('m1'); // m1 should be at front
    });

    it('should limit history to 20 items', () => {
      // Record 25 match views
      for (let i = 0; i < 25; i++) {
        const match = createMockMatch(`m${i}`, `Team${i}A`, `Team${i}B`);
        service.recordMatchView(match);
      }
      
      const history = service.getRecentlyViewed();
      expect(history.length).toBe(20);
    });

    it('should remove oldest items when limit exceeded', () => {
      // Record 21 matches
      for (let i = 0; i < 21; i++) {
        const match = createMockMatch(`m${i}`, `Team${i}A`, `Team${i}B`);
        service.recordMatchView(match);
      }
      
      const history = service.getRecentlyViewed();
      // m0 (oldest) should be removed
      expect(history.find(m => m.id === 'm0')).toBeUndefined();
      // m20 (newest) should be present
      expect(history.find(m => m.id === 'm20')).toBeDefined();
    });
  });

  describe('Get Recently Viewed', () => {
    it('should return empty array when no history', () => {
      const history = service.getRecentlyViewed();
      expect(history).toEqual([]);
    });

    it('should return limited number of matches', () => {
      // Record 10 matches
      for (let i = 0; i < 10; i++) {
        const match = createMockMatch(`m${i}`, `Team${i}A`, `Team${i}B`);
        service.recordMatchView(match);
      }
      
      const history = service.getRecentlyViewed(5);
      expect(history.length).toBe(5);
    });

    it('should return matches in reverse chronological order (newest first)', () => {
      const match1 = createMockMatch('m1', 'Team1A', 'Team1B');
      const match2 = createMockMatch('m2', 'Team2A', 'Team2B');
      const match3 = createMockMatch('m3', 'Team3A', 'Team3B');
      
      service.recordMatchView(match1);
      service.recordMatchView(match2);
      service.recordMatchView(match3);
      
      const history = service.getRecentlyViewed();
      expect(history[0].id).toBe('m3'); // Newest
      expect(history[2].id).toBe('m1'); // Oldest
    });

    it('should default to returning all matches when no limit specified', () => {
      // Record 5 matches
      for (let i = 0; i < 5; i++) {
        const match = createMockMatch(`m${i}`, `Team${i}A`, `Team${i}B`);
        service.recordMatchView(match);
      }
      
      const history = service.getRecentlyViewed();
      expect(history.length).toBe(5);
    });
  });

  describe('Get Favorite Teams', () => {
    it('should return empty array when no history', () => {
      const favorites = service.getFavoriteTeams();
      expect(favorites).toEqual([]);
    });

    it('should identify most viewed teams', () => {
      const match1 = createMockMatch('m1', 'India', 'Pakistan');
      const match2 = createMockMatch('m2', 'India', 'England');
      const match3 = createMockMatch('m3', 'India', 'Australia');
      
      service.recordMatchView(match1);
      service.recordMatchView(match2);
      service.recordMatchView(match3);
      
      const favorites = service.getFavoriteTeams();
      expect(favorites[0]).toBe('India'); // Appears in all 3 matches
    });

    it('should return teams sorted by frequency', () => {
      service.recordMatchView(createMockMatch('m1', 'India', 'Pakistan'));
      service.recordMatchView(createMockMatch('m2', 'India', 'England'));
      service.recordMatchView(createMockMatch('m3', 'England', 'Australia'));
      
      const favorites = service.getFavoriteTeams();
      expect(favorites[0]).toBe('India'); // 2 occurrences
      expect(favorites[1]).toBe('England'); // 2 occurrences
    });

    it('should limit returned teams', () => {
      service.recordMatchView(createMockMatch('m1', 'Team1', 'Team2'));
      service.recordMatchView(createMockMatch('m2', 'Team3', 'Team4'));
      service.recordMatchView(createMockMatch('m3', 'Team5', 'Team6'));
      
      const favorites = service.getFavoriteTeams(2);
      expect(favorites.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Clear History', () => {
    it('should remove all history', () => {
      service.recordMatchView(createMockMatch('m1', 'India', 'Pakistan'));
      service.recordMatchView(createMockMatch('m2', 'England', 'Australia'));
      
      expect(service.getRecentlyViewed().length).toBe(2);
      
      service.clearHistory();
      expect(service.getRecentlyViewed().length).toBe(0);
    });

    it('should clear localStorage', () => {
      service.recordMatchView(createMockMatch('m1', 'India', 'Pakistan'));
      service.clearHistory();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('matchHistory');
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save to localStorage when recording views', () => {
      const match = createMockMatch('m1', 'India', 'Pakistan');
      service.recordMatchView(match);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('matchHistory', jasmine.any(String));
    });

    it('should handle localStorage quota exceeded', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
      
      const match = createMockMatch('m1', 'India', 'Pakistan');
      expect(() => {
        service.recordMatchView(match);
      }).not.toThrow();
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage['matchHistory'] = 'invalid json {[';
      
      expect(() => {
        service.getRecentlyViewed();
      }).not.toThrow();
    });

    it('should load from localStorage on init', () => {
      const match = createMockMatch('m1', 'India', 'Pakistan');
      const historyData = JSON.stringify([match]);
      mockLocalStorage['matchHistory'] = historyData;
      
      // Create new service instance to trigger load
      const newService = new MatchHistoryService();
      const history = newService.getRecentlyViewed();
      
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('m1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle matches with missing team names', () => {
      const match: any = {
        id: 'm1',
        team1: { name: '', logoUrl: '', score: '' },
        team2: { name: '', logoUrl: '', score: '' },
        status: 'upcoming',
        venue: 'Stadium',
        date: new Date().toISOString()
      };
      
      expect(() => {
        service.recordMatchView(match);
      }).not.toThrow();
    });

    it('should handle undefined match gracefully', () => {
      expect(() => {
        service.recordMatchView(undefined as any);
      }).not.toThrow();
    });

    it('should handle null match gracefully', () => {
      expect(() => {
        service.recordMatchView(null as any);
      }).not.toThrow();
    });
  });
});
