# Quickstart Guide: Completed Matches Display

**Feature**: 006-completed-matches-display  
**Last Updated**: November 18, 2025  
**Estimated Setup Time**: 15 minutes

## Overview

This guide helps developers set up and test the Completed Matches Display feature locally. Follow these steps to get the feature running on your development machine.

## Prerequisites

Before starting, ensure you have:

- ✅ Java 8 or higher installed (`java -version`)
- ✅ Node.js 10+ and npm 6+ installed (`node -v`, `npm -v`)
- ✅ MySQL 5.7+ running locally or accessible remotely
- ✅ Maven 3.6+ installed (`mvn -v`)
- ✅ Angular CLI 6.2+ installed globally (`npm install -g @angular/cli@6.2.3`)
- ✅ Redis server running (optional, for caching - see setup below)
- ✅ Git repository cloned locally

## Setup Steps

### 1. Database Setup

#### Create Test Data

Run this SQL script to create sample completed matches for testing:

```sql
-- Connect to your MySQL database
USE victoryline;

-- Insert sample series
INSERT INTO series (id, name, format, start_date, season, country) VALUES
(1, 'India vs Australia ODI Series 2025', 'ODI', '2025-11-01', '2025', 'Australia'),
(2, 'England vs Pakistan T20 Series 2025', 'T20', '2025-11-10', '2025', 'England'),
(3, 'South Africa vs New Zealand Test Series 2025', 'TEST', '2025-10-20', '2025', 'South Africa');

-- Insert 25 sample completed matches (to test pagination with 20 limit)
INSERT INTO matches (status, completion_date, start_date, team_a, team_b, score_a, score_b, result, venue, series_id, format) VALUES
('COMPLETED', '2025-11-15 18:30:00', '2025-11-15 09:00:00', 'India', 'Australia', '328/5', '325/9', 'India won by 5 wickets', 'Melbourne Cricket Ground', 1, 'ODI'),
('COMPLETED', '2025-11-14 16:45:00', '2025-11-14 13:00:00', 'England', 'Pakistan', '187/7', '185/10', 'England won by 3 wickets', 'Lord\'s Cricket Ground', 2, 'T20'),
('COMPLETED', '2025-11-13 17:00:00', '2025-11-13 10:00:00', 'South Africa', 'New Zealand', '425/8', '380/10', 'South Africa won by 45 runs', 'Cape Town Stadium', 3, 'TEST'),
('COMPLETED', '2025-11-12 19:15:00', '2025-11-12 09:30:00', 'India', 'Australia', '299/7', '295/9', 'India won by 4 runs', 'Sydney Cricket Ground', 1, 'ODI'),
('COMPLETED', '2025-11-11 15:30:00', '2025-11-11 12:00:00', 'England', 'Pakistan', '165/6', '160/9', 'England won by 4 wickets', 'Old Trafford', 2, 'T20'),
('COMPLETED', '2025-11-10 18:45:00', '2025-11-10 10:00:00', 'South Africa', 'New Zealand', '512/7', '450/10', 'South Africa won by 62 runs', 'Johannesburg', 3, 'TEST'),
('COMPLETED', '2025-11-09 20:00:00', '2025-11-09 09:00:00', 'India', 'Australia', '310/6', '308/8', 'India won by 2 runs', 'Adelaide Oval', 1, 'ODI'),
('COMPLETED', '2025-11-08 16:00:00', '2025-11-08 13:00:00', 'England', 'Pakistan', '175/5', '170/10', 'England won by 5 wickets', 'Edgbaston', 2, 'T20'),
('COMPLETED', '2025-11-07 17:30:00', '2025-11-07 10:00:00', 'South Africa', 'New Zealand', '398/9', '390/10', 'South Africa won by 8 runs', 'Durban', 3, 'TEST'),
('COMPLETED', '2025-11-06 19:45:00', '2025-11-06 09:30:00', 'India', 'Australia', '285/8', '280/9', 'India won by 2 wickets', 'Perth Stadium', 1, 'ODI'),
('COMPLETED', '2025-11-05 15:15:00', '2025-11-05 12:00:00', 'England', 'Pakistan', '190/4', '185/10', 'England won by 6 wickets', 'The Oval', 2, 'T20'),
('COMPLETED', '2025-11-04 18:00:00', '2025-11-04 10:00:00', 'South Africa', 'New Zealand', '445/7', '410/10', 'South Africa won by 35 runs', 'Port Elizabeth', 3, 'TEST'),
('COMPLETED', '2025-11-03 20:30:00', '2025-11-03 09:00:00', 'India', 'Australia', '315/7', '310/9', 'India won by 5 runs', 'Brisbane Cricket Ground', 1, 'ODI'),
('COMPLETED', '2025-11-02 16:30:00', '2025-11-02 13:00:00', 'England', 'Pakistan', '180/6', '175/9', 'England won by 4 wickets', 'Trent Bridge', 2, 'T20'),
('COMPLETED', '2025-11-01 17:45:00', '2025-11-01 10:00:00', 'South Africa', 'New Zealand', '520/6', '480/10', 'South Africa won by 40 runs', 'Centurion', 3, 'TEST'),
('COMPLETED', '2025-10-31 19:00:00', '2025-10-31 09:30:00', 'India', 'Australia', '295/9', '290/10', 'India won by 1 wicket', 'Hobart', 1, 'ODI'),
('COMPLETED', '2025-10-30 15:45:00', '2025-10-30 12:00:00', 'England', 'Pakistan', '170/7', '165/10', 'England won by 3 wickets', 'Cardiff', 2, 'T20'),
('COMPLETED', '2025-10-29 18:15:00', '2025-10-29 10:00:00', 'South Africa', 'New Zealand', '410/8', '380/9', 'South Africa won by 30 runs', 'Bloemfontein', 3, 'TEST'),
('COMPLETED', '2025-10-28 20:15:00', '2025-10-28 09:00:00', 'India', 'Australia', '320/5', '315/8', 'India won by 5 runs', 'Canberra', 1, 'ODI'),
('COMPLETED', '2025-10-27 16:15:00', '2025-10-27 13:00:00', 'England', 'Pakistan', '195/3', '190/10', 'England won by 7 wickets', 'Southampton', 2, 'T20');
-- Add 5 more for a total of 25 to test limit
INSERT INTO matches (status, completion_date, start_date, team_a, team_b, score_a, score_b, result, venue, series_id, format) VALUES
('COMPLETED', '2025-10-26 17:00:00', '2025-10-26 10:00:00', 'South Africa', 'New Zealand', '455/9', '420/10', 'South Africa won by 35 runs', 'East London', 3, 'TEST'),
('COMPLETED', '2025-10-25 19:30:00', '2025-10-25 09:30:00', 'India', 'Australia', '305/6', '300/9', 'India won by 4 wickets', 'Townsville', 1, 'ODI'),
('COMPLETED', '2025-10-24 15:00:00', '2025-10-24 12:00:00', 'England', 'Pakistan', '185/5', '180/10', 'England won by 5 wickets', 'Bristol', 2, 'T20'),
('COMPLETED', '2025-10-23 18:30:00', '2025-10-23 10:00:00', 'South Africa', 'New Zealand', '490/7', '450/9', 'South Africa won by 40 runs', 'Pretoria', 3, 'TEST'),
('COMPLETED', '2025-10-22 20:45:00', '2025-10-22 09:00:00', 'India', 'Australia', '330/4', '325/10', 'India won by 6 wickets', 'Darwin', 1, 'ODI');
```

#### Create Required Index

```sql
-- Optimize query performance
CREATE INDEX idx_status_completion ON matches (status, completion_date DESC);
```

### 2. Backend Setup

Navigate to the backend directory and configure:

```bash
cd apps/backend/spring-security-jwt
```

#### Update `application.properties`

Ensure your database connection is configured:

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/victoryline
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=none

# Redis Configuration (optional, for caching)
spring.redis.host=localhost
spring.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=300000
```

#### Build and Run Backend

```bash
# Clean and build
mvn clean install

# Run Spring Boot application
mvn spring-boot:run
```

Backend should start on `http://localhost:8080`

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd apps/frontend
```

#### Install Dependencies

```bash
npm install
```

#### Run Development Server

```bash
npm start
# or
ng serve
```

Frontend should start on `http://localhost:4200`

### 4. Redis Setup (Optional, for Caching)

If you want to test caching functionality:

#### Install Redis

**Windows** (using Chocolatey):
```bash
choco install redis-64
```

**macOS** (using Homebrew):
```bash
brew install redis
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt-get install redis-server
```

#### Start Redis Server

```bash
redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Testing the Feature

### 1. Manual Testing

#### Access the Feature

1. Open browser: `http://localhost:4200`
2. Login with test credentials (if authentication required)
3. Navigate to **Matches** tab
4. Click on **Completed** sub-tab
5. Verify 20 completed matches are displayed with series names

#### Test Cases to Verify

- ✅ 20 matches are displayed (not 25, respecting limit)
- ✅ Matches are ordered by completion date (most recent first)
- ✅ Each match shows series name
- ✅ Scores are displayed correctly
- ✅ Venue information is shown
- ✅ Match format (ODI/T20/TEST) is visible
- ✅ Page loads within 2 seconds
- ✅ Empty state message if no completed matches (test by setting status to 'UPCOMING')
- ✅ Error handling if backend is down (stop backend server and reload page)

### 2. API Testing (Using cURL or Postman)

#### Get JWT Token First

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

Extract the `token` from the response.

#### Test Completed Matches Endpoint

```bash
curl -X GET "http://localhost:8080/api/v1/matches/completed?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "matchId": 12345,
      "teamA": "India",
      "teamB": "Australia",
      "scoreA": "328/5",
      "scoreB": "325/9",
      "result": "India won by 5 wickets",
      "seriesName": "India vs Australia ODI Series 2025",
      "format": "ODI",
      "completionDate": "2025-11-15T18:30:00Z",
      "venue": "Melbourne Cricket Ground"
    }
    // ... 19 more matches
  ],
  "error": null,
  "timestamp": "2025-11-18T10:30:45.123Z",
  "count": 20
}
```

### 3. Automated Testing

#### Backend Tests

```bash
cd apps/backend/spring-security-jwt
mvn test
```

Tests to verify:
- `MatchControllerTest.testGetCompletedMatches()` - API endpoint
- `MatchServiceTest.testGetCompletedMatches()` - Business logic
- Integration test with H2 database

#### Frontend Tests

```bash
cd apps/frontend
npm test
```

Tests to verify:
- `CompletedMatchesComponent` unit tests
- `MatchService.getCompletedMatches()` service tests

## Troubleshooting

### Backend Issues

**Problem**: `java.sql.SQLException: Access denied for user`
- **Solution**: Check database credentials in `application.properties`

**Problem**: API returns 500 Internal Server Error
- **Solution**: Check backend logs: `tail -f logs/spring-boot-app.log`
- Verify database connection and that index exists

**Problem**: No matches returned (empty array)
- **Solution**: Verify test data was inserted: `SELECT COUNT(*) FROM matches WHERE status='COMPLETED'`

### Frontend Issues

**Problem**: "Cannot GET /api/v1/matches/completed"
- **Solution**: Verify backend is running on port 8080
- Check proxy configuration in `proxy.conf.json`

**Problem**: Tab navigation not working
- **Solution**: Check browser console for JavaScript errors
- Verify Angular Material is properly installed

**Problem**: Matches not displaying
- **Solution**: Open browser DevTools Network tab
- Check if API call is successful (200 OK)
- Verify response data structure matches TypeScript interface

### Redis Issues

**Problem**: Redis connection refused
- **Solution**: Start Redis server: `redis-server`
- Check if Redis is running: `redis-cli ping`

**Problem**: Caching not working
- **Solution**: Verify Redis configuration in `application.properties`
- Check cache key exists: `redis-cli GET completed_matches:20`

## Performance Verification

### Check API Response Time

```bash
time curl -X GET "http://localhost:8080/api/v1/matches/completed?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Target**: <200ms total time

### Check Database Query Performance

```sql
EXPLAIN SELECT m.*, s.name 
FROM matches m 
INNER JOIN series s ON m.series_id = s.id 
WHERE m.status = 'COMPLETED' 
ORDER BY m.completion_date DESC 
LIMIT 20;
```

Verify `Extra` column shows "Using index" (index is being used).

### Check Frontend Render Time

Open Chrome DevTools → Performance tab → Record → Navigate to Completed tab → Stop recording

**Target**: Time to Interactive < 2 seconds

## Next Steps

Once local testing is complete:

1. ✅ Create pull request with feature implementation
2. ✅ Run full test suite in CI/CD pipeline
3. ✅ Deploy to staging environment
4. ✅ Perform user acceptance testing (UAT)
5. ✅ Deploy to production

## Useful Commands

```bash
# Start all services (run from repo root)
docker-compose up -d mysql redis   # Start MySQL and Redis
cd apps/backend/spring-security-jwt && mvn spring-boot:run &  # Backend
cd apps/frontend && ng serve &     # Frontend

# Stop all services
pkill -f "spring-boot:run"
pkill -f "ng serve"
docker-compose down

# View logs
tail -f apps/backend/spring-security-jwt/logs/spring-boot-app.log  # Backend
# Frontend logs in terminal where ng serve is running

# Clear Redis cache (for testing)
redis-cli FLUSHALL
```

## Support

If you encounter issues not covered in this guide:

1. Check existing documentation in `/specs/006-completed-matches-display/`
2. Review constitution standards: `.specify/memory/constitution.md`
3. Ask team in Slack #dev-support channel
4. Create issue in GitHub with `[Bug]` or `[Question]` label

---

**Happy Coding! 🏏**
