# Live Match SEO Phase Roadmap

**Created**: 2026-06-07  
**Purpose**: Turn the live-match SEO architecture brief into a practical, phase-by-phase implementation path for this repo.  
**Workflow Rule**: We will implement this roadmap one phase at a time using a fresh numbered Spec Kit folder for each phase (`spec.md`, `plan.md`, `tasks.md`, then implementation and verification).

## Progress Update

**Last updated**: 2026-06-07

- Phase 1 is now tracked in `specs/018-match-discovery-link-graph/`.
- The Phase 1 frontend discovery-link slice was deployed to production from commit `6232172`.
- Production frontend image is pinned to `victoryline-frontend:phase1-links-6232172-20260607-210708`.
- Production verification on 2026-06-07 showed `InternalMatchLinks=24` on both `https://www.crickzen.com/` and `https://www.crickzen.com/matches`.
- The Phase 1 backend sitemap-freshness work and the audit-script source update are still local and not yet rolled out to production.

## What This Roadmap Assumes

- `specs/015-long-tail-match-seo/` already covers core canonical/indexability recovery work.
- `specs/016-live-match-page-seo-hardening/` already covers live-page template hardening work.
- The current public match route family remains `/cric-live/{slug}` unless a later spec explicitly approves a route migration.
- Programmatic pages are valuable only when each page has real match/entity data and distinct search intent.
- Editorial pages should support the programmatic graph instead of competing with it.

## Delivery Principles

1. Keep one stable match entity URL through pre-match, live, and post-match states wherever possible.
2. Prefer SSR-first content for all important SEO surfaces.
3. Do not create near-duplicate route variants that differ only by UI tab or tiny state changes.
4. Only self-canonicalize subpages when they serve clearly different intent.
5. Treat discovery, internal linking, and sitemap/feed hygiene as first-class work, not cleanup.
6. Every phase must end with repo-local verification evidence before the next phase starts.

## Recommended Phase Order

| Phase | Goal | Why it comes here | Suggested next spec slug |
|------|------|-------------------|--------------------------|
| 1 | Match discovery and crawl graph | Better pages still underperform if crawlers cannot reach them through SSR links, sitemaps, and feeds | `018-match-discovery-link-graph` |
| 2 | Match URL lifecycle and canonical intent map | We need a stable rule for base match, live, commentary, scorecard, and report surfaces before expanding page types | `019-match-url-lifecycle` |
| 3 | Core match entity page enrichment | The base match page should become the strongest overview page with clear pre/live/post lifecycle content | `020-core-match-entity-page` |
| 4 | Distinct live, commentary, scorecard, and report intents | Only keep separate surfaces when each one has unique, index-worthy value | `021-match-surface-intent-split` |
| 5 | Series, team, player, and venue hubs | These hubs create crawl depth, support long-tail queries, and strengthen internal linking | `022-cricket-entity-hubs` |
| 6 | Editorial support layer | Previews, roundups, explainers, and analysis pages help programmatic URLs rank and get discovered | `023-editorial-support-layer` |
| 7 | Structured data and freshness signals | Once page intent is stable, we can safely tighten `Event`, `LiveBlogPosting`, sitemap `lastmod`, and feed behavior | `024-live-match-structured-data` |
| 8 | SEO observability and rollout discipline | The final layer should prove quality continuously with audits, sampling, and rollout checks | `025-seo-observability-and-rollout` |

## Phase Details

### Phase 1: Match Discovery and Crawl Graph

**Objective**: Make important match URLs discoverable through SSR HTML, sitemap partitions, and recent-update feeds.

**Scope ideas**:
- Ensure homepage, `/matches`, and other listing surfaces emit crawlable `<a href>` links to live and recent match pages.
- Add or tighten series/team cross-links where data already exists.
- Review sitemap partition strategy for match URLs.
- Add RSS/Atom or another recent-URL feed only if it fits the existing stack cleanly.
- Enforce honest `lastmod` changes only when score, commentary, status, or meaningful metadata changed.

**Not in scope**:
- New long-form editorial content.
- Full route redesign.

**Done looks like**:
- Active and recent matches are discoverable from SSR HTML, not just client navigation.
- Sitemap entries and crawl paths agree on canonical URLs.

### Phase 2: Match URL Lifecycle and Canonical Intent Map

**Objective**: Define exactly which match surfaces deserve their own canonical indexable URL.

**Scope ideas**:
- Decide canonical rules for:
  - base match overview
  - live view
  - commentary view
  - scorecard view
  - post-match report view
- Document when a child route should self-canonicalize versus canonicalize to the base match page.
- Prevent low-value route splits that only mirror the same content in different wrappers.

**Done looks like**:
- Every match route family has one clear intent and one clear canonical policy.
- Unknown or duplicate route forms stop competing in search.

### Phase 3: Core Match Entity Page Enrichment

**Objective**: Make the main match page the strongest overview asset across the match lifecycle.

**Scope ideas**:
- Ensure SSR HTML contains teams, venue, start time, toss, status, score, key performers, and short summary context.
- Improve H1/title/description alignment around the actual match entity.
- Make pre-match, live, and completed states read as one evolving page, not disconnected templates.

**Done looks like**:
- The base match page answers the main "what match is this and what is happening?" query without requiring hydration.

### Phase 4: Distinct Live, Commentary, Scorecard, and Report Intents

**Objective**: Keep separate match sub-surfaces only when they offer clearly different value.

**Scope ideas**:
- Live page: fast-changing state and short live summary.
- Commentary page: timestamped ball-by-ball or event-by-event text.
- Scorecard page: innings tables, partnerships, bowling, fall of wickets, and deeper stats.
- Report page: durable post-match narrative and result summary.
- Review whether some surfaces should remain tabs/sections rather than independent indexable URLs.

**Done looks like**:
- Each surviving surface has distinct search intent, unique SSR content, and a deliberate canonical rule.

### Phase 5: Series, Team, Player, and Venue Hubs

**Objective**: Build the surrounding entity graph that supports long-tail discovery and stronger internal linking.

**Scope ideas**:
- Series pages with fixtures, results, standings, and top-player links.
- Team pages with upcoming matches, recent results, form, and squad/stat links.
- Player pages with current tournament and recent-match context.
- Venue pages only if the underlying data is strong enough to avoid thin pages.

**Done looks like**:
- Match pages sit inside a wider entity graph instead of behaving like isolated leaf nodes.

### Phase 6: Editorial Support Layer

**Objective**: Add hand-shaped pages that create authority, recency, and discovery paths into the programmatic cluster.

**Scope ideas**:
- Match previews
- Tournament hubs
- How-to-watch pages
- Weekly roundups
- Rivalry/history pages
- Post-match analysis

**Guardrail**:
- Editorial pages should link into the canonical programmatic URLs instead of creating duplicate match-summary pages.

**Done looks like**:
- Important match and tournament clusters receive supporting links from editorial hub content.

### Phase 7: Structured Data and Freshness Signals

**Objective**: Strengthen machine-readable understanding only after page intent and lifecycle rules are stable.

**Scope ideas**:
- `SportsEvent` on valid match entity pages.
- `LiveBlogPosting` on commentary/live-update surfaces when the content truly matches that pattern.
- `VideoObject` and `BroadcastEvent` only if live-stream video becomes a real product surface.
- Better breadcrumbs where crawl paths are real.
- Honest freshness signals in sitemap and feeds.

**Done looks like**:
- Structured data reflects real page purpose and does not rely on placeholders or fake live signals.

### Phase 8: SEO Observability and Rollout Discipline

**Objective**: Make future SEO work measurable and safe to ship.

**Scope ideas**:
- Extend audit scripts for page intent, canonical rules, internal links, structured data, and freshness signals.
- Keep sample URL sets for live, upcoming, completed, and unknown matches.
- Add rollout notes that separate live HTML proof from slower Search Console feedback.

**Done looks like**:
- Each rollout ships with evidence, not assumptions.
- We can explain ranking/crawl changes with concrete page-type checks.

## How We Should Work This Roadmap

For each future phase:

1. Create a new numbered folder in `specs/` using the next available number.
2. Write `spec.md` around user scenarios, requirements, and success criteria for that phase only.
3. Write `plan.md` with architecture, files, constraints, and validation.
4. Write `tasks.md` with implementation order.
5. Implement only that phase.
6. Verify with repo-local evidence before moving to the next phase.

## Suggested Immediate Next Step

Phase 1 frontend discovery work is now live. The next step is to finish the remaining Phase 1 backend rollout or begin **Phase 2: Match URL Lifecycle and Canonical Intent Map** once the sitemap-freshness slice is scheduled.
