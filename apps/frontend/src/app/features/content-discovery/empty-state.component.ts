import { Component, Input } from '@angular/core';

/**
 * Empty state component for various scenarios
 * Shows friendly messages when no content is available
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <div class="empty-icon" [ngSwitch]="type">
        <svg *ngSwitchCase="'no-results'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <svg *ngSwitchCase="'no-history'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <svg *ngSwitchCase="'no-recommendations'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <svg *ngSwitchDefault width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="empty-title">{{title}}</h3>
      <p class="empty-message">{{message}}</p>
      <button *ngIf="actionLabel" class="empty-action" (click)="onAction()">
        {{actionLabel}}
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 200px;
      animation: fadeIn 0.3s ease-out;
    }

    .empty-icon {
      color: #9ca3af;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-icon svg {
      width: 64px;
      height: 64px;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #4b5563;
      margin: 0 0 8px 0;
    }

    .empty-message {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 24px 0;
      max-width: 400px;
    }

    .empty-action {
      padding: 10px 20px;
      border-radius: 6px;
      background: #1976d2;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.2s;
    }

    .empty-action:hover {
      background: #1565c0;
    }

    .empty-action:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .empty-state {
        animation: none;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() type: 'no-results' | 'no-history' | 'no-recommendations' | 'error' = 'no-results';
  @Input() title = 'No matches found';
  @Input() message = 'Try adjusting your filters or search query';
  @Input() actionLabel?: string;
  @Input() onAction?: () => void;
}
