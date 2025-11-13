import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

/**
 * T070: ContextMenuComponent
 * 
 * Mobile-friendly context menu triggered by long-press on match cards.
 * Provides quick actions: share, favorite, open in new tab.
 * 
 * Features:
 * - Overlay menu with backdrop
 * - 44x44px touch targets (WCAG AAA)
 * - Slide-up animation
 * - Respects prefers-reduced-motion
 * - Click outside to close
 * 
 * Usage:
 * ```html
 * <app-context-menu
 *   [visible]="showMenu"
 *   [position]="{ x: 100, y: 200 }"
 *   [matchId]="match.id"
 *   [matchTitle]="match.title"
 *   (share)="onShare($event)"
 *   (favorite)="onFavorite($event)"
 *   (openInNewTab)="onOpenInNewTab($event)"
 *   (close)="onCloseMenu()"
 * ></app-context-menu>
 * ```
 */
@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent implements OnInit {
  /**
   * Control menu visibility
   */
  @Input() visible: boolean = false;

  /**
   * Menu position (x, y coordinates)
   */
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };

  /**
   * Match ID for actions
   */
  @Input() matchId: string = '';

  /**
   * Match title for sharing
   */
  @Input() matchTitle: string = '';

  /**
   * Match URL for sharing/opening
   */
  @Input() matchUrl: string = '';

  /**
   * Event: Share match
   */
  @Output() share = new EventEmitter<string>();

  /**
   * Event: Toggle favorite
   */
  @Output() favorite = new EventEmitter<string>();

  /**
   * Event: Open in new tab
   */
  @Output() openInNewTab = new EventEmitter<string>();

  /**
   * Event: Close menu
   */
  @Output() close = new EventEmitter<void>();

  constructor() { }

  ngOnInit() {
  }

  /**
   * Handle share action
   */
  onShare(): void {
    this.share.emit(this.matchId);
    this.close.emit();
  }

  /**
   * Handle favorite action
   */
  onFavorite(): void {
    this.favorite.emit(this.matchId);
    this.close.emit();
  }

  /**
   * Handle open in new tab action
   */
  onOpenInNewTab(): void {
    this.openInNewTab.emit(this.matchId);
    this.close.emit();
  }

  /**
   * Handle backdrop click (close menu)
   */
  onBackdropClick(): void {
    this.close.emit();
  }

  /**
   * Prevent backdrop click from propagating to menu
   */
  onMenuClick(event: Event): void {
    event.stopPropagation();
  }
}
