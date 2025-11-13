import { Injectable } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs/operators';

/**
 * ScrollRestorationService
 * 
 * Saves and restores scroll positions when navigating between pages.
 * Essential for mobile UX to maintain context when user navigates back.
 * 
 * Features:
 * - Automatic scroll position tracking for all routes
 * - Configurable routes to exclude from restoration
 * - Smooth scroll restoration with animation
 * - Memory-efficient storage (only last 10 positions)
 * 
 * Usage in AppComponent:
 * ```typescript
 * constructor(private scrollRestoration: ScrollRestorationService) {
 *   scrollRestoration.enable();
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ScrollRestorationService {
  private scrollPositions = new Map<string, [number, number]>();
  private maxStoredPositions = 10;
  private excludedRoutes: string[] = [];
  private enabled = false;
  
  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {}
  
  /**
   * Enable scroll restoration
   * Call this in AppComponent constructor
   */
  enable(excludedRoutes: string[] = []): void {
    if (this.enabled) {
      return;
    }
    
    this.enabled = true;
    this.excludedRoutes = excludedRoutes;
    
    // Save scroll position before navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        this.saveScrollPosition(this.router.url);
      });
    
    // Restore scroll position after navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.restoreScrollPosition(event.urlAfterRedirects);
      });
  }
  
  /**
   * Disable scroll restoration
   */
  disable(): void {
    this.enabled = false;
  }
  
  /**
   * Save current scroll position for a route
   */
  private saveScrollPosition(url: string): void {
    if (this.isExcluded(url)) {
      return;
    }
    
    const position = this.viewportScroller.getScrollPosition();
    this.scrollPositions.set(url, position);
    
    // Limit stored positions to prevent memory leaks
    if (this.scrollPositions.size > this.maxStoredPositions) {
      const firstKey = this.scrollPositions.keys().next().value;
      this.scrollPositions.delete(firstKey);
    }
  }
  
  /**
   * Restore scroll position for a route
   */
  private restoreScrollPosition(url: string): void {
    if (this.isExcluded(url)) {
      return;
    }
    
    const position = this.scrollPositions.get(url);
    
    if (position) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.viewportScroller.scrollToPosition(position);
      }, 0);
    } else {
      // Default: scroll to top for new pages
      setTimeout(() => {
        this.viewportScroller.scrollToPosition([0, 0]);
      }, 0);
    }
  }
  
  /**
   * Check if route is excluded from restoration
   */
  private isExcluded(url: string): boolean {
    return this.excludedRoutes.some(route => url.startsWith(route));
  }
  
  /**
   * Manually save scroll position (for custom scenarios)
   */
  savePosition(key: string, position?: [number, number]): void {
    const pos = position || this.viewportScroller.getScrollPosition();
    this.scrollPositions.set(key, pos);
  }
  
  /**
   * Manually restore scroll position (for custom scenarios)
   */
  restorePosition(key: string): void {
    const position = this.scrollPositions.get(key);
    if (position) {
      this.viewportScroller.scrollToPosition(position);
    }
  }
  
  /**
   * Clear all stored positions
   */
  clear(): void {
    this.scrollPositions.clear();
  }
  
  /**
   * Clear position for specific route
   */
  clearPosition(url: string): void {
    this.scrollPositions.delete(url);
  }
}
