# Deployment Guide - v1.2.2

**Production rollout runbook for the upcoming-fixture naming and prod-alignment patch**

---

## Pre-Deployment Checklist

- [ ] Build and push `v1.2.2` images for backend, frontend, scraper, and prerender
- [ ] Copy `.env.production.example` to `.env` on the server and fill in secrets
- [ ] Confirm `gsc-service-account.json` exists if GSC/indexing remains enabled
- [ ] Run `.\scripts\Track-ProdImageState.ps1 -OperatorLabel before-<change>` from this Windows workstation before any prod change so the repo records the current prod image state
- [ ] Confirm `git status --short` is clean before any prod-side build; never rebuild prod images from a dirty server tree
- [ ] Confirm DNS for `crickzen.com` and `www.crickzen.com` still points at the production host
- [ ] Verify ports `80` and `443` are open for Caddy and ACME renewal

---

## Deployment Steps

### 0. Snapshot the current prod state before touching anything

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Track-ProdImageState.ps1 -OperatorLabel before-v1.2.2
ssh administrator@204.12.199.137 "cd /home/administrator/victoryline-monorepo && git status --short"
```

The tracker writes `ops\prod-state\latest.json`, appends `ops\prod-state\history.jsonl`, and saves a timestamped snapshot under `ops\prod-state\snapshots\`. Its console output shows previous vs current git HEAD, `.env` image pins, and running container images so tag changes are obvious.

If `git status --short` is not empty, stop. Do not rebuild or retag images from a dirty server tree.

### 1. Pull the latest committed code

```bash
cd /home/administrator/victoryline-monorepo
git fetch origin --tags
git checkout 008-match-title-seo
git pull origin 008-match-title-seo
git rev-parse HEAD
git log --oneline --decorate -5
```

### 2. Refresh environment configuration

```bash
test -f .env || cp .env.production.example .env
nano .env
```

Verify these image tags and runtime settings in `.env` before restarting anything:

```bash
BACKEND_IMAGE=<same release tag or commit-pinned image as the rest of the stack>
FRONTEND_IMAGE=<same release tag or commit-pinned image as the rest of the stack>
SCRAPER_IMAGE=<same release tag or commit-pinned image as the rest of the stack>
PRERENDER_IMAGE=<same release tag or commit-pinned image as the rest of the stack>

POLLING_INTERVAL_SECONDS=0.8
STALENESS_THRESHOLD_SECONDS=180
PID_SOFT_LIMIT=200
PID_RESTART_THRESHOLD=260
ENABLE_FAST_UPDATES=false
ENABLE_PERSISTENT_PAGES=false
PERSISTENT_PAGE_MAX_COUNT=30
PERSISTENT_PAGE_MAX_AGE_SECONDS=7200
FAST_POLL_INTERVAL_MS=1000
LETSENCRYPT_EMAIL=your-real-acme-contact@example.com
```

Keep all four app image pins on one release tag family or one commit-based build set before restart. For incident tracking, use commit-based tags such as `victoryline-scraper:healthfix-<sha>` and update the rest of the stack to the matching release or commit build at the same time.

Do not deploy from a dirty tree or with mixed image tags. Commit and push the intended change first, then update all image pins together so the running code and git history stay aligned.

### 3. Compare `.env` pins, running containers, and git history

```bash
grep -E '^(BACKEND_IMAGE|FRONTEND_IMAGE|SCRAPER_IMAGE|PRERENDER_IMAGE)=' .env
for service in backend frontend scraper prerender; do
  docker inspect "victoryline-$service" --format "victoryline-$service -> {{.Config.Image}}"
done
git log --oneline --decorate -5
```

### 4. Pull the pinned images

```bash
docker compose -f docker-compose.prod.yml pull backend frontend scraper prerender
```

### 5. Validate the compose and Caddy config before restart

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d caddy
docker exec victoryline-proxy caddy validate --config /etc/caddy/Caddyfile
```

If `caddy validate` fails, stop and fix the env/config before redeploying the full stack.

### 6. Restart the production stack

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### 7. Confirm service health

```bash
docker compose -f docker-compose.prod.yml ps

curl -fsS http://localhost:5000/health | jq
curl -fsS http://localhost:8099/api/v1/seo/indexing/status | jq
curl -fsS http://localhost/healthz
```

### 8. Inspect logs during warm-up

```bash
docker logs victoryline-scraper --tail 100
docker logs victoryline-backend --tail 100
docker logs victoryline-proxy --tail 100
```

Look for:

- schedule-sync activity without parser exceptions
- normal backend startup and indexing scheduler status
- Caddy certificate / routing errors

### 9. Inspect image alignment after restart

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Track-ProdImageState.ps1 -OperatorLabel after-v1.2.2
```

Use the tracker output (and the new JSON snapshot under `ops\prod-state\`) to confirm old vs new image names after the restart.

### 10. Verify the user-facing change

Open the homepage and matches page and confirm:

- standard upcoming cards show full team names
- compact homepage cards still show short abbreviations
- completed and live cards remain unchanged

---

## Post-Deployment Monitoring

If the rollout behaves differently from this runbook, check [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md) before retrying. The production host currently has a few known behaviors that differ from the assumptions in the original steps below.

For the first 15 minutes, monitor:

```bash
watch -n 10 'docker compose -f docker-compose.prod.yml ps'
watch -n 10 'docker stats --no-stream victoryline-backend victoryline-scraper victoryline-frontend victoryline-proxy'
watch -n 15 'curl -fsS http://localhost:5000/health | jq -r ".status, .data.scrapers[0].status"'
```

Additional checks:

```bash
docker logs victoryline-scraper --tail 200 | grep -i "schedule\|error\|exception"
docker exec victoryline-proxy sh -c 'test -f /data/access.log && tail -n 20 /data/access.log'
```

---

## Rollback Procedure

If the release needs to be reverted:

```bash
docker compose -f docker-compose.prod.yml down

# Revert image tags in .env
sed -i 's/v1.2.2/v1.2.1/g' .env

docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

After rollback, re-check:

- `http://localhost:5000/health`
- `http://localhost:8099/api/v1/seo/indexing/status`
- `http://localhost/healthz`

---

## Known Production Host Differences

- The production host `204.12.199.137` now uses `docker compose` `v2.29.2` as the standard workflow; avoid mixing `docker compose` and `docker-compose` in the same rollout.
- Historical `docker-compose` v1 recreates could fail with `KeyError: 'ContainerConfig'` during container recreation.
- If you hit that legacy failure, remove the stale renamed container left behind by Compose and recreate services in dependency order: `backend`, `prerender`, `scraper`, `frontend`, `caddy`.
- SSH from this workstation is configured for passwordless access via `~/.ssh/id_server_wc` for `administrator@204.12.199.137`.
- The scraper may report a temporary failing state immediately after rollout if backend startup is still in progress. A one-time `docker restart victoryline-scraper` clears the breaker state once backend is healthy.

See [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md) for the exact failure signatures and recovery commands.

---

## Why this rollout is different from v1.2.1

This release removes the prod scraper bind mounts that previously overrode the tagged image contents. That means the deployment now tracks the declared Docker tags accurately, which is safer for repeatable rollouts and rollback.
