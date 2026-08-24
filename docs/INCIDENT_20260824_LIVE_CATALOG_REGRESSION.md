# Incident: Completed matches re-entered the live homepage

**Date:** 2026-08-24  
**Severity:** High — the homepage advertised completed limited-overs matches as live and exceeded the three-match live slate  
**Status:** Fixed and verified in production

## Symptoms

- The public live catalogue contained 11 rows, including rows whose provider snapshot said `Won` or `Won by`.
- The scraper had a configured `MAX_LIVE_MATCHES=3`, but its persisted backend catalogue was selecting stale result rows.
- The homepage live tab displayed an inflated live set because its own lane allowed six cards.
- A backend restart briefly produced a public 502 while Spring Boot completed its normal startup; the frontend was not switched during that interval.

## Root cause

The live-sync endpoint treats every URL it receives as authoritative and marks it `LIVE`. The scraper poll loop consumed the persisted backend catalogue, and `select_live_matches()` did not reject terminal evidence in those rows. A stale row such as `TEAM 83/68.2 TEAM Won ... OTHER 172/6` was therefore reselected and re-promoted indefinitely. The homepage then applied a separate six-card display limit.

## Fix

- Scraper live selection now excludes terminal statuses and strong result evidence, while retaining valid multi-day `Stumps`/`INNINGS_BREAK` rows.
- Backend lifecycle resolution now recognises provider snapshots that place `Won` between two innings score tokens, without treating a live `won the toss` message as terminal.
- Homepage SSR, hydration, and live-tab rendering now cap the live lane at three; upcoming and results cohorts remain unchanged.
- Added focused scraper and backend regression tests.

## Verification

- Scraper unit tests: `5 passed`.
- Backend lifecycle evidence test: passed during the image build; backend image built with Maven `BUILD SUCCESS`.
- Production images:
  - `macubex/victoryline-backend:20260824-live-catalog-guard` (`sha256:b7c2bb...7c95`)
  - `macubex/victoryline-scraper:20260824-live-catalog-guard` (`sha256:ab9cb0...aed1f`)
  - `macubex/victoryline-frontend:20260824-live-catalog-guard` (`sha256:17b2e4...d3640`)
- Public `/api/cricket-data/live-matches`: exactly 3 rows, all `INNINGS_BREAK`/`Stumps`, zero terminal-like rows.
- Public `/api/cricket-data/match-cohorts`: live cohort count `3`.
- Public homepage: HTTP 200, one H1, live tab count `3`, three “already in play” links, no temporary-loading fallback.
- Scraper health after restart: `active_matches=3`, `managed_live_matches=3`, `covered_matches=3`, `coverage_ratio=1.0`, `errors=0`, `circuit_open=false`, `restart_recommended=false`.
- Live match page and completed match page both returned HTTP 200 with lifecycle-specific titles; neither returned the thin temporary-loading fallback.

## Rollback

The production `.env` backup is `/home/administrator/victoryline-monorepo/.env.bak.20260824-live-catalog-guard`. Restore the previous image pins and run the backend-first compose rollout if rollback is required.
