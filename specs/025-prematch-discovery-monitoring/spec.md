# Feature Specification: Prematch Discovery Monitoring

**Feature Branch**: `025-prematch-discovery-monitoring`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: Roadmap phase narrowed to pre-discovery and monitoring only. `/cric-live/{slug}` remains canonical, Spec 023 stays untouched, and the first job is to prove whether upcoming canonical URLs already exist 12-48 hours before start, then trace hub SSR exposure, prematch page completeness, and the dashboard monitoring gap before any discovery logic edits.

## Current Evidence

- `https://www.crickzen.com/api/cricket-data/upcoming-matches` already returns future fixtures with persisted `externalMatchKey` values, so upcoming canonical slugs already exist in production data.
- Acceptance sample on 2026-06-18: Texas Super Kings vs Seattle Orcas is already public at `https://www.crickzen.com/cric-live/so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W` for a scheduled start of 2026-06-19 00:30 UTC / 2026-06-19 06:00 IST.
- The sample canonical page returns HTTP 200, self-canonicalizes, sets `robots=index,follow`, emits an H1, includes FAQ content, and emits `SportsEvent` structured data.
- The same sample is present in the match sitemap and in raw SSR HTML for `https://www.crickzen.com/cricket-schedule/today`.
- The same sample was not present in raw SSR HTML for `https://www.crickzen.com/`, `https://www.crickzen.com/matches`, `https://www.crickzen.com/live-score`, or `https://www.crickzen.com/live-score/today` at audit time.
- The current live-score hub SSR path falls back to sitemap slices on server render instead of using the live/upcoming feed directly, so hub exposure is not yet driven by a deliberate prematch selection rule.
- `tools/seo-dashboard` already exists, but its collector currently models `liveMatches` only and does not expose a dedicated upcoming 12-48 hour discovery sample set.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prove Upcoming Canonical URLs Already Exist Before Match Start (Priority: P1)

As an operator, I want proof that canonical upcoming match URLs already exist 12-48 hours before start so we do not waste Phase 025 on route creation work that production already handles.

**Why this priority**: The next implementation decision changes completely depending on whether the gap is URL creation or discovery/completeness.

**Independent Test**: Pull a 12-48 hour upcoming fixture from production, audit the canonical `/cric-live/{slug}` page, and verify that it exists with the expected SEO envelope.

**Acceptance Scenarios**:

1. **Given** a fixture in the next 12-48 hours exists in the upcoming feed, **When** its canonical page is requested, **Then** the page must return HTTP 200 on `/cric-live/{slug}`.
2. **Given** that same prematch canonical page, **When** raw HTML is audited, **Then** it must self-canonicalize and expose indexable robots metadata.
3. **Given** that same prematch canonical page, **When** sitemap membership is checked, **Then** the canonical URL must already be represented in the match sitemap or be flagged explicitly as a discovery gap.

---

### User Story 2 - Trace Which SSR Hubs Actually Expose Prematch URLs (Priority: P1)

As an operator, I want to know which SSR hubs expose a prematch canonical URL and which do not so we can distinguish "URL exists" from "URL is discoverable."

**Why this priority**: Discovery, not existence, now looks like the likely ranking bottleneck.

**Independent Test**: Audit raw HTML for the homepage, `/matches`, live-score hubs, schedule hubs, and sitemap fallback output against the same acceptance sample.

**Acceptance Scenarios**:

1. **Given** a known prematch canonical URL, **When** the main hub pages are audited in raw SSR HTML, **Then** each hub must be marked as present or absent for that exact URL.
2. **Given** a hub exposes a prematch URL only through fallback sitemap slices, **When** the SSR selection path is traced, **Then** the implementation notes must distinguish fallback visibility from feed-driven visibility.
3. **Given** a hub does not expose the prematch canonical URL, **When** the monitoring output is rendered, **Then** that absence must be visible without needing manual HTML inspection.

---

### User Story 3 - Verify Prematch Page Completeness Before Discovery Expansion (Priority: P1)

As an operator, I want to verify that upcoming match pages already have enough prematch SSR content so discovery improvements send crawlers to a worthwhile destination.

**Why this priority**: Better hub discovery is not useful if the target prematch page is too thin or missing key machine-readable signals.

**Independent Test**: Audit raw HTML and structured data for a 12-48 hour prematch sample page and verify the required metadata, structured data, and visible context.

**Acceptance Scenarios**:

1. **Given** a prematch canonical page, **When** raw HTML is audited, **Then** title, description, H1, canonical, and robots metadata must all be present.
2. **Given** a prematch canonical page, **When** structured data is audited, **Then** `SportsEvent` and start-date context must be present without pretending the page is a live commentary surface.
3. **Given** toss, playing XI, venue, or result details are not fully confirmed yet, **When** the page is rendered, **Then** honest placeholders or fallback context must still make the page materially useful.

---

### User Story 4 - Extend Monitoring To Upcoming Discovery Without Changing Canonicals (Priority: P2)

As an operator, I want the SEO dashboard to monitor upcoming discovery samples separately from live pages so we can watch prematch visibility without changing route or canonical policy.

**Why this priority**: The existing dashboard proves live-match SEO health, but it does not yet show whether future URLs are public, discoverable, and complete before first ball.

**Independent Test**: Run the local dashboard API and verify that it returns a dedicated upcoming monitoring section with sample URLs, sitemap presence, hub exposure, and prematch completeness proof.

**Acceptance Scenarios**:

1. **Given** the dashboard collector runs, **When** it builds the response payload, **Then** it must include upcoming prematch samples in a distinct section instead of folding them into `liveMatches`.
2. **Given** an upcoming sample is discoverable only through some hubs, **When** the dashboard renders it, **Then** the UI must show the exact hub coverage footprint.
3. **Given** credentials or rate-limited checks are unavailable, **When** the dashboard renders, **Then** it must degrade safely without changing any production application service.

## Edge Cases

- The best 12-48 hour sample may change daily, so the monitoring window must choose samples dynamically rather than hardcode one slug forever.
- A prematch page can be valid and indexable even when toss, playing XI, or venue details are still partial or unknown.
- A hub can appear to expose a fixture because of sitemap fallback ordering rather than true schedule-aware selection.
- Some pages may expose `SportsEvent` before live play begins, while `LiveBlogPosting` should remain absent until the page genuinely behaves like a live-update surface.
- The next useful sample may start near midnight UTC, so audits must record exact timestamps instead of ambiguous "today" or "tomorrow" language.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Phase 025 MUST not change the canonical public match route family from `/cric-live/{slug}`.
- **FR-002**: Phase 025 MUST not modify or reopen Spec 023 scope.
- **FR-003**: The monitoring workflow MUST sample upcoming fixtures in the next 12-48 hours from production data.
- **FR-004**: Each sampled upcoming fixture MUST report canonical URL existence, HTTP status, canonical tag, robots tag, and sitemap presence.
- **FR-005**: Each sampled upcoming fixture MUST report raw SSR hub exposure across the homepage, `/matches`, live-score hubs, and schedule hubs.
- **FR-006**: The implementation notes MUST distinguish feed-driven SSR selection from sitemap-fallback exposure when tracing hub behavior.
- **FR-007**: Each sampled upcoming fixture MUST report prematch completeness signals including title, description, H1, FAQ presence, `SportsEvent` presence, and visible timing or venue context when available.
- **FR-008**: The monitoring data model MUST expose upcoming prematch samples separately from current live matches.
- **FR-009**: External checks MUST be cached or rate-limited so dashboard refreshes do not create avoidable pressure on GSC or production endpoints.
- **FR-010**: The phase MUST keep a durable acceptance-sample workflow so future audits can be repeated with the next valid 12-48 hour fixture.
- **FR-011**: Monitoring output MUST make "URL exists but is undiscoverable" visibly different from "URL does not exist."
- **FR-012**: Phase verification MUST use raw production HTML and exact fixture timestamps, not only local assumptions.

### Key Entities

- **Prematch Sample**: A canonical match URL for a fixture starting 12-48 hours in the future.
- **Hub Coverage Snapshot**: The presence or absence of a prematch sample URL in raw SSR HTML across selected discovery hubs.
- **Prematch Completeness Proof**: Evidence that a prematch canonical page already includes meaningful SEO and content signals before the match starts.
- **Upcoming Discovery Monitor**: A dashboard or API payload that reports prematch samples separately from live-match SEO health.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least one live production sample in the 12-48 hour window is proven to exist on its canonical `/cric-live/{slug}` URL before match start.
- **SC-002**: The repo records which audited hubs do and do not expose that sample in raw SSR HTML.
- **SC-003**: The repo records whether the sample prematch page already contains the required metadata and `SportsEvent` proof.
- **SC-004**: The planned monitoring model separates upcoming discovery samples from current live-match reporting.
- **SC-005**: Phase 025 finishes its discovery pass without changing canonicals, routes, or Spec 023 behavior.
