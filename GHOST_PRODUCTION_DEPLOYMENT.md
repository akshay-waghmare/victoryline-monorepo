# Ghost CMS Production Deployment Guide for Crickzen.com

## Pre-Deployment Checklist

### 1. DNS Configuration (CRITICAL)
Ensure DNS records point to your production server:
```
A Record: crickzen.com → [YOUR_SERVER_IP]
A Record: www.crickzen.com → [YOUR_SERVER_IP]
```

Verify DNS propagation:
```bash
nslookup crickzen.com
nslookup www.crickzen.com
```

### 2. Server Requirements
- Docker & Docker Compose installed
- Ports 80 and 443 open (for Caddy HTTPS)
- Minimum 2GB RAM (Ghost + MySQL + Backend + Frontend)
- 10GB disk space

### 3. Environment Variables
Create `.env` file in project root with:
```bash
# MySQL Configuration (required for Ghost in production)
MYSQL_ROOT_PASSWORD=<strong_password>
MYSQL_PASSWORD=<cricket_user_password>
MYSQL_USER=cricket_user
MYSQL_DATABASE=cricket_db

# Ghost Database (uses same MySQL instance)
GHOST_DB=ghost_production

# Ghost Configuration
GHOST_URL=https://crickzen.com

# Backend Configuration
JWT_SECRET=<strong_jwt_secret>
SPRING_PROFILES_ACTIVE=prod

# Email for Let's Encrypt SSL
LETSENCRYPT_EMAIL=akshay.d.waghmare@gmail.com

# Docker Images (use your registry)
BACKEND_IMAGE=macubex/victoryline-backend:v1.0.0
FRONTEND_IMAGE=macubex/victoryline-frontend:v1.0.0
SCRAPER_IMAGE=macubex/victoryline-scraper:v1.0.0
PRERENDER_IMAGE=macubex/victoryline-prerender:v1.0.0
```

## Deployment Steps

### Step 1: Prepare Frontend Build
**IMPORTANT**: Update Ghost API key in production environment before building.

1. First, you'll need to get the Ghost Content API key after Ghost starts (see Step 3)
2. Temporarily use any placeholder key for initial deployment
3. After Ghost setup, rebuild frontend with actual key

Build frontend:
```bash
cd apps/frontend
npm run build:prod  # or npm run build -- --configuration=production
```

Build and push Docker image:
```bash
docker build -t macubex/victoryline-frontend:v1.0.0 .
docker push macubex/victoryline-frontend:v1.0.0
```

### Step 2: Enable MySQL in docker-compose.prod.yml
Ghost requires MySQL in production (SQLite not recommended for production).

Uncomment the MySQL service in `docker-compose.prod.yml`:
```yaml
mysql:
  image: "${MYSQL_IMAGE:-mysql:8.0}"
  container_name: victoryline-mysql
  restart: unless-stopped
  environment:
    MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"
    MYSQL_DATABASE: "${MYSQL_DATABASE:-cricket_db}"
    MYSQL_USER: "${MYSQL_USER:-cricket_user}"
    MYSQL_PASSWORD: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
  ports:
    - "${MYSQL_PORT:-3306}:3306"
  volumes:
    - mysql_data:/var/lib/mysql
  networks:
    - victoryline-network
  healthcheck:
    test:
      - CMD
      - mysqladmin
      - ping
      - -h
      - localhost
      - -u
      - root
      - "-p${MYSQL_ROOT_PASSWORD}"
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

Also uncomment in volumes section:
```yaml
volumes:
  mysql_data:
    driver: local
```

### Step 3: Deploy to Production Server

1. **Upload files to server**:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ user@your-server:/opt/victoryline/
```

2. **SSH into server**:
```bash
ssh user@your-server
cd /opt/victoryline
```

3. **Pull Docker images**:
```bash
docker-compose -f docker-compose.prod.yml pull
```

4. **Start services**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

5. **Check service health**:
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs ghost
docker-compose -f docker-compose.prod.yml logs caddy
```

### Step 4: Configure Ghost CMS

1. **Wait for SSL certificate** (Caddy auto-provisions Let's Encrypt):
```bash
docker-compose -f docker-compose.prod.yml logs -f caddy
# Look for: "certificate obtained successfully"
```

2. **Access Ghost admin** (after SSL is ready):
```
https://crickzen.com/ghost
```

3. **Complete Ghost setup wizard**:
   - Create admin account
   - Set site title: "Crickzen Blog"
   - Configure email settings (optional but recommended)

4. **Get Content API Key**:
   - Settings → Integrations → Add Custom Integration
   - Name it "Frontend Angular App"
   - Copy the **Content API Key**

5. **Get Admin API Key** (for AI blog generator):
   - Same integration
   - Copy the **Admin API Key**

### Step 5: Update Frontend with Production API Key

1. **Update environment.prod.ts** locally:
```typescript
ghostApiKey: 'YOUR_PRODUCTION_CONTENT_API_KEY'
```

2. **Rebuild frontend**:
```bash
cd apps/frontend
npm run build:prod
docker build -t macubex/victoryline-frontend:v1.0.1 .
docker push macubex/victoryline-frontend:v1.0.1
```

3. **Update image version** in `.env` on server:
```bash
FRONTEND_IMAGE=macubex/victoryline-frontend:v1.0.1
```

4. **Redeploy frontend**:
```bash
docker-compose -f docker-compose.prod.yml pull frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Step 6: Verify Blog Integration

1. **Create test post in Ghost**:
   - https://crickzen.com/ghost
   - Posts → New Post
   - Write cricket-related content
   - Add featured image
   - Publish

2. **Test blog page**:
   - Visit: https://crickzen.com/blog
   - Should display published posts
   - Click post to test detail page

3. **Check browser console**:
   - F12 → Network tab
   - Look for API calls to: `https://crickzen.com/ghost/api/content/posts/`
   - Should return 200 OK with post data

## Configuration Summary

### What Changed for Production:

#### 1. **environment.prod.ts**
```typescript
ghostApiUrl: 'https://crickzen.com/ghost/api/content',
ghostApiKey: '30d103b8c5c578c76a6c0d1283' // REPLACE with production key
```

#### 2. **docker-compose.prod.yml**
```yaml
ghost:
  environment:
    url: "https://crickzen.com"
    database__client: mysql
    database__connection__host: mysql
    database__connection__user: "${MYSQL_USER}"
    database__connection__password: "${MYSQL_PASSWORD}"
    database__connection__database: "${GHOST_DB:-ghost_production}"
  depends_on:
    mysql:
      condition: service_healthy
```

#### 3. **Caddyfile.prod** (already configured)
- Ghost admin proxy: `/ghost/*` → `ghost:2368`
- Automatic HTTPS with Let's Encrypt
- Security headers

### Ghost Database Configuration

**Development** (current): SQLite (single-file database)
**Production**: MySQL (robust, scalable)

Ghost will automatically:
- Create tables in the `ghost_production` database
- Run migrations on first start
- Use the same MySQL instance as your backend

## Monitoring & Maintenance

### Check Ghost Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f ghost
```

### Check Ghost Status
```bash
docker-compose -f docker-compose.prod.yml exec ghost ghost status
```

### Backup Ghost Data
```bash
# Backup MySQL database
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ghost_production > ghost_backup.sql

# Backup Ghost content (images, themes)
docker run --rm -v victoryline-ghost-data:/from -v $(pwd):/to alpine tar czf /to/ghost-content-backup.tar.gz -C /from .
```

### Restore Ghost Data
```bash
# Restore MySQL database
docker-compose -f docker-compose.prod.yml exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} ghost_production < ghost_backup.sql

# Restore Ghost content
docker run --rm -v victoryline-ghost-data:/to -v $(pwd):/from alpine tar xzf /from/ghost-content-backup.tar.gz -C /to
```

## Troubleshooting

### Ghost Not Starting
```bash
# Check MySQL connection
docker-compose -f docker-compose.prod.yml logs mysql

# Verify environment variables
docker-compose -f docker-compose.prod.yml config

# Check Ghost container logs
docker-compose -f docker-compose.prod.yml logs ghost
```

### SSL Certificate Issues
```bash
# Check Caddy logs
docker-compose -f docker-compose.prod.yml logs caddy

# Verify DNS points to server
nslookup crickzen.com

# Check port 80/443 are open
sudo netstat -tlnp | grep -E ':80|:443'
```

### Blog Not Loading
1. Check Ghost is running: `docker ps | grep ghost`
2. Test Ghost directly: `curl http://localhost:2368/ghost/api/content/posts/?key=YOUR_KEY`
3. Check Caddy proxy: `docker-compose -f docker-compose.prod.yml logs caddy`
4. Verify frontend has correct API key in environment.prod.ts

### Database Connection Errors
```bash
# Test MySQL connection from Ghost container
docker-compose -f docker-compose.prod.yml exec ghost nc -zv mysql 3306

# Verify MySQL user permissions
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SHOW GRANTS FOR '${MYSQL_USER}'@'%';"
```

## Performance Optimization

### Enable Redis Caching (Optional)
Add Redis service for Ghost caching:
```yaml
redis:
  image: redis:alpine
  container_name: victoryline-redis
  restart: unless-stopped
  networks:
    - victoryline-network

ghost:
  environment:
    # ... existing config ...
    caching__redis__host: redis
    caching__redis__port: 6379
```

### Configure Ghost Mail (Recommended)
For password resets and notifications:
```yaml
ghost:
  environment:
    # ... existing config ...
    mail__transport: SMTP
    mail__options__service: Gmail
    mail__options__auth__user: your-email@gmail.com
    mail__options__auth__pass: your-app-password
```

## Security Checklist

- [x] HTTPS enabled via Caddy + Let's Encrypt
- [x] Ghost admin only accessible via HTTPS
- [x] MySQL password stored in environment variables
- [x] JWT secret configured for backend
- [ ] Configure Ghost brute force protection
- [ ] Enable Ghost admin 2FA (in Ghost settings)
- [ ] Regular database backups scheduled
- [ ] Monitor Ghost logs for suspicious activity

## Next Steps

1. **Create blog content** - Write cricket analysis, match previews, player spotlights
2. **Setup AI blog generator** - Automate blog creation from Google Trends
3. **Configure email newsletter** - Use Ghost's built-in newsletter feature
4. **Add analytics** - Integrate Google Analytics or Ghost's native analytics
5. **Optimize images** - Use Ghost's automatic image optimization
6. **Setup CDN** - Consider Cloudflare for static asset caching

## Support Resources

- Ghost Documentation: https://ghost.org/docs/
- Caddy Documentation: https://caddyserver.com/docs/
- Docker Compose: https://docs.docker.com/compose/

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
**Contact**: akshay.d.waghmare@gmail.com
