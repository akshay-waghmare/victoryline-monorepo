import { Component, Input, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

/**
 * LazyImageComponent
 *
 * Lazy-loads images using Intersection Observer API with srcset support
 * for responsive images and error fallbacks.
 *
 * Features:
 * - Lazy loading with Intersection Observer
 * - Responsive images with srcset support
 * - Error handling with fallback images
 * - Loading placeholder
 * - Accessibility (alt text required)
 *
 * Usage:
 * ```html
 * <app-lazy-image
 *   src="team-logo.png"
 *   srcset="team-logo-1x.png 1x, team-logo-2x.png 2x, team-logo-3x.png 3x"
 *   alt="Team Logo"
 *   fallback="placeholder.png"
 *   [width]="80"
 *   [height]="80">
 * </app-lazy-image>
 * ```
 */
@Component({
  selector: 'app-lazy-image',
  templateUrl: './lazy-image.component.html',
  styleUrls: ['./lazy-image.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LazyImageComponent implements OnInit {
  @ViewChild('imageElement') imageElement: ElementRef<HTMLImageElement>;

  /**
   * Image source URL
   */
  @Input() src: string;

  /**
   * Responsive image sources (1x, 2x, 3x)
   * Example: "image-1x.png 1x, image-2x.png 2x, image-3x.png 3x"
   */
  @Input() srcset?: string;

  /**
   * Alternative text for accessibility (required)
   */
  @Input() alt: string;

  /**
   * Fallback image URL if main image fails to load
   */
  @Input() fallback?: string;

  /**
   * Image width (for aspect ratio preservation)
   */
  @Input() width?: number;

  /**
   * Image height (for aspect ratio preservation)
   */
  @Input() height?: number;

  /**
   * CSS class to apply to image element
   */
  @Input() imageClass?: string;

  /**
   * Root margin for Intersection Observer (when to start loading)
   * Default: 200px (start loading 200px before image enters viewport)
   */
  @Input() rootMargin = '200px';

  /**
   * Threshold for Intersection Observer
   * Default: 0.01 (trigger when 1% of image is visible)
   */
  @Input() threshold = 0.01;

  /**
   * Current image state
   */
  imageState: 'loading' | 'loaded' | 'error' = 'loading';

  /**
   * Loaded image URL (may be fallback if primary failed)
   */
  loadedSrc = '';

  private observer: IntersectionObserver;

  constructor(
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.initIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Initialize Intersection Observer for lazy loading
   */
  private initIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without Intersection Observer
      this.loadImage();
      return;
    }

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: this.rootMargin,
      threshold: this.threshold
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage();
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    this.observer.observe(this.elementRef.nativeElement);
  }

  /**
   * Load the image
   */
  private loadImage(): void {
    const img = new Image();

    img.onload = () => {
      this.loadedSrc = this.src;
      this.imageState = 'loaded';
      this.cdr.markForCheck();
    };

    img.onerror = () => {
      if (this.fallback && this.loadedSrc !== this.fallback) {
        // Try loading fallback image
        this.loadFallbackImage();
      } else {
        this.imageState = 'error';
        this.cdr.markForCheck();
      }
    };

    img.src = this.src;
    if (this.srcset) {
      img.srcset = this.srcset;
    }
  }

  /**
   * Load fallback image
   */
  private loadFallbackImage(): void {
    const img = new Image();

    img.onload = () => {
      this.loadedSrc = this.fallback;
      this.imageState = 'loaded';
      this.cdr.markForCheck();
    };

    img.onerror = () => {
      this.imageState = 'error';
      this.cdr.markForCheck();
    };

    img.src = this.fallback;
  }

  /**
   * Get computed aspect ratio for CSS
   */
  get aspectRatio(): number | null {
    if (this.width && this.height) {
      return this.width / this.height;
    }
    return null;
  }
}
