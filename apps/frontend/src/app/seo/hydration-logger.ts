// Lightweight helper to log hydration errors without breaking UX
export function logHydrationError(err: any): void {
  // eslint-disable-next-line no-console
  console.error('[Hydration] error', err);
}
