# Deployment Guide - v1.2.1

**Quick Reference for Production Deployment**

---

## 📋 Pre-Deployment Checklist

- [ ] All Docker images built and pushed to Docker Hub
- [ ] `.env` file configured with production secrets
- [ ] Backup current database (if applicable)
- [ ] Note current running image versions for rollback
- [ ] Verify server disk space (at least 5GB free)
- [ ] Notify team of deployment window

---

## 🚀 Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /home/administrator/victoryline-monorepo
git fetch origin
git checkout 008-match-title-seo
git pull origin 008-match-title-seo
```

### Step 2: Update Environment Variables

```bash
# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update .env with new image tags (if using custom overrides)
nano .env

# Verify these are set correctly:
# BACKEND_IMAGE=macubex/victoryline-backend:v1.2.1
# FRONTEND_IMAGE=macubex/victoryline-frontend:v1.2.1
# SCRAPER_IMAGE=macubex/victoryline-scraper:v1.2.1
# PRERENDER_IMAGE=macubex/victoryline-prerender:v1.2.1
```

### Step 3: Pull New Docker Images

```bash
# Pull all v1.2.1 images
docker pull macubex/victoryline-scraper:v1.2.1
docker pull macubex/victoryline-backend:v1.2.1
docker pull macubex/victoryline-frontend:v1.2.1
docker pull macubex/victoryline-prerender:v1.2.1

# Verify images are downloaded
docker images | grep v1.2.1
```

### Step 4: Stop Current Services

```bash
# Graceful shutdown (wait for containers to stop)
docker-compose -f docker-compose.prod.yml down

# If services are stuck, force stop:
# docker-compose -f docker-compose.prod.yml down --timeout 30
```

### Step 5: Start New Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Watch logs during startup
docker-compose -f docker-compose.prod.yml logs -f
# Press Ctrl+C to exit log view
```

### Step 6: Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                      STATUS              PORTS
# victoryline-backend       Up (healthy)        0.0.0.0:8099->8099/tcp
# victoryline-caddy         Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# victoryline-frontend      Up (healthy)        80/tcp
# victoryline-prerender     Up (healthy)        0.0.0.0:9100->9100/tcp
# victoryline-redis         Up (healthy)        6379/tcp
# victoryline-scraper       Up (healthy)        0.0.0.0:5000->5000/tcp
```

### Step 7: Health Checks

```bash
# Scraper health
curl http://localhost:5000/health | jq

# Backend SEO status
curl http://localhost:8099/api/v1/seo/indexing/status | jq

# Check scraper logs for live match discovery
docker logs victoryline-scraper --tail 100 | grep DISCOVERY

# Verify no timeout errors
docker logs victoryline-scraper --tail 200 | grep -i timeout
docker logs victoryline-backend --tail 200 | grep -i timeout
```

### Step 8: Monitor for 15 Minutes

```bash
# Watch scraper stats
watch -n 5 'docker stats victoryline-scraper --no-stream'

# Monitor PIDs (should stay 50-150)
watch -n 5 'docker exec victoryline-scraper ps aux | wc -l'

# Check error logs
docker-compose -f docker-compose.prod.yml logs -f --tail 50 scraper backend
```

---

## 🔄 Rollback Procedure

If issues are detected, rollback to v1.1.4:

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Checkout previous stable branch (if different)
git checkout 003-seo-optimization-fixes

# OR edit docker-compose.prod.yml to use v1.1.4
sed -i 's/v1.2.1/v1.1.4/g' docker-compose.prod.yml

# Restart with old images
docker-compose -f docker-compose.prod.yml up -d

# Verify rollback
docker images | grep victoryline
docker-compose ps
```

---

## ⚠️ Known Issues & Solutions

### Issue: "Can't start new thread" in scraper logs

**Cause:** PID/thread leak (should be fixed in v1.2.1, but monitor)

**Immediate Fix:**
```bash
docker-compose restart scraper
```

**Verify Fix:**
```bash
docker exec victoryline-scraper ps aux | wc -l
# Should be < 150
```

---

### Issue: Backend timeout errors

**Cause:** Backend is slow or overloaded

**Solution:**
```bash
# Check backend memory/CPU
docker stats victoryline-backend --no-stream

# Check backend logs for slow queries
docker logs victoryline-backend --tail 100 | grep -i "slow"

# Restart backend if needed
docker-compose restart backend
```

---

### Issue: No live matches discovered

**Cause:** Discovery script issue or no actual live matches

**Solution:**
```bash
# Check discovery logs
docker logs victoryline-scraper --tail 100 | grep DISCOVERY

# Manually trigger discovery (if endpoint exists)
curl http://localhost:5000/api/trigger-discovery

# Verify source site has live matches
curl -s https://crex.com/live-matches | grep "live-card"
```

---

## 📊 Post-Deployment Monitoring

### Day 1 - Critical Monitoring

Monitor every 30 minutes for first 4 hours:

```bash
# Quick health check script
cat << 'EOF' > /tmp/health_check.sh
#!/bin/bash
echo "=== Health Check $(date) ==="
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo -e "\nScraper Health:"
curl -s http://localhost:5000/health | jq -r '.status, .data.scrapers[0].status'

echo -e "\nBackend Health:"
curl -s http://localhost:8099/api/v1/seo/indexing/status | jq -r '.status'

echo -e "\nScraper PIDs:"
docker exec victoryline-scraper ps aux | wc -l

echo -e "\nRecent Errors:"
docker logs victoryline-scraper --tail 20 | grep -i error | tail -5
EOF

chmod +x /tmp/health_check.sh
watch -n 1800 /tmp/health_check.sh  # Every 30 minutes
```

### Week 1 - Regular Monitoring

Check daily:

- Container uptime and restarts
- Error rate in logs
- PID/memory trends
- Discovery accuracy
- Backend timeout frequency

---

## 📈 Success Metrics

Deployment is successful if after 24 hours:

- ✅ Zero "can't start new thread" errors
- ✅ Backend timeout errors < 1 per hour
- ✅ Live match discovery accuracy > 90%
- ✅ PID count stable (50-150 range)
- ✅ Memory usage < 1.5GB per container
- ✅ No unexpected container restarts
- ✅ Frontend loading and displaying matches correctly

---

## 📞 Emergency Contacts

**Primary:** Akshay Waghmare - akshay.d.waghmare@gmail.com  
**Deployment Window:** Non-peak hours (2 AM - 6 AM IST recommended)  
**Estimated Downtime:** 3-5 minutes

---

## 📝 Deployment Log Template

```
DEPLOYMENT LOG - v1.2.1
Date: _____________
Server: _____________
Performed by: _____________

Pre-deployment:
[ ] Code pulled: commit hash _____________
[ ] Images pulled: verified ___________
[ ] Backup created: _____________
[ ] .env configured

Deployment:
[ ] Services stopped at: _______
[ ] Services started at: _______
[ ] All containers healthy: _______

Verification:
[ ] Scraper health OK: _______
[ ] Backend health OK: _______
[ ] No errors in logs: _______
[ ] PIDs normal: _______

Post-deployment:
[ ] Monitored for 30 mins: _______
[ ] No issues detected: _______
[ ] Team notified: _______

Issues encountered (if any):
_________________________________
_________________________________

Rollback performed: YES / NO
If yes, reason: _________________

Sign-off: _____________
```

---

**Last Updated:** January 30, 2026  
**Version:** 1.0
