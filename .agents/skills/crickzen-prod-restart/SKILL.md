---
name: crickzen-prod-restart
description: Safely restart the Crickzen production services without rebuilding from the dirty server tree.
---

# Crickzen Prod Restart

Use this skill when Crickzen needs a safe production bounce and you want to avoid rebuilding from server-local changes.

## Goal

- restart pinned services only
- do not rebuild images from the prod working tree
- verify public API and websocket reachability after restart

## Default commands

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml restart backend frontend
```

If scraper health is also degraded:

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml restart scraper
```

## Guardrails

1. Check `git status --short` first. The prod tree is often dirty.
2. Do **not** build or retag images from that dirty tree unless the server-side changes have been reviewed and committed.
3. Prefer restarting only the affected services:
   - live hero / websocket issues → `backend frontend`
   - stale scraper data → `scraper`
   - dashboard scheduler issue → `docker restart crickzen-dashboard`

## Post-restart checks

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
curl -i https://www.crickzen.com/api/ws/info
curl -s "https://www.crickzen.com/api/cricket-data/last-updated-data?url=<match-slug>"
```

## Known prod paths

- Main site stack: `/home/administrator/victoryline-monorepo`
- Dashboard service: `/home/administrator/projects/machine_learning_bbl`
