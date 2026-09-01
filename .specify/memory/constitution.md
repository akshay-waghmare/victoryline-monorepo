<!--
SYNC IMPACT REPORT
==================
Version Change: 1.3.0 → 1.4.0 (Added bounded live operations, provider-identity continuity,
canonical player navigation, crawl-cohort evidence, and incident escalation rules)
Rationale: The Aug 31–Sep 2 CrickZen work resolved recurring stale-live, short-key collision,
CREX player hydration, scorecard navigation, and search-discovery failures. This amendment
makes the resulting operational rules enforceable for future implementation and rollout work.

Principles Established:
- I. Source-Backed Real-Time Data Accuracy (EXPANDED) - Provider truth, identity, lifecycle,
  freshness, and safe degradation are explicit.
- II. Monorepo and Public-Surface Architecture Standards (EXPANDED) - Operator, public,
  canonical, and internal production boundaries are explicit.
- III. REST and Public API Design Standards (EXPANDED) - Versioning, access, rate limits,
  noindex distribution surfaces, and historical-data contracts are explicit.
- IV. Testing and Cross-Boundary Evidence Requirements (EXPANDED) - Focused tests and exact
  runtime/artifact proof are required for production claims.
- V. Performance and Snapshot-First Delivery Standards (EXPANDED) - First useful HTML must
  not wait for optional fan-out, and cold/warm behavior must be measured.
- VI. Frontend UI/UX Standards (EXPANDED) - Hero ownership, progressive disclosure, and
  truthful loading/error behavior are enforced.
- VII. Canonical Lifecycle and SEO/AEO Truth (EXPANDED) - One canonical owner and evidence-backed
  indexability govern every public match surface.
- VIII. Evidence-Gated Public Product and Growth (NEW) - Trust, history, distribution, and
  business claims require reproducible evidence.
- IX. Safe Rollouts and Durable Continuity (EXPANDED) - Isolated deployment, rollback, wiki,
  image inventory, and Spec Kit continuity are part of completion.

Templates Status:
✅ .specify/templates/plan-template.md - Constitution Check covers lifecycle, evidence,
  canonical ownership, UX hierarchy, rollout, and continuity gates.
✅ .specify/templates/spec-template.md - Requirements and success criteria cover lifecycle
  truth, evidence boundaries, user-facing hierarchy, and outcome claims.
✅ .specify/templates/tasks-template.md - Cross-cutting tasks cover contract tests, runtime
  proof, rollback, documentation, and wiki synchronization.
✅ .github/prompts/speckit.constitution.prompt.md - Constitution changes require a linked
  CrickZen wiki mirror update and navigation/cache synchronization.
✅ AGENTS.md - CrickZen work consults both the wiki constitution and repository constitution.

Follow-up Actions:
- Keep [[CrickZen Constitution]] synchronized with this file on every amendment.
- Reference the constitution version in new CrickZen specs, checkpoints, and rollout records;
  keep the current production image tags and immutable digests in the relevant rollout note.
- Reconcile the current production AEO bundle, upcoming schedule text, fixed historical
  share/embed links, GSC cohort evidence, and snapshot-first deployment before claiming
  full acceptance.

Commit Message Suggestion:
docs: amend constitution to v1.4.0 (bounded live ops and provider continuity)
-->

# VictoryLine / CrickZen Constitution

## Core Principles

### I. Source-Backed Real-Time Data Accuracy (NON-NEGOTIABLE)

**Every public score, lifecycle, team identity, schedule, and probability MUST be
source-backed, timestamped, and semantically correct.** Fresh timestamps alone do not
prove that the underlying state is correct.

Requirements:
- Authoritative provider discovery MUST define the active live slate; an empty discovery
  result MUST remain empty and MUST NOT resurrect stale backend rows.
- Scraper polls selected live matches every 60 seconds minimum during active play
- Backend validates all incoming data before persisting (schema validation, range checks)
- Match identity MUST preserve provider-confirmed batting/bowling roles and recognize
  documented aliases such as `NEP-A` and `Nepal`.
- Provider short keys MUST NOT be treated as globally unique. A match identity MUST include
  the normalized team/format family and the provider URL or scoped key before rows, aliases,
  snapshots, or canonical routes are joined.
- A bounded live-management cap is permitted to protect provider and server load. The
  persisted managed slate MUST be sticky across discovery cycles and scraper restarts; a
  selected match remains managed until credible terminal evidence, and only a released slot
  may be filled by a new candidate.
- Freshness and watchdog coverage MUST be evaluated per managed match. A global scrape
  timestamp, aggregate coverage ratio, or total provider-live count MUST NOT hide a stale
  selected match.
- Every data point MUST include a timestamp (ISO 8601 format)
- Data staleness indicators: >30s = warning, >120s = error state displayed to users
- Graceful degradation MUST display last known good data with a clear staleness warning;
  it MUST NOT display fabricated, placeholder, or default `0/0` facts as current truth.
- A fresh write with an empty or semantically default state MUST be treated as an accuracy
  failure, not as successful freshness.

Rationale: Inaccurate or delayed cricket facts destroy trust immediately. Correct provider
identity, lifecycle, and score semantics matter as much as update frequency.

### II. Monorepo and Public-Surface Architecture Standards

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

CrickZen Surface Boundaries:
- `www.crickzen.com/cric-live/{slug}` is the canonical public match owner.
- `/player/{externalId}/{slug}` is the canonical public individual-player owner. The
  scorecard may resolve a name through the selected provider match, but it MUST NOT publish
  a fabricated or unrelated player identity.
- `prediction.crickzen.com` is the public prediction, methodology, history, creator,
  partner, media, share, and embed product surface.
- `app.crickzen.com` remains the operator/dashboard surface; operator controls and Streamlit
  controls MUST NOT leak into the public prediction host.
- Share and embed pages support distribution, remain `noindex`, and point to the canonical
  main-domain match page.
- TrueOdds is an internal verified-artifact producer. Private controls, arbitrary local
  paths, and unverified files MUST NOT be exposed as public product behavior.

Rationale: Service independence enables parallel development by different teams,
independent scaling, technology choice flexibility, and fault isolation. If one service
fails, others continue operating with degraded functionality.

### III. REST and Public API Design Standards (ENFORCED)

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

Public-data contracts:
- Public prediction APIs MUST be versioned, rate-limited, CORS-scoped, and covered by
  structured error and contract tests before being presented as developer integrations.
- Read-only history responses MUST be whitelist-only and MUST NOT expose raw predictor
  features, private paths, or internal rolling state.
- Canonical and match-info APIs MUST return `404` for unresolved upcoming identities that
  lack authoritative lifecycle evidence; stale stored metadata alone is not sufficient.
- Historical records MUST be immutable after publication; archive IDs MUST be stable and
  derived from normalized source identity rather than temporary process identity.
- Provider-backed player lookup MUST be scoped to the selected match URL when a roster ID is
  absent. A global catalog search is an optimization only; it MUST NOT substitute an
  unrelated first result for a verified provider identity.

Rationale: Consistent API design reduces cognitive load for frontend developers,
simplifies client SDK generation, enables automated testing, and improves API
discoverability. Standards prevent "works on my machine" integration issues.

### IV. Testing and Cross-Boundary Evidence Requirements

**Testing is mandatory for production deployments.** Untested code MUST NOT merge to
production branches, and a source-only green check MUST NOT be reported as runtime success.

Backend (Spring Boot) - REQUIRED:
- Unit tests: >80% code coverage (services, repositories, utilities)
- Integration tests: All API endpoints with real HTTP requests
- Test database: H2 in-memory (never test against production DB)
- Mock external dependencies (Scraper API) using WireMock or similar
- Contract tests: Validate request/response schemas match documentation
- Run tests: `mvn test` (must pass before merge, or any unrelated baseline failure MUST be
  named, isolated, and recorded rather than silently ignored)

Frontend (Angular) - REQUIRED:
- Unit tests: >70% code coverage (components, services, pipes)
- Component tests: Render components with test data, verify UI updates
- Service tests: Mock HTTP calls using Angular's HttpTestingController
- E2E tests: Critical user flows only (login, view live match, player stats)
- Run tests: `ng test` (unit), `ng e2e` (E2E) (must pass before merge; focused changed-surface
  checks MUST be identified when the repository baseline is not green)

Scraper (Python) - REQUIRED:
- Unit tests: >75% code coverage (parsers, data processors)
- Integration tests: Mock HTTP responses from external cricket data sources
- Edge case tests: Rain delays, super overs, tied matches, abandoned matches
- Run tests: `pytest` (must pass before merge)
- Test fixtures: Real HTML snapshots from cricket websites (anonymized)

Production evidence:
- Every production change MUST have a changed-surface test result, an exact deployed image
  or source-artifact identity, a public or authenticated runtime proof appropriate to the
  surface, and a retained rollback path.
- Normal-browser, desktop-Googlebot, and mobile-Googlebot checks are synthetic request
  profiles; they MUST NOT be described as proof of real Google crawling or indexing.
- Public API health, HTTP 200, fresh timestamps, SSR, schema, or a deployed image MUST NOT
  be presented alone as proof of ranking, traffic, engagement, citation, or business value.
- Critical browser journeys MUST include route-history assertions where navigation is part of
  the contract. For scorecard-to-player flows, proof MUST cover the immediate loading shell,
  canonical player route, populated/error boundary, and return to the originating scorecard.

Test-Driven Development (TDD):
- TDD is ENCOURAGED but not mandated for all features
- Critical features (authentication, payment, data integrity) MUST use TDD
- Write tests first for bug fixes (reproduce bug, then fix)

Rationale: Tests prevent regressions, document expected behavior, enable confident
refactoring, and reduce manual QA burden. High-stakes features (user data, live scores)
require higher test confidence.

### V. Performance and Snapshot-First Delivery Standards

**Live cricket updates must feel instantaneous to users.** Perceived performance is as
important as actual performance.

Frontend Performance:
- Initial page load: <3 seconds (First Contentful Paint)
- Verified canonical snapshot HTML MUST be sent before optional commentary, scorecard,
  model, or retained-entity fan-out can delay the first useful document.
- Provider-backed secondary pages MUST paint stable identity and truthful loading state before
  secondary data arrives. Provider latency MUST be measured separately from route-transition
  latency and MUST NOT be hidden with a legacy modal or fabricated data.
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
- Measure cold and warm SSR separately, including TTFB, cache headers, payload size, and
  fallback level. Warm-cache performance MUST NOT conceal a cold-path regression.

Rationale: Live sports require real-time performance. Users expect instant updates. Slow
performance leads to user frustration and churn. Performance is a feature.

### VI. Frontend UI/UX Standards (ENFORCED)

**User interfaces MUST be accessible, performant, and consistent across all devices.**
Design decisions prioritize user experience over developer convenience.

Information Hierarchy (NON-NEGOTIABLE):
- **Above-the-Fold Discipline**: The first viewport MUST prioritize the user's primary task.
  On live-match and hub pages, this means score, status, teams, venue, toss, and the most
  decision-relevant state belong in the hero or immediate primary surface.
- **Hero Ownership**: Facts already present in the hero MUST NOT be repeated in a second
  summary block above the fold. Supporting modules may deepen context, but they cannot
  restate the same score, toss, venue, start time, or status as a duplicate card.
- **At-a-Glance Rule**: "At a glance" modules are allowed only when they compress missing
  context or improve scanability. If the same information already exists clearly in the
  hero, the module MUST be removed, moved lower, or rewritten to add distinct value.
- **Progressive Disclosure for Secondary SEO Blocks**: Supporting content such as key
  moments, related hubs, freshness support pages, or additional match-navigation clusters
  SHOULD remain crawlable, but MUST be placed below the core above-the-fold experience or
  behind an intentional expand/collapse interaction when not primary.
- **No SEO-Led Hero Degradation**: SEO copy, internal-link clusters, schema-support
  modules, and discovery aids MUST NOT displace live utility, readability, or hero clarity.
- **Truthful AEO Content**: An indexable answer block MUST contain only populated,
  source-backed lifecycle facts. Loading, error, stale, placeholder, and unsupported
  probability copy MUST NOT be emitted as indexable answer content.
- **Canonical Navigation Continuity**: A temporary provider-resolution route MUST be replaced
  when canonical identity is known. It MUST NOT trap browser history. Canonical player pages
  MUST preserve a sanitized local return path to the originating match surface, and visible
  Back behavior MUST be tested alongside native browser Back.
- **One Primary Story Per Screen**: Each screen must have a clear first job. Homepage,
  `/matches`, live hubs, and canonical match pages may support SEO, but the first visual
  contract MUST remain obvious to a human user within one quick scan.

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
  - ✅ Above-the-fold content serves the primary user task first
  - ✅ Hero facts are not duplicated by nearby support modules
  - ✅ "At a glance" content adds new value instead of restating hero data
  - ✅ Secondary SEO/support content is lower on the page or progressively disclosed
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
- **Hero-First Match Layouts**: For homepage cards, `/matches`, live hubs, and
  `/cric-live/*`, the hero or lead card should own score, status, and essential metadata.
  Secondary summaries must be judged against the "does this say anything new?" test.
- **Expandable Secondary Context**: Use buttons, accordions, or tabs for optional blocks
  such as key moments in commentary when they aid users but would otherwise crowd the main
  viewport. Hidden content should remain accessible and indexable where needed.
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
reduces onboarding time for new developers from days to hours. Explicit hierarchy rules
also prevent SEO work from silently breaking the live-product reading order.

Lessons Learned (Feature 001 - Modern UI Redesign):
- CSS custom properties cut theme switching time from seconds to milliseconds
- Utility classes reduced CSS file size by 45% and development time by 30%
- Component checklist prevented accessibility bugs before code review
- Design system documentation (712 lines) became single source of truth
- Carousel pattern improved desktop UX scores by 23% in user testing
- Mobile-first approach caught layout bugs early (saves regression fixes)
- Debounced theme toggle prevented 87% of reported "flashing" issues
- FPS monitoring caught animation issues on low-end devices before production

### VII. Canonical Lifecycle and SEO/AEO Truth (NON-NEGOTIABLE)

**Each match intent MUST have one canonical owner, one authoritative lifecycle, and one
evidence-backed indexability decision.** Sitemaps, hubs, APIs, SSR, hydration, schema, and
navigation MUST agree on the same lifecycle contract.

Requirements:
- Canonical match ownership MUST remain on `/cric-live/{slug}`; supporting intelligence,
  share, and embed routes MUST NOT compete as indexable duplicates.
- Indexable upcoming pages MUST have a real future schedule; live-like pages MUST have
  authoritative live or multi-day evidence; completed pages MUST have terminal result or
  retained-result evidence. Stored metadata alone MUST NOT create indexable lifecycle truth.
- Limited-overs `Innings Break` MUST NOT be treated as multi-day retention evidence. Valid
  Test, first-class, or explicit multi-day `Stumps` states MAY remain live-like while their
  lifecycle window remains open.
- Provider `Multi Day`/`multi-day` labels, `Stumps`, and lead summaries MUST be interpreted
  through the format-specific lifecycle contract; a multi-day match MUST NOT be completed by
  a limited-overs retention rule.
- Deterministic priority sitemap cohorts MUST contain each canonical URL exactly once across
  sitemap children. IndexNow or search-engine submission receipts MUST be recorded as
  notifications, not represented as proof of crawling or indexing.
- Hubs, sitemap projections, catalogue rows, canonical resolution, and match-info lookup
  MUST reject placeholders, stale upcoming rows, deleted-row re-inference, and duplicate
  primary/discovery anchors.
- SSR and hydration MUST preserve the authoritative transferred snapshot. Empty or null
  refresh responses MUST NOT erase verified state or replace it with a default shell.
- AEO, JSON-LD, visible facts, and browser-hydrated facts MUST agree. A stale point-in-time
  canary MUST be marked historical when a later audit contradicts it.

Rationale: Search engines and users both experience the combined catalogue, document,
hydrated UI, and links. A correct individual endpoint cannot compensate for contradictory
public surfaces.

### VIII. Evidence-Gated Public Product and Growth

**Public prediction, history, creator distribution, and growth claims MUST earn trust from
reproducible data and useful user outcomes.** Technical delivery is a prerequisite, not
the outcome itself.

Requirements:
- Public prediction results MUST be useful before consent-based follow, alert, email, or
  contact capture is requested.
- Public history MUST use write-once records that begin with a non-terminal forecast and
  end with verified outcome evidence. Terminal-clamped forecasts MUST NOT be treated as
  original predictions.
- The history surface MUST remain `collecting` until at least 30 eligible matches are
  reviewed for duplicate URLs, identity reversal, abandoned/tied outcomes, stale sidecars,
  and terminal-clamp leakage. A small sample MUST NOT support a general accuracy claim.
- Creator packs MUST bind match identity, canonical URL, source timestamp, probability,
  caveat, attribution, rendered assets, and a reproducible manifest. Fixed historical
  samples MUST use immutable archive/share IDs before outreach.
- Outreach MUST use relevant, personalized, evidence-backed destinations. Bulk directories,
  link dumping, fabricated contacts, guaranteed-win claims, betting advice, and unsupported
  probabilities are prohibited.
- Success MUST be measured separately for discovery, utility completion, owned relationship,
  distribution, original evidence, repeat use, and business outcomes.

Rationale: CrickZen's defensible advantage is useful, explainable, repeatable intelligence,
not a raw backlink count, a three-match metric, or a technical SEO score.

### IX. Safe Rollouts and Durable Continuity

**A CrickZen change is complete only when its implementation, runtime boundary, rollback,
and durable documentation agree.** The project must preserve user data, unrelated work,
and historical truth while moving quickly.

Requirements:
- Dirty worktrees and production checkouts MUST NOT be used as implicit build sources for
  narrow rollouts. Use an isolated clean snapshot with explicit overlays and preserve
  unrelated changes.
- Production changes MUST be narrow, ordered, health-checked, and accompanied by a named
  rollback image, source copy, or configuration backup. Persistent storage MUST be preserved.
- Completion claims MUST cite the exact runtime, public endpoint, authenticated surface, or
  immutable artifact that proves the claim. Source edits and health checks alone are not
  completion proof.
- Historical checkpoint evidence MUST be separated from current runtime proof. When a later
  audit contradicts an earlier claim, record the contradiction and current resolution;
  never silently overwrite the historical record.
- Every durable CrickZen decision, checkpoint, contradiction, and verified rollout MUST be
  represented in the Agentic OS wiki and linked from its navigation/cache. The wiki MUST
  include the current constitution version and its synchronization date.
- Every production service image used in a rollout MUST be recorded with service, tag,
  immutable digest, deployment date, and named rollback/preserved image where available.
- A host-level scraper watchdog MUST check the container and each managed match at least
  once per minute, restart only within a bounded cooldown policy, and emit an admin-visible
  critical signal after repeated failures or unresolved staleness. A healthy container alone
  is not proof that every selected match is fresh.
- Every new or amended Spec Kit artifact MUST consult the repository constitution and the
  wiki constitution mirror before implementation or diagnosis.

Rationale: Continuity is an operational control. Without exact evidence, rollback, and
shared memory, later agents can repeat resolved incidents or trust superseded claims.

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

**Constitution Authority**: This constitution is the normative repository source for
CrickZen development practices. The Agentic OS wiki page `[[CrickZen Constitution]]` is
the durable continuity mirror for rationale, current checkpoints, contradictions, and
operating memory. When the two disagree, verify the repository and runtime evidence,
then reconcile both records; do not silently choose the convenient version.

**Amendment Process**:
1. Propose amendment via pull request to `.specify/memory/constitution.md`
2. Include rationale and impact analysis (what breaks, what improves)
3. Require team consensus (majority vote, quorum of 50%+1)
4. Document version bump reasoning (MAJOR/MINOR/PATCH)
5. Update dependent templates and docs in same PR
6. Update `wiki/meta/CrickZen Constitution.md`, `wiki/index.md`, `wiki/log.md`, and
   `wiki/hot.md` in the same change using the wiki lock/save workflow
7. Update `AGENTS.md` or Spec Kit prompts when the enforcement workflow changes
8. Announce changes in team channel before merge

**Version Semantics** (Semantic Versioning):
- **MAJOR**: Backward-incompatible principle removals or redefinitions (breaking changes)
- **MINOR**: New principles added or materially expanded guidance (additive changes)
- **PATCH**: Clarifications, typo fixes, wording improvements (non-semantic)

**Compliance Verification**:
- All PRs MUST verify constitution compliance during review
- `/speckit.plan` command includes Constitution Check gate (MUST pass)
- Monthly constitution review: Are we following it? Is it still relevant?
- Violations documented in PR review with reference to specific principle
- Every CrickZen work session MUST confirm the repository constitution version and the
  wiki mirror version/date before implementation, diagnosis, review, or rollout.
- Any durable decision, checkpoint, contradiction, or verified rollout MUST link the
  applicable constitution principle and update the wiki navigation/cache.

**Living Document**: This constitution is expected to evolve. Challenge principles that
no longer serve the project. Update principles that block productivity without improving
quality. Archive obsolete sections rather than deleting (preserve history).

**Reference During Development**:
- Use `/speckit.constitution` command to view or update this document
- Consult constitution before major architectural decisions
- Link to specific principles in PR discussions when relevant
- Consult `wiki/meta/CrickZen Constitution.md` for durable rationale and current operating
  context; keep it synchronized whenever this file changes

**Version**: 1.4.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2026-09-02

**Amendment History**:
- v1.4.0 (2026-09-02): Added bounded sticky live-slate and per-match watchdog rules,
  scoped provider identity, canonical scorecard-to-player navigation, first-render latency
  evidence, priority sitemap/IndexNow boundaries, and production image inventory requirements
- v1.3.0 (2026-08-27): Added source-backed lifecycle truth, canonical/AEO rules, cross-boundary
  evidence gates, public prediction trust rules, safe rollout requirements, and wiki continuity
- v1.2.0 (2026-06-30): Expanded Principle VI with above-the-fold discipline, hero ownership, and progressive disclosure rules for secondary SEO/support blocks
- v1.1.0 (2025-11-07): Added Principle VI - Frontend UI/UX Standards based on Feature 001 learnings
- v1.0.0 (2025-11-06): Initial constitution ratification with 5 core principles
