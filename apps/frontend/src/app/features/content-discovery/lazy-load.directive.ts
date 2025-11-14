import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';

/**
 * Lazy load directive using Intersection Observer API
 * Images load when they enter the viewport with a buffer
 */
@Directive({
  selector: '[appLazyLoad]'
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input() appLazyLoad: string; // Image URL to load
  @Input() lazyLoadPlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3C/svg%3E';

  private observer: IntersectionObserver;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit() {
    // Set placeholder initially
    this.el.nativeElement.src = this.lazyLoadPlaceholder;
    this.el.nativeElement.classList.add('lazy-loading');

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      // Fallback: load immediately if IntersectionObserver not supported
      this.loadImage();
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    const options: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin: '200px', // Load 200px before entering viewport
      threshold: 0.01
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage();
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    this.observer.observe(this.el.nativeElement);
  }

  private loadImage() {
    const img = this.el.nativeElement;

    if (this.appLazyLoad) {
      // Create a temporary image to preload
      const tempImg = new Image();

      tempImg.onload = () => {
        img.src = this.appLazyLoad;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
      };

      tempImg.onerror = () => {
        // Keep placeholder on error
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
      };

      tempImg.src = this.appLazyLoad;
    }
  }
}
