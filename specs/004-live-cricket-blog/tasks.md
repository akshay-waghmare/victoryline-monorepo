# Tasks: Live Cricket Updates Blog (Strapi + Angular + Scully)

Branch: `004-live-cricket-blog` | Spec: `specs/004-live-cricket-blog/spec.md` | Plan: `specs/004-live-cricket-blog/plan.md`

**Status**: ✅ MVP COMPLETE (58/63 tasks - 92%)  
**Last Updated**: November 14, 2025

Notes
- Checklist format is strict: `- [ ] T### [P] [US#] Description with file path`
- [P] means task can run in parallel (different files, no hard dependency)
- User stories: US1 (Public Blog), US2 (Content Management), US3 (SEO & Discovery), US4 (Live Updates)

## Phase 1 — Setup (repo/infrastructure initialization)

- [X] T001 Update Angular deps and add Scully dev deps in apps/frontend/package.json
- [X] T002 Create Scully config in apps/frontend/scully.config.js
- [X] T003 Add markdown renderer (marked/markdown-it) and DOM sanitizer in apps/frontend/package.json
- [X] T004 Create environment config for Strapi base URL in apps/frontend/src/environments/environment.ts
- [X] T005 Configure Redis cache in Spring Boot at apps/backend/spring-security-jwt/src/main/resources/application.yml
- [X] T006 Add Flyway dependency and base config in apps/backend/spring-security-jwt/pom.xml
- [X] T007 Add Nginx rules for /blog static and SSE no-buffer in apps/frontend/nginx.conf
- [X] T008 Create GitHub Actions nightly build workflow at .github/workflows/blog-nightly.yml
- [X] T009 Create GitHub Actions webhook workflow at .github/workflows/blog-webhook.yml
- [X] T010 Document Strapi setup in specs/004-live-cricket-blog/quickstart.md (validate fields & plugins)

## Phase 2 — Foundational (blocking prerequisites)

- [X] T011 Create Flyway migration for live_event table at apps/backend/spring-security-jwt/src/main/resources/db/migration/V001__create_live_event.sql
- [X] T012 Create LiveEvent entity in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveEvent.java
- [X] T013 Create LiveEventRepository in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveEventRepository.java
- [X] T014 Create LiveEventService in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveEventService.java
- [X] T015 Implement SSE controller in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveUpdateController.java
- [X] T016 Implement POST /events endpoint with ROLE_BLOG_EDITOR in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveUpdateController.java
- [X] T017 Ensure Spring Security role config exists in apps/backend/spring-security-jwt/src/main/java/com/devglan/config/SecurityConfig.java
- [X] T018 Enable CORS for SSE endpoints in apps/backend/spring-security-jwt/src/main/java/com/devglan/config/WebConfig.java
- [X] T019 Add Redis cache config bean in apps/backend/spring-security-jwt/src/main/java/com/devglan/config/CacheConfig.java
- [X] T020 [P] (Optional) Implement Strapi proxy read endpoints in apps/backend/spring-security-jwt/src/main/java/com/devglan/blog/BlogProxyController.java

## Phase 3 — US1 (Public Blog Reading Experience — P1)

Goal: Fans can read /blog and /blog/:slug with fast SEO pages
Independent Test: Publish sample post in Strapi → verify /blog list & /blog/:slug detail render with meta/JSON-LD, Lighthouse ≥ 90 mobile

- [X] T021 [US1] Create Blog module and routing in apps/frontend/src/app/blog/blog.module.ts
- [X] T022 [US1] Add routes for /blog and /blog/:slug in apps/frontend/src/app/blog/blog-routing.module.ts
- [X] T023 [US1] Implement BlogApiService (Strapi reads) in apps/frontend/src/app/blog/blog-api.service.ts
- [X] T024 [US1] Implement BlogListComponent UI in apps/frontend/src/app/blog/list/blog-list.component.ts
- [X] T025 [US1] Implement BlogList template with responsive cards in apps/frontend/src/app/blog/list/blog-list.component.html
- [X] T026 [US1] Implement BlogDetailComponent UI in apps/frontend/src/app/blog/detail/blog-detail.component.ts
- [X] T027 [US1] Render markdown content safely in apps/frontend/src/app/blog/detail/blog-detail.component.html
- [X] T028 [US1] Add MarkdownPipe wrapper for rendering in apps/frontend/src/app/shared/pipes/markdown.pipe.ts
- [X] T029 [US1] Set meta tags + JSON-LD in apps/frontend/src/app/blog/blog-seo.service.ts
- [X] T030 [US1] Add Scully route plugin for Strapi slugs in apps/frontend/scully/plugins/strapi-blog-routes.ts
- [X] T031 [US1] Configure Scully routes in apps/frontend/scully.config.js
- [X] T032 [US1] Add list pagination (default size 10) in apps/frontend/src/app/blog/list/blog-list.component.ts
- [X] T033 [US1] Add 404 handling for missing slug in apps/frontend/src/app/blog/blog-api.service.ts
- [X] T034 [US1] Add basic styles and tokens in apps/frontend/src/styles.css
- [X] T035 [P] [US1] Update package.json build and scully scripts in apps/frontend/package.json
- [X] T036 [US1] Add Lighthouse CI config in apps/frontend/lighthouserc.json

## Phase 4 — US2 (Content Management Workflow — P2)

Goal: Editors create/draft/publish via Strapi; publish shows on site via dynamic fetch in ≤2 minutes
Independent Test: Create draft in Strapi → publish → page visible in ≈2 min, sitemap updated and cache invalidated

- [X] T037 [US2] Create Strapi BlogPost content type doc in specs/004-live-cricket-blog/strapi/BlogPost.md
- [X] T038 [US2] Document markdown WYSIWYG plugin setup in specs/004-live-cricket-blog/strapi/Plugins.md
- [X] T039 [US2] Document image optimization plugin setup in specs/004-live-cricket-blog/strapi/Plugins.md
- [ ] T040 [US2] Create Spring proxy for editor ops (if needed) in apps/backend/spring-security-jwt/src/main/java/com/devglan/strapi/StrapiProxyController.java
- [ ] T041 [US2] Add ROLE_BLOG_EDITOR check in proxy controller in apps/backend/spring-security-jwt/src/main/java/com/devglan/strapi/StrapiProxyController.java
- [X] T042 [US2] Add README for editor flow in specs/004-live-cricket-blog/strapi/README.md
- [X] T043 [P] [US2] Add cache invalidation script in apps/frontend/scripts/invalidate-blog-cache.ts
- [X] T044 [US2] Wire webhook job to invalidate Redis in .github/workflows/blog-webhook.yml

## Phase 5 — US3 (Automated SEO & Discovery — P2)

Goal: Auto sitemap, meta, JSON-LD; nightly SSG build + search engine ping
Independent Test: Publish post → sitemap updated within 5 min; nightly run builds static pages and pings Google/Bing

- [X] T045 [US3] Implement sitemap generator in apps/frontend/scripts/generate-sitemap.ts
- [X] T046 [US3] Add NewsArticle JSON-LD builder in apps/frontend/src/app/blog/blog-seo.service.ts
- [X] T047 [US3] Add canonical URL tag in apps/frontend/src/app/blog/blog-seo.service.ts
- [X] T048 [P] [US3] Add robots.txt rules in apps/frontend/src/robots.txt
- [X] T049 [US3] Configure nightly CI to build + scully + sitemap + deploy in .github/workflows/blog-nightly.yml
- [X] T050 [US3] Add search engine ping step in .github/workflows/blog-nightly.yml
- [X] T051 [US3] Ensure Nginx serves sitemap.xml and robots.txt in apps/frontend/nginx.conf

## Phase 6 — US4 (Real-Time Live Match Updates — P3)

Goal: SSE live page with <2s latency end-to-end
Independent Test: Post events via POST endpoint → appear live for all clients; events persisted

- [X] T052 [US4] Create LiveMatchComponent in apps/frontend/src/app/live/live-match.component.ts
- [X] T053 [US4] Implement EventSource connection in apps/frontend/src/app/live/live-match.component.ts
- [X] T054 [US4] Add accessible live region updates in apps/frontend/src/app/live/live-match.component.html
- [X] T055 [US4] Add live route in apps/frontend/src/app/app-routing.module.ts
- [X] T056 [P] [US4] Add backend unit tests for SSE in apps/backend/spring-security-jwt/src/test/java/com/devglan/live/LiveUpdateControllerTest.java
- [X] T057 [US4] Add backend integration tests for POST events in apps/backend/spring-security-jwt/src/test/java/com/devglan/live/LiveEventIntegrationTest.java
- [X] T058 [US4] Update Nginx to disable buffering for SSE in apps/frontend/nginx.conf

## Final Phase — Polish & Cross-Cutting

- [X] T059 Add 404.html and friendly error page in apps/frontend/src/404.html
- [ ] T060 Add axe-core CI step for blog routes in .github/workflows/blog-nightly.yml
- [ ] T061 Add logging for SSE connect/disconnect in apps/backend/spring-security-jwt/src/main/java/com/devglan/live/LiveUpdateController.java
- [ ] T062 Add retry/reconnect guidance in apps/frontend/src/app/live/live-match.component.ts
- [X] T063 Update docs with MVP scope and links in specs/004-live-cricket-blog/IMPLEMENTATION_SUMMARY.md

## Dependencies (User Story order)

1) US1 (Public Blog) → foundational for content visibility
2) US2 (Content Management) → enables editors, depends on Strapi setup
3) US3 (SEO & Discovery) → complements US1 for traffic
4) US4 (Live Updates) → engagement; independent of US3 timelines

## Parallel Execution Examples

- Backend (T011–T019) can run in parallel with Frontend blog UI (T021–T036)
- CI workflows (T008–T009, T049–T050) can run in parallel with app code
- US3 tasks (T045–T051) can run parallel to late US2 tasks

## MVP Recommendation

- Deliver US1 fully (T021–T036) with essential setup (Phase 1–2 minimal: T001–T007, T011)
- Add basic sitemap (T045) and robots (T048) to satisfy minimal SEO
- Defer SSE UI and tests (US4) to post-MVP

---

## ✅ MVP COMPLETION STATUS (November 14, 2025)

### Completed Tasks: 58/63 (92%)

**Phase Completion:**
- ✅ Phase 1 (Setup): 10/10 (100%)
- ✅ Phase 2 (Foundational): 10/10 (100%)
- ✅ Phase 3 (US1 - Public Blog): 16/16 (100%)
- ✅ Phase 4 (US2 - Content Management): 6/8 (75% - T040-T041 optional)
- ✅ Phase 5 (US3 - SEO & Discovery): 7/7 (100%)
- ✅ Phase 6 (US4 - Live Updates): 7/7 (100%)
- ✅ Final Phase (Polish): 2/5 (40% - MVP essentials complete)

**Production Ready Features:**
- ✅ Blog with Strapi CMS and Scully SSR
- ✅ Real-time live match updates via SSE
- ✅ SEO optimization with sitemap and JSON-LD
- ✅ Responsive UI with accessibility (ARIA live regions)
- ✅ Auto-reconnection with exponential backoff
- ✅ CI/CD pipeline with nightly builds
- ✅ Comprehensive backend tests

**Remaining Tasks (Post-MVP):**
- T040-T041: Optional Spring proxy for editor ops
- T060: Axe-core CI step (nice-to-have)
- T061-T062: Enhanced logging and documentation (non-blocking)

**Next Steps:**
1. Deploy to production environment
2. Configure Strapi CMS instance
3. Add blog content
4. Monitor SSE performance
5. Consider adding remaining polish tasks

