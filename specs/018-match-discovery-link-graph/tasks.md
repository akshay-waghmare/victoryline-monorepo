---
description: "Task list for roadmap Phase 1: match discovery, crawlable links, and sitemap freshness"
---

# Tasks: Match Discovery and Crawl Graph

**Input**: Design documents from `/specs/018-match-discovery-link-graph/`  
**Generated**: 2026-06-07  
**Branch**: `018-match-discovery-link-graph`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Frontend utility coverage, backend sitemap regression, and audit-script output review.

## Phase 1: Documentation

- [x] T001 Create `specs/018-match-discovery-link-graph/spec.md`
- [x] T002 Create `specs/018-match-discovery-link-graph/plan.md`
- [x] T003 Create `specs/018-match-discovery-link-graph/tasks.md`

## Phase 2: Shared Discovery Helpers

- [x] T004 Add shared canonical match-link helpers in `apps/frontend/src/app/core/utils/match-utils.ts`
- [x] T005 Add frontend unit coverage for match-link helpers in `apps/frontend/src/app/core/utils/match-utils.spec.ts`
- [x] T006 Align `app-match-card` href generation with the shared helper in `apps/frontend/src/app/features/matches/components/match-card/match-card.component.ts`

## Phase 3: Crawlable Discovery Surfaces

- [x] T007 Add a compact homepage direct-link cluster for canonical match pages in `apps/frontend/src/app/home/home.component.{ts,html,css}`
- [x] T008 Add a compact `/matches` direct-link cluster for currently surfaced match pages in `apps/frontend/src/app/features/matches/pages/matches-list/matches-list.component.{ts,html,css}`

## Phase 4: Sitemap Freshness

- [x] T009 Parse live-match `lastStateUpdatedAt` in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/LiveMatchesService.java`
- [x] T010 Use live-match update timestamps for sitemap `lastmod` in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java`
- [x] T011 Add any needed timestamp-format helper in `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapWriter.java`

## Phase 5: Verification

- [x] T012 Extend `scripts/Audit-MatchSeo.ps1` to report internal `/cric-live/` link counts and flag missing discovery links on home or `/matches`
- [x] T013 Add backend regression coverage for live-match `lastmod` freshness in `apps/backend/spring-security-jwt/src/test/java/com/devglan/seo/SitemapPartitionTest.java`
- [x] T014 Run focused verification for the sitemap freshness and discovery-link changes
