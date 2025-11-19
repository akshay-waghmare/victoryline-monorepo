# 🚀 Deploy with Caddy - Step by Step

## What Was Fixed

**Problem**: WebSocket connection failing - `ws://localhost/api/ws/websocket` returned errors

**Root Cause**: `Caddyfile.local` was proxying WebSocket to `frontend:80` instead of `backend:8099`

**Solution**: 
1. ✅ Fixed `Caddyfile.local` - WebSocket now proxies to `backend:8099`
2. ✅ Added Caddy service to `docker-compose.yml`
3. ✅ Updated frontend to only expose port internally (Caddy handles external traffic)

---

## 📋 Pre-Deployment Checklist

- [x] `Caddyfile.local` - WebSocket proxy fixed
- [x] `docker-compose.yml` - Caddy service added
- [x] `.env.example` - Updated with Caddy ports
- [ ] `.env` file created (you need to do this)
- [ ] Passwords changed in `.env` (security!)

---

## 🎯 Deploy Now

### Step 1: Create Environment File
```powershell
# Copy the example
Copy-Item .env.example .env

# Edit with your settings
notepad .env
```

**IMPORTANT - Change these in .env:**
```env
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
MYSQL_PASSWORD=your_secure_db_password_here
JWT_SECRET=your_very_long_random_string_at_least_256_bits_long
```

### Step 2: Stop Existing Containers (if any)
```powershell
docker compose down
```

### Step 3: Build and Start with Caddy
```powershell
# Build all services
docker compose build

# Start all services (including Caddy)
docker compose up -d

# Watch logs to verify startup
docker compose logs -f
```

### Step 4: Verify Services Started
```powershell
docker compose ps
```

**Expected output** (all should show "Up"):
```
NAME                     STATUS          PORTS
victoryline-backend      Up (healthy)    8099/tcp
victoryline-caddy        Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
victoryline-frontend     Up (healthy)    80/tcp
victoryline-mysql        Up (healthy)    0.0.0.0:3306->3306/tcp
victoryline-prerender    Up              0.0.0.0:9100->9100/tcp
victoryline-redis        Up (healthy)    0.0.0.0:6379->6379/tcp
victoryline-scraper      Up (healthy)    5000/tcp
```

### Step 5: Test WebSocket Connection

#### Method 1: Browser DevTools
1. Open http://localhost in browser
2. Press F12 (DevTools)
3. Go to **Network** tab
4. Filter by **WS** (WebSocket)
5. Refresh page or navigate to Matches tab
6. Look for `ws://localhost/api/ws/websocket`
7. Status should be **101 Switching Protocols** ✅

#### Method 2: Check Console
1. Open http://localhost
2. Press F12 → Console tab
3. Should see: `Connected to WebSocket` or similar
4. Should **NOT** see: `WebSocket connection failed`

### Step 6: Test Frontend & API
```powershell
# Test frontend loads
curl http://localhost

# Test backend API (via Caddy)
curl http://localhost/api/v1/matches/completed

# Test SEO endpoint
curl http://localhost/sitemap.xml
```

---

## ✅ Success Indicators

| Check | What to Look For | Status |
|-------|------------------|--------|
| **Caddy Logs** | `docker logs victoryline-caddy` → No errors | ⬜ |
| **Frontend** | http://localhost → Angular app loads | ⬜ |
| **API** | http://localhost/api/v1/* → JSON response | ⬜ |
| **WebSocket** | DevTools WS tab → 101 status | ⬜ |
| **Console** | No WebSocket errors | ⬜ |
| **Matches Tab** | Navigate to Matches → Completed → 20 matches show | ⬜ |
| **Live Updates** | Real-time match updates work | ⬜ |

---

## 🔍 Troubleshooting

### Caddy Won't Start
```powershell
# Check Caddy logs
docker logs victoryline-caddy

# Common issues:
# - Port 80 already in use → Stop other web servers (IIS, Apache)
# - Caddyfile syntax error → Check Caddyfile.local line 29
```

### WebSocket Still Failing
```powershell
# Verify Caddy is proxying correctly
docker exec victoryline-caddy cat /etc/caddy/Caddyfile | grep -A 5 websocket

# Should show: reverse_proxy @websocket backend:8099
# If shows frontend:80, Caddyfile.local didn't mount correctly

# Restart Caddy
docker compose restart caddy
```

### Frontend Shows 502 Bad Gateway
```powershell
# Check if frontend container is up
docker compose ps frontend

# Check frontend logs
docker logs victoryline-frontend

# Restart if needed
docker compose restart frontend
```

### Backend API Not Responding
```powershell
# Check backend health
docker compose ps backend

# Check logs for errors
docker logs victoryline-backend

# Check if backend can reach MySQL
docker exec victoryline-backend nc -zv mysql 3306
```

### Can't Connect to MySQL
```powershell
# Check MySQL container
docker compose ps mysql

# Check MySQL logs
docker logs victoryline-mysql

# Test connection
docker exec victoryline-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "SHOW DATABASES;"
```

---

## 📊 View Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f caddy
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100 caddy
```

---

## 🛑 Stop Everything

```powershell
# Stop all containers (keeps data)
docker compose down

# Stop and remove volumes (DELETES ALL DATA!)
docker compose down -v
```

---

## 🔄 Quick Restart

```powershell
# Restart specific service
docker compose restart caddy
docker compose restart backend

# Restart all services
docker compose restart

# Rebuild and restart (after code changes)
docker compose up -d --build
```

---

## 📖 Architecture Reference

### Services & Ports

| Service | External Port | Internal Port | Purpose |
|---------|---------------|---------------|---------|
| **caddy** | 80, 443 | 80, 443 | Reverse proxy (handles all external traffic) |
| frontend | - | 80 | Angular app (nginx) |
| backend | - | 8099 | Spring Boot API + WebSocket |
| mysql | 3306 | 3306 | Database |
| redis | 6379 | 6379 | Cache |
| scraper | - | 5000 | Python scraper |
| prerender | 9100 | 9100 | SSR service |

### Caddy Routing Rules

| Request | Caddy Action | Backend Service |
|---------|--------------|-----------------|
| `/*` | Proxy | frontend:80 (Angular) |
| `/api/*` | Proxy | backend:8099 (Spring) |
| `/api/ws/*` | WebSocket Proxy | backend:8099 (WebSocket) |
| `/sitemap.xml` | Proxy | backend:8099 (SEO) |
| `/robots.txt` | Proxy | backend:8099 (SEO) |

---

## 📚 Related Documentation

- **CADDY_WEBSOCKET_FIX.md** - Detailed WebSocket fix explanation
- **QUICKSTART_DOCKER.md** - Quick start guide
- **DOCKER_DEPLOYMENT.md** - Complete deployment guide
- **Caddyfile.local** - Caddy configuration file
- **docker-compose.yml** - Docker orchestration

---

## 🎉 Done!

Your VictoryLine application should now be running with:
- ✅ Caddy as reverse proxy
- ✅ WebSocket working for live updates
- ✅ All 6 services running (MySQL, Redis, Backend, Frontend, Scraper, Prerender)
- ✅ Frontend accessible at http://localhost
- ✅ Completed matches showing in Matches tab

**Next Steps:**
1. Test the completed matches feature in Matches → Completed tab
2. Verify live match updates work
3. Check SEO endpoints (sitemap.xml, robots.txt)
4. For production: Use `Caddyfile.prod` with HTTPS

---

**Need help?** Check the logs: `docker compose logs -f`
