# WebSocket Fix for Production Environment

## Problem Identified
WebSocket connections were failing in production (with Caddy proxy) but working locally. The issue was that the Caddyfile didn't have explicit WebSocket handling configuration.

## Root Cause
1. **Local Setup**: Direct connection: Frontend (nginx) → Backend (WebSocket works)
2. **Production Setup**: Caddy → Frontend (nginx) → Backend
   - Caddy was not preserving WebSocket upgrade headers (`Upgrade` and `Connection`)
   - Multiple proxy layers need explicit header forwarding

## Solution Applied
Added explicit WebSocket handling in the Caddyfile:
- Created a dedicated route matcher for `/api/ws/*` paths
- Configured proper header forwarding for WebSocket upgrade
- Added `flush_interval -1` for long-lived connections
- Placed WebSocket route **before** the general proxy to ensure priority

## Changes Made

### File: `Caddyfile`
Added WebSocket-specific reverse proxy configuration:
```caddy
# WebSocket endpoint - must come before general proxy to take precedence
@websocket {
  path /api/ws/*
}
reverse_proxy @websocket frontend:80 {
  header_up Host {host}
  header_up X-Real-IP {remote}
  header_up X-Forwarded-For {remote}
  header_up X-Forwarded-Proto {scheme}
  header_up Upgrade {http.request.header.Upgrade}
  header_up Connection {http.request.header.Connection}
  # Increase timeout for long-lived WebSocket connections
  flush_interval -1
}
```

## How to Deploy

### Step 1: Restart Production Services
```bash
# Using docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Or if using a specific service
docker-compose -f docker-compose.prod.yml restart caddy
```

### Step 2: Verify Caddy Configuration
Check Caddy logs for any configuration errors:
```bash
docker logs victoryline-proxy
```

### Step 3: Test WebSocket Connection

#### From Browser Console
Open your production site and check the browser console for:
```
Opening Web Socket...
Web Socket Opened...
connected to server
>>> SUBSCRIBE
```

#### Using curl (from server)
```bash
# Test WebSocket upgrade
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://crickzen.com/api/ws/websocket
```

Expected response should include:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

### Step 4: Monitor Real-Time Updates
1. Navigate to a live match in your app
2. Open browser DevTools → Network tab
3. Filter by "WS" (WebSocket)
4. You should see:
   - Connection established to `wss://crickzen.com/api/ws/websocket`
   - Messages flowing on topics like `/topic/live-matches`
   - Real-time score updates appearing

## Troubleshooting

### If WebSocket still doesn't connect:

1. **Check Caddy logs:**
   ```bash
   docker logs -f victoryline-proxy
   ```

2. **Verify Nginx config in frontend:**
   ```bash
   docker exec victoryline-frontend cat /etc/nginx/nginx.conf | grep -A 10 "location /api/ws"
   ```

3. **Test backend WebSocket directly:**
   ```bash
   docker exec -it victoryline-backend curl -i http://localhost:8099/ws/info
   ```

4. **Check if backend WebSocket is responding:**
   ```bash
   # From the host machine
   curl http://localhost:8099/ws/info
   ```

5. **Verify network connectivity:**
   ```bash
   docker exec victoryline-proxy ping frontend
   docker exec victoryline-frontend ping backend
   ```

### Common Issues:

- **502 Bad Gateway**: Backend WebSocket endpoint not responding
- **Connection timeout**: Firewall blocking WebSocket ports
- **403 Forbidden**: CSP policy blocking WebSocket (check browser console)
- **Connection immediately closes**: Check backend logs for authentication/CORS issues

## Testing Locally vs Production

### Local (docker-compose.yml)
- No Caddy proxy
- Direct access: `ws://localhost:80/api/ws/websocket`
- Simpler routing: Frontend nginx → Backend

### Production (docker-compose.prod.yml)
- Caddy proxy handles HTTPS/SSL
- Access: `wss://crickzen.com/api/ws/websocket`
- Complex routing: Caddy → Frontend nginx → Backend
- **Now properly configured for WebSocket upgrade!**

## Verification Checklist

- [ ] Caddy container restarted successfully
- [ ] No errors in Caddy logs
- [ ] Browser shows "Web Socket Opened" in console
- [ ] Network tab shows WebSocket connection (Status: 101)
- [ ] SUBSCRIBE messages visible in console logs
- [ ] Real-time updates appearing for live matches
- [ ] No connection drops or reconnection loops

## Additional Notes

- The `flush_interval -1` setting disables buffering for WebSocket frames
- Headers `Upgrade` and `Connection` are critical for WebSocket handshake
- The `@websocket` matcher ensures WebSocket paths are handled first
- Caddy automatically handles SSL/TLS for WSS connections

## References
- [Caddy Reverse Proxy Documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [WebSocket Protocol (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455)
- [Nginx WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
