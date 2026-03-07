# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Scorecard Scraping**: Hardened Crex scorecard decoding by waiting for sufficiently populated `localStorage` before extracting player/team mappings, ignoring incomplete cached mappings, and caching only validated player/team data in [apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py](apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py).
- **Frontend Production Build**:
  - Deferred `prebid.js` loading from [apps/frontend/src/index.html](apps/frontend/src/index.html) to avoid Angular 7 production minification failures on modern syntax.
  - Added frontend TypeScript exclusions and `skipLibCheck` safeguards in [apps/frontend/src/tsconfig.app.json](apps/frontend/src/tsconfig.app.json) and [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json) so legacy/orphan component files no longer break production builds.

### Changed
- **Live Match UI**: Compressed the live hero and odds layouts, moved active batter/bowler context into the hero, and added an odds/probability toggle across [apps/frontend/src/app/cricket-odds/cricket-odds.component.html](apps/frontend/src/app/cricket-odds/cricket-odds.component.html), [apps/frontend/src/app/cricket-odds/cricket-odds.component.css](apps/frontend/src/app/cricket-odds/cricket-odds.component.css), [apps/frontend/src/app/cricket-odds/cricket-odds.component.ts](apps/frontend/src/app/cricket-odds/cricket-odds.component.ts), and the live hero components under [apps/frontend/src/app/match-live/components/live-hero](apps/frontend/src/app/match-live/components/live-hero).
- **Theme Consistency**: Replaced remaining purple gradients with design-token-based blue gradients across several frontend components, including [apps/frontend/src/app/scorecard/scorecard.component.css](apps/frontend/src/app/scorecard/scorecard.component.css), [apps/frontend/src/app/home/home.component.css](apps/frontend/src/app/home/home.component.css), and related match-detail components.

### Notes
- Live end-to-end scorecard validation is still pending a fresh live match window. The scraper fix was rebuilt and the scraper container returned to a healthy state, but no final live backfill verification was possible once live matches ended.

## [1.2.1] - 2026-01-30

### Fixed
- **Scraper Timeouts**: Increased `BACKEND_TIMEOUT` from 2s to 30s to prevent timeouts on slow backend responses.
- **Live Match Discovery**: 
  - Added `isFinishedText()` filter to exclude completed matches ("won by", "match tied", "no result", "match abandoned").
  - Added `isLive()` helper to check for `div.live` class presence.
  - Combined selector with 20s timeout: `li.live-card, div.live-card, a[href*='/scoreboard/']`.
  - 3-strategy extraction for robust match discovery.

### Changed
- **Docker Compose**: Added volume mounts for `cricket_data_service.py` and `discovery.py` for hot-reload during debugging.
- **Docker Compose**: Removed `pids_limit: 512` constraint (was causing issues).

### Deployed Images
| Service | Image Tag | Digest |
|---------|-----------|--------|
| **Scraper** | `macubex/victoryline-scraper:v1.2.1` | `sha256:98eb0259...` |
| **Backend** | `macubex/victoryline-backend:v1.2.1` | `sha256:0ced94d3...` |
| **Frontend** | `macubex/victoryline-frontend:v1.2.1` | `sha256:b85cf12f...` |
| **Prerender** | `macubex/victoryline-prerender:v1.2.1` | `sha256:82bbd784...` |
| **MySQL** | `mysql:8.0` | - |
| **Redis** | `redis:7-alpine` | - |

### Deployment Commands
```bash
# Pull all images on server
docker pull macubex/victoryline-scraper:v1.2.1
docker pull macubex/victoryline-backend:v1.2.1
docker pull macubex/victoryline-frontend:v1.2.1
docker pull macubex/victoryline-prerender:v1.2.1

# Update docker-compose.prod.yml with new tags and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## [1.1.4] - 2025-11-26

### Fixed
- **Scraper Resilience**: Resolved critical `EAGAIN` / PID exhaustion error.
  - Increased Docker container PID limit from 350 to 512.
  - Lowered `STALENESS_THRESHOLD_SECONDS` from 180s to 60s for faster failure detection.
  - Verified process cleanup in `crex_adapter.py` and `browser_pool.py`.
- **Deployment**: Updated `docker-compose.prod.yml` to include Redis service and correct backend/redis URLs for the scraper.

### Changed
- **Configuration**: Switched production Caddy configuration to use `Caddyfile.local` temporarily for local testing of production stack.
- **Env**: Updated `.env.production.example` with optimized resilience settings.

### Deployed Images
| Service | Image Tag |
|---------|-----------|
| **Scraper** | `macubex/victoryline-scraper:v1.1.4` |
| **Backend** | `macubex/victoryline-backend:v1.0.0` |
| **Frontend** | `macubex/victoryline-frontend:v1.0.1` |
| **Prerender** | `macubex/victoryline-prerender:v1.0.0` |
| **MySQL** | `mysql:8.0` |
| **Redis** | `redis:7-alpine` |

## [1.1.3] - 2025-11-25

### Fixed
- **Data Extraction**: Fixed `localStorage` timing issue to ensure complete player data extraction.
- **Scorecard**: Achieved 100% scorecard coverage by pre-fetching storage from Scorecard/Info tabs.

## [1.1.2] - 2025-11-24

### Added
- **Resilience**: Implemented periodic container restart policy to mitigate long-running thread/PID leaks.

## [1.1.0] - 2025-11-20

### Added
- **Scraper Resilience**:
  - Automatic restart capabilities.
  - Memory limits (Soft/Hard).
  - Health monitoring endpoints.

## [1.0.1] - 2025-11-15

### Added
- **UI**: Live Match Glance enhancements.
  - Responsive design updates.
  - Chase summary and current ball display.

## [1.0.0] - 2025-11-01

### Added
- **SEO**: Initial SEO Optimization release.
- **Backend**: Spring Boot backend with H2 database.
- **Frontend**: Angular frontend with SSR/Prerender support.
