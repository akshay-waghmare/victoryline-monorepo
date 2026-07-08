# Implementation Plan: Live Score Fast Lane

**Branch**: `020-live-score-fast-lane` | **Date**: 2026-06-10 | **Spec**: `specs/020-live-score-fast-lane/spec.md`

## Summary

Activate Crickzen's existing persistent-page `sV3` interceptor in production, add fast-lane coverage diagnostics, and adopt the useful part of betx21's architecture by publishing one complete merged per-match websocket snapshot while retaining legacy topics and slower reconciliation.

## Technical Context

**Languages**: Python, Java, Angular 7 / TypeScript 3.2, Docker Compose  
**Primary Components**: `CrexScraperService`, scraper `/health`, `CricketDataService`, `CricketDataController`, `LiveHeroStateService`  
**Testing**: Focused pytest, JUnit, frontend unit tests, backend compile, frontend production build  
**Performance Goal**: Changed upstream `sV3` data should use the immediate-push path; browser updates should not wait for the periodic full scrape  
**Constraints**: Preserve full scrapes, lifecycle sync, legacy websocket topics, persistent-page capacity limits, and PID restart protection

## Architecture Decision

Use two complementary paths:

1. **Fast lane**: persistent live-match pages intercept changed `sV3` responses, immediately POST changed data, and broadcast a complete merged snapshot.
2. **Correctness lane**: periodic full scraping and lifecycle reconciliation continue to restore missed details and repair drift.

This transfers betx21's hot-stream plus merged-snapshot behavior without replacing Crickzen's existing safety mechanisms.

## Execution Order

1. Record the production evidence and fast-lane contract in Spec Kit artifacts.
2. Enable fast updates and persistent pages in production defaults.
3. Expose fast-update coverage in scraper health.
4. Publish complete merged backend snapshots in addition to legacy fields.
5. Subscribe the live hero to the snapshot topic with legacy compatibility.
6. Run focused tests, compiles, and production-build verification.

## Rollout Guardrails

- Keep `PERSISTENT_PAGE_MAX_COUNT` bounded.
- Keep PID and memory restart thresholds active.
- Verify health coverage and resource usage before and after any production rollout.
- Roll back by overriding `ENABLE_PERSISTENT_PAGES=false` if persistent-page resource use becomes unsafe.
