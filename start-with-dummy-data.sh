#!/bin/bash

# VictoryLine - Start Application with Dummy Blog Data
# This script starts the application using Docker Compose

set -e  # Exit on error

echo "======================================"
echo "  VictoryLine Cricket Blog Startup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
fi

echo ""
echo "======================================"
echo "  Starting Services..."
echo "======================================"
echo ""

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old volumes (optional - uncomment if you want fresh start)
# echo "🗑️  Removing old volumes..."
# docker-compose down -v

echo ""
echo "🚀 Building and starting services..."
echo "This may take a few minutes on first run..."
echo ""

# Start services
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:8099/actuator/health > /dev/null 2>&1 || curl -s http://localhost:8099/h2-console > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend health check timeout, but continuing...${NC}"
    fi
    echo -n "."
    sleep 2
done

echo ""

# Wait for frontend to be ready
echo "Waiting for frontend..."
for i in {1..20}; do
    if curl -s http://localhost:80 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}⚠️  Frontend health check timeout, but continuing...${NC}"
    fi
    echo -n "."
    sleep 2
done

echo ""
echo ""
echo "======================================"
echo "  🎉 Application Started!"
echo "======================================"
echo ""
echo -e "${GREEN}Access the application at:${NC}"
echo ""
echo "  🌐 Frontend (Blog):     http://localhost"
echo "  🔧 Backend API:         http://localhost:8099"
echo "  🐍 Scraper API:         http://localhost:5000"
echo "  💾 H2 Database Console: http://localhost:8099/h2-console"
echo ""
echo -e "${YELLOW}Test Endpoints:${NC}"
echo ""
echo "  📝 Blog Posts:          http://localhost/blog"
echo "  🏏 Live Match (SSE):    http://localhost/live/matches/IPL2025_FINAL"
echo "  📊 API Health:          http://localhost:8099/actuator/health"
echo ""
echo -e "${YELLOW}Default Credentials:${NC}"
echo ""
echo "  👤 Admin User:"
echo "     Username: admin"
echo "     Password: admin123"
echo ""
echo "  📝 Blog Editor:"
echo "     Username: editor"
echo "     Password: admin123"
echo ""
echo -e "${YELLOW}H2 Database Connection:${NC}"
echo ""
echo "  JDBC URL:      jdbc:h2:file:/app/data/victoryline"
echo "  Username:      sa"
echo "  Password:      (leave blank)"
echo ""
echo -e "${GREEN}Dummy Data Loaded:${NC}"
echo "  ✓ 5 Blog posts with markdown content"
echo "  ✓ 13 Live match events (IPL 2025 Final)"
echo "  ✓ 3 Test users (admin, editor, viewer)"
echo ""
echo "======================================"
echo "  Useful Commands"
echo "======================================"
echo ""
echo "  📋 View logs:           docker-compose logs -f"
echo "  📋 Backend logs:        docker-compose logs -f backend"
echo "  📋 Frontend logs:       docker-compose logs -f frontend"
echo "  🔄 Restart service:     docker-compose restart <service>"
echo "  🛑 Stop all:            docker-compose down"
echo "  🗑️  Remove volumes:      docker-compose down -v"
echo ""
echo -e "${YELLOW}Note:${NC} If blog posts don't appear, you may need to:"
echo "  1. Check backend logs: docker-compose logs backend"
echo "  2. Verify H2 database has data: http://localhost:8099/h2-console"
echo "  3. Manually seed data by running the SQL in data-seed.sql"
echo ""
echo -e "${GREEN}Happy Testing! 🏏${NC}"
echo ""
