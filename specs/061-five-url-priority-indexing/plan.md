# Plan: five-URL priority indexing lane

## Outcome

Maintain a small, current crawl target that search engines can discover before and during matches, with managed live pages always taking precedence.

## Implementation

1. Extend the SEO match DTO with `liveFeedManaged` and derive a deterministic five-URL cohort: managed live first, nearest future upcoming second.
2. Add the priority cohort as the first named sitemap without removing existing static, live, upcoming, recent, archive, or numbered partitions.
3. Make fallback SSR emit Breadcrumb and Article JSON-LD for every indexable match; add SportsEvent only when start time and venue are trustworthy.
4. Add an environment-controlled IndexNow client, scheduler, key endpoint, manual trigger, and redacted status endpoint.
5. Keep Google Indexing API notifications off for ordinary match pages and submit the standard sitemap through Search Console.

## Production gates

- `/sitemap.xml` lists `/sitemaps/sitemap-priority-0001.xml` first.
- Priority sitemap has five unique canonical URLs when five eligible matches exist.
- Every managed live URL is included before upcoming fillers; unmanaged live URLs are excluded.
- Each priority URL returns 200, one canonical, one H1, no `noindex`, and at least one JSON-LD script in raw HTML.
- The exact priority URLs appear as raw anchors on the homepage and a live/schedule hub.
- The IndexNow key URL returns the configured key and a batch POST receives HTTP 200 or 202.
- GSC sitemap submission succeeds; Google Indexing API remains disabled.
- Follow-up monitoring records observed indexing separately for Google and Bing. No deployment is described as an indexing guarantee.

## Rollback

Disable `INDEXNOW_ENABLED`, restore the previous backend/frontend image pins, and retain the existing lifecycle sitemap partitions. The priority sitemap is additive and does not change canonical ownership.
