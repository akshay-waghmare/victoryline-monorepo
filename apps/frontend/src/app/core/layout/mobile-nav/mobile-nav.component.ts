import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

export interface MobileNavLink {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-mobile-nav',
  templateUrl: './mobile-nav.component.html',
  styleUrls: ['./mobile-nav.component.css'],
  animations: [
    trigger('slideInFromRight', [
      state('closed', style({ transform: 'translateX(100%)', opacity: 0 })),
      state('open', style({ transform: 'translateX(0)', opacity: 1 })),
      transition('closed => open', [animate('300ms ease-out')]),
      transition('open => closed', [animate('250ms ease-in')])
    ])
  ]
})
export class MobileNavComponent {
  @Input() open = false;
  @Input() activeRoute = '';
  @Input() links: MobileNavLink[] = [];

  @Output() navigate = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  trackByRoute(_: number, link: MobileNavLink): string {
    return link.route;
  }

  isActive(link: MobileNavLink): boolean {
    if (!this.activeRoute) {
      return false;
    }

    return link.exact ? this.activeRoute === link.route : this.activeRoute.startsWith(link.route);
  }

  onLinkClick(route: string): void {
    this.navigate.emit(route);
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close.emit();
    }
  }
}
