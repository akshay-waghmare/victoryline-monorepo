# 🚀 Quick Start - Docker Deployment

## You're Ready to Deploy! 🎉

Your VictoryLine application now has a **complete production-ready Docker setup**.

---

## 📦 What Was Created

### Core Files
1. ✅ **`docker-compose.yml`** - Orchestrates all 6 services (Caddy, Frontend, Backend, Scraper, MySQL, Redis)
2. ✅ **`Caddyfile.local`** - Caddy reverse proxy configuration (HTTP for local dev)
3. ✅ **`.env.example`** - Environment configuration template
4. ✅ **`DOCKER_DEPLOYMENT.md`** - Complete deployment guide
5. ✅ **`CADDY_WEBSOCKET_FIX.md`** - WebSocket configuration documentation

### Updated Dockerfiles
1. ✅ **Frontend** - Node 16.20.2, optimized multi-stage build, nginx serving
2. ✅ **Backend** - Java 11, WebSocket support, MySQL/Redis ready, health checks
3. ✅ **Scraper** - Python 3.9, Playwright, reproducible build

### Optimization Files
1. ✅ **`.dockerignore`** files for all services (faster builds)
2. ✅ **`nginx.conf`** - Internal nginx config (inside frontend container)
3. ✅ **`Caddyfile.local`** - External Caddy reverse proxy (WebSocket fixed)

---

## ⚡ Deploy in 3 Steps

### Step 1: Configure Environment
```powershell
# Copy the example file
Copy-Item .env.example .env

# Edit with your passwords (IMPORTANT!)
notepad .env
```

**Must Change These:**
- `MYSQL_ROOT_PASSWORD` → Your secure password
- `MYSQL_PASSWORD` → Your secure password  
- `JWT_SECRET` → Random 32+ character string

### Step 2: Build Everything
```powershell
docker compose build
```

### Step 3: Start All Services
```powershell
docker compose up -d
```

---

## ✅ Verify It's Working

```powershell
# Check all services are running
docker compose ps

# View logs
docker compose logs -f

# Check Caddy specifically (important for WebSocket)
docker logs victoryline-caddy -f

# Test endpoints
curl http://localhost              # Frontend (via Caddy)
curl http://localhost/api/v1/      # Backend API (via Caddy)
curl http://localhost/sitemap.xml  # SEO endpoint (via Caddy → Backend)
```

### WebSocket Verification
1. Open http://localhost in browser
2. Open DevTools (F12) → Network tab → WS filter
3. Look for `ws://localhost/api/ws/websocket` 
4. Status should be **101 Switching Protocols** ✅
5. No errors in Console ✅

---

## 🌐 Access Your App

- **Frontend**: http://localhost (via Caddy reverse proxy)
- **Backend API**: http://localhost/api/v1/* (proxied by Caddy)
- **WebSocket**: ws://localhost/api/ws/websocket (proxied to backend:8099)
- **Scraper API**: http://localhost:5000 (internal, not exposed)
- **Prerender**: http://localhost:9100 (SSR service)

**Note**: Only Caddy exposes ports 80/443 externally. All other services communicate within the Docker network.

---

## 🛠️ Common Commands

```powershell
# Stop all services
docker compose down

# Restart a service
docker compose restart backend

# View logs for specific service
docker compose logs -f frontend

# Rebuild and restart
docker compose up -d --build
```

---

## 📚 Need More Help?

Read the complete guide: **`DOCKER_DEPLOYMENT.md`**

Includes:
- Troubleshooting
- Production considerations
- Security best practices
- Backup strategies
- Monitoring setup

---

## 🎯 Architecture Overview

```
                     Internet
                        ↓
         ┌──────────────────────────────┐
         │   Caddy Reverse Proxy        │
         │   :80 (HTTP) :443 (HTTPS)    │
         └──────────────────────────────┘
                        ↓
        ┌───────────────┴────────────────┐
        ↓                                ↓
┌───────────────────┐          ┌─────────────────────┐
│ Frontend (nginx)  │          │ Backend (Spring)    │
│ :80 (internal)    │          │ :8099 (internal)    │
│ • Angular app     │          │ • REST API          │
│ • Static assets   │          │ • WebSocket server  │
└───────────────────┘          └─────────────────────┘
                                         ↓
                        ┌────────────────┴──────────────┐
                        ↓                               ↓
                ┌──────────────┐              ┌──────────────┐
                │ MySQL :3306  │              │ Redis :6379  │
                │ • Match data │              │ • API cache  │
                │ • User data  │              │ • Sessions   │
                └──────────────┘              └──────────────┘

        ┌────────────────────────────────────────────┐
        │ Scraper (Flask) :5000 (internal)           │
        │ └─→ Sends scraped data to Backend          │
        └────────────────────────────────────────────┘

        ┌────────────────────────────────────────────┐
        │ Prerender :9100                            │
        │ └─→ SSR service for SEO                    │
        └────────────────────────────────────────────┘
```

### Request Flow Examples

**Frontend Page Request:**
```
Browser → Caddy:80 → Frontend:80 (nginx) → Angular app
```

**API Request:**
```
Browser → Caddy:80 /api/* → Backend:8099 → MySQL/Redis
```

**WebSocket Connection:**
```
Browser → Caddy:80 /api/ws/* → Backend:8099 WebSocket → Live updates
```

**SEO Request:**
```
Bot → Caddy:80 /sitemap.xml → Backend:8099 → Generated sitemap
```

---

**Ready to deploy? Just run the 3 steps above! 🚀**
