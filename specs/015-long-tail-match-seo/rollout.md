# Long-Tail Match SEO Rollout

## Scope

- Removed the static homepage canonical from the Angular shell.
- Added route-level match canonical, robots, title, description, Open Graph, and Twitter tags.
- Added one SSR-rendered H1 and crawlable match context summary per match page.
- Set unresolved numeric/fallback routes such as `/cric-live/445` to `noindex,follow`.
- Filtered sitemap match URLs to canonical cricket slugs only; numeric/id-only fallback paths are excluded.
- Removed the static global `SportsEvent` JSON-LD block so match pages do not emit fake schema.
- Added `scripts/Audit-MatchSeo.ps1` for local and production verification.

## Local Verification

- `NODE_OPTIONS=--openssl-legacy-provider npm run build:ssr` passed in `apps/frontend`.
- `mvn "-Dtest=SitemapPartitionTest" test` passed in `apps/backend/spring-security-jwt`.
- `scripts/Audit-MatchSeo.ps1` passed against local SSR on sample GSC URLs.
- Local audit output saved to `specs/015-long-tail-match-seo/local-audit.md`.

## Production Deployment

- Commit: `34fe317`
- Backend image: `victoryline-backend:seo-34fe317-20260602-1512`
- Frontend image: `victoryline-frontend:seo-34fe317-20260602-1512`
- Env backup: `.env.bak.seo-seo-34fe317-20260602-1512-20260602_151938`
- Production audit output saved to `specs/015-long-tail-match-seo/prod-audit.md`.
- Public `/api/ws/info` and `/api/cricket-data/live-matches` returned HTTP 200 after restart.
- Sitemap partition check confirmed `/cric-live/445` is excluded and canonical `-vs-` match URLs remain included.

## GSC Validation Rule

Submit Search Console validation only after production audit shows:

- Valid `/cric-live/{slug}` pages have exactly one self-canonical URL.
- Unresolved numeric/fallback URLs are `noindex,follow` or return 404.
- Sitemap partitions exclude numeric/non-canonical match URLs.
- Match pages do not emit placeholder/fake JSON-LD.
