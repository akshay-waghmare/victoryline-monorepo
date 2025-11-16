# Scraper Thread Leak - Fix Checklist

**Date**: 2025-11-15  
**Issue**: 4,613 PIDs causing thread exhaustion  
**Reference**: `../incidents/SCRAPER_THREAD_LEAK_INCIDENT.md`

---

## ⚡ Phase 1: Emergency Recovery (DO NOW)

### Step 1: Restart Container
```bash
cd /home/administrator/victoryline-monorepo
docker-compose restart scraper
```
- [ ] Container restarted successfully
- [ ] Container status shows "healthy"

### Step 2: Validate Recovery
```bash
# Check PIDs are back to normal
docker stats victoryline-scraper --no-stream

# Expected: PIDs between 50-150
# If still high (>200), do full recreate:
# docker-compose up -d --force-recreate scraper
```
- [ ] PIDs below 200
- [ ] PIDs below 150 (ideal)

### Step 3: Check Health Endpoint
```bash
curl http://localhost:5000/health | jq '.data.scrapers[0] | {status, staleness_seconds, total_updates}'
```
- [ ] Status is "healthy"
- [ ] Staleness is <60 seconds
- [ ] Total updates is incrementing

---

## 🔧 Phase 2: Quick Fixes (Today)

... (Checklist continues, same as root doc) ...

---

## 🛠️ Phase 4: Permanent Fixes (This Week)

### Task 1: Add PID Monitoring to ScraperContext
... (Checklist continues, same as root doc) ...

---

## ✅ Success Validation

### Short-Term (24 Hours)
- [ ] Scraper running without manual intervention
- [ ] PIDs stable below 150
- [ ] Data staleness <60 seconds
- [ ] New matches discovered continuously
- [ ] Zero "can't start new thread" errors

... (Checklist continues) ...

---

> NOTE: This file is a living checklist meant to guide immediate actions and signoff. Keep it up-to-date with timestamps and who completed each entry.
