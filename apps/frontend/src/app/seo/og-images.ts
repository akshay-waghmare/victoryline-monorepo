// Avoid TS 3.4+ 'as const' to remain compatible with TypeScript ~3.2
export const OG_STANDARD: { width: number; height: number } = { width: 1200, height: 630 };
export const OG_DEFAULT = '/assets/og/crickzen-default-1200x630.jpg';

// In Phase 1 (MVP), we return static curated assets. Later we can map by entity.
export function getOgImageForMatch(_matchId: string): string {
  return OG_DEFAULT;
}

// Helpers for future expansion
export function isOgSizeStandard(width: number, height: number): boolean {
  return width === OG_STANDARD.width && height === OG_STANDARD.height;
}
