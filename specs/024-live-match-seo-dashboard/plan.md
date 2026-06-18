# Implementation Plan: Live Match SEO Dashboard

**Branch**: `008-match-title-seo` | **Date**: 2026-06-18

## Summary

Create a standalone Flask monitoring dashboard under `tools/seo-dashboard`. It will query GSC with the existing service account, inspect public production endpoints, parse sitemap and hub links, and optionally read a SerpBear JSON export.

## Architecture

- `app.py`: Flask server and cached API.
- `collector.py`: GSC, production HTML, sitemap, live-match, and SerpBear collection.
- `templates/index.html`: dashboard shell.
- `static/dashboard.css`: dashboard visual system.
- `static/dashboard.js`: rendering, charts, tables, refresh behavior.
- `README.md`: local run and optional SerpBear configuration.

## Data Sources

- Google Search Console Search Analytics API.
- Google URL Inspection API for a limited number of current live URLs.
- `https://www.crickzen.com/api/v1/seo/indexing/status`.
- `https://www.crickzen.com/api/cricket-data/live-matches`.
- Production sitemap and raw hub/match HTML.
- Optional `SERPBEAR_EXPORT_PATH`.

## Constraints

- Do not expose credentials.
- Cache dashboard data for 30 minutes by default.
- Limit URL Inspection checks.
- Do not add SerpBear to core Docker Compose or application runtime.
- Do not change `/cric-live/{slug}` canonical policy.

## Verification

1. Run Python unit tests for collector parsing and aggregation.
2. Start dashboard locally.
3. Fetch `/api/dashboard` and verify current production data.
4. Open the dashboard in a browser and verify layout and mobile behavior.
