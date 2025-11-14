/**
 * Theme Configuration Models
 *
 * TypeScript interfaces for theme system, including colors, spacing, typography, and shadows.
 * Used by ThemeService to manage light/dark mode configurations.
 */

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Type guard to check if a value is a valid ThemeMode
 */
export function isThemeMode(value: any): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

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

/**
 * User theme preferences (stored in localStorage)
 */
export interface ThemePreferences {
  mode: ThemeMode;
  useSystemTheme: boolean;
  animationsEnabled: boolean;
}
