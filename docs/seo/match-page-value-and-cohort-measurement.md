# CrickZen match-page value and cohort measurement

Version: `match-page-value-v1`

## Purpose

Measure whether the canonical `/cric-live/{slug}` page is both discoverable and useful enough to justify continued crawling. This is an operational measurement contract, not a claim that any one threshold is a Google ranking rule.

## Lifecycle gates

| Cohort | Minimum server-rendered value | Disallowed content |
| --- | --- | --- |
| Upcoming | teams, series, and a future schedule; venue is included when verified | unsupported predictions or invented match facts |
| Live / innings break | teams, series, and a verified current score or scorecard; a scorecard, performer, key-event, or score signal is recorded when available | stale `0/0`, placeholders, temporary loading copy |
| Recent / completed | teams, series, and a verified result; a score, scorecard, performer, or verified key-event signal is recorded when available | resultless terminal shells or copied generic text |

Every cohort also needs HTTP 200, one self-canonical URL, `index,follow`, one H1, a lifecycle answer, no placeholder/temporary copy, and at least one internal hub link.

The `valueScore` and `valueBand` emitted by SSR are internal comparison aids. They do not represent Google’s score. Sitemap membership and an HTTP 200 response measure technical discovery readiness, not indexing.

## Fixed-cohort experiment

Run [`Measure-MatchPageCohorts.ps1`](../../scripts/seo/Measure-MatchPageCohorts.ps1) after the sitemap generation has settled. The first run creates a fixed manifest containing three deterministic samples from each of live, upcoming, and recent. Later runs reuse that manifest so the comparison is page-for-page.

For each page the script records:

- normal, Googlebot desktop, and Googlebot mobile status, HTML fingerprint, visible word count, canonical/robots/H1 state, SSR value headers, utility coverage, and internal hub links;
- sitemap shard membership and lifecycle cohort;
- supplied Search Console URL Inspection state, last crawl time, referring URLs, Google canonical, impressions, clicks, and position;
- changes from a prior report when `-PreviousReportPath` is supplied.

Take a baseline, then repeat at approximately 24 hours and 72 hours with the same manifest. Use the same fixed URLs and supply a fresh sanitized output from `scripts/query_gsc_search_analytics.py` via `-GscSnapshotPath`. The outcome is measured as changes in `indexed`, `discovered-not-indexed`, `crawled-not-indexed`, last crawl receipt, referring URLs, fingerprint, impressions, and clicks.

## Architecture decision

Keep one parity-preserving SSR path. Do not restore bot-specific sidecar rendering unless a controlled experiment proves that the same source-backed document cannot be delivered reliably through SSR. A bot-specific document would make the measurement less trustworthy and would not fix weak or undifferentiated match data.
