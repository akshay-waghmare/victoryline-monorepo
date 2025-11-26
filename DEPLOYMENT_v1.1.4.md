# Deployment Guide v1.1.4

**Release Date**: 2025-11-26
**Focus**: Scraper Resilience & Stability Fixes (EAGAIN/PID Exhaustion)

## 📦 Active Docker Images

| Service | Image Tag | Notes |
|---------|-----------|-------|
| **Scraper** | `macubex/victoryline-scraper:v1.1.4` | **NEW**: Increased PID limit (512), faster staleness check (60s), process cleanup fixes. |
| **Backend** | `macubex/victoryline-backend:v1.0.0` | Stable production build. |
| **Frontend** | `macubex/victoryline-frontend:v1.0.1` | Includes responsive UI fixes. |
| **Prerender** | `macubex/victoryline-prerender:v1.0.0` | SEO sidecar. |
| **MySQL** | `mysql:8.0` | (Optional) Currently using H2 embedded. |
| **Redis** | `redis:7-alpine` | Required for scraper caching. |

## 🚀 Deployment Steps

### 1. Pull/Load New Images
Ensure the new scraper image is available on the production server.
```bash
docker pull macubex/victoryline-scraper:v1.1.4
```

### 2. Update Configuration
Copy the updated production environment example to your active `.env` file.
```bash
cp .env.production.example .env
# IMPORTANT: Edit .env to set your secrets (JWT_SECRET, passwords, etc.)
```

### 3. Deploy Stack
Restart the stack to apply changes.
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify Deployment
Check that the scraper is running and healthy.
```bash
# Check status
docker ps

# Check logs for successful scraping
docker logs victoryline-scraper --tail 50

# Verify PID usage (should be well below 512)
docker stats victoryline-scraper --no-stream
```

## 🔄 Rollback Plan
If issues arise, revert to v1.1.3:
1. Edit `.env` and set `SCRAPER_IMAGE=macubex/victoryline-scraper:v1.1.3`
2. Run `docker-compose -f docker-compose.prod.yml up -d`
