# Project Context

## Purpose
Victoryline (Crickzen) is a cricket live score and analytics platform providing real-time match updates, detailed scorecards, player statistics, and match insights.

## Tech Stack
- **Frontend**: Angular 7.2, TypeScript 3.2, Angular Material 7, RxJS 6
- **Backend**: Spring Boot 2.x, Java 8/11, MySQL, Redis
- **Scraper**: Python 3.x, Flask, Playwright, BeautifulSoup
- **Infrastructure**: Docker, Docker Compose, Caddy (reverse proxy)

## Project Conventions

### Code Style
- TypeScript: Follow Angular style guide
- Python: PEP 8 conventions
- Java: Spring Boot best practices

### Architecture Patterns
- Monorepo structure with apps/backend, apps/frontend, apps/scraper
- Microservices architecture with REST APIs
- Real-time updates via WebSockets (STOMP)
- Scraper resilience with health monitoring and auto-restart

### Testing Strategy
- Frontend: Karma + Jasmine
- Backend: JUnit + Spring Test
- Scraper: pytest with integration tests
- Docker health checks for services

### Git Workflow
- Branch naming: `openspec/<feature-name>` for OpenSpec-managed features
- Commit messages: Conventional commits format
- Feature specs in `specs/` directory
- OpenSpec changes tracked in `openspec/changes/`

## Domain Context
- Cricket match data including live scores, ball-by-ball commentary, player stats
- Match states: scheduled, live, completed
- Innings structure with overs, balls, runs, wickets
- Player roles: batsman, bowler, all-rounder, wicket-keeper
- Tournament types: T20, ODI, Test matches

## Important Constraints
- Real-time data freshness: <60 seconds for live matches
- Scraper must handle thread/PID limits (max 512 PIDs in Docker)
- Browser cleanup required after each scraping operation
- Health monitoring with degraded/failing states
- Auto-restart scraper every 6 hours to prevent resource leaks

## External Dependencies
- Cricket data sources (web scraping targets)
- MySQL database for persistent storage
- Redis for caching and session management
- Docker runtime for containerized services
