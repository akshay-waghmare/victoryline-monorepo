# Feature Specification: Series Discovery Hub Enrichment

**Feature Branch**: `036-series-discovery-hub-enrichment`  
**Created**: 2026-06-28  
**Status**: Draft  
**Input**: User request: "ok lets implemnt this" after confirming the prematch discovery strategy and asking to include series because those intents drive traffic.

## User Scenarios & Testing

### User Story 1 - Series hub exposes upcoming canonical match links (Priority: P1)

As a search engine and as a user browsing series intent, I need the `/series` page to expose real canonical upcoming match URLs so the series surface supports prematch discovery before the match starts.

**Why this priority**: The current `/series` surface is indexable but weak as a discovery hub because it mostly lists series records and does not surface enough canonical match anchors.

**Independent Test**: Render `/series` with a mixed match feed and verify the raw HTML contains grouped upcoming `/cric-live/{slug}` anchors tied to real series labels.

**Acceptance Scenarios**:

1. **Given** upcoming matches exist across multiple series, **When** `/series` renders, **Then** it shows grouped canonical upcoming match links with series labels and match timing copy.
2. **Given** there are no discovery-window upcoming matches, **When** `/series` renders, **Then** it falls back gracefully without breaking the existing series list experience.
3. **Given** duplicate or repeated feed rows appear, **When** the page builds its discovery section, **Then** each canonical match URL is listed only once.

---

### User Story 2 - `/series` becomes part of the monitored crawl path (Priority: P1)

As an operator, I want the SEO monitor to recognize `/series` as a real discovery hub so we can prove whether upcoming match URLs are present there before match start.

**Why this priority**: If `/series` is enriched but not monitored, we still cannot tell whether the surface is actually helping the prematch crawl path.

**Independent Test**: Feed a mocked hub HTML map into the collector and verify the monitor can mark a match as linked from `/series`.

**Acceptance Scenarios**:

1. **Given** a canonical match URL is present in `/series` HTML, **When** the dashboard collector evaluates that URL, **Then** it records `/series` as a discovery hub.
2. **Given** a monitored URL is not present in `/series`, **When** the collector evaluates that URL, **Then** the dashboard shows the series-hub check as missing rather than silently ignoring that surface.

---

### User Story 3 - `/series` is included in static sitemap coverage (Priority: P2)

As a crawler, I need the `/series` hub to be part of the static sitemap set so the discovery surface itself is consistently advertised.

**Why this priority**: The series hub cannot reliably help discovery if the page itself is omitted from the sitemap.

**Independent Test**: Generate sitemap partition 1 and verify `/series` appears among the static routed pages.

**Acceptance Scenarios**:

1. **Given** sitemap partition 1 is generated, **When** static hub URLs are written, **Then** `https://www.crickzen.com/series` is included.

---

## Requirements

### Functional Requirements

- **FR-001**: The `/series` page MUST render a discovery section with grouped upcoming canonical `/cric-live/{slug}` links sourced from the match feed.
- **FR-002**: The discovery section MUST prioritize upcoming matches using the existing prematch discovery ordering rather than a raw or arbitrary feed order.
- **FR-003**: The `/series` discovery section MUST group links by a stable series label and cap the number of visible groups and links per group to keep the surface clean.
- **FR-004**: The `/series` page MUST continue to support the current searchable series list and overlay detail workflow.
- **FR-005**: The `/series` page structured data MUST include the related discovery links and the surfaced canonical match links.
- **FR-006**: The SEO dashboard collector MUST treat `/series` as a discovery hub and expose that status in monitored rows.
- **FR-007**: The sitemap service MUST include `/series` in the static sitemap path list.

### Key Entities

- **Series discovery group**: A lightweight grouping of upcoming canonical match URLs under one visible series label.
- **Discovery hub**: A page whose raw SSR HTML contains crawlable canonical `/cric-live/{slug}` anchors used to support prematch discovery.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `/series` raw HTML contains at least one grouped canonical upcoming match link whenever upcoming feed data exists.
- **SC-002**: The SEO dashboard can explicitly report whether a monitored URL is linked from `/series`.
- **SC-003**: Static sitemap partition 1 includes `https://www.crickzen.com/series`.
