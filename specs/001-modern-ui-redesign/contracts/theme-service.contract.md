# Service Contract: Theme Service

**Service Name**: `ThemeService`  
**Injectable**: Root  
**Purpose**: Manage application theme (light/dark mode) with persistence  
**Created**: 2025-11-06

---

## Public API

### Properties

```typescript
/**
 * Current theme mode as Observable
 * @observable
 * @readonly
 */
public readonly currentTheme$: Observable<ThemeMode>;

/**
 * Complete theme configuration as Observable
 * @observable
 * @readonly
 */
public readonly themeConfig$: Observable<ThemeConfig>;

/**
 * System theme preference (from OS)
 * @observable
 * @readonly
 */
public readonly systemTheme$: Observable<ThemeMode>;

/**
 * Whether animations are enabled
 * @observable
 * @readonly
 */
public readonly animationsEnabled$: Observable<boolean>;
```

### Methods

```typescript
/**
 * Get current theme mode (synchronous)
 * @returns Current theme mode
 */
public getCurrentTheme(): ThemeMode;

/**
 * Set theme mode
 * @param mode Theme mode to apply
 * @param persist Whether to save to localStorage (default: true)
 */
public setTheme(mode: ThemeMode, persist?: boolean): void;

/**
 * Toggle between light and dark theme
 * @returns New theme mode
 */
public toggleTheme(): ThemeMode;

/**
 * Set whether to use system theme preference
 * @param useSystem If true, sync with OS theme
 */
public setUseSystemTheme(useSystem: boolean): void;

/**
 * Get complete theme configuration for current theme
 * @returns Theme configuration object
 */
public getThemeConfig(): ThemeConfig;

/**
 * Update theme colors dynamically (for custom themes)
 * @param colors Partial color configuration to merge
 */
public updateColors(colors: Partial<ThemeColors>): void;

/**
 * Enable or disable animations globally
 * @param enabled Whether animations should be enabled
 */
public setAnimationsEnabled(enabled: boolean): void;

/**
 * Check if reduced motion is preferred (from OS)
 * @returns true if user prefers reduced motion
 */
public prefersReducedMotion(): boolean;

/**
 * Initialize theme service (called by app initializer)
 */
public initialize(): void;
```

---

## Implementation Contract

### State Management

```typescript
/**
 * Internal state (private)
 */
private state: {
  currentTheme: BehaviorSubject<ThemeMode>;
  themeConfig: BehaviorSubject<ThemeConfig>;
  systemTheme: BehaviorSubject<ThemeMode>;
  animationsEnabled: BehaviorSubject<boolean>;
  useSystemTheme: boolean;
};
```

### Initialization Sequence

1. **Read localStorage** for saved theme preference
2. **Detect system theme** using `window.matchMedia('(prefers-color-scheme: dark)')`
3. **Set up media query listener** for system theme changes
4. **Apply initial theme** to document
5. **Set up reduced motion detection**
6. **Emit initial values** to Observables

```typescript
public initialize(): void {
  // 1. Read saved preference
  const savedTheme = this.readFromStorage();
  const useSystemTheme = this.readUseSystemTheme();
  
  // 2. Detect system theme
  const systemTheme = this.detectSystemTheme();
  
  // 3. Set up listeners
  this.setupSystemThemeListener();
  this.setupReducedMotionListener();
  
  // 4. Determine and apply theme
  const initialTheme = useSystemTheme ? systemTheme : savedTheme;
  this.applyTheme(initialTheme);
  
  // 5. Emit initial values
  this.state.currentTheme.next(initialTheme);
  this.state.systemTheme.next(systemTheme);
}
```

---

## Theme Application Process

### setTheme() Implementation

```typescript
public setTheme(mode: ThemeMode, persist: boolean = true): void {
  // Validate mode
  if (!isThemeMode(mode)) {
    console.error(`Invalid theme mode: ${mode}`);
    return;
  }
  
  // Apply to document
  this.applyTheme(mode);
  
  // Update state
  this.state.currentTheme.next(mode);
  
  // Load and emit config
  const config = this.loadThemeConfig(mode);
  this.state.themeConfig.next(config);
  
  // Persist if requested
  if (persist) {
    this.saveToStorage(mode);
  }
  
  // Notify other parts of app
  this.broadcastThemeChange(mode);
}

private applyTheme(mode: ThemeMode): void {
  // Set data attribute on document root
  document.documentElement.setAttribute('data-theme', mode);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const color = mode === 'dark' ? '#1a1a1a' : '#ffffff';
    metaThemeColor.setAttribute('content', color);
  }
  
  // Apply CSS custom properties
  this.applyCSSVariables(mode);
}
```

---

## Theme Configuration

### Light Theme Configuration

```typescript
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
```

### Dark Theme Configuration

```typescript
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
  // ... spacing, typography, borderRadius, shadows same as light theme
};
```

---

## CSS Variable Injection

```typescript
private applyCSSVariables(mode: ThemeMode): void {
  const config = this.loadThemeConfig(mode);
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

private kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
```

---

## System Theme Detection

```typescript
private detectSystemTheme(): ThemeMode {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

private setupSystemThemeListener(): void {
  if (!window.matchMedia) return;
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Listen for changes
  mediaQuery.addEventListener('change', (e) => {
    const newSystemTheme: ThemeMode = e.matches ? 'dark' : 'light';
    this.state.systemTheme.next(newSystemTheme);
    
    // If using system theme, update current theme
    if (this.state.useSystemTheme) {
      this.setTheme(newSystemTheme, false);
    }
  });
  
  // Emit initial value
  const initialTheme: ThemeMode = mediaQuery.matches ? 'dark' : 'light';
  this.state.systemTheme.next(initialTheme);
}
```

---

## Reduced Motion Detection

```typescript
public prefersReducedMotion(): boolean {
  if (!window.matchMedia) return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

private setupReducedMotionListener(): void {
  if (!window.matchMedia) return;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  mediaQuery.addEventListener('change', (e) => {
    const reducedMotion = e.matches;
    
    // If user prefers reduced motion, disable animations
    if (reducedMotion) {
      this.setAnimationsEnabled(false);
    }
  });
  
  // Set initial state
  if (mediaQuery.matches) {
    this.setAnimationsEnabled(false);
  }
}
```

---

## LocalStorage Persistence

```typescript
private saveToStorage(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
}

private readFromStorage(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved && isThemeMode(saved)) {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }
  
  // Default to system theme or light
  return this.detectSystemTheme();
}

private saveUseSystemTheme(useSystem: boolean): void {
  try {
    localStorage.setItem('victoryline-use-system-theme', String(useSystem));
  } catch (error) {
    console.warn('Failed to save useSystemTheme preference:', error);
  }
}

private readUseSystemTheme(): boolean {
  try {
    const saved = localStorage.getItem('victoryline-use-system-theme');
    return saved === 'true';
  } catch (error) {
    console.warn('Failed to read useSystemTheme preference:', error);
    return false;
  }
}
```

---

## Event Broadcasting

```typescript
/**
 * Broadcast theme change to other tabs/windows
 */
private broadcastThemeChange(mode: ThemeMode): void {
  if (!window.BroadcastChannel) return;
  
  try {
    const channel = new BroadcastChannel('theme-updates');
    channel.postMessage({ type: 'theme-change', mode });
    channel.close();
  } catch (error) {
    console.warn('Failed to broadcast theme change:', error);
  }
}

/**
 * Listen for theme changes from other tabs
 */
private listenForThemeChanges(): void {
  if (!window.BroadcastChannel) return;
  
  try {
    const channel = new BroadcastChannel('theme-updates');
    
    channel.onmessage = (event) => {
      if (event.data.type === 'theme-change') {
        const newMode = event.data.mode;
        if (isThemeMode(newMode)) {
          this.setTheme(newMode, false);
        }
      }
    };
    
    // Store reference for cleanup
    this.broadcastChannel = channel;
  } catch (error) {
    console.warn('Failed to set up theme change listener:', error);
  }
}
```

---

## Testing Contract

### Unit Tests Required

1. **Theme application**
   - `setTheme()` updates document attribute
   - CSS variables applied correctly
   - localStorage updated
   
2. **Theme toggle**
   - `toggleTheme()` switches between light/dark
   - Returns new theme mode
   
3. **System theme**
   - System theme detected correctly
   - Listener responds to OS changes
   - `setUseSystemTheme(true)` syncs with OS
   
4. **Observables**
   - All observables emit correct values
   - Subscriptions can be unsubscribed
   
5. **Persistence**
   - Theme saved to localStorage
   - Theme restored on init
   - Handles localStorage errors gracefully

### Integration Tests Required

1. **With components**
   - Components receive theme updates
   - CSS variables accessible in components
   
2. **With preferences**
   - Reduced motion preference respected
   - Animation state synced correctly

---

## Usage Examples

### Basic Usage (in component)

```typescript
export class AppComponent implements OnInit {
  currentTheme$ = this.themeService.currentTheme$;
  
  constructor(private themeService: ThemeService) {}
  
  ngOnInit(): void {
    this.themeService.initialize();
  }
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
```

### Template Usage

```html
<button (click)="toggleTheme()">
  <mat-icon *ngIf="(currentTheme$ | async) === 'light'">dark_mode</mat-icon>
  <mat-icon *ngIf="(currentTheme$ | async) === 'dark'">light_mode</mat-icon>
</button>
```

### Using Theme Config

```typescript
export class ChartComponent implements OnInit {
  private chartColors: string[] = [];
  
  constructor(private themeService: ThemeService) {}
  
  ngOnInit(): void {
    this.themeService.themeConfig$.subscribe(config => {
      this.chartColors = [
        config.colors.primary,
        config.colors.success,
        config.colors.warning
      ];
      
      this.updateChart();
    });
  }
}
```

---

## Dependencies

- **@angular/core**: Injectable, APP_INITIALIZER
- **rxjs**: BehaviorSubject, Observable
- **Browser APIs**: window.matchMedia, localStorage, BroadcastChannel

---

## Version History

- **v1.0.0** (2025-11-06): Initial contract definition
