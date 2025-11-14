import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

/**
 * Viewport breakpoints matching our mobile-first design system
 * Values from _variables.css
 */
export enum Breakpoint {
  XS = 320,  // Small phone (iPhone SE)
  SM = 375,  // Medium phone (iPhone 12/13 mini)
  MD = 428,  // Large phone (iPhone 14 Pro Max)
  LG = 640,  // Small tablet / landscape phone
  XL = 768,  // Tablet
  XXL = 1024, // Desktop
  XXXL = 1280 // Large desktop
}

/**
 * Device type classification
 */
export enum DeviceType {
  MOBILE = 'mobile',      // < 768px
  TABLET = 'tablet',      // 768px - 1023px
  DESKTOP = 'desktop'     // >= 1024px
}

/**
 * Current viewport state
 */
export interface ViewportState {
  width: number;
  height: number;
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * ViewportService
 *
 * Detects and monitors viewport size changes for responsive design.
 * Provides observables for viewport state and utility methods for breakpoint detection.
 *
 * Usage:
 * ```typescript
 * constructor(private viewportService: ViewportService) {
 *   this.viewportService.viewportState$.subscribe(state => {
 *     console.log('Device type:', state.deviceType);
 *     console.log('Is mobile:', state.isMobile);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ViewportService {
  private viewportStateSubject: BehaviorSubject<ViewportState>;
  public viewportState$: Observable<ViewportState>;

  constructor() {
    const initialState = this.getCurrentViewportState();
    this.viewportStateSubject = new BehaviorSubject<ViewportState>(initialState);
    this.viewportState$ = this.viewportStateSubject.asObservable();

    this.initializeResizeListener();
  }

  /**
   * Initialize window resize listener with debouncing
   * Debounces to 150ms to avoid excessive updates during resize
   */
  private initializeResizeListener(): void {
    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(150),
          map(() => this.getCurrentViewportState()),
          distinctUntilChanged((prev, curr) =>
            prev.deviceType === curr.deviceType &&
            prev.isPortrait === curr.isPortrait
          )
        )
        .subscribe(state => {
          this.viewportStateSubject.next(state);
        });
    }
  }

  /**
   * Get current viewport state
   */
  private getCurrentViewportState(): ViewportState {
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    const height = typeof window !== 'undefined' ? window.innerHeight : 0;
    const deviceType = this.getDeviceType(width);

    return {
      width,
      height,
      deviceType,
      isMobile: deviceType === DeviceType.MOBILE,
      isTablet: deviceType === DeviceType.TABLET,
      isDesktop: deviceType === DeviceType.DESKTOP,
      isPortrait: height > width,
      isLandscape: width >= height
    };
  }

  /**
   * Determine device type based on width
   */
  private getDeviceType(width: number): DeviceType {
    if (width < Breakpoint.XL) {
      return DeviceType.MOBILE;
    } else if (width < Breakpoint.XXL) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  /**
   * Get current viewport width
   */
  get width(): number {
    return this.viewportStateSubject.value.width;
  }

  /**
   * Get current viewport height
   */
  get height(): number {
    return this.viewportStateSubject.value.height;
  }

  /**
   * Check if current viewport is mobile (<768px)
   */
  get isMobile(): boolean {
    return this.viewportStateSubject.value.isMobile;
  }

  /**
   * Check if current viewport is tablet (768px - 1023px)
   */
  get isTablet(): boolean {
    return this.viewportStateSubject.value.isTablet;
  }

  /**
   * Check if current viewport is desktop (>=1024px)
   */
  get isDesktop(): boolean {
    return this.viewportStateSubject.value.isDesktop;
  }

  /**
   * Check if viewport is in portrait orientation
   */
  get isPortrait(): boolean {
    return this.viewportStateSubject.value.isPortrait;
  }

  /**
   * Check if viewport is in landscape orientation
   */
  get isLandscape(): boolean {
    return this.viewportStateSubject.value.isLandscape;
  }

  /**
   * Check if viewport width is at or above a specific breakpoint
   *
   * @param breakpoint The breakpoint to check against
   * @returns true if viewport width >= breakpoint
   *
   * Usage:
   * ```typescript
   * if (viewportService.isAtLeast(Breakpoint.MD)) {
   *   // Display large phone layout
   * }
   * ```
   */
  isAtLeast(breakpoint: Breakpoint): boolean {
    return this.width >= breakpoint;
  }

  /**
   * Check if viewport width is below a specific breakpoint
   *
   * @param breakpoint The breakpoint to check against
   * @returns true if viewport width < breakpoint
   */
  isBelow(breakpoint: Breakpoint): boolean {
    return this.width < breakpoint;
  }

  /**
   * Check if viewport width is between two breakpoints
   *
   * @param minBreakpoint Minimum breakpoint (inclusive)
   * @param maxBreakpoint Maximum breakpoint (exclusive)
   * @returns true if minBreakpoint <= width < maxBreakpoint
   *
   * Usage:
   * ```typescript
   * if (viewportService.isBetween(Breakpoint.SM, Breakpoint.LG)) {
   *   // Display medium phone to small tablet layout
   * }
   * ```
   */
  isBetween(minBreakpoint: Breakpoint, maxBreakpoint: Breakpoint): boolean {
    return this.width >= minBreakpoint && this.width < maxBreakpoint;
  }

  /**
   * Get observable that emits when device type changes
   *
   * Usage:
   * ```typescript
   * viewportService.deviceType$.subscribe(deviceType => {
   *   console.log('Device changed to:', deviceType);
   * });
   * ```
   */
  get deviceType$(): Observable<DeviceType> {
    return this.viewportState$.pipe(
      map(state => state.deviceType),
      distinctUntilChanged()
    );
  }

  /**
   * Get observable that emits when viewport enters/exits mobile breakpoint
   */
  get isMobile$(): Observable<boolean> {
    return this.viewportState$.pipe(
      map(state => state.isMobile),
      distinctUntilChanged()
    );
  }

  /**
   * Get observable that emits when viewport enters/exits tablet breakpoint
   */
  get isTablet$(): Observable<boolean> {
    return this.viewportState$.pipe(
      map(state => state.isTablet),
      distinctUntilChanged()
    );
  }

  /**
   * Get observable that emits when viewport enters/exits desktop breakpoint
   */
  get isDesktop$(): Observable<boolean> {
    return this.viewportState$.pipe(
      map(state => state.isDesktop),
      distinctUntilChanged()
    );
  }

  /**
   * Get observable that emits when orientation changes
   */
  get orientation$(): Observable<'portrait' | 'landscape'> {
    return this.viewportState$.pipe(
      map(state => (state.isPortrait ? 'portrait' : 'landscape') as 'portrait' | 'landscape'),
      distinctUntilChanged()
    );
  }
}
