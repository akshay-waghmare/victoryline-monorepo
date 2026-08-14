# Verification quickstart

1. Select an exact upcoming source row in the existing 12–48-hour window; do not invent a model row if the opening artifact is absent.
2. Run the scraper parser tests and backend/frontend focused tests for the changed surfaces.
3. Run `scripts/Assert-LiveMatchCohortReadiness.ps1` and the existing canonical SSR guard against the real public URL.
4. Confirm normal and Googlebot HTML: 200, self-canonical, `index,follow`, one H1, visible team/schedule/venue facts, and no stale 0/0 score on an upcoming page.
5. Confirm the match sitemap and server-rendered hub links, then record `sitemapFirstSeenAt` and `ssrLinkFirstSeenAt` in the StartupOS cohort ledger.
6. At T−24/T−6/T−1 and T+24–72, record explicit GSC URL Inspection observations. Keep `pending_gsc_timed_evidence` until evidence is supplied.
7. Evaluate the 90% rule only after three fixed cohorts. If technical readiness is below 90%, fix data/SSR first; if discovery is below 90%, fix crawl paths/sitemap freshness; if indexing is below 90% after discovery, improve visible value and cohort quality.
