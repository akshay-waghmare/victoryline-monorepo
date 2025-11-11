# Crickzen SEO Optimization — Quickstart

This guide helps you verify the SEO feature end-to-end on your local/dev/stage environments before production.

## Prerequisites
- Node.js 18 LTS or 20 LTS, npm 9+ (or pnpm 8+)
- Java 11+ (for Spring Boot backend)
- Python 3.9+ (for scraper if needed)
- Chrome 118+ (for Lighthouse + Rich Results testing)
- Canonical host for prod: https://www.crickzen.com

## Key Outcomes (what “done” looks like)
- Canonical URLs and meta tags render correctly via SSR for all indexable pages.
- JSON-LD validates for Match, Team, Player, and Breadcrumbs.
- Sitemaps and robots.txt are served and reflect live/current content policies.
- OG images meet 1200×630 with safe margins and correct cropping per FR-042.
- Lighthouse Performance ≥ 75, SEO ≥ 90, Accessibility ≥ 90 on critical pages.

## Start Services (typical local flow)
- Backend (Spring Boot): run locally or via docker-compose (see repo docs).
- Frontend (Angular SSR/Universal): ensure SSR dev server is running.
- Scraper: optional for live data; static fixtures are fine for smoke tests.

Note: If SSR isn’t wired yet, you can still verify API outputs (sitemap, robots, JSON-LD) and metadata debug endpoints from the backend.

## Verify robots.txt (FR-033..FR-037)
- URL: /robots.txt (public) or /api/v1/seo/robots (backend)
  - Expected:
    - Disallow facets/filters as per policy.
    - Crawl-delay if configured (optional).
    - Sitemap: https://www.crickzen.com/sitemap.xml (gzipped index) pointing to partition files like https://www.crickzen.com/sitemaps/sitemap-matches-0001.xml.gz.

## Verify Sitemaps (FR-038..FR-040)
- URLs:
  - Public index: https://www.crickzen.com/sitemap.xml (Content-Type: application/x-gzip)
  - Public partitions: https://www.crickzen.com/sitemaps/sitemap-matches-0001.xml.gz (and others)
  - Admin/API: /api/v1/seo/sitemap and /api/v1/seo/sitemap?part=1,2,... (XML)
- Expectations:
  - <loc> uses the canonical host https://www.crickzen.com for all entries.
  - <lastmod> present with ISO 8601 timestamps.
  - Only core live/current content per policy is included.
  - Debounce is ~5s; burst capped to ≤30 writes/min to prevent thrash.

## Verify Canonical & Meta Tags (FR-001..FR-011, FR-041)
- Open a Player, Team, and Match page.
- View Source and check:
  - <link rel="canonical" href="https://www.crickzen.com/..." />
  - <meta name="description" ...>, sensible and unique.
  - Open Graph: og:title, og:description, og:image, og:url.
  - Twitter Card: twitter:card=summary_large_image.
- Match page URL rules:
  - Live URL can be ephemeral but must canonicalize to the final season-scoped URL (FR-041).
  - Final URL includes: tournament + season + teams + format + date (FR-012).
 - After completion: live page remains indexable (~7 days) then flips to noindex,follow via job for consolidation.

## Verify JSON-LD Structured Data (FR-013..FR-020)
- For quick inspection, call backend debug endpoints:
  - GET /api/v1/seo/structured-data/match/{id}
  - GET /api/v1/seo/structured-data/player/{id}
  - GET /api/v1/seo/structured-data/team/{id}
- Paste JSON-LD into Google Rich Results Test.
- On-page, ensure <script type="application/ld+json"> is present for SSR pages.
- BreadcrumbList should reflect the site hierarchy.
 - Snapshot tests: ensure JSON-LD fixtures (match/player/team/breadcrumb) produce stable outputs.

## Verify OG Images (FR-042)
- Sizes: 1200×630; safe margins for logos and text (no edge cropping on Facebook/Twitter/WhatsApp).
- Use POST /api/v1/seo/og-image with body { type: "match|player|team", id: "..." } to regenerate.
- Confirm social preview via:
  - https://developers.facebook.com/tools/debug/
  - https://cards-dev.twitter.com/validator

## Lighthouse and Accessibility
- Run Lighthouse in Chrome DevTools on:
  - Home, Live Match, Final Match, Player Profile, Team Page
- Targets/Budgets:
  - SEO ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90
  - Performance: LCP ≤ 2.5s (mobile), INP ≤ 200ms, CLS ≤ 0.1
  - TTFB p95 ≤ 600ms on match SSR pages (use k6 or autocannon in CI)
- Accessibility: validate basic keyboard navigation, color contrast, and labels.

## URL Policy Checks
- Pagination and filters: ensure noindex + canonical to base listing (FR-035..FR-037).
- Only core live/current content should be indexable; archives per policy.
- Ensure redirects/enforced canonical host (https://www.crickzen.com) in stage/prod.

## SSR Scope & Guardrails
- SSR enabled for match, team, and player routes only (Phase 1); other routes remain CSR.
- Hydration error logging enabled in both server and browser consoles.
- Fallback to CSR if SSR render fails for a request.

## Cache Policy Verification
- Check Cache-Control headers by page state:
  - live: max-age=5, stale-while-revalidate=55
  - scheduled: max-age=60
  - completed: max-age=3600

## Troubleshooting
- Canonicals missing or wrong host: verify SSR and environment config for HOST_BASE.
- JSON-LD invalid: validate schema types and required fields, escape HTML safely.
- OG images cropped incorrectly: re-render with safe margins; verify 1.91:1 ratio.
- Sitemap too large: ensure partitioning; check lastmod updates and debounce settings.

## References
- Spec: specs/003-seo-optimization/spec.md
- Plan: specs/003-seo-optimization/plan.md
- Contracts (OpenAPI): specs/003-seo-optimization/contracts/seo-openapi.yaml
