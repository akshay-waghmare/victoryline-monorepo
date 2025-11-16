# Feature Specification: Live Match Glance Layout

**Feature Branch**: `005-live-match-glance`  
**Created**: 2025-11-16  
**Status**: Draft  
**Input**: User description: "https://crex.com/scoreboard/WUY/1YG/3rd-ODI/T/U/pak-vs-sl-3rd-odi-sri-lanka-tour-of-pakistan-2025/live - just take inspiration from this page and reimagine our cric-live individual match page so all live score, batters, bowler, and odds are visible at a glance without scrolling."

## Overview

VictoryLine's current live match detail screen requires multiple scroll actions to collect the essential state of play. Inspired by the reference Crex scoreboard, this feature delivers a single-screen hero experience that exposes every critical live data point (score, strike partnership, bowler spell, win odds, staleness) the moment a user lands on the page. The redesign targets live fixtures only and aligns with the constitution's real-time, accessibility, and UI/UX standards.

## Scope

- Live cricket match detail page accessed via `/cric-live/:slug`.
- Viewport targets: desktop (1366x768) and tablet (1024x768) in landscape.
- Data elements: team scores, innings state, run rates, target summary, current batters, current bowler, partnership, win odds, possession indicators, staleness badge, quick access to expanded tabs.
- Interaction affordances: sticky quick links to deeper panels (commentary, scorecard, info) while keeping hero section within initial view.
- Visual hierarchy and semantics optimized for keyboard and screen-reader parity with no vertical scrolling required for the hero stack.

## Out of Scope

- Completed, upcoming, or archived match layouts (handled in future phases once data exists).
- Video streams, advanced charts, or predictive analytics beyond headline win odds.
- Structural changes to commentary, full scorecard, or lineup tabs beyond their entry points.
- Mobile portrait optimization below 720px height (separate iteration).
- Backend or scraper enhancements beyond data shape already provided.

## Assumptions

- Live data feeds already surface current batter, non-striker, bowler, run rate, target, and market odds fields; missing fields degrade gracefully with placeholders.
- Odds data is allowed for display in all supported jurisdictions (content team confirms regulatory compliance).
- The hero section can reserve up to 720px height on desktop without interfering with existing navigation chrome.
- Auto-refresh cadence remains <=5 seconds via existing push or poll hybrid.
- Brand design tokens from Feature 001 remain available for layout.

## Actors

| Actor | Motivation |
|-------|------------|
| Live Viewer | Wants to know match state immediately without scrolling. |
| Bettor | Tracks odds shifts alongside live score to decide on wagers. |
| Commentator or Analyst | Needs bowling figures and partnership context instantly. |
| Accessibility User | Requires structured headings and focus order to extract core information quickly. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Match Snapshot (Priority: P1)

As a live viewer I want the match scoreline, innings context, run rates, and win odds presented above the fold so I can judge the situation within a glance.

**Why this priority**: Quick clarity prevents bounce and is the primary motivation for visiting the page.

**Independent Test**: Load the redesigned live match page with mock data and confirm a user can state score, wickets, overs, run rate, required rate, and odds without scrolling or opening deeper sections.

**Acceptance Scenarios**:

1. **Given** an active chase with target data **When** the viewer lands on the page **Then** the hero shows batting team score (runs, wickets, overs), target summary, current run rate, required run rate, and win odds within the initial viewport.
2. **Given** a first-innings match with no target yet **When** the viewer lands on the page **Then** the hero substitutes target metrics with projected total and displays win odds based on available data without empty gaps.

---

### User Story 2 - Current Participants Highlight (Priority: P2)

As a fan I want to see who is batting and bowling along with their latest contributions so I can follow the duel in progress.

**Why this priority**: Identifying active players keeps users engaged and differentiates live coverage.

**Independent Test**: Using fixture stubs, verify the hero card lists striker and non-striker with runs and balls, recent ball outcomes, and the current bowler with spell summary, all updated live and accessible.

**Acceptance Scenarios**:

1. **Given** two batters are active **When** the page renders **Then** the striker and non-striker rows display names, notation (for example, "on strike"), runs, balls, strike rate, and last delivery indicator.
2. **Given** a new bowler starts an over **When** the feed updates **Then** the hero highlights the bowler card with overs, runs conceded, wickets, and economy, replacing the previous bowler without layout shift.

---

### User Story 3 - Trustworthy Live State (Priority: P3)

As any visitor I want clear signals when data is fresh or delayed and intuitive ways to access deeper sections without losing the hero view.

**Why this priority**: Confidence in data freshness determines trust and continued usage.

**Independent Test**: Simulate staleness thresholds and navigation interactions to confirm visual indicators, retry actions, and quick links work without scrolling the hero off-screen.

**Acceptance Scenarios**:

1. **Given** the last update timestamp is <=30 seconds old **When** the hero renders **Then** it shows only a subtle "Live" indicator.
2. **Given** the timestamp exceeds 60 seconds **When** the hero renders **Then** a warning badge and retry control appear adjacent to the scoreline without causing vertical overflow.
3. **Given** the user clicks "Scorecard" quick link **When** the detailed section opens **Then** the hero collapses to a condensed sticky bar maintaining score, batters, bowler, and odds in view.

---

### Edge Cases

- Live feed temporarily omits odds: display neutral text ("Odds unavailable") without leaving blank space.
- Rain or light delay changes match status: hero replaces odds column with delay notice while keeping score elements visible.
- Super Over or D/L adjustments: hero recalculates target summary labels without exceeding first-screen height.
- Missing batter role metadata: use generic labels ("Batter 1" and "Batter 2") with tooltips documenting data gap.
- Live match starts before lineups confirmed: show placeholder names until data arrives, communicating "Pending lineup".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The hero section must display current innings scoreline (runs, wickets, overs), match status, and run rate metrics within the initial viewport at 1366x768 and 1024x768.
- **FR-002**: The hero must summarize chasing context (target, required runs, required run rate, balls remaining) when a chase is in progress and fall back to projected score when no target exists.
- **FR-003**: The hero must list striker and non-striker with runs, balls, strike rate, and indicator of who faces the next delivery.
- **FR-004**: The hero must list the active bowler with overs bowled, maidens, runs conceded, wickets, economy, and last-over highlight.
- **FR-005**: The hero must surface current win odds (or equivalent confidence metric) with trend indicator; if data is missing, display a descriptive placeholder.
- **FR-006**: The layout must maintain all hero data without requiring vertical scrolling on desktop and tablet targets while supporting responsive behavior when additional UI (for example, cookie banner) is present.
- **FR-007**: Provide prominent quick links or tabs to deeper sections (Commentary, Scorecard, Match Info) that keep hero content visible through sticky or condensed behavior.
- **FR-008**: Display data freshness state using the constitution staleness tiers (<30 seconds live, 30-120 seconds warning, >120 seconds failure) with visible retry affordance in degraded states.
- **FR-009**: Handle partial data gracefully by showing labeled placeholders and help text rather than blank or zero values.
- **FR-010**: Ensure the hero remains keyboard navigable and screen-reader friendly with announced section headings, tab order, and ARIA roles aligned to constitution accessibility requirements.
- **FR-011**: Capture analytics events for hero impressions, staleness warnings, odds visibility, and quick-link clicks to support post-launch evaluation.
- **FR-012**: Provide localized formatting for numbers, percentages, and labels consistent with existing VictoryLine localization guidelines.

### Non-Functional Requirements

- **NFR-001**: Time to load hero content (scoreline, players, odds) must be <=2.5 seconds on Fast 3G for live matches with cached assets.
- **NFR-002**: Live updates must reflect in the hero within <=5 seconds of receipt from the data service (95th percentile).
- **NFR-003**: Accessibility audits (axe-core) must return zero critical issues for the hero region.
- **NFR-004**: Hero layout must pass responsive QA at 1366x768, 1280x720, and 1024x768 landscapes without introducing vertical scroll for the hero stack.
- **NFR-005**: Visual transitions (for example, player swap) must respect reduced-motion preferences.

### Dependencies

- Live match API providing score snapshots, player states, bowler data, and odds metrics.
- Existing websocket or polling infrastructure to deliver timely updates.
- Design tokens, typography, and spacing utilities defined in the design system.

### Key Entities *(include if feature involves data)*

- **ScoreSnapshot**: Aggregate of match status, runs and wickets, overs, run rates, target summary, timestamp, win odds.
- **ParticipantCard**: Representation of striker or non-striker including name, role, runs, balls, strike rate, recent delivery indicator.
- **BowlerSummary**: Active bowler metadata (name, overs, maidens, runs, wickets, economy, over progress).
- **OddsQuote**: Probability or market price with trend direction and timestamp.
- **StalenessSignal**: Tiered freshness state with messaging and retry action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: >=90% of usability test participants can verbalize score, wickets, overs, target or required run rate, and odds within 3 seconds of page load.
- **SC-002**: Scroll-depth analytics show >=95% of desktop sessions keep the hero fully visible (no scroll) for the first 10 seconds of engagement.
- **SC-003**: Live update latency between backend timestamp and hero display remains <=5 seconds for 95% of events during monitored matches.
- **SC-004**: Post-launch survey indicates >=80% of respondents rate the hero clarity >=4 out of 5.
- **SC-005**: Staleness warnings resolve successfully within 2 retries for >=85% of incidents logged.

## Success Validation Strategy

1. Conduct moderated usability tests with live-match prototypes to capture glance comprehension time.
2. Instrument scroll depth, staleness, and odds visibility analytics events and review after launch week.
3. Run automated accessibility and performance audits focused on hero region prior to release.
4. Shadow at least one live match to confirm update cadence, player swaps, and staleness behavior in production-like conditions.
5. Collect qualitative feedback from power users (analysts and bettors) within 72 hours post-launch.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Odds feed intermittently unavailable | Hero loses differentiating value | Display clear placeholder, log outages, allow manual disable per jurisdiction. |
| Limited vertical space on smaller laptops due to banners | Hero may overflow and require scroll | Introduce condensed mode thresholds and prioritize content stacking. |
| Rapid player changes cause layout jitter | Hurts readability | Use reserved slots with animation dampening per reduced-motion settings. |
| Data discrepancies between odds and score feed | Confuses users | Timestamp and source label each data block, trigger alerts on mismatch. |

## Out-of-Scope Confirmations

- No commitment to portrait mobile layout changes in this iteration.
- No redesign of downstream tabs (commentary, full scorecard) beyond entry points.
- No new backend contracts; the frontend adapts to existing payloads.

## Version

Spec Draft v0.1 (2025-11-16)
