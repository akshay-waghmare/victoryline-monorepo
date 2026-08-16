# Implementation record

## Delivered

- Full rich-document SSR cache for canonical match routes. A cache hit returns the exact already-rendered HTML, including score, lifecycle text, JSON-LD, scorecard, links, and transfer state.
- Canonical catalogue owner selection prefers a format-specific URL such as `1st-test` over a lossy `1st-match` sibling for the same stable CREX key. Static facts are merged across aliases before lifecycle classification.
- `LIVE_MATCH` persists `seo_content_fingerprint` and `seo_content_modified_at`. The timestamp advances only when visible match content changes, not for retry counters or polling timestamps.
- Sitemap `lastmod` uses the semantic timestamp. The public index emits `live`, `upcoming`, `recent`, and `archive` cohort shards, while old numbered shards remain servable for crawler compatibility.

## Local validation

- `mvn -q -f apps/backend/spring-security-jwt/pom.xml -DskipTests compile`
- `npm --prefix apps/frontend run build`
- `mvn -q -f apps/backend/spring-security-jwt/pom.xml "-Dtest=SitemapPartitionTest,SitemapControllerTest,SitemapFreshnessLastmodTest" test`

## Production gate

Verify AUS–BAN has one 301 owner; API, SSR, JSON-LD, and sitemap agree on innings break; one cohort entry has semantic `lastmod`; and the second SSR request reports `X-SSR-Document-Cache: hit` below two seconds.

## Rollout update — 2026-08-16

- Backend image `macubex/victoryline-backend:20260816-cohorts-r2` is healthy in production.
- Frontend image `macubex/victoryline-frontend:20260816-cohorts-r3` is healthy in production. The intermediate r2 frontend was rolled back after Node 12 rejected optional chaining; r3 removes that runtime incompatibility.
- Public `/sitemap.xml` returned HTTP 200 and parsed as XML. The index advertises named lifecycle cohorts.
- Public `/api/cricket-data/match-cohorts` returned HTTP 200 with live, upcoming, recent, and archive buckets.
- The canonical AUS–BAN route returned HTTP 200 with the full rich document and `X-SSR-Document-Cache: hit` on warm requests. The exact 301 alias and lifecycle-content proof remain a follow-up assertion to capture in the next canary run.
