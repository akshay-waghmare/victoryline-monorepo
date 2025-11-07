# Data Model: Modern UI Redesign

**Feature**: Modern UI Redesign  
**Created**: 2025-11-06  
**Purpose**: Define TypeScript interfaces, data structures, and UI state models

## Core UI State Models

### 1. Theme Configuration

```typescript
/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Complete theme configuration including colors, spacing, and typography
 */
export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: SpacingScale;
  typography: TypographyScale;
  borderRadius: BorderRadiusScale;
  shadows: ShadowScale;
}

/**
 * Color palette for a theme
 */
export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  
  // Background colors
  background: string;
  backgroundElevated: string; // Cards, modals
  backgroundHover: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Status colors (semantic)
  success: string; // Green for live matches
  warning: string; // Yellow for warnings
  error: string;   // Red for errors/rain delays
  info: string;    // Blue for upcoming matches
  
  // Match status colors
  matchLive: string;
  matchUpcoming: string;
  matchCompleted: string;
}

/**
 * Spacing scale (8px base unit)
 */
export interface SpacingScale {
  xs: string;  // 4px
  sm: string;  // 8px
  md: string;  // 16px
  lg: string;  // 24px
  xl: string;  // 32px
  xxl: string; // 48px
}

/**
 * Typography scale
 */
export interface TypographyScale {
  fontFamily: string;
  fontSize: {
    xs: string;   // 12px
    sm: string;   // 14px
    base: string; // 16px
    lg: string;   // 18px
    xl: string;   // 20px
    xxl: string;  // 24px
    xxxl: string; // 32px
  };
  fontWeight: {
    normal: number; // 400
    medium: number; // 500
    semibold: number; // 600
    bold: number; // 700
  };
  lineHeight: {
    tight: number;  // 1.25
    normal: number; // 1.5
    relaxed: number; // 1.75
  };
}

/**
 * Border radius scale
 */
export interface BorderRadiusScale {
  sm: string;  // 4px
  md: string;  // 8px
  lg: string;  // 12px
  xl: string;  // 16px
  full: string; // 9999px (pill shape)
}

/**
 * Shadow scale for elevation
 */
export interface ShadowScale {
  none: string;
  sm: string;   // Subtle shadow
  md: string;   // Card default
  lg: string;   // Card hover
  xl: string;   // Modal/dialog
}
```

---

### 2. Animation State

```typescript
/**
 * Animation state tracker to prevent conflicts
 */
export interface AnimationState {
  // Currently animating elements (by ID or selector)
  animatingElements: Set<string>;
  
  // Frame timing for performance monitoring
  frameTimes: number[];
  averageFPS: number;
  
  // Animation preferences
  reducedMotion: boolean;
  animationsEnabled: boolean;
}

/**
 * Animation configuration for score updates
 */
export interface ScoreUpdateAnimation {
  element: HTMLElement;
  type: 'fade' | 'slide' | 'scale';
  duration: number; // milliseconds
  delay: number;    // milliseconds
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Loading animation state
 */
export interface LoadingState {
  isLoading: boolean;
  showSkeleton: boolean;
  skeletonCount: number;
}
```

---

### 3. Match Card View Model

```typescript
/**
 * Enhanced match data for UI display
 */
export interface MatchCardViewModel {
  // Core match data (from backend)
  id: string;
  team1: TeamInfo;
  team2: TeamInfo;
  status: MatchStatus;
  venue: string;
  startTime: Date;
  
  // Computed display properties
  displayStatus: string;        // "Live", "Upcoming", "Completed"
  statusColor: string;           // Computed from theme
  timeDisplay: string;           // "2h ago", "Tomorrow 2:00 PM"
  isLive: boolean;
  canAnimate: boolean;           // True if match is live
  
  // UI state
  isHovered: boolean;
  isSelected: boolean;
  lastUpdated: Date;
  staleness: 'fresh' | 'warning' | 'error'; // Based on lastUpdated
}

/**
 * Team information for match card
 */
export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;      // "IND", "AUS"
  logoUrl: string;
  score: ScoreInfo | null;
}

/**
 * Score information
 */
export interface ScoreInfo {
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
  displayText: string;    // "245/6 (45.3 ov)"
}

/**
 * Match status enum
 */
export enum MatchStatus {
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  INNINGS_BREAK = 'INNINGS_BREAK',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  RAIN_DELAY = 'RAIN_DELAY'
}
```

---

### 4. Player Stats View Model

```typescript
/**
 * Player statistics formatted for visualization
 */
export interface PlayerStatsViewModel {
  // Player info
  playerId: string;
  name: string;
  photoUrl: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  
  // Batting stats
  battingStats: BattingStats;
  
  // Bowling stats (if applicable)
  bowlingStats: BowlingStats | null;
  
  // Recent form (for charts)
  recentForm: PerformanceData[];
  
  // Career milestones
  milestones: Milestone[];
}

/**
 * Batting statistics with performance indicators
 */
export interface BattingStats {
  matches: number;
  innings: number;
  runs: number;
  average: number;
  strikeRate: number;
  centuries: number;
  fifties: number;
  highScore: number;
  
  // Computed for visualization
  averagePerformance: 'excellent' | 'good' | 'average' | 'poor';
  strikeRatePerformance: 'excellent' | 'good' | 'average' | 'poor';
  averageColor: string;      // Color based on performance
  strikeRateColor: string;   // Color based on performance
  averagePercentage: number; // For progress bar (relative to benchmark)
}

/**
 * Bowling statistics with performance indicators
 */
export interface BowlingStats {
  matches: number;
  innings: number;
  wickets: number;
  average: number;
  economy: number;
  strikeRate: number;
  fiveWickets: number;
  bestFigures: string; // "5/32"
  
  // Computed for visualization
  economyPerformance: 'excellent' | 'good' | 'average' | 'poor';
  averagePerformance: 'excellent' | 'good' | 'average' | 'poor';
  economyColor: string;
  averageColor: string;
  economyPercentage: number; // For progress bar
}

/**
 * Performance data point for charts
 */
export interface PerformanceData {
  matchId: string;
  date: Date;
  opponent: string;
  value: number; // Runs scored or wickets taken
  displayLabel: string; // "45 vs AUS"
}

/**
 * Career milestone
 */
export interface Milestone {
  id: string;
  type: 'century' | 'fifty' | 'five-wicket' | 'debut' | 'record';
  date: Date;
  description: string;
  value: number | null;
  iconName: string; // Icon to display
}
```

---

### 5. Navigation State

```typescript
/**
 * Navigation state for responsive behavior
 */
export interface NavigationState {
  // Current route
  activeRoute: string;
  activeSection: string;
  
  // Mobile menu state
  isMobileMenuOpen: boolean;
  isMobileView: boolean; // Based on viewport width
  
  // Scroll state
  scrollPosition: number;
  isScrolledDown: boolean; // True if scrolled > 50px
  
  // Tab state (for match listings)
  activeTab: 'live' | 'upcoming' | 'completed';
}

/**
 * Navigation item
 */
export interface NavItem {
  label: string;
  route: string;
  icon?: string;
  badge?: number; // Count of live matches, etc.
  isActive: boolean;
}
```

---

### 6. User Preferences

```typescript
/**
 * User preferences stored in localStorage
 */
export interface UserPreferences {
  // Theme preference
  theme: ThemeMode;
  useSystemTheme: boolean;
  
  // Animation preferences
  enableAnimations: boolean;
  respectReducedMotion: boolean;
  
  // Accessibility
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  
  // Other preferences
  defaultMatchView: 'grid' | 'list';
  showScoreNotifications: boolean;
}

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  THEME: 'victoryline-theme',
  PREFERENCES: 'victoryline-preferences',
  ONBOARDING_COMPLETE: 'victoryline-onboarding'
} as const;
```

---

### 7. Chart Data Models

```typescript
/**
 * Chart configuration for player stats
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'radar' | 'doughnut';
  data: ChartData;
  options: ChartOptions;
  theme: ThemeMode;
}

/**
 * Chart data structure
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Chart dataset
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

/**
 * Chart options (simplified)
 */
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
    };
  };
  scales?: {
    y?: {
      beginAtZero: boolean;
      ticks?: {
        callback?: (value: number) => string;
      };
    };
  };
}
```

---

### 8. Skeleton Loading Models

```typescript
/**
 * Skeleton loader configuration
 */
export interface SkeletonConfig {
  type: 'match-card' | 'player-profile' | 'chart' | 'text' | 'circle';
  count: number;
  width?: string;
  height?: string;
  animation: 'pulse' | 'shimmer' | 'none';
}

/**
 * Loading state for components
 */
export interface ComponentLoadingState {
  isLoading: boolean;
  loadingText?: string;
  showSkeleton: boolean;
  skeletonConfig: SkeletonConfig;
  error: string | null;
}
```

---

## Data Flow

### Theme Management Flow

```
User Action (Toggle Theme)
  ↓
ThemeService.toggleTheme()
  ↓
Update localStorage
  ↓
Update document.documentElement attribute
  ↓
BehaviorSubject.next(newTheme)
  ↓
Components subscribe to currentTheme$
  ↓
Components update styles via [attr.data-theme]
```

### Match Card Update Flow

```
Backend API (New Score)
  ↓
MatchService.getMatches()
  ↓
Transform to MatchCardViewModel
  ↓
Check if match is live
  ↓
If live: Trigger AnimationService
  ↓
Play score update animation
  ↓
Update UI with new data
```

### Player Stats Chart Flow

```
User navigates to Player Profile
  ↓
PlayerService.getPlayerStats(id)
  ↓
Transform to PlayerStatsViewModel
  ↓
Compute performance indicators
  ↓
Prepare ChartConfig for Chart.js
  ↓
Render chart with theme colors
  ↓
Handle user interactions (hover, click)
```

---

## Validation Rules

### Theme Configuration
- `mode` must be 'light' or 'dark'
- All color values must be valid CSS colors (hex, rgb, hsl)
- Spacing values must include units (px, rem, em)
- Font sizes must be responsive (use rem for accessibility)

### Match Card
- `status` must be one of defined MatchStatus enum values
- `lastUpdated` timestamp required for staleness calculation
- `isLive` derived from `status === MatchStatus.LIVE`
- Score display text formatted consistently: "245/6 (45.3 ov)"

### Player Stats
- Performance indicators ('excellent', 'good', etc.) based on cricket benchmarks:
  - Batting average: >50 (excellent), 40-50 (good), 30-40 (average), <30 (poor)
  - Strike rate: >130 (excellent), 110-130 (good), 90-110 (average), <90 (poor)
  - Bowling economy: <5 (excellent), 5-6 (good), 6-7 (average), >7 (poor)
- Recent form limited to last 10-20 matches
- Milestones sorted by date (descending)

### User Preferences
- Theme preference synchronized with system preference if `useSystemTheme` is true
- Animation preferences respect `prefers-reduced-motion` media query
- LocalStorage keys prefixed with 'victoryline-' to avoid conflicts

---

## Type Guards

```typescript
/**
 * Type guard for MatchStatus
 */
export function isValidMatchStatus(status: string): status is MatchStatus {
  return Object.values(MatchStatus).includes(status as MatchStatus);
}

/**
 * Type guard for ThemeMode
 */
export function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/**
 * Check if match is live
 */
export function isLiveMatch(match: MatchCardViewModel): boolean {
  return match.status === MatchStatus.LIVE;
}

/**
 * Calculate staleness level
 */
export function calculateStaleness(lastUpdated: Date): 'fresh' | 'warning' | 'error' {
  const secondsAgo = (Date.now() - lastUpdated.getTime()) / 1000;
  if (secondsAgo < 30) return 'fresh';
  if (secondsAgo < 120) return 'warning';
  return 'error';
}
```

---

## Summary

This data model defines:
- **8 core interfaces** for UI state and configuration
- **Type safety** with TypeScript interfaces and enums
- **Computed properties** for derived display values
- **Validation rules** for data integrity
- **Data flow patterns** for state management
- **Type guards** for runtime type checking

All interfaces are designed to be serializable for localStorage persistence and compatible with Angular's change detection strategy.
