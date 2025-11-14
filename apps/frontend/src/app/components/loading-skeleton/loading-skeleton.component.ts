import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * LoadingSkeletonComponent
 *
 * Displays animated skeleton loaders for content loading states.
 * Provides various skeleton types for different content patterns.
 *
 * Features:
 * - Animated shimmer effect
 * - Multiple skeleton types (text, circle, rectangle, card)
 * - Configurable dimensions
 * - Respects prefers-reduced-motion
 *
 * Usage:
 * ```html
 * <!-- Text skeleton -->
 * <app-loading-skeleton type="text" [lines]="3"></app-loading-skeleton>
 *
 * <!-- Circle skeleton (avatar) -->
 * <app-loading-skeleton type="circle" [size]="48"></app-loading-skeleton>
 *
 * <!-- Rectangle skeleton (image) -->
 * <app-loading-skeleton type="rectangle" width="100%" height="200px"></app-loading-skeleton>
 *
 * <!-- Card skeleton (match card) -->
 * <app-loading-skeleton type="card"></app-loading-skeleton>
 * ```
 */
@Component({
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSkeletonComponent {
  /**
   * Skeleton type
   * - text: Multiple lines of text (for paragraphs, titles)
   * - circle: Circular skeleton (for avatars, team logos)
   * - rectangle: Rectangular skeleton (for images, cards)
   * - card: Pre-configured card skeleton (for match cards)
   */
  @Input() type: 'text' | 'circle' | 'rectangle' | 'card' = 'text';

  /**
   * Number of text lines to display (for type="text")
   * Default: 3
   */
  @Input() lines = 3;

  /**
   * Size for circular skeleton (diameter in px)
   * Default: 40px
   */
  @Input() size = 40;

  /**
   * Width for rectangle/custom skeletons
   * Can be px, %, or other CSS units
   * Default: 100%
   */
  @Input() width = '100%';

  /**
   * Height for rectangle/custom skeletons
   * Can be px, %, or other CSS units
   * Default: 100px
   */
  @Input() height = '100px';

  /**
   * Border radius
   * Default: var(--radius-md)
   */
  @Input() borderRadius?: string;

  /**
   * CSS class to apply to skeleton container
   */
  @Input() customClass?: string;

  /**
   * Generate array for *ngFor in template
   */
  get lineArray(): number[] {
    return Array(this.lines).fill(0).map((_, i) => i);
  }

  /**
   * Get inline styles for skeleton element
   */
  getSkeletonStyle(): any {
    const styles: any = {};

    if (this.type === 'circle') {
      styles.width = `${this.size}px`;
      styles.height = `${this.size}px`;
      styles.borderRadius = '50%';
    } else if (this.type === 'rectangle') {
      styles.width = this.width;
      styles.height = this.height;
      if (this.borderRadius) {
        styles.borderRadius = this.borderRadius;
      }
    }

    return styles;
  }
}
