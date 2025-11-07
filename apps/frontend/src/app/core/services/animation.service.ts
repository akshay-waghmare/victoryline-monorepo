/**
 * Animation Service
 * 
 * Manages animation state, performance monitoring, and conflict prevention.
 * Tracks currently animating elements and monitors frame rates to ensure smooth performance.
 * 
 * Features:
 * - Animation state tracking (prevents concurrent animations on same element)
 * - FPS monitoring and performance metrics
 * - Reduced motion detection
 * - Animation queueing and coordination
 * - Performance-based animation throttling
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AnimationState,
  AnimationTrigger,
  AnimationPerformanceMetrics,
  AnimationPreferences
} from '../models/animation.models';

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  // Performance monitoring constants
  private readonly FPS_SAMPLE_SIZE = 60; // frames to average
  private readonly MIN_FPS_THRESHOLD = 30; // minimum acceptable FPS
  private readonly MAX_CONCURRENT_ANIMATIONS = 10;

  // Internal state
  private animationState: AnimationState = {
    animatingElements: new Set<string>(),
    frameTimes: [],
    averageFPS: 60,
    reducedMotion: false,
    animationsEnabled: true,
    lastFrameTime: performance.now(),
    frameCount: 0
  };

  private activeAnimations: Map<string, AnimationTrigger> = new Map();
  private animationQueue: AnimationTrigger[] = [];

  // Observables
  private performanceMetricsSubject: BehaviorSubject<AnimationPerformanceMetrics>;
  public readonly performanceMetrics$: Observable<AnimationPerformanceMetrics>;

  private animationsEnabledSubject: BehaviorSubject<boolean>;
  public readonly animationsEnabled$: Observable<boolean>;

  constructor() {
    const initialMetrics: AnimationPerformanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      droppedFrames: 0,
      totalAnimations: 0,
      activeAnimations: 0
    };

    this.performanceMetricsSubject = new BehaviorSubject<AnimationPerformanceMetrics>(initialMetrics);
    this.performanceMetrics$ = this.performanceMetricsSubject.asObservable();

    this.animationsEnabledSubject = new BehaviorSubject<boolean>(true);
    this.animationsEnabled$ = this.animationsEnabledSubject.asObservable();

    this.initialize();
  }

  /**
   * Initialize animation service
   */
  private initialize(): void {
    // Detect reduced motion preference
    this.animationState.reducedMotion = this.detectReducedMotion();

    // Set up reduced motion listener
    this.setupReducedMotionListener();

    // Start FPS monitoring
    this.startFPSMonitoring();

    console.log('AnimationService initialized');
  }

  /**
   * Check if element is currently animating
   * @param elementId Unique identifier for the element
   */
  public isAnimating(elementId: string): boolean {
    return this.animationState.animatingElements.has(elementId);
  }

  /**
   * Register an animation start
   * @param elementId Unique identifier for the element
   * @param duration Animation duration in milliseconds
   * @returns false if element is already animating or max concurrent reached
   */
  public startAnimation(elementId: string, duration: number = 300): boolean {
    // Check if already animating
    if (this.isAnimating(elementId)) {
      console.warn(`Element ${elementId} is already animating`);
      return false;
    }

    // Check concurrent animation limit
    if (this.animationState.animatingElements.size >= this.MAX_CONCURRENT_ANIMATIONS) {
      console.warn(`Max concurrent animations reached (${this.MAX_CONCURRENT_ANIMATIONS})`);
      return false;
    }

    // Check if animations are disabled
    if (!this.animationState.animationsEnabled || this.animationState.reducedMotion) {
      return false;
    }

    // Register animation
    this.animationState.animatingElements.add(elementId);
    
    const trigger: AnimationTrigger = {
      name: elementId,
      element: document.getElementById(elementId) || document.body,
      state: 'animating',
      startTime: performance.now(),
      duration: duration
    };
    
    this.activeAnimations.set(elementId, trigger);

    // Auto-complete after duration
    setTimeout(() => {
      this.completeAnimation(elementId);
    }, duration);

    this.updateMetrics();
    return true;
  }

  /**
   * Register an animation completion
   * @param elementId Unique identifier for the element
   */
  public completeAnimation(elementId: string): void {
    if (!this.isAnimating(elementId)) {
      return;
    }

    // Remove from active set
    this.animationState.animatingElements.delete(elementId);
    
    // Update trigger state
    const trigger = this.activeAnimations.get(elementId);
    if (trigger) {
      trigger.state = 'complete';
      this.activeAnimations.delete(elementId);
    }

    this.updateMetrics();

    // Process queue if available
    this.processQueue();
  }

  /**
   * Queue an animation if max concurrent limit reached
   * @param trigger Animation trigger to queue
   */
  public queueAnimation(trigger: AnimationTrigger): void {
    this.animationQueue.push(trigger);
  }

  /**
   * Process queued animations
   */
  private processQueue(): void {
    if (this.animationQueue.length === 0) {
      return;
    }

    // Try to start next queued animation
    if (this.animationState.animatingElements.size < this.MAX_CONCURRENT_ANIMATIONS) {
      const nextTrigger = this.animationQueue.shift();
      if (nextTrigger) {
        this.startAnimation(nextTrigger.name, nextTrigger.duration);
      }
    }
  }

  /**
   * Get current FPS
   */
  public getCurrentFPS(): number {
    return this.animationState.averageFPS;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): AnimationPerformanceMetrics {
    return this.performanceMetricsSubject.value;
  }

  /**
   * Check if reduced motion is preferred
   */
  public prefersReducedMotion(): boolean {
    return this.animationState.reducedMotion;
  }

  /**
   * Enable or disable animations globally
   * @param enabled Whether animations should be enabled
   */
  public setAnimationsEnabled(enabled: boolean): void {
    this.animationState.animationsEnabled = enabled;
    this.animationsEnabledSubject.next(enabled);

    if (!enabled) {
      // Cancel all active animations
      this.cancelAllAnimations();
    }
  }

  /**
   * Cancel all active animations
   */
  public cancelAllAnimations(): void {
    this.animationState.animatingElements.clear();
    this.activeAnimations.clear();
    this.animationQueue = [];
    this.updateMetrics();
  }

  /**
   * Get currently animating elements
   */
  public getAnimatingElements(): string[] {
    return Array.from(this.animationState.animatingElements);
  }

  /**
   * Check if animations should be throttled based on performance
   */
  public shouldThrottleAnimations(): boolean {
    return this.animationState.averageFPS < this.MIN_FPS_THRESHOLD;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotion(): boolean {
    if (!window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Set up listener for reduced motion preference changes
   */
  private setupReducedMotionListener(): void {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => {
        this.animationState.reducedMotion = e.matches;
        
        if (e.matches) {
          // Disable animations if reduced motion is preferred
          this.setAnimationsEnabled(false);
        }

        console.log(`Reduced motion preference changed: ${e.matches}`);
      });
    }
  }

  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring(): void {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.animationState.lastFrameTime;
      
      if (delta > 0) {
        const fps = 1000 / delta;
        this.animationState.frameTimes.push(fps);

        // Keep only last N samples
        if (this.animationState.frameTimes.length > this.FPS_SAMPLE_SIZE) {
          this.animationState.frameTimes.shift();
        }

        // Calculate average
        const sum = this.animationState.frameTimes.reduce((a, b) => a + b, 0);
        this.animationState.averageFPS = Math.round(sum / this.animationState.frameTimes.length);
      }

      this.animationState.lastFrameTime = now;
      this.animationState.frameCount++;

      // Update metrics every 60 frames (~1 second at 60fps)
      if (this.animationState.frameCount % 60 === 0) {
        this.updateMetrics();
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const frameTimes = this.animationState.frameTimes;
    
    if (frameTimes.length === 0) {
      return;
    }

    const minFPS = Math.min(...frameTimes);
    const maxFPS = Math.max(...frameTimes);
    const droppedFrames = frameTimes.filter(fps => fps < 30).length;

    const metrics: AnimationPerformanceMetrics = {
      averageFPS: this.animationState.averageFPS,
      minFPS: Math.round(minFPS),
      maxFPS: Math.round(maxFPS),
      droppedFrames: droppedFrames,
      totalAnimations: this.animationState.frameCount,
      activeAnimations: this.animationState.animatingElements.size
    };

    this.performanceMetricsSubject.next(metrics);

    // Auto-throttle if performance is poor
    if (this.shouldThrottleAnimations() && this.animationState.animationsEnabled) {
      console.warn(`Low FPS detected (${this.animationState.averageFPS}), consider throttling animations`);
    }
  }
}
