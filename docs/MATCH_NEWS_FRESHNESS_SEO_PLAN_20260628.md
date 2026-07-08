# Match News And Freshness SEO Plan

**Date**: 2026-06-28  
**Repo**: `C:\Users\ADMINS\Documents\projects\victoryline-monorepo`

## Why this plan exists

Competitor and SERP review shows two parallel search patterns for live-cricket queries:

1. **Canonical match entity pages** competing for:
   - live score
   - scorecard
   - commentary
   - playing XI
   - toss

2. **Fresh article or live-update pages** competing for:
   - `today match`
   - `live cricket score today`
   - `full scorecard`
   - `highlights`
   - fast-moving news-style queries that show `20 minutes ago`, `3 hours ago`, and similar freshness labels

Crickzen already has substantial work in lane 1. The main remaining gap is lane 2.

This document is intentionally a **delta plan**, not a replacement roadmap. It maps what already exists, what overlaps, and what still needs a dedicated phase.

## What already exists

The repo already covers much of the canonical-match and discovery stack.

### Existing work that should not be duplicated

- `specs/021-live-score-seo-hubs/`
  - hub routes
  - match-page enrichment
  - Article JSON-LD on match pages
  - strong title/H1/live-score language

- `specs/032-canonical-match-intent-capture/`
  - stronger canonical `/cric-live/{slug}` intent for scorecard, commentary, preview, toss, and lineups

- `specs/033-match-intent-ssr-ux-refinement/`
  - match-specific SSR copy and short-team-name capture

- `specs/034-match-lifecycle-discovery-surface-seo/`
  - lifecycle discovery across upcoming, live, and completed
  - canonical page support for match info, scorecard, and lineups
  - series-link and lifecycle-graph strengthening

- `specs/035-prematch-indexing-operator-queue/`
  - dashboard queue for manual submission triage

- `specs/036-series-discovery-hub-enrichment/`
  - `/series` as a discovery support surface

- `specs/037-early-upcoming-discovery-window/`
  - earlier `30-120h` discovery window for upcoming URLs

- `docs/LIVE_MATCH_SEO_PHASE_ROADMAP.md`
  - already anticipates an **editorial support layer** as a later roadmap phase

## What is still missing

The current stack is strong for canonical match entities, but it does **not yet fully address freshness-style news capture**.

### Missing delta

1. A real **match live-update or news layer**
   - not just the canonical match page
   - not fake tab URLs
   - not duplicate thin summaries

2. A clear **editorial route and content contract** for:
   - pre-match preview
   - live update article
   - post-match result/highlights article

3. A structured way to target queries where Google favors:
   - recent timestamps
   - article-style snippets
   - Top Stories / news-like freshness surfaces

4. Internal linking rules between:
   - canonical `/cric-live/{slug}`
   - preview/news/live-update pages
   - result/highlights pages

5. Verification for freshness-specific signals such as:
   - visible published and updated timestamps
   - `datePublished`
   - `dateModified`
   - `Article` / `NewsArticle`
   - honest update cadence

## Recommendation

Do **not** start a parallel duplicate phase for canonical match SEO.

Instead:

1. Treat `021`, `032`, `033`, `034`, `035`, `036`, and `037` as the existing base.
2. Create **one new phase** focused only on the missing editorial freshness layer.
3. Keep `/cric-live/{slug}` canonical stable.
4. Use editorial pages to support, not compete with, the canonical match entity page.

## Suggested next spec

### Proposed spec slug

`038-match-news-freshness-support`

### Proposed objective

Create a lightweight editorial freshness layer around important matches so Crickzen can compete for news-like live score queries while keeping the canonical match entity page stable.

## Scope of the new phase

### In scope

- One **pre-match preview** surface per high-priority match or series
- One **live update / live blog style** surface for selected high-interest matches
- One **result / highlights / match recap** surface after completion
- Strong internal linking between those pages and the canonical `/cric-live/{slug}` page
- Honest visible timestamps and structured data
- A targeting framework for `today`, `live score`, `full scorecard`, and freshness-heavy queries

### Not in scope

- Changing the canonical match route family
- Splitting `/scorecard` or `/commentary` into new self-canonical routes
- Generating thin duplicate article pages for every match automatically
- Faking freshness with meaningless timestamp churn
- Replacing the match entity page with article pages

## Product strategy

### Lane 1: Keep strengthening the canonical match page

This page should remain the main answer for:

- `team a vs team b live score`
- `team a vs team b scorecard`
- `team a vs team b commentary`
- `team a vs team b playing xi`
- `team a vs team b toss`

This is already aligned with Specs `021`, `032`, `033`, and `034`.

### Lane 2: Add freshness-support content

This second layer should target:

- `today match live score`
- `live cricket score today`
- `team a vs team b live updates`
- `team a vs team b full scorecard`
- `team a vs team b highlights`
- news-style and Top Stories style queries

This is the missing opportunity indicated by competitor examples from Indian Express and Hindustan Times.

## Proposed implementation slices

### Slice A: Editorial route and content model

Define the route family and guardrails for:

- preview
- live updates
- result/highlights

Recommended rule:

- editorial pages should reference one canonical match entity
- editorial pages should self-canonicalize only when they are genuinely distinct editorial assets
- editorial pages must link prominently to the canonical `/cric-live/{slug}`

### Slice B: Match freshness page templates

Build templates that can support:

- title
- H1
- subtitle/summary
- timestamp block
- editorial intro
- structured match cards
- prominent link to live score / scorecard / commentary on the canonical page

### Slice C: Structured data and date signals

For editorial freshness pages:

- visible publish/update timestamps
- `Article` or `NewsArticle`
- honest `datePublished`
- honest `dateModified`

Avoid:

- fake `LiveBlogPosting` unless there is real event-by-event update content

### Slice D: Internal linking

Add clear link flows between:

- homepage or hub -> preview/live-update/result page
- preview/live-update/result page -> canonical `/cric-live/{slug}`
- canonical match page -> related editorial freshness pages

## How crawlers will know about these pages

The crawler should discover freshness pages through the same three core channels that already matter for match URLs:

1. **SSR internal links**
2. **sitemaps**
3. **repeated entity/hub references**

### Required crawl path

For every freshness-support page we create, the expected discovery chain should be:

1. editorial page exists and returns `200`
2. editorial page is linked from at least one SSR hub
3. editorial page is linked from its related canonical `/cric-live/{slug}` page
4. editorial page is present in sitemap coverage
5. editorial page links back to the canonical match page and, where relevant, to the series or archive surface

### Recommended SSR entry points

Use real visible SSR links from existing repo surfaces:

- homepage news/editorial block
- `/matches`
- `/live-score`
- `/cricket-schedule/today`
- `/series`
- `/live-score/archive` for result/highlights retention
- the canonical `/cric-live/{slug}` page itself

### Sitemap strategy

At minimum:

- include freshness-support pages in the regular sitemap graph

Preferred once volume is meaningful:

- keep them in the main sitemap graph
- add a dedicated editorial or news sitemap only if the volume and update cadence justify it cleanly

Working rule:

- do not rely on sitemap-only discovery
- every important freshness page should also have at least one strong SSR crawl path

### Match-page linkage rule

The canonical match page should become the strongest stable discovery node for these pages by exposing links such as:

- match preview
- live updates
- result/highlights

That makes the relationship obvious to crawlers:

- this is the match entity
- these are related editorial surfaces for the same match

### Retention rule

Freshness pages should not disappear from the crawl graph immediately after live play ends.

Recommended retention:

- preview pages remain linked through series or archive context while useful
- live-update pages hand off to result/highlights pages
- result/highlights pages stay linked from archive or recent-results surfaces

### Verification

For each sample freshness page, verify:

- linked from at least one SSR hub
- linked from the canonical `/cric-live/{slug}`
- present in sitemap output
- links back to the canonical match page
- still reachable from an archive or series surface after the live window

### Slice E: Keyword targeting framework

Document which query families belong to:

- canonical match page
- live-update/news page
- preview page
- result/highlights page

### Slice F: Verification

Verify on live-like samples:

- raw SSR title/H1/description
- visible timestamps
- structured data presence
- internal links
- no canonical conflicts with `/cric-live/{slug}`

## Freshness update cadence

These pages should not all update on the same schedule.

### Preview pages

- publish in the `30-120h` discovery window
- update only on meaningful prematch changes
- expected cadence: `1-4` meaningful edits before the match

### Live-update pages

- publish shortly before start or at toss
- update during the match on meaningful editorial changes
- expected cadence:
  - marquee matches: roughly every `2-5` minutes when real updates exist
  - normal matches: roughly every `5-10` minutes when real updates exist

### Result/highlights pages

- first update soon after result
- one fuller follow-up update shortly after if needed
- expected cadence:
  - first result update: `5-15` minutes after finish
  - fuller follow-up: `30-90` minutes later when appropriate

### Important rule

- do not bump visible updated time, `dateModified`, or sitemap freshness on every tiny data poll
- only move freshness timestamps when the editorially visible page content changed in a meaningful way

## Proposed keyword ownership

### Canonical `/cric-live/{slug}`

Primary ownership:

- `live score`
- `scorecard`
- `commentary`
- `playing xi`
- `toss`
- `match details`

### Preview page

Primary ownership:

- `match preview`
- `pitch report`
- `weather`
- `predicted playing xi`
- `toss time`

### Live update or news page

Primary ownership:

- `live updates`
- `today match live score`
- `full scorecard`
- freshness-heavy news-style match queries

### Result or highlights page

Primary ownership:

- `match result`
- `highlights`
- `won by`
- `full scorecard`
- `post match recap`

## Suggested execution order

1. Lock the editorial route and canonical rules.
2. Define the minimal content model for preview, live-update, and result pages.
3. Build one sample vertical slice for a real match.
4. Add internal linking from the canonical match page and hubs.
5. Verify timestamps, structured data, and no canonical conflicts.
6. Expand only after the first slice proves it can earn discovery without harming the canonical match entity.

## Guardrails

- `/cric-live/{slug}` stays canonical for the match entity.
- Editorial pages must not become thin duplicates of the canonical match page.
- Timestamp freshness must reflect real content updates.
- Match SEO breadth and article freshness should complement each other, not cannibalize each other.
- If a page does not have enough editorial substance, do not ship it just to chase `minutes ago` labels.

## Plain-English conclusion

Yes, there is already **similar work** in the repo.

What already exists covers:

- canonical match SEO
- lifecycle discovery
- hub discovery
- scorecard/commentary/lineup intent
- earlier prematch discovery

What still needs a dedicated plan is:

- the **fresh editorial/news/live-update support layer** that can compete for the SERP patterns showing recent timestamps and news-style snippets

So the right move is **not** to create another generic match SEO phase.

The right move is to create **one focused next phase** for:

- preview
- live-update/news freshness
- result/highlights support

while keeping the existing canonical `/cric-live/{slug}` strategy intact.
