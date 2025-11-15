# Scraper Thread/PID Leak Incident Report

**Date**: 2025-11-15  
**Severity**: 🔴 CRITICAL  
**Status**: Active Issue - Immediate Action Required

---

## Executive Summary

The scraper service is completely stuck and unable to update match data due to **thread/process exhaustion**. A critical resource leak has rendered the service inoperable.

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

The scraper has accumulated **4,613 PIDs** over its 20-hour runtime, indicating Playwright/Chromium processes are not being cleaned up after scraping operations. Each scraping attempt creates new browser instances without closing old ones, and the resilience implementation did not restart the container as expected.

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
3. ❌ **Staleness threshold too high** (9,462 seconds > threshold, but no restart triggered)
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

## Incident Timeline & Detection

- 2025-11-15 02:15 UTC — Health endpoint shows `status: failing` and `staleness_seconds > 9,000`.
- 2025-11-15 02:18 UTC — Ops verified process count: 4,613 PIDs in the scraper container.
- 2025-11-15 02:20 UTC — Manual restart performed: `docker-compose restart scraper`.
- 2025-11-15 02:23 UTC — Container recovered; PIDs returned to normal (~70-80).
- 2025-11-15 02:30 UTC — Additional checks revealed monitoring gaps (psutil returned memory as 0.0) and a failing restart trigger.
- 2025-11-15 03:05 UTC — Fast-tracked root cause analysis and emergency actions were defined.

---

## Immediate Action Plan

### Phase 1: Emergency Recovery (Now)

**Action 1: Restart Scraper Container**

```bash
cd /home/administrator/victoryline-monorepo
docker-compose restart scraper
# OR full recreate if restart fails
# docker-compose up -d --force-recreate scraper
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

## Full Incident Report & Root Cause Fixes (Planned)

This incident report is the canonical record of the remediation and will be used to guide code changes and configuration updates. See the `fix-checklist` for specific actions and plan steps (copied to spec and tasks).

---

## Post-Incident Validation

- [ ] Container restarted and healthy
- [ ] PIDs remain below 150 for 24 hours
- [ ] Staleness stays below 60 seconds
- [ ] New matches being discovered
- [ ] No further "can't start new thread" errors

---

## Links & References

- Spec: `../spec.md`
- Fix checklist: `./SCRAPER_FIX_CHECKLIST.md`
- Implementation: `apps/scraper/crex_scraper_python/`
- Docker compose: `/docker-compose.prod.yml`

---

## Notes

- Keep this incident report up to date with timestamps and status changes.
- This file is authoritative for the November 15, 2025 incident.
