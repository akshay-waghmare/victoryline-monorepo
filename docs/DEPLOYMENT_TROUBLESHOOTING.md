# Deployment Troubleshooting

This document captures the production deployment issues observed on `204.12.199.137` during the rollout of commit `91d4a2d` so future deploys and agents can avoid repeating the same failures.

## Production Host Facts

- Host: `administrator@204.12.199.137`
- Repo path: `/home/administrator/victoryline-monorepo`
- Compose binary: `docker-compose 1.29.2`
- Docker CLI: modern Docker is installed, but the host workflow currently depends on `docker-compose`, not `docker compose`
- Passwordless SSH from this workstation is configured through `~/.ssh/id_server_wc`

## Issue 1: Wrong Compose Command

### Symptom

Commands that use `docker compose -f docker-compose.prod.yml ...` fail on the production host.

### Cause

The host only has the legacy `docker-compose` v1 workflow available in the deployment path that is currently used.

### Fix

Use `docker-compose -f docker-compose.prod.yml ...` on the server.

### Verification

```bash
docker-compose --version
docker-compose -f docker-compose.prod.yml config > /tmp/victoryline-prod-rendered.yml
```

## Issue 2: Mixed Image Tags in .env

### Symptom

The repo is updated, but the running stack still comes up on old images or a mixed release, for example:

```bash
BACKEND_IMAGE=macubex/victoryline-backend:v1.2.4
FRONTEND_IMAGE=macubex/victoryline-frontend:v1.2.1
SCRAPER_IMAGE=macubex/victoryline-scraper:v1.2.1
PRERENDER_IMAGE=macubex/victoryline-prerender:v1.2.1
```

### Cause

The server `.env` pins the deployed images independently of the git checkout.

### Fix

Before restart, inspect and update `.env` so all four app images point at the intended release tag or commit-based local image tag.

```bash
grep -E '^(BACKEND_IMAGE|FRONTEND_IMAGE|SCRAPER_IMAGE|PRERENDER_IMAGE)=' .env
```

## Issue 3: docker-compose v1 Recreate Bug

### Symptom

`docker-compose up -d` fails while recreating a service with an error similar to:

```text
KeyError: 'ContainerConfig'
```

This was observed when recreating `victoryline-backend` after new images had already been built successfully.

### Cause

`docker-compose` v1 can leave behind a renamed old container and then fail while trying to inspect its legacy volume metadata during recreation.

### Recovery

1. List matching containers:

```bash
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep victoryline
docker ps -a --filter name=backend --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

2. Remove the stale renamed container. Example from the incident:

```bash
docker rm -f d4b3c00042ac_victoryline-backend
```

3. Recreate services in dependency order instead of retrying a full parallel `up` immediately:

```bash
docker-compose -f docker-compose.prod.yml up -d backend
docker-compose -f docker-compose.prod.yml up -d prerender
docker-compose -f docker-compose.prod.yml up -d scraper
docker-compose -f docker-compose.prod.yml up -d frontend
docker-compose -f docker-compose.prod.yml up -d caddy
```

4. Verify the stack:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

## Issue 4: Scraper Starts Before Backend Is Fully Ready

### Symptom

Immediately after rollout, scraper health may report a failing or recovering internal state even though the container itself is up:

```json
{"status":"success","data":{"details":...,"score":30,"state":"failing"}}
```

Recent logs may show breaker errors such as:

```text
auth.token.circuit_open
matches.list.error metadata={'error': "Circuit breaker 'backend_api' is open"}
```

### Cause

The scraper booted while backend initialization was still in progress, so its startup-time backend calls opened the breaker.

### Recovery

Once backend health is confirmed, restart only the scraper:

```bash
docker restart victoryline-scraper
sleep 15
curl -fsS http://localhost:5000/health
docker logs --tail 60 victoryline-scraper
```

### Healthy Result

Expected scraper health after recovery:

```json
{"status":"success","data":{"details":...,"score":100,"state":"healthy"}}
```

## Issue 5: Frontend Loads but /api Calls Return SPA HTML or 404

### Symptom

The homepage loads, but browser console shows failures like:

```text
/api/events -> 404
/api/cricket-data/live-matches -> 404
WebSocket connection to wss://crickzen.com/api/ws/websocket failed: 404
```

In some cases, probing the public API path returns the Angular index HTML instead of backend JSON.

### Cause

The frontend still calls legacy backend routes through `/api/*`, for example:

- `/api/cricket-data/...`
- `/api/events...`
- `/api/tennis...`
- `/api/market...`
- `/api/ws/...`

But many backend controllers are actually mounted at:

- `/cricket-data/...`
- `/events...`
- `/tennis...`
- `/market...`
- `/ws...`

If Caddy forwards `/api/*` unchanged, backend returns 404. If Caddy falls through to the frontend reverse proxy first, the public API path may return SPA HTML instead of JSON.

### Correct Proxy Behavior

- Preserve true backend `/api` routes such as `/api/v1/*` and `/api/poll/*`
- Strip `/api` before proxying legacy frontend routes to backend
- Ensure the API handlers run before the frontend catch-all proxy

### Fix

Use ordered `handle` blocks in `Caddyfile.prod`.

```caddy
@backend_api_passthrough {
	path /api/v1/* /api/poll/* /actuator/* /h2-console* /swagger-ui* /swagger-ui.html /v3/api-docs*
}
handle @backend_api_passthrough {
	reverse_proxy backend:8099
}

@legacy_api {
	path /api/* /token/*
}
handle @legacy_api {
	uri strip_prefix /api
	reverse_proxy backend:8099
}

handle {
	reverse_proxy frontend:80
}
```

### Verification

These should return backend JSON, not HTML:

```bash
curl -i https://www.crickzen.com/api/cricket-data/live-matches
curl -i https://www.crickzen.com/api/events
curl -i https://www.crickzen.com/api/v1/seo/indexing/status
curl -i https://www.crickzen.com/api/ws/info
```

Expected result:

- `/api/cricket-data/live-matches` returns JSON array/object
- `/api/events` returns JSON array
- `/api/v1/seo/indexing/status` still returns JSON unchanged
- `/api/ws/info` returns SockJS metadata JSON, not 404

## Recommended Deployment Path

Preferred path for future releases:

1. Build images locally.
2. Push release tags to the registry.
3. Update server `.env` to the exact release tags.
4. Pull images on the server.
5. Restart services.

If local Docker is unavailable, building on the server is acceptable, but verify `.env` image pins before restart and be prepared for the `ContainerConfig` recovery steps above.

## Final Verification Commands

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
curl -fsS http://localhost:8099/api/v1/seo/indexing/status
curl -fsS http://localhost:5000/health
curl -I -fsS https://www.crickzen.com/
```