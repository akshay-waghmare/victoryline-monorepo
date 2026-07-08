# Implementation Plan: Series Discovery Hub Enrichment

**Branch**: `036-series-discovery-hub-enrichment` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

## Summary

Turn `/series` into a lightweight prematch discovery hub by surfacing grouped upcoming canonical match links, add `/series` to the monitored discovery-hub set, and ensure `/series` is included in the static sitemap coverage.

## Technical Context

**Language/Version**: TypeScript (Angular 7 app), Java 8 / Spring backend, Python 3 dashboard tools  
**Primary Dependencies**: Angular component layer, `MatchesService`, `match-utils`, Spring `SitemapService`, `tools/seo-dashboard` collector  
**Storage**: No new durable storage  
**Testing**: Karma/Jasmine frontend unit specs, JUnit backend unit tests, Python unittest for dashboard collector  
**Target Platform**: Angular Universal SSR plus Spring backend and local operator dashboard  
**Project Type**: Monorepo with frontend, backend, and tooling  
**Performance Goals**: Keep `/series` lightweight and avoid large unbounded match lists  
**Constraints**: Keep canonical `/cric-live/{slug}` strategy unchanged; avoid route churn; preserve current series detail overlay behavior  
**Scale/Scope**: Small product-surface enrichment with matching monitoring and sitemap updates

## Constitution Check

- **Stable canonical policy**: PASS. No new public canonical route is introduced.
- **Discovery before migration**: PASS. Work improves discovery timing through hubs and sitemap, not URL churn.
- **Proof over assumptions**: PASS. Changes include focused tests on the series page, sitemap static paths, and dashboard hub detection.
- **Scoped blast radius**: PASS. Work is limited to `/series`, sitemap static paths, and dashboard monitoring.

## Project Structure

### Documentation

```text
specs/036-series-discovery-hub-enrichment/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code

```text
apps/frontend/src/app/features/stats/series-page/
apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/
apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/
tools/seo-dashboard/
```

## Phase 1: `/series` discovery enrichment

- Add a grouped upcoming canonical match section to `/series`.
- Reuse existing match discovery ordering so the 12-48 hour window stays preferred.
- Keep the section capped and readable so the page does not become noisy.
- Update page structured data to expose the surfaced discovery links.

## Phase 2: Monitoring alignment

- Add `/series` to the dashboard discovery-hub path set.
- Expose a row-level series-hub flag so operators can prove presence or absence.

## Phase 3: Sitemap alignment

- Add `/series` to the static sitemap path list.
- Extend backend tests so the omission cannot regress quietly.

## Verification

- Frontend unit spec covering grouping, deduplication, and link exposure logic.
- Backend JUnit coverage confirming `/series` is present in partition 1.
- Python unittest coverage confirming the dashboard recognizes `/series` as a hub.
