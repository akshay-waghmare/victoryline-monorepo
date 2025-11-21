# Deployment Guide - v1.1.3 (localStorage Fix)

## 🎉 What's New in v1.1.3

**Fix**: Complete player data extraction - localStorage timing issue resolved

**Impact**:
- ✅ 24/24 player codes available (was 6/24 = 27%)
- ✅ Zero [MISSING CODE] warnings
- ✅ All player names correctly decoded (no more D7O, 3LV, NH codes)
- ✅ 100% scorecard data completeness

**Technical Changes**:
- Changed wait strategy: `domcontentloaded` → `networkidle`
- Increased wait time: 2 seconds → 5 seconds
- File renamed: `crex_scraper.py` → `crex_match_data_scraper.py`
- Added comprehensive investigation logging

---

## 📦 Docker Images Published

**Scraper v1.1.3**:
- `macubex/victoryline-scraper:v1.1.3` (specific version)
- `macubex/victoryline-scraper:latest` (latest release)
- `macubex/victoryline-scraper:prod` (production tag)

**Other Services** (unchanged):
- `macubex/victoryline-backend:v1.0.0`
- `macubex/victoryline-frontend:v1.0.1`
- `macubex/victoryline-prerender:v1.0.0`

---

## 🚀 Deployment on Production Server

### Step 1: Pull Latest Code
```bash
cd /path/to/victoryline-monorepo
git pull origin master  # or investigate-scorecard-incomplete-data if not merged yet
```

### Step 2: Update Environment File
```bash
# Copy production example if needed
cp .env.production.example .env

# Verify scraper image version
grep SCRAPER_IMAGE .env
# Should show: SCRAPER_IMAGE=macubex/victoryline-scraper:v1.1.3
```

### Step 3: Pull New Image
```bash
docker-compose -f docker-compose.prod.yml pull scraper
```

### Step 4: Deploy
**Option A: Restart Only Scraper** (minimal downtime)
```bash
docker-compose -f docker-compose.prod.yml up -d scraper
```

**Option B: Restart All Services** (full refresh)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Deployment
```bash
# Check scraper health
curl http://localhost:5000/health | jq

# Check logs for localStorage extraction
docker logs victoryline-scraper --tail 50 | grep "LOCALSTORAGE"

# Should see: [LOCALSTORAGE] Player entries (p_*): 24
```

---

## ✅ Verification Checklist

After deployment, verify:

1. **Health Status**
   ```bash
   curl http://localhost:5000/health
   # Should return: "status": "healthy"
   ```

2. **Player Data Completeness**
   ```bash
   docker exec victoryline-scraper tail -100 /app/crex_scraper.log | grep "LOCALSTORAGE"
   # Should show: Player entries (p_*): 24
   ```

3. **No Missing Code Warnings**
   ```bash
   docker exec victoryline-scraper grep "MISSING CODE" /app/crex_scraper.log
   # Should return: no results (exit code 1)
   ```

4. **Scraper Running**
   ```bash
   docker ps | grep victoryline-scraper
   # Should show container running
   ```

---

## 🔄 Rollback (if needed)

If issues occur, rollback to v1.1.2:

```bash
# Update .env
sed -i 's/v1.1.3/v1.1.2/g' .env

# Pull old image
docker-compose -f docker-compose.prod.yml pull scraper

# Restart
docker-compose -f docker-compose.prod.yml up -d scraper
```

---

## 📝 Notes

- **Branch**: `investigate-scorecard-incomplete-data` (merge to `master` after verification)
- **Investigation Spec**: Archived in `openspec/changes/archive/investigate-scorecard-incomplete-data/`
- **Commits**: 12 commits total on investigation branch
- **Testing**: Verified with Bangladesh vs Ireland 2nd Test match

## 🐛 Known Issues

- Scorecard page times out (30s) when attempting direct extraction - fallback to live page works correctly
- Match must be in active play for "Unknown Batsman/Bowler" to be replaced with actual names (normal behavior during breaks/stumps)

---

## 📞 Support

If issues occur after deployment:
1. Check logs: `docker logs victoryline-scraper -f`
2. Check health: `curl http://localhost:5000/health`
3. Verify environment: `docker exec victoryline-scraper env | grep -E "(MEMORY|POLLING|SCRAPER)"`
