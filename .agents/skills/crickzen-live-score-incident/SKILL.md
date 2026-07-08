---
name: crickzen-live-score-incident
description: Diagnose Crickzen live-score incidents in prod or local by separating scraper outages, schedule-discovery failures, backend issues, and frontend hero/websocket stalls.
---

# Crickzen Live Score Incident

Use this skill when live scores look frozen, a local restart comes back with no matches, or the app looks stale even though services appear healthy.

## Triage order

1. **Check the right environment first**

- prod/user-facing issue → start with public API checks
- local Docker issue → start with local stack checks

2. **Check public or local data freshness**

Prod:

```bash
curl -s https://www.crickzen.com/api/cricket-data/live-matches
curl -s "https://www.crickzen.com/api/cricket-data/last-updated-data?url=<match-slug>"
curl -i https://www.crickzen.com/api/ws/info
```

Local:

```powershell
docker compose -f docker-compose.local.yml ps
Invoke-RestMethod http://localhost:5000/health | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/live-matches | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/upcoming-matches | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/completed-matches | ConvertTo-Json -Depth 6
```

3. **Check containers and logs**

```bash
cd /home/administrator/victoryline-monorepo
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker logs victoryline-scraper --since 20m 2>&1 | grep -Ei '<match-key>|matches.push|error|exception'
docker logs victoryline-backend --tail 80 2>&1
```

Local equivalents:

```powershell
docker logs victoryline-monorepo-scraper-1 --tail 200
docker logs victoryline-monorepo-backend-1 --tail 120
```

4. **Classify the incident**

- **Scraper outage**
  - live API timestamps stale
  - scraper logs show failures / no pushes
- **Schedule discovery failure**
  - no live cards are present upstream
  - scraper stops before schedule sync or never writes upcoming/completed matches
- **Backend serialization issue**
  - `/last-updated-data` fails or returns 500
- **Frontend hero/websocket stall**
  - `/last-updated-data` stays fresh
  - scraper pushes are visible
  - page still appears frozen
- **Completed-match stale-cache mismatch**
  - completed cards are correct
  - match page still shows old chase/live hero state

## Frontend-specific checks

- Do not use wildcard subscriptions like `/topic/cricket.<match>.*`
- Backend publishes exact per-field topics such as:
  - `/topic/cricket.<match>.score`
  - `/topic/cricket.<match>.over`
  - `/topic/cricket.<match>.batsman_data`
  - `/topic/cricket.<match>.commentary`
- `OnPush` live components must re-enter Angular through `NgZone`
- Retry actions must re-subscribe to websocket topics, not only refetch HTTP once
- clear stale cached live snapshots when `/last-updated-data` returns `404` for a match that has already moved to completed

## Local discovery-specific checks

If local data is empty after restart:

- inspect scraper health for `state`, `active_matches`, and `seconds_since_last_scrape`
- check whether CREX currently has zero live cards
- confirm schedule discovery still runs even when `live-matches` has no live cards

Helpful log clues:

- `No live cards found (timeout)`
- `Parsed X schedule matches`
- `schedule.sync.success`

If needed, recycle only the scraper browser pool:

```powershell
Invoke-RestMethod -Method Post http://localhost:5000/recycle
```

## Immediate remediation

If prod data is fresh but the UI is stale:

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml restart backend frontend
```

If local scraper discovery should be able to recover upcoming/completed matches, rebuild and restart only the scraper:

```powershell
docker compose -f docker-compose.local.yml up -d --build scraper
```

## Related skills

- **crickzen-scraper-browser-crash-loop** — when the scraper has many restarts, `/health` shows `failing` state, or `fast_updates.coverage_ratio < 1.0`
- **crickzen-backend-scraper-prod-rollout** — deploying scraper code fixes to production

## Reference incidents

- `docs/INCIDENT_20260526_LIVE_HERO_WS_STALL.md`
- `docs/INCIDENT_20260611_SCRAPER_BROWSER_CRASH_LOOP.md`
- `docs/ROLLUP_20260602_HOME_MATCH_SURFACE_AND_LOCAL_DATA.md`
