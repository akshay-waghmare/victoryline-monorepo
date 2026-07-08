# Feature Specification: Query Surface Authority And Link Graph Hardening

**Feature Branch**: `041-query-surface-authority-and-link-graph-hardening`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User request: "create serious specs and plan to tackle all of these in detail research the existing codebase thoroughly when doing that then create tasks and implemtn"

## Summary

Crickzen has already done substantial work on canonical `/cric-live/{slug}` pages, discovery hubs, series discovery, freshness-support routes, and lifecycle SEO. The remaining gap is no longer "does the page exist?" It is "does each query family have the right winning surface, and are those surfaces connected strongly enough for crawlers and users to move between them?"

This phase formalizes that authority model and hardens the internal-link graph around it.

It focuses on four missing deltas:

1. explicit query-to-surface ownership
2. stronger internal-link clusters between hubs, canonical match pages, freshness pages, and archive/result surfaces
3. better retention and discoverability for completed/result coverage
4. a documented non-code backlink and linkable-asset strategy so technical SEO is not treated as the whole program

## Codebase Research Snapshot

The existing repo already covers important pieces:

- `specs/032-canonical-match-intent-capture/`
  - canonical match page owns commentary, scorecard, lineups, toss, and live-score intent
- `specs/034-match-lifecycle-discovery-surface-seo/`
  - lifecycle discovery across upcoming, live, and completed
- `specs/036-series-discovery-hub-enrichment/`
  - `/series` exposes grouped upcoming canonical match links
- `specs/037-early-upcoming-discovery-window/`
  - prematch discovery moved earlier to `30-120h`
- `specs/038-match-news-freshness-support/`
  - preview, live-update, and result-support route family introduced
- `specs/039-match-freshness-authority-hardening/`
  - richer freshness page summaries, timestamps, and schema guards

Live code already confirms:

- freshness page routes exist:
  - `/cricket-match-preview/{slug}`
  - `/cricket-live-updates/{slug}`
  - `/cricket-match-report/{slug}`
- freshness link builders exist in:
  - `apps/frontend/src/app/seo/match-freshness-links.ts`
- canonical match pages already emit related freshness-support item lists and visible links:
  - `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- the homepage and `/matches` already expose freshness links, but only as a narrow one-link-per-state sample:
  - `apps/frontend/src/app/home/home.component.ts`
  - `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.ts`
- `/series` exposes canonical upcoming links, but not explicit preview-support links:
  - `apps/frontend/src/app/features/stats/series-page/series-page.component.ts`

This phase therefore should **not** reopen canonical policy or invent a new route family. It should deepen authority and discovery around the existing surfaces.

## Explicit Query Ownership Matrix

This phase treats query ownership as a contract, not as a loose guideline.

| Surface | Primary query lane | What it should own | What it should not try to own |
| --- | --- | --- | --- |
| Canonical `/cric-live/{slug}` | match entity + utility intent | live score, scorecard, commentary, toss, lineups, match details | generic freshness-news snippets, article recap phrasing, broad tournament list intent |
| `/cricket-match-preview/{slug}` | prematch support intent | preview, pitch report, probable XI, weather, toss timing, build-up context | final result, live ball-by-ball utility, archive intent |
| `/cricket-live-updates/{slug}` | freshness-heavy match-day intent | live updates, latest developments, key moments, today-match phrasing | replacing the canonical scorecard/commentary utility page |
| `/cricket-match-report/{slug}` | post-match support intent | result, highlights, recap, post-match score summary | live utility or prematch build-up intent |
| `/matches` | broad lifecycle hub intent | browse live, upcoming, and completed matches | pretending to be the best answer for one match-specific long-tail query |
| `/series` | tournament and series intent | competition overview, upcoming fixtures by series, paths into canonical and preview surfaces | primary live-score ownership for individual matches |
| `/live-score/archive` and recent-results paths | completed retention intent | retained result discovery and archive navigation | live-match freshness or prematch discovery intent |

### Ownership Rules

- The canonical match page remains the strongest all-purpose entity page.
- Freshness-support pages complement the canonical page and should link back to it prominently.
- Hubs should distribute users and crawlers into the right surfaces instead of stuffing all query language into one page type.
- When two surfaces can serve the same query family, the phase should prefer the one with clearer user intent and stronger existing crawl paths rather than inventing a new URL family.

## User Scenarios & Testing

### User Story 1 - Every Query Family Has A Primary Surface (Priority: P1)

As the team, we want a stable query-ownership contract so we do not keep forcing different intents onto the same page type by habit.

**Why this priority**: This is the strategic gap behind many smaller SEO decisions.

**Independent Test**: Review one sample fixture and verify the canonical page, preview page, live-update page, result page, matches hub, and series surface each have a distinct role that matches their titles, H1s, links, and summaries.

**Acceptance Scenarios**:

1. **Given** a canonical `/cric-live/{slug}` page renders, **When** its intent is reviewed, **Then** it remains the primary answer for live score, scorecard, commentary, toss, lineups, and match details.
2. **Given** a preview page renders, **When** its intent is reviewed, **Then** it owns build-up queries such as preview, pitch, weather, toss timing, and probable XI.
3. **Given** a live-update page renders, **When** its intent is reviewed, **Then** it owns freshness-heavy live-update and match-day development phrasing.
4. **Given** a result page renders, **When** its intent is reviewed, **Then** it owns result, highlights, recap, and post-match follow-up phrasing.
5. **Given** a hub or series surface renders, **When** its intent is reviewed, **Then** it owns navigational/listing intent rather than pretending to be the canonical answer for every match query.

### User Story 2 - Hubs Expose More Than One Token Freshness Link (Priority: P1)

As a crawler, I want the homepage and matches hub to expose a richer, real cluster of freshness-support links so discovery does not depend on one token sample URL per lifecycle bucket.

**Why this priority**: The current implementation is present but shallow.

**Independent Test**: Inspect homepage and `/matches` SSR HTML and verify freshness-support links are exposed for multiple real fixtures rather than only one per state.

**Acceptance Scenarios**:

1. **Given** multiple upcoming discovery matches exist, **When** homepage or `/matches` HTML is inspected, **Then** more than one preview-support link can be present.
2. **Given** multiple live discovery matches exist, **When** homepage or `/matches` HTML is inspected, **Then** more than one live-update support link can be present.
3. **Given** multiple recent completed matches exist, **When** homepage or `/matches` HTML is inspected, **Then** more than one result-support link can be present.
4. **Given** duplicate matches appear across multiple sections, **When** the support-link list is built, **Then** duplicate freshness URLs are deduplicated cleanly.

### User Story 3 - Series Intent Can Flow Into Preview Intent (Priority: P1)

As a crawler and as a user, I want the `/series` surface to connect not only to canonical match pages but also to the preview-support layer for upcoming fixtures when relevant.

**Why this priority**: Series pages attract tournament-intent traffic and should help distribute it into prematch query lanes.

**Independent Test**: Inspect `/series` HTML and verify grouped upcoming fixtures can expose both canonical match links and explicit preview-support links.

**Acceptance Scenarios**:

1. **Given** an upcoming fixture appears in the series discovery window, **When** its card renders, **Then** the user can reach the canonical match page and the preview-support page from the series surface.
2. **Given** the series page renders grouped discovery content, **When** raw HTML is inspected, **Then** those preview links are visible SSR anchors.
3. **Given** no canonical slug can be derived for a fixture, **When** series discovery renders, **Then** it does not emit a broken preview-support URL.

### User Story 4 - Completed Result Coverage Stays In The Crawl Graph (Priority: P1)

As a crawler and as a user, I want result-support pages to remain connected after the live window so completed-match value compounds instead of dropping out of discovery.

**Why this priority**: Post-match queries are a realistic long-tail growth lane.

**Independent Test**: Inspect hub and canonical surfaces for completed fixtures and verify result-support links remain reachable.

**Acceptance Scenarios**:

1. **Given** a match is completed, **When** homepage and `/matches` discovery areas are inspected, **Then** result-support links can still be surfaced for recent completed fixtures.
2. **Given** a completed canonical match page renders, **When** related links are inspected, **Then** it points toward retained result/highlights support.
3. **Given** archive or recent-results intent is present, **When** internal-link logic is reviewed, **Then** result-support pages are treated as first-class retained assets rather than disposable live leftovers.

### User Story 5 - Backlink And Linkable-Asset Work Is Explicitly Planned (Priority: P2)

As the team, we want the SEO roadmap to include the non-code authority layer so we do not confuse technical readiness with complete SEO strategy.

**Why this priority**: The Ahrefs research made this gap explicit.

**Independent Test**: Review the spec tasks and verify there is a documented backlink and linkable-asset workstream, even if it is not fully implemented in code in this phase.

**Acceptance Scenarios**:

1. **Given** the phase plan is reviewed, **When** off-page SEO is considered, **Then** it includes a concrete backlog for linkable assets such as widgets, datasets, or embeddable scorecards.
2. **Given** the coding slice ships first, **When** work is handed off, **Then** backlink strategy is preserved as a deliberate follow-up rather than forgotten.

## Linkable-Asset Backlog

This phase does not fully implement off-page SEO, but it does need a durable backlog so the authority layer is not lost.

### Priority 1 candidates

- Embeddable live-score widget for publishers covering local leagues and small tournaments
- Embeddable scorecard block for completed matches
- Series fixture and results widgets
- Clean match-result recap snippets that can be referenced by publishers or fan blogs

### Priority 2 candidates

- Public series datasets and standings snapshots
- Historical match-result exports by tournament
- Lightweight schedule API or feed for partner use

### Priority 3 candidates

- Tournament landing pages designed as reference resources
- Team and player stat comparison snippets worth citing

### Backlink quality guardrails

- Prefer cricket, sports, news, league, and club relevance over raw domain count
- Prefer editorially placed references over profile/comment spam
- Prefer reusable publisher tools over one-off outreach pages
- Do not rely on paid-link patterns that create long-term risk

## Out Of Scope

- canonical route migration away from `/cric-live/{slug}`
- self-canonical child routes for `/scorecard` or `/commentary`
- a new standalone result route family beyond the existing freshness-support layer
- full CMS or newsroom workflow implementation
- automated backlink acquisition systems
- broad redesign of all match surfaces

## Edge Cases

- A hub may only have one qualifying support page at some moments; the acceptance criteria should be read as "support multiple when available," not as "always force multiple."
- A series card should not emit preview links for matches lacking a stable canonical slug.
- A completed match may still rank best on the canonical page for some exact-match utility queries even when a result-support page exists.
- A freshness-support page can be technically valid but still not deserve stronger surfacing if the content is thin.

## Requirements

### Functional Requirements

- **FR-001**: The phase MUST preserve `/cric-live/{slug}` as the canonical match entity URL.
- **FR-002**: The phase MUST define an explicit query-to-surface ownership model covering canonical match, preview, live-update, result, matches hub, and series hub surfaces.
- **FR-003**: Homepage freshness-support discovery MUST support multiple real support URLs across lifecycle buckets instead of only one token sample per state when multiple qualifying matches exist.
- **FR-004**: `/matches` freshness-support discovery MUST support multiple real support URLs across lifecycle buckets instead of only one token sample per state when multiple qualifying matches exist.
- **FR-005**: Freshness-support discovery lists MUST deduplicate repeated support URLs.
- **FR-006**: `/series` MUST be able to expose explicit preview-support links for qualifying upcoming fixtures alongside canonical match links.
- **FR-007**: Completed/result support pages MUST remain connected through at least one retained discovery path after the live window.
- **FR-008**: This phase MUST document the non-code backlink and linkable-asset strategy as part of the SEO roadmap.
- **FR-009**: Verification MUST prove SSR-visible support links on the affected hub surfaces and series surface.
- **FR-010**: The phase MUST preserve the lifecycle-appropriate handoff between canonical page, preview-support page, live-update page, result-support page, and archive surfaces.
- **FR-011**: The phase MUST keep support-link output capped and deduplicated so discovery improvements do not turn into unreadable link dumps.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Homepage SSR HTML exposes more than one freshness-support URL when multiple qualifying fixtures exist.
- **SC-002**: `/matches` SSR HTML exposes more than one freshness-support URL when multiple qualifying fixtures exist.
- **SC-003**: `/series` SSR HTML exposes preview-support links for qualifying upcoming fixtures.
- **SC-004**: Query ownership across canonical, preview, live-update, result, and hub surfaces is documented in one explicit phase artifact.
- **SC-005**: The phase leaves a durable backlink and linkable-asset backlog instead of treating technical SEO as the full strategy.
- **SC-006**: The implemented support-link clusters remain deduplicated and lifecycle-appropriate in code review and runtime verification.
