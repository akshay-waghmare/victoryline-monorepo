# Crickzen Development Guidelines

Auto-generated from feature plans. Last updated: 2025-11-12

## Active Technologies
- Frontend: Angular (CLI ~6.x/7.x), TypeScript ~3.2; Backend: Spring Boot (2.x, Java 8/11) [NEEDS CLARIFICATION]; Scraper: Python 3.x (Flask) + Angular, RxJS; Backend REST API (Spring); Scraper Flask API; axe-core (CI audit) [NEEDS CLARIFICATION on tooling integration] (002-match-details-ux)
- Backend MySQL (per Constitution), Redis (optional cache) [NEEDS CLARIFICATION for usage in this feature] (002-match-details-ux)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (003-seo-optimization)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (003-seo-optimization)
- Angular Universal (SSR), Express server adapter, Helmet (security headers), Sharp (OG image resizing), Spring Boot Web + Jackson, MySQL JDBC, Redis client, Flask + requests, Lighthouse CI, axe-core (accessibility audit), sitemap + robots generator utility (custom or library), json-schema / OpenAPI tooling. (003-seo-optimization)
- MySQL (authoritative match / team / player data); Redis (caching rendered SEO metadata & sitemap snapshot); File store or object storage (future) for generated OG/social images (initially build-time static assets). (003-seo-optimization)
- Python 3.x (Scraper), Java 8/11 with Spring Boot 2.x (Backend) (004-scraper-resilience)
- TypeScript 3.2.x, Angular 7.2 + Angular Material 7 (layout, typography), RxJS 6 (streams), @stomp/ng2-stompjs (websocket updates), MatchesService / EventListService for data, existing scorecard API client (005-live-match-glance)
- N/A (frontend state + in-memory services only) (005-live-match-glance)
- TypeScript 3.2.x, Angular 7.2 CLI, HTML5, SCSS + Angular core & router, RxJS 6.x, Angular Material 7 (layout primitives), internal design tokens (005-live-match-glance)
- N/A (consumes snapshot/scorecard REST endpoints only) (005-live-match-glance)

- TypeScript 4.9+ (Angular 15+), HTML5, CSS3 (CSS Grid, Flexbox, Custom Properties)  <!-- + ACTION REQUIRED: Replace the content in this section with the technical details (001-modern-ui-redesign)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 4.9+ (Angular 15+), HTML5, CSS3 (CSS Grid, Flexbox, Custom Properties)  <!--: Follow standard conventions

## Recent Changes
- 005-live-match-glance: Added TypeScript 3.2.x, Angular 7.2 CLI, HTML5, SCSS + Angular core & router, RxJS 6.x, Angular Material 7 (layout primitives), internal design tokens
- 005-live-match-glance: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 005-live-match-glance: Added TypeScript 3.2.x, Angular 7.2 + Angular Material 7 (layout, typography), RxJS 6 (streams), @stomp/ng2-stompjs (websocket updates), MatchesService / EventListService for data, existing scorecard API client


<!-- MANUAL ADDITIONS START -->

## Known Issues & Active Incidents

### 🔴 CRITICAL: Scraper Thread/PID Leak (2025-11-15)
**Status**: Active - Immediate Action Required  
**Severity**: Critical - Service Degraded  
**Reference**: `specs/004-scraper-resilience/incidents/SCRAPER_THREAD_LEAK_INCIDENT.md`

**Issue Summary**:
The scraper service has accumulated 4,613 PIDs (processes/threads) over 20 hours of runtime, causing complete thread exhaustion. The service cannot start new threads and is stuck with 2.6-hour stale data.

**Root Cause**:
Playwright/Chromium browser processes are not being cleaned up after scraping operations, despite the scraper resilience implementation (Feature 004).

**Immediate Impact**:
- ❌ No new matches being discovered
- ❌ No live updates (data 2.6+ hours stale)
- ❌ API returns stale data (violates 5-second freshness requirement)
- ❌ Health status: "failing", `can't start new thread` error

**Emergency Recovery**:
```bash
# Restart the scraper container immediately
cd /home/administrator/victoryline-monorepo
docker-compose restart scraper

# Validate recovery
docker stats victoryline-scraper --no-stream
curl http://localhost:5000/health | jq '.data.scrapers[0].status'
```

**Required Fixes** (in priority order):
1. **Add Docker PID Limit**: Set `pids: 512` in `docker-compose.prod.yml`
2. **Fix Browser Cleanup**: Add explicit `browser.close()` in `finally` blocks in `crex_scraper.py`
3. **Add PID Monitoring**: Track PIDs in `ScraperContext.update_resource_usage()`
4. **Lower Staleness Threshold**: Change from 300s → 60s in `src/config.py`
5. **Add Orphan Cleanup Worker**: Background task to force-restart stuck scrapers

**Development Guidelines**:
- ⚠️ Always use context managers: `with sync_playwright() as p:`
- ⚠️ Register cleanup callbacks: `context.register_cleanup(cleanup_fn)`
- ⚠️ Test browser cleanup in integration tests
- ⚠️ Monitor PIDs during development: `docker stats --no-stream`
- ⚠️ Never launch browsers without explicit cleanup paths

**Monitoring**:
- PIDs should remain: 50-150 (normal), alert at 200+
- Staleness should be: <60 seconds, alert at 300+
- Health status should be: "healthy", alert on "degraded" or "failing"

**Success Criteria**:
- [ ] PIDs stable below 150 for 24 hours
- [ ] Zero "can't start new thread" errors
- [ ] Auto-restart working (6-hour lifecycle)
- [ ] New matches discovered continuously
- [ ] Data staleness <60 seconds

---

<!-- MANUAL ADDITIONS END -->
