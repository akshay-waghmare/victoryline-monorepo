# SEO Impression Drop Investigation - June 10, 2026

## Executive Finding

The impression decline is real, but the June 2-9 SEO changes did not initiate it. Search Console shows the first major drop on May 30, before those changes were deployed.

The primary recovery problem is time-sensitive match discovery and indexing:

- May 23-29: 3,363 impressions across seven days, averaging 480/day.
- May 30-31: 598 impressions, averaging 299/day.
- June 1-7: 32 impressions, averaging 4.6/day.
- Pages receiving impressions fell from 43 on May 29 to 7 on June 1.
- Only 7 of 15 match URLs currently linked from the homepage were indexed when inspected on June 10.
- The other 8 were either `Discovered - currently not indexed` or unknown to Google.

This is not evidence of a site-wide manual penalty. The highest-impression May match URLs are still reported as submitted and indexed, with successful fetches and Google-selected self-canonicals.

## What Went South

### 1. New match pages miss their short search-demand window

Cricket match queries peak shortly before and during a match. Current match pages are technically valid and sitemap-listed, but more than half of the sampled homepage match URLs had not been indexed. Once a match ends, much of its potential impression demand is gone.

The current sitemap contains 1,989 match URLs across 20 partitions. Before this recovery change, the source API order determined partition order, so live and upcoming pages could be buried behind historical matches.

### 2. Discovery hubs sent weak and conflicting canonical signals

Production audit findings before recovery:

- `/`, `/matches`, and `/live-cricket-score` rendered without canonical tags.
- `/` and `/live-cricket-score` shared title and description.
- Google classified `https://www.crickzen.com/` as a page with redirect and selected the apex homepage.
- Google classified `/live-cricket-score` as a duplicate without a user-selected canonical.
- Google classified `/matches` as a soft 404 based on its older crawl.
- Both apex and `www` hosts returned `200`, while sitemaps and match canonicals used `www`.

These signals do not directly deindex every match page, but they weaken the hubs Google relies on to discover new match links.

### 3. SSR reliability made discovery intermittent

The Angular SSR migration on May 18 introduced an 8-second fallback that could return a bare app shell. Listing pages also enriched every active match with scorecard requests during SSR, making timeout shells more likely as the active-match set grew.

This vulnerability existed during the strong May 23-29 period, so it cannot alone explain the exact May 30 cliff. It is a strong contributing mechanism because a crawler receiving the fallback shell sees no useful H1 or match links. The server-side scorecard enrichment was removed on June 9, and 30 repeated production renders subsequently returned complete SSR HTML.

### 4. Search demand volatility amplified the visible drop

May 29 was unusually strong. The query `bot vs ken` alone generated 1,018 impressions, and one corresponding page generated 1,057 impressions. Demand volatility explains part of the peak, but it does not explain the collapse from dozens of impression-earning pages to single digits.

## Timeline And Causality

- May 18: Angular SSR and the 8-second shell fallback were introduced.
- May 23-29: strong Search Console window.
- May 30: impressions dropped to 342; no SEO commit was deployed that day.
- June 1: impressions dropped to 14.
- June 2-3: long-tail metadata, canonical, and indexing changes were deployed after the decline had already started.
- June 9: listing SSR timeout cause was removed; sitemap duplication and invalid URL issues were cleaned.
- June 10: Search Console investigation identified the new-page indexing gap and hub canonical conflicts.

The June SEO work did not start the decline. It exposed and partially corrected older crawlability debt, but recovery was limited because new match discovery remained too slow.

## Recovery Changes

- Render `/` directly instead of client-redirecting it to `/Home`.
- Redirect apex URLs to the canonical `www` host.
- Redirect `/Home` and `/live-cricket-score` aliases to `/`.
- Add explicit self-canonicals and unique metadata to `/` and `/matches`.
- Prioritize live, upcoming, and recent matches into the earliest sitemap partitions.
- Increase sitemap partition size from 100 to 1,000 URLs so all current live/upcoming matches stay in the first crawl batch.
- Add a reusable Search Console analytics and URL-inspection utility to the SEO health audit workflow.

## Verification And Monitoring

Deployment acceptance:

- Apex and homepage aliases return permanent redirects to `https://www.crickzen.com/`.
- `/` and `/matches` return full SSR HTML with one canonical, one H1, and crawlable match links.
- Sitemap partition 1 contains current live matches.
- Repeated discovery-page SSR checks have no shell fallbacks.
- Sitemap submission succeeds with no warnings or errors.

Recovery monitoring:

- Re-query Search Console daily for impressions, impression-earning page count, and current homepage URL inspection.
- Expect indexing/discovery signals to improve before impressions; rankings and impressions can lag several days.
- Treat current homepage URLs below an 80% indexed rate as an incident.
