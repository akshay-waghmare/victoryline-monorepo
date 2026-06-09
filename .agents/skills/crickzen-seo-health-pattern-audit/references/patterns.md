# Crickzen SEO Pattern Reference

## Correlated Issue Patterns

| Evidence cluster | Likely shared cause | First checks |
|---|---|---|
| Missing H1 + no outgoing links + low word count + missing canonical on similar URLs | Bare Angular shell or broken SSR template family | Repeat raw HTML requests; compare response bytes; inspect frontend SSR timeout logs |
| Sitemap total exceeds unique total | Duplicate source records or no deduplication before partition slicing | Group all sitemap locations; inspect source feed duplicates |
| 4XX page in sitemap | Removed/unrouted static page or stale match URL | Test exact URL; compare router and sitemap static entries |
| Large orphan count close to sitemap match count | Historical match URLs lack incoming SSR links | Compare sitemap match count with homepage and `/matches` direct-link counts |
| Alternative page with proper canonical | Usually intentional match alias folding | Ensure alias is absent from sitemap and internal links; retain base canonical |
| Noindex page reported by GSC | Often intentional unresolved/thin page policy | Verify page should truly be indexable before changing robots |
| Correct match pages but thin `/`, `/matches`, or `/live-cricket-score` | Discovery surfaces failing SSR | Inspect repeated responses and `[SSR] Render timed out` logs |
| Discovery routes share title/description or omit canonical | Duplicate discovery intent is unclear | Define self-canonical or alias policy and unique metadata per indexable route |
| Successful discovery renders approach 8 seconds | SSR has too little timeout headroom | Remove blocking per-item API work from listing SSR |
| Sitemap `lastmod` changes on every request | Dishonest freshness signal | Verify source-state timestamps drive `lastmod` |

## Known Healthy Signals

- `/`, `/matches`, and `/live-cricket-score` repeatedly return full SSR HTML with one H1 and direct match links.
- Canonical match pages return `200`, one self-canonical, one H1, at least one JSON-LD block, and no `noindex`.
- Child aliases can canonicalize to the base match URL, but should not appear in sitemap/internal discovery links.
- The sitemap index may change as matches arrive, but every emitted URL must remain unique and indexable.

## Priority

1. Stop bare-shell SSR and sitemap 4XX/duplicate emission.
2. Fix indexability/canonical defects on canonical match URLs.
3. Improve internal discovery coverage for historical match pages.
4. Improve descriptions and content depth after technical crawl health is stable.
