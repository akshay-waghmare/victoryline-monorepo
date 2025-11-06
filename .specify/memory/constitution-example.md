# VictoryLine Cricket Platform Constitution

## Core Principles

### I. Real-Time Data Integrity
**Priority**: CRITICAL
- Live match data must be accurate within 5 seconds of actual events
- Scraper must handle network failures gracefully with automatic retry
- Backend must validate all incoming data before persisting
- Frontend must display loading states during data refresh
- No stale data displayed - timestamp every data point

**Rationale**: Trust in live scores is fundamental to user experience. Inaccurate or delayed data destroys credibility.

### II. Monorepo Architecture Standards
**Structure**:
- Three independent services: Frontend (Angular), Backend (Spring Boot), Scraper (Python)
- Services communicate via REST APIs only
- Shared types/models documented in `.specify/specs/shared-contracts/`
- Each service maintains its own build pipeline and tests
- No direct database access from frontend - always through backend API

**Dependencies**:
- Frontend → Backend API only
- Backend → Database + Scraper API
- Scraper → External sources + Backend API (for data push)

### III. API Design Standards
**REST Conventions** (NON-NEGOTIABLE):
- Consistent endpoint naming: `/api/{resource}/{id}/{sub-resource}`
- HTTP methods: GET (read), POST (create), PUT (update), DELETE (remove)
- Status codes: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- Response format: JSON with consistent structure:
  ```json
  {
    "success": true/false,
    "data": {...},
    "error": "message",
    "timestamp": "ISO8601"
  }
  ```

**Authentication**:
- JWT tokens for all protected endpoints
- Token expiry: 24 hours
- Refresh token mechanism required
- Role-based access control (RBAC): Admin, User, Guest

### IV. Testing Requirements
**Backend (Spring Boot)**:
- Unit tests for all services (>80% coverage)
- Integration tests for API endpoints
- Test database: H2 in-memory for tests
- Mock external dependencies (Scraper API)

**Frontend (Angular)**:
- Unit tests for components and services (>70% coverage)
- E2E tests for critical user flows (login, view match, player stats)
- Mock backend API calls in tests

**Scraper (Python)**:
- Unit tests for parsing logic (>75% coverage)
- Integration tests with mock HTML responses
- Test cases for edge cases (rain delays, super overs, tied matches)

**Test-First**: Write tests before implementation for new features (TDD encouraged but not mandated)

### V. Performance Requirements
**Frontend**:
- Initial page load: <3 seconds
- Live score updates: WebSocket or polling every 5 seconds
- Smooth animations (60fps)
- Responsive design: mobile-first approach

**Backend**:
- API response time: <200ms for simple queries, <1s for complex aggregations
- Database query optimization: use indexes, avoid N+1 queries
- Connection pooling for database and external APIs
- Caching: Redis for frequently accessed data (match summaries, player stats)

**Scraper**:
- Scrape interval: Every 60 seconds for live matches
- Handle rate limiting from source websites
- Async/parallel scraping for multiple matches
- Fail fast: Don't block on single match errors

### VI. Code Quality & Consistency
**General**:
- Code reviews required for all changes (no direct commits to main branches)
- Meaningful commit messages: `type(scope): description` (e.g., `feat(frontend): add player comparison`)
- Branch naming: `feature/123-short-description`, `bugfix/456-issue-name`
- Keep methods/functions small (<50 lines)
- Self-documenting code: clear variable/method names

**Backend (Java/Spring Boot)**:
- Follow Spring Boot best practices
- Use DTOs for API responses (don't expose entities)
- Service layer for business logic
- Repository layer for data access
- Exception handling: custom exceptions with proper HTTP status

**Frontend (Angular)**:
- Component-based architecture
- Smart/dumb component pattern
- Services for API calls and state management
- RxJS for async operations
- Lazy loading for routes

**Scraper (Python)**:
- PEP 8 style guide
- Type hints for function signatures
- Proper error handling and logging
- Structured logging (JSON format)

### VII. Security Standards
- Never commit secrets (API keys, passwords, tokens) to repository
- Use environment variables for configuration
- Input validation on all user inputs (frontend AND backend)
- SQL injection prevention: use parameterized queries
- XSS prevention: sanitize HTML output
- CORS configuration: whitelist allowed origins
- Rate limiting on public APIs

### VIII. Logging & Observability
**Backend**:
- Structured logging (JSON format)
- Log levels: ERROR (failures), WARN (recoverable issues), INFO (key events), DEBUG (development)
- Include request IDs for tracing
- Log all API calls with status and duration

**Scraper**:
- Log scraping attempts, successes, and failures
- Track data quality metrics
- Alert on repeated failures

**Frontend**:
- Error tracking (consider Sentry or similar)
- User action logging (anonymous analytics)

### IX. Documentation
- README in each app directory with setup instructions
- API documentation: Swagger/OpenAPI for backend endpoints
- Architecture diagrams in `.specify/docs/architecture/`
- Update docs when changing public interfaces
- Inline comments only for "why", not "what"

### X. Deployment & DevOps
- Docker containers for each service
- Docker Compose for local development
- CI/CD pipeline: Build → Test → Deploy
- Environment parity: dev, staging, production
- Database migrations: version controlled (Flyway/Liquibase)
- Zero-downtime deployments

## Feature Development Process

1. **Specification** (`/speckit.specify`) - What and why
2. **Clarification** (`/speckit.clarify`) - Resolve ambiguities [OPTIONAL]
3. **Planning** (`/speckit.plan`) - Technical design and tech stack
4. **Validation** (`/speckit.checklist`) - Quality check [OPTIONAL]
5. **Tasks** (`/speckit.tasks`) - Break down into actionable items
6. **Analysis** (`/speckit.analyze`) - Consistency check [OPTIONAL]
7. **Implementation** (`/speckit.implement`) - Build it
8. **Testing** - Verify it works
9. **Review** - Code review and approval
10. **Deploy** - Ship it

## Decision-Making Guidelines

### When to Add a New Dependency
- Evaluate: Does it solve a real problem or just add convenience?
- Check: Is it actively maintained? Recent commits?
- Consider: Bundle size impact (frontend), memory footprint (backend/scraper)
- Document: Why this dependency in commit message

### When to Optimize
- Profile first - don't guess where bottlenecks are
- Focus on user-facing performance issues
- Document: before/after metrics
- Consider: Premature optimization is the root of all evil

### When to Refactor
- Technical debt is blocking new features
- Code is hard to test or change
- Performance issues traced to poor design
- Do NOT refactor and add features simultaneously

### When to Break the Rules
- Document the exception and rationale
- Get team approval for principle violations
- Add TODO to revisit the exception later
- Emergency bug fixes: fix first, follow process later (but do follow up)

## Governance

**Constitution Updates**:
- Propose changes via pull request
- Require team consensus (majority vote)
- Document rationale for changes
- Version history maintained in git

**Conflict Resolution**:
- Principle violations flagged in code review
- Discuss in team meetings if unclear
- Product Owner has final say on feature priority
- Tech Lead has final say on technical decisions

---

*This constitution is a living document. Update it as the project evolves. Last updated: Nov 6, 2025*
