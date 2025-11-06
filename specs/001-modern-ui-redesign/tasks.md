# Tasks: Modern UI Redesign

**Input**: Design documents from `specs/001-modern-ui-redesign/`  
**Generated**: 2025-11-06  
**Branch**: `001-modern-ui-redesign`

**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/, ✅ quickstart.md

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are excluded. Focus is on implementation and manual verification via browser testing and Lighthouse CI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, design system foundation, and configuration

- [X] T001 Install Angular Material 15+ and configure in apps/frontend/angular.json
- [X] T002 [P] Install Chart.js 4.x and ng2-charts wrapper in apps/frontend/package.json
- [X] T003 [P] Create design system structure in apps/frontend/src/app/core/design-system/
- [X] T004 [P] Create global SCSS variables file apps/frontend/src/styles/_variables.scss with design tokens from quickstart.md
- [X] T005 [P] Create utility classes file apps/frontend/src/styles/_utilities.scss (spacing, typography, colors)
- [X] T006 [P] Create animations keyframes file apps/frontend/src/styles/_animations.scss (pulse, shimmer, fade)
- [X] T007 [P] Create responsive mixins file apps/frontend/src/styles/_mixins.scss (mobile, tablet, desktop breakpoints)
- [X] T008 Update apps/frontend/src/styles.scss to import design system files
- [X] T009 [P] Configure Angular animations module in apps/frontend/src/app/app.module.ts
- [X] T010 [P] Create shared animations definitions file apps/frontend/src/app/core/animations/app-animations.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Create ThemeService in apps/frontend/src/app/core/services/theme.service.ts (per theme-service.contract.md)
- [X] T012 Implement theme configuration objects (LIGHT_THEME, DARK_THEME) in theme.service.ts
- [X] T013 Implement theme detection and initialization logic (system preference, localStorage) in theme.service.ts
- [X] T014 Implement CSS Custom Properties injection in theme.service.ts (applyCSSVariables method)
- [X] T015 Implement theme toggle and setTheme methods in theme.service.ts
- [X] T016 Create AnimationService in apps/frontend/src/app/core/services/animation.service.ts
- [X] T017 Implement animation state tracking (currently animating elements, FPS monitoring) in animation.service.ts
- [X] T018 Implement prefers-reduced-motion detection in animation.service.ts
- [X] T019 Create light theme SCSS file apps/frontend/src/app/core/themes/light-theme.scss
- [X] T020 [P] Create dark theme SCSS file apps/frontend/src/app/core/themes/dark-theme.scss
- [X] T021 [P] Create shared theme utilities apps/frontend/src/app/core/themes/theme-core.scss
- [X] T022 Create TypeScript interfaces file apps/frontend/src/app/core/models/theme.models.ts (ThemeConfig, ThemeColors, etc. from data-model.md)
- [X] T023 [P] Create animation models file apps/frontend/src/app/core/models/animation.models.ts (AnimationState, ScoreUpdateAnimation from data-model.md)
- [X] T024 Add theme toggle button component apps/frontend/src/app/shared/components/theme-toggle/theme-toggle.component.ts
- [X] T025 Wire ThemeService to root app component apps/frontend/src/app/app.component.ts (initialize on startup)
- [X] T026 Update document.html to include data-theme attribute binding

**Checkpoint**: Foundation ready - theme system functional, animation infrastructure in place

---

## Phase 3: User Story 1 - Live Match Experience Enhancement (Priority: P1) 🎯 MVP

**Goal**: Modern match cards with animations, color schemes, and real-time update indicators

**Independent Test**: Open homepage with live matches, verify new card design renders with team logos, scores, status badges, vibrant colors. Verify score update animations trigger on data refresh. Check skeleton loaders appear during initial load.

### Implementation for User Story 1

- [X] T027 [P] [US1] Create MatchCardViewModel interface in apps/frontend/src/app/features/matches/models/match-card.models.ts (from data-model.md)
- [X] T028 [P] [US1] Create match status enum and helper functions in apps/frontend/src/app/features/matches/models/match-status.ts
- [X] T029 [US1] Create MatchCardComponent in apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts (per match-card.contract.md)
- [X] T030 [US1] Implement MatchCardComponent template in match-card.component.html with Material Design structure from contract
- [X] T031 [US1] Implement MatchCardComponent styles in match-card.component.scss using design tokens from quickstart.md
- [X] T032 [US1] Add status badge with color coding (green=live, blue=upcoming, gray=completed) in match-card.component
- [X] T033 [US1] Implement score update animation trigger (@scoreUpdate animation) in match-card.component.ts
- [X] T034 [US1] Implement live indicator pulse animation (@pulse animation) in match-card.component.ts
- [X] T035 [US1] Add hover elevation effect with box-shadow transition in match-card.component.scss
- [X] T036 [US1] Implement IntersectionObserver for lazy loading in match-card.component.ts
- [X] T037 [US1] Add staleness warning display (>30s warning, >120s error) in match-card.component.html
- [X] T038 [P] [US1] Create SkeletonCardComponent in apps/frontend/src/app/shared/components/skeleton-card/skeleton-card.component.ts
- [X] T039 [P] [US1] Implement skeleton shimmer animation in skeleton-card.component.scss
- [ ] T040 [US1] Update matches list page apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts to use MatchCardComponent
- [ ] T041 [US1] Update homepage apps/frontend/src/app/features/home/pages/home/home.component.ts to display match cards with sections
- [ ] T042 [US1] Implement data transformation logic (API response → MatchCardViewModel) in matches.service.ts
- [X] T043 [US1] Add color coding utility functions for match status in apps/frontend/src/app/core/utils/match-utils.ts
- [ ] T044 [US1] Verify WCAG AA contrast ratios for all text on match cards in both themes

**Checkpoint**: User Story 1 complete - modern match cards with animations functional

---

## Phase 4: User Story 2 - Dark/Light Theme Support (Priority: P1)

**Goal**: User-selectable dark/light themes with system preference detection and persistence

**Independent Test**: Toggle theme button in navbar, verify entire UI (navbar, cards, backgrounds, text) transitions smoothly. Close and reopen browser, verify theme persists. Check system preference detection on first visit.

### Implementation for User Story 2

- [ ] T045 [US2] Create app navbar component apps/frontend/src/app/core/layout/navbar/navbar.component.ts
- [ ] T046 [US2] Add theme toggle button to navbar.component.html with Material Design icon button
- [ ] T047 [US2] Wire theme toggle button to ThemeService.toggleTheme() in navbar.component.ts
- [ ] T048 [US2] Add theme state subscription to display correct icon (light_mode/dark_mode) in navbar.component.ts
- [ ] T049 [US2] Implement smooth theme transition using CSS transitions on all color properties in global styles
- [ ] T050 [US2] Test localStorage persistence (set theme, close browser, reopen, verify theme restored)
- [ ] T051 [US2] Test system preference detection (set OS to dark mode, clear localStorage, verify app detects and applies dark theme)
- [ ] T052 [US2] Verify all components receive theme updates via CSS Custom Properties
- [ ] T053 [US2] Audit all text colors for WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text) in both themes
- [ ] T054 [US2] Test BroadcastChannel synchronization (open app in 2 tabs, toggle theme in tab 1, verify tab 2 updates)
- [ ] T055 [US2] Add meta theme-color tag updates for mobile browser chrome in ThemeService
- [ ] T056 [US2] Document theme usage guidelines in quickstart.md if not already present

**Checkpoint**: User Story 2 complete - theme system fully functional with persistence and system detection

---

## Phase 5: User Story 3 - Responsive Mobile Experience (Priority: P1)

**Goal**: Fully optimized mobile experience with touch-friendly targets and responsive layouts

**Independent Test**: Use Chrome DevTools device emulation (iPhone 12, Galaxy S21) and real devices. Test at 320px, 768px, 1024px, 1440px widths. Verify cards stack correctly, touch targets are 44x44px minimum, navigation collapses to hamburger, scrolling is smooth at 60fps.

### Implementation for User Story 3

- [ ] T057 [P] [US3] Update match-card.component.scss with responsive breakpoints (1 column <768px, 2 columns 768-1024px, 3 columns >1024px)
- [ ] T058 [P] [US3] Add CSS Grid responsive layout to matches-list.component.scss
- [ ] T059 [US3] Add CSS Grid responsive layout to home.component.scss
- [ ] T060 [US3] Create mobile navigation menu component apps/frontend/src/app/core/layout/mobile-nav/mobile-nav.component.ts
- [ ] T061 [US3] Implement hamburger menu toggle in navbar.component.ts (show hamburger icon <768px)
- [ ] T062 [US3] Add slide-in animation for mobile menu (@slideInFromRight animation) in mobile-nav.component.ts
- [ ] T063 [US3] Implement touch gesture detection for match card swipe in match-card.component.ts (HammerJS or native touch events)
- [ ] T064 [US3] Audit all interactive elements for 44x44px minimum touch target size
- [ ] T065 [US3] Add responsive images with srcset/sizes for team logos in match-card.component.html
- [ ] T066 [US3] Implement viewport-based font scaling using clamp() in _variables.scss
- [ ] T067 [US3] Test scroll performance on mobile devices (use Chrome DevTools Performance profiler, target 60fps)
- [ ] T068 [US3] Add safe area insets for iOS notch support in navbar.component.scss
- [ ] T069 [US3] Test on real devices (iPhone, Android) at various screen sizes (320px-768px)
- [ ] T070 [US3] Verify no horizontal scrolling at any viewport width (320px-2560px)

**Checkpoint**: User Story 3 complete - responsive mobile experience optimized

---

## Phase 6: User Story 4 - Intuitive Navigation & Homepage Redesign (Priority: P2)

**Goal**: Clear navigation with active state indicators, tabbed match listings, and section-based homepage

**Independent Test**: Have new users complete tasks: "Find a live match", "View upcoming matches", "Check recent results". Measure task completion time and success rate. Verify active page indicators show correct state.

### Implementation for User Story 4

- [ ] T071 [US4] Update navbar.component.html with links: Home, Matches, Teams, Players, Stats
- [ ] T072 [US4] Implement active route highlighting in navbar.component.ts using Angular Router
- [ ] T073 [US4] Style active navigation items with underline/highlight in navbar.component.scss
- [ ] T074 [US4] Create tabbed navigation component apps/frontend/src/app/shared/components/tab-nav/tab-nav.component.ts
- [ ] T075 [US4] Implement Live/Upcoming/Completed tabs in matches-list.component.html using Material Design tabs
- [ ] T076 [US4] Wire tab navigation to filter matches by status in matches-list.component.ts
- [ ] T077 [US4] Add active tab indicator styling in tab-nav.component.scss
- [ ] T078 [US4] Redesign homepage with clear sections: "Live Now", "Upcoming Matches", "Recent Results" in home.component.html
- [ ] T079 [US4] Add section headings with visual hierarchy (font-size-xxl, font-weight-bold) in home.component.scss
- [ ] T080 [US4] Implement visual separation between sections (spacing, borders) in home.component.scss
- [ ] T081 [P] [US4] Create search/filter bar component apps/frontend/src/app/features/matches/components/search-bar/search-bar.component.ts
- [ ] T082 [P] [US4] Add search bar to matches-list.component.html with Material Design input
- [ ] T083 [US4] Implement search filtering logic (filter by team name) in matches-list.component.ts
- [ ] T084 [US4] Add smooth page transitions using Angular route animations in app-routing.module.ts
- [ ] T085 [US4] Implement scroll restoration to prevent layout shifts during navigation
- [ ] T086 [US4] Test navigation task completion with 5 new users (measure time and success rate)

**Checkpoint**: User Story 4 complete - navigation intuitive and homepage redesigned

---

## Phase 7: User Story 5 - Player Profile Visualization (Priority: P2)

**Goal**: Player statistics displayed with charts, progress bars, and visual data presentation

**Independent Test**: Open any player profile, verify batting/bowling stats shown with progress bars, recent form displayed as line chart, career milestones highlighted with icons. Test chart interactions (hover, tap on mobile). Check charts adapt to theme colors.

### Implementation for User Story 5

- [ ] T087 [P] [US5] Create PlayerStatsViewModel interface in apps/frontend/src/app/features/players/models/player-stats.models.ts (from data-model.md)
- [ ] T088 [P] [US5] Create ChartConfig interface in apps/frontend/src/app/shared/models/chart.models.ts (from data-model.md)
- [ ] T089 [US5] Create PlayerChartComponent in apps/frontend/src/app/shared/components/player-chart/player-chart.component.ts (per player-chart.contract.md)
- [ ] T090 [US5] Implement Chart.js initialization logic in player-chart.component.ts
- [ ] T091 [US5] Implement theme-aware chart color generation in player-chart.component.ts
- [ ] T092 [US5] Add chart type support (line, bar, radar, doughnut) in player-chart.component.ts
- [ ] T093 [US5] Implement chart data update method in player-chart.component.ts
- [ ] T094 [US5] Add chart accessibility (aria-label, hidden data table) in player-chart.component.html
- [ ] T095 [US5] Create player profile page apps/frontend/src/app/features/players/pages/player-profile/player-profile.component.ts
- [ ] T096 [US5] Add batting stats section with progress bars in player-profile.component.html
- [ ] T097 [US5] Add bowling stats section with progress bars in player-profile.component.html
- [ ] T098 [US5] Implement recent form line chart (last 10 innings) in player-profile.component.html using PlayerChartComponent
- [ ] T099 [US5] Add color coding for stat performance (green=excellent, yellow=average, red=poor) in player-profile.component.ts
- [ ] T100 [US5] Calculate performance indicators based on cricket benchmarks (batting avg >50=excellent, etc.) in player-profile.component.ts
- [ ] T101 [US5] Add career milestones section with icons and tooltips in player-profile.component.html
- [ ] T102 [US5] Implement chart responsiveness (different sizes for mobile/tablet/desktop) in player-chart.component.scss
- [ ] T103 [US5] Add touch interactions for charts on mobile (pan, zoom) using Chart.js touch plugin
- [ ] T104 [US5] Test chart theme adaptation (toggle theme, verify chart colors update)
- [ ] T105 [US5] Implement chart export as image functionality in player-chart.component.ts

**Checkpoint**: User Story 5 complete - player profiles with visual data presentation

---

## Phase 8: User Story 6 - Smooth Animations & Micro-interactions (Priority: P3)

**Goal**: Polish with subtle animations, hover states, ripple effects, and smooth transitions

**Independent Test**: Interact with all UI elements (buttons, cards, modals). Verify hover states animate smoothly (200ms ease-in-out), ripple effects work on clicks, modals fade in with scale animation. Check animations maintain 60fps using Chrome DevTools Performance profiler.

### Implementation for User Story 6

- [ ] T106 [P] [US6] Add button hover animations (color, shadow transitions) in apps/frontend/src/styles/_utilities.scss
- [ ] T107 [P] [US6] Implement Material Design ripple effect on all buttons (use Angular Material ripple directive)
- [ ] T108 [P] [US6] Create modal fade-in animation (@fadeIn, @scaleIn) in apps/frontend/src/app/core/animations/app-animations.ts
- [ ] T109 [US6] Apply modal animations to all dialog components using Angular Material dialog config
- [ ] T110 [US6] Update skeleton loaders with shimmer animation in skeleton-card.component.scss
- [ ] T111 [US6] Add card elevation animation on hover (translateY, box-shadow) in match-card.component.scss
- [ ] T112 [US6] Implement page transition fade effect in app-routing.module.ts
- [ ] T113 [US6] Add smooth scroll behavior to navigation links in global styles
- [ ] T114 [US6] Implement debounced theme toggle to prevent rapid switching in theme.service.ts
- [ ] T115 [US6] Add prefers-reduced-motion check to all animations in AnimationService
- [ ] T116 [US6] Disable non-essential animations when reduced motion detected in app.component.ts
- [ ] T117 [US6] Test animation frame rate (use Chrome DevTools Performance profiler, verify 60fps)
- [ ] T118 [US6] Audit animation durations (ensure all <400ms per guidelines)
- [ ] T119 [US6] Test accessibility with screen reader (NVDA, VoiceOver) and verify animations don't interfere

**Checkpoint**: User Story 6 complete - smooth animations and micro-interactions polished

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final optimizations, performance, accessibility, and documentation

- [ ] T120 [P] Run Lighthouse CI on homepage and verify score >90 mobile, >95 desktop
- [ ] T121 [P] Run Lighthouse CI on match detail page and verify performance scores
- [ ] T122 [P] Run Lighthouse CI on player profile page and verify performance scores
- [ ] T123 [P] Run axe DevTools accessibility audit on all major pages and fix violations
- [ ] T124 Implement lazy loading for player profile module in app-routing.module.ts
- [ ] T125 [P] Implement lazy loading for teams module in app-routing.module.ts
- [ ] T126 [P] Implement lazy loading for stats module in app-routing.module.ts
- [ ] T127 Optimize bundle size (run webpack-bundle-analyzer, check <500KB gzipped main bundle)
- [ ] T128 Add code splitting per route to reduce initial bundle size
- [ ] T129 Optimize images (compress team logos, use WebP format with PNG fallback)
- [ ] T130 [P] Add loading="lazy" attribute to all images below the fold
- [ ] T131 Implement virtual scrolling for long match lists using Angular CDK virtual scroll
- [ ] T132 Test initial page load on throttled 3G network (Chrome DevTools Network throttling, verify <2.5s LCP)
- [ ] T133 Verify Time to Interactive (TTI) <3.5s on mobile
- [ ] T134 Test keyboard navigation on all pages (Tab, Enter, Arrow keys, Escape)
- [ ] T135 Add focus-visible styles for all interactive elements
- [ ] T136 Test with high contrast mode (Windows High Contrast, verify UI remains usable)
- [ ] T137 Document component usage patterns in design system documentation
- [ ] T138 Create style guide page showing all design system components
- [ ] T139 Update README.md with information about new design system
- [ ] T140 Run E2E smoke tests for critical user flows (view live match, toggle theme, navigate pages)
- [ ] T141 Verify no console errors or warnings in production build
- [ ] T142 Test cross-browser compatibility (Chrome, Firefox, Safari, Edge - last 2 versions)
- [ ] T143 Run final constitution compliance check (verify all 5 principles satisfied)
- [ ] T144 Conduct user acceptance testing with 5-10 users and gather feedback
- [ ] T145 Address critical user feedback and bugs from UAT

**Final Checkpoint**: Modern UI Redesign complete and production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if multiple developers available)
  - Or sequentially in priority order (P1 → P1 → P1 → P2 → P2 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ **MVP CANDIDATE**
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on US1 (theme system is independent)
- **User Story 3 (P1)**: Can start after US1 complete (requires match cards to make responsive)
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on P1 stories (navigation is independent)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (player profiles are separate pages)
- **User Story 6 (P3)**: Should start after US1-US5 complete (adds polish to existing components)

### Within Each User Story

- Models before services/components
- Services before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
- T002, T003, T004, T005, T006, T007, T009, T010 can all run in parallel (different files)

**Phase 2 (Foundational)**:
- T020, T021, T023 can run in parallel with T011-T019
- T024 can run in parallel with theme file creation

**Phase 3 (US1)**:
- T027, T028, T038, T039 can run in parallel (different files/components)

**Phase 5 (US3)**:
- T057, T058, T059 can run in parallel (different component files)

**Phase 7 (US5)**:
- T087, T088 can run in parallel (interface definitions)
- T081, T082 can run in parallel with other US4 work

**Phase 8 (US6)**:
- T106, T107, T108 can run in parallel (different animation contexts)

**Phase 9 (Polish)**:
- T120, T121, T122, T123 can run in parallel (different pages)
- T125, T126 can run in parallel (different lazy loaded modules)
- T130 can run in parallel with other optimization tasks

---

## MVP Strategy

**Recommended MVP Scope**: User Story 1 ONLY

**Rationale**: User Story 1 delivers the core value proposition - modern, engaging live match cards with animations and real-time updates. This can be shipped independently to validate user response to the redesign before investing in additional features.

**MVP Delivery** (after Phase 2 Foundational):
1. Complete Phase 3 (User Story 1) - ~17 tasks
2. Run basic Lighthouse performance check
3. Test on real devices
4. Deploy to staging for user feedback

**Post-MVP Incremental Delivery**:
- **Increment 2**: Add User Story 2 (theme support) - high value, independent
- **Increment 3**: Add User Story 3 (responsive mobile) - critical for mobile users
- **Increment 4**: Add User Story 4 (navigation) - improves usability
- **Increment 5**: Add User Story 5 (player visualizations) - premium feature
- **Increment 6**: Add User Story 6 (polish animations) - final touches

---

## Summary

**Total Tasks**: 145 tasks  
**Setup Phase**: 10 tasks  
**Foundational Phase**: 16 tasks (BLOCKING)  
**User Story 1 (P1)**: 18 tasks (MVP)  
**User Story 2 (P1)**: 12 tasks  
**User Story 3 (P1)**: 14 tasks  
**User Story 4 (P2)**: 16 tasks  
**User Story 5 (P2)**: 19 tasks  
**User Story 6 (P3)**: 14 tasks  
**Polish Phase**: 26 tasks  

**Parallel Opportunities**: 37 tasks marked [P] (25% of tasks can run in parallel)

**Independent Test Criteria**:
- ✅ US1: View live match cards with animations working
- ✅ US2: Toggle theme and verify persistence
- ✅ US3: Test responsive layouts at 320px, 768px, 1024px
- ✅ US4: Complete navigation tasks with new users
- ✅ US5: View player profile with charts rendering
- ✅ US6: Verify 60fps animations with DevTools

**Estimated Effort**:
- Setup + Foundational: 2-3 days
- User Story 1 (MVP): 3-4 days
- User Story 2: 2-3 days
- User Story 3: 2-3 days
- User Story 4: 3-4 days
- User Story 5: 4-5 days
- User Story 6: 2-3 days
- Polish: 4-5 days

**Total Estimated Duration**: 22-30 days (single developer, sequential)  
**With Parallelization (2-3 developers)**: 12-18 days

---

**Next Steps**: Begin with Phase 1 (Setup), then Phase 2 (Foundational), then implement User Story 1 as MVP for user validation.
