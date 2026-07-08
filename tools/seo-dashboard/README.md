# Crickzen Live Match SEO Dashboard

Standalone monitoring dashboard for live `/cric-live/{slug}` SEO. It does not change public routes, canonicals, sitemap policy, frontend runtime, backend runtime, or scraper behavior.

The dashboard now also maintains a small local history file so operators can see when the monitor first saw a URL in the feed, sitemap, hubs, or indexed state. Those timestamps are "first seen by this dashboard," not authoritative historical Google discovery timestamps.

## Start locally

From the repository root:

```powershell
.\scripts\Start-SeoDashboard.ps1
```

Open `http://127.0.0.1:8091`.

## Configuration

- `GOOGLE_APPLICATION_CREDENTIALS`: GSC service-account JSON path.
- `GSC_SITE_URL`: Defaults to `https://www.crickzen.com/`.
- `SEO_DASHBOARD_BASE_URL`: Defaults to `https://www.crickzen.com`.
- `SEO_DASHBOARD_DAYS`: GSC window, default `14`.
- `SEO_DASHBOARD_INSPECT_LIMIT`: Maximum current live URLs inspected per refresh, default `5`.
- `SEO_DASHBOARD_CACHE_SECONDS`: Cache duration, default `1800`.
- `SEO_DASHBOARD_PORT`: Local port, default `8091`.
- `SEO_DASHBOARD_STATE_PATH`: Optional override for the local history file. Defaults to `tools/seo-dashboard/state/dashboard-history.json`.
- `SERPBEAR_EXPORT_PATH`: Optional SerpBear JSON export path.

## Operator queue

The dashboard exposes a manual submission shortlist for prematch URLs that are:

- healthy in raw HTML
- already on the crawl path through sitemap and/or SSR hubs
- still `unknown` or `discovered but not indexed`
- close enough to match start that a human Search Console nudge may still help

Use the queue as a tiny exception list, not as a replacement for sitemap and hub discovery.

## Competitor keyword discovery

The dashboard now includes a `Run competitor discovery` control that triggers the Playwright-based competitor keyword script under `tools/competitor-keyword-discovery/`.

It surfaces the latest ranked phrases from the saved JSON artifact at:

- `artifacts/competitor-keyword-discovery/competitor-keywords.json`

## SerpBear status

SerpBear is not currently installed or running in local or production Crickzen infrastructure. The dashboard displays `Not configured` until a JSON export is provided.

Accepted JSON shapes include a top-level array or `{ "keywords": [...] }`. Each keyword may use:

```json
{
  "keyword": "team a vs team b live score",
  "position": 8,
  "previousPosition": 12,
  "url": "https://www.crickzen.com/cric-live/example"
}
```
