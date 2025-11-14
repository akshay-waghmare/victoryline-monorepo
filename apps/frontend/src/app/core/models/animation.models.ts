/**
 * Animation State Models
 *
 * TypeScript interfaces for animation tracking, performance monitoring, and configuration.
 * Used by AnimationService to manage animation state and prevent conflicts.
 */

/**
 * Animation state tracker to prevent conflicts and monitor performance
 */
export interface AnimationState {
  // Currently animating elements (by ID or selector)
  animatingElements: Set<string>;

  // Frame timing for performance monitoring
  frameTimes: number[];
  averageFPS: number;

  // Animation preferences
  reducedMotion: boolean;
  animationsEnabled: boolean;

  // Performance metrics
  lastFrameTime: number;
  frameCount: number;
}

/**
 * Animation configuration for score updates
 */
export interface ScoreUpdateAnimation {
  element: HTMLElement;
  oldValue: number;
  newValue: number;
  duration: number; // milliseconds
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

/**
 * Match status animation configuration
 */
export interface MatchStatusAnimation {
  fromStatus: MatchStatus;
  toStatus: MatchStatus;
  triggerPulse: boolean;
  triggerColorChange: boolean;
}

/**
 * Match status type
 */
export type MatchStatus = 'live' | 'upcoming' | 'completed' | 'delayed' | 'abandoned';

/**
 * Animation trigger metadata
 */
export interface AnimationTrigger {
  name: string;
  element: HTMLElement;
  state: 'idle' | 'animating' | 'complete';
  startTime: number;
  duration: number;
}

/**
 * Performance metrics for animations
 */
export interface AnimationPerformanceMetrics {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  droppedFrames: number;
  totalAnimations: number;
  activeAnimations: number;
}

/**
 * Animation preference settings
 */
export interface AnimationPreferences {
  enabled: boolean;
  reducedMotion: boolean;
  maxConcurrentAnimations: number;
  fpsThreshold: number; // Minimum FPS before disabling animations
}

/**
 * Skeleton loader configuration
 */
export interface SkeletonConfig {
  width: string;
  height: string;
  count: number;
  duration: number; // shimmer animation duration in ms
  shape: 'rectangle' | 'circle' | 'text';
}

/**
 * Chart animation configuration
 */
export interface ChartAnimationConfig {
  duration: number; // milliseconds
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  animateScale: boolean;
  animateRotate: boolean;
}
