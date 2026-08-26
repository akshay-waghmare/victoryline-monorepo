# Feature Specification: Search Demand Graph and AEO Content Contract

**Feature Branch**: `059-demand-graph-aeo-content-contract`  
**Created**: 2026-08-25  
**Status**: Draft  
**Input**: `Crickzen_Master_Search_Demand_Graph_2026-08-25.xlsx` and the supplied AEO lesson

## Purpose

Turn the demand graph into an executable page-ownership and content contract for CrickZen. The graph defines what people appear to search for and the AEO lesson defines how trustworthy answers should be exposed. Neither source is treated as a ranking guarantee.

The implementation preserves the existing canonical match architecture and adds answer-first, atomic, entity-rich content to the correct surfaces.

## Evidence and interpretation rules

- The workbook contains 3,411 source observations, 3,382 unique keywords, four source page types, and 16 clusters.
- Unique-keyword coverage is 926 Missing, 1,196 Weak, and 1,260 Covered.
- `Missing` means no known mapped CrickZen route; `Weak` means a related route exists but is incomplete. Neither status proves ranking or indexing failure by itself.
- Planner demand is a relative bucketed signal, not a traffic forecast.
- The workbook does not retain competitor URL-level provenance. The next refresh must preserve competitor, source URL, capture date, page lifecycle, and observed content elements.
- The AEO lesson's reported correlations are not accepted as universal laws. BLUF, atomic sections, explicit entities, declarative writing, freshness, and provenance are adopted as product-content principles.

## Existing architecture to preserve

- `/cric-live/{slug}` remains the canonical match entity for score, commentary, scorecard, lineups, toss, and match details.
- `/series/{externalId}/{slug}` remains the series entity surface, with `/table` and `/stats` sections retained where the data exists.
- `/live-score`, `/live-score/today`, and `/cricket-schedule/today` remain distinct discovery hubs.
- `/match-intelligence/{slug}` remains secondary and non-indexable until its unique-value, SSR, and data-availability gates are met.
- Lifecycle authority remains shared across catalogue, SSR, hubs, schema, and sitemaps. No indexable page may publish stale, placeholder, or temporary-loading answers.

## User stories

### User Story 1 - Every demand cluster has one owning surface (Priority: P1)

As the SEO and product team, we need one canonical owner for each approved intent cluster so keyword variants do not create competing thin pages.

**Independent Test**: Review the ownership matrix and confirm every approved cluster has one owning route family, lifecycle, data contract, primary answer, and next-step event.

### User Story 2 - Series pages answer tournament questions immediately (Priority: P1)

As a user or answer engine, I need a series page to state what series it is, what it contains, and the current schedule/table/result answer before requiring navigation.

**Independent Test**: Render a populated series profile in SSR and verify the raw HTML contains a self-contained summary, entity names, current section answer, and crawlable links to matches and teams.

### User Story 3 - Match answers follow lifecycle truth (Priority: P1)

As a user or answer engine, I need the same canonical match URL to answer the correct question before, during, and after the match.

**Independent Test**: Inspect upcoming, live, and completed samples and verify each has lifecycle-specific BLUF copy, visible facts, and no stale-state contradiction.

### User Story 4 - Entity relationships are explicit and crawlable (Priority: P1)

As a crawler or user, I need the text and links to identify the relationship between teams, match, series, venue, players, and standings.

**Independent Test**: Raw SSR contains explicit entity names in answer sentences and normal `href` links to valid canonical entity routes.

### User Story 5 - Proprietary intelligence has provenance (Priority: P2)

As a user, I need model-derived facts to identify CrickZen as their source and state when the value was refreshed.

**Independent Test**: An eligible match with a real model payload renders a labelled CrickZen metric and freshness/provenance text; an ineligible match renders neither invented nor stale probability claims.

### User Story 6 - Search outcome is measured separately from technical readiness (Priority: P1)

As the operator, I need to know whether a page is crawlable, discovered, indexed, visible, and useful as separate states.

**Independent Test**: A cohort report joins URL, cluster, lifecycle, GSC status, landing sessions, match engagement, and repeat-use events without treating a `200` response as ranking proof.

## Functional requirements

- **FR-001**: The project MUST maintain one page owner per approved demand cluster and reject keyword-only URL expansion.
- **FR-002**: The ownership matrix MUST include cluster, intent, lifecycle, target route, coverage, data readiness, primary answer, internal-link parents, and measurement event.
- **FR-003**: Series profile pages MUST render a concise answer-first summary using only available series name, season, match, standings, and stats facts.
- **FR-004**: Series section headings and answer blocks MUST name the series entity and the task being answered, such as fixtures, points table, teams, or results.
- **FR-005**: Match pages MUST render lifecycle-specific answer blocks for upcoming, live, and completed states from the resolved lifecycle owner.
- **FR-006**: Atomic answer blocks MUST remain understandable when extracted without relying on preceding narrative paragraphs.
- **FR-007**: Entity-rich copy MUST use explicit team, match, series, venue, player, and competition names when those facts are available.
- **FR-008**: Model-derived metrics MUST be labelled with CrickZen provenance, freshness, and an informational disclaimer; unsupported or stale metrics MUST be omitted.
- **FR-009**: All discovery and entity relationships MUST use valid canonical `href` links and avoid invented placeholder team/player routes.
- **FR-010**: Every new or materially changed indexable surface MUST pass raw SSR, hydration parity, sitemap eligibility, canonical, robots, schema, and visible-answer checks.
- **FR-011**: The measurement layer MUST retain separate gates for technical response, crawl/discovery, indexing, query visibility, qualified match engagement, and repeat use.
- **FR-012**: The implementation MUST not copy competitor schema or publish `NewsArticle`/`LiveBlogPosting` unless the page independently meets the existing editorial eligibility contract.

## Initial priority slice

The first vertical slice is one real tournament/series entity:

`series profile -> fixtures -> points table -> teams -> canonical match -> completed scorecard`

The workbook ranks Standings / Points Table, Tournament / Series, and Schedule / Fixtures as the highest missing or weak core opportunities. Existing live, today, and canonical match surfaces are hardened in parallel rather than duplicated.

## Out of scope

- Guaranteed Google ranking or AI citation outcomes.
- A new page for every keyword variant.
- A broad content-management or news-room build.
- Competitor schema cloning.
- Watch, TV, ticket, or streaming content without a real CrickZen product/data capability.
- Monetization changes before the free useful-answer and repeat-use baseline is measured.

## Success criteria

- One approved intent-to-page matrix exists and is reviewed before route creation.
- The first series slice has answer-first SSR content, current data, atomic sections, and explicit entity links.
- Upcoming, live, and completed match samples preserve one canonical URL and truthful lifecycle answers.
- A bounded cohort produces separate evidence for SSR, discovery, indexing, impressions/clicks, match engagement, and repeat use.
- No unsupported claims, placeholder identities, thin duplicate pages, or schema inflation are introduced.
