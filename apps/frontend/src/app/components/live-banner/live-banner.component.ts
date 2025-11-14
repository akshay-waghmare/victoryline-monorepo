import { Component, Input } from '@angular/core';

/**
 * Banner component for live match pages
 * Links to final season-scoped URL for long-term discoverability
 */
@Component({
  selector: 'app-live-banner',
  template: `
    <div class="live-banner" *ngIf="finalUrl">
      <div class="live-banner__content">
        <svg class="live-banner__icon" viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="8" fill="currentColor">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <span class="live-banner__text">
          Live match in progress.
          <a [href]="finalUrl" class="live-banner__link" rel="canonical">
            View permanent match page
          </a>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .live-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .live-banner__content {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .live-banner__icon {
      flex-shrink: 0;
      color: #fbbf24;
    }

    .live-banner__text {
      font-size: 14px;
      line-height: 1.5;
    }

    .live-banner__link {
      color: #fbbf24;
      text-decoration: underline;
      font-weight: 600;
      transition: color 0.2s ease;
    }

    .live-banner__link:hover {
      color: #f59e0b;
    }

    @media (max-width: 768px) {
      .live-banner {
        padding: 10px 12px;
        border-radius: 0;
      }

      .live-banner__text {
        font-size: 13px;
      }
    }
  `]
})
export class LiveBannerComponent {
  @Input() finalUrl?: string;
}
