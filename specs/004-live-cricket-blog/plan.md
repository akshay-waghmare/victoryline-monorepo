# Implementation Plan: Live Cricket Updates Blog (Strapi + Angular + Scully)

Branch: `004-live-cricket-blog` | Date: 2025-11-12 | Spec: specs/004-live-cricket-blog/spec.md
Input: Feature specification from `/specs/004-live-cricket-blog/spec.md`

Note: This plan is generated per speckit.plan workflow without running PowerShell (pwsh unavailable). All artifacts are created in the feature folder.

## Summary

Deliver an SEO-first blog for live cricket updates using Strapi as headless CMS, Angular 8 pre-rendered with Scully for `/blog` and `/blog/:slug`, and a Spring Boot 3.x SSE backend for real-time `/live/:matchId` updates. Content goes live quickly via dynamic fetch from Strapi (cached) and is solidified by a nightly Scully rebuild. Images are optimized at upload-time in Strapi (WebP + responsive sizes, OG 1200x630). Auth for editor actions is enforced via Spring Boot proxy middleware; public reads remain unauthenticated and cacheable.

## Technical Context

- Language/Version:
  - Frontend: Angular 8 (TypeScript 3.x) with Scully
  - Backend: Spring Boot 3.x (Java 17+ preferred; align with repo actual), SSE for live feed
  - CMS: Strapi (Node.js, MySQL)
- Primary Dependencies:
  - Scully (pre-render), Angular Router, HttpClient, markdown-it/marked for MD rendering
  - Spring Web, Spring Security (JWT), Spring Cache (Redis), Jackson, JPA (for LiveEvent)
  - Strapi upload plugin + responsive image/Sharp integration
  - Nginx serving dist/static
- Storage:
  - Strapi: MySQL (BlogPost, media)
  - Backend: MySQL table for LiveEvent; Redis for cache
- Testing:
  - Backend: JUnit + Spring Boot Test (integration), WireMock for Strapi
  - Frontend: Karma/Jasmine for components/services; Lighthouse CI + axe-core for SEO/a11y
  - Contracts: OpenAPI for backend endpoints
- Target Platform:
  - Linux (Dockerized services via docker-compose)
- Project Type:
  - Monorepo with apps/frontend (Angular), apps/backend (Spring), apps/scraper (Python)
- Performance Goals:
  - LCP < 2.5s, Lighthouse ≥ 90 mobile; Backend cached reads p95 < 200ms; Live latency < 2s
- Constraints:
  - Keep SPA for non-blog routes; SEO only for /blog; No tight coupling to Strapi schema beyond documented fields; Avoid vendor lock-in for live updates
- Scale/Scope:
  - 10k concurrent readers on blog; hundreds on live pages; dozens of posts/day

## Constitution Check

- I. Real-Time Data Accuracy: PASS — SSE targets <2s; timestamps included in LiveEvent
- II. Monorepo Standards: PASS — Services remain isolated, REST-only contracts
- III. REST API Design: PASS — Versioned endpoints `/api/v1/...`, standard codes, JSON envelope
- IV. Testing Requirements: PASS — Unit/integration tests planned; Lighthouse/axe for frontend
- V. Performance Standards: PASS — Cache, SSE, pre-rendering meet targets
- VI. Frontend UI/UX Standards: PASS — Mobile-first, accessibility, design tokens in UI work

Re-check planned after Phase 1 artifacts.

## Project Structure

Documentation (this feature)

specs/004-live-cricket-blog/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (decisions & alternatives)
├── data-model.md        # Phase 1 output (entities, validations)
├── quickstart.md        # Phase 1 output (how to run/setup)
├── contracts/           # Phase 1 output (OpenAPI)
└── spec.md              # Feature specification (clarified)

Source Code (existing + additions)

backend/
- apps/backend/spring-security-jwt/
  - src/main/java/com/devglan/blog/ (optional read proxy) [NEEDS CLARIFICATION]
  - src/main/java/com/devglan/live/ (SSE controller, LiveEvent entity/repo/service)
  - src/main/resources/db/migration/ Vxxx__create_live_event.sql

frontend/
- apps/frontend/
  - src/app/blog/ (list/detail components, services, SEO meta)
  - src/app/live/ (LiveMatchComponent for SSE)
  - scully configuration for dynamic blog routes

Structure Decision: Web application with separate backend/frontend modules per monorepo; feature code co-located within each app under feature folders.

## Complexity Tracking

No constitution violations anticipated. Optional read-proxy in backend is a trade-off (cache, consistent envelope) vs direct Strapi reads from frontend.

## Phase 0: Outline & Research (Output in research.md)

Unknowns and integrations researched:
- Scully with Angular 8 compatibility and dynamic route discovery from Strapi
- Redis cache key strategy for hybrid dynamic-then-static approach
- SSE scalability and reconnection behavior; heartbeat/timeout
- Strapi image optimization plugin choice and configuration
- GitHub Actions pipeline for nightly pre-render and webhook-triggered light tasks

## Phase 1: Design & Contracts

Data model and validations defined for:
- BlogPost (Strapi content type) with markdown content, SEO fields, tags
- LiveEvent (Spring JPA) with fields: id, matchId, message, eventType, over, innings, createdAt

Contracts:
- GET /api/v1/live/matches/{matchId}/stream (text/event-stream)
- POST /api/v1/live/matches/{matchId}/events
- (Optional) GET /api/v1/blog/posts (proxy for caching) and GET /api/v1/blog/posts/{slug}

Agent Context Update:
- Add 004-live-cricket-blog stack: Angular 8 + Scully, Strapi CMS, Spring SSE, Redis

## Phase 2: High-Level Tasks (to be expanded in tasks.md by /speckit.tasks)

- Frontend: Blog list/detail components, SEO meta, markdown rendering, scully config
- Backend: LiveEvent entity/repo/service, SSE controller, POST events, Flyway migration
- CMS: Strapi content type, responsive image plugin, webhook for cache + sitemap updates
- CI/CD: Nightly cron job build + scully; webhook job for cache+sitemap
- SEO: sitemap generator, JSON-LD NewsArticle, OG/Twitter meta
- QA: Lighthouse CI, axe-core, contract tests
