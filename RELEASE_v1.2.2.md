# Release Notes - v1.2.2

**Release Date:** March 12, 2026  
**Branch:** 008-match-title-seo  
**Baseline Commit:** d6ea2ed  
**Status:** Ready for image build and production rollout

---

## Overview

This patch release fixes upcoming fixture naming across the scraper, backend, and frontend, then aligns the production deployment assets so tagged Docker images can be promoted cleanly without source bind mounts or missing environment variables.

---

## Functional Changes

### 1. Upcoming fixture team-name enrichment

**Problem:** Upcoming fixtures were often rendered with abbreviations such as `IRE` and `BAN` instead of full names, especially when CREX schedule cards exposed only short labels.

**What changed:**

- The scraper now extracts team names from multiple sources in priority order:
  - JSON-LD event names
  - schedule card title/text
  - localStorage team metadata from the info/scorecard/live pages
- The scraper enriches unresolved short labels asynchronously for a bounded number of upcoming matches.
- Extracted `team1Name` and `team2Name` values are now persisted by the backend during schedule sync.
- The frontend now prefers full names for standard upcoming cards while preserving short names on compact homepage cards.

**Files involved:**

- `apps/scraper/crex_scraper_python/src/parsers/crex_schedule_parser.py`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/dao/ScheduledMatchDTO.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/model/LiveMatch.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java`
- `apps/frontend/src/app/features/matches/services/matches.service.ts`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.html`
- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.css`
- `apps/frontend/src/app/home/home.component.html`

### 2. Regression coverage for naming logic

Added targeted tests to prevent regressions in both parsing and rendering:

- frontend component spec for upcoming/live/compact card label behavior
- frontend service spec for full-name precedence over short scorecard codes
- scraper unit tests for team extraction and localStorage lookup expansion

**Files added:**

- `apps/frontend/src/app/features/matches/components/match-card/match-card.component.spec.ts`
- `apps/frontend/src/app/features/matches/services/matches.service.spec.ts`
- `apps/scraper/crex_scraper_python/tests/unit/test_crex_schedule_parser.py`

---

## Production Rollout Changes

### 1. Image tag bump

All production-facing env templates and compose defaults now target `v1.2.2`:

| Service | Image Tag |
|---------|-----------|
| Backend | `macubex/victoryline-backend:v1.2.2` |
| Frontend | `macubex/victoryline-frontend:v1.2.2` |
| Scraper | `macubex/victoryline-scraper:v1.2.2` |
| Prerender | `macubex/victoryline-prerender:v1.2.2` |

### 2. Prod compose now deploys the tagged images cleanly

`docker-compose.prod.yml` was updated to:

- remove scraper source bind mounts that previously overrode code inside the tagged image
- export the current scraper runtime envs required in production:
  - `PID_SOFT_LIMIT`
  - `PID_RESTART_THRESHOLD`
  - `ENABLE_PERSISTENT_PAGES`
  - `PERSISTENT_PAGE_MAX_COUNT`
  - `PERSISTENT_PAGE_MAX_AGE_SECONDS`
  - `FAST_POLL_INTERVAL_MS`

This makes the container behavior match the promoted image tag instead of depending on the checked-out repository contents on the server.

### 3. Env examples are now deployment-complete

Both `.env.example` and `.env.production.example` were refreshed to include the currently used configuration surface for:

- backend H2/JWT/indexing settings
- Google Search Console credentials and scheduler controls
- scraper schedule-sync and Redis settings
- fast-update and persistent-page tuning
- current image tags for all deployed services

### 4. Production Caddy alignment

`Caddyfile.prod` now:

- uses the injected ACME contact email from the container environment
- proxies `/api/*`, `/token/*`, `/actuator/*`, `/swagger-ui*`, and `/v3/api-docs*` directly to the backend
- keeps SEO endpoints on the backend explicitly
- serves `/health` and `/healthz`
- writes logs to `/data/access.log` so logs survive container restarts with the existing Caddy volume

---

## Validation Summary

Recommended validations for this release:

- scraper parser unit test for team-name extraction
- frontend/unit validation for card-name rendering
- `docker compose -f docker-compose.prod.yml config`
- `docker exec victoryline-proxy caddy validate --config /etc/caddy/Caddyfile`

If new images are built from this commit, production should be migrated using the updated `v1.2.2` tags and the refreshed `.env.production.example` template.

---

## Rollback

If rollback is required:

1. Switch the image tags in `.env` or `docker-compose.prod.yml` back to `v1.2.1`.
2. Run `docker compose -f docker-compose.prod.yml up -d`.
3. Re-check backend, scraper, and Caddy health endpoints.

---

## Notes

- The local `.env` file was also refreshed for the same rollout, but it remains git-ignored and is not part of the commit.
- The screenshot artifact `crex_fixtures_analysis.png` remains part of the working tree and will be committed with the rest of the current changes unless removed intentionally.