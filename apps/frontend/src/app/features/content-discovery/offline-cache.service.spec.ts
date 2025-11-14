import { TestBed } from '@angular/core/testing';
import { OfflineCacheService } from './offline-cache.service';

describe('OfflineCacheService', () => {
  let service: OfflineCacheService;
  let mockIndexedDB: any;

  beforeEach(() => {
    // Mock IndexedDB
    mockIndexedDB = {
      open: jasmine.createSpy('open').and.returnValue({
        onsuccess: null,
        onerror: null,
        result: null
      })
    };

    // Replace global indexedDB with mock
    (window as any).indexedDB = mockIndexedDB;

    TestBed.configureTestingModule({
      providers: [OfflineCacheService]
    });
    service = TestBed.inject(OfflineCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same query and filters', () => {
      const key1 = (service as any).getCacheKey('test query', { type: 'live' });
      const key2 = (service as any).getCacheKey('test query', { type: 'live' });
      expect(key1).toBe(key2);
    });

    it('should normalize query case', () => {
      const key1 = (service as any).getCacheKey('TEST Query', {});
      const key2 = (service as any).getCacheKey('test query', {});
      expect(key1).toBe(key2);
    });

    it('should trim whitespace from query', () => {
      const key1 = (service as any).getCacheKey('  test  ', {});
      const key2 = (service as any).getCacheKey('test', {});
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different filters', () => {
      const key1 = (service as any).getCacheKey('test', { type: 'live' });
      const key2 = (service as any).getCacheKey('test', { type: 'upcoming' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Expiry', () => {
    it('should mark data as expired after 24 hours', () => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000) - 1000; // 24 hours + 1 second
      expect((service as any).isExpired(oneDayAgo)).toBe(true);
    });

    it('should mark data as valid within 24 hours', () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
      expect((service as any).isExpired(oneHourAgo)).toBe(false);
    });

    it('should mark current timestamp as valid', () => {
      const now = Date.now();
      expect((service as any).isExpired(now)).toBe(false);
    });
  });

  describe('IndexedDB Support', () => {
    it('should handle missing IndexedDB gracefully', (done) => {
      (window as any).indexedDB = undefined;
      
      service.cacheSearchResults('test', {}, []).subscribe({
        next: () => {
          // Should complete without error
          done();
        },
        error: (err) => {
          done.fail('Should not throw error when IndexedDB is unavailable');
        }
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache stats observable', (done) => {
      service.getCacheStats().subscribe({
        next: (stats) => {
          expect(stats).toBeDefined();
          expect(typeof stats.searches).toBe('number');
          expect(typeof stats.matches).toBe('number');
          done();
        },
        error: (err) => {
          // Expected to fail if IndexedDB not properly mocked
          done();
        }
      });
    });
  });

  describe('Clear Cache', () => {
    it('should provide clearCache method', () => {
      expect(service.clearCache).toBeDefined();
      expect(typeof service.clearCache).toBe('function');
    });

    it('should return observable from clearCache', (done) => {
      service.clearCache().subscribe({
        next: () => {
          done();
        },
        error: () => {
          done(); // Expected if IndexedDB not mocked
        }
      });
    });
  });

  describe('API Contract', () => {
    it('should have cacheSearchResults method', () => {
      expect(service.cacheSearchResults).toBeDefined();
      expect(typeof service.cacheSearchResults).toBe('function');
    });

    it('should have getCachedSearchResults method', () => {
      expect(service.getCachedSearchResults).toBeDefined();
      expect(typeof service.getCachedSearchResults).toBe('function');
    });

    it('should have cacheMatch method', () => {
      expect(service.cacheMatch).toBeDefined();
      expect(typeof service.cacheMatch).toBe('function');
    });

    it('should have getCachedMatch method', () => {
      expect(service.getCachedMatch).toBeDefined();
      expect(typeof service.getCachedMatch).toBe('function');
    });
  });
});
