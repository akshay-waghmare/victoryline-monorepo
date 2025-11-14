/**
 * Shared Angular Animation Definitions
 *
 * Provides reusable animation triggers for components throughout the app.
 * These animations work alongside CSS keyframe animations for comprehensive motion design.
 *
 * Usage:
 * ```typescript
 * @Component({
 *   selector: 'app-match-card',
 *   animations: [fadeIn, slideInFromRight]
 * })
 * ```
 */

import {
  trigger,
  state,
  style,
  transition,
  animate,
  keyframes,
  query,
  AnimationTriggerMetadata
} from '@angular/animations';

/**
 * Fade In Animation
 * Used for: Component entrance, content loading
 * Duration: 300ms
 */
export const fadeIn: AnimationTriggerMetadata = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-in', style({ opacity: 1 }))
  ])
]);

/**
 * Fade Out Animation
 * Used for: Component exit, content hiding
 * Duration: 200ms
 */
export const fadeOut: AnimationTriggerMetadata = trigger('fadeOut', [
  transition(':leave', [
    animate('200ms ease-out', style({ opacity: 0 }))
  ])
]);

/**
 * Fade In/Out Animation
 * Used for: Dynamic content, conditional rendering
 * Duration: 300ms in, 200ms out
 */
export const fade: AnimationTriggerMetadata = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-in', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('200ms ease-out', style({ opacity: 0 }))
  ])
]);

/**
 * Slide In From Right Animation
 * Used for: Mobile menu, side panels, notifications
 * Duration: 300ms
 */
export const slideInFromRight: AnimationTriggerMetadata = trigger('slideInFromRight', [
  transition(':enter', [
    style({ transform: 'translateX(100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(0)', opacity: 1 })
    )
  ]),
  transition(':leave', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(100%)', opacity: 0 })
    )
  ])
]);

/**
 * Slide In From Left Animation
 * Used for: Sidebar, navigation drawers
 * Duration: 300ms
 */
export const slideInFromLeft: AnimationTriggerMetadata = trigger('slideInFromLeft', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(0)', opacity: 1 })
    )
  ]),
  transition(':leave', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(-100%)', opacity: 0 })
    )
  ])
]);

/**
 * Slide Up Animation
 * Used for: Bottom sheets, snackbars, tooltips
 * Duration: 300ms
 */
export const slideUp: AnimationTriggerMetadata = trigger('slideUp', [
  transition(':enter', [
    style({ transform: 'translateY(100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateY(0)', opacity: 1 })
    )
  ]),
  transition(':leave', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateY(100%)', opacity: 0 })
    )
  ])
]);

/**
 * Slide Down Animation
 * Used for: Dropdowns, expanding sections, alerts
 * Duration: 300ms
 */
export const slideDown: AnimationTriggerMetadata = trigger('slideDown', [
  transition(':enter', [
    style({ transform: 'translateY(-100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateY(0)', opacity: 1 })
    )
  ]),
  transition(':leave', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateY(-100%)', opacity: 0 })
    )
  ])
]);

/**
 * Scale In Animation
 * Used for: Modals, dialogs, popovers
 * Duration: 250ms
 *
 * Starts at 95% scale for subtle entrance
 */
export const scaleIn: AnimationTriggerMetadata = trigger('scaleIn', [
  transition(':enter', [
    style({ transform: 'scale(0.95)', opacity: 0 }),
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'scale(1)', opacity: 1 })
    )
  ]),
  transition(':leave', [
    animate('200ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'scale(0.95)', opacity: 0 })
    )
  ])
]);

/**
 * Score Update Animation
 * Used for: Live match scores, run counters, wicket updates
 * Duration: 400ms
 *
 * Features:
 * - Scale pulse (1 → 1.1 → 1)
 * - Color flash to success color
 * - Smooth easing
 */
export const scoreUpdate: AnimationTriggerMetadata = trigger('scoreUpdate', [
  transition('* => *', [
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
      style({ transform: 'scale(1)', color: 'inherit', offset: 0 }),
      style({ transform: 'scale(1.1)', color: '#4caf50', offset: 0.3 }),
      style({ transform: 'scale(1.05)', color: '#4caf50', offset: 0.6 }),
      style({ transform: 'scale(1)', color: 'inherit', offset: 1 })
    ]))
  ])
]);

/**
 * Pulse Animation (State-based)
 * Used for: Live indicators, loading states, attention grabbers
 * Duration: 1500ms (repeats via CSS)
 *
 * States:
 * - inactive: Normal state
 * - active: Pulsing state
 *
 * Note: For continuous pulsing, use CSS animation class .animate-pulse
 */
export const pulse: AnimationTriggerMetadata = trigger('pulse', [
  state('inactive', style({ opacity: 1 })),
  state('active', style({ opacity: 0.6 })),
  transition('inactive <=> active', [
    animate('1500ms ease-in-out')
  ])
]);

/**
 * Shake Animation (Error state)
 * Used for: Form errors, invalid inputs, failed actions
 * Duration: 500ms
 */
export const shake: AnimationTriggerMetadata = trigger('shake', [
  transition('* => error', [
    animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
      style({ transform: 'translateX(0)', offset: 0 }),
      style({ transform: 'translateX(-10px)', offset: 0.2 }),
      style({ transform: 'translateX(10px)', offset: 0.4 }),
      style({ transform: 'translateX(-10px)', offset: 0.6 }),
      style({ transform: 'translateX(10px)', offset: 0.8 }),
      style({ transform: 'translateX(0)', offset: 1 })
    ]))
  ])
]);

/**
 * Bounce Animation
 * Used for: Notifications, badge updates, new content indicators
 * Duration: 600ms
 */
export const bounce: AnimationTriggerMetadata = trigger('bounce', [
  transition('* => *', [
    animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
      style({ transform: 'translateY(0)', offset: 0 }),
      style({ transform: 'translateY(-20px)', offset: 0.4 }),
      style({ transform: 'translateY(-10px)', offset: 0.6 }),
      style({ transform: 'translateY(0)', offset: 1 })
    ]))
  ])
]);

/**
 * List Animation (Stagger)
 * Used for: List items, search results, match cards
 * Duration: 200ms per item with 50ms stagger
 *
 * Usage:
 * ```html
 * <div *ngFor="let item of items" @listItem>
 * ```
 */
export const listItem: AnimationTriggerMetadata = trigger('listItem', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('200ms {{ delay }}ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'translateY(0)' })
    )
  ], { params: { delay: 0 } }),
  transition(':leave', [
    animate('150ms ease-out',
      style({ opacity: 0, transform: 'translateY(10px)' })
    )
  ])
]);

/**
 * Expand/Collapse Animation
 * Used for: Accordion sections, expandable cards, details panels
 * Duration: 300ms
 *
 * States:
 * - collapsed: Height 0, hidden
 * - expanded: Full height, visible
 */
export const expandCollapse: AnimationTriggerMetadata = trigger('expandCollapse', [
  state('collapsed', style({
    height: '0',
    overflow: 'hidden',
    opacity: 0
  })),
  state('expanded', style({
    height: '*',
    overflow: 'visible',
    opacity: 1
  })),
  transition('collapsed <=> expanded', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
  ])
]);

/**
 * Rotate Animation
 * Used for: Loading spinners, refresh buttons, dropdown chevrons
 * Duration: 300ms
 *
 * States:
 * - default: 0deg rotation
 * - rotated: 180deg rotation
 */
export const rotate: AnimationTriggerMetadata = trigger('rotate', [
  state('default', style({ transform: 'rotate(0deg)' })),
  state('rotated', style({ transform: 'rotate(180deg)' })),
  transition('default <=> rotated', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
  ])
]);

/* ============================================================================
   ROUTE TRANSITION ANIMATIONS (T084)
   ============================================================================ */

/**
 * Route Transition Animation
 * Provides smooth fade + slide transitions between pages
 * Used in: app.component.html with [@routeAnimations]="getRouteAnimationData()"
 * Duration: 300ms
 */
export const routeAnimations: AnimationTriggerMetadata = trigger('routeAnimations', [
  transition('* <=> *', [
    // Query for both leaving and entering routes
    // Optional: true allows animation to work even if element doesn't exist
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%',
        opacity: 0
      })
    ], { optional: true }),

    // Fade out the leaving page
    query(':leave', [
      animate('200ms ease-out', style({ opacity: 0 }))
    ], { optional: true }),

    // Fade in the entering page with slight slide up
    query(':enter', [
      style({
        opacity: 0,
        transform: 'translateY(10px)'
      }),
      animate('300ms 100ms ease-in', style({
        opacity: 1,
        transform: 'translateY(0)'
      }))
    ], { optional: true })
  ])
]);

/**
 * Fade Transition (simpler route animation)
 * Pure fade without slide - faster and smoother for quick navigation
 * Duration: 250ms
 */
export const fadeTransition: AnimationTriggerMetadata = trigger('fadeTransition', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%'
      })
    ], { optional: true }),

    query(':leave', [
      animate('150ms ease-out', style({ opacity: 0 }))
    ], { optional: true }),

    query(':enter', [
      style({ opacity: 0 }),
      animate('250ms ease-in', style({ opacity: 1 }))
    ], { optional: true })
  ])
]);

/**
 * Export all animations as array for easy component imports
 *
 * Usage:
 * ```typescript
 * @Component({
 *   animations: APP_ANIMATIONS
 * })
 * ```
 */
export const APP_ANIMATIONS: AnimationTriggerMetadata[] = [
  fadeIn,
  fadeOut,
  fade,
  slideInFromRight,
  slideInFromLeft,
  slideUp,
  slideDown,
  scaleIn,
  scoreUpdate,
  pulse,
  shake,
  bounce,
  listItem,
  expandCollapse,
  rotate,
  routeAnimations,
  fadeTransition
];
