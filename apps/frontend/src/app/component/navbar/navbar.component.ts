import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeMode } from '../../core/models/theme.models';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  animations: [
    trigger('slideInFromRight', [
      state('closed', style({ transform: 'translateX(100%)', opacity: 0 })),
      state('open', style({ transform: 'translateX(0)', opacity: 1 })),
      transition('closed => open', [ animate('300ms ease-out') ]),
      transition('open => closed', [ animate('250ms ease-in') ])
    ])
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  isMobileMenuOpen = false;
  activeRoute = '';
  logoFilter = 'brightness(0) saturate(100%)';
  private destroy$ = new Subject<void>();
  
  constructor(private themeService: ThemeService, private router: Router) {}
  
  ngOnInit(): void {
    this.applyTheme(this.themeService.getCurrentTheme());

    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => this.applyTheme(theme));
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$)).subscribe((event: NavigationEnd) => {
      this.activeRoute = event.urlAfterRedirects;
    });
    this.activeRoute = this.router.url;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  toggleTheme(): void { this.themeService.toggleTheme(); }
  get themeIcon(): string { return this.isDarkTheme ? 'brightness_3' : 'wb_sunny'; }
  get themeTooltip(): string { return this.isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'; }
  toggleMobileMenu(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu(): void { this.isMobileMenuOpen = false; }
  navigateTo(route: string): void { this.router.navigate([route]); this.closeMobileMenu(); }
  isRouteActive(route: string): boolean { return this.activeRoute.startsWith(route); }

  private applyTheme(theme: ThemeMode): void {
    this.isDarkTheme = theme === 'dark';
    this.logoFilter = this.isDarkTheme
      ? 'none'
      : 'brightness(0) saturate(100%)';
  }
}
