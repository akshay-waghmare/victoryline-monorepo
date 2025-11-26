# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
