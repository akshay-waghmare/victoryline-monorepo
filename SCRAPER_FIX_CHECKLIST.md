# Moved to feature spec folder

This checklist has been moved to the canonical location under the feature specs:

`specs/004-scraper-resilience/incidents/SCRAPER_FIX_CHECKLIST.md`

Please update any internal references to point to the new location. This file remains for historical reasons and will be kept as a redirect in the repo root.

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

### Fix 1: Add Docker PID Limit (5 minutes)

**File**: `docker-compose.prod.yml`

Add to scraper service:
```yaml
services:
  scraper:
    deploy:
      resources:
        limits:
          memory: 2560M
          cpus: '2'
          pids: 512  # ← ADD THIS LINE
```

Also update: `docker-compose.yml`

```bash
# Apply changes
docker-compose up -d --force-recreate scraper
```

- [ ] `docker-compose.prod.yml` updated
- [ ] `docker-compose.yml` updated
- [ ] Changes deployed
- [ ] Validated with `docker inspect victoryline-scraper | grep -i pids`

---

### Fix 2: Lower Staleness Threshold (2 minutes)

**File**: `apps/scraper/crex_scraper_python/src/config.py`

Change:
```python
# FROM:
staleness_threshold_seconds: int = 300  # 5 minutes

# TO:
staleness_threshold_seconds: int = 60  # 1 minute
```

```bash
# Restart to apply
docker-compose restart scraper
```

- [ ] Config file updated
- [ ] Scraper restarted
- [ ] Health endpoint shows new threshold

---

### Fix 3: Review Browser Cleanup (15 minutes)

**File**: `apps/scraper/crex_scraper_python/crex_scraper.py`

**Action**: Read the file and check for:
1. Is `browser.close()` called in all paths?
2. Is cleanup wrapped in `try/finally`?
3. Are context managers used (`with sync_playwright()`)?

```bash
# Read the file
cat apps/scraper/crex_scraper_python/crex_scraper.py | grep -A 20 "def fetchData"
```

**Checklist**:
- [ ] Browser launch uses context manager
- [ ] `browser.close()` in `finally` block
- [ ] Cleanup callback registered: `context.register_cleanup()`
- [ ] No early returns that skip cleanup

**If issues found**: Create fix (see Phase 3, Task 2 in incident report)

---

## 📊 Phase 3: Monitoring (Next 24 Hours)

### Monitor 1: PID Count
```bash
# Check every 15 minutes
watch -n 900 'docker stats victoryline-scraper --no-stream --format "{{.PIDs}}"'
```

**Thresholds**:
- ✅ Normal: 50-150 PIDs
- ⚠️ Warning: 150-200 PIDs
- 🔴 Critical: 200+ PIDs (leak recurring)

- [ ] Hour 1: PIDs stable
- [ ] Hour 6: PIDs stable
- [ ] Hour 12: PIDs stable
- [ ] Hour 24: PIDs stable

---

### Monitor 2: Health Status
```bash
# Check every 5 minutes
watch -n 300 'curl -s http://localhost:5000/health | jq ".data.scrapers[0] | {status, staleness_seconds, total_updates, memory_mb}"'
```

**Expected**:
- Status: "healthy"
- Staleness: <60 seconds
- Total updates: incrementing
- Memory: 600-1200 MB

- [ ] Hour 1: All metrics healthy
- [ ] Hour 6: All metrics healthy
- [ ] Hour 12: All metrics healthy
- [ ] Hour 24: All metrics healthy

---

### Monitor 3: Auto-Restart Validation
```bash
# Watch logs for restart events
docker logs -f victoryline-scraper | grep -i restart
```

**Expected**: Graceful restart every 6 hours with cleanup logs

- [ ] First auto-restart observed (~6 hours after fix)
- [ ] PIDs remain stable after restart
- [ ] No errors during restart

---

## 🛠️ Phase 4: Permanent Fixes (This Week)

### Task 1: Add PID Monitoring to ScraperContext
**File**: `apps/scraper/crex_scraper_python/src/core/scraper_context.py`

**Changes**:
1. Add `total_pids` field to `ScraperContext`
2. Update `update_resource_usage()` to count child processes
3. Add `_maybe_schedule_restart_on_pids()` method
4. Trigger restart if PIDs > 200

**Estimate**: 1 hour coding + 30 min testing

- [ ] Code changes implemented
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] Deployed to production

---

### Task 2: Fix Browser Cleanup
**File**: `apps/scraper/crex_scraper_python/crex_scraper.py`

**Changes**:
1. Wrap Playwright in context manager
2. Add explicit `finally` cleanup
3. Register cleanup callback with context
4. Add logging for cleanup verification

**Estimate**: 2 hours coding + 1 hour testing

- [ ] Code changes implemented
- [ ] Manual testing shows PIDs stable
- [ ] Integration test added
- [ ] Deployed to production

---

### Task 3: Add Orphan Cleanup Worker
**File**: `apps/scraper/crex_scraper_python/src/crex_main_url.py`

**Changes**:
1. Create `_orphan_cleanup_worker()` function
2. Check scrapers every 60 seconds
3. Force restart if staleness >300 seconds
4. Start worker thread on service boot

**Estimate**: 1 hour coding + 30 min testing

- [ ] Code changes implemented
- [ ] Worker thread starts correctly
- [ ] Force restart logic tested
- [ ] Deployed to production

---

### Task 4: Add Integration Tests
**File**: `apps/scraper/crex_scraper_python/tests/integration/test_browser_cleanup.py`

**Test Cases**:
1. `test_browser_cleanup_after_scrape()` - no orphaned processes
2. `test_pids_remain_stable()` - PIDs don't grow over 10 scrapes
3. `test_context_cleanup_callback()` - cleanup registered and executed
4. `test_restart_cleans_resources()` - restart clears PIDs

**Estimate**: 2 hours coding

- [ ] All test cases implemented
- [ ] Tests pass locally
- [ ] Tests added to CI pipeline
- [ ] Tests pass in CI

---

### Task 5: Update Grafana Dashboard
**File**: `monitoring/grafana/dashboards/scraper-health.json`

**Changes**:
1. Add "PIDs per Scraper" panel
2. Add alert threshold at 200 PIDs
3. Add trend line for PID growth

**Estimate**: 30 minutes

- [ ] Dashboard updated
- [ ] Grafana reloaded
- [ ] PIDs visible in UI
- [ ] Alerts configured

---

## ✅ Success Validation

### Short-Term (24 Hours)
- [ ] Scraper running without manual intervention
- [ ] PIDs stable below 150
- [ ] Data staleness <60 seconds
- [ ] New matches discovered continuously
- [ ] Zero "can't start new thread" errors

### Medium-Term (1 Week)
- [ ] No PID spikes or leaks
- [ ] Auto-restart working every 6 hours
- [ ] All permanent fixes deployed
- [ ] Integration tests pass
- [ ] Grafana dashboard operational

### Long-Term (1 Month)
- [ ] 99.5% uptime achieved
- [ ] Zero manual interventions
- [ ] All metrics healthy
- [ ] Constitution compliance restored

---

## 🚨 Escalation Plan

If PIDs exceed 300 within 6 hours after restart:

1. **Immediate**: Restart container again
2. **Debug**: Check docker logs for browser launch/close patterns
3. **Hotfix**: Add aggressive `kill -9` to orphaned chrome processes
4. **Escalate**: Browser cleanup code has critical bug - needs deep investigation

```bash
# Emergency kill orphaned chrome processes
docker exec victoryline-scraper pkill -9 chrome
docker-compose restart scraper
```

---

## 📝 Notes

**Incident Start**: 2025-11-15 (discovered)  
**Recovery Start**: [Fill in after Phase 1]  
**Fixes Complete**: [Fill in after Phase 4]  
**Incident Close**: [Fill in after 1 week stable]

**Additional Observations**:
- [Add notes during monitoring]
- [Document any unexpected behavior]
- [Track fix effectiveness]
