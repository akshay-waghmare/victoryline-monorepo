import { Component, Input } from '@angular/core';

/**
 * Skeleton loading placeholder for match cards
 * Shows animated placeholder while real data loads
 */
@Component({
  selector: 'app-match-skeleton',
  template: `
    <div class="match-skeleton" [class.compact]="compact">
      <div class="skeleton-header">
        <div class="skeleton-badge"></div>
        <div class="skeleton-venue" *ngIf="!compact"></div>
      </div>
      <div class="skeleton-teams" [class.compact]="compact">
        <div class="skeleton-team">
          <div class="skeleton-name"></div>
          <div class="skeleton-score" *ngIf="!compact"></div>
        </div>
        <div class="skeleton-vs"></div>
        <div class="skeleton-team">
          <div class="skeleton-name"></div>
          <div class="skeleton-score" *ngIf="!compact"></div>
        </div>
      </div>
      <div class="skeleton-footer" *ngIf="!compact">
        <div class="skeleton-time"></div>
      </div>
    </div>
  `,
  styles: [`
    .match-skeleton {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .match-skeleton.compact {
      padding: 10px;
      min-width: 180px;
      max-width: 180px;
    }

    .skeleton-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .skeleton-badge {
      width: 60px;
      height: 20px;
      background: #e0e0e0;
      border-radius: 4px;
    }

    .skeleton-venue {
      width: 120px;
      height: 14px;
      background: #e0e0e0;
      border-radius: 4px;
    }

    .skeleton-teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .skeleton-teams.compact {
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .skeleton-team {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-name {
      width: 100%;
      height: 16px;
      background: #e0e0e0;
      border-radius: 4px;
    }

    .skeleton-score {
      width: 80%;
      height: 14px;
      background: #e0e0e0;
      border-radius: 4px;
    }

    .skeleton-vs {
      width: 24px;
      height: 14px;
      background: #e0e0e0;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .skeleton-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .skeleton-time {
      width: 100px;
      height: 14px;
      background: #e0e0e0;
      border-radius: 4px;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .match-skeleton {
        animation: none;
      }
    }
  `]
})
export class MatchSkeletonComponent {
  @Input() compact = false;
}
