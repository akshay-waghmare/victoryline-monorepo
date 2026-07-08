# Feature Specification: Canonical Live Match Coverage

**Feature Branch**: `043-canonical-live-match-coverage`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User request: "create spec using specify spec plan tasks"

## Summary

Crickzen already has a strong canonical match foundation around `/cric-live/{slug}`:

- canonical match URL stability
- title, canonical, OG, and Twitter metadata
- `SportsEvent`, `Article`, `BreadcrumbList`, and `FAQPage` support
- strong hub and internal-link work
- separate freshness/live-update logic
- existing `LiveBlogPosting` support in shared SEO utilities

The missing layer is not baseline SEO. The missing layer is visible live match coverage.

Today the canonical page behaves more like a technically optimized score page with support content than a true live match coverage page. This phase upgrades `/cric-live/{slug}` so it visibly and in SSR behaves like Crickzen's primary live coverage surface, while keeping the one-canonical-match-page strategy intact.

## Current Evidence

- The canonical route already resolves `/cric-live/{slug}` into `CricketOddsComponent`.
- The page already sets canonical, title, OG, Twitter, and structured data through `MatchSeoService`, `MetaTagsService`, and `StructuredDataService`.
- The page currently emits `Article`, `SportsEvent`, `BreadcrumbList`, `FAQPage`, and support-link `ItemList` schemas.
- The current visible H1 is hidden inside an SR-only block instead of serving as the live coverage headline for users.
- The visible page already contains commentary, scorecard, lineups, and match details, but does not yet expose a dedicated `Live Match Updates` layer with curated textual updates.
- Freshness support pages already contain useful meaningful-commentary logic for toss, wicket, innings break, milestone, and chase-style events.
- The footer currently exposes privacy and terms pages, but not the broader publisher-trust set requested for Crickzen.

## User Scenarios & Testing

### User Story 1 - The Canonical Match Page Looks Like A Real Live Coverage Page (Priority: P1)

As a user opening a Crickzen match page, I want the canonical `/cric-live/{slug}` page to clearly read like a live coverage surface with visible headline, score summary, and meaningful update blocks rather than only a technical SEO shell plus tabs.

**Why this priority**: The main product and SEO gap is visible coverage quality, not missing metadata.

**Independent Test**: Load a sample live `/cric-live/{slug}` page and verify the first screen shows a visible H1, live score framing, summary context, and a `Live Match Updates` section before or alongside deeper commentary.

**Acceptance Scenarios**:

1. **Given** a live or recent match page loads, **When** a user scans the top of the page, **Then** the page presents one visible match-coverage H1 and supporting match-summary context.
2. **Given** the page has commentary or other match-state signals, **When** the updates section renders, **Then** it shows curated update cards rather than only raw ball-by-ball commentary.
3. **Given** the page still contains commentary, scorecard, and lineups tabs, **When** this phase ships, **Then** those deeper product layers remain available and are not replaced by SEO-only content.

---

### User Story 2 - Visible Updates And Schema Stay Aligned (Priority: P1)

As a search engine and as the product team, we want structured data to reflect visible page content exactly, especially if `LiveBlogPosting` is introduced.

**Why this priority**: The phase explicitly must avoid fake live-blog or publisher signals.

**Independent Test**: Inspect SSR HTML and JSON-LD for a sample match page; verify any emitted `FAQPage` or `LiveBlogPosting` corresponds directly to visible page sections.

**Acceptance Scenarios**:

1. **Given** visible FAQs do not render, **When** JSON-LD is inspected, **Then** `FAQPage` is not emitted.
2. **Given** visible live update cards are sparse or low quality, **When** JSON-LD is inspected, **Then** `LiveBlogPosting` is not emitted.
3. **Given** visible live update cards are meaningful and sufficient, **When** `LiveBlogPosting` is emitted, **Then** its update entries map directly to visible cards.

---

### User Story 3 - SSR HTML Carries Real Match Coverage Without JavaScript (Priority: P1)

As a crawler requesting `/cric-live/{slug}`, I want the initial HTML response to contain visible coverage text, summary context, metadata, and structured data without depending on client-side hydration.

**Why this priority**: A stronger live coverage page only helps discovery if bots can see it in SSR output.

**Independent Test**: Run `curl -L` against a sample canonical match page and verify the HTML source contains the H1, summary content, related links, and at least some meaningful coverage text.

**Acceptance Scenarios**:

1. **Given** a canonical match page is fetched with `curl`, **When** the raw HTML is inspected, **Then** it contains a visible H1, summary content, canonical, metadata, and JSON-LD.
2. **Given** live-update cards are available for the fixture, **When** raw HTML is inspected, **Then** at least some of those cards or equivalent static update text appear in SSR output.
3. **Given** the client later hydrates, **When** structured data is rebuilt, **Then** hydration guards prevent good SSR JSON-LD from being wiped by thinner client state.

---

### User Story 4 - Crickzen Looks More Like A Trustworthy Publisher Without Faking News Status (Priority: P2)

As a user and as a crawler, I want Crickzen to expose real trust and policy pages plus a consistent organization identity, without pretending to be a news publisher beyond what the visible content supports.

**Why this priority**: Trust and publisher clarity help support article-style eligibility, but must remain honest.

**Independent Test**: Inspect the footer, trust-page routes, and sitewide schema output and verify required trust pages are linked and `Organization` schema is present.

**Acceptance Scenarios**:

1. **Given** the footer renders, **When** it is inspected, **Then** it links to About, Contact, Editorial Policy, Corrections Policy, Privacy Policy, and Terms.
2. **Given** a normal page renders, **When** global structured data is inspected, **Then** it includes an `Organization` schema for Crickzen.
3. **Given** the match page is not behaving like a real news/live-blog page, **When** schema is inspected, **Then** it does not overclaim with fake publisher or live-blog fields.

## Edge Cases

- Commentary may be sparse, delayed, or low-quality; the updates layer must degrade honestly rather than manufacturing editorial depth.
- Some matches may justify a few update cards but still not justify `LiveBlogPosting`.
- Prematch fixtures may have toss or lineup information before full commentary exists.
- Low-value or thin-data matches must remain useful without being forced into the same richness as India, IPL, World Cup, or finals coverage.
- The canonical page must remain `/cric-live/{slug}` even if freshness-support or editorial pages exist elsewhere.
- Existing SEO improvements such as canonical policy, lifecycle routing, hub links, and hydration guards must not regress.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST keep `/cric-live/{slug}` as the canonical match entity URL.
- **FR-002**: Canonical match pages MUST present one visible H1 near the top of the page rather than limiting the primary headline to SR-only content.
- **FR-003**: The canonical page MUST expose a visible match-summary layer that includes score/state context and key match facts when available.
- **FR-004**: The canonical page MUST add a visible `Live Match Updates` section distinct from raw commentary.
- **FR-005**: The live updates section MUST use curated match-update cards derived from commentary and match-state signals rather than emitting every ball as a separate update.
- **FR-006**: The implementation MUST reuse or centralize existing meaningful-commentary extraction logic where feasible instead of duplicating similar logic in parallel.
- **FR-007**: The system MUST support a shared `LiveMatchUpdate`-style data shape containing ID, type, timestamp, display time, headline, summary/body, and optional score/innings/over context.
- **FR-008**: Update generation MUST support at least these event types when source data allows: toss, start, over summary, wicket, milestone, innings break, chase equation, result, and general.
- **FR-009**: Update generation MUST deduplicate repetitive events and cap visible update volume to a useful editorial set.
- **FR-010**: The visible FAQ block on canonical match pages MUST be generated from real match data and MUST only render answerable questions.
- **FR-011**: `FAQPage` schema MUST only be emitted when the visible FAQ block renders.
- **FR-012**: Canonical match pages MUST continue emitting safe baseline schema including `SportsEvent`, article-style schema, and `BreadcrumbList` when data is sufficient.
- **FR-013**: `LiveBlogPosting` MUST only be emitted when the page has a visible live updates section with enough meaningful text updates to justify it.
- **FR-014**: Initial `LiveBlogPosting` eligibility SHOULD be restricted to higher-value matches such as India matches, IPL, World Cup, and major finals/playoffs until quality is proven.
- **FR-015**: When `LiveBlogPosting` is emitted, each schema update entry MUST correspond to a visible live update card on the page.
- **FR-016**: The bot-facing SSR/prerendered HTML for canonical match pages MUST include meaningful match coverage text such as H1, summary facts, related links, and live-update text when available.
- **FR-017**: The implementation MUST preserve existing canonical, title, OG, Twitter, and hydration-guard behavior unless a change is required for parity with visible content.
- **FR-018**: Crickzen MUST expose crawlable trust pages for About, Contact, Editorial Policy, Corrections Policy, Privacy Policy, and Terms.
- **FR-019**: The site MUST emit a global `Organization` schema for Crickzen.
- **FR-020**: Verification MUST include at least one sample canonical match page check for visible content, schema parity, and raw SSR HTML quality.

### Key Entities

- **Canonical Match Coverage Page**: The `/cric-live/{slug}` page that remains the primary match entity and now becomes the primary live coverage surface.
- **Live Match Update Card**: A visible, curated textual update describing a meaningful match event.
- **Meaningful Commentary Signal**: A commentary or match-state event strong enough to justify a visible update or freshness change.
- **Coverage Eligibility Gate**: The rule set deciding whether a match only gets baseline updates, richer live updates, or `LiveBlogPosting`.
- **Trust Page Set**: About, Contact, Editorial Policy, Corrections Policy, Privacy Policy, and Terms pages linked from the footer and crawlable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Sample canonical match pages render one visible H1 and a visible live-coverage framing block in the main page UI.
- **SC-002**: Sample live or recent canonical match pages render a `Live Match Updates` section with curated updates when meaningful source data exists.
- **SC-003**: Raw SSR HTML for sample canonical match pages contains meaningful coverage text beyond metadata alone.
- **SC-004**: `FAQPage` and `LiveBlogPosting` are only emitted when matching visible sections are present.
- **SC-005**: Footer and routes expose the required trust-page set.
- **SC-006**: The site emits a global `Organization` schema without changing the canonical match URL strategy.
- **SC-007**: Existing canonical routes, lifecycle policy, commentary access, scorecard access, and structured-data hydration guards continue to work after the coverage upgrade.

## Out Of Scope

- Creating a new duplicate canonical route family such as `/live-blog/{slug}`.
- Replacing the canonical page with a separate editorial page as the primary match entity.
- Emitting `LiveBlogPosting` for every match regardless of data quality.
- Inventing fake author, publisher, or breaking-news claims not supported by the visible page.
- Reworking unrelated product surfaces outside canonical match pages and trust/publisher support.

## Implementation Plan

### Phase 1 - Visible Coverage Framing

Goal: make the canonical page visibly read like a live match coverage page.

Work:

1. Promote a visible H1 near the top of the page.
2. Add stronger visible coverage framing copy around score, status, venue, tournament, toss, innings, and updated time.
3. Keep the at-a-glance product layer primary rather than letting support copy retake the first viewport.

Exit criteria:

- A user and a crawler can both identify the page as a live match coverage page from the first rendered HTML.

### Phase 2 - Canonical Live Match Updates Layer

Goal: add a curated textual updates layer to `/cric-live/{slug}`.

Work:

1. Define the live-update data shape.
2. Build a mapper from commentary plus match-state signals into update cards.
3. Support meaningful event classes such as toss, wicket, milestone, innings break, chase pressure, and result.
4. Cap, sort, and deduplicate updates to stay readable.

Exit criteria:

- Sample live pages show useful update cards without degenerating into every-ball spam.

### Phase 3 - Conditional FAQ And Structured Data Parity

Goal: ensure visible page blocks and emitted schema stay perfectly aligned.

Work:

1. Replace template-only FAQ generation with a data-driven FAQ builder.
2. Emit `FAQPage` only when the visible FAQ section renders.
3. Keep `SportsEvent`, article-style schema, and breadcrumbs in place when supported by real data.
4. Add `LiveBlogPosting` only behind visible-content and match-value gates.

Exit criteria:

- No schema type appears on the page without a matching visible content block.

### Phase 4 - Trust And Publisher Baseline

Goal: make Crickzen look like a trustworthy sports publisher without overclaiming news status.

Work:

1. Add or complete About, Contact, Editorial Policy, and Corrections Policy pages.
2. Link the full trust-page set in the footer.
3. Add a sitewide `Organization` schema.

Exit criteria:

- Trust pages are crawlable and visible from the footer, and `Organization` schema is present sitewide.

### Phase 5 - SSR / Prerender Enrichment

Goal: ensure bots can see meaningful coverage text without JavaScript.

Work:

1. Upgrade prerendered match-page content to include richer coverage text.
2. Include H1, summary facts, related links, and live-update content when available.
3. Preserve current canonical/meta behavior and JSON-LD hydration safeguards.

Exit criteria:

- `curl` and `view-source` on sample canonical match pages show meaningful match coverage HTML, not just metadata and a thin shell.

### Phase 6 - Verification And Guardrails

Goal: prevent content/schema drift and protect canonical policy.

Work:

1. Validate sample pages for visible content and schema parity.
2. Validate raw SSR HTML for H1, canonical, metadata, update text, and links.
3. Add focused logging or debug output for schema types, update counts, and live-blog eligibility decisions.

Exit criteria:

- The team can verify one sample page end-to-end without guessing whether the visible page and schema still match.

## Verification Checklist

1. A sample canonical match page shows one visible H1 near the top of the page.
2. The page visibly frames itself as live coverage, not only as tabs plus hidden SEO text.
3. The page renders a `Live Match Updates` section when meaningful data exists.
4. Visible FAQ content only appears when answerable from current match data.
5. `FAQPage` only appears when the visible FAQ block appears.
6. `LiveBlogPosting` only appears when visible update cards justify it.
7. Raw SSR HTML contains H1, canonical, metadata, and meaningful coverage text.
8. Footer links expose the trust-page set.
9. Global `Organization` schema is present.
10. Canonical `/cric-live/{slug}` strategy remains unchanged.

## Risks And Mitigations

- **Risk**: Update generation may become noisy or repetitive on commentary-heavy matches.  
  **Mitigation**: cap update volume, dedupe similar events, and prefer editorial-grade event classes over raw delivery text.

- **Risk**: `LiveBlogPosting` may be emitted on pages with weak visible updates.  
  **Mitigation**: gate on visible-card count, quality rules, and high-value match filters.

- **Risk**: Adding visible coverage text could reintroduce above-the-fold clutter.  
  **Mitigation**: keep score/state first, keep support content secondary, and integrate updates into the match-reading flow instead of stacking generic SEO blocks.

- **Risk**: Trust-page work could sprawl into unrelated content operations.  
  **Mitigation**: keep the phase focused on crawlable baseline pages and footer/schema wiring, not editorial workflow tooling.

## Recommended Execution Order

1. Add visible H1 and top summary framing.
2. Build the canonical live-update data model and mapper.
3. Render the `Live Match Updates` section.
4. Make FAQ generation conditional and schema-backed from the same source.
5. Add trust pages, footer links, and global `Organization` schema.
6. Add selective `LiveBlogPosting`.
7. Enrich prerendered canonical match HTML.
8. Add focused verification and logging for content/schema parity.
