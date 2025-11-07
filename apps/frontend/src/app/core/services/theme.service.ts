/**
 * Theme Service
 * 
 * Manages application theme (light/dark mode) with persistence and system preference detection.
 * Provides theme observables and methods for theme switching.
 * 
 * Features:
 * - Light/Dark theme switching
 * - System theme preference detection and sync
 * - localStorage persistence
 * - CSS custom properties injection
 * - Reduced motion detection
 * - Theme change observables
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ThemeMode,
  ThemeConfig,
  ThemeColors,
  ThemePreferences,
  isThemeMode
} from '../models/theme.models';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Storage keys
  private readonly THEME_STORAGE_KEY = 'victoryline-theme';
  private readonly USE_SYSTEM_THEME_KEY = 'victoryline-use-system-theme';
  private readonly ANIMATIONS_ENABLED_KEY = 'victoryline-animations-enabled';
  
  // BroadcastChannel for cross-tab synchronization (T054)
  private themeChannel: BroadcastChannel | null = null;

  // Internal state
  private currentThemeSubject: BehaviorSubject<ThemeMode>;
  private themeConfigSubject: BehaviorSubject<ThemeConfig>;
  private systemThemeSubject: BehaviorSubject<ThemeMode>;
  private animationsEnabledSubject: BehaviorSubject<boolean>;
  private useSystemTheme: boolean = false;

  // Public observables
  public readonly currentTheme$: Observable<ThemeMode>;
  public readonly themeConfig$: Observable<ThemeConfig>;
  public readonly systemTheme$: Observable<ThemeMode>;
  public readonly animationsEnabled$: Observable<boolean>;

  // Theme configurations
  private readonly LIGHT_THEME: ThemeConfig = {
    mode: 'light',
    colors: {
      primary: '#1976d2',
      primaryHover: '#1565c0',
      primaryActive: '#0d47a1',
      
      background: '#ffffff',
      backgroundElevated: '#f5f5f5',
      backgroundHover: '#eeeeee',
      
      textPrimary: '#212121',
      textSecondary: '#757575',
      textDisabled: '#bdbdbd',
      
      border: '#e0e0e0',
      borderLight: '#f5f5f5',
      
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      
      matchLive: '#4caf50',
      matchUpcoming: '#2196f3',
      matchCompleted: '#757575'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px'
    },
    typography: {
      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px'
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.2)'
    }
  };

  private readonly DARK_THEME: ThemeConfig = {
    mode: 'dark',
    colors: {
      primary: '#90caf9',
      primaryHover: '#64b5f6',
      primaryActive: '#42a5f5',
      
      background: '#121212',
      backgroundElevated: '#1e1e1e',
      backgroundHover: '#2a2a2a',
      
      textPrimary: '#ffffff',
      textSecondary: '#b0b0b0',
      textDisabled: '#666666',
      
      border: '#2a2a2a',
      borderLight: '#1e1e1e',
      
      success: '#66bb6a',
      warning: '#ffa726',
      error: '#ef5350',
      info: '#42a5f5',
      
      matchLive: '#66bb6a',
      matchUpcoming: '#42a5f5',
      matchCompleted: '#757575'
    },
    spacing: this.LIGHT_THEME.spacing,
    typography: this.LIGHT_THEME.typography,
    borderRadius: this.LIGHT_THEME.borderRadius,
    shadows: {
      none: 'none',
      sm: '0 1px 3px rgba(0, 0, 0, 0.4)',
      md: '0 4px 6px rgba(0, 0, 0, 0.3)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.5)'
    }
  };

  constructor() {
    // Initialize subjects with default values
    const initialTheme = this.detectSystemTheme();
    this.currentThemeSubject = new BehaviorSubject<ThemeMode>(initialTheme);
    this.themeConfigSubject = new BehaviorSubject<ThemeConfig>(this.LIGHT_THEME);
    this.systemThemeSubject = new BehaviorSubject<ThemeMode>(initialTheme);
    this.animationsEnabledSubject = new BehaviorSubject<boolean>(true);

    // Expose as observables
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    this.themeConfig$ = this.themeConfigSubject.asObservable();
    this.systemTheme$ = this.systemThemeSubject.asObservable();
    this.animationsEnabled$ = this.animationsEnabledSubject.asObservable();
  }

  /**
   * Initialize theme service (called by app initializer)
   */
  public initialize(): void {
    // 1. Read saved preferences
    const savedTheme = this.readFromStorage();
    const useSystemTheme = this.readUseSystemTheme();
    const animationsEnabled = this.readAnimationsEnabled();

    // 2. Detect system theme
    const systemTheme = this.detectSystemTheme();
    this.systemThemeSubject.next(systemTheme);

    // 3. Set up listeners
    this.setupSystemThemeListener();
    this.setupReducedMotionListener();
    this.setupBroadcastChannel(); // T054 - Cross-tab synchronization

    // 4. Determine and apply initial theme
    this.useSystemTheme = useSystemTheme;
    const initialTheme = useSystemTheme ? systemTheme : savedTheme;
    this.setTheme(initialTheme, false);

    // 5. Set animations preference
    this.animationsEnabledSubject.next(animationsEnabled);

    console.log(`ThemeService initialized: ${initialTheme} mode (system: ${useSystemTheme})`);
  }

  /**
   * Get current theme mode (synchronous)
   */
  public getCurrentTheme(): ThemeMode {
    return this.currentThemeSubject.value;
  }

  /**
   * Set theme mode
   * @param mode Theme mode to apply
   * @param persist Whether to save to localStorage (default: true)
   */
  public setTheme(mode: ThemeMode, persist: boolean = true): void {
    // Validate mode
    if (!isThemeMode(mode)) {
      console.error(`Invalid theme mode: ${mode}`);
      return;
    }

    // Apply to document
    this.applyTheme(mode);

    // Update state
    this.currentThemeSubject.next(mode);

    // Load and emit config
    const config = this.loadThemeConfig(mode);
    this.themeConfigSubject.next(config);

    // Persist if requested
    if (persist) {
      this.saveToStorage(mode);
      // Broadcast theme change to other tabs (T054)
      this.broadcastThemeChange(mode);
    }

    console.log(`Theme changed to: ${mode}`);
  }

  /**
   * Toggle between light and dark theme
   * Debounced to prevent rapid switching (T114)
   * @returns New theme mode
   */
  private toggleDebounceTimer: any = null;
  
  public toggleTheme(): ThemeMode {
    // Clear existing debounce timer
    if (this.toggleDebounceTimer) {
      clearTimeout(this.toggleDebounceTimer);
    }
    
    const currentTheme = this.getCurrentTheme();
    const newTheme: ThemeMode = currentTheme === 'light' ? 'dark' : 'light';
    
    // Debounce theme toggle (300ms) to prevent rapid switching
    this.toggleDebounceTimer = setTimeout(() => {
      // Disable system theme sync when manually toggling
      this.setUseSystemTheme(false);
      this.setTheme(newTheme, true);
      this.toggleDebounceTimer = null;
    }, 300);
    
    return newTheme;
  }

  /**
   * Set whether to use system theme preference
   * @param useSystem If true, sync with OS theme
   */
  public setUseSystemTheme(useSystem: boolean): void {
    this.useSystemTheme = useSystem;
    localStorage.setItem(this.USE_SYSTEM_THEME_KEY, JSON.stringify(useSystem));

    if (useSystem) {
      // Apply current system theme
      const systemTheme = this.systemThemeSubject.value;
      this.setTheme(systemTheme, false);
    }
  }

  /**
   * Get complete theme configuration for current theme
   */
  public getThemeConfig(): ThemeConfig {
    return this.themeConfigSubject.value;
  }

  /**
   * Update theme colors dynamically (for custom themes)
   * @param colors Partial color configuration to merge
   */
  public updateColors(colors: Partial<ThemeColors>): void {
    const currentConfig = this.themeConfigSubject.value;
    const updatedConfig: ThemeConfig = {
      ...currentConfig,
      colors: {
        ...currentConfig.colors,
        ...colors
      }
    };

    this.themeConfigSubject.next(updatedConfig);
    this.applyCSSVariables(updatedConfig);
  }

  /**
   * Enable or disable animations globally
   * @param enabled Whether animations should be enabled
   */
  public setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabledSubject.next(enabled);
    localStorage.setItem(this.ANIMATIONS_ENABLED_KEY, JSON.stringify(enabled));

    // Apply to document for CSS selectors
    if (enabled) {
      document.documentElement.removeAttribute('data-no-animations');
    } else {
      document.documentElement.setAttribute('data-no-animations', 'true');
    }
  }

  /**
   * Check if reduced motion is preferred (from OS)
   */
  public prefersReducedMotion(): boolean {
    if (!window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Apply theme to document
   */
  private applyTheme(mode: ThemeMode): void {
    // Set data attribute on document root
    document.documentElement.setAttribute('data-theme', mode);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = mode === 'dark' ? '#121212' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }

    // Apply CSS custom properties
    const config = this.loadThemeConfig(mode);
    this.applyCSSVariables(config);
  }

  /**
   * Load theme configuration by mode
   */
  private loadThemeConfig(mode: ThemeMode): ThemeConfig {
    return mode === 'dark' ? this.DARK_THEME : this.LIGHT_THEME;
  }

  /**
   * Apply CSS custom properties to document root
   */
  private applyCSSVariables(config: ThemeConfig): void {
    const root = document.documentElement;

    // Apply color variables
    Object.entries(config.colors).forEach(([key, value]) => {
      const cssVar = `--color-${this.kebabCase(key)}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply spacing variables
    Object.entries(config.spacing).forEach(([key, value]) => {
      const cssVar = `--spacing-${key}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply typography variables
    root.style.setProperty('--font-family', config.typography.fontFamily);
    Object.entries(config.typography.fontSize).forEach(([key, value]) => {
      const cssVar = `--font-size-${key}`;
      root.style.setProperty(cssVar, value);
    });
    Object.entries(config.typography.fontWeight).forEach(([key, value]) => {
      const cssVar = `--font-weight-${key}`;
      root.style.setProperty(cssVar, String(value));
    });
    Object.entries(config.typography.lineHeight).forEach(([key, value]) => {
      const cssVar = `--line-height-${key}`;
      root.style.setProperty(cssVar, String(value));
    });

    // Apply border radius variables
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      const cssVar = `--border-radius-${key}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply shadow variables
    Object.entries(config.shadows).forEach(([key, value]) => {
      const cssVar = `--shadow-${key}`;
      root.style.setProperty(cssVar, value);
    });
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Detect system theme preference
   */
  private detectSystemTheme(): ThemeMode {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Set up listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern event listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => {
        const newSystemTheme: ThemeMode = e.matches ? 'dark' : 'light';
        this.systemThemeSubject.next(newSystemTheme);

        // If using system theme, update current theme
        if (this.useSystemTheme) {
          this.setTheme(newSystemTheme, false);
        }
      });
    }
  }

  /**
   * Set up listener for reduced motion preference changes
   */
  private setupReducedMotionListener(): void {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => {
        const reducedMotion = e.matches;
        
        // Disable animations if reduced motion is preferred
        if (reducedMotion) {
          this.setAnimationsEnabled(false);
        }

        console.log(`Reduced motion preference changed: ${reducedMotion}`);
      });
    }

    // Check initial value
    if (mediaQuery.matches) {
      this.setAnimationsEnabled(false);
    }
  }

  /**
   * Read theme from localStorage
   */
  private readFromStorage(): ThemeMode {
    try {
      const stored = localStorage.getItem(this.THEME_STORAGE_KEY);
      if (stored && isThemeMode(stored)) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'light';
  }

  /**
   * Save theme to localStorage
   */
  private saveToStorage(mode: ThemeMode): void {
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }

  /**
   * Read useSystemTheme preference from localStorage
   */
  private readUseSystemTheme(): boolean {
    try {
      const stored = localStorage.getItem(this.USE_SYSTEM_THEME_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to read useSystemTheme from localStorage:', e);
    }
    return false;
  }

  /**
   * Read animations enabled preference from localStorage
   */
  private readAnimationsEnabled(): boolean {
    try {
      const stored = localStorage.getItem(this.ANIMATIONS_ENABLED_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to read animationsEnabled from localStorage:', e);
    }
    return true; // Default to enabled
  }
  
  /**
   * Set up BroadcastChannel for cross-tab theme synchronization
   * Task: T054 - BroadcastChannel synchronization
   */
  private setupBroadcastChannel(): void {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported in this browser');
      return;
    }
    
    try {
      // Create broadcast channel for theme updates
      this.themeChannel = new BroadcastChannel('victoryline-theme');
      
      // Listen for theme changes from other tabs
      this.themeChannel.onmessage = (event) => {
        const { type, theme } = event.data;
        
        if (type === 'theme-change' && isThemeMode(theme)) {
          console.log(`Received theme change from another tab: ${theme}`);
          // Apply theme without broadcasting to avoid infinite loop
          this.applyTheme(theme);
          this.currentThemeSubject.next(theme);
          const config = theme === 'light' ? this.LIGHT_THEME : this.DARK_THEME;
          this.themeConfigSubject.next(config);
        }
      };
      
      console.log('BroadcastChannel initialized for theme synchronization');
    } catch (e) {
      console.warn('Failed to setup BroadcastChannel:', e);
    }
  }
  
  /**
   * Broadcast theme change to other tabs
   */
  private broadcastThemeChange(theme: ThemeMode): void {
    if (this.themeChannel) {
      try {
        this.themeChannel.postMessage({
          type: 'theme-change',
          theme: theme
        });
      } catch (e) {
        console.warn('Failed to broadcast theme change:', e);
      }
    }
  }
}
