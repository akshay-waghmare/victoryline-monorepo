export interface LiveHeroColorTokens {
  surface: string;
  podSurface: string;
  accentPrimary: string;
  accentWarning: string;
  accentError: string;
  textPrimary: string;
  textSecondary: string;
  separator: string;
}

export interface LiveHeroSpacingTokens {
  gapLg: string;
  gapMd: string;
  gapSm: string;
  radiusLg: string;
  radiusSm: string;
}

export interface LiveHeroShadowTokens {
  elevation: string;
}

export interface LiveHeroTokens {
  color: LiveHeroColorTokens;
  spacing: LiveHeroSpacingTokens;
  shadow: LiveHeroShadowTokens;
}

export const LIVE_HERO_TOKENS: LiveHeroTokens = {
  color: {
    surface: 'var(--color-background-elevated)',
    podSurface: 'var(--color-background)',
    accentPrimary: 'var(--color-primary)',
    accentWarning: 'var(--color-warning)',
    accentError: 'var(--color-error)',
    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    separator: 'var(--color-border)'
  },
  spacing: {
    gapLg: 'var(--spacing-xl)',
    gapMd: 'var(--spacing-lg)',
    gapSm: 'var(--spacing-sm)',
    radiusLg: 'var(--border-radius-lg)',
    radiusSm: 'var(--border-radius-sm)'
  },
  shadow: {
    elevation: 'var(--shadow-xl)'
  }
};
