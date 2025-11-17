# Quickstart: Upcoming Matches (Backend + Scraper)

This guide helps you run and verify the Upcoming Matches feed locally.

## Prerequisites

- Docker + Docker Compose
- Java 11 toolchain in backend container (Spring Boot 2.x)
- Python 3.x in scraper container
- Optional: Redis service (recommended for caching list responses)

## Start services

Recommended: use the existing Compose stack (adjust service names if they differ):

```bash
# From repo root
docker compose up -d backend scraper mysql redis
```

Wait for containers to become healthy. Ensure MySQL migrations apply (Flyway/Liquibase if configured).

## Scraper configuration

- Schedule: every 10 minutes to fetch fixtures from crex.
- Fallback: For pages requiring JS, enable Playwright but ensure strict cleanup.
- PID protection: In production compose, set `pids: 512` for scraper container (see incident doc).

Health check endpoint (scraper):
- GET http://localhost:5000/health → must include `pidCount` and recent `lastScrapeAt`

## Backend endpoints

- List: GET http://localhost:8080/api/v1/matches/upcoming?page=1&pageSize=20
- Detail: GET http://localhost:8080/api/v1/matches/upcoming/{id}
- Health: GET http://localhost:8080/api/v1/health/upcoming

Response envelope follows the Constitution (success, data, error, timestamp). See `contracts/openapi.yaml`.

## Redis caching (optional but recommended)

- TTL: 10 minutes for list responses.
- Cache key: Include normalized query params (page, pageSize, from, to, team, series).
- Invalidate: On scraper upsert events affecting upcoming window, evict matching keys or bump a cache version prefix.

## Verification checklist

- [ ] Scraper log shows successful fetch and normalized records count > 0
- [ ] Backend `/upcoming` returns data with expected fields and pagination
- [ ] Health endpoint reports `healthy` and recent `lastScrapeAt`
- [ ] Cache HIT observed after first request (if Redis enabled)
- [ ] No growing PID count in scraper (monitor every 5–10 minutes)

## Troubleshooting

- Empty feed: Confirm source availability and scraper selectors; check network allowlist.
- 500 errors: Check backend logs for DB schema mismatch; run migrations for `upcoming_matches`.
- High PID count: Ensure Playwright usage is behind context managers and `browser.close()` in finally.

## Notes

- UI for upcoming matches is out of scope in this phase. The Angular app will consume these endpoints in Phase 2.
- Contracts are in `specs/005-upcoming-matches/contracts/openapi.yaml`.