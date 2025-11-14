import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from '../../services/theme.service';

interface NavLink {
  path: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  navLinks: NavLink[] = [
    { path: '/Home', title: 'Home', icon: 'home' },
    { path: '/matches', title: 'All Matches', icon: 'list' },
    { path: '/live-cricket-score', title: 'Live Matches', icon: 'sports_cricket' },
    { path: '/scorecard', title: 'Scorecard', icon: 'scoreboard' },
    { path: '/dashboard', title: 'Dashboard', icon: 'dashboard' },
  ];

  currentRoute = '';
  isMobileMenuOpen = false;

  constructor(
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Track current route for active state
    this.currentRoute = this.router.url;

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

  isActive(path: string): boolean {
    return this.currentRoute === path || this.currentRoute.startsWith(path + '/');
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
