# Implementation Plan: Match Lifecycle Discovery And Surface SEO

**Branch**: `034-match-lifecycle-discovery-surface-seo` | **Date**: 2026-06-27 | **Spec**: `specs/034-match-lifecycle-discovery-surface-seo/spec.md`
**Input**: Feature specification from `/specs/034-match-lifecycle-discovery-surface-seo/spec.md`

## Summary

Strengthen the one-canonical-page SEO strategy by improving lifecycle discovery before match start, during live, and after completion, while making the canonical match page answer match-info, scorecard, and lineups intent more explicitly in SSR. This phase does not reopen route churn and focuses on a limited but honest entity graph: lifecycle hubs, canonical match pages, archive/result retention, and a lightweight `/series` intent surface that can be enriched later.

## Technical Context

**Language/Version**: TypeScript 3.2.x (Angular 7.2.x), PowerShell for verification scripts  
**Primary Dependencies**: `MatchesService`, `HomeComponent`, `MatchesListComponent`, `LiveScoreHubComponent`, `MetaTagsService`, `StructuredDataService`, `MatchSeoService`, `CricketOddsComponent`, Angular SSR  
**Storage**: None  
**Testing**: Focused frontend checks plus raw HTML lifecycle audits against local SSR and production samples  
**Target Platform**: `apps/frontend`, `scripts/`, and optional `tools/seo-dashboard` verification support  
**Project Type**: Frontend-focused lifecycle SEO phase with verification tooling  
**Constraints**: Keep `/cric-live/{slug}` canonical; do not make child tab routes self-canonical; include `/series` as a lightweight intent node without blocking on full completion; keep support copy honest when data is missing

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | Lifecycle hub selection stays tied to real upcoming, live, and completed feed state. |
| II. Monorepo Architecture Standards | PASS | Work stays inside existing frontend SEO, hub, and verification surfaces. |
| III. REST API Design Standards | PASS | No public API contract changes are required for the first slice. |
| IV. Testing Requirements | PASS | Phase ends with raw HTML lifecycle proof and sample-based verification. |
| V. Performance Standards for Live Updates | PASS | Focus is SSR exposure and metadata, not heavier polling or transport changes. |
| VI. Frontend UI/UX Standards | PASS | Keeps the hero-first match view and uses secondary SEO support zones already present. |

## Project Structure

### Documentation

```text
specs/034-match-lifecycle-discovery-surface-seo/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/
├── home/
│   ├── home.component.ts
│   └── home.component.html
├── features/
│   ├── matches/pages/matches-list/
│   │   ├── matches-list.component.ts
│   │   └── matches-list.component.html
│   ├── stats/series-page/
│   │   ├── series-page.component.ts
│   │   └── series-page.component.html
│   └── seo-hubs/live-score-hub/
│       ├── live-score-hub.component.ts
│       └── live-score-hub.component.html
├── seo/
│   ├── structured-data.service.ts
│   └── meta-tags.service.ts
└── cricket-odds/
    ├── cricket-odds.component.ts
    └── cricket-odds.component.html

scripts/
└── Audit-MatchSeo.ps1

tools/seo-dashboard/
└── collector.py
```

## Architecture Decisions

1. **Keep one canonical match page**
   The canonical match URL remains `/cric-live/{slug}`. Commentary, match info, scorecard, and lineups stay as intent sections inside that page rather than becoming independent canonical pages.

2. **Treat lifecycle discovery as a graph problem**
   Upcoming, live, and completed URLs should each have at least one strong SSR discovery path. The solution is not "more links everywhere" but deliberate lifecycle buckets across schedule, live-score, homepage, matches, and archive surfaces.

3. **Use hub schema to support the graph**
   Hub pages currently ship with zero JSON-LD. Add only honest, visible structured data such as breadcrumb, FAQ, and collection/item-list style schema that matches the real page content.

4. **Use a limited, honest entity graph**
   The graph in this phase should be explicit and real: schedule hubs, live hubs, `/matches`, canonical match pages, archive/result hubs, and the current `/series` surface. Breadcrumbs and support links should point only to real destinations, while `/series` is treated as a seed traffic surface rather than a fully-finished entity page.

5. **Use the existing support surfaces on the match page**
   The match page already exposes jump links and support summaries for commentary, match details, scorecard, and lineups. Strengthen those SSR surfaces rather than inventing a second SEO-only page structure.

6. **Keep result retention explicit**
   Completed match discoverability should be preserved in `/matches` and archive/result hubs so the lifecycle does not end when the live card drops away.

## Execution Order

1. Define the lifecycle sample contract used by hubs and audits: upcoming (12-48 hours), live, and recent completed.
2. Strengthen homepage and `/matches` lifecycle buckets so all three states are represented in crawlable SSR HTML.
3. Refine the live-score and schedule hubs so each hub has a clear lifecycle role and archive/result retention path.
4. Add structured-data and breadcrumb support for lifecycle hubs so they no longer ship as schema-empty pages.
5. Include `/series` as a lightweight intent node through links, metadata improvements, and honest breadcrumb destinations where reliable series context exists.
6. Strengthen canonical match-page SSR wording and breadcrumb/support-link behavior for match info, scorecard, and lineups using the existing support zones and tab intros.
7. Extend verification so lifecycle sample URLs can be checked repeatedly in raw HTML, including breadcrumb validity, series-link behavior, and support-link behavior.

## Verification Approach

1. Run focused frontend compile or spec checks where the local test infrastructure permits.
2. Serve the SSR frontend locally and fetch:
   - one upcoming sample URL
   - one live sample URL
   - one completed sample URL
   - homepage
   - `/matches`
   - `/live-score`
   - `/live-score/today`
   - `/live-cricket-score`
   - `/cricket-schedule/today`
   - `/live-score/archive`
3. Verify:
   - canonical and robots on sampled match pages
   - lifecycle hub coverage for exact sampled URLs
   - non-zero hub JSON-LD where expected
   - breadcrumb validity and real-destination support links
   - lightweight series-link behavior and `/series` intent capture where reliable series context exists
   - fixture-specific match-info, scorecard, and lineups SSR copy on the canonical page
4. Re-run the production audit path with exact URLs after rollout so the lifecycle proof is durable.

## Risks And Mitigations

- **Risk**: Hub pages become bloated or repetitive.
  **Mitigation**: Give each hub one lifecycle job instead of dumping all states everywhere.

- **Risk**: Hub structured data becomes fake or generic.
  **Mitigation**: Emit only schema that mirrors visible breadcrumbs, FAQs, and match collections from that exact hub.

- **Risk**: Breadcrumbs imply entity pages we do not really have yet.
  **Mitigation**: Use only real reachable lifecycle destinations in this phase and treat `/series` as a seed surface rather than a finished entity page.

- **Risk**: Including `/series` creates fake depth.
  **Mitigation**: Limit this phase to series metadata, links, and intent capture that the current surface can honestly support.

- **Risk**: Match-page SEO support copy crowds out UX again.
  **Mitigation**: Keep the hero and score-first layer untouched and strengthen only the existing secondary support surfaces.

- **Risk**: Completed results still disappear after the live window.
  **Mitigation**: Make archive/result retention an explicit verification checkpoint, not an assumed by-product.

## Definition Of Done

- Upcoming, live, and completed sample match URLs are all reachable through raw SSR hub HTML, not sitemap-only.
- Hub pages emit honest structured data instead of zero schema.
- Breadcrumbs and support links form a real lifecycle entity graph, with `/series` included as a lightweight intent surface rather than an overstated finished entity.
- `/series` participates in traffic-capture and internal-linking work strongly enough to support later enrichment.
- The canonical match page exposes stronger fixture-specific SSR support for match info, scorecard, and lineups.
- Completed matches remain linked from result/archive surfaces after live play ends.
- Lifecycle verification can be rerun with exact sample URLs and produce clear coverage proof.
