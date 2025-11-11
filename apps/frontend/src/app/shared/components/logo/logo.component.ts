import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <div class="logo-container" [ngClass]="containerClass + ' logo-' + size">
      <img 
        [src]="logoSrc" 
        [alt]="altText" 
        [ngClass]="imageClass"
        class="logo-image"
        (error)="onImageError($event)"
        loading="lazy"
      />
      <span *ngIf="showText && variant !== 'text'" class="logo-text" [ngClass]="textClass">
        {{ logoText }}
      </span>
    </div>
  `,
  styles: [`
    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;
      background: transparent;
    }

    .logo-container:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }

    .logo-image {
      height: auto;
      max-height: 100%;
      width: auto;
      object-fit: contain;
      transition: all 0.25s ease;
      display: block;
    }

    .logo-text {
      font-weight: 700;
      color: var(--primary-color, #2563eb);
      font-family: 'Roboto', 'Helvetica', sans-serif;
      letter-spacing: -0.025em;
      transition: all 0.3s ease;
    }

    /* Size variants with enhanced styling */
    .logo-xs .logo-image { max-height: 20px; }
    .logo-sm .logo-image { max-height: 28px; }
    .logo-md .logo-image { max-height: 36px; }
    .logo-lg .logo-image { max-height: 44px; }
    .logo-xl .logo-image { max-height: 52px; }
    .logo-2xl .logo-image { max-height: 64px; }

    /* Context-specific styling */
    .logo-navbar {
      height: 100px; /* enlarged for better visibility */
      display: flex;
      align-items: center;
      background: transparent !important;
      padding: 0;
      border-radius: 0;
    }

    .logo-navbar .logo-image {
      height: 144px; /* doubled from 72px */
      max-height: 144px;
      width: auto;
      background: transparent !important;
    }

    .logo-navbar .logo-text {
      font-size: 1.35rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      letter-spacing: -.5px;
      margin-left: .4rem;
    }

    .logo-footer {
      height: 72px;
      display: flex;
      align-items: center;
    }

    .logo-footer .logo-image {
      height: 64px; /* doubled from 32px */
      max-height: 64px;
      padding: 0;
      background: transparent !important;
    }

    .logo-footer .logo-text {
      font-size: 1rem;
      opacity: 0.8;
      color: white;
    }

    .logo-brand {
      height: 112px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-brand .logo-image {
      height: 104px; /* doubled from 52px */
      max-height: 104px;
      padding: 0;
      background: transparent !important;
    }

    .logo-brand .logo-text {
      font-size: 1.5rem;
      font-weight: 800;
    }

    .logo-splash {
      height: 160px;
    }

    .logo-splash .logo-image {
      height: 160px; /* doubled from 80px */
      max-height: 160px;
      padding: 0;
      background: transparent !important;
    }

    .logo-splash .logo-text {
      font-size: 2rem;
      font-weight: 900;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .logo-navbar {
        height: 40px;
        gap: 0.5rem;
      }
      
      .logo-navbar .logo-image {
        height: 40px;
        max-height: 40px;
      }
      
      .logo-navbar .logo-text {
        font-size: 1.1rem;
      }
      
      .logo-brand {
        height: 48px;
      }
      
      .logo-brand .logo-image {
        height: 48px;
        max-height: 48px;
      }
      
      .logo-splash {
        height: 64px;
      }
      
      .logo-splash .logo-image {
        height: 64px;
        max-height: 64px;
      }
    }

    @media (max-width: 480px) {
      .logo-navbar .logo-text,
      .logo-footer .logo-text {
        display: none;
      }
    }

    /* Animation for splash/loading */
    .logo-splash .logo-image {
      animation: logoGlow 2s ease-in-out infinite alternate;
    }

    @keyframes logoGlow {
      0% {
        filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2));
      }
      100% {
        filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.4));
      }
    }

    /* Theme support */
    .logo-container.dark-theme .logo-text {
      color: var(--primary-light, #60a5fa);
    }

    .logo-container.dark-theme .logo-image {
      filter: drop-shadow(0 2px 4px rgba(255,255,255,0.1));
    }
  `]
})
export class LogoComponent {
  @Input() variant: 'primary' | 'circular' | 'text' = 'primary';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'navbar' | 'footer' | 'brand' | 'splash' = 'md';
  @Input() showText: boolean = true;
  @Input() logoText: string = 'Crickzen';
  @Input() containerClass: string = '';
  @Input() imageClass: string = '';
  @Input() textClass: string = '';
  @Input() altText: string = 'Crickzen Live Cricket';

  get logoSrc(): string {
    switch (this.variant) {
      case 'primary':
        return '/assets/img/logos/crickzen-primary-logo.png';
      case 'circular':
        return '/assets/img/logos/crickzen-circular-logo.png';
      case 'text':
        return '/assets/img/logos/crickzen-text-logo.png';
      default:
        return '/assets/img/logos/crickzen-primary-logo.png';
    }
  }

  onImageError(event: any): void {
    console.warn('Logo image failed to load:', event.target.src);
    // Fallback sequence: primary -> circular -> text
    if (event.target.src.includes('primary')) {
      event.target.src = '/assets/img/logos/crickzen-circular-logo.png';
      return;
    }
    if (event.target.src.includes('circular')) {
      event.target.src = '/assets/img/logos/crickzen-text-logo.png';
      return;
    }
    // Final fallback - hide image and force text variant
    event.target.style.display = 'none';
    this.variant = 'text';
    this.showText = true;
  }
}