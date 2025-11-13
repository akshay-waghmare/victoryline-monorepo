# Implementation Plan: Mobile-First UI/UX Redesign

**Branch**: `004-mobile-ui-redesign` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-mobile-ui-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Redesign VictoryLine's home page and match details page for mobile devices (320px-428px) with touch-optimized interactions, responsive layouts, and cricket.com-inspired UX patterns. Must maintain existing WebSocket-based live updates, work with current backend APIs (no API changes), and support anonymous users. Implementation will audit existing Angular frontend codebase first, then establish reusable mobile-first component patterns using CSS custom properties, utility classes, and 8px grid system. Primary goals: <3s page load on 3G, 44x44px touch targets, smooth 60fps animations, and Lighthouse mobile score >80.

## Technical Context

**Language/Version**: TypeScript 4.9+ (Angular 7 currently, upgrade path TBD), HTML5, CSS3  
**Primary Dependencies**: Angular (CLI ~6.x/7.x), RxJS, Bootstrap (TBD - to be confirmed during audit), CSS Grid, Flexbox, CSS Custom Properties  
**Storage**: Backend MySQL + Redis cache (no frontend changes), WebSocket connection state in memory  
**Testing**: Angular testing framework (`ng test`), Karma + Jasmine, E2E with Protractor (or migration TBD), Lighthouse CI for performance audits  
**Target Platform**: Mobile web browsers (iOS Safari 13+, Chrome 90+, Samsung Internet 14+), viewport widths 320px-428px (primary), 768px+ (secondary)  
**Project Type**: Web application - Frontend-only changes (Angular SPA), Backend + Scraper unchanged  
**Performance Goals**: Initial load <3s on 3G (750kbps), 60fps animations, Lighthouse mobile score >80, LCP <2.5s, FID <100ms, CLS <0.1  
**Constraints**: 
- Performance budgets: Home page <1.5MB, Match details <2MB initial load
- No backend API changes allowed (must work with existing endpoints)
- WebSocket reconnection logic unchanged (UI displays connection status only)
- Must maintain desktop experience quality (responsive design, not mobile-only)
- WCAG 2.1 Level AA basic compliance (touch targets, text size, color contrast)
- English-only content (no i18n in this iteration)

**Scale/Scope**: 
- 2 pages: Home page + Match details page
- 6 user stories (3 P1, 2 P2, 1 P3)
- 30 functional requirements
- 15 success criteria
- Mobile users represent 60-70% of traffic
- Target devices: iPhone SE (320px), standard phones (375px-428px), tablets (768px+)

**Current State (NEEDS AUDIT)**:
- Existing component library/design system status: NEEDS CLARIFICATION
- Current responsive breakpoints: NEEDS CLARIFICATION  
- Existing utility classes/CSS framework: NEEDS CLARIFICATION
- Current bundle sizes: NEEDS CLARIFICATION
- Existing accessibility compliance level: NEEDS CLARIFICATION
- Current Lighthouse mobile scores: NEEDS CLARIFICATION

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Real-Time Data Accuracy ✅ PASS

**Assessment**: No impact on real-time data accuracy. Mobile UI redesign maintains existing WebSocket-based live updates without modification. Frontend will continue displaying match data with same 5-second accuracy requirement.

**Compliance**:
- ✅ WebSocket connection status indicator added (FR-023A) - improves transparency
- ✅ No changes to scraper polling interval or backend validation
- ✅ Loading states required (FR-018) - prevents stale data confusion
- ✅ Existing timestamp handling unchanged

**Risk**: None. Mobile UI is presentation layer only.

---

### II. Monorepo Architecture Standards ✅ PASS

**Assessment**: Frontend-only changes. No cross-service boundary violations. Backend and Scraper services unchanged.

**Compliance**:
- ✅ Changes isolated to `apps/frontend/` directory
- ✅ Communicates with Backend API only (existing REST endpoints)
- ✅ No direct database access
- ✅ No changes to API contracts

**Risk**: None. Maintains service independence.

---

### III. REST API Design Standards ✅ PASS

**Assessment**: No API changes. Consuming existing Backend REST APIs unchanged.

**Compliance**:
- ✅ Mobile UI uses existing endpoints (no new endpoints required)
- ✅ JWT authentication handling unchanged
- ✅ Existing response format (JSON with success/data/error/timestamp) maintained
- ✅ WebSocket endpoint usage unchanged

**Risk**: None. API contracts unmodified.

---

### IV. Testing Requirements ⚠️ PARTIAL COMPLIANCE (TO BE ADDRESSED IN PHASE 1)

**Assessment**: Testing requirements apply to Angular frontend. Current test coverage unknown (requires audit).

**Required**:
- ✅ Unit tests: >70% coverage target for new/modified components
- ✅ Component tests: Responsive behavior at breakpoints (320px, 375px, 768px, 1024px)
- ✅ Service tests: Mock WebSocket connections, API calls
- ✅ E2E tests: Critical mobile flows (home page navigation, match details viewing)
- ✅ Accessibility tests: Touch target sizes, keyboard navigation, screen reader support

**Action Required (Phase 1)**:
1. Audit existing test coverage (`ng test --code-coverage`)
2. Identify test gaps for mobile-specific features
3. Set up mobile viewport testing in test suites
4. Add Lighthouse CI to PR pipeline for performance gates

**Risk**: Medium. Test infrastructure must support mobile testing (viewport simulation, touch events).

---

### V. Performance Standards for Live Updates ⚠️ COMPLIANCE REQUIRED

**Assessment**: Mobile UI adds performance constraints beyond existing standards. Must verify and optimize.

**Constitution Requirements**:
- Frontend initial load: <3 seconds FCP ✅ (matches spec SC-003)
- Live score updates: <5 seconds ✅ (WebSocket unchanged, already compliant)
- 60fps animations ✅ (FR-010, FR-018, animation monitoring required)
- Mobile-first responsive ✅ (core spec requirement)
- Bundle size: <500KB gzipped ❌ **NEEDS VERIFICATION** (spec says <1.5MB home, <2MB match details - more permissive)

**Discrepancy Identified**:
- Constitution: <500KB gzipped main bundle
- Spec: <1.5MB home page, <2MB match details initial load
- **Resolution**: Use constitution's 500KB as target for main bundle, spec's limits for total page weight including images/data

**Action Required (Phase 0 Research)**:
1. Measure current bundle sizes (`ng build --prod --stats-json`)
2. Measure current Lighthouse mobile scores (baseline)
3. Identify optimization opportunities (lazy loading, code splitting, image optimization)
4. Set up bundle size monitoring in CI

**Risk**: High if current bundles exceed targets. May require significant refactoring (lazy loading modules, image optimization pipeline).

---

### VI. Frontend UI/UX Standards ✅ MOSTLY COMPLIANT (DESIGN SYSTEM AUDIT REQUIRED)

**Assessment**: Spec aligns with constitution's UI/UX standards. Some constitution requirements need verification during audit.

**Constitution Requirements vs. Spec**:

| Constitution Requirement | Spec Compliance | Status |
|--------------------------|-----------------|--------|
| CSS Custom Properties for theming | Not mentioned in spec | ⚠️ NEEDS CLARIFICATION - should mobile use existing theme system? |
| 8px Grid System | Spec uses minimum spacing (FR-021: 8px between elements) | ✅ ALIGNED |
| Typography Scale (rem-based) | Spec: 14px min body, 12px secondary (FR-007) | ✅ ALIGNED |
| Utility Classes | Not mentioned | ⚠️ NEEDS CLARIFICATION - audit existing utilities |
| Mobile-First Responsive | Core spec requirement | ✅ ALIGNED |
| WCAG 2.1 Level AA | Spec: basic compliance (touch, text, contrast) | ✅ ALIGNED |
| Keyboard Navigation | Not explicitly mentioned | ⚠️ NEEDS ADDITION to spec |
| Screen Readers | Not explicitly mentioned | ⚠️ NEEDS ADDITION to spec |
| Reduced Motion | FR-022: respect system settings | ✅ ALIGNED |
| Component Checklist | Not mentioned | ⚠️ NEEDS ADOPTION in workflow |
| Light/Dark Mode | Not mentioned in spec | ⚠️ NEEDS CLARIFICATION - out of scope or existing? |
| 60fps Animations | FR-010, performance goals | ✅ ALIGNED |
| Lazy Loading | FR-013: images lazy load | ✅ ALIGNED |
| Lighthouse >90 mobile | Spec: >80 (SC-009) | ⚠️ CONSTITUTION STRICTER - use >90 target |
| Documentation | Not mentioned | ✅ IMPLICIT (will generate research.md, data-model.md, etc.) |

**Action Required (Phase 0 Research)**:
1. Audit existing design system (CSS custom properties, utility classes, typography)
2. Verify if theme system (light/dark mode) exists and how mobile should handle it
3. Document existing component patterns and identify reusable candidates
4. Add keyboard navigation and screen reader requirements to acceptance criteria
5. Adopt component checklist from constitution for new mobile components
6. Set Lighthouse target to >90 mobile (stricter than spec's >80)

**Risk**: Medium. Design system audit may reveal inconsistencies requiring refactoring beyond mobile pages.

---

## Constitution Check Summary

| Principle | Status | Action Required |
|-----------|--------|-----------------|
| I. Real-Time Data Accuracy | ✅ PASS | None |
| II. Monorepo Architecture | ✅ PASS | None |
| III. REST API Design | ✅ PASS | None |
| IV. Testing Requirements | ⚠️ PARTIAL | Audit test coverage, set up mobile testing, add Lighthouse CI |
| V. Performance Standards | ⚠️ COMPLIANCE REQUIRED | Measure baselines, optimize bundles, set up monitoring |
| VI. Frontend UI/UX Standards | ⚠️ AUDIT REQUIRED | Audit design system, clarify theme/keyboard/screen reader requirements |

**GATE DECISION**: ⚠️ **CONDITIONAL PASS** - Proceed to Phase 0 with mandatory research tasks to resolve all "NEEDS CLARIFICATION" items before Phase 1 design.

**Critical Blockers**: None identified. All concerns addressable through Phase 0 research.

**Post-Phase-1 Re-check**: Must verify component checklist adoption, Lighthouse scores, and test coverage after implementation.

## Project Structure

### Documentation (this feature)

```text
specs/004-mobile-ui-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already complete)
├── clarifications.md    # Clarification Q&A summary (already complete)
├── research.md          # Phase 0 output (/speckit.plan command) - TO BE GENERATED
├── data-model.md        # Phase 1 output (/speckit.plan command) - TO BE GENERATED
├── quickstart.md        # Phase 1 output (/speckit.plan command) - TO BE GENERATED
├── contracts/           # Phase 1 output (/speckit.plan command) - TO BE GENERATED
│   └── component-api.md # Component interfaces and props
├── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
└── checklists/
    └── requirements.md  # Validation checklist (already complete)
```

### Source Code (repository root)

```text
apps/frontend/                          # Angular SPA (mobile UI changes here)
├── src/
│   ├── app/
│   │   ├── components/                 # Shared components
│   │   │   ├── match-card/            # Mobile-optimized match card ⭐ NEW/MODIFIED
│   │   │   ├── sticky-header/         # Match details sticky header ⭐ NEW
│   │   │   ├── connection-status/     # WebSocket status indicator ⭐ NEW
│   │   │   ├── touch-feedback/        # Touch ripple/highlight directive ⭐ NEW
│   │   │   ├── lazy-image/            # Lazy loading image component ⭐ NEW
│   │   │   └── loading-skeleton/      # Skeleton loading states ⭐ NEW
│   │   ├── pages/
│   │   │   ├── home/                  # Home page ⭐ MODIFIED (mobile responsive)
│   │   │   │   ├── home.component.ts
│   │   │   │   ├── home.component.html
│   │   │   │   ├── home.component.css # Mobile-first CSS
│   │   │   │   └── home.component.spec.ts
│   │   │   └── match-details/         # Match details page ⭐ MODIFIED (mobile responsive)
│   │   │       ├── match-details.component.ts
│   │   │       ├── match-details.component.html
│   │   │       ├── match-details.component.css # Mobile-first CSS
│   │   │       ├── match-details.component.spec.ts
│   │   │       └── sections/          # Scorecard, Commentary, Stats tabs
│   │   ├── services/
│   │   │   ├── websocket.service.ts   # Existing WebSocket service (monitoring added)
│   │   │   └── viewport.service.ts    # Viewport detection service ⭐ NEW
│   │   ├── directives/
│   │   │   ├── swipe-gesture.directive.ts    # Swipe gesture handling ⭐ NEW
│   │   │   └── pull-to-refresh.directive.ts  # Pull-to-refresh ⭐ NEW
│   │   └── styles/
│   │       ├── _variables.css         # CSS custom properties ⭐ MODIFIED (mobile tokens)
│   │       ├── _utilities.css         # Utility classes ⭐ MODIFIED (mobile utilities)
│   │       ├── _responsive.css        # Responsive breakpoints ⭐ NEW
│   │       └── _animations.css        # Animation standards ⭐ NEW
│   ├── assets/
│   │   └── images/
│   │       └── placeholders/          # Fallback images ⭐ NEW
│   └── environments/
│       ├── environment.ts             # Dev config
│       └── environment.prod.ts        # Prod config
├── angular.json                       # Angular CLI config ⭐ MODIFIED (Lighthouse CI)
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript config

apps/backend/spring-security-jwt/      # Backend (UNCHANGED)
apps/scraper/crex_scraper_python/      # Scraper (UNCHANGED)

tests/frontend/                         # E2E and integration tests
├── accessibility/
│   └── mobile-wcag.spec.ts            # Mobile accessibility tests ⭐ NEW
├── seo/
│   └── mobile-performance.spec.ts     # Lighthouse mobile tests ⭐ NEW
└── e2e/
    ├── home-mobile.e2e.ts             # Home page mobile E2E ⭐ NEW
    └── match-details-mobile.e2e.ts    # Match details mobile E2E ⭐ NEW
```

**Structure Decision**: 

This is a **web application (Option 2)** with frontend-only changes. The existing monorepo structure separates frontend (Angular), backend (Spring Boot), and scraper (Python Flask). This feature modifies only the `apps/frontend/` directory.

**Key Decisions**:
1. **Component-based approach**: Create reusable mobile components (match-card, sticky-header, touch-feedback) that follow constitution's component checklist
2. **Mobile-first CSS**: Use separate CSS files with mobile-first media queries rather than retrofitting existing desktop CSS
3. **Service layer**: Add `viewport.service.ts` for responsive behavior detection, enhance existing `websocket.service.ts` with connection monitoring
4. **Directives for gestures**: Touch interactions (swipe, pull-to-refresh) implemented as reusable Angular directives
5. **Utility-first styling**: Expand existing utility classes for mobile spacing, typography, and layout patterns
6. **Testing isolation**: Mobile-specific tests in dedicated directories to avoid mixing with desktop test suites

**Rationale**: 
- Maintains monorepo independence (frontend changes don't affect backend/scraper)
- Component reusability supports future design system evolution
- Mobile-first CSS prevents desktop regression (progressive enhancement)
- Service/directive pattern keeps logic DRY and testable
- Clear ⭐ NEW/MODIFIED markers guide implementation scope

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations identified.** This feature is frontend-only with no architectural complexity concerns. All constitution principles either pass or require standard research/audit activities (not violations).

**Notes**:
- Performance standards require verification (not violations) - addressed in Phase 0 research
- Design system audit required (not a violation) - addressed in Phase 0 research  
- Test infrastructure enhancements needed (not violations) - addressed in Phase 1 design

---

## Phase 0: Outline & Research

### Unknowns Extracted from Technical Context

Based on the "NEEDS CLARIFICATION" items in Technical Context and Constitution Check, the following research tasks are required:

#### 1. Frontend Codebase Audit (CRITICAL - Prerequisites for all other research)

**Unknown**: Current state of Angular frontend architecture, design system, and performance baselines.

**Research Questions**:
- What is the current Angular version? (CLI shows ~6.x/7.x, need exact version)
- What CSS framework/component library is in use? (Bootstrap mentioned in constitution, need confirmation)
- Do CSS custom properties exist for theming? If so, what's the current token structure?
- What utility classes exist? Is there a utility-first approach or custom component styles?
- What are current responsive breakpoints? Are mobile viewports already supported?
- What is current bundle size (`ng build --prod --stats-json`)?
- What is current Lighthouse mobile score (Performance, Accessibility, Best Practices, SEO)?
- What is current test coverage (`ng test --code-coverage`)?
- Are there existing mobile-specific components or is everything desktop-first?
- What accessibility features exist (ARIA labels, keyboard nav, focus management)?
- Is there a theme system (light/dark mode)? How is it implemented?

**Research Method**:
1. Inspect `apps/frontend/angular.json` for Angular version and build config
2. Inspect `apps/frontend/package.json` for dependencies (Bootstrap, Angular Material, etc.)
3. Inspect `apps/frontend/src/app/styles/` for design system files
4. Run `ng build --prod --stats-json --source-map` and analyze bundle sizes with webpack-bundle-analyzer
5. Run Lighthouse CI on current home page and match details page (mobile + desktop)
6. Run `ng test --code-coverage` and review coverage report
7. Audit existing components in `apps/frontend/src/app/components/` for reusability patterns
8. Test current site on mobile devices (320px, 375px, 428px viewports) and document UX issues

**Output**: `audit-findings.md` documenting current state (component library, bundle sizes, Lighthouse scores, test coverage, mobile support gaps)

**Timeline**: 4-6 hours (automated tools + manual testing)

---

#### 2. Mobile-First CSS Architecture Research

**Unknown**: Best practices for retrofitting mobile-first CSS into existing Angular application without breaking desktop experience.

**Research Questions**:
- Should we refactor existing CSS to mobile-first or create parallel mobile stylesheets?
- How to structure media queries for progressive enhancement (`min-width` vs `max-width`)?
- Should utility classes be mobile-first (e.g., `p-4` applies to mobile, `md:p-8` for desktop)?
- How to handle CSS custom properties for responsive values (e.g., `--spacing-md` changes at breakpoints)?
- What's the migration path for existing components (gradual vs. big-bang refactor)?
- How to prevent CSS bloat when adding mobile-specific styles?

**Research Method**:
1. Review Tailwind CSS mobile-first approach (industry standard)
2. Review Angular Material responsive utilities and breakpoint system
3. Study cricket.com's responsive CSS patterns (already fetched in clarification phase)
4. Review constitution's 8px grid system and how it applies across breakpoints
5. Prototype sample mobile-first component (match-card) with both approaches (refactor vs parallel)

**Output**: Section in `research.md` titled "Mobile-First CSS Strategy" with decision, rationale, code examples

**Timeline**: 3-4 hours

---

#### 3. Touch Gesture Implementation Patterns

**Unknown**: Best practices for implementing touch gestures (swipe, pull-to-refresh, long-press) in Angular.

**Research Questions**:
- Use HammerJS (Angular's recommended touch library) or custom event handlers?
- How to distinguish between scroll vs. swipe gestures (avoid conflicts)?
- How to provide visual feedback during gestures (ripples, highlights)?
- How to make gestures accessible (keyboard equivalents)?
- How to test touch gestures in unit/E2E tests?

**Research Method**:
1. Review Angular HammerJS integration docs (official Angular guide)
2. Review Material Design touch gesture guidelines (ripple effects, touch feedback)
3. Study cricket.com's swipe implementation (tab navigation, carousels)
4. Review PWA patterns for pull-to-refresh (native-like behavior)
5. Prototype swipe-between-tabs directive with visual feedback

**Output**: Section in `research.md` titled "Touch Gesture Implementation" with decision, rationale, code examples

**Timeline**: 3-4 hours

---

#### 4. Responsive Image Optimization Pipeline

**Unknown**: How to serve appropriately sized images (1x, 2x, 3x) for different mobile devices and pixel densities.

**Research Questions**:
- Should images be optimized at build time or runtime (CDN)?
- Use `<img srcset>` or `<picture>` element for responsive images?
- What image formats to support (WebP, AVIF, fallback JPEG/PNG)?
- How to lazy load images below the fold?
- How to handle image loading failures (placeholders, team initials)?
- What tools to use (Angular Universal for SSR image optimization, sharp for build-time processing)?

**Research Method**:
1. Review Angular lazy loading image directive (official Angular 15+ feature)
2. Review responsive image best practices (web.dev, MDN)
3. Study cricket.com's image optimization (team logos, player photos)
4. Evaluate image optimization tools (sharp, imagemin, Cloudinary)
5. Prototype lazy-image component with srcset, WebP support, and placeholders

**Output**: Section in `research.md` titled "Responsive Image Strategy" with decision, rationale, code examples

**Timeline**: 3-4 hours

---

#### 5. WebSocket Connection Monitoring UI

**Unknown**: How to implement non-intrusive connection status indicator for mobile.

**Research Questions**:
- Where to display status indicator (toast, banner, inline badge)?
- How often to check connection status (heartbeat interval)?
- What visual states to show (connected/green, reconnecting/yellow, disconnected/red)?
- How to handle reconnection attempts (show progress, retry count)?
- Should status be dismissible or always visible during disconnection?

**Research Method**:
1. Review Material Design snackbar/toast patterns
2. Study cricket.com's connection status handling (if visible)
3. Review PWA offline detection patterns
4. Prototype connection-status component with 3 states + auto-hide on reconnect

**Output**: Section in `research.md` titled "WebSocket Status Indicator Design" with decision, rationale, mockup

**Timeline**: 2-3 hours

---

#### 6. Performance Optimization Techniques

**Unknown**: Specific techniques to achieve <3s load on 3G, <500KB main bundle, and Lighthouse >90.

**Research Questions**:
- What lazy loading strategies to use (route-based, component-based, image-based)?
- How to implement code splitting in Angular (loadChildren, dynamic imports)?
- What are quick wins for bundle size reduction (tree-shaking, unused code removal)?
- How to optimize critical rendering path (preload fonts, inline critical CSS)?
- How to measure and monitor performance in CI (Lighthouse CI, bundle size checks)?
- What caching strategies to use (service worker, HTTP caching, localStorage)?

**Research Method**:
1. Run Lighthouse audit on current site and identify specific bottlenecks
2. Analyze webpack bundle with webpack-bundle-analyzer (find large dependencies)
3. Review Angular performance best practices (official Angular guide)
4. Study cricket.com's performance techniques (view source, DevTools Performance tab)
5. Set up Lighthouse CI in GitHub Actions (or similar)
6. Prototype code-splitting for match details page sections (lazy load scorecard, commentary, stats tabs)

**Output**: Section in `research.md` titled "Performance Optimization Plan" with prioritized techniques, expected impact, implementation steps

**Timeline**: 4-5 hours

---

#### 7. Mobile Testing Strategy

**Unknown**: How to set up comprehensive mobile testing (unit, integration, E2E, accessibility, performance).

**Research Questions**:
- How to simulate mobile viewports in Karma/Jasmine unit tests?
- How to test touch events in Angular component tests?
- What E2E framework to use for mobile (Protractor deprecated, migrate to Cypress/Playwright)?
- How to run accessibility audits in CI (axe-core integration)?
- How to automate Lighthouse mobile tests in PR checks?
- Should we test on real devices (BrowserStack/Sauce Labs) or simulators sufficient?

**Research Method**:
1. Review Angular testing guide for responsive component testing
2. Research Protractor alternatives (Cypress, Playwright, Puppeteer)
3. Evaluate accessibility testing tools (axe-core, Pa11y, Lighthouse)
4. Set up example mobile E2E test with viewport emulation
5. Configure Lighthouse CI to fail PR if score drops below threshold

**Output**: Section in `research.md` titled "Mobile Testing Infrastructure" with testing pyramid, tool decisions, CI integration plan

**Timeline**: 3-4 hours

---

#### 8. Component Reusability & Design System Foundation

**Unknown**: How to design mobile components for maximum reusability and future design system evolution.

**Research Questions**:
- What component API patterns ensure reusability (props, events, slots)?
- How to document components for future developers (Storybook, inline docs)?
- How to enforce component checklist from constitution (linting, PR templates)?
- Should components be in shared library or inline in app?
- How to version components if they become a design system later?

**Research Method**:
1. Review constitution's component checklist (VI. Frontend UI/UX Standards)
2. Study Angular component best practices (Input/Output decorators, lifecycle hooks)
3. Evaluate component documentation tools (Compodoc, Storybook for Angular)
4. Review cricket.com's component patterns (reusable match cards, status indicators)
5. Design sample reusable match-card component with full documentation

**Output**: Section in `research.md` titled "Component Design Patterns" with API guidelines, documentation template, checklist enforcement strategy

**Timeline**: 3-4 hours

---

### Research Task Summary

| Task | Priority | Timeline | Blocker For |
|------|----------|----------|-------------|
| 1. Frontend Codebase Audit | P0 (CRITICAL) | 4-6 hours | All other tasks - provides baseline |
| 2. Mobile-First CSS Architecture | P1 | 3-4 hours | Phase 1 design (CSS strategy) |
| 3. Touch Gesture Implementation | P1 | 3-4 hours | Phase 1 design (directives) |
| 4. Responsive Image Optimization | P1 | 3-4 hours | Phase 1 design (image component) |
| 5. WebSocket Status Indicator | P2 | 2-3 hours | Phase 1 design (status component) |
| 6. Performance Optimization | P1 | 4-5 hours | Phase 1 design (bundle strategy) |
| 7. Mobile Testing Strategy | P1 | 3-4 hours | Phase 1 design (test infrastructure) |
| 8. Component Reusability | P2 | 3-4 hours | Phase 1 design (component APIs) |

**Total Research Time**: 25-35 hours

**Parallelization Opportunities**:
- Tasks 2-4 can run in parallel after Task 1 completes (independent concerns)
- Tasks 5-8 can run in parallel after Task 1 completes (independent concerns)

**Critical Path**: Task 1 (audit) → Task 6 (performance) → Phase 1 design decisions

---

### Research Execution Plan

**Step 1**: Execute Task 1 (Frontend Codebase Audit) - this unblocks all other research
**Step 2**: Execute Tasks 2-8 in parallel (or priority order: 6, 2, 3, 7, 4, 5, 8)
**Step 3**: Consolidate findings into `research.md` with decisions and rationales
**Step 4**: Proceed to Phase 1 (Design & Contracts) with all unknowns resolved

---

## Phase 0 Output: research.md

✅ **COMPLETE** - See `research.md` for full research findings

### Research Summary

All 8 research tasks completed:

1. **Frontend Codebase Audit** ✅
   - Angular 7.2.16, Bootstrap 4.1.3, Angular Material 7.0.3
   - CSS custom properties present (colors, typography)
   - HammerJS already installed (touch gestures ready)
   - Theme system exists (light/dark mode toggle component)
   - Hybrid Bootstrap + Material approach (acceptable, monitor bundle size)

2. **Mobile-First CSS Strategy** ✅
   - **Decision**: Progressive Enhancement Hybrid
   - Add 8px grid spacing tokens to existing CSS custom properties
   - Write new components mobile-first, enhance existing components additively
   - Use `min-width` media queries for progressive enhancement

3. **Touch Gesture Implementation** ✅
   - **Decision**: HammerJS 2.0.8 (already installed)
   - Create reusable directives: SwipeGesture, PullToRefresh, TouchFeedback
   - Use Material Design ripple effects (matRipple directive)
   - 30px swipe threshold to prevent scroll conflicts

4. **Responsive Image Strategy** ✅
   - **Decision**: Native HTML `srcset` + lazy loading
   - LazyImageComponent with fallback text (team abbreviations)
   - Build-time image optimization with `sharp` (generate 1x, 2x, 3x)
   - WebP with PNG fallback

5. **WebSocket Status Indicator** ✅
   - **Decision**: Material Design snackbar (non-intrusive)
   - 3 states: connected (hidden), reconnecting (yellow), disconnected (red)
   - Positioned above bottom navigation on mobile
   - Accessible with ARIA live regions

6. **Performance Optimization** ✅
   - **Priority 1**: Lazy load routes with `loadChildren` (30-40% bundle reduction)
   - **Priority 2**: Image lazy loading (20-30% faster initial load)
   - **Priority 3**: Tree-shake Bootstrap & Material (15-20% bundle reduction)
   - Add performance budgets to `angular.json` (500KB main bundle limit)
   - Set up Lighthouse CI in GitHub Actions

7. **Mobile Testing Strategy** ✅
   - **Decision**: Migrate from Protractor to Cypress for E2E
   - Unit tests with mobile viewport simulation (ChromeMobile in Karma)
   - axe-core integration for accessibility testing
   - Lighthouse CI for performance gates

8. **Component Reusability** ✅
   - Follow Angular Input/Output pattern with TypeScript interfaces
   - Use JSDoc for component documentation with usage examples
   - Enforce component checklist (from Constitution VI) via PR template
   - OnPush change detection for performance

---

## Phase 1: Design & Contracts

✅ **COMPLETE** - All design artifacts generated

### Artifacts Created

1. **data-model.md** ✅
   - 10 component data models (MatchCard, StickyHeader, ConnectionStatus, LazyImage, etc.)
   - Page-level state models (HomePageState, MatchDetailsPageState)
   - API contracts (existing endpoints, no changes required)
   - Validation rules and state transitions
   - Component relationship diagrams

2. **contracts/component-api.md** ✅
   - Complete TypeScript interfaces for all 9 components/directives
   - Usage examples with HTML and TypeScript
   - Integration patterns (responsive components, gesture-enabled tabs, connection-aware)
   - Testing contracts (unit test examples, E2E examples)
   - Accessibility requirements

3. **quickstart.md** ✅
   - Development environment setup (Node 14.21.3, Angular CLI 6.2.3)
   - Mobile development workflow (DevTools, viewport emulation)
   - Testing guide (unit, E2E, accessibility, performance)
   - Component development checklist (from Constitution)
   - Git workflow and commit message format
   - Troubleshooting common issues
   - VS Code setup and recommended extensions

4. **Agent Context Update** ✅
   - Updated `.github/copilot-instructions.md` with new technologies:
     - TypeScript 4.9+, Angular 7, Bootstrap 4, Angular Material 7
     - HammerJS, CSS Grid, Flexbox, CSS Custom Properties
     - WebSocket connection state management
   - Preserved manual additions between markers

---

## Phase 1 Constitution Re-Check

**Re-evaluating after Phase 1 design completion:**

| Principle | Initial Status | Post-Phase-1 Status | Notes |
|-----------|----------------|---------------------|-------|
| I. Real-Time Data Accuracy | ✅ PASS | ✅ PASS | No changes, maintains WebSocket updates |
| II. Monorepo Architecture | ✅ PASS | ✅ PASS | Frontend-only, service boundaries respected |
| III. REST API Design | ✅ PASS | ✅ PASS | No API changes |
| IV. Testing Requirements | ⚠️ PARTIAL | ✅ RESOLVED | Mobile testing strategy defined, Cypress migration planned, axe-core integration specified |
| V. Performance Standards | ⚠️ COMPLIANCE REQUIRED | ✅ RESOLVED | Performance optimization plan complete (lazy loading, tree-shaking, budgets), Lighthouse CI setup defined |
| VI. Frontend UI/UX Standards | ⚠️ AUDIT REQUIRED | ✅ RESOLVED | Design system audit complete, CSS custom properties strategy defined, component checklist enforcement planned, Lighthouse target >90 adopted |

**GATE DECISION**: ✅ **PASS** - All constitution concerns resolved. Ready for Phase 2 (Tasks).

---

## Next Steps: Phase 2 (Tasks Generation)

**Command**: Run `/speckit.tasks` or `.\.specify\scripts\powershell\generate-tasks.ps1`

This will:
1. Break down implementation into atomic tasks
2. Assign priorities based on P1/P2/P3 user stories
3. Create task dependencies and sequencing
4. Generate `tasks.md` with checklist format

**Not Included in This Plan**: Phase 2 is separate command execution. This plan ends after Phase 1 completion.

---

## Plan Complete ✅

**Summary**:
- **Phase 0 Research**: 8/8 tasks complete, all unknowns resolved
- **Phase 1 Design**: 4/4 artifacts generated (data-model.md, contracts/, quickstart.md, agent context)
- **Constitution Compliance**: All 6 principles passing
- **Ready for**: Phase 2 task generation (`/speckit.tasks`)

**Branch**: `004-mobile-ui-redesign`  
**Implementation Plan**: `D:\victoryline\victoryline-monorepo\specs\004-mobile-ui-redesign\plan.md`  
**Generated Artifacts**:
- `research.md` (8 research decisions documented)
- `data-model.md` (10 components, state models, API contracts)
- `contracts/component-api.md` (9 component TypeScript interfaces with examples)
- `quickstart.md` (developer setup and workflow guide)
- `.github/copilot-instructions.md` (updated with mobile technologies)

**Estimated Implementation Effort**: 4-6 weeks (based on 6 user stories, 30 FRs, testing requirements)

**Key Technologies Added**:
- Angular 7.2.16 + TypeScript 3.2.4
- HammerJS 2.0.8 (touch gestures)
- Bootstrap 4.1.3 + Angular Material 7.0.3
- CSS Custom Properties + 8px Grid System
- Cypress (E2E testing)
- Lighthouse CI (performance monitoring)
