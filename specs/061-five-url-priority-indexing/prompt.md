# Execution prompt: five priority match URLs

Act as CrickZen's senior technical SEO and production engineer. Diagnose and improve discovery for canonical match pages at `/cric-live/{slug}` without claiming that any search engine can be forced to index a URL.

Build one auditable priority cohort containing exactly five eligible URLs whenever at least five eligible matches exist:

1. Include every currently managed live match first. `liveFeedManaged=true` is mandatory; unmanaged provider matches must not enter the priority cohort.
2. Preserve the sticky managed-live slate until each match reaches a terminal lifecycle.
3. Fill remaining slots with the nearest future `UPCOMING` matches that have a valid canonical slug and future schedule.
4. Publish the cohort as the first named sitemap, `/sitemaps/sitemap-priority-0001.xml`, while retaining existing lifecycle and legacy sitemap partitions.
5. Ensure the same URLs are crawlable through raw server-rendered internal links. Each URL must return 200 with one self-canonical, one H1, `index,follow`, useful match facts, and JSON-LD. Breadcrumb and Article JSON-LD must not disappear when venue is unknown; SportsEvent must remain conditional on reliable time and venue.
6. Keep Google's ordinary SportsEvent Indexing API notifications disabled. Submit the normal sitemap to Google Search Console.
7. Add opt-in IndexNow batch submission for the five priority URLs, host its verification key at the site root so it authorizes `/cric-live/*`, avoid duplicate submissions more often than the configured interval, expose redacted operational status, and accept only canonical `www.crickzen.com` URLs.
8. Prove production on the exact five URLs, the priority sitemap, two raw SSR discovery surfaces, the IndexNow key URL, and an accepted IndexNow response. Report submission/crawlability separately from actual search-engine indexing.
9. Preserve unrelated dirty-tree work, production volumes, and the three-match scraper cap. Document the final contract and evidence in the CrickZen wiki.

Acceptance language must be exact: CrickZen guarantees technical eligibility and accepted discovery submissions for five URLs. Google, Bing, and other engines independently decide whether and when to crawl or index them.
