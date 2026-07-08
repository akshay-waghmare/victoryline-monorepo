# Implementation Plan: Prematch Discovery Monitoring

**Branch**: `025-prematch-discovery-monitoring` | **Date**: 2026-06-18 | **Spec**: `specs/025-prematch-discovery-monitoring/spec.md`  
**Input**: Feature specification from `/specs/025-prematch-discovery-monitoring/spec.md`

## Summary

Treat Phase 025 as an observability-first pass for prematch discovery. The work should prove that upcoming canonical pages already exist, measure where crawlers can actually find them 12-48 hours before start, verify that prematch SSR content is worth discovering, and extend the standalone SEO dashboard so upcoming discovery health is visible without touching canonical policy or route behavior.

## Current Audit Snapshot

- Production upcoming feed already publishes `externalMatchKey` values for future fixtures.
- Acceptance sample on 2026-06-18: Texas Super Kings vs Seattle Orcas is publicly available at `/cric-live/so-vs-tsk-1st-match-major-league-cricket-2026-match-updates-110W` ahead of its scheduled start on 2026-06-19 00:30 UTC / 2026-06-19 06:00 IST.
- The sample page already returns HTTP 200 with a self-canonical tag, `robots=index,follow`, title, description, H1, FAQ content, and `SportsEvent` structured data.
- The sample URL is present in the match sitemap and in raw HTML for `/cricket-schedule/today`.
- The same sample URL was absent from raw HTML for `/`, `/matches`, `/live-score`, and `/live-score/today` at audit time.
- `apps/frontend/src/app/features/seo-hubs/live-score-hub/live-score-hub.component.ts` currently short-circuits SSR to sitemap fallback links on the server path, so current hub exposure is not yet a clean proxy for deliberate upcoming selection.
- `tools/seo-dashboard/collector.py` currently collects `liveMatches` only, which means the monitoring surface cannot yet explain prematch existence, discovery coverage, or completeness.

## Technical Context

**Language/Version**: Python 3.x, Angular 7.2.x, TypeScript 3.2.x, PowerShell  
**Primary Dependencies**: `requests`, Google Search Console service account flow, `tools/seo-dashboard`, `MatchesService`, `MetaTagsService`, frontend match SEO and structured-data services  
**Storage**: None; use cached API responses and production HTML audits only  
**Testing**: Focused `tools/seo-dashboard` collector tests plus local dashboard API smoke checks and raw production sample audits  
**Target Platform**: `tools/seo-dashboard`, `apps/frontend` trace surfaces, `specs/025-prematch-discovery-monitoring`  
**Project Type**: Monorepo web app with a standalone monitoring utility  
**Performance Goals**: Keep dashboard refreshes lightweight with caching and small sample sets; avoid excessive GSC inspection traffic  
**Constraints**: Do not change `/cric-live/{slug}` canonicals, do not reopen Spec 023, do not edit unrelated dirty live-score work, and do not require production restarts for the discovery pass  
**Scale/Scope**: Prematch URL existence proof, hub exposure tracing, prematch completeness proof, and dashboard data-model expansion for monitoring

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | The phase measures real production fixture timing and raw HTML behavior instead of assuming discovery from code intent alone. |
| II. Monorepo Architecture Standards | PASS | Monitoring work stays in the standalone dashboard and traceable frontend surfaces without cross-cutting runtime rewrites. |
| III. REST API Design Standards | PASS | No public API contract changes are required for the discovery pass. |
| IV. Testing Requirements | PASS | Focused collector tests and repeatable production probes are part of the planned deliverable. |
| V. Performance Standards for Live Updates | PASS | Cached monitoring avoids adding noisy refresh load to live services. |
| VI. Frontend UI/UX Standards | PASS | The phase surfaces discovery gaps in monitoring first and defers UX or route behavior changes until evidence is complete. |

## Project Structure

### Documentation

```text
specs/025-prematch-discovery-monitoring/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
tools/seo-dashboard/
├── collector.py
├── templates/index.html
├── static/dashboard.js
├── static/dashboard.css
└── tests/test_collector.py

apps/frontend/src/app/
├── features/seo-hubs/live-score-hub/live-score-hub.component.ts
├── features/seo-hubs/live-score-hub/live-score-hub.component.html
├── home/home.component.ts
├── seo/match-seo.service.ts
├── seo/structured-data.service.ts
└── cricket-odds/cricket-odds.component.ts
```

**Structure Decision**: Keep the actual implementation target centered on `tools/seo-dashboard` because that is where monitoring belongs. Frontend files are trace surfaces for explaining current SSR selection and prematch completeness, not automatic Phase 025 edit targets unless the later evidence review explicitly approves them.

## Planned Data Model Expansion

Add a prematch monitoring layer alongside the existing live dashboard payload:

- `upcomingSamples`: sampled fixtures in the next 12-48 hours with exact UTC and local start timestamps.
- `hubCoverage`: per-sample booleans for `/`, `/matches`, `/live-score`, `/live-score/today`, `/cricket-schedule/today`, and sitemap membership.
- `prematchHtml`: page-proof fields such as title, description, canonical, robots, H1, FAQ, `SportsEvent`, `LiveBlogPosting`, and visible context markers like venue, toss, and playing XI placeholders.
- `sampleWindow`: metadata that explains how the sample was chosen and when the proof was generated.

This preserves the current `liveMatches` section instead of mixing live and upcoming states into one ambiguous table.

## Current Architecture Findings To Preserve

1. `LiveScoreHubComponent` uses `loadSitemapLinks()` and returns early on server render, so SSR hub pages currently rely on sitemap-derived fallback links rather than direct live/upcoming feed selection.
2. `getPrimaryFallbackLinks()` and `getDiscoveryFallbackLinks()` slice the sitemap differently by hub type, which means schedule-page visibility can happen because of link ordering rather than true upcoming intent.
3. `HomeComponent` already builds discovery links from live and upcoming feed data, so homepage behavior should be audited separately from live-score hub fallback behavior.
4. `MatchSeoService` already keeps one canonical match URL across prematch, live, and completed states, so Phase 025 should consume that policy rather than modify it.
5. `tools/seo-dashboard/collector.py` currently reads live feed, sitemap, hubs, and GSC, but it stops at `data["liveMatches"]` and therefore cannot yet answer the prematch discovery question.

## Execution Order

1. Create the `025` spec, plan, and tasks artifacts with the current production proof.
2. Extend the standalone dashboard collector so it can sample upcoming fixtures in the 12-48 hour window.
3. Add hub-coverage and prematch-completeness proof for each sampled fixture.
4. Update the dashboard UI to render upcoming discovery samples separately from live-match SEO health.
5. Add focused tests and a repeatable production sample-audit workflow.
6. Revisit whether any frontend discovery logic changes are still necessary after the monitoring evidence is visible.

## Definition of Done

- The repo contains a documented Phase 025 scope that keeps canonicals and Spec 023 untouched.
- Monitoring can prove at least one real upcoming canonical URL exists before start.
- Monitoring can show where that URL is and is not discoverable in raw SSR HTML.
- Monitoring can report whether the prematch page already has sufficient metadata and `SportsEvent` coverage.
- The dashboard data model exposes upcoming prematch samples separately from current live pages.
