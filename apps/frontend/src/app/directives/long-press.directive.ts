import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

// Type alias for HammerJS types
type HammerManager = any;
type HammerInput = any;

/**
 * T069: LongPressDirective
 * 
 * Detects long-press gestures (500ms hold) using HammerJS.
 * Used for triggering context menus on match cards.
 * 
 * Features:
 * - 500ms press duration threshold
 * - Emits press event with coordinates
 * - Works with HammerJS press recognizer
 * - Cancels on movement (>10px)
 * 
 * Usage:
 * ```html
 * <div appLongPress (longPress)="onLongPress($event)">
 *   Hold me for 500ms
 * </div>
 * ```
 */
@Directive({
  selector: '[appLongPress]'
})
export class LongPressDirective {
  /**
   * Emits when long-press detected (500ms)
   * Event contains center: { x, y } coordinates
   */
  @Output() longPress = new EventEmitter<any>();

  private hammerManager: HammerManager | null = null;

  constructor(private el: ElementRef) {
    this.setupHammer();
  }

  /**
   * Setup HammerJS press recognizer
   */
  private setupHammer(): void {
    if (typeof window !== 'undefined' && (window as any).Hammer) {
      const Hammer = (window as any).Hammer;
      
      // Create HammerJS manager
      this.hammerManager = new Hammer.Manager(this.el.nativeElement);
      
      // Configure press recognizer (500ms hold)
      const press = new Hammer.Press({
        time: 500, // 500ms hold time
        threshold: 10 // Allow 10px movement before cancelling
      });
      
      this.hammerManager.add(press);
      
      // Listen for press event
      this.hammerManager.on('press', (event: HammerInput) => {
        this.onPress(event);
      });
    }
  }

  /**
   * Handle press event
   */
  private onPress(event: HammerInput): void {
    // Prevent default context menu on long-press
    event.preventDefault();
    
    // Emit long-press event with coordinates
    this.longPress.emit({
      center: event.center,
      target: event.target
    });
    
    console.log('[LongPress] Detected at:', event.center);
  }

  /**
   * Cleanup on directive destroy
   */
  ngOnDestroy(): void {
    if (this.hammerManager) {
      this.hammerManager.destroy();
      this.hammerManager = null;
    }
  }
}
