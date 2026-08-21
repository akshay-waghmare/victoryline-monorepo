# Incident: Dashboard predictor process exhaustion

**Date:** 2026-08-21  
**Severity:** High — live updates and page loading became unreliable when the production host exhausted process/thread capacity  
**Status:** Recovered and guarded in production

## Symptoms

- `crickzen-dashboard` grew to 11,196 container processes.
- `victoryline-scraper` reached its 512-process limit and could not fork Chromium or start request threads.
- Scraper health was misleadingly reachable but logs contained `EAGAIN`, `Cannot fork`, and `can't start new thread`.
- Public homepage/API responses were intermittently stale or appeared stuck.

## Root cause

Each `crex_live_predictor` started a Playwright driver with `async_playwright().start()`, but shutdown only closed Chromium. The driver process was not explicitly stopped when the dashboard scheduler retired a predictor, so repeated predictor rotation accumulated orphaned browser-driver processes.

## Fix

- Commit `b55ace6` stores the Playwright handle on the predictor and always calls `playwright.stop()` after closing the browser.
- Added a focused regression test; the predictor unit suite passed `18/18`.
- Deployed the committed predictor module to the mounted production release source with a server-side backup.
- Rolled the dashboard to `machine_learning_bbl-dashboard:20260801-predictor-cleanup-0425234`.
- Set `MAX_TOTAL_MATCHES=3` to match the scraper slate and `AUTO_DISCOVERY_RENDER_JS=false` so the dashboard does not launch a redundant browser discovery path when the scraper contract is available.

## Production proof

- Dashboard processes: `11,196` immediately before recovery, then approximately `206` and stable after scheduler cycles.
- Live predictor/Chromium processes: `14` after stabilization.
- Scraper processes: `512` before recovery, then `77`, with container health `healthy` and restart count `0`.
- Public homepage: HTTP 200, 79 canonical match links, no `Updating match lanes` fallback.
- Public live-match and prediction APIs: HTTP 200 with fresh rows.

## Rollback

The prior dashboard container remains stopped under a timestamped rollback name. The previous dashboard environment and mounted predictor source also have timestamped backups on the production host.

## Follow-up

Homepage response time remains above the separate under-two-second cached target. That is a latency optimization track, not part of this process-leak recovery.
