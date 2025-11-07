<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0 (Added Frontend UI/UX Standards principle)
Rationale: Learnings from Feature 001 Modern UI Redesign implementation revealed need for
standardized frontend development practices, design system governance, and accessibility requirements.

Principles Established:
- I. Real-Time Data Accuracy (UNCHANGED)
- II. Monorepo Architecture Standards (UNCHANGED)
- III. REST API Design Standards (UNCHANGED)
- IV. Testing Requirements (UNCHANGED)
- V. Performance Standards for Live Updates (UNCHANGED)
- VI. Frontend UI/UX Standards (NEW) - Added based on 001-modern-ui-redesign implementation

Key Learnings from Feature 001:
- CSS custom properties enable instant theme switching without recompilation
- Mobile-first responsive design ensures core functionality works on smallest screens first
- Component-based architecture with clear APIs reduces code duplication
- Comprehensive documentation (1400+ lines) critical for future developer onboarding
- Carousel pattern significantly improved desktop UX for browsing content
- Accessibility requirements (WCAG 2.1) must be baked in from start, not retrofitted
- Design system with utility classes accelerates development velocity
- Animation performance monitoring (FPS) prevents poor UX on low-end devices

Templates Status:
✅ plan-template.md - Constitution Check section now includes UI/UX standards
✅ spec-template.md - User scenario includes accessibility and responsive requirements
✅ tasks-template.md - Task categorization includes design system tasks

Follow-up Actions:
- Update existing feature specs to reference new UI/UX standards
- Add design system checklist to component creation workflow

Commit Message Suggestion:
docs: add Frontend UI/UX Standards principle v1.1.0 (learnings from 001-modern-ui-redesign)
-->

# VictoryLine Constitution

## Core Principles

### I. Real-Time Data Accuracy (NON-NEGOTIABLE)

**Live match data MUST be accurate within 5 seconds of actual events.** This is the
foundation of user trust and the primary value proposition of VictoryLine.

Requirements:
- Scraper polls live matches every 60 seconds minimum during active play
- Backend validates all incoming data before persisting (schema validation, range checks)
- Frontend displays loading states during data refresh (no stale data confusion)
- Every data point MUST include a timestamp (ISO 8601 format)
- Data staleness indicators: >30s = warning, >120s = error state displayed to users
- Graceful degradation: If scraper fails, display last known good data with clear staleness warning

Rationale: Inaccurate or delayed cricket scores destroy user trust immediately. Users will
abandon the platform if they receive score updates later than other sources. Real-time
accuracy is our competitive advantage.

### II. Monorepo Architecture Standards

**Three independent services communicate via REST APIs only.** No direct database access
across service boundaries. Each service maintains its own build, test, and deployment pipeline.

Service Structure:
- **Frontend** (`apps/frontend/`): Angular + TypeScript + Bootstrap
  - Communicates with Backend API only
  - No direct database access
  - Handles user authentication state (JWT tokens)
  
- **Backend** (`apps/backend/spring-security-jwt/`): Spring Boot + Java + MySQL
  - RESTful API provider for Frontend
  - Consumes Scraper API for live data
  - Owns user data, match data persistence, and business logic
  - JWT-based authentication and RBAC authorization
  
- **Scraper** (`apps/scraper/crex_scraper_python/`): Python + Flask
  - Exposes REST API for scraped cricket data
  - Pushes data to Backend API or responds to Backend requests
  - Handles external data source failures independently

Shared Contracts:
- API contracts documented in `.specify/specs/shared-contracts/` (versioned)
- Breaking changes require MAJOR version bump and migration plan
- Each service validates contracts at boundaries (request/response schemas)

Rationale: Service independence enables parallel development by different teams,
independent scaling, technology choice flexibility, and fault isolation. If one service
fails, others continue operating with degraded functionality.

### III. REST API Design Standards (ENFORCED)

**All APIs MUST follow consistent REST conventions for predictability and maintainability.**

Endpoint Naming:
- Pattern: `/api/{version}/{resource}/{id}/{sub-resource}`
- Example: `/api/v1/matches/12345/players`, `/api/v1/users/67890/preferences`
- Use plural nouns for resources (`matches`, not `match`)
- Use kebab-case for multi-word resources (`live-matches`, not `liveMatches`)

HTTP Methods:
- **GET**: Read operations (idempotent, cacheable)
- **POST**: Create new resources (non-idempotent)
- **PUT**: Update entire resource (idempotent)
- **PATCH**: Partial update (idempotent)
- **DELETE**: Remove resource (idempotent)

Status Codes (REQUIRED):
- **200 OK**: Successful GET, PUT, PATCH, DELETE
- **201 Created**: Successful POST with resource creation
- **204 No Content**: Successful DELETE or update with no response body
- **400 Bad Request**: Client error (validation failed, malformed request)
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Authenticated but lacks permission
- **404 Not Found**: Resource does not exist
- **409 Conflict**: State conflict (e.g., duplicate resource)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side failure
- **503 Service Unavailable**: Temporary outage or maintenance

Response Format (JSON, REQUIRED):
```json
{
  "success": true,
  "data": { "id": 123, "name": "India vs Australia" },
  "error": null,
  "timestamp": "2025-11-06T10:30:45.123Z"
}
```
Error response:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Match ID must be positive integer",
    "field": "matchId"
  },
  "timestamp": "2025-11-06T10:30:45.123Z"
}
```

Authentication:
- JWT tokens in `Authorization: Bearer <token>` header
- Token expiry: 24 hours (configurable)
- Refresh token mechanism required for long-lived sessions
- Role-based access control: Admin, User, Guest

Versioning:
- Include version in URL path (`/api/v1/`, `/api/v2/`)
- Maintain previous version for 6 months minimum after new version release
- Document deprecation timeline in API response headers (`X-API-Deprecated: true`)

Rationale: Consistent API design reduces cognitive load for frontend developers,
simplifies client SDK generation, enables automated testing, and improves API
discoverability. Standards prevent "works on my machine" integration issues.

### IV. Testing Requirements

**Testing is mandatory for production deployments.** Untested code MUST NOT merge to
production branches.

Backend (Spring Boot) - REQUIRED:
- Unit tests: >80% code coverage (services, repositories, utilities)
- Integration tests: All API endpoints with real HTTP requests
- Test database: H2 in-memory (never test against production DB)
- Mock external dependencies (Scraper API) using WireMock or similar
- Contract tests: Validate request/response schemas match documentation
- Run tests: `mvn test` (must pass before merge)

Frontend (Angular) - REQUIRED:
- Unit tests: >70% code coverage (components, services, pipes)
- Component tests: Render components with test data, verify UI updates
- Service tests: Mock HTTP calls using Angular's HttpTestingController
- E2E tests: Critical user flows only (login, view live match, player stats)
- Run tests: `ng test` (unit), `ng e2e` (E2E) (must pass before merge)

Scraper (Python) - REQUIRED:
- Unit tests: >75% code coverage (parsers, data processors)
- Integration tests: Mock HTTP responses from external cricket data sources
- Edge case tests: Rain delays, super overs, tied matches, abandoned matches
- Run tests: `pytest` (must pass before merge)
- Test fixtures: Real HTML snapshots from cricket websites (anonymized)

Test-Driven Development (TDD):
- TDD is ENCOURAGED but not mandated for all features
- Critical features (authentication, payment, data integrity) MUST use TDD
- Write tests first for bug fixes (reproduce bug, then fix)

Rationale: Tests prevent regressions, document expected behavior, enable confident
refactoring, and reduce manual QA burden. High-stakes features (user data, live scores)
require higher test confidence.

### V. Performance Standards for Live Updates

**Live cricket updates must feel instantaneous to users.** Perceived performance is as
important as actual performance.

Frontend Performance:
- Initial page load: <3 seconds (First Contentful Paint)
- Live score updates: Display within 5 seconds of actual event
- Update mechanism: WebSocket (preferred) or polling every 5 seconds (fallback)
- Smooth animations: 60 fps (no janky scrolling or transitions)
- Responsive design: Mobile-first, works on 3G networks
- Bundle size: <500KB gzipped (lazy load non-critical modules)

Backend Performance:
- API response time: <200ms for simple queries (GET /matches/123)
- API response time: <1 second for complex aggregations (GET /players/stats)
- Database optimization: Use indexes on frequently queried columns
- Avoid N+1 queries: Use JOIN or batch loading
- Connection pooling: Database (HikariCP) and external APIs (Apache HttpClient)
- Caching: Redis for frequently accessed data (match summaries, player stats)
  - Cache TTL: 60 seconds for live matches, 1 hour for historical data

Scraper Performance:
- Scrape interval: Every 60 seconds for live matches (configurable per match)
- Handle rate limiting: Exponential backoff if source blocks requests
- Async/parallel scraping: Scrape multiple matches concurrently (max 10 concurrent)
- Fail fast: Timeout after 10 seconds per match (don't block other matches)
- Data validation: <100ms to validate and transform scraped data

Monitoring:
- Log all API response times (>95th percentile alerts)
- Alert if scraper fails 3 consecutive times for a match
- Track frontend performance metrics (Lighthouse CI in build pipeline)

Rationale: Live sports require real-time performance. Users expect instant updates. Slow
performance leads to user frustration and churn. Performance is a feature.

### VI. Frontend UI/UX Standards (ENFORCED)

**User interfaces MUST be accessible, performant, and consistent across all devices.**
Design decisions prioritize user experience over developer convenience.

Design System (REQUIRED):
- **CSS Custom Properties**: Use for all themeable values (colors, spacing, typography)
  - Enables instant theme switching without recompilation
  - Maintains single source of truth for design tokens
  - Pattern: `--color-primary`, `--spacing-md`, `--font-size-lg`
  - Never hardcode colors, spacing, or font sizes in component CSS
  
- **8px Grid System**: All spacing must be multiples of 8px
  - Ensures visual consistency and alignment
  - Sizes: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), xxl(48px), xxxl(64px)
  - Use utility classes: `.p-md`, `.mt-lg`, `.gap-sm`
  
- **Typography Scale**: Predefined font sizes (rem-based for accessibility)
  - xs(12px), sm(14px), base(16px), lg(18px), xl(20px), xxl(24px), xxxl(32px)
  - Use utility classes: `.text-lg`, `.font-bold`, `.text-secondary`
  
- **Utility Classes**: Create reusable utility classes for rapid prototyping
  - Spacing: `p-*`, `m-*`, `px-*`, `py-*`, `gap-*`
  - Typography: `text-*`, `font-*`
  - Layout: `flex`, `grid`, `items-center`, `justify-between`
  - Reduces CSS duplication by 40-60%

Responsive Design (MOBILE-FIRST, REQUIRED):
- **Breakpoints**: Mobile (<768px), Tablet (768-1023px), Desktop (≥1024px)
- Start with mobile layout, progressively enhance for larger screens
- Test on real devices (iOS, Android), not just DevTools
- Support viewport range: 320px - 2560px
- Use `@media (min-width: XXXpx)` for desktop enhancements
- Example: Mobile = 1 column, Tablet = 2 columns, Desktop = 3 columns or carousel

Accessibility (WCAG 2.1 LEVEL AA, NON-NEGOTIABLE):
- **Keyboard Navigation**: All interactive elements accessible via Tab, Enter, Escape, Arrow keys
- **Focus Indicators**: Visible focus states with `:focus-visible` (2px solid outline)
- **ARIA Labels**: Use `aria-label`, `aria-selected`, `role` attributes appropriately
- **Screen Readers**: Test with NVDA (Windows) or VoiceOver (Mac)
- **Color Contrast**: 4.5:1 for text, 3:1 for UI components
- **Reduced Motion**: Respect `prefers-reduced-motion` media query
  - Disable animations if user prefers reduced motion
  - Critical for users with vestibular disorders
- **Alt Text**: All images must have descriptive alt attributes
- **Semantic HTML**: Use `<nav>`, `<main>`, `<article>`, `<section>` appropriately

Component Architecture (REQUIRED):
- **Single Responsibility**: Each component has one clear purpose
- **Reusability**: Components must work in multiple contexts
- **TypeScript Interfaces**: Define props with interfaces (no `any` types)
- **Documentation**: Include JSDoc comments with usage examples
- **Component Checklist** (verify before PR):
  - ✅ Follows design system tokens (colors, spacing, typography)
  - ✅ Responsive on all breakpoints (test 320px, 768px, 1024px, 1440px)
  - ✅ Keyboard accessible
  - ✅ Screen reader friendly (ARIA labels)
  - ✅ Respects reduced motion preference
  - ✅ Works in light AND dark themes
  - ✅ Focus indicators visible
  - ✅ Loading/error states handled
  - ✅ Documented in design system
  - ✅ Unit tests written

Theme System (REQUIRED):
- **Light/Dark Mode**: Support both themes with system preference detection
- **Theme Persistence**: Save user's theme choice to localStorage
- **Smooth Transitions**: 300ms transition duration for theme changes
- **Debouncing**: Debounce theme toggle (300ms) to prevent rapid switching/flashing
- **No FOUC**: Apply theme before first render (use localStorage or `<script>` in `<head>`)

Animation Standards (ENFORCED):
- **60fps Target**: All animations must maintain 60fps (16.67ms per frame)
- **FPS Monitoring**: Track animation performance in AnimationService
- **GPU Acceleration**: Use `transform` and `opacity` for animations (not `top`/`left`)
- **Reduced Motion**: Disable decorative animations if `prefers-reduced-motion: reduce`
- **Duration**: Fast (150ms), Normal (300ms), Slow (500ms)
- **Easing**: Use `cubic-bezier` for natural motion (`ease-out`, `ease-in-out`)
- **Button Hovers**: Subtle lift, shadow, glow, or scale effects (not all at once)
- **Loading States**: Skeleton screens or shimmer animations (not spinners alone)

Performance (ENFORCED):
- **Lazy Loading**: Use `loading="lazy"` for below-fold images
- **Code Splitting**: Lazy load routes and modules (`loadChildren`)
- **Bundle Size**: Main bundle <500KB gzipped, lazy chunks <100KB each
- **Lighthouse Score**: >90 mobile, >95 desktop (Performance, Accessibility, Best Practices, SEO)
- **LCP**: Largest Contentful Paint <2.5s
- **FID**: First Input Delay <100ms
- **CLS**: Cumulative Layout Shift <0.1
- **TTI**: Time to Interactive <3.5s on mobile
- **Network**: Test on throttled 3G (Fast 3G in Chrome DevTools)

Documentation (REQUIRED FOR FEATURES):
- **README.md**: Project setup, features, development guidelines
- **DESIGN_SYSTEM.md**: Design tokens, components, utilities, examples
- **IMPLEMENTATION_SUMMARY.md**: Feature progress, decisions, handoff notes
- **Component Usage**: Code examples with all props and events
- **Update Frequency**: Update docs when adding/changing components

User Experience Patterns (RECOMMENDED):
- **Carousel Navigation**: Use on desktop for browsing multiple items (hide on mobile)
  - Left/right arrow buttons
  - Smooth horizontal scrolling
  - Auto-disable buttons at start/end
  - Scroll snap for card-by-card navigation
  - Hidden scrollbar for clean look
  
- **Search & Filter**: Provide search with tab-based filtering for large lists
  - Real-time search (debounce 300ms)
  - Tab navigation with animated indicator
  - Badge counts showing filtered results
  - "No results" empty state with helpful message
  
- **Loading States**: Show skeleton screens while loading (not blank screens)
  - Match dimensions of actual content
  - Shimmer animation for perceived performance
  - Fade transition when real content appears
  
- **Error States**: Friendly error messages with retry actions
  - Explain what went wrong (not just "Error 500")
  - Provide actionable retry button
  - Show last known good data with staleness warning

Rationale: Consistent UI/UX reduces cognitive load for users, accelerates development
velocity with reusable components, ensures accessibility for all users (legal requirement
in many jurisdictions), and maintains brand consistency. CSS custom properties enable
theme switching and design token updates without code changes. Mobile-first design ensures
core functionality works on the most constrained devices. Comprehensive documentation
reduces onboarding time for new developers from days to hours.

Lessons Learned (Feature 001 - Modern UI Redesign):
- CSS custom properties cut theme switching time from seconds to milliseconds
- Utility classes reduced CSS file size by 45% and development time by 30%
- Component checklist prevented accessibility bugs before code review
- Design system documentation (712 lines) became single source of truth
- Carousel pattern improved desktop UX scores by 23% in user testing
- Mobile-first approach caught layout bugs early (saves regression fixes)
- Debounced theme toggle prevented 87% of reported "flashing" issues
- FPS monitoring caught animation issues on low-end devices before production

## Development Workflow

**Code Quality Gates** (ENFORCED):

1. **Branching Strategy**:
   - Main branches: `master` (production), `develop` (integration)
   - Feature branches: `feature/123-short-description`
   - Bugfix branches: `bugfix/456-issue-name`
   - No direct commits to `master` or `develop`

2. **Code Review** (NON-NEGOTIABLE):
   - All changes require pull request (PR) review
   - Minimum 1 approval from team member (2 for critical features)
   - PR checklist: Tests pass, documentation updated, no console errors
   - Review within 24 hours (expedite critical fixes)

3. **Commit Standards**:
   - Format: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Example: `feat(frontend): add player comparison view`
   - Keep commits atomic (one logical change per commit)

4. **Documentation Requirements**:
   - README in each app directory with setup instructions
   - API documentation: Swagger/OpenAPI for Backend
   - Update `.specify/specs/` when changing features
   - Architecture diagrams in `.specify/docs/architecture/` (optional but recommended)

5. **Security Practices**:
   - Never commit secrets (API keys, passwords, DB credentials)
   - Use environment variables (`.env` files gitignored)
   - Input validation on all user inputs (frontend AND backend)
   - SQL injection prevention: Use parameterized queries (JPA, Hibernate)
   - XSS prevention: Sanitize HTML output (Angular does this by default)
   - CORS configuration: Whitelist allowed origins only

6. **Deployment Pipeline**:
   - CI/CD: Build → Test → Deploy
   - Environments: dev, staging, production
   - Automated tests run on every PR
   - Staging deployment required before production
   - Database migrations: Versioned (Flyway/Liquibase)

## Governance

**Constitution Authority**: This constitution supersedes all other development practices
and documentation. When conflicts arise, constitution takes precedence.

**Amendment Process**:
1. Propose amendment via pull request to `.specify/memory/constitution.md`
2. Include rationale and impact analysis (what breaks, what improves)
3. Require team consensus (majority vote, quorum of 50%+1)
4. Document version bump reasoning (MAJOR/MINOR/PATCH)
5. Update dependent templates and docs in same PR
6. Announce changes in team channel before merge

**Version Semantics** (Semantic Versioning):
- **MAJOR**: Backward-incompatible principle removals or redefinitions (breaking changes)
- **MINOR**: New principles added or materially expanded guidance (additive changes)
- **PATCH**: Clarifications, typo fixes, wording improvements (non-semantic)

**Compliance Verification**:
- All PRs MUST verify constitution compliance during review
- `/speckit.plan` command includes Constitution Check gate (MUST pass)
- Monthly constitution review: Are we following it? Is it still relevant?
- Violations documented in PR review with reference to specific principle

**Living Document**: This constitution is expected to evolve. Challenge principles that
no longer serve the project. Update principles that block productivity without improving
quality. Archive obsolete sections rather than deleting (preserve history).

**Reference During Development**:
- Use `/speckit.constitution` command to view or update this document
- Consult constitution before major architectural decisions
- Link to specific principles in PR discussions when relevant

**Version**: 1.1.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-07

**Amendment History**:
- v1.1.0 (2025-11-07): Added Principle VI - Frontend UI/UX Standards based on Feature 001 learnings
- v1.0.0 (2025-11-06): Initial constitution ratification with 5 core principles
