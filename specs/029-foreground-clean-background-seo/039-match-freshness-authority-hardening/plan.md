# Implementation Plan: Match Freshness Authority Hardening

**Branch**: `039-match-freshness-authority-hardening` | **Date**: 2026-06-28 | **Spec**: `specs/039-match-freshness-authority-hardening/spec.md`  
**Input**: Feature specification from `/specs/039-match-freshness-authority-hardening/spec.md`

## Summary

Harden the freshness-support layer added in `038` so Crickzen can compete more credibly for freshness-heavy match queries without weakening the canonical `/cric-live/{slug}` model. The work should deepen the live-update surface, tighten freshness trust signals, preserve post-match value, and add proof/monitoring instead of just increasing route volume.

## Technical Context

**Primary Goal**: Turn the first freshness-support slice into a credible match-news/live-update system with honest schema, timestamps, retention, and observability.

**Stack**:
- Angular 7 frontend under `apps/frontend`
- Spring Boot backend under `apps/backend/spring-security-jwt`
- Existing structured-data and SEO utilities under `apps/frontend/src/app/seo`
- Existing sitemap generation under backend `service/seo`
- Existing SEO dashboard and verification surfaces under `tools/seo-dashboard` and related docs

**Dependencies**:
- `specs/038-match-news-freshness-support` must remain the base freshness slice
- Existing canonical/discovery work from `032`, `034`, `035`, `036`, and `037`

**Constraints**:
- Keep `/cric-live/{slug}` canonical stable
- Do not emit fake `LiveBlogPosting`
- Do not churn timestamps for non-editorial background updates
- Do not create freshness pages that are only thin copies of canonical match content
- Prefer SSR-verifiable discovery and retention over crawler assumptions

## Scope

### In Scope

- Add stronger content modules for live-update pages, especially key-events and match-development summaries
- Extend structured-data support to handle article/news/live-update distinctions more honestly
- Enforce a meaningful-change cadence policy for timestamps and `dateModified`
- Formalize keyword ownership across canonical, preview, live-update, and result pages
- Define and implement post-match retention paths for freshness pages
- Add proof and observability for freshness readiness and performance
- Decide whether a dedicated freshness/news sitemap should be implemented now or deferred

### Out of Scope

- Replacing the canonical `/cric-live/{slug}` route family
- Reopening child-route self-canonicalization strategy
- Building a full editorial CMS workflow from scratch
- Depending on unsupported Google Indexing API patterns for text live updates
- Broad redesign of all match surfaces unrelated to freshness intent

## Current Repo Baseline

- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.ts` already provides the first route family and timestamp rendering.
- `apps/frontend/src/app/seo/structured-data.service.ts` currently stops short of richer freshness-oriented schema helpers.
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java` already includes freshness routes in the general sitemap.
- `specs/038-match-news-freshness-support/tasks.md` still has open work around keyword ownership, cadence enforcement, and verification; this phase should absorb that unfinished depth work rather than duplicate it informally.

## Proposed Implementation Slices

### Slice A - Keyword and page-purpose contract

Create the explicit ownership matrix for:
- canonical match page
- preview page
- live-update page
- result/recap page

This slice should define:
- primary query lane
- title/H1 intent
- required modules
- supporting internal links
- what each page must not try to own

### Slice B - Key events and match-development layer

Upgrade live-update pages beyond simple commentary cards by introducing:
- key-events extraction
- innings-state summaries
- turning-point or match-development copy
- graceful degradation when event density is too low

Likely frontend areas:
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/`
- shared match-data mapping utilities

### Slice C - Structured-data hardening

Extend the structured-data service to support:
- article/news distinctions where useful
- optional `LiveBlogPosting`
- explicit date alignment with visible timestamps

This slice must include guardrails so:
- fake live-blog schema is impossible
- preview/result pages stay article-like
- live-update pages only escalate schema when they have qualifying visible entries

### Slice D - Meaningful-change freshness policy

Implement a reusable freshness decision layer that controls when:
- visible `Updated` changes
- `dateModified` changes
- event entries count as real editorial updates

Possible sources of meaningful change:
- new key event
- innings transition
- toss confirmed
- lineup materially updated
- final result posted
- recap summary materially changed

### Slice E - Retention and archive discovery

Define how freshness pages remain reachable after live play via:
- canonical match page
- recent results
- series hubs
- archive/recent-completed surfaces

This slice should decide:
- how long live-update pages remain prominent
- when result pages become the primary post-match freshness surface
- whether preview pages stay linked after match start or move to historical context only

### Slice F - Sitemap and observability decision

Decide whether to:
- keep using the general sitemap only, or
- add a dedicated freshness/news sitemap now

Also define the proof layer for:
- raw SSR checks
- sitemap checks
- link-graph checks
- schema checks
- readiness scoring or sample-fixture monitoring

## File Areas Likely Involved

```text
specs/039-match-freshness-authority-hardening/
├── spec.md
└── plan.md

specs/038-match-news-freshness-support/
└── tasks.md

apps/frontend/src/app/
├── features/seo-hubs/match-freshness-page/
├── seo/
├── home/
├── features/matches/
└── cricket-odds/

apps/backend/spring-security-jwt/src/main/java/com/devglan/
├── service/seo/
└── controller/

tools/seo-dashboard/
docs/
```

## Implementation Order

1. Write the keyword-ownership and page-purpose matrix first so content, schema, and links all follow one contract.
2. Upgrade the live-update page model with key-events and match-development blocks.
3. Extend structured-data support with article/news/live-update distinctions and schema guardrails.
4. Implement meaningful-change freshness rules for timestamps and `dateModified`.
5. Add or refine retention paths from canonical, archive, series, and recent-results surfaces.
6. Decide and document the sitemap strategy.
7. Add verification and monitoring hooks so the rollout has proof.

## Verification Strategy

1. Raw SSR HTML checks for one preview, one live-update, one result page, and the related canonical match page
2. JSON-LD checks confirming schema type, timestamp alignment, and optional `LiveBlogPosting` eligibility
3. No-change versus meaningful-change timestamp proof for at least one sample fixture
4. Crawl-path verification from canonical page plus at least one hub or archive surface
5. Post-match retention verification for a completed fixture
6. Monitoring proof showing how operators can inspect freshness readiness and regressions

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event extraction is too shallow or noisy | Live-update page still feels thin | Start with a limited set of high-confidence event types and degrade honestly |
| `LiveBlogPosting` is over-applied | Structured-data trust drops | Gate it on visible real update entries only |
| Timestamp policy is too sensitive | Artificial freshness churn | Centralize meaningful-change rules and verify no-change snapshots |
| Retention links become messy | Crawl graph duplicates and confusion | Define one post-match path hierarchy before expanding links |
| Monitoring remains too manual | Hard to prove impact | Reuse the existing SEO dashboard/tooling where possible and document a minimum proof workflow |

## Recommended First Vertical Slice

Use one real high-interest live fixture and one completed fixture to prove the system end to end:

- High-interest live fixture:
  - key-events block
  - match-development summary
  - optional `LiveBlogPosting` eligibility
  - meaningful timestamp behavior

- Completed fixture:
  - result/recap retention path
  - archive/recent-results discovery
  - post-match schema and timestamp stability

Only expand after the slice proves:
- the page feels materially different from the canonical match page
- timestamps behave honestly
- schema matches the real page state
- archived discovery remains intact
