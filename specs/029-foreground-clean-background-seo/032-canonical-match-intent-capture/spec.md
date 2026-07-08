# Feature Specification: Canonical Match Intent Capture

**Feature Branch**: `032-canonical-match-intent-capture`
**Created**: 2026-06-26
**Status**: Draft
**Input**: User description: "i think the canonical is also not capturing the live scorecard intent correctly when i saw many competetors do a research more thoroughly and see"

## Current Evidence

A production competitor audit and repo inspection on 2026-06-26 found that Crickzen already has a stable canonical match entity URL, but the canonical page under-signals the strongest live-match intents compared with competitors.

1. **Crickzen child routes are aliases, not real intent pages.**  
   The base match page, `/scorecard`, and `/commentary` all return HTTP 200 and fold to the same canonical URL. For the sample upcoming page `https://www.crickzen.com/cric-live/ind-vs-ire-1st-t20-india-tour-of-ireland-2026-match-updates-110U`, all three routes currently emit the same title (`Ireland vs India Live Score & Match Updates`), the same H1 (`Ireland vs India Live Score Today`), and the same base canonical URL. This means the child routes do not add distinct search intent.

2. **The canonical page metadata is too generic for live scorecard/commentary queries.**  
   `apps/frontend/src/app/seo/match-seo.service.ts` currently builds one generic live/upcoming title and H1 around "Live Score" and "Match Updates". It mentions scorecard/toss/playing XI in the description, but not in the title or H1 where competitors more aggressively capture scorecard/commentary intent.

3. **The page already has useful support copy, but it is not organized as a strong canonical intent layer.**  
   `apps/frontend/src/app/cricket-odds/cricket-odds.component.html` contains scorecard, venue, playing XI, and FAQ copy, but much of that support sits inside the Match Details tab. The raw SSR HTML for the sample upcoming page does show scorecard and playing XI phrasing, but it does not expose a stronger always-visible summary block for commentary, scorecard, and lineups together.

4. **The canonical page does not expose crawlable intent links in raw SSR HTML.**  
   The sampled Crickzen SSR HTML did not expose `/scorecard`, `/commentary`, `#scorecard`, or `#commentary` links. So even though the component code defines quick-link targets, the live raw HTML is not presenting those intent jumps in a way that can reinforce page structure.

5. **Competitors separate intent more clearly.**
   - **CREX** keeps the base match page canonical, but exposes a dedicated child scorecard URL with a scorecard-specific title and H1 while still folding canonical to the base page.
   - **Cricbuzz** exposes distinct live, scorecard, and full-commentary URL families, each with intent-specific titles and H1s.
   - **ESPNcricinfo** publicly exposes separate `live-cricket-score` and `full-scorecard` URL families as well, even though direct raw fetch proof was partially blocked by 403s during this audit.

6. **The current gap is not proof that Crickzen must split canonicals right now.**  
   Repo guardrails from Spec 023 and the current canonical policy already intentionally keep `/cric-live/{slug}` as the canonical match entity page. The safer next step is to make that base page much stronger for scorecard, commentary, lineup, toss, and match-info intent before deciding whether any child surface deserves self-canonical treatment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Base Canonical Page Signals Live Match Intents In Top SEO Fields (Priority: P1)

As a search engine, I want the canonical `/cric-live/{slug}` page to clearly say whether it is a live score, commentary, scorecard, or pre-match page so I can rank it for the right match-intent queries without needing separate canonicals first.

**Why this priority**: Right now the base page is too generic. Improving title, H1, description, and summary is the highest-signal fix with the lowest canonical risk.

**Independent Test**: Render one upcoming, one live, and one completed match page in raw SSR HTML and verify the title, H1, and description explicitly capture the right lifecycle-aware intent phrases.

**Acceptance Scenarios**:

1. **Given** an upcoming canonical match page, **When** raw SSR HTML is inspected, **Then** the title and H1 explicitly mention live score plus preview-oriented intent such as playing XI, toss, or match preview rather than only generic "match updates".
2. **Given** a live canonical match page, **When** raw SSR HTML is inspected, **Then** the title and H1 explicitly mention live score plus commentary and scorecard intent.
3. **Given** a completed canonical match page, **When** raw SSR HTML is inspected, **Then** the title and H1 explicitly mention match result and scorecard intent.
4. **Given** child routes such as `/scorecard` or `/commentary`, **When** they are requested in this phase, **Then** they continue to fold to the base canonical and do not introduce a new self-canonical split.

---

### User Story 2 - The Canonical Page Exposes An Always-SSR-Visible Match Intent Snapshot Rail (Priority: P1)

As a search engine, I want the canonical page to expose compact scorecard, commentary, lineup, and match-info summaries in raw HTML without needing tab interaction so the page reads like a strong match overview asset.

**Why this priority**: The existing support copy is helpful, but it is not organized into a persistent intent layer that strengthens the base canonical page for scorecard/commentary queries.

**Independent Test**: Fetch raw SSR HTML for one match page and verify a visible summary rail or summary block exists below the hero and above the deeper tab content, with lifecycle-aware cards for commentary, scorecard, lineups, and match info.

**Acceptance Scenarios**:

1. **Given** an upcoming match page, **When** raw SSR HTML is inspected, **Then** the page exposes a compact intent snapshot for match preview, scorecard availability, lineup status, and toss/start-time context.
2. **Given** a live match page, **When** raw SSR HTML is inspected, **Then** the page exposes a compact intent snapshot for live commentary, scorecard status, lineup status, and current match state.
3. **Given** a completed match page, **When** raw SSR HTML is inspected, **Then** the page exposes a compact intent snapshot for result, innings/scorecard status, and post-match context.
4. **Given** any lifecycle state lacks data for one of those surfaces, **When** the snapshot rail renders, **Then** it shows honest placeholder text instead of pretending that commentary, lineups, or scorecard data exists.

---

### User Story 3 - The Canonical Page Exposes Real In-Page Intent Anchors (Priority: P2)

As a user or crawler, I want the canonical page to expose real jump links to commentary, scorecard, lineups, and match details inside the same document so the page structure is clearer without creating duplicate URLs.

**Why this priority**: This improves both usability and section discoverability while preserving the one-canonical-page strategy.

**Independent Test**: Inspect raw SSR HTML and verify that visible links such as `href="#scorecard"` and `href="#commentary"` exist and their target sections have matching IDs in the rendered document.

**Acceptance Scenarios**:

1. **Given** the canonical match page renders, **When** raw SSR HTML is inspected, **Then** visible jump links for commentary, scorecard, and match details exist in the document.
2. **Given** a jump link target such as `#scorecard`, **When** the HTML is inspected, **Then** the corresponding scorecard section exposes a matching stable `id`.
3. **Given** a child route like `/commentary`, **When** it is loaded, **Then** the page may still use tab intent for UX but MUST preserve the base canonical and MUST NOT claim a separate indexed page in this phase.

---

### User Story 4 - Lifecycle Copy Stays Honest When Surfaces Are Not Yet Available (Priority: P2)

As a user, I want the canonical page to tell me honestly whether commentary, scorecard, or lineups are available yet so upcoming pages do not read like broken live pages.

**Why this priority**: Stronger intent capture should not come from fake or misleading live phrasing.

**Independent Test**: Compare one upcoming, one live, and one completed match page and verify each summary card uses lifecycle-appropriate wording and honest placeholders.

**Acceptance Scenarios**:

1. **Given** an upcoming match without confirmed lineups, **When** the page renders, **Then** the lineup summary says that playing XI will appear after confirmation rather than implying it already exists.
2. **Given** an upcoming or early-live match without a detailed scorecard yet, **When** the page renders, **Then** the scorecard summary says it will populate once innings data is available.
3. **Given** a live match with commentary entries, **When** the page renders, **Then** the commentary summary references live commentary or the latest update instead of generic match updates.
4. **Given** a completed match, **When** the page renders, **Then** the summary emphasizes result and scorecard over preview-oriented phrasing.

## Edge Cases

- Upcoming matches may not have venue, toss, lineups, or scorecard data yet; the canonical page must still signal preview intent without fabricating availability.
- Live matches may have score data but sparse commentary; the commentary summary must remain honest when only limited events are available.
- Completed matches may still be requested through `/commentary` or `/scorecard` child routes; those routes must continue to fold to the base canonical in this phase.
- The page must not overstuff titles or H1s with repetitive keywords; intent capture must stay readable and lifecycle-appropriate.
- The snapshot rail must remain SSR-visible even when tabs continue to control the deeper detailed surfaces for UX.
- This phase must not reopen `/live-cricket-score/{slug}` migration or child-route self-canonicalization. Those remain future decisions only if the base canonical page still underperforms after this strengthening pass.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `apps/frontend/src/app/seo/match-seo.service.ts` MUST generate lifecycle-aware title text for upcoming, live, and completed canonical match pages instead of one generic "Live Score & Match Updates" pattern.
- **FR-002**: `match-seo.service.ts` MUST generate lifecycle-aware H1 text for upcoming, live, and completed canonical match pages that better captures preview/commentary/scorecard intent.
- **FR-003**: `match-seo.service.ts` MUST generate lifecycle-aware description and summary text that stays honest about whether commentary, scorecard, toss, and playing XI are already available.
- **FR-004**: `apps/frontend/src/app/cricket-odds/cricket-odds.component.html` MUST render an always-SSR-visible match intent snapshot rail below the hero and above deeper tab-dependent surfaces.
- **FR-005**: The snapshot rail MUST include compact summaries for commentary, scorecard, lineups/playing XI, and match details/match info.
- **FR-006**: The snapshot rail MUST use lifecycle-aware helpers so upcoming, live, and completed pages do not share the same generic copy.
- **FR-007**: The canonical page MUST expose visible in-page jump links for commentary, scorecard, and match details using stable fragment identifiers.
- **FR-008**: The corresponding commentary, scorecard, lineup, and details sections MUST expose stable `id` values that match those visible jump links.
- **FR-009**: Child routes such as `/commentary`, `/scorecard`, `/match-scorecard`, and `/match-details` MUST continue to canonicalize to the base `/cric-live/{slug}` page in this phase.
- **FR-010**: This phase MUST NOT introduce a new self-canonical child route, a new route family, or reopen Spec 023 migration decisions.
- **FR-011**: Verification MUST include raw SSR HTML inspection for title, H1, description, snapshot-rail content, and fragment links on at least one upcoming, one live, and one completed production-like sample.
- **FR-012**: Verification MUST confirm no regression in canonical tags, robots directives, H1 count, or structured data from prior SEO phases.

### Key Entities

- **Canonical Match Entity Page**: The base `/cric-live/{slug}` page that remains the single primary indexed URL for this phase.
- **Match Intent Snapshot Rail**: The always-SSR-visible summary block that surfaces commentary, scorecard, lineup, and match-info intent without tab interaction.
- **Lifecycle Intent Copy**: The state-aware title, H1, description, and summary strings for upcoming, live, and completed match states.
- **Child Route Alias**: A route such as `/commentary` or `/scorecard` that may influence UX/tab state but still folds back to the base canonical page in this phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Raw SSR HTML for an upcoming sample `/cric-live/{slug}` page contains a title and H1 that explicitly communicate preview/live-score intent beyond generic "match updates".
- **SC-002**: Raw SSR HTML for a live sample `/cric-live/{slug}` page contains a title and H1 that explicitly communicate live score plus commentary/scorecard intent.
- **SC-003**: Raw SSR HTML for a completed sample `/cric-live/{slug}` page contains a title and H1 that explicitly communicate match result and scorecard intent.
- **SC-004**: All sampled canonical match pages expose an SSR-visible snapshot rail with compact commentary, scorecard, lineup, and match-info summaries.
- **SC-005**: All sampled canonical match pages expose visible fragment links and matching section IDs for commentary, scorecard, and match details.
- **SC-006**: `/commentary` and `/scorecard` child routes continue to return the base canonical URL after implementation.
- **SC-007**: A rerun of the match SEO audit shows no regression in canonical, robots, H1 count, or JSON-LD checks on sampled `/cric-live/*` pages.
