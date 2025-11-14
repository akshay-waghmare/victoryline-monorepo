import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ContentDiscoveryComponent } from './content-discovery.component';
import { DiscoveryFilterService } from './discovery-filter.service';
import { MatchHistoryService } from './match-history.service';
import { RecommendationService } from './recommendation.service';
import { AnalyticsService } from './analytics.service';
import { OfflineCacheService } from './offline-cache.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { SearchComponent } from './search.component';
import { MatchSkeletonComponent } from './match-skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { LazyLoadDirective } from './lazy-load.directive';
import { of, BehaviorSubject } from 'rxjs';

describe('ContentDiscoveryComponent', () => {
  let component: ContentDiscoveryComponent;
  let fixture: ComponentFixture<ContentDiscoveryComponent>;
  let mockDiscoveryService: jasmine.SpyObj<DiscoveryFilterService>;
  let mockHistoryService: jasmine.SpyObj<MatchHistoryService>;
  let mockRecommendationService: jasmine.SpyObj<RecommendationService>;
  let mockAnalyticsService: jasmine.SpyObj<AnalyticsService>;
  let mockOfflineCacheService: jasmine.SpyObj<OfflineCacheService>;
  let mockNetworkStatusService: jasmine.SpyObj<NetworkStatusService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let onlineSubject: BehaviorSubject<boolean>;

  const mockMatches = [
    {
      id: 'm1',
      team1: { name: 'India', logoUrl: '', score: '250/8' },
      team2: { name: 'Pakistan', logoUrl: '', score: '240/10' },
      status: 'completed',
      venue: 'Eden Gardens',
      date: '2024-01-15T10:00:00Z'
    },
    {
      id: 'm2',
      team1: { name: 'England', logoUrl: '', score: '' },
      team2: { name: 'Australia', logoUrl: '', score: '' },
      status: 'upcoming',
      venue: 'Lords',
      date: '2024-02-20T14:00:00Z'
    }
  ];

  beforeEach(() => {
    // Create online$ subject
    onlineSubject = new BehaviorSubject<boolean>(true);

    // Create mock services
    mockDiscoveryService = jasmine.createSpyObj('DiscoveryFilterService', 
      ['getInitialMatches', 'filterMatches', 'search']);
    mockHistoryService = jasmine.createSpyObj('MatchHistoryService', 
      ['getRecentlyViewed', 'recordMatchView', 'clearHistory']);
    mockRecommendationService = jasmine.createSpyObj('RecommendationService', 
      ['getRecommendations']);
    mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', 
      ['trackSearch', 'trackFilterChange', 'trackAutocompleteSelection', 
       'trackRecommendationClick', 'trackRecentlyViewedClick', 'trackMatchClick', 
       'trackHistoryClear']);
    mockOfflineCacheService = jasmine.createSpyObj('OfflineCacheService', 
      ['cacheSearchResults', 'getCachedSearchResults']);
    mockNetworkStatusService = jasmine.createSpyObj('NetworkStatusService', 
      ['isOnline']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Set up default return values
    mockDiscoveryService.getInitialMatches.and.returnValue(Promise.resolve(mockMatches));
    mockDiscoveryService.filterMatches.and.returnValue(Promise.resolve(mockMatches));
    mockDiscoveryService.search.and.returnValue(Promise.resolve(mockMatches));
    mockHistoryService.getRecentlyViewed.and.returnValue([mockMatches[0]]);
    mockRecommendationService.getRecommendations.and.returnValue([mockMatches[1]]);
    mockOfflineCacheService.cacheSearchResults.and.returnValue(of(void 0));
    mockOfflineCacheService.getCachedSearchResults.and.returnValue(of(mockMatches));
    Object.defineProperty(mockNetworkStatusService, 'online$', {
      get: () => onlineSubject.asObservable()
    });

    TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule],
      declarations: [
        ContentDiscoveryComponent,
        SearchComponent,
        MatchSkeletonComponent,
        EmptyStateComponent,
        LazyLoadDirective
      ],
      providers: [
        { provide: DiscoveryFilterService, useValue: mockDiscoveryService },
        { provide: MatchHistoryService, useValue: mockHistoryService },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: OfflineCacheService, useValue: mockOfflineCacheService },
        { provide: NetworkStatusService, useValue: mockNetworkStatusService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    fixture = TestBed.createComponent(ContentDiscoveryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load initial matches on ngOnInit', async () => {
      fixture.detectChanges(); // Triggers ngOnInit
      await fixture.whenStable();
      
      expect(mockDiscoveryService.getInitialMatches).toHaveBeenCalled();
      expect(component.matches.length).toBe(2);
    });

    it('should load recently viewed on ngOnInit', () => {
      fixture.detectChanges();
      
      expect(mockHistoryService.getRecentlyViewed).toHaveBeenCalledWith(5);
      expect(component.recentlyViewed.length).toBe(1);
    });

    it('should load recommendations after initial matches', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(mockMatches, 5);
      expect(component.recommended.length).toBe(1);
    });

    it('should set loading to false after initial load', async () => {
      fixture.detectChanges();
      expect(component.loading).toBe(true);
      
      await fixture.whenStable();
      expect(component.loading).toBe(false);
    });
  });

  describe('Filter Application', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should apply filters when applyFilters() is called', async () => {
      component.filters.type = 'live';
      component.applyFilters();
      await fixture.whenStable();
      
      expect(mockDiscoveryService.filterMatches).toHaveBeenCalledWith(component.filters);
    });

    it('should track filter changes with analytics', async () => {
      component.filters.type = 'upcoming';
      component.applyFilters();
      await fixture.whenStable();
      
      expect(mockAnalyticsService.trackFilterChange).toHaveBeenCalledWith(
        'type', 'upcoming', mockMatches.length
      );
    });

    it('should cache filtered results when online', async () => {
      component.isOnline = true;
      component.filters.type = 'live';
      component.applyFilters();
      await fixture.whenStable();
      
      expect(mockOfflineCacheService.cacheSearchResults).toHaveBeenCalled();
    });

    it('should set loading state during filter application', () => {
      component.applyFilters();
      expect(component.loading).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should search matches when query provided', async () => {
      component.onSearch('India');
      await fixture.whenStable();
      
      expect(mockDiscoveryService.search).toHaveBeenCalledWith('India');
    });

    it('should track search with analytics', async () => {
      component.onSearch('Pakistan');
      await fixture.whenStable();
      
      expect(mockAnalyticsService.trackSearch).toHaveBeenCalledWith('Pakistan', mockMatches.length);
    });

    it('should not search when query is too short', () => {
      component.onSearch('a');
      expect(mockDiscoveryService.search).not.toHaveBeenCalled();
    });

    it('should not search when query is empty', () => {
      component.onSearch('');
      expect(mockDiscoveryService.search).not.toHaveBeenCalled();
    });

    it('should cache search results when online', async () => {
      component.isOnline = true;
      component.onSearch('test query');
      await fixture.whenStable();
      
      expect(mockOfflineCacheService.cacheSearchResults).toHaveBeenCalled();
    });
  });

  describe('Match Click Handling', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should track match click from all matches section', () => {
      component.onMatchClick(mockMatches[0], 'all_matches');
      
      expect(mockAnalyticsService.trackMatchClick).toHaveBeenCalledWith(
        'm1', 'India vs Pakistan', 'all_matches'
      );
    });

    it('should track recently viewed click', () => {
      component.onMatchClick(mockMatches[0], 'recently_viewed', 0);
      
      expect(mockAnalyticsService.trackRecentlyViewedClick).toHaveBeenCalledWith(
        'm1', 'India vs Pakistan', 0
      );
    });

    it('should track recommendation click', () => {
      component.onMatchClick(mockMatches[1], 'recommended', 2);
      
      expect(mockAnalyticsService.trackRecommendationClick).toHaveBeenCalledWith(
        'm2', 'England vs Australia', 2, undefined
      );
    });

    it('should record match view in history', () => {
      component.onMatchClick(mockMatches[0], 'all_matches');
      
      expect(mockHistoryService.recordMatchView).toHaveBeenCalledWith(mockMatches[0]);
    });

    it('should navigate to match details', () => {
      component.onMatchClick(mockMatches[0], 'all_matches');
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/matches', 'm1']);
    });
  });

  describe('Autocomplete Selection', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should record view when suggestion selected', () => {
      component.onSuggestionSelected(mockMatches[0]);
      
      expect(mockHistoryService.recordMatchView).toHaveBeenCalledWith(mockMatches[0]);
    });

    it('should track autocomplete selection', () => {
      component.onSuggestionSelected(mockMatches[0]);
      
      expect(mockAnalyticsService.trackAutocompleteSelection).toHaveBeenCalledWith(
        'm1', 'India vs Pakistan', 0
      );
    });

    it('should navigate to match', () => {
      component.onSuggestionSelected(mockMatches[0]);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/matches', 'm1']);
    });
  });

  describe('History Management', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      component.recentlyViewed = [mockMatches[0], mockMatches[1]];
    });

    it('should clear history when clearHistory() called', () => {
      component.clearHistory();
      
      expect(mockHistoryService.clearHistory).toHaveBeenCalled();
      expect(component.recentlyViewed.length).toBe(0);
    });

    it('should track history clear with item count', () => {
      component.clearHistory();
      
      expect(mockAnalyticsService.trackHistoryClear).toHaveBeenCalledWith(2);
    });
  });

  describe('Offline Support', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should detect when offline', () => {
      onlineSubject.next(false);
      fixture.detectChanges();
      
      expect(component.isOnline).toBe(false);
    });

    it('should refresh data when coming back online', () => {
      component.usingCachedData = true;
      mockDiscoveryService.getInitialMatches.calls.reset();
      
      onlineSubject.next(true);
      fixture.detectChanges();
      
      expect(mockDiscoveryService.getInitialMatches).toHaveBeenCalled();
    });

    it('should show cached data indicator when using cache', () => {
      component.usingCachedData = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.cached-banner')).toBeTruthy();
    });

    it('should show offline banner when offline', () => {
      component.isOnline = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.offline-banner')).toBeTruthy();
    });
  });

  describe('TrackBy Functions', () => {
    it('should have trackByMatchId function', () => {
      expect(component.trackByMatchId).toBeDefined();
    });

    it('should return match id for trackBy', () => {
      const result = component.trackByMatchId(0, mockMatches[0]);
      expect(result).toBe('m1');
    });
  });

  describe('Error Handling', () => {
    it('should handle initial load errors', async () => {
      mockDiscoveryService.getInitialMatches.and.returnValue(Promise.reject('Error'));
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(component.loading).toBe(false);
    });

    it('should handle filter errors', async () => {
      mockDiscoveryService.filterMatches.and.returnValue(Promise.reject('Error'));
      
      component.applyFilters();
      await fixture.whenStable();
      
      expect(component.loading).toBe(false);
    });

    it('should handle search errors', async () => {
      mockDiscoveryService.search.and.returnValue(Promise.reject('Error'));
      
      component.onSearch('test');
      await fixture.whenStable();
      
      expect(component.loading).toBe(false);
    });
  });
});
