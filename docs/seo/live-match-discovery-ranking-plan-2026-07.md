---
title: "Live-match discovery and ranking plan"
date: 2026-07-28
status: baseline
---

# Live-match discovery and ranking plan

## Objective

Make CrickZen's canonical live-match pages and live-score hubs discoverable early, then improve their ability to rank within the first five Google result pages for relevant long-tail queries. A top-five-page position is an external outcome and cannot be guaranteed by an on-site change alone.

## Current production proof

Googlebot probes on 2026-07-28 verified:

| Surface | HTTP | Robots | Canonical | SSR canonical match links |
|---|---:|---|---|---:|
| `/live-score` | 200 | `index,follow` | self | 149 |
| `/live-score/today` | 200 | `index,follow` | self | 62 |
| `/cricket-schedule/today` | 200 | `index,follow` | self | 58 |
| `/matches` | 200 | indexable | self | 55 |

The sitemap index is 200 and references three 200 child shards. The shards contain 2,729 URLs in total, all with `lastmod`; the distribution is 1,000, 1,000, and 729 URLs. The first shard includes the static discovery hubs and current canonical `/cric-live/{slug}` URLs. The canonical live-score page is therefore reachable through both SSR internal links and the sitemap.

## What is proven versus unknown

Proven:

- The main live-score hub is crawlable and indexable.
- Current match pages are linked in raw SSR HTML from multiple hubs.
- Canonical match URLs are published in the sitemap shards.
- Sitemap generation is returning a non-empty index and non-empty shards.

Unknown:

- Google Search Console first-seen, indexed, and query-position data for the live-match URL family.
- Whether each URL is discovered before its match starts.
- Which query families produce impressions and whether the target should be `/live-score`, `/matches`, a series hub, or an individual `/cric-live/{slug}` page.
- Whether the requested top-five-page outcome has been reached.

## Ranking work sequence

1. Connect the Search Console read-only credential and export 28-day page/query data for `/live-score`, `/matches`, `/live-score/today`, `/cricket-schedule/today`, and a representative live-match sample.
2. Compare first-seen timestamps against sitemap `lastmod` and SSR hub exposure for fixtures 12–48 hours before start.
3. Prioritise the query families that already have impressions: team-vs-team live score, tournament live score, scorecard, toss, playing XI, and venue/result variants.
4. Keep `/cric-live/{slug}` as the canonical match surface. Improve links and content depth on the matching hub or series page before introducing route aliases.
5. Recheck Googlebot HTML, sitemap presence, and Search Console position after each release. Treat external backlinks, freshness, and competitor authority as separate ranking inputs.

## Current recommendation

Do not change the canonical route or add duplicate live-match aliases yet. The technical discovery gate is currently green; the next high-value action is Search Console evidence and a controlled query-to-page mapping. If the data shows impressions but poor position, improve page intent and internal anchor context. If it shows no discovery before start, fix lifecycle timing and hub exposure first.

## Intent alignment release

Frontend commit `e036f98` updates `/live-score` to use the explicit intent language `Live Cricket Matches & Scores Today` in its title/H1, with matching intro and FAQ copy. It preserves the self-canonical, `index,follow`, seven JSON-LD blocks, and 149 SSR canonical match links.

Production image `macubex/victoryline-frontend:20260728-live-match-intent-e036f98` is healthy. A Googlebot probe returned HTTP 200 and confirmed the new title/H1, self-canonical, `index,follow`, 149 match links, and a 200 sitemap child containing the hub plus 990 canonical match URLs.

## Search Console verification (2026-07-28)

Read-only checks were performed in the verified `https://www.crickzen.com/` property:

- URL Inspection reports `https://www.crickzen.com/live-score` as **URL is on Google** and **Page is indexed**. HTTPS and one Breadcrumbs item are valid.
- The submitted `/sitemap.xml` is `Success`, last read 28 Jul 2026, with 2,730 discovered pages. The first child shard is also `Success` with 1,000 discovered pages.
- With an exact page filter for `/live-score` over the three-month report window (26 Apr–25 Jul 2026), Search Console reports 1 click, 20 impressions, 5% CTR, and average position **29.2**. That is within the requested first five result pages for the page's observed impressions.
- The query `br vs sgr live score` produced 62 clicks, 644 impressions, 9.6% CTR, and average position **5.8**. Its page breakdown shows two canonical `/cric-live/{slug}` URLs, proving that live-match pages can rank in the first result page for a relevant match-intent query.

These measurements prove indexing and first-five-page visibility for the observed page/query samples; they do not prove every match URL or every broad query ranks in the first five pages. For example, the low-volume exact `/live-score` query sample `cricket live score live match` was position 90 (one impression) in the same historical window. The new title/H1 release post-dates most of that window, so the next checkpoint must use a fresh 28-day report after Google has recrawled the release.
