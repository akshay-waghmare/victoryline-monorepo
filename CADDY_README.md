# Caddy Configuration Files

This directory contains multiple Caddyfile configurations for different deployment environments.

## Files

### `Caddyfile` (Default - Local Development)
- **Purpose:** Local development on localhost
- **HTTPS:** Disabled (`auto_https off`)
- **Domain:** `http://localhost`
- **Security:** Relaxed headers for development
- **Usage:** Used by default docker-compose.yml

### `Caddyfile.local`
- **Purpose:** Explicit local development configuration (same as default Caddyfile)
- **HTTPS:** Disabled
- **Domain:** `http://localhost`
- **Security:** Relaxed headers
- **Usage:** Backup/reference copy of local config

### `Caddyfile.prod`
- **Purpose:** Production deployment with automatic HTTPS
- **HTTPS:** Enabled via Let's Encrypt
- **Domain:** `crickzen.com`, `www.crickzen.com`
- **Security:** Strict headers (HSTS, CSP, etc.)
- **Usage:** Used by docker-compose.prod.yml

---

## Usage

### Local Development (Default)
```bash
# Uses Caddyfile (localhost, no HTTPS)
docker compose up -d
```

Test endpoints:
- Homepage: http://localhost/
- Sitemap: http://localhost/sitemap.xml
- Backend API: http://localhost:8099/api/...

### Production Deployment
```bash
# Uses Caddyfile.prod (crickzen.com, automatic HTTPS)
docker compose -f docker-compose.prod.yml up -d
```

**Prerequisites:**
1. DNS A records for `crickzen.com` and `www.crickzen.com` must point to your server's public IP
2. Ports 80 and 443 must be open in firewall
3. Server must be publicly accessible for Let's Encrypt ACME challenge

Test endpoints (after DNS propagation):
- Homepage: https://crickzen.com/
- Sitemap: https://crickzen.com/sitemap.xml
- Backend API: https://crickzen.com/api/...

---

## Key Differences

| Feature | Caddyfile (Local) | Caddyfile.prod (Production) |
|---------|-------------------|------------------------------|
| Domain | `localhost` | `crickzen.com`, `www.crickzen.com` |
| HTTPS | ❌ Disabled | ✅ Automatic (Let's Encrypt) |
| HSTS | ❌ No | ✅ Yes (1 year, preload) |
| CSP | Relaxed (allow http:) | Strict (https: only) |
| Logging | Console only | File + console |
| Certificate | None | Let's Encrypt (auto-renewed) |

---

## Routing Configuration

Both Caddyfiles use the same routing logic:

1. **SEO Endpoints** → Backend (`backend:8099`)
   - `/sitemap.xml`
   - `/sitemaps/*.xml`
   - `/robots.txt`

2. **WebSocket** → Frontend (`frontend:80`)
   - `/api/ws/*`

3. **Everything Else** → Frontend (`frontend:80`)
   - Angular SPA
   - Static assets
   - Frontend Nginx handles `/api/*` → Backend proxy

---

## Troubleshooting

### Local Development Issues

**Port 80 already in use:**
```bash
# Stop conflicting services
docker compose down
netstat -ano | findstr ":80"
# Kill process using port 80
```

**WebSocket connection fails:**
- Check CSP allows `ws:` protocol in Caddyfile
- Verify `/api/ws/*` matcher comes before general proxy

### Production Issues

**Certificate generation fails:**
- Ensure DNS records point to server's public IP
- Wait for DNS propagation (can take up to 48 hours)
- Check ports 80/443 are open and accessible
- Use staging CA for testing: uncomment `acme_ca` line in Caddyfile.prod

**HTTPS redirect loop:**
- Check `X-Forwarded-Proto` headers are set correctly
- Ensure no other reverse proxy is interfering

**Domain mismatch error:**
- Verify domain in Caddyfile.prod matches your actual domain
- Check server hostname configuration

---

## Switching Between Configurations

### Method 1: Use Different Docker Compose Files (Recommended)
```bash
# Local
docker compose -f docker-compose.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

### Method 2: Manually Replace Caddyfile
```bash
# Switch to production
cp Caddyfile.prod Caddyfile
docker restart victoryline-proxy

# Switch to local
cp Caddyfile.local Caddyfile
docker restart victoryline-proxy
```

---

## Security Notes

### Local Development
- HSTS disabled to avoid browser caching issues
- CSP allows `http:` for mixed content testing
- No certificate validation

### Production
- HSTS with preload (1 year max-age)
- Strict CSP (HTTPS only)
- Automatic certificate renewal
- Security headers enforced

---

## Additional Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Caddyfile Syntax](https://caddyserver.com/docs/caddyfile)
- [ACME Challenge Types](https://letsencrypt.org/docs/challenge-types/)
