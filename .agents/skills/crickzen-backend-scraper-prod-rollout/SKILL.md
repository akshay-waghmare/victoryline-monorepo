---
name: crickzen-backend-scraper-prod-rollout
description: Safely deploy Crickzen backend and scraper production changes from the local repo to the Docker stack without rebuilding from the server tree. Use when live-score, scraper, websocket, or backend API changes must reach prod and you need backend-first restart ordering, bind-mount drift checks, and proof from public live-match freshness plus scraper health/logs.
---

# Crickzen Backend And Scraper Prod Rollout

Use this skill when the change is not frontend-only and production needs the live-score stack updated safely.

## Guardrails

1. Do not rebuild from the server repo tree unless the task explicitly requires it.
2. Tag and push images to the registry first, then pull them on prod.
3. Back up prod `.env` before changing image pins or feature flags.
4. Restart backend first and wait for health before restarting scraper.
5. Treat bind-mounted source files as higher priority than the image, because they override the container filesystem at runtime.
6. Treat `docker save | ssh ... docker load` as a fallback only when registry push/pull is unavailable.
7. Check local Docker disk pressure before builds and prune unused images/build cache after a verified rollout.

## Known prod paths

- SSH binary: `C:\Program Files\Git\usr\bin\ssh.exe`
- SCP binary: `C:\Program Files\Git\usr\bin\scp.exe`
- Host: `administrator@204.12.199.137`
- Repo: `/home/administrator/victoryline-monorepo`
- Compose file: `docker-compose.prod.yml`

## Required preflight

On prod, inspect whether the scraper service bind-mounts any source files:

```bash
cd /home/administrator/victoryline-monorepo
docker inspect victoryline-scraper --format '{{json .Mounts}}'
```

If files such as `apps/scraper/crex_scraper_python/src/crex_scraper.py` are mounted into `/app/...`, sync those host files from the local repo or remove the mount before trusting the new image.

## Recommended rollout flow

### Local build

Build only the services you changed.

Check local Docker space first:

```powershell
docker system df
```

Example scraper build:

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\scraper
docker build -t macubex/victoryline-scraper:<tag> .
```

Example backend build:

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\backend\spring-security-jwt
mvn -DskipTests compile
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo
docker build -t macubex/victoryline-backend:<tag> apps/backend/spring-security-jwt
```

### Push images to the registry

```powershell
docker push macubex/victoryline-backend:<tag>
docker push macubex/victoryline-scraper:<tag>
```

### Pull and pin on prod

```bash
cd /home/administrator/victoryline-monorepo
docker pull macubex/victoryline-backend:<tag>
docker pull macubex/victoryline-scraper:<tag>
```

### Update prod env

Update only the necessary pins and flags in `/home/administrator/victoryline-monorepo/.env`:

- `BACKEND_IMAGE=macubex/victoryline-backend:<tag>`
- `SCRAPER_IMAGE=macubex/victoryline-scraper:<tag>`
- `ENABLE_FAST_UPDATES=true` when fast lane is intended
- `ENABLE_PERSISTENT_PAGES=true` when persistent pages are intended

### Sync bind-mounted scraper files when needed

If compose mounts scraper source files, copy the local fixed file to the matching server path and keep a backup of the old host file first.

## Restart order

On prod:

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml up -d scraper
```

Wait for backend health before restarting scraper. If scraper started too early and opened auth or backend circuit breakers, restart only the scraper once backend is healthy.

## Required proof

### Containers

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

### Scraper health

```bash
curl -i http://localhost:5000/health
```

For fast lane work, confirm:

- `fast_updates.enabled=true`
- `covered_matches == live_matches`
- `active_interceptors > 0` when live matches exist

### Scraper logs

Look for:

- `matches.push_immediate.success`
- `schedule.sync.success`

Treat repeated `auth.token.circuit_open`, `backend_api` circuit-open messages, or `500` from `/health` as rollout failures that must be explained before closing the task.

### Public API freshness

Verify both:

```powershell
Invoke-WebRequest -UseBasicParsing https://www.crickzen.com/api/cricket-data/live-matches
Invoke-WebRequest -UseBasicParsing "https://www.crickzen.com/api/cricket-data/last-updated-data?url=<match-slug>"
```

Do not close the rollout until the public match payload advances during a real live window.

## Fallback

If Docker Hub or the chosen registry is unavailable, fall back to `docker save | ssh ... docker load` and state clearly that the primary registry workflow was blocked.

## Local cleanup after success

Once the rollout is verified, keep the workstation clear of stale Docker artifacts:

```powershell
docker system df
docker image prune -af
docker builder prune -af
```

Do not prune volumes unless the task explicitly includes deleting local state.
