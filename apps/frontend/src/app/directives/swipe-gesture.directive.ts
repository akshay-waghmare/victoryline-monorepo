import { Directive, ElementRef, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import * as Hammer from 'hammerjs';

// Type definitions for HammerJS
type HammerManager = typeof Hammer;

/**
 * SwipeGestureDirective
 *
 * Enables swipe left/right gestures using HammerJS.
 * Commonly used for tab navigation, card swiping, and dismissible content.
 *
 * Features:
 * - Swipe left/right detection with configurable threshold
 * - Velocity-based gesture recognition
 * - Compatible with scroll containers
 * - Touch-friendly (50px minimum swipe distance)
 *
 * Usage:
 * ```html
 * <div appSwipeGesture
 *      (swipeLeft)="onSwipeLeft()"
 *      (swipeRight)="onSwipeRight()">
 *   Swipeable content
 * </div>
 * ```
 *
 * Thresholds (from CustomHammerConfig):
 * - Minimum distance: 50px
 * - Minimum velocity: 0.3
 * - Direction: HORIZONTAL (left/right only)
 */
@Directive({
  selector: '[appSwipeGesture]'
})
export class SwipeGestureDirective implements OnInit, OnDestroy {
  /**
   * Emitted when user swipes left
   * @event
   */
  @Output() swipeLeft = new EventEmitter<void>();

  /**
   * Emitted when user swipes right
   * @event
   */
  @Output() swipeRight = new EventEmitter<void>();

  /**
   * HammerJS instance for gesture management
   */
  private hammer: any;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.initHammer();
  }

  ngOnDestroy(): void {
    if (this.hammer) {
      this.hammer.destroy();
    }
  }

  /**
   * Initialize HammerJS with swipe gesture recognizer
   */
  private initHammer(): void {
    // Create HammerJS instance on element
    this.hammer = new Hammer.Manager(this.elementRef.nativeElement);

    // Add swipe recognizer with custom configuration
    const swipe = new Hammer.Swipe({
      direction: Hammer.DIRECTION_HORIZONTAL, // Only left/right swipes
      threshold: 50,  // 50px minimum distance (from CustomHammerConfig)
      velocity: 0.3   // Minimum velocity 0.3 (from CustomHammerConfig)
    });

    this.hammer.add(swipe);

    // Listen for swipe events
    this.hammer.on('swipeleft', () => {
      this.swipeLeft.emit();
    });

    this.hammer.on('swiperight', () => {
      this.swipeRight.emit();
    });
  }
}
