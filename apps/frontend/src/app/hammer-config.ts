import { Injectable } from '@angular/core';
import { HammerGestureConfig } from '@angular/platform-browser';

/**
 * Custom HammerJS configuration for mobile gestures
 *
 * Configures touch gestures for mobile-first interactions:
 * - Swipe gestures for navigation (cards, tabs, modals)
 * - Pan gestures for pull-to-refresh
 * - Press gestures for context menus
 * - Tap gestures optimized for mobile
 *
 * Gesture thresholds:
 * - Swipe: 50px minimum distance, 0.3 max velocity
 * - Pan: 10px threshold for pull-to-refresh
 * - Press: 251ms hold time
 * - Tap: 250ms max time, 2px position tolerance
 */
@Injectable()
export class CustomHammerConfig extends HammerGestureConfig {
  /**
   * Override default HammerJS options
   */
  overrides = <any>{
    // Swipe gesture configuration
    // Used for: card swiping, tab navigation, dismissible modals
    'swipe': {
      direction: 6, // DIRECTION_HORIZONTAL (left/right) - Hammer.DIRECTION_HORIZONTAL
      threshold: 50, // Minimum distance in px before swipe is recognized
      velocity: 0.3  // Minimum velocity for swipe (lower = more sensitive)
    },

    // Pan gesture configuration
    // Used for: pull-to-refresh, draggable elements, custom scrolling
    'pan': {
      direction: 6, // DIRECTION_ALL - allow all directions
      threshold: 10, // Start recognizing after 10px movement
      pointers: 1    // Single finger only
    },

    // Press gesture configuration
    // Used for: long-press context menus, hold actions
    'press': {
      time: 251,    // Hold time in ms (251ms to avoid conflict with tap)
      threshold: 9   // Max movement in px while pressing
    },

    // Tap gesture configuration
    // Used for: all tap interactions
    'tap': {
      time: 250,       // Max time for tap (ms)
      threshold: 2,    // Max movement in px
      posThreshold: 10 // Max distance from first tap for double tap
    },

    // Pinch gesture configuration (disabled by default)
    // Enable in components that need zoom functionality
    'pinch': {
      enable: false
    },

    // Rotate gesture configuration (disabled by default)
    'rotate': {
      enable: false
    }
  };

  /**
   * Build recognizer for custom event handling
   *
   * This method is called by Angular to create the Hammer instance.
   * We can override it to add custom recognizers or modify behavior.
   */
  buildHammer(element: HTMLElement): any {
    const mc = new (<any>window).Hammer(element, {
      // Touch action prevents browser default behavior
      // 'auto' allows browser to handle zoom, pan
      // 'pan-y' allows vertical scrolling but prevents horizontal
      touchAction: 'auto',

      // Input class for touch events
      // Prioritizes touch over mouse for better mobile performance
      inputClass: (<any>window).Hammer.TouchInput,

      // CSS properties to prevent text selection during gestures
      cssProps: {
        userSelect: 'text' // Allow text selection (override HammerJS default)
      }
    });

    // Enable swipe horizontal (left/right)
    // This is essential for mobile navigation patterns
    mc.get('swipe').set({
      direction: 6 // Hammer.DIRECTION_HORIZONTAL
    });

    // Enable pan for pull-to-refresh
    mc.get('pan').set({
      direction: 6 // Hammer.DIRECTION_ALL
    });

    // Disable pinch and rotate by default
    // Components can re-enable if needed
    mc.get('pinch').set({ enable: false });
    mc.get('rotate').set({ enable: false });

    return mc;
  }
}
