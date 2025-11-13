# Feature Specification: Mobile-First UI/UX Redesign

**Feature Branch**: `004-mobile-ui-redesign`  
**Created**: 2025-11-13  
**Status**: Draft  
**Input**: User description: "redesign the ui ux for small screen and mobile the home page and the cricket individual match page we can see clicking the match dont create test"

**Design Reference**: Cricket.com's mobile experience (modern cricket news/scores platform with excellent mobile UX)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile Home Page Optimization (Priority: P1)

Cricket fans using mobile devices (smartphones with screen sizes 320px-428px) need a streamlined home page that displays live matches, upcoming fixtures, and key information without overwhelming the limited screen space. Touch targets must be appropriately sized (minimum 44x44px), content must be easily scannable, and navigation must work with one-handed thumb operation.

**Why this priority**: The home page is the primary entry point. Mobile users account for 60-70% of sports app traffic, and if the home page doesn't work well on mobile, users will immediately leave. This is the foundation for all other mobile interactions.

**Independent Test**: Can be fully tested by accessing the home page on various mobile devices (iPhone SE, iPhone 14, Samsung Galaxy S23) and verifying that all match cards, navigation elements, and CTAs are easily tappable and content is readable without zooming. Delivers immediate value by making the app usable on mobile.

**Acceptance Scenarios**:

1. **Given** a user opens the home page on a mobile device (375px width), **When** they view the page, **Then** all content fits within the viewport without horizontal scrolling
2. **Given** a user is viewing the home page on mobile, **When** they see live match cards, **Then** each card displays team names, scores, and match status in a compact layout with minimum 44x44px touch targets
3. **Given** a user scrolls through match listings on mobile, **When** they scroll, **Then** the page scrolls smoothly without lag or janky animations (60fps)
4. **Given** a user taps on a match card, **When** they tap, **Then** visual feedback appears within 100ms (ripple effect or highlight) before navigation
5. **Given** a user holds their phone with one hand, **When** they interact with navigation elements, **Then** primary actions are within thumb-reach zone (bottom third of screen)
6. **Given** a user on a slow 3G connection loads the home page, **When** the page loads, **Then** critical content (match cards) appears within 3 seconds
7. **Given** a user views match cards in portrait orientation, **When** they rotate to landscape, **Then** the layout adapts gracefully without breaking or requiring page reload

---

### User Story 2 - Mobile Match Details Page Optimization (Priority: P1)

Users navigating to individual match pages on mobile need detailed match information (scorecard, ball-by-ball commentary, player stats, match summary) organized in a mobile-friendly format. Information hierarchy must prioritize the most important data (current score, match status) and allow easy access to detailed sections through tabs or accordions.

**Why this priority**: The match details page is the destination after clicking home page match cards—the core user journey. Without mobile optimization here, users cannot access the detailed information they came for, defeating the app's purpose.

**Independent Test**: Can be fully tested by navigating from home page to a match details page on mobile and verifying that scorecard, commentary, and stats are accessible, readable, and performant on small screens. Delivers the complete match viewing experience on mobile.

**Acceptance Scenarios**:

1. **Given** a user clicks a match card from the home page, **When** the match details page loads, **Then** the page displays the current score prominently at the top (above the fold) on mobile
2. **Given** a user is viewing match details on mobile, **When** they scroll, **Then** a sticky header remains visible showing team names and current score
3. **Given** a user wants to view different match sections (scorecard, commentary, stats), **When** they tap section tabs, **Then** sections switch instantly (<200ms) without full page reload
4. **Given** a user views the scorecard on mobile, **When** they see the batting card, **Then** player names, runs, balls, SR are visible without horizontal scrolling using responsive table design or cards
5. **Given** a user reads ball-by-ball commentary, **When** they scroll through commentary, **Then** each ball is clearly separated and readable with adequate spacing for touch interaction
6. **Given** a user views player stats, **When** they tap on a player, **Then** detailed stats expand inline or navigate to player profile without losing match context
7. **Given** a user is viewing a live match, **When** new balls are bowled, **Then** the page updates in real-time without requiring manual refresh and with smooth animations
8. **Given** a user on mobile views images (team logos, player photos), **When** images load, **Then** appropriately sized images are served (not desktop-sized images scaled down)

---

### User Story 3 - Touch-Optimized Interactions (Priority: P2)

Users interacting with the app on touchscreens need gestures and interactions that feel natural for mobile devices. This includes swipe gestures for navigation (e.g., swipe between match sections), pull-to-refresh for updating live scores, and appropriate touch feedback for all interactive elements.

**Why this priority**: While P1 stories ensure the app is usable on mobile, this story makes it feel native and intuitive. Without touch-optimized interactions, the app feels like a mobile website rather than a mobile experience, reducing user engagement.

**Independent Test**: Can be fully tested by using touch gestures (swipe, pull, long-press) on match pages and verifying that gestures are recognized and provide appropriate feedback. Delivers a premium, app-like mobile experience.

**Acceptance Scenarios**:

1. **Given** a user is on the match details page with tabs, **When** they swipe left or right, **Then** the view switches to the next/previous tab with a smooth transition animation
2. **Given** a user is viewing live match data, **When** they pull down from the top of the page, **Then** a refresh indicator appears and data refreshes on release
3. **Given** a user taps any interactive element (button, card, link), **When** they tap, **Then** visual feedback (ripple, highlight, scale) appears within 100ms
4. **Given** a user long-presses on a match card or player, **When** they hold for 500ms, **Then** a context menu or quick actions appear (share, favorite, etc.)
5. **Given** a user accidentally taps the wrong element, **When** they slide their finger away before releasing, **Then** the tap is cancelled without triggering navigation

---

### User Story 4 - Content Discovery & Navigation (Priority: P2)

Users browsing cricket content on mobile need easy access to related content (recent matches, trending series, featured articles, player rankings) through intuitive navigation patterns. Content should be organized in scannable sections with clear visual hierarchy, similar to modern sports platforms like cricket.com.

**Why this priority**: While P1 stories ensure core match viewing works, users often want to explore related content, check standings, or read news. Good content discovery keeps users engaged longer and provides comprehensive cricket coverage beyond just live scores.

**Independent Test**: Can be fully tested by exploring the home page content sections and navigation on mobile, verifying that users can easily discover and access different types of cricket content (matches, series, rankings, news) without getting lost. Delivers a content-rich mobile experience.

**Acceptance Scenarios**:

1. **Given** a user scrolls the home page on mobile, **When** they view the page, **Then** content is organized in clear sections (Live Matches, Upcoming Matches, Featured Articles, Rankings, Series Corner) with section headers
2. **Given** a user wants to navigate between major sections, **When** they tap the navigation menu, **Then** primary navigation options (Schedule, Series, Rankings, News, Teams, Players) are clearly presented
3. **Given** a user views match listings, **When** they see multiple matches, **Then** matches are grouped by series/competition with collapsible headers for better organization
4. **Given** a user wants to filter matches, **When** they interact with filter options, **Then** they can view "All Matches", "Live", "Upcoming", or "Completed" with one tap
5. **Given** a user scrolls past the fold on home page, **When** they scroll down, **Then** a floating action button or "Back to Top" appears for quick navigation
6. **Given** a user views a series section, **When** they tap it, **Then** they can see series overview, matches, points table, squads, and stats in an organized layout
7. **Given** a user wants quick access to specific content, **When** they use bottom navigation or quick links, **Then** frequently accessed sections (Home, Schedule, Rankings, Profile) are one tap away

---

### User Story 5 - Small Screen Layout Optimization (Priority: P2)

Users with small screen devices (iPhone SE, older Android phones with 320-375px widths) need layouts that prioritize essential information and gracefully handle space constraints. Navigation must collapse appropriately, fonts must remain readable, and spacing must be optimized for small viewports.

**Why this priority**: While most users have modern devices, 15-20% still use smaller screens. Neglecting this segment risks excluding a significant user base and creates accessibility issues. This ensures inclusivity across all mobile devices.

**Independent Test**: Can be fully tested by viewing the app on the smallest target device (320px width) and verifying that content remains usable and readable without breaking layouts. Ensures the app works for all users, not just those with premium devices.

**Acceptance Scenarios**:

1. **Given** a user with a 320px width device views the home page, **When** they load the page, **Then** all content remains readable with minimum 14px font size for body text
2. **Given** a user on a small screen views match cards, **When** multiple cards are displayed, **Then** cards stack vertically with appropriate spacing (minimum 12px between cards)
3. **Given** a user navigates the site on a small screen, **When** they open the navigation menu, **Then** the menu overlays the content (hamburger menu) rather than taking permanent screen space
4. **Given** a user views tables (scorecard) on a small screen, **When** tables are too wide, **Then** tables use a card-based layout or horizontal scroll with visible overflow indicators
5. **Given** a user interacts with forms or inputs on a small screen, **When** the keyboard appears, **Then** the layout adjusts so the focused input remains visible
6. **Given** a user views images on a small screen, **When** high-resolution images are displayed, **Then** images are responsive and don't cause horizontal overflow

---

### User Story 6 - Performance Optimization for Mobile Networks (Priority: P3)

Users with small screen devices (iPhone SE, older Android phones with 320-375px widths) need layouts that prioritize essential information and gracefully handle space constraints. Navigation must collapse appropriately, fonts must remain readable, and spacing must be optimized for small viewports.

**Why this priority**: While most users have modern devices, 15-20% still use smaller screens. Neglecting this segment risks excluding a significant user base and creates accessibility issues. This ensures inclusivity across all mobile devices.

**Independent Test**: Can be fully tested by viewing the app on the smallest target device (320px width) and verifying that content remains usable and readable without breaking layouts. Ensures the app works for all users, not just those with premium devices.

**Acceptance Scenarios**:

1. **Given** a user with a 320px width device views the home page, **When** they load the page, **Then** all content remains readable with minimum 14px font size for body text
2. **Given** a user on a small screen views match cards, **When** multiple cards are displayed, **Then** cards stack vertically with appropriate spacing (minimum 12px between cards)
3. **Given** a user navigates the site on a small screen, **When** they open the navigation menu, **Then** the menu overlays the content (hamburger menu) rather than taking permanent screen space
4. **Given** a user views tables (scorecard) on a small screen, **When** tables are too wide, **Then** tables use a card-based layout or horizontal scroll with visible overflow indicators
5. **Given** a user interacts with forms or inputs on a small screen, **When** the keyboard appears, **Then** the layout adjusts so the focused input remains visible
6. **Given** a user views images on a small screen, **When** high-resolution images are displayed, **Then** images are responsive and don't cause horizontal overflow

---

### User Story 5 - Performance Optimization for Mobile Networks (Priority: P3)

Users on mobile networks (3G, 4G, variable connectivity) need the app to load quickly and remain functional even with intermittent connectivity. This includes lazy loading images, optimizing bundle sizes, and implementing progressive loading strategies.

**Why this priority**: Mobile network conditions vary significantly. While P1/P2 stories focus on UI/UX design, this ensures the redesigned mobile experience is actually usable in real-world mobile network conditions. Without this, a beautiful UI is worthless if it takes 30 seconds to load.

**Independent Test**: Can be fully tested by simulating slow 3G connections (DevTools network throttling) and verifying that initial content loads quickly, images lazy load, and the app remains functional during network fluctuations. Delivers a resilient mobile experience.

**Acceptance Scenarios**:

1. **Given** a user on a slow 3G connection loads the home page, **When** the page loads, **Then** text and layout appear within 3 seconds, images load progressively
2. **Given** a user scrolls through match listings, **When** they scroll to new content, **Then** images below the fold lazy-load as they enter the viewport
3. **Given** a user experiences network interruption mid-session, **When** connectivity drops, **Then** previously loaded content remains accessible and a clear offline indicator appears
4. **Given** a user navigates between pages, **When** they navigate, **Then** core app shell and navigation load instantly (<500ms) while content loads progressively
5. **Given** a user on a metered connection views the app, **When** they access content, **Then** data usage is minimized through image compression and efficient caching

---

### Edge Cases

- **What happens when a user rotates their device mid-interaction?** The layout adapts to the new orientation without losing state (e.g., scroll position, open tabs, form data)
- **How does the app handle very long team names on small screens?** Team names truncate with ellipsis after a character limit while showing full names in tooltips or on tap
- **What happens when a user has accessibility settings enabled (large text, high contrast)?** The mobile layout respects system accessibility settings and scales text accordingly without breaking layouts
- **How does the app handle touch conflicts (e.g., swipe to navigate vs. scroll)?** Swipe gestures require a minimum horizontal displacement (30px) before triggering, allowing vertical scrolling to work normally
- **What happens when images fail to load on mobile?** Placeholder images or team/player initials display instead, with retry options, ensuring the layout doesn't break
- **How does the app handle very slow network connections (<2G speeds)?** A lightweight "data saver" mode can be activated that disables images and animations while keeping core functionality
- **What happens when a user has JavaScript disabled or using an old browser?** A basic HTML-only version displays critical content (match scores) with a message encouraging upgrade/enable JS
- **How does the app handle content overflow in match cards (long venue names, player names)?** Content truncates gracefully with tooltips available, maintaining card layout integrity
- **What happens when multiple matches from the same series are displayed?** Matches are grouped under series headers with expand/collapse functionality to avoid overwhelming the user
- **How does navigation work when a user is deep in the app (e.g., player profile from match page)?** Breadcrumb navigation or back button maintains context, allowing users to return to their starting point

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Home page MUST display live matches in a mobile-optimized card layout with team names, scores, and match status visible on screens as small as 320px width
- **FR-002**: All interactive elements (buttons, cards, links) MUST have minimum touch target size of 44x44px to meet accessibility standards
- **FR-003**: Match details page MUST display current score, team names, and match status prominently at the top of the page on mobile devices
- **FR-004**: Match details page MUST provide sectioned content (scorecard, commentary, stats) accessible through tabs or accordion interface optimized for mobile
- **FR-005**: System MUST implement responsive breakpoints at minimum: 320px (small phone), 375px (medium phone), 428px (large phone), 768px (tablet)
- **FR-006**: Navigation MUST collapse into a hamburger menu on screens below 768px width with menu accessible in one-handed thumb reach zone
- **FR-007**: All text MUST maintain minimum font size of 14px for body text and 12px for secondary text on mobile devices
- **FR-008**: System MUST prevent horizontal scrolling on mobile devices except for intentional components (carousels, tables with overflow indicators)
- **FR-009**: All tables (scorecards) MUST transform into mobile-friendly card layouts or implement horizontal scroll with visible overflow indicators on screens below 640px
- **FR-010**: Touch interactions MUST provide visual feedback (ripple effect, highlight, or scale animation) within 100ms of user tap
- **FR-011**: System MUST implement pull-to-refresh gesture on mobile for updating live match data
- **FR-012**: Match detail tabs/sections MUST support swipe gestures (left/right) for navigation between sections on mobile
- **FR-013**: System MUST implement lazy loading for images, loading only images in viewport plus 200px buffer below
- **FR-014**: System MUST serve appropriately sized images based on device screen size and pixel density (1x, 2x, 3x resolutions)
- **FR-015**: Match cards on home page MUST be tappable across the entire card area, not just the text/button portion
- **FR-016**: System MUST maintain scroll position when user navigates back from match details to home page
- **FR-017**: System MUST implement sticky header on match details page showing team names and current score when user scrolls down on mobile
- **FR-018**: System MUST display loading skeletons or spinners for content loading states to indicate progress on mobile
- **FR-019**: System MUST adapt layout when device orientation changes (portrait to landscape) without page reload or state loss
- **FR-020**: System MUST ensure critical content (match scores, team names) loads within 3 seconds on 3G network speeds
- **FR-021**: All interactive elements MUST have minimum spacing of 8px between them to prevent accidental taps on mobile
- **FR-022**: System MUST respect user's system accessibility settings (large text, reduced motion) on mobile devices
- **FR-023**: System MUST provide fallback UI when images fail to load (placeholders, team initials) without breaking layout
- **FR-023A**: System MUST display WebSocket connection status indicator (connected/reconnecting/disconnected) on mobile for live matches without obscuring match content
- **FR-024**: Home page MUST organize content in clear sections (Live Matches, Upcoming, Featured Content, Rankings) with section headers visible on mobile
- **FR-025**: System MUST provide filter/sort options for match listings (All, Live, Upcoming, Completed) accessible with one tap on mobile
- **FR-026**: Navigation menu MUST display primary options (Schedule, Series, Teams, Players, Rankings, News) in a mobile-optimized layout
- **FR-027**: Match cards MUST include visual status indicators (live pulse animation, completed checkmark, upcoming clock icon) for quick scanning
- **FR-028**: System MUST group matches by series/competition with collapsible headers to improve content organization on mobile
- **FR-029**: System MUST provide "Back to Top" functionality via floating button when user scrolls beyond one viewport height
- **FR-030**: Match details tabs MUST be horizontally scrollable if more than 4 tabs exist, with current tab centered and clearly indicated
- **FR-016**: System MUST maintain scroll position when user navigates back from match details to home page
- **FR-017**: System MUST implement sticky header on match details page showing team names and current score when user scrolls down on mobile
- **FR-018**: System MUST display loading skeletons or spinners for content loading states to indicate progress on mobile
- **FR-019**: System MUST adapt layout when device orientation changes (portrait to landscape) without page reload or state loss
- **FR-020**: System MUST ensure critical content (match scores, team names) loads within 3 seconds on 3G network speeds
- **FR-021**: All interactive elements MUST have minimum spacing of 8px between them to prevent accidental taps on mobile
- **FR-022**: System MUST respect user's system accessibility settings (large text, reduced motion) on mobile devices
- **FR-023**: System MUST provide fallback UI when images fail to load (placeholders, team initials) without breaking layout

### Key Entities

- **Match Card**: Compact representation of a match displayed on home page; includes team names, team logos, current score, match status, format, venue, and time to toss/start
- **Match Details Section**: Distinct content areas within match page (scorecard, commentary, statistics, match info); users navigate between sections via tabs or accordions
- **Content Section**: Organized group of related content on home page (Live Matches, Upcoming Matches, Featured Articles, Rankings, Series Corner); has section header and contains multiple items
- **Series Group**: Collection of matches belonging to the same cricket series/competition; can be expanded/collapsed to show/hide matches
- **Touch Target**: Any interactive element on mobile (button, link, card); must meet minimum size and spacing requirements for reliable touch interaction
- **Breakpoint**: Screen width threshold where layout adapts (320px, 375px, 428px, 640px, 768px); determines which UI components and layouts are displayed
- **Viewport**: Visible area of the web page on user's device; on mobile this is typically 320-428px wide in portrait mode
- **Sticky Element**: UI component that remains visible when user scrolls (e.g., match score header, navigation bar); provides context without taking permanent screen space
- **Status Indicator**: Visual cue showing match state (live pulse, upcoming clock, completed checkmark); helps users quickly identify match status while scanning
- **Filter Option**: User-selectable criteria to display subset of matches (All, Live, Upcoming, Completed); accessible via tabs or dropdown on mobile

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view and interact with all home page content on devices with 320px minimum width without horizontal scrolling
- **SC-002**: All interactive elements pass WCAG 2.1 Level AA touch target size requirements (minimum 44x44px) verified through accessibility audit
- **SC-003**: Match details page loads and displays current score within 3 seconds on simulated 3G network connection (750kbps)
- **SC-004**: Users can navigate between match detail sections (scorecard, commentary, stats) in under 1 second on mobile devices
- **SC-005**: Touch interactions provide visual feedback within 100ms verified through performance monitoring
- **SC-006**: Page layout adapts to orientation changes within 300ms without content reflow or state loss
- **SC-007**: 90% of users successfully complete primary task (view match details) on first attempt on mobile devices
- **SC-008**: Mobile page weight is reduced by 40% compared to current desktop experience through image optimization and lazy loading
- **SC-009**: Lighthouse mobile performance score reaches minimum 80 (out of 100) for both home page and match details page
- **SC-010**: Zero horizontal scroll events recorded on mobile viewports (320-428px) through analytics tracking
- **SC-011**: Bounce rate on mobile devices decreases by 25% compared to pre-redesign baseline
- **SC-012**: Average session duration on mobile increases by 30% indicating improved engagement with mobile-optimized experience
- **SC-013**: Users can discover and access at least 3 different content types (matches, series, rankings) within 10 seconds of landing on home page
- **SC-014**: Match filter/sort interactions complete in under 500ms with smooth visual transitions
- **SC-015**: Content sections on home page are clearly distinguishable with 95% of users correctly identifying section boundaries in usability testing

## Assumptions & Constraints

### Assumptions

- Users have modern mobile browsers (iOS Safari 13+, Chrome 90+, Samsung Internet 14+)
- Majority of users are on 4G/LTE or better connectivity, but app must gracefully degrade for 3G
- Users have touchscreen devices with standard touch interaction patterns (tap, swipe, long-press)
- Team logos and player images are available in multiple resolutions (1x, 2x, 3x) or can be optimized during build
- Backend APIs provide match data in a format suitable for mobile consumption (no mobile-specific API changes required)
- Match URLs follow pattern `/cric-live/{match-slug}` (e.g., `/cric-live/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025`)
- Live match data updates are delivered via WebSocket connections for real-time score/commentary updates
- WebSocket implementation already exists and provides incremental updates without requiring full page reloads
- Existing WebSocket reconnection logic is adequate; mobile UI only needs to display connection status clearly to users
- User authentication exists but is optional; all core features (viewing matches, scores, commentary) work for anonymous users
- Logged-in user features (favorites, personalized feeds, profile) are secondary and will use existing UI patterns on mobile
- Users expect mobile web experience similar to native cricket apps (Cricbuzz, ESPN Cricinfo, Cricket.com)
- Current design system status is unclear and requires audit; mobile redesign will document and establish reusable component patterns
- Mobile UI patterns created in this redesign should be designed for reusability and can serve as foundation for future design system
- Responsive design will use CSS media queries and modern layout techniques (Flexbox, Grid) supported by target browsers
- Text content (team names, player names, commentary) fits within mobile layout constraints or can be truncated gracefully
- Content is English-only for this iteration; layouts should be flexible but RTL/i18n is future scope
- Basic WCAG 2.1 AA compliance (touch targets, text size, color contrast) is sufficient; advanced accessibility features are future enhancements
- Reference implementation patterns from cricket.com demonstrate effective mobile-first design for cricket content

### Constraints

- Must maintain consistency with existing brand colors, typography, and design language where applicable (to be documented during frontend audit)
- Mobile components should be built with reusability in mind to facilitate future design system development
- Cannot make breaking changes to existing backend APIs; must work with current data structure
- Must support browsers listed in project browser support matrix (to be confirmed from project documentation)
- Must maintain accessibility compliance (WCAG 2.1 Level AA minimum) across all redesigned mobile interfaces
- Development timeline must accommodate testing on physical devices across iOS and Android platforms
- Must not negatively impact desktop experience; responsive design should enhance mobile without degrading desktop
- Performance budget constraints: Home page max 1.5MB initial load, Match details page max 2MB initial load on mobile
- Must work without requiring app installation (progressive web app capabilities are optional enhancements, not requirements)

### Dependencies

- Access to various physical mobile devices for testing (or remote device testing service)
- Browser DevTools or similar for network throttling and mobile viewport simulation during development
- Performance monitoring tools (Lighthouse, WebPageTest) for validating success criteria
- Analytics integration to measure mobile-specific metrics (bounce rate, session duration, task completion)
- Image optimization pipeline for generating responsive image assets at multiple resolutions
- Existing WebSocket infrastructure for live match updates must remain stable during mobile UI implementation
- Match data API endpoints must continue providing consistent data structure for mobile views
- **Prerequisite**: Audit of existing frontend codebase to document current component patterns, styles, and design tokens before mobile implementation begins

## Out of Scope

- Native mobile app development (iOS/Android) - this feature focuses on mobile web experience only
- Progressive Web App (PWA) features like offline support, push notifications, home screen installation - these are future enhancements
- Mobile-specific backend API endpoints or data structure changes - must work with existing APIs
- Redesign of pages beyond home page and match details page (player profiles, team pages, etc.) - future iterations
- Mobile device detection and automatic redirect logic - rely on responsive design
- Payment or subscription features on mobile - not part of this redesign scope
- Social sharing features optimized for mobile - separate feature consideration
- Voice or gesture controls beyond standard touch interactions
- Advanced mobile features like device sensors (accelerometer, gyroscope) or camera access
- Testing on obsolete browsers (IE11, iOS Safari <13, Android <7) - modern browser focus only
- Mobile-specific login/signup flow optimization - existing authentication UI will be used as-is on mobile
- Push notifications or match alerts for logged-in users - future enhancement after base mobile UI is complete
- **Internationalization (i18n)**: Multi-language support, RTL layouts, locale-specific formatting - future iteration after core mobile UI is validated
- **Advanced accessibility**: Full screen reader optimization, keyboard navigation, dark mode - basic WCAG 2.1 AA compliance only in this iteration

## Design References & Industry Patterns

### Cricket.com Mobile Patterns (Observed 2025-11-13)

Cricket.com demonstrates several effective mobile-first patterns that align with this specification:

**Home Page Match Cards**:
- **Compact card layout**: Team flags/logos positioned on left and right sides with score in center
- **Match status indicators**: "LIVE" with red indicator, countdown timers for upcoming matches ("9 hrs 21 mins to toss"), completed match results
- **Hierarchy**: Team names and scores most prominent, followed by venue/format details in smaller text
- **Win projections**: Displayed inline within live match cards ("Win projections to be updated soon...")
- **Player of the match**: Badge/icon displayed prominently on completed match cards
- **Vertical stacking**: Cards stack vertically with consistent spacing and clear separators

**Match Details Organization**:
- **Sticky navigation tabs**: Scorecard, Commentary, Stats, Schedule, Points Table accessible via horizontal tabs
- **Prominent score display**: Current score and match status always visible at top, likely sticky on scroll
- **Series grouping**: Matches organized by tournament/series with clear headers
- **Quick access links**: Bottom navigation for Matches, Schedule, Criclytics, Fantasy, News

**Mobile Navigation**:
- **Bottom navigation pattern**: Primary actions accessible in thumb-reach zone
- **Horizontal scrollable sections**: Featured articles, video carousels scroll horizontally with swipe
- **Collapsible sections**: "Trending", "Featured Articles", "Editor's Pick" organized in expandable sections
- **Search and filter**: Accessible from top bar for match schedule and series filtering

**Performance Optimizations**:
- **Lazy loading**: Images load progressively as user scrolls
- **Skeleton loaders**: Content sections show loading state before data arrives
- **Optimized images**: Team flags served as lightweight SVGs, player photos appropriately sized
- **Progressive enhancement**: Core content (text, scores) loads first, images/styling enhance afterward

**Typography & Spacing**:
- **Readable font sizes**: Body text appears 14-16px, team names 16-18px, scores 20-24px
- **Adequate spacing**: Minimum 12-16px between cards, 8px padding within cards
- **Color coding**: Live matches use red/green accents, upcoming matches blue, completed grey
- **High contrast**: Text maintains strong contrast against backgrounds for outdoor viewing

**Key Takeaways for VictoryLine**:
1. Prioritize match status and score visibility above all else
2. Use color coding consistently (red for live, blue for upcoming, grey for completed)
3. Implement sticky score header on match details pages
4. Provide quick access to different match sections via tabs
5. Optimize for one-handed thumb operation with bottom-aligned primary actions
6. Use horizontal swipe for featured content sections
7. Load critical match data first, images second
8. Maintain consistent card spacing and touch target sizes across all devices
