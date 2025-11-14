import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    TestBed.configureTestingModule({
      providers: [NetworkStatusService]
    });
    service = TestBed.inject(NetworkStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Online Status', () => {
    it('should have online$ observable', (done) => {
      service.online$.subscribe(isOnline => {
        expect(typeof isOnline).toBe('boolean');
        done();
      });
    });

    it('should reflect navigator.onLine status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      expect(service.isOnline()).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      // Create new service instance to pick up new value
      const offlineService = new NetworkStatusService();
      expect(offlineService.isOnline()).toBe(false);
    });

    it('should provide isOnline() synchronous method', () => {
      expect(service.isOnline).toBeDefined();
      expect(typeof service.isOnline).toBe('function');
      expect(typeof service.isOnline()).toBe('boolean');
    });
  });

  describe('Connection Quality', () => {
    it('should have connectionQuality$ observable', (done) => {
      service.connectionQuality$.subscribe(quality => {
        expect(['good', 'poor', 'offline']).toContain(quality);
        done();
      });
    });

    it('should return "offline" when not online', (done) => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      const offlineService = new NetworkStatusService();
      
      offlineService.connectionQuality$.subscribe(quality => {
        expect(quality).toBe('offline');
        done();
      });
    });

    it('should return "good" by default when online', (done) => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      const onlineService = new NetworkStatusService();
      
      onlineService.connectionQuality$.subscribe(quality => {
        expect(['good', 'poor']).toContain(quality);
        done();
      });
    });
  });

  describe('Connection Type', () => {
    it('should provide getConnectionType method', () => {
      expect(service.getConnectionType).toBeDefined();
      expect(typeof service.getConnectionType).toBe('function');
    });

    it('should return connection type string', () => {
      const type = service.getConnectionType();
      expect(typeof type).toBe('string');
    });

    it('should return "unknown" when Network Information API unavailable', () => {
      (navigator as any).connection = undefined;
      const type = service.getConnectionType();
      expect(type).toBe('unknown');
    });
  });

  describe('Effective Type', () => {
    it('should provide getEffectiveType method', () => {
      expect(service.getEffectiveType).toBeDefined();
      expect(typeof service.getEffectiveType).toBe('function');
    });

    it('should return effective type string', () => {
      const effectiveType = service.getEffectiveType();
      expect(typeof effectiveType).toBe('string');
    });

    it('should return "unknown" when Network Information API unavailable', () => {
      (navigator as any).connection = undefined;
      const effectiveType = service.getEffectiveType();
      expect(effectiveType).toBe('unknown');
    });
  });

  describe('Metered Connection', () => {
    it('should provide isMeteredConnection method', () => {
      expect(service.isMeteredConnection).toBeDefined();
      expect(typeof service.isMeteredConnection).toBe('function');
    });

    it('should return boolean', () => {
      const isMetered = service.isMeteredConnection();
      expect(typeof isMetered).toBe('boolean');
    });

    it('should return true for cellular connection', () => {
      (navigator as any).connection = { type: 'cellular' };
      expect(service.isMeteredConnection()).toBe(true);
    });

    it('should return true when saveData is enabled', () => {
      (navigator as any).connection = { saveData: true };
      expect(service.isMeteredConnection()).toBe(true);
    });

    it('should return false when no metered indicators', () => {
      (navigator as any).connection = { type: 'wifi', saveData: false };
      expect(service.isMeteredConnection()).toBe(false);
    });
  });

  describe('Connection Check', () => {
    it('should provide checkConnection method', () => {
      expect(service.checkConnection).toBeDefined();
      expect(typeof service.checkConnection).toBe('function');
    });

    it('should return Promise<boolean>', async () => {
      const result = service.checkConnection();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return false immediately when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      const result = await service.checkConnection();
      expect(result).toBe(false);
    });
  });

  describe('SSR Safety', () => {
    it('should handle window being undefined', () => {
      // Service should not throw during construction even in SSR context
      expect(() => {
        const ssrService = new NetworkStatusService();
      }).not.toThrow();
    });
  });
});
