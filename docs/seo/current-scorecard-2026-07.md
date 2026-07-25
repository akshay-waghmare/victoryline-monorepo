# CrickZen Current SEO Scorecard — July 2026

**Production-evidence score:** **6.2 / 10**
**Confidence:** medium

| Area | Weight | Score | Evidence summary |
|---|---:|---:|---|
| Technical SEO | 15% | 6.5 | HTTPS/host redirects, robots and 404 work; two canonical match pages repeatedly SSR as empty shells. |
| Crawlability and indexation | 15% | 6.0 | Hubs expose SSR match links; child sitemap partitions are too slow/intermittent to validate fully. |
| Canonical and duplicate control | 14% | 7.0 | Hub/query variants and child-match canonicals are correct; sampled player/team templates lack canonicals. |
| Internal linking/entity graph | 12% | 6.0 | Hubs link to matches and matches link to series; sampled match has no SSR team/player links. |
| Match-page intent/usefulness | 12% | 7.0 | One full match and all tested child routes are rich and route-specific; shell fallback blocks other canonical match pages. |
| Structured data | 10% | 6.5 | Hubs/matches/child routes have JSON-LD; sampled player/team templates do not. |
| Performance, SSR, mobile | 12% | 5.0 | Verified 8.7–8.9s fallback renders and large HTML payloads; no field CWV/mobile trace yet. |
| Content quality/topical authority | 6% | 6.0 | Useful discovery and match templates exist; entity pages lack supporting SEO signals in the sample. |
| Measurement/monitoring | 4% | 5.0 | Indexing service is enabled, but no GSC performance, coverage, URL inspection, or CWV evidence was available. |

**Weighted result:** `6.2 / 10`

## Highest-impact blocker

Valid canonical `/cric-live/` URLs can return `200` fallback HTML without an
H1, canonical, or JSON-LD. Fixing that shared SSR failure is the first
controlled gate; do not dilute the batch with metadata clean-up.

## Score boundary

This is an operational SEO quality score, not a Google ranking prediction. It
uses only verified production evidence from `baseline-audit-2026-07.md` and
does not award credit for unverified local source capability.
