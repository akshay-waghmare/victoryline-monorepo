# Deployment Guide - v1.2.2

**Production rollout runbook for the upcoming-fixture naming and prod-alignment patch**

---

## Pre-Deployment Checklist

- [ ] Build and push `v1.2.2` images for backend, frontend, scraper, and prerender
- [ ] Copy `.env.production.example` to `.env` on the server and fill in secrets
- [ ] Confirm `gsc-service-account.json` exists if GSC/indexing remains enabled
- [ ] Back up the current `.env` and record currently deployed image tags
- [ ] Confirm DNS for `crickzen.com` and `www.crickzen.com` still points at the production host
- [ ] Verify ports `80` and `443` are open for Caddy and ACME renewal

---

## Deployment Steps

### 1. Pull the latest code

```bash
cd /home/administrator/victoryline-monorepo
git fetch origin
git checkout 008-match-title-seo
git pull origin 008-match-title-seo
```

### 2. Refresh environment configuration

```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp .env.production.example .env
nano .env
```

Verify these image tags and runtime settings in `.env`:

```bash
BACKEND_IMAGE=macubex/victoryline-backend:v1.2.2
FRONTEND_IMAGE=macubex/victoryline-frontend:v1.2.2
SCRAPER_IMAGE=macubex/victoryline-scraper:v1.2.2
PRERENDER_IMAGE=macubex/victoryline-prerender:v1.2.2

PID_SOFT_LIMIT=300
PID_RESTART_THRESHOLD=350
ENABLE_PERSISTENT_PAGES=true
PERSISTENT_PAGE_MAX_COUNT=15
PERSISTENT_PAGE_MAX_AGE_SECONDS=7200
FAST_POLL_INTERVAL_MS=1000
LETSENCRYPT_EMAIL=your-real-acme-contact@example.com
```

### 3. Pull the tagged images

```bash
docker pull macubex/victoryline-backend:v1.2.2
docker pull macubex/victoryline-frontend:v1.2.2
docker pull macubex/victoryline-scraper:v1.2.2
docker pull macubex/victoryline-prerender:v1.2.2
```

### 4. Validate the compose and Caddy config before restart

```bash
docker compose -f docker-compose.prod.yml config > /tmp/victoryline-prod-rendered.yml
docker compose -f docker-compose.prod.yml up -d caddy
docker exec victoryline-proxy caddy validate --config /etc/caddy/Caddyfile
```

If `caddy validate` fails, stop and fix the env/config before redeploying the full stack.

### 5. Restart the production stack

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### 6. Confirm service health

```bash
docker compose -f docker-compose.prod.yml ps

curl -fsS http://localhost:5000/health | jq
curl -fsS http://localhost:8099/api/v1/seo/indexing/status | jq
curl -fsS http://localhost/healthz
```

### 7. Inspect logs during warm-up

```bash
docker logs victoryline-scraper --tail 100
docker logs victoryline-backend --tail 100
docker logs victoryline-proxy --tail 100
```

Look for:

- schedule-sync activity without parser exceptions
- normal backend startup and indexing scheduler status
- Caddy certificate / routing errors

### 8. Verify the user-facing change

Open the homepage and matches page and confirm:

- standard upcoming cards show full team names
- compact homepage cards still show short abbreviations
- completed and live cards remain unchanged

---

## Post-Deployment Monitoring

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

## Why this rollout is different from v1.2.1

This release removes the prod scraper bind mounts that previously overrode the tagged image contents. That means the deployment now tracks the declared Docker tags accurately, which is safer for repeatable rollouts and rollback.