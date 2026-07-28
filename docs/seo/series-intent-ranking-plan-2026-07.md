---
title: "Series-intent discovery and ranking plan"
date: 2026-07-28
status: in-progress
---

# Series-intent discovery and ranking plan

## Objective

Make the named series links above the homepage match cards crawlable as distinct series-intent pages, then verify that the `/series` hub and representative current-series pages can rank within Google's first five result pages.

## Baseline evidence

Before the release, the homepage exposed six named series labels but every one used `href="/series"` and cancelled navigation in `selectSeries()`. This created repeated anchors to the generic hub rather than links to the named series surfaces.

Production checks on 2026-07-28 showed:

- `/series` returned 200, self-canonical SSR HTML, title `Cricket Series, Tournaments, Tables & Standings | Crickzen`, and H1 `Series & tournaments`.
- `/series/current/england-one-day-cup-2026` returned 200 with a self-canonical and series-specific title `england one day cup 2026 Fixtures, Table & Stats | Crickzen`.
- Search Console page-filter data for `/series` reported 10 impressions and average position **3.4** in the 26 Apr–25 Jul three-month window.
- Search Console URL Inspection reported `/series/current/england-one-day-cup-2026` as **URL is not on Google**, **URL is unknown to Google**, with no referring sitemap or page.

## Implementation

The homepage now maps each named series link to `/series/current/{slug}` using the same stable slug convention as the series surface and preserves the visible series selection state. No additional homepage `ItemList` schema is emitted: CrickZen already has several list schemas, and the visible, crawlable anchors are the direct discovery signal without increasing Rich Results carousel risk.

Frontend commit `6290bce` is deployed as `macubex/victoryline-frontend:20260728-series-links-6290bce` (healthy in production). A Googlebot probe after rollout found six distinct `/series/current/{slug}` anchors above the homepage cards. All six sampled destinations returned 200, `index,follow`, self-canonicals, and series-specific titles/H1s. The homepage JSON-LD count remained six; no new carousel list schema was introduced.

Search Console indexing was requested for `/series/current/england-one-day-cup-2026`; Google confirmed the URL was added to its priority crawl queue. This is a crawl request, not proof of indexing or ranking yet.

On the follow-up live URL test at 16:19 on 28 Jul 2026, Google reported **URL is available to Google** and **Page can be indexed**, with one valid Breadcrumbs item. Standard URL Inspection still reported **URL is not on Google / URL is unknown to Google**, confirming that the remaining step is Google’s indexing queue rather than a robots, canonical, SSR, or fetch failure.

This keeps `/series` as the general hub and gives each named competition a distinct crawl path without aliases or canonical changes.

## Verification gate

- Googlebot homepage HTML contains distinct `/series/current/{slug}` anchors whose visible labels match the series names.
- Each sampled current-series URL returns 200, self-canonical, indexable SSR HTML with a series-specific title and H1.
- Existing homepage JSON-LD remains unchanged, with no new empty or duplicate series `ItemList`.
- Search Console URL Inspection changes from unknown to indexed for a representative current-series URL.
- Search Console page/query data shows the `/series` hub or representative current-series URL at average position ≤50 for a relevant series-intent query.

Ranking is an external outcome; the release proves crawl-path and intent alignment first, then the fresh Search Console window supplies the ranking evidence.
