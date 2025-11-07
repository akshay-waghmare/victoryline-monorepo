/**
 * Theme Toggle Component
 * 
 * A button component that toggles between light and dark themes.
 * Displays current theme icon and smooth transition animation.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService } from '../../../core/services/theme.service';
import { ThemeMode } from '../../../core/models/theme.models';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss']
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  public currentTheme: ThemeMode = 'light';
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle theme between light and dark
   */
  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Get icon name for current theme
   */
  public get themeIcon(): string {
    return this.currentTheme === 'dark' ? 'brightness_3' : 'wb_sunny';
  }

  /**
   * Get label for current theme
   */
  public get themeLabel(): string {
    return this.currentTheme === 'dark' ? 'Dark mode' : 'Light mode';
  }
}
