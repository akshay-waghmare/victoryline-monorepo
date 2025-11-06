/**
 * Skeleton Card Component
 * Purpose: Loading placeholder for match cards
 * Created: 2025-11-06
 */

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  templateUrl: './skeleton-card.component.html',
  styleUrls: ['./skeleton-card.component.css']
})
export class SkeletonCardComponent {
  /**
   * Number of skeleton cards to display
   */
  @Input() count: number = 1;
  
  /**
   * Card variant (matches MatchCardComponent variants)
   */
  @Input() variant: 'default' | 'compact' | 'detailed' = 'default';
  
  /**
   * Get array for ngFor iteration
   */
  get skeletonArray(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}
