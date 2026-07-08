# Implementation Plan: Early Upcoming Discovery Window

**Branch**: `037-early-upcoming-discovery-window` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

## Summary

Shift Crickzen's prematch discovery and submission defaults earlier by targeting canonical upcoming match URLs in the next 4-5 days, prioritizing the `30-120h` band across the automatic indexer, SSR discovery surfaces, and the local SEO dashboard.

## Technical Context

**Language/Version**: Java 8 / Spring backend, TypeScript (Angular 7), Python 3  
**Primary Dependencies**: `LiveMatchIndexingScheduler`, `LiveMatchesService`, homepage/matches/series discovery utilities, `tools/seo-dashboard` collector/UI  
**Storage**: No new persistent storage in this phase  
**Testing**: JUnit backend scheduler tests, Karma/Jasmine discovery tests, Python unittest collector tests  
**Target Platform**: Spring backend, Angular Universal SSR, local SEO dashboard against production signals  
**Constraints**: Keep live URLs highest priority; do not turn manual submission into a blanket all-URLs strategy; preserve canonical `/cric-live/{slug}` policy  

## Constitution Check

- **Stable canonical policy**: PASS. No route or canonical change.
- **Discovery before migration**: PASS. This is a timing and prioritization change, not route churn.
- **Proof over assumptions**: PASS. Work will add and update focused scheduler, dashboard, and discovery-surface tests.
- **Scoped blast radius**: PASS. Changes are limited to scheduling logic, discovery prioritization, and operator-facing defaults.

## Project Structure

### Documentation

```text
specs/037-early-upcoming-discovery-window/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code

```text
apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/
apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/
apps/frontend/src/app/core/utils/
apps/frontend/src/app/home/
apps/frontend/src/app/features/matches/pages/matches-list/
apps/frontend/src/app/features/stats/series-page/
tools/seo-dashboard/
docs/
```

## Phase 1: Backend early-discovery submission window

- Add a configurable upcoming indexing horizon with a default of `120` hours.
- Keep live matches first.
- Prefer `30-120h` upcoming fixtures ahead of shorter-horizon catch-up fixtures in the automatic indexer.

## Phase 2: SSR discovery-surface alignment

- Update prioritized upcoming discovery calls on homepage, `/matches`, and `/series` from `12-48h` to `30-120h`.
- Preserve deduplication and existing crawlable-link caps.

## Phase 3: Dashboard and operator alignment

- Change the collector's default upcoming window to `30-120h`.
- Update manual-submission reasons so early discovery is treated as the target state.
- Update dashboard copy so the operator-facing labels no longer imply `12-48h` is the primary window.

## Phase 4: Strategy documentation

- Update the prematch strategy doc to reflect the new preferred window.
- Keep the guidance explicit that we still do not want to manually submit every URL.

## Verification

- JUnit test coverage for 30-120 hour eligibility and >120 hour exclusion.
- Focused frontend unit tests covering the new prioritized discovery band.
- Python unittest coverage for updated queue scoring.
