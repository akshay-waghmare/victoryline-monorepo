# Match Discovery and Crawl Graph Rollout

## Scope Status

- Phase 1 spec artifacts were created in `specs/018-match-discovery-link-graph/`.
- The frontend discovery-link slice was deployed to production.
- The backend sitemap-freshness slice remains local-only and has not been deployed yet.
- The local audit-script source update also remains local-only.

## Deployed Production Slice

- Date: `2026-06-07`
- Branch: `008-match-title-seo`
- Commit: `6232172`
- Frontend image: `victoryline-frontend:phase1-links-6232172-20260607-210708`
- Production service: `frontend`

## What Is Live

- Homepage SSR now exposes a compact direct-link cluster for canonical match URLs.
- `/matches` now exposes a compact direct-link cluster for canonical match URLs.
- Shared frontend href generation keeps match cards and discovery surfaces aligned on `/cric-live/{slug}` links.

## Local Verification

- `.\node_modules\.bin\tsc.cmd -p .\src\tsconfig.app.json --noEmit` passed in `apps/frontend`.
- `.\node_modules\.bin\tsc.cmd -p .\tsconfig.server.json --noEmit` passed in `apps/frontend`.
- `mvn -Dtest=SitemapPartitionTest test` passed in `apps/backend/spring-security-jwt`.

## Production Deployment Verification

- `FRONTEND_IMAGE=victoryline-frontend:phase1-links-6232172-20260607-210708` is pinned in the production `.env`.
- `docker compose -f docker-compose.prod.yml ps frontend` showed `victoryline-frontend` running healthy on 2026-06-07.

## Production SEO Verification

Fresh production audit on 2026-06-07:

| URL | Status | InternalMatchLinks | Notes |
|-----|--------|--------------------|-------|
| `https://www.crickzen.com/` | `200` | `24` | Match-link discovery block is present in SSR HTML. |
| `https://www.crickzen.com/matches` | `200` | `24` | Match-link discovery block is present in SSR HTML. |

The audit still reports `INVALID_NOT_NOINDEX` on those two non-match pages because the script also applies match-page-oriented robots checks. That flag does not change the core Phase 1 result: production is now exposing internal canonical match links on both key discovery surfaces.

## Remaining Follow-Up

- Deploy the backend sitemap-freshness changes so live-match `lastmod` uses `lastStateUpdatedAt` in production.
- Deploy the updated audit-script source when we want repo-local production audits to match the latest link-reporting logic by default.

## Ahrefs Follow-Up Audit

Fresh production audit on `2026-06-09` after Ahrefs reported new crawl reasons:

- The sitemap index exposed `1,988` entries but only `1,981` unique URLs.
- Exactly `7` canonical match URLs were duplicated across sitemap partitions.
- `https://www.crickzen.com/blog` was present in partition 1 but returned `404`; the Angular router has no `/blog` route.
- Sampled canonical match URLs from the first two partitions returned `200`.
- Production still exposes `24` direct canonical match links from both the homepage and `/matches`, while the sitemap contains about `1,985` match URLs. This explains why Ahrefs can classify most historical match pages as orphaned even though they are sitemap-discoverable.
- Match child aliases such as `/scorecard` intentionally canonicalize to the base `/cric-live/{slug}` page. GSC's "Alternative page with proper canonical tag" classification is expected for aliases that Google already discovered.

Local backend changes now:

- remove the unrouted `/blog` URL from sitemap generation;
- deduplicate canonical locations before partition slicing;
- calculate partition count from distinct canonical match paths;
- preserve the existing honest live-match `lastmod` work.

Verification:

- `mvn -Dtest=SitemapPartitionTest test` passed with `10` tests on `2026-06-09`.

Still requires an Ahrefs affected-URL export before template changes:

- the shared `166`-URL group reported for no outgoing links, duplicate pages without canonical, missing H1, and low word count;
- the `164` duplicate-without-canonical URLs;
- the `297` short meta descriptions.
