---
name: crickzen-live-score-incident
description: Diagnose Crickzen live-score incidents by separating scraper outages from frontend hero/websocket stalls.
---

# Crickzen Live Score Incident

Use this skill when live scores look frozen on `crickzen.com`.

## Triage order

1. **Check public data freshness**

```bash
curl -s https://www.crickzen.com/api/cricket-data/live-matches
curl -s "https://www.crickzen.com/api/cricket-data/last-updated-data?url=<match-slug>"
curl -i https://www.crickzen.com/api/ws/info
```

2. **Check prod containers**

```bash
cd /home/administrator/victoryline-monorepo
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker logs victoryline-scraper --since 20m 2>&1 | grep -Ei '<match-key>|matches.push|error|exception'
docker logs victoryline-backend --tail 80 2>&1
```

3. **Classify the incident**

- **Scraper outage**
  - live API timestamps stale
  - scraper logs show failures / no pushes
- **Backend serialization issue**
  - `/last-updated-data` fails or returns 500
- **Frontend hero/websocket stall**
  - `/last-updated-data` stays fresh
  - scraper pushes are visible
  - page still appears frozen

## Frontend-specific checks

- Do not use wildcard subscriptions like `/topic/cricket.<match>.*`
- Backend publishes exact per-field topics such as:
  - `/topic/cricket.<match>.score`
  - `/topic/cricket.<match>.over`
  - `/topic/cricket.<match>.batsman_data`
  - `/topic/cricket.<match>.commentary`
- `OnPush` live components must re-enter Angular through `NgZone`
- Retry actions must re-subscribe to websocket topics, not only refetch HTTP once

## Immediate remediation

If prod data is fresh but the UI is stale:

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml restart backend frontend
```

## Reference incident

- `docs/INCIDENT_20260526_LIVE_HERO_WS_STALL.md`
