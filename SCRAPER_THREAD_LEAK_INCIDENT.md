# Moved to feature spec folder

This incident report has been moved to the canonical location under the feature specs:

`specs/004-scraper-resilience/incidents/SCRAPER_THREAD_LEAK_INCIDENT.md`

Please update any internal references to point to the new location. This file remains for historical reasons and will be kept as a redirect in the repo root.

### Key Findings

| Metric | Current Value | Expected | Status |
|--------|--------------|----------|---------|
| PIDs (threads/processes) | **4,613** | ~50-100 | 🔴 CRITICAL |
| Memory Usage | 1.225 GiB / 2.5 GiB | <1 GB | 🟡 Elevated |
| CPU Usage | 185.19% | <100% | 🔴 High |
| Container Status | Unhealthy | Healthy | 🔴 Failing |
| Data Staleness | 9,462 seconds (~2.6 hours) | <10 seconds | 🔴 CRITICAL |
| Total Updates | 0 | Continuous | 🔴 STUCK |
| Error Message | `can't start new thread` | None | 🔴 System Limit |

---

## Root Cause Analysis

### Primary Issue: Browser Process Leak

The scraper has accumulated **4,613 PIDs** over its 20-hour runtime, indicating:

1. **Playwright/Chromium processes are not being cleaned up** after scraping operations
2. **Each scraping attempt creates new browser instances** without closing old ones
3. **The resilience implementation is NOT working as designed** - contexts should auto-restart and cleanup

### Why Resilience Isn't Working

From the health endpoint analysis:
```json
{
  "status": "failing",
  "staleness_seconds": 9462.92,
  "total_updates": 0,
  "memory_mb": 0.0,  // ⚠️ Monitoring broken
  "restart_requested": false,  // ⚠️ Should have triggered restart
  "should_restart": false  // ⚠️ Logic not detecting the problem
}
```

**Critical Gaps Identified:**

1. ✅ **Restart detection logic exists** (`ScraperContext.should_restart()`)
2. ❌ **Memory monitoring not working** (`memory_mb: 0.0` - psutil not reading PIDs correctly)
3. ❌ **Staleness threshold too high** (9,462 seconds > 300 second threshold, but no restart triggered)
4. ❌ **Browser cleanup callbacks not registered or not executing**
5. ❌ **No PID limit monitoring** (Docker has no `pids_limit` set)

---

## Impact Assessment

### User-Facing Impact
- ✅ **Old matches still visible** (data from 2.6+ hours ago)
- ❌ **No new matches being discovered**
- ❌ **No live updates for ongoing matches**
- ❌ **API returns stale data** (violates Constitution: 5-second freshness requirement)

### System Impact
- ❌ **Scraper container stuck** (cannot execute commands, thread exhaustion)
- ❌ **Manual restart required** (defeats purpose of auto-resilience)
- ❌ **Resource wastage** (4,613 threads consuming CPU/memory)
- ⚠️ **Docker host at risk** (excessive PIDs could affect other containers)

---

## Immediate Action Plan

### Phase 1: Emergency Recovery (Now)

**Action 1: Restart Scraper Container**
```bash
cd /home/administrator/victoryline-monorepo
docker-compose restart scraper
# OR full recreate if restart fails
docker-compose up -d --force-recreate scraper
```

**Expected Outcome:**
- Clears all 4,613 orphaned PIDs
- Resets scraper to healthy state
- Resumes match discovery and updates

**Validation:**
```bash
# Check PIDs are normal (<100)
docker stats victoryline-scraper --no-stream

# Check health endpoint
curl http://localhost:5000/health | jq '.data.scrapers[0].status'

# Monitor for 5 minutes to ensure no immediate re-occurrence
watch -n 5 'docker stats victoryline-scraper --no-stream'
```

---

### Phase 2: Root Cause Fix (Today)

**Priority Tasks:**

#### Task 1: Add PID Limit to Docker Container
**File**: `docker-compose.prod.yml` (and `docker-compose.yml`)

```yaml
services:
  scraper:
    deploy:
      resources:
        limits:
          memory: 2560M
          cpus: '2'
          pids: 512  # ← ADD THIS: Limit to 512 PIDs max
```

**Rationale**: 
- Normal operation: 50-100 PIDs
- Safety buffer: 512 PIDs (5x normal)
- Prevents runaway leak from exhausting host resources

---

#### Task 2: Fix Browser Cleanup in Scraper
**File**: `apps/scraper/crex_scraper_python/crex_scraper.py`

**Current Issue**: Browser instances not properly closed after each scrape cycle

**Investigation Needed**:
1. Check if `browser.close()` is called in all code paths
2. Verify `context.register_cleanup()` is being used correctly
3. Add explicit cleanup in `finally` blocks
4. Use context managers (`with` statements) for browser lifecycle

**Code Pattern to Implement**:
```python
def fetchData(url, context=None):
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(...)
            page = browser.new_page()
            
            # Register cleanup callback if context provided
            if context:
                def cleanup_browser(ctx):
                    if browser and not browser.is_closed():
                        browser.close()
                context.register_cleanup(cleanup_browser)
            
            # Scraping logic here...
            
    finally:
        # Explicit cleanup
        if browser and not browser.is_closed():
            browser.close()
```

---

#### Task 3: Fix Memory/PID Monitoring
**File**: `apps/scraper/crex_scraper_python/src/core/scraper_context.py`

**Current Issue**: `memory_mb: 0.0` indicates `psutil` not tracking correctly

**Fix**: Monitor PIDs explicitly, not just memory:
```python
def update_resource_usage(self, process_pid: Optional[int] = None) -> None:
    if psutil is None:
        return
    
    pid = process_pid or self.browser_pid
    if pid is None:
        return
    
    try:
        process = psutil.Process(pid)
        
        # Get memory from main process
        rss = process.memory_info().rss
        cpu = process.cpu_percent(interval=0.0)
        
        # ← ADD: Count child processes (browser tabs, workers)
        child_pids = len(process.children(recursive=True))
        total_pids = 1 + child_pids
        
        with self._lock:
            self.memory_bytes = rss
            self.cpu_percent = cpu
            self.total_pids = total_pids  # ← NEW FIELD
        
        # Check PID threshold in addition to memory
        self._maybe_schedule_restart_on_pids(total_pids)
        self._maybe_schedule_memory_restart(current_memory_bytes=rss, now=utcnow())
        
    except psutil.Error:
        with self._lock:
            self.browser_pid = None
```

**Add PID-based restart trigger**:
```python
def _maybe_schedule_restart_on_pids(self, current_pids: int) -> bool:
    """Restart if PID count exceeds threshold (indicates browser leak)."""
    
    # Threshold: 200 PIDs = browser leak (normal is 50-100)
    PID_THRESHOLD = 200
    
    if current_pids < PID_THRESHOLD:
        return False
    
    metadata = {
        "pids": current_pids,
        "threshold": PID_THRESHOLD,
    }
    
    return self.request_restart(
        "pid_threshold_exceeded",
        grace_seconds=60,
        metadata=metadata,
    )
```

---

#### Task 4: Lower Staleness Threshold
**File**: `apps/scraper/crex_scraper_python/src/config.py`

```python
# Current (too high):
staleness_threshold_seconds: int = 300  # 5 minutes

# Change to:
staleness_threshold_seconds: int = 60  # 1 minute - triggers faster restart
```

**Rationale**: 9,462 seconds (2.6 hours) of staleness should have triggered restart much earlier. Current 5-minute threshold is too lenient.

---

#### Task 5: Add Periodic Cleanup Task
**File**: `apps/scraper/crex_scraper_python/src/crex_main_url.py`

Add background thread to force cleanup of stale contexts:

```python
def _orphan_cleanup_worker():
    """Background task to cleanup stale scrapers that didn't auto-restart."""
    
    while not SERVICE_SHUTDOWN_EVENT.is_set():
        time.sleep(60)  # Check every minute
        
        contexts = scraper_registry.all_contexts()
        now = utcnow()
        
        for context in contexts:
            # Force restart if stuck for >5 minutes
            if context.staleness_seconds > 300:
                logger.warning(
                    "orphan.forced_restart",
                    metadata={
                        "match_id": context.match_id,
                        "staleness_seconds": context.staleness_seconds,
                    }
                )
                context.request_restart("forced_orphan_cleanup")

# Start on service boot
cleanup_thread = threading.Thread(target=_orphan_cleanup_worker, daemon=True)
cleanup_thread.start()
```

---

### Phase 3: Validation & Monitoring (Next 24 Hours)

**Monitoring Checklist:**

1. **PID Count Tracking**
   ```bash
   # Monitor PIDs every 5 minutes for 24 hours
   watch -n 300 'docker stats victoryline-scraper --no-stream --format "{{.PIDs}}"'
   ```
   - ✅ **Expected**: PIDs remain between 50-150
   - ❌ **Alert if**: PIDs exceed 200 (leak starting)

2. **Health Endpoint Monitoring**
   ```bash
   # Check health every minute
   watch -n 60 'curl -s http://localhost:5000/health | jq ".data.scrapers[0] | {status, staleness_seconds, total_updates, memory_mb}"'
   ```
   - ✅ **Expected**: 
     - `status: "healthy"`
     - `staleness_seconds: <60`
     - `total_updates: >0` (incrementing)
   - ❌ **Alert if**: Any metric degrades for >5 minutes

3. **Auto-Restart Validation**
   - ✅ **Expected**: Scraper auto-restarts every 6 hours (max lifetime)
   - ✅ **Expected**: Graceful cleanup logs visible in `docker logs victoryline-scraper`
   - ❌ **Alert if**: Restart doesn't happen or PIDs spike during restart

---

## Long-Term Prevention Strategy

### 1. Add Comprehensive Tests
**File**: `apps/scraper/crex_scraper_python/tests/integration/test_browser_cleanup.py`

```python
def test_browser_cleanup_after_scrape():
    """Verify no orphaned browser processes after scraping."""
    
    initial_pids = psutil.Process().children(recursive=True)
    
    context = ScraperContext(match_id="test", url="...")
    fetch_match_data(url, context=context)
    context.shutdown()
    
    # Wait for cleanup
    time.sleep(2)
    
    final_pids = psutil.Process().children(recursive=True)
    
    # No new orphaned processes
    assert len(final_pids) <= len(initial_pids) + 2  # Allow small variance
```

### 2. Add Grafana Dashboard for PIDs
**File**: `monitoring/grafana/dashboards/scraper-health.json`

Add panel:
```json
{
  "title": "PIDs per Scraper",
  "targets": [{
    "expr": "scraper_pids_total{match_id=~\".*\"}",
    "legendFormat": "{{match_id}}"
  }],
  "alert": {
    "conditions": [{
      "evaluator": { "params": [200], "type": "gt" }
    }]
  }
}
```

### 3. Document Operational Runbook
**File**: `apps/scraper/MONITORING_GUIDE.md` (update)

Add section:
```markdown
## PID Leak Detection & Recovery

**Symptom**: Scraper stuck, `can't start new thread` error

**Diagnosis**:
1. Check PID count: `docker stats victoryline-scraper --no-stream`
2. Normal: 50-150 PIDs
3. Leak: >200 PIDs

**Recovery**:
1. Restart container: `docker-compose restart scraper`
2. Monitor for 1 hour to ensure no recurrence
3. If recurs within 6 hours: Browser cleanup code has bug

**Prevention**:
- Docker `pids: 512` limit prevents exhaustion
- Auto-restart triggers at 200 PIDs
- Grafana alerts on PID threshold
```

---

## Updated Copilot Instructions

Add to `.github/copilot-instructions.md`:

```markdown
## Known Issues & Mitigations

### Scraper Thread/PID Leak (2025-11-15)
**Status**: Active - Fix in Progress  
**Severity**: Critical  
**Reference**: `specs/004-scraper-resilience/incidents/SCRAPER_THREAD_LEAK_INCIDENT.md`

**Issue**: Playwright browser processes not cleaning up, causing thread exhaustion (4,613 PIDs observed).

**Immediate Mitigation**:
1. Docker `pids: 512` limit added to prevent host exhaustion
2. Manual restart required if PIDs exceed 300
3. Health endpoint monitoring in place

**Permanent Fix** (in development):
1. Explicit browser cleanup in `finally` blocks
2. PID-based auto-restart trigger (threshold: 200 PIDs)
3. Staleness threshold reduced: 300s → 60s
4. Orphan cleanup background worker

**Development Guidelines**:
- Always use context managers (`with sync_playwright()`)
- Register cleanup callbacks via `context.register_cleanup()`
- Test browser cleanup in integration tests
- Monitor PIDs via `docker stats` during development
```

---

## Success Criteria

### Short-Term (24 Hours)
- [ ] Scraper container restarted and healthy
- [ ] PIDs remain below 150 for 24 hours
- [ ] Staleness stays below 60 seconds
- [ ] New matches being discovered
- [ ] Docker PID limit (512) deployed

### Medium-Term (1 Week)
- [ ] Browser cleanup fix deployed and validated
- [ ] PID monitoring added to health endpoint
- [ ] Auto-restart triggers on PID threshold (200)
- [ ] Grafana dashboard shows stable PID metrics
- [ ] No manual interventions required

### Long-Term (1 Month)
- [ ] Zero PID leak incidents
- [ ] 99.5% uptime achieved (per spec)
- [ ] Integration tests cover browser cleanup
- [ ] Operational runbook documented and tested

---

## Lessons Learned

1. **Resource Monitoring Gaps**: Memory monitoring alone is insufficient - PIDs, file descriptors, and thread counts are equally critical
2. **Playwright Lifecycle**: Browser instances must be explicitly managed with context managers and cleanup callbacks
3. **Docker Resource Limits**: Always set `pids` limit in addition to memory/CPU limits
4. **Alerting Thresholds**: Staleness threshold (300s) was too high for production - faster detection needed
5. **Integration Testing**: Need tests that validate resource cleanup, not just functional correctness

---

## Related Documentation

- Feature Spec: `/specs/004-scraper-resilience/spec.md`
- Implementation Plan: `/specs/004-scraper-resilience/plan.md`
- Scraper Context: `/apps/scraper/crex_scraper_python/src/core/scraper_context.py`
- Main Scraper: `/apps/scraper/crex_scraper_python/crex_scraper.py`
- Docker Compose: `/docker-compose.prod.yml`

---

**Next Actions**:
1. Execute Phase 1: Emergency Recovery (restart container)
2. Implement Phase 2: Root cause fixes (Docker limits, browser cleanup, PID monitoring)
3. Monitor Phase 3: Validate fixes over 24-hour period
4. Update Constitution if thresholds need adjustment
