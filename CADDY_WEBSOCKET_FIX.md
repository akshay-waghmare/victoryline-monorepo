# Caddy WebSocket Configuration Fix

## Problem Fixed
WebSocket connections were failing with error: `WebSocket connection to 'ws://localhost/api/ws/websocket' failed`

## Root Cause
`Caddyfile.local` was proxying WebSocket connections (`/api/ws/*`) to **frontend:80** instead of **backend:8099**, where the Spring Boot WebSocket server actually runs.

## Changes Made

### 1. Fixed Caddyfile.local (Line 29)
**Before:**
```caddyfile
reverse_proxy @websocket frontend:80 {
  # ...
}
```

**After:**
```caddyfile
reverse_proxy @websocket backend:8099 {
  # ...
}
```

### 2. Added Caddy Service to docker-compose.yml
- Added `caddy` service using `caddy:2-alpine` image
- Exposes ports 80 (HTTP) and 443 (HTTPS)
- Mounts `Caddyfile.local` as read-only configuration
- Depends on `frontend` and `backend` services
- Includes health check

### 3. Updated Frontend Service in docker-compose.yml
- Changed from `ports: - "80:80"` to `expose: - "80"`
- Frontend now only accessible within Docker network
- Caddy acts as external reverse proxy

## Architecture Flow

```
Browser (ws://localhost/api/ws/websocket)
    ↓
Caddy (port 80/443) - Caddyfile.local routing
    ↓
    ├─ /api/ws/* → backend:8099 (WebSocket - Spring Boot)
    ├─ /sitemap.xml, /robots.txt → backend:8099 (SEO endpoints)
    └─ /* → frontend:80 (Angular app - nginx)
```

## Docker Services

| Service | Port (External) | Port (Internal) | Purpose |
|---------|----------------|-----------------|---------|
| **caddy** | 80, 443 | 80, 443 | Reverse proxy (HTTP/HTTPS) |
| frontend | - | 80 | Angular app (nginx) |
| backend | - | 8099 | Spring Boot API + WebSocket |
| redis | - | 6379 | Cache |
| mysql | 3306 | 3306 | Database |
| scraper | - | 5000 | Python scraper |
| prerender | 9100 | 9100 | SSR prerender service |

## Environment Variables (.env)

Optional Caddy port overrides:
```env
# Caddy Ports (defaults: 80, 443)
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
```

## Deployment Commands

### Start with Caddy
```powershell
# Stop existing containers
docker compose down

# Rebuild and start all services including Caddy
docker compose up -d --build

# Check Caddy logs
docker logs victoryline-caddy -f

# Check WebSocket connection
# Open browser to http://localhost
# Open DevTools → Network → WS tab
# Should see successful connection to ws://localhost/api/ws/websocket
```

### Verify WebSocket
1. Open browser to `http://localhost`
2. Open DevTools (F12) → Network tab → WS filter
3. Look for connection to `ws://localhost/api/ws/websocket`
4. Status should be `101 Switching Protocols` (success)
5. No errors in Console

## Testing Checklist

- [ ] Caddy container starts successfully
- [ ] Frontend accessible at `http://localhost`
- [ ] Backend API accessible via Caddy at `http://localhost/api/v1/*`
- [ ] WebSocket connects successfully (check Network → WS tab)
- [ ] No WebSocket errors in browser console
- [ ] Live match updates work in real-time
- [ ] SEO endpoints work: `http://localhost/sitemap.xml`, `http://localhost/robots.txt`

## Rollback (if needed)

If issues occur, revert to direct frontend exposure:
```powershell
# Remove Caddy service from docker-compose.yml
# Change frontend ports back to: - "80:80"
docker compose down
docker compose up -d --build
```

## Additional Notes

- **Caddyfile.local** is for local development (HTTP only)
- **Caddyfile.prod** should be used for production (HTTPS + Let's Encrypt)
- Caddy automatically handles WebSocket upgrades with proper headers
- `flush_interval -1` ensures real-time WebSocket message delivery
- Frontend still uses nginx internally for serving Angular static files
- Caddy acts as external reverse proxy in front of all services

## Related Files
- `Caddyfile.local` - Local Caddy configuration (HTTP)
- `Caddyfile.prod` - Production Caddy configuration (HTTPS)
- `docker-compose.yml` - Main Docker orchestration
- `apps/backend/.../WebSocketConfig.java` - Spring Boot WebSocket config
- `apps/frontend/nginx.conf` - Internal nginx config (inside frontend container)
