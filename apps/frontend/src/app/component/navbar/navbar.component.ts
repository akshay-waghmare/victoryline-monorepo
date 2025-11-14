import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeMode } from '../../core/models/theme.models';
import { MobileNavLink } from '../../core/layout/mobile-nav/mobile-nav.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  isMobileMenuOpen = false;
  activeRoute = '';
  logoFilter = 'brightness(0) saturate(100%)';
  private destroy$ = new Subject<void>();
  readonly navLinks: MobileNavLink[] = [
    { label: 'Home', icon: 'home', route: '/', exact: true },
    { label: 'Matches', icon: 'sports_cricket', route: '/matches' },
    { label: 'Players', icon: 'person', route: '/players' },
    { label: 'Teams', icon: 'groups', route: '/teams' },
    { label: 'Blog', icon: 'article', route: '/blog' }
  ];
  
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
  handleMobileNavigate(route: string): void { this.navigateTo(route); }
  isRouteActive(route: string, exact: boolean = false): boolean {
    return exact ? this.activeRoute === route : this.activeRoute.startsWith(route);
  }

  private applyTheme(theme: ThemeMode): void {
    this.isDarkTheme = theme === 'dark';
    this.logoFilter = this.isDarkTheme
      ? 'none'
      : 'brightness(0) saturate(100%)';
  }
}
