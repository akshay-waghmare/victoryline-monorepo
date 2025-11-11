# 🐳 Docker Deployment Guide - VictoryLine

Complete guide for deploying VictoryLine Cricket Score Application using Docker.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Production Considerations](#production-considerations)

---

## ✅ Prerequisites

### Required Software
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: Latest version
- **Minimum System Requirements**:
  - RAM: 4GB (8GB recommended)
  - Disk Space: 10GB free
  - CPU: 2 cores (4+ recommended)

### Verify Installation
```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/akshay-waghmare/victoryline-monorepo.git
cd victoryline-monorepo
```

### 2. Create Environment File
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configurations
notepad .env  # Windows
# or
nano .env     # Linux/Mac
```

**Important**: Update these values in `.env`:
- `MYSQL_ROOT_PASSWORD`: Strong password for MySQL root
- `MYSQL_PASSWORD`: Password for application database user
- `JWT_SECRET`: Long random string (at least 32 characters)

### 3. Build and Start Services
```bash
# Build all images
docker compose build

# Start all services in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

### 4. Verify Deployment
```bash
# Check all services are running
docker compose ps

# Test endpoints
curl http://localhost         # Frontend
curl http://localhost:8099    # Backend
curl http://localhost:5000    # Scraper
```

### 5. Access the Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8099
- **Scraper API**: http://localhost:5000

---

## 🏗️ Architecture

### Services Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VictoryLine Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │ Frontend │──────│ Backend  │──────│  MySQL   │          │
│  │ (Nginx)  │      │ (Spring) │      │          │          │
│  │  :80     │      │  :8099   │      │  :3306   │          │
│  └──────────┘      └──────────┘      └──────────┘          │
│       │                  │                                   │
│       │                  │                                   │
│       │            ┌──────────┐                              │
│       └────────────│ Scraper  │                              │
│                    │ (Flask)  │                              │
│                    │  :5000   │                              │
│                    └──────────┘                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Network Configuration
- **Network**: `victoryline-network` (Bridge)
- Services communicate using DNS names (service names)
- Only exposed ports are accessible from host

### Volumes
- `victoryline-mysql-data`: MySQL database persistence
- `victoryline-scraper-data`: Scraper storage and cache

---

## ⚙️ Configuration

### Environment Variables

#### MySQL Configuration
```env
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=cricket_db
MYSQL_USER=cricket_user
MYSQL_PASSWORD=your_secure_password
MYSQL_PORT=3306
```

#### Backend Configuration
```env
BACKEND_PORT=8099
JWT_SECRET=your_very_long_and_secure_jwt_secret_key
JWT_EXPIRATION=86400  # 24 hours in seconds
SHOW_SQL=false
SPRING_PROFILES_ACTIVE=default
```

#### Frontend Configuration
```env
FRONTEND_PORT=80
NODE_VERSION=16.20.2
```

#### Scraper Configuration
```env
SCRAPER_PORT=5000
FLASK_ENV=production
FLASK_DEBUG=0
```

---

## 🚢 Deployment

### Development Deployment

```bash
# Start with logs visible
docker compose up

# Or start in background
docker compose up -d

# Rebuild specific service
docker compose up -d --build frontend
```

### Production Deployment

#### 1. Update Environment for Production
```bash
# In .env file
FLASK_ENV=production
FLASK_DEBUG=0
SHOW_SQL=false
SPRING_PROFILES_ACTIVE=prod
```

#### 2. Build Production Images
```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with no cache
docker compose build --no-cache
```

#### 3. Deploy
```bash
# Start services
docker compose up -d

# Verify health status
docker compose ps
docker compose logs -f
```

### Scaling Services (Optional)
```bash
# Scale scraper service (if needed)
docker compose up -d --scale scraper=3
```

---

## 📊 Monitoring

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f scraper
docker compose logs -f mysql

# Last 100 lines
docker compose logs --tail=100 backend
```

### Health Checks
```bash
# Check service health status
docker compose ps

# Manual health check
curl http://localhost/health              # Frontend
curl http://localhost:8099/actuator/health # Backend
curl http://localhost:5000/health         # Scraper
```

### Resource Usage
```bash
# View resource consumption
docker stats

# Specific containers
docker stats victoryline-frontend victoryline-backend victoryline-scraper
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :80    # Windows
lsof -i :80                    # Linux/Mac

# Change port in .env file
FRONTEND_PORT=8080
```

#### 2. Service Not Starting
```bash
# Check logs
docker compose logs service-name

# Restart service
docker compose restart service-name

# Rebuild and restart
docker compose up -d --build service-name
```

#### 3. Database Connection Issues
```bash
# Verify MySQL is healthy
docker compose ps mysql

# Check MySQL logs
docker compose logs mysql

# Connect to MySQL
docker compose exec mysql mysql -u cricket_user -p
```

#### 4. Frontend Not Loading
```bash
# Check nginx configuration
docker compose exec frontend cat /etc/nginx/nginx.conf

# Test nginx config
docker compose exec frontend nginx -t

# Reload nginx
docker compose exec frontend nginx -s reload
```

#### 5. Backend Build Failures
```bash
# Clear Maven cache and rebuild
docker compose build --no-cache backend

# Check Java version
docker compose exec backend java -version
```

### Reset Everything
```bash
# Stop all services
docker compose down

# Remove volumes (⚠️ deletes all data)
docker compose down -v

# Remove all images
docker compose down --rmi all

# Start fresh
docker compose up -d --build
```

---

## 🔐 Production Considerations

### Security

#### 1. Update Default Passwords
```bash
# Generate strong passwords
openssl rand -base64 32

# Update in .env file
MYSQL_ROOT_PASSWORD=<generated-password>
JWT_SECRET=<generated-secret>
```

#### 2. Use Docker Secrets (Recommended)
```bash
# Create secrets
echo "my-secret-password" | docker secret create mysql_password -

# Update docker-compose.yml to use secrets
```

#### 3. Enable HTTPS
```bash
# Add SSL certificates to nginx
# Update nginx.conf for HTTPS
# Use Let's Encrypt for free certificates
```

#### 4. Firewall Rules
```bash
# Only expose necessary ports
# Block direct access to MySQL (3306)
# Use reverse proxy for all services
```

### Backup

#### Database Backup
```bash
# Backup MySQL database
docker compose exec mysql mysqldump -u root -p cricket_db > backup.sql

# Restore database
docker compose exec -T mysql mysql -u root -p cricket_db < backup.sql
```

#### Volume Backup
```bash
# Backup volumes
docker run --rm -v victoryline-mysql-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql-backup.tar.gz /data
```

### Updates

#### Update Images
```bash
# Pull latest changes
git pull origin master

# Rebuild images
docker compose build

# Rolling update (zero downtime)
docker compose up -d --no-deps --build frontend
docker compose up -d --no-deps --build backend
docker compose up -d --no-deps --build scraper
```

### Logging

#### Centralized Logging
```bash
# Configure log drivers in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 📝 Additional Commands

### Managing Services
```bash
# Start specific service
docker compose start backend

# Stop specific service
docker compose stop backend

# Restart service
docker compose restart backend

# Remove service
docker compose rm -s backend
```

### Accessing Containers
```bash
# Execute commands in container
docker compose exec backend bash
docker compose exec mysql mysql -u root -p
docker compose exec scraper python

# Run one-off command
docker compose run --rm backend mvn --version
```

### Cleanup
```bash
# Remove stopped containers
docker compose rm

# Prune unused resources
docker system prune -a

# Remove specific volume
docker volume rm victoryline-mysql-data
```

---

## 🆘 Getting Help

### Useful Commands
```bash
# Show compose configuration
docker compose config

# Validate compose file
docker compose config --quiet

# List services
docker compose ps --services
```

### Debug Mode
```bash
# Run with debug output
docker compose --verbose up

# Check service dependencies
docker compose config --services
```

---

## 📚 References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [VictoryLine GitHub](https://github.com/akshay-waghmare/victoryline-monorepo)

---

## ✅ Deployment Checklist

- [ ] Docker and Docker Compose installed
- [ ] `.env` file created and configured
- [ ] Strong passwords set for MySQL and JWT
- [ ] Firewall rules configured
- [ ] SSL certificates installed (production)
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Health checks verified
- [ ] All services running and healthy

---

**Last Updated**: November 8, 2025  
**Version**: 1.0.0
