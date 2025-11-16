# Scraper Performance Monitoring Guide

## 🎯 Purpose

This monitoring system helps you decide **when batching becomes necessary** by tracking:
- API call rates
- Memory usage
- Match concurrency
- System health

The batching implementation is **ready but not active**. Use these metrics to determine when to enable it.

---

## 📊 Monitoring Endpoint

### **GET /monitoring/performance**

Returns real-time performance metrics and batching recommendations.

**Usage:**
```powershell
# Basic check
curl http://localhost:5000/monitoring/performance | ConvertFrom-Json

# Pretty formatted
curl http://localhost:5000/monitoring/performance | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**Example Response:**
```json
{
  "timestamp": "2025-11-13T10:30:00Z",
  "uptime_seconds": 3600,
  "uptime_human": "1:00:00",
  
  "current_performance": {
    "active_matches": 3,
    "estimated_api_calls_per_minute": 72,
    "total_memory_mb": 1200,
    "avg_memory_per_scraper_mb": 400,
    "avg_response_time_ms": 85
  },
  
  "batching_recommendation": {
    "should_enable_batching": false,
    "readiness_score": 15,
    "score_interpretation": "🟢 No batching needed",
    "reasons": [
      "✅ API call rate healthy (72/min vs 500 threshold)",
      "✅ Memory usage healthy (1200 MB vs 4000 threshold)",
      "✅ Match concurrency healthy (3 active)"
    ]
  },
  
  "thresholds": {
    "api_calls_per_min_warn": 500,
    "api_calls_per_min_critical": 1000,
    "memory_mb_warn": 4000,
    "memory_mb_critical": 8000,
    "concurrent_matches_warn": 10,
    "concurrent_matches_critical": 20
  },
  
  "scraper_details": [
    {
      "match_id": "match_abc123",
      "memory_mb": 380,
      "age_seconds": 1200,
      "error_count": 0,
      "status": "healthy"
    }
  ]
}
```

---

## 🚦 Decision Matrix: When to Enable Batching

### **Readiness Score Interpretation:**

| Score | Status | Action |
|-------|--------|--------|
| 0-39 | 🟢 **No batching needed** | Current system is fine |
| 40-69 | 🟡 **Batching may help** | Monitor closely, prepare for implementation |
| 70-100 | 🔴 **Batching recommended** | Implement batching now |

### **Key Indicators:**

#### **1. API Call Rate**
- ✅ **< 500/min**: Healthy, no action needed
- ⚠️ **500-1000/min**: Elevated, monitor closely
- 🔴 **> 1000/min**: Critical, enable batching

**Calculation:**
- Each active match generates ~24 API calls/minute
- 3 matches = 72 calls/min ✅
- 20 matches = 480 calls/min ⚠️
- 50 matches = 1200 calls/min 🔴

#### **2. Memory Usage**
- ✅ **< 4 GB**: Healthy
- ⚠️ **4-8 GB**: Elevated
- 🔴 **> 8 GB**: Critical

#### **3. Concurrent Matches**
- ✅ **< 10 matches**: Normal load
- ⚠️ **10-20 matches**: High load
- 🔴 **> 20 matches**: Very high load

---

## 📈 Monitoring Commands

### **Quick Health Check**
```powershell
# Check if batching is needed (returns true/false)
curl http://localhost:5000/monitoring/performance | ConvertFrom-Json | Select-Object -ExpandProperty batching_recommendation | Select-Object should_enable_batching

# Get readiness score
curl http://localhost:5000/monitoring/performance | ConvertFrom-Json | Select-Object -ExpandProperty batching_recommendation | Select-Object readiness_score, score_interpretation
```

### **Monitor Current Load**
```powershell
# Watch key metrics every 30 seconds
while ($true) {
    $perf = curl http://localhost:5000/monitoring/performance | ConvertFrom-Json
    Write-Host "`n=== Performance Snapshot $(Get-Date -Format 'HH:mm:ss') ==="
    Write-Host "Active Matches: $($perf.current_performance.active_matches)"
    Write-Host "API Calls/Min: $($perf.current_performance.estimated_api_calls_per_minute)"
    Write-Host "Memory (MB): $($perf.current_performance.total_memory_mb)"
    Write-Host "Batching Needed: $($perf.batching_recommendation.should_enable_batching)"
    Write-Host "Score: $($perf.batching_recommendation.readiness_score)/100"
    Start-Sleep -Seconds 30
}
```

### **Track Performance Over Time**
```powershell
# Log performance metrics to file
$logFile = "performance_log_$(Get-Date -Format 'yyyyMMdd').json"
while ($true) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $perf = curl http://localhost:5000/monitoring/performance | ConvertFrom-Json
    
    $entry = @{
        timestamp = $timestamp
        active_matches = $perf.current_performance.active_matches
        api_calls_per_min = $perf.current_performance.estimated_api_calls_per_minute
        memory_mb = $perf.current_performance.total_memory_mb
        batching_score = $perf.batching_recommendation.readiness_score
    }
    
    $entry | ConvertTo-Json -Compress | Out-File -Append $logFile
    Write-Host "$timestamp - Logged: $($entry.active_matches) matches, $($entry.api_calls_per_min) calls/min, Score: $($entry.batching_score)"
    Start-Sleep -Seconds 300  # Log every 5 minutes
}
```

---

## 🎨 Dashboard View (Browser)

Create a simple HTML dashboard:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Scraper Performance Monitor</title>
    <script>
        async function refreshMetrics() {
            const response = await fetch('http://localhost:5000/monitoring/performance');
            const data = await response.json();
            
            document.getElementById('status').innerHTML = data.batching_recommendation.score_interpretation;
            document.getElementById('score').innerHTML = data.batching_recommendation.readiness_score + '/100';
            document.getElementById('matches').innerHTML = data.current_performance.active_matches;
            document.getElementById('api_calls').innerHTML = data.current_performance.estimated_api_calls_per_minute + '/min';
            document.getElementById('memory').innerHTML = data.current_performance.total_memory_mb + ' MB';
            
            document.getElementById('reasons').innerHTML = data.batching_recommendation.reasons
                .map(r => `<li>${r}</li>`).join('');
        }
        
        setInterval(refreshMetrics, 10000);  // Refresh every 10 seconds
        refreshMetrics();  // Initial load
    </script>
</head>
<body>
    <h1>Scraper Performance Monitor</h1>
    <div>
        <h2>Status: <span id="status">Loading...</span></h2>
        <p>Readiness Score: <strong id="score">-</strong></p>
    </div>
    <div>
        <h3>Current Metrics</h3>
        <ul>
            <li>Active Matches: <strong id="matches">-</strong></li>
            <li>API Calls: <strong id="api_calls">-</strong></li>
            <li>Memory Usage: <strong id="memory">-</strong></li>
        </ul>
    </div>
    <div>
        <h3>Analysis</h3>
        <ul id="reasons"></ul>
    </div>
</body>
</html>
```

Save as `performance_dashboard.html` and open in browser.

---

## 🔧 Troubleshooting

### **Issue: Endpoint returns 404**
**Cause:** Server not restarted after adding endpoint  
**Fix:** Restart scraper: `python crex_scraper_python/run_server.py`

### **Issue: Metrics seem inaccurate**
**Cause:** Estimation based on active scrapers  
**Fix:** For production, implement actual request counter in `cricket_data_service.py`

### **Issue: Memory values are 0**
**Cause:** Scrapers haven't updated resource usage yet  
**Fix:** Wait 30 seconds for first resource check, or trigger manually

---

## 📁 Batching Implementation (When Ready)

When monitoring shows batching is needed (`readiness_score >= 70`):

### **1. Activate Batching (5 minutes)**

```powershell
# 1. Switch to batched service
cd apps/scraper/crex_scraper_python/src
(Get-Content crex_scraper.py) -replace 'import cricket_data_service', 'import cricket_data_service_batched as cricket_data_service' | Set-Content crex_scraper.py

# 2. Set batch configuration (optional)
$env:BATCH_SIZE = "10"
$env:BATCH_FLUSH_INTERVAL = "5.0"

# 3. Restart scraper
cd ../..
python crex_scraper_python/run_server.py
```

### **2. Update Backend (2.5 hours)**

Follow the complete guide in:
- `BACKEND_BATCH_SUPPORT_PLAN.md` - Full implementation
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step tasks

### **3. Verify Performance Improvement**

After enabling batching, metrics should show:
- 📉 API calls reduced by ~90% (e.g., 1200/min → 120/min)
- 📉 Readiness score drops below 40
- ✅ Status changes to "🟢 No batching needed"

---

## 📊 Performance Baselines

Record your baseline metrics when system is healthy:

```powershell
# Create baseline snapshot
$baseline = curl http://localhost:5000/monitoring/performance | ConvertFrom-Json
$baseline | ConvertTo-Json -Depth 5 | Out-File "baseline_$(Get-Date -Format 'yyyyMMdd').json"

Write-Host "Baseline saved:"
Write-Host "  - Active Matches: $($baseline.current_performance.active_matches)"
Write-Host "  - API Calls/Min: $($baseline.current_performance.estimated_api_calls_per_minute)"
Write-Host "  - Memory: $($baseline.current_performance.total_memory_mb) MB"
Write-Host "  - Readiness Score: $($baseline.batching_recommendation.readiness_score)"
```

Compare future snapshots against this baseline to track degradation.

---

## ✅ Monitoring Checklist

**Daily:**
- [ ] Check `/monitoring/performance` endpoint
- [ ] Verify readiness score < 40
- [ ] Confirm no critical warnings

**Weekly:**
- [ ] Review performance logs
- [ ] Compare against baseline
- [ ] Check for trending issues

**When scaling up:**
- [ ] Monitor before adding matches
- [ ] Watch readiness score closely
- [ ] Have batching plan ready

**If score > 70:**
- [ ] Review BACKEND_BATCH_SUPPORT_PLAN.md
- [ ] Schedule implementation window
- [ ] Prepare rollback plan
- [ ] Implement batching

---

## 🎯 Summary

**Current State:**
- ✅ Monitoring endpoint active at `/monitoring/performance`
- ✅ Automatic batching recommendations
- ✅ Batching code ready (not active)
- ✅ Low-risk, high-visibility monitoring

**When to Act:**
- 🟢 Score 0-39: You're good, keep monitoring
- 🟡 Score 40-69: Watch closely, be ready
- 🔴 Score 70-100: Implement batching now

**Implementation Time When Needed:**
- Scraper batching: 5 minutes (just change import)
- Backend changes: 2.5 hours (follow plan)
- Testing: 1 hour
- **Total: ~3.5 hours**

The system will tell you exactly when optimization is needed!
