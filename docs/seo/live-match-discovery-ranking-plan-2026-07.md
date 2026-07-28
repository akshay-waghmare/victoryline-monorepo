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
