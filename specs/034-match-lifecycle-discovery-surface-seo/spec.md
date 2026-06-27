# Feature Specification: Match Lifecycle Discovery And Surface SEO

**Feature Branch**: `034-match-lifecycle-discovery-surface-seo`
**Created**: 2026-06-27
**Status**: Draft
**Input**: User description: "Solve this properly with Spec Kit. Ignore the unfinished series page for now. Matches should be discoverable before the match starts, during live, and after completion. Match info, scorecard, and lineups should also be SEO-fied."

## Current Evidence

- On 2026-06-27, production checks of `https://www.crickzen.com/`, `https://www.crickzen.com/matches`, `https://www.crickzen.com/live-cricket-score`, `https://www.crickzen.com/live-score`, and `https://www.crickzen.com/cricket-schedule/today` all returned HTTP `200` with self-canonicals, but each page exposed `0` JSON-LD blocks.
- On 2026-06-27, a sampled canonical match page from the public sitemap (`https://www.crickzen.com/cric-live/ire-w-vs-wi-w-27th-match-womens-t20-world-cup-2026-match-updates-X1F`) returned HTTP `200`, self-canonicalized, set `robots=index,follow`, and exposed `3` JSON-LD blocks including `SportsEvent`.
- Existing canonical policy keeps `/cric-live/{slug}` as the single indexable match URL and folds legacy or child-route variants back to the base match page.
- Existing match-page SSR already includes support zones for commentary, match details, scorecard, and lineups, but the lifecycle discovery work is still uneven across homepage, `/matches`, live-score hubs, and archive/result hubs.
- Existing breadcrumb and internal-link semantics are still weaker than they should be for a durable entity graph because the strongest real surfaces today are lifecycle hubs and canonical match pages, while `/series` is only partially developed and not yet a fully-enriched SEO entity.
- The saved production audit from 2026-06-17 still reported an orphan-graph gap of `2037` sitemap match URLs versus only `16` direct discovery links in the sampled SSR graph, showing that sitemap presence alone is still not enough.
- `/series` is important for traffic intent and should be included in this phase as a lightweight series-intent surface, but full series-page completion and deep enrichment remain later work.

## User Scenarios & Testing

### User Story 1 - Upcoming, Live, And Completed Matches Stay Discoverable Through Raw HTML (Priority: P1)

As a search engine, I want canonical match URLs to be reachable from crawlable SSR hubs before the match starts, while it is live, and after it finishes, so match discovery does not depend only on sitemaps or direct URLs.

**Why this priority**: Lifecycle discoverability is the main business goal. If the canonical page exists but is not linked early enough, rankings arrive too late to matter.

**Independent Test**: Pick one production sample in each lifecycle state (`upcoming`, `live`, `completed`) and verify the exact `/cric-live/{slug}` URL appears in the intended hub HTML.

**Acceptance Scenarios**:

1. **Given** a fixture starting in the next 12-48 hours, **When** raw SSR HTML is inspected for `/cricket-schedule/today` and the strongest discovery hub, **Then** the exact canonical `/cric-live/{slug}` URL is present before first ball.
2. **Given** a live match, **When** raw SSR HTML is inspected for homepage, `/matches`, or a live-score hub, **Then** the exact canonical `/cric-live/{slug}` URL is present while the match is live.
3. **Given** a recently completed match, **When** raw SSR HTML is inspected for `/matches` or an archive/result hub, **Then** the exact canonical `/cric-live/{slug}` URL is present after completion.
4. **Given** a lifecycle sample URL, **When** hub coverage is audited, **Then** the result clearly distinguishes "present in hub HTML" from "present only in sitemap."

### User Story 2 - The Canonical Match Page Answers Match-Info, Scorecard, And Lineup Intent In SSR (Priority: P1)

As a search engine, I want the single canonical match page to expose clear, fixture-specific SSR sections for match info, scorecard, and lineups so the page can satisfy those intents without needing separate canonical child routes.

**Why this priority**: We are intentionally keeping one canonical match URL. That only works if the one page strongly captures those support intents in the initial HTML.

**Independent Test**: Fetch raw SSR HTML for a sampled canonical match page and verify fixture-specific section headings, summaries, and jump targets for match info, scorecard, and lineups.

**Acceptance Scenarios**:

1. **Given** a canonical match page, **When** raw SSR HTML is inspected, **Then** match-info, scorecard, and lineups sections each expose fixture-specific headings and summaries.
2. **Given** a canonical match page with lineup data not yet available, **When** raw SSR HTML is inspected, **Then** the lineups section still exposes honest context instead of disappearing or emitting fake claims.
3. **Given** a canonical match page with scorecard data not yet available, **When** raw SSR HTML is inspected, **Then** the scorecard section still exposes honest intent text and does not weaken the page topic.
4. **Given** commentary, match-info, scorecard, and lineups support copy, **When** a crawler reads the HTML, **Then** the exact fixture is named consistently across those surfaces.

### User Story 3 - Discovery Hubs Expose Machine-Readable SEO Signals Instead Of Zero Schema (Priority: P1)

As a search engine, I want the main discovery hubs to expose honest structured data and breadcrumb context so those hubs are more than plain link collections.

**Why this priority**: The current hubs return `0` JSON-LD in production, which weakens the lifecycle graph and leaves too much semantic work to match pages alone.

**Independent Test**: Fetch raw HTML for homepage, `/matches`, and at least one live-score or schedule hub and verify non-zero structured data output that matches visible content.

**Acceptance Scenarios**:

1. **Given** a lifecycle discovery hub, **When** raw HTML is inspected, **Then** it exposes at least one structured-data block that matches the visible page purpose.
2. **Given** a hub contains FAQ content, **When** structured data is emitted, **Then** it reflects only real visible FAQ content from that page.
3. **Given** a hub lists canonical match links, **When** structured data is emitted, **Then** it represents the visible collection honestly and does not fabricate child pages or fake live events.
4. **Given** the hub is sparse because the feed is thin, **When** it renders, **Then** the structured data degrades safely instead of emitting empty or misleading objects.

### User Story 4 - Breadcrumbs, Series Links, And Internal Links Form An Honest Match Entity Graph (Priority: P1)

As a search engine, I want breadcrumbs, series links, and internal links to reflect real reachable lifecycle surfaces around a match so the canonical page sits inside an honest entity graph instead of behaving like a mostly isolated leaf.

**Why this priority**: The repo should start capturing series intent now because those queries can drive traffic, but it must do that honestly without pretending the full series SEO surface is already complete.

**Independent Test**: Inspect raw SSR HTML for a sampled match page and at least two hubs, then verify that breadcrumbs and internal links point only to real reachable lifecycle surfaces.

**Acceptance Scenarios**:

1. **Given** a canonical match page, **When** breadcrumbs are rendered, **Then** they use only real reachable destinations and do not imply fully-built entity pages we do not have yet.
2. **Given** a match has a reliable series label or series reference, **When** the page renders, **Then** it links into the current `/series` surface in a way that captures series intent without overstating completeness.
3. **Given** a canonical match page, **When** related internal links are rendered, **Then** they connect the page back to real schedule, live-score, matches, series, or archive surfaces as appropriate for the lifecycle state.
4. **Given** a completed match page, **When** its support links are inspected, **Then** the page still connects back into results/archive discovery rather than ending as an isolated former live page.

### User Story 5 - Completed Match URLs Remain Reachable As Results, Not Orphans (Priority: P1)

As a search engine, I want completed canonical match pages to remain linked from result/archive surfaces so finished matches keep discovery value after live play ends.

**Why this priority**: Post-match search demand is substantial, and completed pages should not disappear from the crawl graph once the live window passes.

**Independent Test**: Pick a recent completed match and verify it remains linked from `/matches` and an archive/result-oriented hub in raw SSR HTML.

**Acceptance Scenarios**:

1. **Given** a completed match page, **When** the archive hub is rendered, **Then** the canonical result URL is still linked.
2. **Given** a completed match page, **When** `/matches` is rendered, **Then** the page remains reachable from the results lane or recent-completed discovery area.
3. **Given** a completed match page, **When** the lifecycle graph is audited, **Then** the page is classified as a retained result page rather than a former live URL with no hub support.

### User Story 6 - Lifecycle SEO Proof Becomes Repeatable (Priority: P2)

As the team, we want repeatable lifecycle SEO proof so every rollout can show exact upcoming, live, and completed coverage in raw HTML and not rely on assumptions.

**Why this priority**: This work is SEO-sensitive and date-sensitive. The next rollout should be auditable with exact sample URLs and exact page states.

**Independent Test**: Run a repo audit command or script against sampled lifecycle URLs and confirm it reports hub coverage, structured data presence, and match-surface SSR proof.

**Acceptance Scenarios**:

1. **Given** the lifecycle audit runs, **When** it samples upcoming, live, and completed URLs, **Then** it reports page status, canonical, robots, hub coverage, and section-intent proof.
2. **Given** a hub or page regresses, **When** the audit runs again, **Then** the regression is visible without manual HTML searching.

## Edge Cases

- Upcoming fixtures may have no toss, venue confirmation, or playing XI yet; the page must stay honest while still being useful.
- Some completed matches may no longer be on the homepage; archive and results hubs must carry that lifecycle instead.
- Sparse match days may require fallback selection rules, but those rules must still expose real canonical URLs in SSR HTML.
- The phase must not turn `/commentary`, `/scorecard`, `/lineups`, or `/match-details` into self-canonical child pages.
- The current `/series` experience is incomplete, so this phase should seed and strengthen series intent without blocking on full series-page completion.

## Requirements

### Functional Requirements

- **FR-001**: This phase MUST keep `/cric-live/{slug}` as the canonical public match URL.
- **FR-002**: This phase MUST NOT start a `/live-cricket-score/{slug}` migration or make child tab routes self-canonical.
- **FR-003**: Homepage, `/matches`, and the intended lifecycle hubs MUST expose real crawlable `<a href="/cric-live/{slug}">` links for sampled upcoming, live, and completed matches in raw SSR HTML.
- **FR-004**: Discovery selection MUST include upcoming fixtures in the next 12-48 hours, current live fixtures, and recent completed fixtures as separate lifecycle buckets.
- **FR-005**: The lifecycle discovery graph MUST distinguish schedule-first discovery, live-score discovery, and result/archive retention rather than treating every hub the same.
- **FR-006**: The canonical match page MUST expose fixture-specific SSR sections for match info, scorecard, and lineups.
- **FR-007**: Match-info, scorecard, and lineups support copy MUST stay honest when the underlying data is missing or delayed.
- **FR-008**: The canonical match page MUST keep commentary, match info, scorecard, and lineups clearly attributable to the same exact fixture in the raw HTML.
- **FR-009**: The main lifecycle hubs MUST emit honest structured data instead of shipping `0` JSON-LD blocks.
- **FR-010**: Hub structured data MUST only represent visible breadcrumbs, visible FAQs, and visible match collections from that exact page.
- **FR-011**: Breadcrumbs on hubs and canonical match pages MUST use only real reachable destinations and MUST NOT imply entity completeness we do not yet have.
- **FR-012**: Where reliable series context exists, the lifecycle graph MUST include a lightweight series-intent path through the current `/series` surface so series queries can start accumulating support.
- **FR-013**: The canonical match page MUST link back into the real lifecycle graph through schedule, live-score, matches, series, or archive surfaces appropriate to the current lifecycle state.
- **FR-014**: Completed canonical match pages MUST remain linked from result or archive discovery surfaces after live play ends.
- **FR-015**: Verification tooling MUST report lifecycle hub coverage, breadcrumb validity, series-link behavior, and section-intent proof for upcoming, live, and completed sample URLs.
- **FR-016**: This phase MAY strengthen `/series` metadata, internal links, and intent capture, but MUST NOT block the rollout on full series-page completion or deep series data enrichment.

### Key Entities

- **Lifecycle Sample URL**: A sampled canonical `/cric-live/{slug}` page representing an upcoming, live, or completed fixture.
- **Lifecycle Hub**: A discovery surface such as homepage, `/matches`, `/live-score`, `/live-score/today`, `/live-cricket-score`, `/cricket-schedule/today`, or `/live-score/archive`.
- **Limited Match Entity Graph**: The set of real reachable surfaces around a match in this phase: lifecycle hubs, canonical match pages, result/archive retention paths, and the current lightweight `/series` intent surface.
- **Series Intent Surface**: The current `/series` experience used as an early traffic-capture and internal-link destination even before full series-page enrichment exists.
- **Surface Intent Block**: The fixture-specific SSR heading and summary for commentary, match info, scorecard, or lineups inside the canonical match page.
- **Hub Coverage Snapshot**: Proof that a lifecycle sample URL is present or absent in the raw SSR HTML of selected hubs.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A sampled upcoming fixture in the 12-48 hour window is present in raw SSR HTML on at least one schedule-first hub and one discovery hub before match start.
- **SC-002**: A sampled live fixture is present in raw SSR HTML on at least one live-oriented hub while the match is live.
- **SC-003**: A sampled completed fixture is present in raw SSR HTML on `/matches` and at least one archive/result-oriented hub after completion.
- **SC-004**: Sampled hub pages no longer return `0` JSON-LD blocks when fetched from production after rollout.
- **SC-005**: Sampled breadcrumbs and support links use only real reachable lifecycle destinations, including a lightweight series-intent path where reliable, and do not imply entity completeness we do not have yet.
- **SC-006**: The current `/series` surface is included in the internal-link and metadata plan strongly enough to support future enrichment without blocking this phase.
- **SC-007**: A sampled canonical match page exposes fixture-specific SSR headings and summaries for match info, scorecard, and lineups.
- **SC-008**: Lifecycle verification can be rerun with exact sampled URLs and reports hub coverage, breadcrumb validity, series-link behavior, and match-surface intent proof without manual inspection.
