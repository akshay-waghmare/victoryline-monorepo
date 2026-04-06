# Production Incident Resolver - Quick Reference

**Use this guide when investigating production issues at crickzen.com (204.12.199.137)**

---

## 🚨 CRITICAL CHECKS (Do These First)

### 1. Code Desync Check (INCIDENT 2026-04-06)
```bash
cd /home/administrator/victoryline-monorepo
git status --short  # ← Check for ANY uncommitted changes

# If dirty, COMMIT BEFORE REBUILDING:
git add .
git commit -m "fix: sync server-side changes"
git push
```
⚠️ **Why**: Uncommitted code causes images to break when rebuilding from git. ~15,000 lines were uncommitted, causing complete system failure.

### 2. Service Health Check
```bash
# All services
docker ps --format 'table {{.Names}}\t{{.Status}}'

# Scraper specifically
curl -s http://localhost:5000/health | python3 -m json.tool
# Look for: state=healthy, score=100, consecutive_failures=0

# Backend API
curl -s http://localhost:8099/cricket-data/live-matches | \
  python3 -c "import sys,json; print(len(json.load(sys.stdin)))"  # Should print count > 0
```

### 3. Backup .env (Before ANY Changes)
```bash
cp .env .env.bak.$(date +%Y%m%d_%H%M%S)
```
⚠️ **Why**: `.env` is the ONLY record of which images are running. Losing it = no rollback.

---

## 🔍 Three Common Failure Patterns

### Pattern A: "No Live Scores" / Score Update Lag
**Symptoms**: Frontend shows old/stale data, `/live-matches` returns matches but `lastStateUpdatedAt` is old

**Diagnosis Checklist**:
- [ ] `git status` on server shows no uncommitted changes
- [ ] Scraper health shows `state: healthy` (no TypeError)
- [ ] Backend last-updated-data endpoint returns 200 OK (not 404)

**Commands**:
```bash
# 1. Check scraper metrics for TypeError
curl -s http://localhost:5000/metrics | grep scraper_domain_failures | head -3

# 2. If you see error_type="TypeError": → Logger bug (see Pattern B)

# 3. Check backend endpoint works
MATCH_URL=$(curl -s http://localhost:8099/cricket-data/live-matches | \
  python3 -c "import sys,json; m=json.load(sys.stdin); print(m[0]['url'])")
curl -s "http://localhost:8099/cricket-data/last-updated-data?url=$MATCH_URL" | \
  python3 -m json.tool
# Should return score data, NOT 404
```

**If 404**: Backend URL matching broke. Fix `CricketDataService.findLastUpdatedEntity()` with fallback chain.

---

### Pattern B: "Scraper Container Running But Not Updating"
**Symptoms**: Scraper shows `Up` but `docker logs` show errors every ~5s, health shows `consecutive_failures: 100+`

**Diagnosis Checklist**:
- [ ] Check for `TypeError` in metrics
- [ ] Check for `metadata=` in crex_scraper.py logs
- [ ] Check git status for uncommitted changes

**Commands**:
```bash
# 1. Check for TypeError crash pattern
curl -s http://localhost:5000/metrics | grep scraper_domain_failures
# If error_type="TypeError" with count > 10 → This is it

# 2. Grep for the bug in running container
docker exec victoryline-scraper grep -n 'metadata=' \
  /app/crex_scraper_python/src/crex_scraper.py
# Should return EMPTY. If it finds lines → FIX IMMEDIATELY

# 3. Check recent logs
docker logs victoryline-scraper --tail 30 2>&1 | grep -i typeerror
```

**Fix Pattern**:
```python
# BROKEN (crex_scraper.py uses logging.getLogger):
logger.info("scrape.task.start", metadata={"match_id": id})

# FIXED:
logger.info(f"scrape.task.start match_id={id}")
```

---

### Pattern C: "New Code Changes Not Showing in Prod"
**Symptoms**: You updated frontend/backend/scraper and committed, but prod still shows old behavior

**Diagnosis Checklist**:
- [ ] Check .env image tags match latest release
- [ ] Check git log shows your commit
- [ ] Check Docker images have been pulled

**Commands**:
```bash
# 1. Check if git changes made it to prod
git log --oneline -3
# Should show your recent commit

# 2. Check image tags
grep IMAGE= .env

# 3. Check what's actually running
docker ps --format 'table {{.Names}}\t{{.Image}}'

# 4. If they don't match, pull latest and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Rollback Patterns

### Quick Rollback (Last 30 Minutes)
```bash
# Restore most recent .env backup
ls -lt .env.bak.* | head -1  # Show most recent
cp .env .env.bak.broken-$(date +%Y%m%d_%H%M%S)
cp .env.bak.* .env  # Restore most recent
docker compose -f docker-compose.prod.yml up -d
sleep 20 && curl -s http://localhost:5000/health | python3 -m json.tool
```

### Full Morning Revert (If You Know Morning Backup)
```bash
cp .env .env.bak.broken-$(date +%Y%m%d_%H%M%S)
cp .env.bak.matchinfo-20260406_083630 .env  # (or your morning timestamp)
docker compose -f docker-compose.prod.yml up -d
sleep 20 && docker ps
```

### Code Desync Recovery (Commit & Rebuild)
```bash
# Check what's dirty
git status --short
git diff --stat

# Commit everything
git add .
git commit -m "fix: sync server-side changes"
git push

# Rebuild from fresh git
git pull
docker compose -f docker-compose.prod.yml build --no-cache scraper
docker tag victoryline-scraper:latest victoryline-scraper:fixed-$(date +%s)
sed -i 's|SCRAPER_IMAGE=.*|SCRAPER_IMAGE=victoryline-scraper:fixed-'$(date +%s)'|' .env
docker compose -f docker-compose.prod.yml up -d scraper
sleep 20 && curl -s http://localhost:5000/health | python3 -m json.tool
```

---

## 📋 Pre-Deployment Checklist

Before rebuilding ANY images on prod:

- [ ] Run `git status --short` — must be EMPTY
- [ ] If dirty: commit with clear message
- [ ] `grep IMAGE= .env` — note what's currently running
- [ ] `cp .env .env.bak.$(date +%Y%m%d_%H%M%S)` — backup before changing
- [ ] After rebuild: `docker ps` and `curl -s http://localhost:5000/health`
- [ ] Verify live score data flowing

---

## 🎯 Key Facts (Remember These)

| Topic | Fact |
|-------|------|
| **Code Desync** | ~15,000 lines of server changes were never committed. Rebuilding from git failed. ALWAYS commit before building. |
| **Logger Bug** | `crex_scraper.py` uses standard logger (NOT structlog). Use f-strings: `logger.info(f"msg key={val}")`. NO `metadata=` kwargs. |
| **Polling** | Scraper polling is 0.8s (was 2.5s before lag fix). If lag reappears, verify `POLLING_INTERVAL_SECONDS=0.8` env var. |
| **Rollback Path** | `.env` is the ONLY record of running images. Always backup before changes. |
| **Frontend** | Makes 3 separate REST calls (live/upcoming/completed) + WebSocket. betx21 uses single endpoint (future optimization). |

---

## 📚 Full Documentation

For detailed analysis, see:
- `docs/INCIDENT_2026_04_06_CODE_DESYNC.md` — Complete incident timeline, all 3 root causes, lessons learned
- `docs/DEPLOYMENT_TROUBLESHOOTING.md` — Issues 1-8, detailed fix procedures
- `.github/agents/prod-incident-resolver.agent.md` — Enhanced agent instructions with patterns

---

## 🚀 Escalation Path

**If issue persists after these checks:**

1. Check `docs/INCIDENT_2026_04_06_CODE_DESYNC.md` for similar patterns
2. Review last 5 commits: `git log --oneline -5`
3. Compare prod `.env` with git branch: `grep IMAGE= .env`
4. Check if backend/scraper are in different git commits
5. If still unclear: Ask for additional context or expert input

---

**Last Updated**: 2026-04-06 (Incident 2026-04-06 documentation)  
**Next Review**: After next production deployment
