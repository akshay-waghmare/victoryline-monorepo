---
name: crickzen-local-stack-ops
description: Start, rebuild, restart, and verify the local Crickzen Docker stack, including checking that frontend image changes are actually present in the running app.
---

# Crickzen Local Stack Ops

Use this skill when the local `victoryline-monorepo` stack needs to be started again, rebuilt, or verified after frontend or scraper changes.

## Docker disk hygiene

Before large local rebuilds, check Docker disk usage:

```powershell
docker system df
```

If unused images or build cache are piling up, reclaim space before retrying a heavy rebuild:

```powershell
docker image prune -af
docker builder prune -af
```

Do not remove volumes unless the task explicitly allows deleting local state.

## Default stack command

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

## Service checks

```powershell
docker compose -f docker-compose.local.yml ps
Invoke-RestMethod http://localhost:5000/health | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/live-matches | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/upcoming-matches | ConvertTo-Json -Depth 6
Invoke-RestMethod http://localhost:8099/cricket-data/completed-matches | ConvertTo-Json -Depth 6
```

Local URLs to check:

- `http://localhost:8080/Home`
- `http://localhost:8099/api/v1/seo/indexing/status`
- `http://localhost:5000/health`

## Frontend-image verification

Do not assume a browser refresh proves the container was rebuilt.

Verify at least one of:

1. The running page contains the new copy or markup you expect
2. The built bundle inside the running frontend container contains the new strings
3. `docker inspect` or `docker compose ps` confirms the expected image/container was recreated

Useful checks:

```powershell
Invoke-WebRequest http://localhost:8080/Home | Select-Object -ExpandProperty Content
docker exec victoryline-monorepo-frontend-1 sh -lc "grep -R \"expected text\" /app/dist -n || true"
docker inspect victoryline-monorepo-frontend-1 --format "{{.Image}}"
```

## Targeted rebuilds

Frontend only:

```powershell
docker compose -f docker-compose.local.yml up -d --build frontend
```

Scraper only:

```powershell
docker compose -f docker-compose.local.yml up -d --build scraper
```

## When restart is not enough

- If containers are healthy but no matches appear, switch to `crickzen-live-score-incident` or `crickzen-match-state-reconcile`
- If scraper health is up but data is empty, inspect logs instead of assuming the frontend is broken
- If the page still looks old, prove whether the issue is browser cache, SSR output, or stale container image
- After a successful rebuild cycle, keep Docker space under control so the next rollout does not fail on local disk pressure
