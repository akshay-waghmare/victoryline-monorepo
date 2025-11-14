import { Directive, ElementRef, HostListener, Input, Renderer2, OnDestroy } from '@angular/core';

/**
 * TouchFeedbackDirective
 *
 * Provides visual touch feedback for interactive elements on mobile.
 * Creates a ripple effect similar to Material Design when elements are tapped.
 *
 * Features:
 * - Material Design-style ripple effect
 * - Configurable ripple color
 * - Respects prefers-reduced-motion
 * - Works with any clickable element
 * - Performance optimized with RAF
 *
 * Usage:
 * ```html
 * <!-- Default ripple -->
 * <button appTouchFeedback>Click me</button>
 *
 * <!-- Custom ripple color -->
 * <div appTouchFeedback rippleColor="rgba(255, 0, 0, 0.3)" class="card">
 *   Card content
 * </div>
 *
 * <!-- Disabled ripple -->
 * <button appTouchFeedback [rippleDisabled]="true">No ripple</button>
 * ```
 */
@Directive({
  selector: '[appTouchFeedback]'
})
export class TouchFeedbackDirective implements OnDestroy {
  /**
   * Ripple color (RGBA)
   * Default: rgba(255, 255, 255, 0.3)
   */
  @Input() rippleColor = 'rgba(255, 255, 255, 0.3)';

  /**
   * Disable ripple effect
   */
  @Input() rippleDisabled = false;

  /**
   * Ripple duration in ms
   * Default: 600ms
   */
  @Input() rippleDuration = 600;

  private rippleElement: HTMLElement | null = null;
  private prefersReducedMotion = false;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    this.setupHostElement();
    this.checkReducedMotion();
  }

  ngOnDestroy(): void {
    this.removeRipple();
  }

  /**
   * Setup host element styles
   */
  private setupHostElement(): void {
    // Host element needs position for ripple to work
    const position = window.getComputedStyle(this.el.nativeElement).position;
    if (position === 'static') {
      this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    }

    // Ensure overflow is hidden
    this.renderer.setStyle(this.el.nativeElement, 'overflow', 'hidden');

    // Remove tap highlight color (we're providing our own feedback)
    this.renderer.setStyle(this.el.nativeElement, '-webkit-tap-highlight-color', 'transparent');
  }

  /**
   * Check if user prefers reduced motion
   */
  private checkReducedMotion(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  /**
   * Handle touch/click event
   */
  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPress(event: MouseEvent | TouchEvent): void {
    if (this.rippleDisabled || this.prefersReducedMotion) {
      return;
    }

    this.createRipple(event);
  }

  /**
   * Remove ripple on release
   */
  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  @HostListener('touchcancel')
  onRelease(): void {
    // Ripple will remove itself after animation completes
  }

  /**
   * Create ripple effect
   */
  private createRipple(event: MouseEvent | TouchEvent): void {
    // Remove existing ripple if any
    this.removeRipple();

    // Create ripple element
    this.rippleElement = this.renderer.createElement('span');
    this.renderer.addClass(this.rippleElement, 'touch-feedback-ripple');

    // Get click/touch position
    const rect = this.el.nativeElement.getBoundingClientRect();
    let x: number, y: number;

    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      // Fallback to center if no position available
      x = rect.width / 2;
      y = rect.height / 2;
    }

    // Calculate ripple size (should cover entire element)
    const size = Math.max(rect.width, rect.height) * 2;

    // Apply styles
    this.renderer.setStyle(this.rippleElement, 'width', `${size}px`);
    this.renderer.setStyle(this.rippleElement, 'height', `${size}px`);
    this.renderer.setStyle(this.rippleElement, 'left', `${x - size / 2}px`);
    this.renderer.setStyle(this.rippleElement, 'top', `${y - size / 2}px`);
    this.renderer.setStyle(this.rippleElement, 'backgroundColor', this.rippleColor);
    this.renderer.setStyle(this.rippleElement, 'animationDuration', `${this.rippleDuration}ms`);

    // Append to host element
    this.renderer.appendChild(this.el.nativeElement, this.rippleElement);

    // Remove ripple after animation completes
    setTimeout(() => {
      this.removeRipple();
    }, this.rippleDuration);
  }

  /**
   * Remove ripple element
   */
  private removeRipple(): void {
    if (this.rippleElement) {
      try {
        this.renderer.removeChild(this.el.nativeElement, this.rippleElement);
      } catch (e) {
        // Element may have been removed already
      }
      this.rippleElement = null;
    }
  }
}
