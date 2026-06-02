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

## GSC Validation Rule

Submit Search Console validation only after production audit shows:

- Valid `/cric-live/{slug}` pages have exactly one self-canonical URL.
- Unresolved numeric/fallback URLs are `noindex,follow` or return 404.
- Sitemap partitions exclude numeric/non-canonical match URLs.
- Match pages do not emit placeholder/fake JSON-LD.
