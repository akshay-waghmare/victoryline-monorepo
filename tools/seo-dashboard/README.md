# Crickzen Live Match SEO Dashboard

Standalone monitoring dashboard for live `/cric-live/{slug}` SEO. It does not change public routes, canonicals, sitemap policy, frontend runtime, backend runtime, or scraper behavior.

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
- `SERPBEAR_EXPORT_PATH`: Optional SerpBear JSON export path.

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
