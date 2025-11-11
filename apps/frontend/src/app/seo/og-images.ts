export const OG_STANDARD = { width: 1200, height: 630 } as const;
export const OG_DEFAULT = '/assets/og/crickzen-default-1200x630.jpg';

// In Phase 1 (MVP), we return static curated assets. Later we can map by entity.
export function getOgImageForMatch(_matchId: string): string {
  return OG_DEFAULT;
}

// Helpers for future expansion
export function isOgSizeStandard(width: number, height: number): boolean {
  return width === OG_STANDARD.width && height === OG_STANDARD.height;
}
