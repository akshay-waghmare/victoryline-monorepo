---
name: crickzen-match-seo-ops
description: Audit, verify, and roll out Crickzen match-page SEO changes across local SSR and production. Use when match pages are not indexing, GSC reports canonicals or soft 404s, SSR SEO changes need proof, or live match pages need canonical/H1/OG/JSON-LD verification.
---

# Crickzen Match SEO Ops

Use this skill when `/cric-live/*` pages need SEO verification or recovery.

## Default audit order

1. Check one real live or recent match page directly.
2. Verify the raw SSR HTML, not only the hydrated browser view.
3. Verify `SportsEvent` required fields as a bundle, not one field at a time.
4. Confirm sitemap and `robots.txt` still resolve.
5. Confirm GSC/indexing service status.
6. Submit sitemap only after the HTML checks pass.

## SportsEvent guardrail

For Crickzen match pages, treat these as the minimum Event-rich-result contract:

- `startDate`
- `location`

Do not ship a change that emits `SportsEvent` when either field is missing or untrustworthy.

Preferred behavior:

- if both fields are trustworthy, emit `SportsEvent`
- if either field is weak, omit `SportsEvent` instead of emitting invalid JSON-LD

Also confirm at least one public sample still exposes the same JSON-LD to:

- normal browser UA
- desktop Googlebot UA
- mobile Googlebot UA

## Local SSR build note

For this Angular 7 frontend, use Node `17.9.1` with legacy OpenSSL when building SSR locally:

```powershell
nvm use 17.9.1
$env:NODE_OPTIONS='--openssl-legacy-provider'
Start-Process -FilePath 'C:\nvm4w\nodejs\npm.cmd' -ArgumentList @('run','build:ssr') -NoNewWindow -Wait
```

## Local checks

Build and run the SSR frontend, then verify one match page and one bad route:

```powershell
node -c apps/frontend/server.js
.\\apps\\frontend\\node_modules\\.bin\\tsc.cmd -p .\\apps\\frontend\\src\\tsconfig.app.json --noEmit
.\\apps\\frontend\\node_modules\\.bin\\tsc.cmd -p .\\apps\\frontend\\tsconfig.server.json --noEmit
```

Useful checks:

```powershell
Invoke-WebRequest http://127.0.0.1:4000/cric-live/<match-slug> | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:4000/this-page-should-not-exist -UseBasicParsing
```

Expected good signs:

- self-canonical on the match URL
- exactly one `h1`
- `og:image` present
- `application/ld+json` present for real match pages
- `SportsEvent.startDate` present when `SportsEvent` is present
- `SportsEvent.location` present when `SportsEvent` is present
- bad route returns `404`

## Production checks

Use the repo audit script against a sampled match page:

```powershell
$list = "$env:TEMP\\prod-match-seo.txt"
'https://www.crickzen.com/cric-live/<match-slug>' | Set-Content -LiteralPath $list -Encoding UTF8
powershell -ExecutionPolicy Bypass -File .\scripts\Audit-MatchSeo.ps1 -UrlList $list
```

Also verify:

```powershell
Invoke-WebRequest https://www.crickzen.com/robots.txt -UseBasicParsing
Invoke-WebRequest https://www.crickzen.com/sitemap.xml -UseBasicParsing
Invoke-WebRequest https://www.crickzen.com/api/v1/seo/indexing/status -UseBasicParsing
```

Crawler-parity spot check:

```powershell
$url = 'https://www.crickzen.com/cric-live/<match-slug>'
$desktopGooglebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
$mobileGooglebot = 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
Invoke-WebRequest $url -UseBasicParsing
Invoke-WebRequest $url -UseBasicParsing -Headers @{ 'User-Agent' = $desktopGooglebot }
Invoke-WebRequest $url -UseBasicParsing -Headers @{ 'User-Agent' = $mobileGooglebot }
```

## GSC checks

Good health signal:

- `gscInitialized=true`
- `indexingInitialized=true`
- sitemap URL points to `https://www.crickzen.com/sitemap.xml`

Manual sitemap submission:

```powershell
Invoke-WebRequest -Uri 'https://www.crickzen.com/api/v1/seo/indexing/sitemap/submit' -Method Post -UseBasicParsing
```

Do not treat manual per-URL indexing as a rollout blocker by default. It may fail with `429 Too Many Requests` even when sitemap submission and scheduler status are healthy.

## Acceptance checklist

- match page returns `200`
- unresolved route returns `404`
- canonical matches requested slug
- `robots=index,follow` on valid match page
- one `h1`
- `og:image` present
- JSON-LD present on real match pages
- no `SPORTSEVENT_LOCATION_MISSING` flag
- no `SPORTSEVENT_STARTDATE_MISSING` flag
- Googlebot sees the same JSON-LD contract in raw HTML
- sitemap submission succeeds

## Reference

- `specs/015-long-tail-match-seo/`
- `specs/016-live-match-page-seo-hardening/`
- `scripts/Audit-MatchSeo.ps1`
