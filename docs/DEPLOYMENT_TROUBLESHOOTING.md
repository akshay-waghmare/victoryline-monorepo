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

## Issue 6: Production Match Page Still Shows Old UI After Frontend Changes

### Symptom

You update the match page in the repo, build succeeds locally, but `https://www.crickzen.com/cric-live/<slug>` still shows the old UI in production.

Common clues:

- the production HTML still references older frontend asset hashes than the local build output
- the match page looks older even after browser hard refresh
- homepage or `/matches` may still load, but the individual match page does not reflect recent UI work

### Causes

There are two production-specific causes to check:

1. **Old frontend/prerender images are still deployed**
   - `docker-compose.prod.yml` serves tagged images such as `macubex/victoryline-frontend:v1.2.2`
   - production does **not** read the local git worktree directly
   - if new images were not built, pushed, pulled, and restarted, the old UI stays live

2. **Stale prerendered match HTML is being served to human users**
   - the frontend nginx config handles `/cric-live/<slug>` specially
   - if the route uses `try_files $prerender_file /index.html`, regular users can receive stale prerendered match HTML whenever that file exists
   - this makes the live site appear unchanged even if the Angular SPA code was updated

### Verification

1. Compare prod asset hashes with the latest local or CI build output:

```bash
curl -fsS https://www.crickzen.com/matches | grep -Eo 'main\.[^"]+\.js|styles\.[^"]+\.css'
```

2. Check deployed image pins on the server:

```bash
cd /home/administrator/victoryline-monorepo
grep -E '^(FRONTEND_IMAGE|PRERENDER_IMAGE)=' .env
docker inspect victoryline-frontend --format '{{.Config.Image}}'
docker inspect victoryline-prerender --format '{{.Config.Image}}'
```

3. Inspect the match-route nginx behavior in the frontend image/config. The safe behavior is:

```nginx
location ~ ^/cric-live/([a-z0-9-]+)$ {
    set $match_slug $1;
    set $prerender_file /prerender/cric-live/$match_slug.html;
    set $match_entry /index.html;

    if ($is_bot) {
        set $match_entry $prerender_file;
    }

    try_files $match_entry /index.html;
}
```

### Fix

1. Build and push new `frontend` and `prerender` images that include the latest UI and nginx config.
2. Update `.env` on the server if the release tags changed.
3. Pull the new images.
4. Recreate `prerender` and `frontend` (and `caddy` if needed).

```bash
cd /home/administrator/victoryline-monorepo
docker-compose -f docker-compose.prod.yml pull frontend prerender
docker-compose -f docker-compose.prod.yml up -d prerender frontend caddy
```

If `docker-compose` v1 hits the known recreate bug, follow the recovery steps from **Issue 3** and recreate in dependency order.

## Issue 7: Production Scores Stop Updating While Scraper Container Stays Up

### Symptom

- `/api/cricket-data/live-matches` still returns live matches, but their `lastStateUpdatedAt` values are many minutes old
- `victoryline-scraper` may still be `Up`, yet score updates on the site appear frozen
- scraper logs keep showing match-list polling, but live match pushes stop advancing
- `docker top victoryline-scraper` shows a large Chromium/Playwright process tree

### Root Cause

The async scraper service (`python -m crex_scraper_python.src.app`) can remain alive while its live-task workers stop making forward progress:

1. the service health endpoint kept returning HTTP 200 even when live data was stale
2. the monitor loop only tried in-process browser recycle, with no guaranteed hard container restart if freshness never recovered
3. production enabled the player-stats crawler by default, adding extra browser pressure even when live score freshness was the primary requirement
4. the container had no PID cap, so Chromium child processes could accumulate well before Docker intervened
5. live scrape tasks had no hard timeout, so a few hung Playwright fetches could occupy all workers indefinitely
6. the async scheduler de-duplicates active match IDs, so once those hung tasks occupied the worker pool the same live matches would not be re-enqueued until the stuck tasks finally finished

### Fix

Deploy the scraper with all of the following:

1. **Health-driven hard restart**
   - the async scraper `/health` endpoint now returns `503` when live matches are stale beyond the restart threshold or PID count exceeds the restart threshold
   - on those conditions it schedules `os._exit(1)` so Docker restarts the container cleanly

2. **Real manual recycle endpoint**
   - `POST http://localhost:5000/recycle` now performs an actual browser-pool recycle instead of returning a stub success

3. **Lower prod resource thresholds**
   - `PID_SOFT_LIMIT=200`
   - `PID_RESTART_THRESHOLD=260`

4. **Favor live updates over secondary crawlers and experimental fast-poll paths**
   - production defaults for `ENABLE_FAST_UPDATES` and `ENABLE_PERSISTENT_PAGES` should remain `false` until task/thread usage is proven stable
   - production default for `ENABLE_PLAYER_STATS_CRAWLER` is now `false`
   - only re-enable it intentionally after verifying score freshness remains stable

5. **Container PID cap**
   - set `pids_limit: 512` for the scraper service in `docker-compose.prod.yml`

6. **Measure Linux tasks, not just child processes**
   - Chromium can stay under a low process count while still exhausting the container task limit via hundreds of threads
   - health/restart logic must count process threads for the Python process plus child browser processes

7. **Do not run orphan cleanup heuristics in the async scraper runtime**
   - Playwright launches browsers under a `python -> node -> chrome` tree
   - a naive "parent is not python" orphan detector will kill legitimate live browser processes and create a restart loop
   - use browser-pool recycle plus whole-container restart instead of killing browser descendants opportunistically

8. **Bound live-task runtime so the queue can recover**
   - wrap the main `adapter.fetch_match(...)` call in `asyncio.wait_for(...)`
   - use a timeout at least as large as the configured circuit-breaker window
   - when a live scrape times out, let the worker fail fast, release the scheduler's active-task lock, and retry on the next poll instead of freezing the pipeline behind permanently stuck tasks

### Immediate Recovery

```bash
cd /home/administrator/victoryline-monorepo
docker-compose -f docker-compose.prod.yml up -d --force-recreate scraper
sleep 20
curl -fsS http://localhost:5000/health
curl -fsS https://www.crickzen.com/api/cricket-data/live-matches
```

### Verification

1. Health endpoint should show current activity and no restart pending:

```bash
curl -fsS http://localhost:5000/health
```

Look for:

- `active_matches` > 0 when live matches exist
- recent `last_scrape`
- `restart_scheduled: false`
- no restart reason while `lastStateUpdatedAt` is still moving

2. Public live data should be fresh:

```bash
python3 - <<'PY'
import json, time, urllib.request
with urllib.request.urlopen('https://www.crickzen.com/api/cricket-data/live-matches', timeout=20) as r:
    data = json.load(r)
now = int(time.time() * 1000)
for match in data:
    age = round((now - match["lastStateUpdatedAt"]) / 1000, 1)
    print(match["externalMatchKey"], age)
PY
```

3. Process count should stay below the soft limit during steady state:

```bash
docker exec victoryline-scraper ps -eo pid,comm | grep -E 'chrome|chromium|playwright' | wc -l
docker inspect victoryline-scraper --format '{{.State.Health.Status}}'
```

4. Backend rows should keep advancing even during partial worker failures:

```bash
python3 - <<'PY'
import json, time, urllib.request
with urllib.request.urlopen('http://127.0.0.1:8099/cricket-data/live-matches', timeout=20) as r:
    data = json.load(r)
rows = data if isinstance(data, list) else data.get('data') or []
now = int(time.time() * 1000)
for match in rows:
    age = round((now - match["lastStateUpdatedAt"]) / 1000, 1)
    print(match["externalMatchKey"], age)
PY
```

## Recommended Deployment Path

Preferred path for future releases:

1. Build images locally.
2. Push release tags to the registry.
3. Update server `.env` to the exact release tags.
4. Pull images on the server.
5. Restart services.

If local Docker is unavailable, building on the server is acceptable, but verify `.env` image pins before restart and be prepared for the `ContainerConfig` recovery steps above.

## Issue 8: Scraper TypeError Crash Loop After Rebuilding Image (2026-04-06)

### Symptom

Scraper shows 100% failure rate with `error_type="TypeError"` in Prometheus metrics. Health endpoint reports `state: "failing"`, `consecutive_failures: 200+`. Container restarts every ~60 seconds. No score data reaches the frontend.

```bash
curl -s http://localhost:5000/metrics | grep scraper_domain_failures
# scraper_domain_failures_total{domain="crex",error_type="TypeError"} 244.0
```

### Root Cause

The scraper image was rebuilt from the working directory which contained uncommitted code that used `metadata=` as a keyword argument in standard Python `logging.getLogger()` calls. Standard Python loggers do NOT accept `metadata=` — only structlog's `get_logger()` does.

```python
# BUG — crex_scraper.py uses logging.getLogger(__name__) (standard Python logger)
logger.info("scrape.task.start", metadata={"match_id": canonical_id})
# → TypeError: Logger._log() got an unexpected keyword argument 'metadata'

# WORKS — cricket_data_service.py uses get_logger() (structlog)
logger.info("matches.push.start", metadata={"url": source_url})
# → No error, structlog accepts arbitrary kwargs
```

The `logger.info("scrape.task.start", metadata={...})` call runs BEFORE the try/except in `_process_task()`, so every scrape task crashes immediately without fetching any data.

### Why It Wasn't Caught

- Images are built on prod from the git working directory, including unstaged/uncommitted changes
- The committed code (HEAD) does NOT have the buggy lines — they exist only in the working copy
- No CI/CD pipeline to validate the working copy before image build
- The TypeError only manifests at runtime (Python doesn't validate kwargs at import time)

### Recovery

1. Identify the last working image:

```bash
cat .env.bak.matchinfo-20260406_083630  # or other recent backup
# SCRAPER_IMAGE=victoryline-scraper:liveupdates-20260406-0635  ← working
```

2. Revert .env to working image:

```bash
cd /home/administrator/victoryline-monorepo
cp .env .env.bak.broken-$(date +%Y%m%d_%H%M%S)
sed -i 's|SCRAPER_IMAGE=.*|SCRAPER_IMAGE=victoryline-scraper:liveupdates-20260406-0635|' .env
```

3. Restart:

```bash
docker compose -f docker-compose.prod.yml up -d scraper
sleep 20
curl -s http://localhost:5000/health | python3 -m json.tool
```

### Fix Applied

Changed `metadata=` kwargs to f-string logging in `crex_scraper.py`:

```python
# Before (broken):
logger.info("scrape.task.start", metadata={"match_id": canonical_id, ...})

# After (fixed):
logger.info(f"scrape.task.start match_id={canonical_id} url={task.url} timeout={fetch_timeout_seconds:.0f}s")
```

### Logging Convention (IMPORTANT)

| File | Logger Type | `metadata=` kwarg |
|------|------------|-------------------|
| `crex_scraper.py` | `logging.getLogger(__name__)` (standard) | ❌ NOT supported |
| `cricket_data_service.py` | `get_logger(component=...)` (structlog) | ✅ Supported |
| `app.py`, `health.py`, `browser_pool.py` | `logging.getLogger(__name__)` (standard) | ❌ NOT supported |

**Rule**: If the file uses `logging.getLogger()`, use f-strings or `%s` formatting. If it uses `get_logger()` from `loggers/adapters.py`, `metadata=` is safe.

### Lessons Learned

1. **Always back up `.env` before changing image tags** — it is the only record of what was running
2. **Never rebuild images from uncommitted code** — always commit and push first
3. **Check `docker images` for rollback targets** — old image tags are available locally
4. **The scraper TypeError pattern is silent** — no traceback in logs, only Prometheus `error_type="TypeError"` counter

## .env Backup Policy

**ALWAYS** back up `.env` before any deployment change:

```bash
cp .env .env.bak.$(date +%Y%m%d_%H%M%S)
```

Before changing image tags, record what was running:

```bash
grep IMAGE= .env > .env.images.$(date +%Y%m%d_%H%M%S)
```

Keep at least the last 3 backups. The `.env` file is the **only** record of which exact images are running in production.

## Docker Compose v2 Note

As of 2026-04-06, the production server has **Docker Compose v2.29.2** installed. Use `docker compose` (v2 syntax with space) instead of `docker-compose` (v1 hyphenated). Note that v2 is stricter about conflicting config — e.g., `pids_limit:` at service level conflicts with `deploy.resources.limits.pids`. Use only one form.

## Final Verification Commands

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
curl -fsS http://localhost:8099/api/v1/seo/indexing/status
curl -fsS http://localhost:5000/health
curl -I -fsS https://www.crickzen.com/
```
