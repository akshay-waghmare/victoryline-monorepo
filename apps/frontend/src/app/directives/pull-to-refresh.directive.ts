import { Directive, ElementRef, EventEmitter, Output, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import * as Hammer from 'hammerjs';

// Type definitions for HammerJS (Angular 7 doesn't have built-in types)
type HammerManager = any;
type HammerInput = any;

/**
 * PullToRefreshDirective
 * 
 * Implements pull-to-refresh gesture for mobile using HammerJS pan events.
 * Commonly used for refreshing live scores, match lists, and dynamic content.
 * 
 * Features:
 * - Visual feedback with spinner and arrow indicator
 * - 80px pull threshold before triggering refresh
 * - Smooth animation during pull and release
 * - Only triggers at scroll top (prevents conflicts with scrolling)
 * - Customizable refresh action via event binding
 * 
 * Usage:
 * ```html
 * <div appPullToRefresh (refresh)="onRefresh()">
 *   <div class="content">
 *     <!-- Your scrollable content -->
 *   </div>
 * </div>
 * ```
 * 
 * Thresholds:
 * - Pull threshold: 80px (triggers refresh on release)
 * - Max pull distance: 120px (visual constraint)
 * - Pan threshold: 10px (from CustomHammerConfig)
 */
@Directive({
  selector: '[appPullToRefresh]'
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  /**
   * Emitted when pull-to-refresh threshold is reached and user releases
   * Parent component should handle the actual refresh logic
   * @event
   */
  @Output() refresh = new EventEmitter<void>();

  /**
   * HammerJS instance for pan gesture management
   */
  private hammer: HammerManager;

  /**
   * Pull indicator element (created dynamically)
   */
  private indicator: HTMLElement;

  /**
   * Current pull distance in pixels
   */
  private pullDistance: number = 0;

  /**
   * Threshold to trigger refresh (80px)
   */
  private readonly THRESHOLD: number = 80;

  /**
   * Maximum pull distance allowed (120px)
   */
  private readonly MAX_PULL: number = 120;

  /**
   * Whether refresh is currently in progress
   */
  private isRefreshing: boolean = false;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.createIndicator();
    this.initHammer();
  }

  ngOnDestroy(): void {
    if (this.hammer) {
      this.hammer.destroy();
    }
    if (this.indicator) {
      this.renderer.removeChild(this.elementRef.nativeElement, this.indicator);
    }
  }

  /**
   * Create pull-to-refresh indicator element
   * Positioned absolutely at top of container
   */
  private createIndicator(): void {
    this.indicator = this.renderer.createElement('div');
    this.renderer.addClass(this.indicator, 'pull-to-refresh-indicator');
    
    // Set initial styles
    this.renderer.setStyle(this.indicator, 'position', 'absolute');
    this.renderer.setStyle(this.indicator, 'top', '0');
    this.renderer.setStyle(this.indicator, 'left', '50%');
    this.renderer.setStyle(this.indicator, 'transform', 'translateX(-50%) translateY(-100%)');
    this.renderer.setStyle(this.indicator, 'width', '40px');
    this.renderer.setStyle(this.indicator, 'height', '40px');
    this.renderer.setStyle(this.indicator, 'display', 'flex');
    this.renderer.setStyle(this.indicator, 'align-items', 'center');
    this.renderer.setStyle(this.indicator, 'justify-content', 'center');
    this.renderer.setStyle(this.indicator, 'transition', 'transform 0.2s ease-out');
    this.renderer.setStyle(this.indicator, 'z-index', '1000');
    this.renderer.setStyle(this.indicator, 'pointer-events', 'none');
    
    // Add spinner icon (uses CSS for animation)
    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'pull-to-refresh-spinner');
    this.renderer.setStyle(spinner, 'width', '24px');
    this.renderer.setStyle(spinner, 'height', '24px');
    this.renderer.setStyle(spinner, 'border', '3px solid rgba(33, 150, 243, 0.2)');
    this.renderer.setStyle(spinner, 'border-top-color', '#2196F3');
    this.renderer.setStyle(spinner, 'border-radius', '50%');
    this.renderer.setStyle(spinner, 'opacity', '0');
    this.renderer.setStyle(spinner, 'transition', 'opacity 0.2s ease-out');
    
    this.renderer.appendChild(this.indicator, spinner);
    this.renderer.appendChild(this.elementRef.nativeElement, this.indicator);
  }

  /**
   * Initialize HammerJS with pan gesture recognizer
   */
  private initHammer(): void {
    this.hammer = new Hammer.Manager(this.elementRef.nativeElement);

    // Add pan recognizer for pull gesture
    const pan = new Hammer.Pan({
      direction: Hammer.DIRECTION_VERTICAL, // Only vertical pulls
      threshold: 10,  // 10px threshold (from CustomHammerConfig)
      pointers: 1     // Single finger
    });

    this.hammer.add(pan);

    // Listen for pan events
    this.hammer.on('panstart', (event: HammerInput) => this.onPanStart(event));
    this.hammer.on('panmove', (event: HammerInput) => this.onPanMove(event));
    this.hammer.on('panend', (event: HammerInput) => this.onPanEnd(event));
  }

  /**
   * Handle pan start - check if at scroll top
   */
  private onPanStart(event: HammerInput): void {
    const element = this.elementRef.nativeElement;
    const scrollTop = element.scrollTop || 0;

    // Only allow pull-to-refresh if at top of scroll
    if (scrollTop === 0 && event.deltaY > 0 && !this.isRefreshing) {
      this.pullDistance = 0;
    }
  }

  /**
   * Handle pan move - update indicator position
   */
  private onPanMove(event: HammerInput): void {
    const element = this.elementRef.nativeElement;
    const scrollTop = element.scrollTop || 0;

    // Only update if at top and pulling down
    if (scrollTop === 0 && event.deltaY > 0 && !this.isRefreshing) {
      // Apply resistance curve (pull gets harder as distance increases)
      const resistance = Math.max(0, 1 - (event.deltaY / (this.MAX_PULL * 2)));
      this.pullDistance = Math.min(event.deltaY * resistance, this.MAX_PULL);

      // Update indicator position
      const translateY = -100 + (this.pullDistance / this.MAX_PULL) * 100;
      this.renderer.setStyle(
        this.indicator,
        'transform',
        `translateX(-50%) translateY(${translateY}%)`
      );

      // Show spinner if past threshold
      const spinner = this.indicator.querySelector('.pull-to-refresh-spinner') as HTMLElement;
      if (spinner) {
        const opacity = this.pullDistance >= this.THRESHOLD ? 1 : this.pullDistance / this.THRESHOLD;
        this.renderer.setStyle(spinner, 'opacity', opacity.toString());
        
        // Rotate spinner based on pull distance
        const rotation = (this.pullDistance / this.MAX_PULL) * 360;
        this.renderer.setStyle(spinner, 'transform', `rotate(${rotation}deg)`);
      }
    }
  }

  /**
   * Handle pan end - trigger refresh if threshold reached
   */
  private onPanEnd(event: HammerInput): void {
    if (this.pullDistance >= this.THRESHOLD && !this.isRefreshing) {
      // Trigger refresh
      this.isRefreshing = true;
      this.refresh.emit();

      // Animate spinner
      const spinner = this.indicator.querySelector('.pull-to-refresh-spinner') as HTMLElement;
      if (spinner) {
        this.renderer.setStyle(spinner, 'animation', 'spin 1s linear infinite');
      }

      // Reset after 2 seconds (or call completeRefresh() manually)
      setTimeout(() => {
        this.completeRefresh();
      }, 2000);
    } else {
      // Reset if threshold not reached
      this.resetIndicator();
    }
  }

  /**
   * Complete refresh and reset indicator
   * Can be called manually from parent component after refresh completes
   */
  public completeRefresh(): void {
    this.isRefreshing = false;
    this.resetIndicator();
  }

  /**
   * Reset indicator to hidden state
   */
  private resetIndicator(): void {
    this.pullDistance = 0;
    this.renderer.setStyle(
      this.indicator,
      'transform',
      'translateX(-50%) translateY(-100%)'
    );

    const spinner = this.indicator.querySelector('.pull-to-refresh-spinner') as HTMLElement;
    if (spinner) {
      this.renderer.setStyle(spinner, 'opacity', '0');
      this.renderer.setStyle(spinner, 'animation', 'none');
    }
  }
}

/**
 * Add spinner animation to global styles (or component styles):
 * 
 * @keyframes spin {
 *   from { transform: rotate(0deg); }
 *   to { transform: rotate(360deg); }
 * }
 */
