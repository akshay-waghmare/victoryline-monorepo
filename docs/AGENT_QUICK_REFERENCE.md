# Production Incident Resolver - Quick Reference

Use this when prod shows **scraper up, but live data is stale**.

## Always snapshot prod image state before and after changes

Run this from the Windows workstation repo before touching prod `.env`, pulling images, rebuilding, or restarting services:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Track-ProdImageState.ps1 -OperatorLabel before-<change>
```

Run it again after the rollout:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Track-ProdImageState.ps1 -OperatorLabel after-<change>
```

The script records only prod git HEAD, the four image pins, running container images, timestamp, and optional operator label. It writes machine-readable history to:

- `ops\prod-state\latest.json`
- `ops\prod-state\history.jsonl`
- `ops\prod-state\snapshots\*.json`

Its console table shows previous vs current values so old vs new image names are obvious without guessing.

## 1-minute triage

```bash
cd /home/administrator/victoryline-monorepo

git rev-parse HEAD
git status --short
grep IMAGE= .env
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker inspect victoryline-scraper --format '{{.RestartCount}}'

for i in 1 2 3; do
  echo "--- /health attempt $i ---"
  curl -sv http://localhost:5000/health
  sleep 3
done

curl -s http://localhost:5000/metrics | grep -E 'scraper_domain_failures|scraper_scrapes_total' | head
```

## Symptom fingerprint for this incident

- `curl http://localhost:5000/metrics` succeeds
- `curl http://localhost:5000/health` may return **empty reply** on broken versions
- `docker inspect victoryline-scraper --format '{{.RestartCount}}'` keeps climbing
- `docker ps` can still show scraper as `Up`
- live matches / score updates stay stale

## Critical rule: `/health` and `/status` are observational only

Docker healthchecks hit `/health` in prod (`docker-compose.prod.yml`).

- Do **not** make `/health` or `/status` restart scrapers
- Do **not** mutate scraper state from those endpoints
- Do **not** trigger heavy work, cleanup, or recovery logic there
- Safe uses: report health, counters, timestamps, current state

If a health endpoint can crash, block, or mutate state, Docker will amplify the problem.

## Fast checks to compare before changing anything

```bash
cd /home/administrator/victoryline-monorepo

grep IMAGE= .env
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker inspect victoryline-scraper --format '{{.RestartCount}}'

for i in 1 2 3; do
  curl -sv http://localhost:5000/health
  sleep 3
done

git status --short
```

Interpretation:

- `.env` image pins != `docker ps` images → config/runtime drift
- dirty `git status --short` → server working copy drift
- `RestartCount` rising + `/metrics` works + `/health` breaks → suspect health-handler regression in current scraper image

## Rebuild / rollback guardrails

Before rebuilding any prod image, record and back up:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Track-ProdImageState.ps1 -OperatorLabel before-rebuild
ssh administrator@204.12.199.137 "cd /home/administrator/victoryline-monorepo && git status --short"
```

Why:

- prod may run **local commit-based images built from the server working copy**
- rebuilding from git can drop uncommitted server fixes
- `.env` is the source of truth for pinned image tags

## Stable prod scraper image pattern

Current known-good prod scraper images use local commit-based tags such as:

```bash
victoryline-scraper:healthfix-<sha>
```

If prod is broken, verify whether `.env` and `docker ps` still point to the expected `healthfix-*` scraper image.

## Escalate / drill deeper

- `.github/agents/prod-incident-resolver.agent.md`
- `docs/DEPLOYMENT_TROUBLESHOOTING.md`
- `docs/INCIDENT_2026_04_06_CODE_DESYNC.md`
