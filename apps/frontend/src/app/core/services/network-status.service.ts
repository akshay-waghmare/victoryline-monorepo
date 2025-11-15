import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Service to monitor network connectivity status.
 * Provides online/offline state and connection quality indicators.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  
  /**
   * Observable that emits true when online, false when offline
   */
  public readonly online$: Observable<boolean> = this.onlineSubject.asObservable();

  /**
   * Observable that emits connection quality: 'good' | 'poor' | 'offline'
   */
  public readonly connectionQuality$: Observable<'good' | 'poor' | 'offline'>;

  constructor() {
    this.initNetworkListeners();
    this.connectionQuality$ = this.createConnectionQualityObservable();
  }

  /**
   * Initialize browser online/offline event listeners
   */
  private initNetworkListeners(): void {
    if (typeof window === 'undefined') {
      return; // SSR safety
    }

    // Listen to browser online/offline events
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(isOnline => {
      this.onlineSubject.next(isOnline);
      console.log(`Network status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    });

    // Check connection on visibility change (user returns to tab)
    fromEvent(document, 'visibilitychange')
      .pipe(debounceTime(500))
      .subscribe(() => {
        if (!document.hidden) {
          this.checkConnection();
        }
      });
  }

  /**
   * Create observable that monitors connection quality
   * Uses Network Information API when available
   */
  private createConnectionQualityObservable(): Observable<'good' | 'poor' | 'offline'> {
    return this.online$.pipe(
      map((isOnline): 'good' | 'poor' | 'offline' => {
        if (!isOnline) {
          return 'offline';
        }

        // Check Network Information API if available
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        if (connection) {
          const effectiveType = connection.effectiveType;
          // '4g' = good, '3g' = acceptable, '2g'/'slow-2g' = poor
          if (effectiveType === '4g' || effectiveType === '3g') {
            return 'good';
          } else {
            return 'poor';
          }
        }

        // Default to 'good' if online and no detailed info available
        return 'good';
      }),
      distinctUntilChanged(),
      debounceTime(300)
    );
  }

  /**
   * Get current online status synchronously
   */
  isOnline(): boolean {
    return this.onlineSubject.value;
  }

  /**
   * Check connection by attempting to fetch a small resource
   * More reliable than navigator.onLine on some devices
   */
  async checkConnection(): Promise<boolean> {
    if (!navigator.onLine) {
      this.onlineSubject.next(false);
      return false;
    }

    try {
      // Fetch a small image with cache-busting to verify real connectivity
      const response = await fetch('/assets/icons/favicon.ico?check=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const isOnline = response.ok;
      this.onlineSubject.next(isOnline);
      return isOnline;
    } catch (error) {
      console.warn('Connection check failed:', error);
      this.onlineSubject.next(false);
      return false;
    }
  }

  /**
   * Get connection type (wifi, cellular, etc.) if available
   */
  getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? connection.type : 'unknown';
  }

  /**
   * Get effective connection speed if available
   */
  getEffectiveType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? connection.effectiveType : 'unknown';
  }

  /**
   * Check if user is on a metered connection (cellular, limited wifi)
   */
  isMeteredConnection(): boolean {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? (connection.saveData === true || connection.type === 'cellular') : false;
  }
}
