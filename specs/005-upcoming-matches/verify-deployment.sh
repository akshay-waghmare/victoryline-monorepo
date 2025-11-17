#!/bin/bash
# Feature 005: Upcoming Matches - Deployment Verification Script

set -e

echo "=========================================="
echo "Feature 005: Upcoming Matches Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
SCRAPER_URL="${SCRAPER_URL:-http://localhost:5000}"

echo "Backend URL: $BACKEND_URL"
echo "Scraper URL: $SCRAPER_URL"
echo ""

# Function to check endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $status, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON response
check_json_field() {
    local name=$1
    local url=$2
    local field=$3
    local expected=$4
    
    echo -n "Checking $name... "
    
    response=$(curl -s "$url")
    value=$(echo "$response" | jq -r "$field" 2>/dev/null || echo "null")
    
    if [ "$value" = "$expected" ]; then
        echo -e "${GREEN}✓ OK${NC} ($field = $expected)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} ($field = $value, expected $expected)"
        return 1
    fi
}

# Track failures
failures=0

echo "=========================================="
echo "1. Backend API Checks"
echo "=========================================="

# Check backend list endpoint
check_endpoint "Backend list endpoint" "$BACKEND_URL/api/v1/matches/upcoming" 200 || ((failures++))

# Check backend API response structure
check_json_field "Backend API response format" "$BACKEND_URL/api/v1/matches/upcoming" ".success" "true" || ((failures++))

# Check pagination structure
check_json_field "Backend pagination structure" "$BACKEND_URL/api/v1/matches/upcoming" ".data.currentPage" "0" || ((failures++))

echo ""
echo "=========================================="
echo "2. Scraper Service Checks"
echo "=========================================="

# Check scraper health endpoint
check_endpoint "Scraper health endpoint" "$SCRAPER_URL/api/health/upcoming" || ((failures++))

# Check health status
check_json_field "Scraper health status" "$SCRAPER_URL/api/health/upcoming" ".data.status" || ((failures++))

# Check scheduler status
check_endpoint "Scheduler status endpoint" "$SCRAPER_URL/api/fixtures/status" 200 || ((failures++))

# Check scheduler is running
check_json_field "Scheduler running" "$SCRAPER_URL/api/fixtures/status" ".data.running" "true" || ((failures++))

echo ""
echo "=========================================="
echo "3. Integration Checks"
echo "=========================================="

# Check backend connectivity from scraper
echo -n "Checking scraper→backend connectivity... "
backend_healthy=$(curl -s "$SCRAPER_URL/api/health/upcoming" | jq -r '.data.metrics.backend_healthy' 2>/dev/null || echo "null")

if [ "$backend_healthy" = "true" ]; then
    echo -e "${GREEN}✓ OK${NC} (backend reachable)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (backend not reachable from scraper)"
    ((failures++))
fi

# Check PID count
echo -n "Checking PID count... "
pid_count=$(curl -s "$SCRAPER_URL/api/health/upcoming" | jq -r '.data.metrics.pid_count' 2>/dev/null || echo "0")

if [ "$pid_count" -lt 200 ]; then
    echo -e "${GREEN}✓ OK${NC} (PID count: $pid_count < 200)"
elif [ "$pid_count" -lt 400 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (PID count: $pid_count, warning threshold exceeded)"
else
    echo -e "${RED}✗ CRITICAL${NC} (PID count: $pid_count, critical threshold exceeded)"
    ((failures++))
fi

# Check data staleness
echo -n "Checking data staleness... "
staleness=$(curl -s "$SCRAPER_URL/api/health/upcoming" | jq -r '.data.metrics.staleness_seconds' 2>/dev/null || echo "null")

if [ "$staleness" = "null" ]; then
    echo -e "${YELLOW}⚠ INFO${NC} (no scrapes completed yet)"
elif [ "$staleness" -lt 60 ]; then
    echo -e "${GREEN}✓ OK${NC} (staleness: ${staleness}s < 60s)"
elif [ "$staleness" -lt 300 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (staleness: ${staleness}s, warning threshold exceeded)"
else
    echo -e "${RED}✗ CRITICAL${NC} (staleness: ${staleness}s, critical threshold exceeded)"
    ((failures++))
fi

echo ""
echo "=========================================="
echo "4. Database Checks"
echo "=========================================="

# Check if table exists by trying to query it
echo -n "Checking database table... "
response=$(curl -s "$BACKEND_URL/api/v1/matches/upcoming?size=1")
if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC} (table accessible)"
else
    echo -e "${RED}✗ FAILED${NC} (table not accessible or migration not run)"
    ((failures++))
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ $failures -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Feature 005: Upcoming Matches is deployed successfully."
    echo ""
    echo "Next steps:"
    echo "  1. Implement HTML parsing in crex_fixture_scraper.py"
    echo "  2. See: apps/scraper/FIXTURE_SCRAPER_IMPLEMENTATION_GUIDE.md"
    echo "  3. Test scraping: curl -X POST $SCRAPER_URL/api/fixtures/trigger"
    echo "  4. Verify data: curl $BACKEND_URL/api/v1/matches/upcoming"
    exit 0
else
    echo -e "${RED}✗ $failures check(s) failed${NC}"
    echo ""
    echo "Please review the errors above and fix the issues."
    echo ""
    echo "Common fixes:"
    echo "  - Ensure backend is running: docker compose ps backend"
    echo "  - Ensure scraper is running: docker compose ps scraper"
    echo "  - Check logs: docker compose logs backend scraper"
    echo "  - Run migrations: docker compose exec backend ./mvnw flyway:migrate"
    exit 1
fi
