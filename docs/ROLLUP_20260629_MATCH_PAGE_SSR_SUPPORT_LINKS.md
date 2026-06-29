# Match Page SSR Support Links Rollout

Date: 2026-06-29
Branch: `008-match-title-seo`

## Summary

This rollout hardens the canonical `/cric-live/{slug}` page and connected hub surfaces so preview, live-update, and result-support URLs remain crawlable in SSR HTML.

## Scope

- Canonical match page support-link surfacing
- Scorecard, lineups, and match-detail section support links
- SSR-safe slug fallback for freshness-support URLs
- Archive hub result-retention links
- Focused lifecycle/spec coverage for support-link behavior

## Files

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.css`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.lifecycle.spec.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.html`
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.spec.ts`
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.ts`
- `apps/frontend/src/app/seo/match-freshness-links.spec.ts`
- `apps/frontend/src/app/seo/match-freshness-links.ts`

## Verification

- `tsc -p apps/frontend/src/tsconfig.app.json --noEmit`
- `tsc -p apps/frontend/tsconfig.server.json --noEmit`
- `npm run build:ssr`
- Local SSR fetch:
  - `http://127.0.0.1:4000/cric-live/pak-w-vs-sa-w-11th-match-womens-t20-world-cup-2026-match-updates-X0Z`
- Raw SSR HTML checks:
  - canonical present
  - one `h1`
  - `og:image` present
  - JSON-LD present
  - `/cricket-match-preview/` present
  - `/cricket-live-updates/` present
  - `/cricket-match-report/` present

## Outcome

The final SSR pass exposed preview, live-update, and result-support URLs in raw HTML for canonical match pages, which closes the earlier gap where section-level support links existed in component logic but not in bot-visible SSR output.
