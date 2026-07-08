# Feature Specification: Early Upcoming Discovery Window

**Feature Branch**: `037-early-upcoming-discovery-window`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User request: "update our submission strategy and ensure we are scraping upcoming url for next 4 or 5 days because we'll need them honestly and submit as early as possible"

## Summary

Crickzen's current prematch SEO stack can discover and submit upcoming match URLs, but the operational window is still biased toward near-term fixtures. Recent evidence shows Google often needs roughly 16-50 hours after strong discovery signals before a crawl lands, so relying on a 12-48 hour mindset is too late for many matches.

This phase moves the default discovery and submission strategy earlier:

- treat `30-120h` before start as the primary early-discovery window
- keep live matches first, but actively prepare upcoming canonical match URLs for the next 4-5 days
- surface those earlier upcoming URLs in SSR discovery hubs and the operator dashboard

## User Scenarios & Testing

### User Story 1 - Indexer targets early upcoming URLs (Priority: P1)

As an operator, I want the automatic indexing scheduler to consider healthy upcoming URLs for roughly the next 4-5 days so discovery starts before the match-day crunch.

**Independent Test**: Run the scheduler with live, near-term upcoming, 30-120 hour upcoming, and >120 hour upcoming fixtures. The first three should be eligible according to policy, while the far-future one should be skipped.

**Acceptance Scenarios**:

1. **Given** a live match exists, **When** the scheduler runs, **Then** the live match is still prioritized first.
2. **Given** an upcoming match starts within `30-120h`, **When** the scheduler runs, **Then** the match is eligible for indexing submission.
3. **Given** an upcoming match starts beyond `120h`, **When** the scheduler runs, **Then** it is excluded from the automatic indexing window.

### User Story 2 - Discovery hubs surface the early window (Priority: P1)

As a crawler, I need SSR hubs such as the homepage, `/matches`, and `/series` to surface canonical upcoming URLs from the next 4-5 days, not only the tighter next-day window.

**Independent Test**: Render those discovery sections with mixed upcoming fixtures and verify 30-120 hour matches appear ahead of same-day catch-up fixtures.

**Acceptance Scenarios**:

1. **Given** a fixture starts in roughly 36 hours, **When** homepage or `/matches` discovery links render, **Then** the canonical URL remains visible in the prioritized upcoming discovery set.
2. **Given** a fixture starts in 2 hours and another starts in 60 hours, **When** discovery links render, **Then** the earlier-window strategy still keeps the 60-hour page in the prioritized set rather than trimming it out.

### User Story 3 - Operator dashboard reflects the earlier strategy (Priority: P1)

As an operator, I want the dashboard queue and summary labels to reflect the early submission strategy so the monitored upcoming sample matches the new `30-120h` operating window.

**Independent Test**: Run the collector with upcoming fixtures across multiple lead times and verify the sample window and queue logic prefer the early-discovery band.

**Acceptance Scenarios**:

1. **Given** the collector samples upcoming fixtures, **When** it builds the default window, **Then** the window is `30-120h` rather than `12-48h`.
2. **Given** a healthy unknown URL is inside the `30-120h` band, **When** the scorer runs, **Then** it receives a strong early-submission reason rather than being treated as only a late emergency.

## Requirements

### Functional Requirements

- **FR-001**: The automatic live-match indexing scheduler MUST continue prioritizing live URLs ahead of upcoming URLs.
- **FR-002**: The scheduler MUST include upcoming canonical match URLs whose scheduled start is within the next `120` hours by default.
- **FR-003**: The scheduler MUST prefer the `30-120h` early-discovery band ahead of shorter-horizon catch-up upcoming URLs when ordering eligible upcoming submissions.
- **FR-004**: SSR discovery surfaces that currently prioritize a prematch upcoming window MUST switch their default prioritized band from `12-48h` to `30-120h`.
- **FR-005**: The SEO dashboard collector MUST default its upcoming sample window to `30-120h`.
- **FR-006**: The dashboard manual-submission scoring MUST explicitly reward URLs inside the `30-120h` early-discovery band.
- **FR-007**: Documentation of the prematch discovery strategy MUST describe the new early window and make clear that manual submission is still a small exception path rather than a blanket-all-URLs action.

## Key Entities

- **Early discovery window**: Upcoming canonical match URLs scheduled to start between `30` and `120` hours from now.
- **Catch-up window**: Upcoming canonical match URLs scheduled to start sooner than `30` hours, where submission is still valuable but already late relative to the preferred strategy.

## Success Criteria

- **SC-001**: Live scheduler tests prove 30-120 hour upcoming matches are eligible while >120 hour upcoming matches are skipped.
- **SC-002**: Homepage, `/matches`, and `/series` prioritized upcoming discovery sets include 30-120 hour fixtures.
- **SC-003**: Dashboard default labels and queue logic reflect the `30-120h` window consistently.
