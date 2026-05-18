---
description: "Task list for migrating the frontend from prerender sidecar SEO to full Angular SSR"
---

# Tasks: Full Angular SSR Migration

**Input**: Design documents from `/specs/012-full-angular-ssr/`  
**Generated**: 2026-05-18  
**Branch**: `012-full-angular-ssr`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Run the existing frontend build path plus SSR build/start smoke checks. Do not add new test tooling for this migration.

**Organization**: Tasks are grouped by user story so SSR can be delivered incrementally while keeping backend/scraper boundaries intact.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Which user story this task belongs to (`US1`..`US3`)
- Include exact file paths so implementation stays anchored to the current repo structure

---

## Phase 1: Setup (Angular Universal Build Foundation)

**Purpose**: Add the Angular Universal build surface and runtime dependencies.

- [ ] T001 Add pinned Angular 7-compatible SSR dependencies, CLI/devkit 7.x server-builder tooling, and SSR scripts to `apps\frontend\package.json`
- [ ] T002 Add the Angular CLI server target to `apps\frontend\angular.json`
- [ ] T003 [P] Create `apps\frontend\tsconfig.server.json` for the server bundle
- [ ] T004 [P] Create `apps\frontend\src\main.server.ts`
- [ ] T005 [P] Create `apps\frontend\src\app\app.server.module.ts`
- [ ] T006 Update `apps\frontend\src\app\app.module.ts` to use `BrowserModule.withServerTransition`
- [ ] T007 Remove duplicate `BrowserModule` import from `apps\frontend\src\app\app.routing.ts`

---

## Phase 2: Foundational (SSR Runtime and Server-Safe App Code)

**Purpose**: Replace the placeholder server with a real SSR renderer and prevent server crashes from browser-only APIs.

**CRITICAL**: No user story is complete until public routes are rendered by Angular Universal, not by the prerender sidecar.

- [ ] T008 Replace `apps\frontend\server.ts` placeholder usage with a production `apps\frontend\server.js` Express Angular Universal runtime, including Domino globals before loading the server bundle
- [ ] T009 Add static asset serving, `/health`, render error logging, and cache headers in `apps\frontend\server.js`
- [ ] T010 Add backend/scraper proxy compatibility for `/api/*`, `/api/v1/*`, `/token/*`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/*`, `/scraper/*`, and WebSocket upgrade traffic in `apps\frontend\server.js`
- [ ] T011 [P] Add `apps\frontend\src\app\ssr\server-api.interceptor.ts` to rewrite server-side relative API calls to `BACKEND_URL`
- [ ] T012 [P] Make `apps\frontend\src\environments\environment.ts` browser-safe when `window` is unavailable
- [ ] T013 [P] Make `apps\frontend\src\environments\environment.prod.ts` browser-safe when `window` is unavailable
- [ ] T014 Make `apps\frontend\src\app\token.storage.ts` return safe values when `sessionStorage` is unavailable
- [ ] T015 Make `apps\frontend\src\app\core\services\theme.service.ts` skip DOM/storage/matchMedia/BroadcastChannel work on the server
- [ ] T016 Make `apps\frontend\src\app\core\services\animation.service.ts` skip performance/requestAnimationFrame/document work on the server
- [ ] T017 Make `apps\frontend\src\app\cricket-odds\cricket-odds.component.ts` skip `window` and WebSocket-only work on the server while preserving HTTP data fetches
- [ ] T018 Make `apps\frontend\src\app\cricket-odds\cricket-odds.service.ts` keep `sessionStorage` caching browser-only

**Checkpoint**: `npm run build:ssr` can compile the Angular browser and server bundles.

---

## Phase 3: User Story 1 - Search Crawlers Receive Rendered Angular Pages (Priority: P1) MVP

**Goal**: Serve all public Angular routes from the same SSR renderer for bots and users.

**Independent Test**: Start the SSR server and request `/`, `/matches`, and `/cric-live/{slug}` with normal and bot user agents; both paths return SSR HTML from Angular Universal.

### Implementation for User Story 1

- [ ] T019 [US1] Configure `apps\frontend\server.js` catch-all route to render Angular for non-asset, non-proxy requests
- [ ] T020 [US1] Ensure `apps\frontend\server.js` serves `dist\id-card-app` static assets before Angular catch-all rendering
- [ ] T021 [US1] Validate `/`, `/matches`, and `/cric-live/{slug}` return HTTP 200 from SSR runtime

**Checkpoint**: Public routes no longer require `/prerender/*` files for initial HTML.

---

## Phase 4: User Story 2 - Live Match SEO Uses Fresh Backend Data During SSR (Priority: P1)

**Goal**: Ensure match routes can fetch backend data during server rendering and generate current initial HTML.

**Independent Test**: With backend reachable, request `/cric-live/{slug}` from the SSR server and verify server-side HTTP does not fail due to relative `/api/*` URLs.

### Implementation for User Story 2

- [ ] T022 [US2] Register the SSR API interceptor in `apps\frontend\src\app\app.server.module.ts`
- [ ] T023 [US2] Preserve existing Angular Title updates during SSR for match routes in `apps\frontend\src\app\cricket-odds\cricket-odds.component.ts`
- [ ] T024 [US2] Confirm live, scheduled, and completed match cache headers are emitted from the SSR server or preserved through route responses

**Checkpoint**: Match pages render through Angular SSR using backend data instead of stale generated HTML.

---

## Phase 5: User Story 3 - Deployment Runs One SSR Frontend Service (Priority: P2)

**Goal**: Remove runtime dependency on the prerender sidecar and route frontend traffic to Node SSR.

**Independent Test**: Inspect and run the frontend container locally; `/health` reports SSR and Caddy/compose target the SSR port.

### Implementation for User Story 3

- [ ] T025 [US3] Update `apps\frontend\Dockerfile` to build browser/server bundles and run `node server.js`
- [ ] T026 [US3] Update `docker-compose.yml` frontend service to target SSR port and remove prerender service dependency/volume use
- [ ] T027 [US3] Update `docker-compose.local.yml` frontend service to target SSR port and remove prerender service dependency/volume use
- [ ] T028 [US3] Update `docker-compose.prod.yml` frontend service to target SSR port and remove prerender service dependency/volume use
- [ ] T029 [US3] Update `Caddyfile`, `Caddyfile.local`, and `Caddyfile.prod` frontend reverse proxy targets from `frontend:80` to the SSR port
- [ ] T030 [US3] Leave `apps\frontend\prerender-sidecar\` source in place but remove it from active runtime wiring

**Checkpoint**: Deployment uses one SSR frontend service for user and crawler HTML.

---

## Phase 6: Validation & Cleanup

**Purpose**: Prove the migration builds and the sidecar architecture is no longer active.

- [ ] T031 Run `npm install --legacy-peer-deps` in `apps\frontend` to update lockfile after dependency changes
- [ ] T032 Run `npm run build:ssr` in `apps\frontend`
- [ ] T033 Verify the server bundle can be loaded by `node server.js` without browser-global import crashes
- [ ] T034 Start `npm run ssr:start` and smoke test `/health`, `/`, `/matches`, and one `/cric-live/{slug}` route
- [ ] T035 Smoke test one route with `User-Agent: Googlebot` and confirm it uses the same SSR path
- [ ] T036 Search deployment config for active `prerender` dependencies and confirm none remain in frontend runtime wiring
- [ ] T037 Review changed files to ensure no unrelated code was modified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 and US2**: Depend on Foundational and should be validated together for SEO.
- **US3**: Depends on a working SSR runtime from US1/US2.
- **Validation & Cleanup**: Depends on all targeted implementation tasks.

### Parallel Opportunities

- T003-T005 can run in parallel after package/angular config decisions.
- T011-T013 can run in parallel with T014-T018 because they touch separate files.
- T026-T029 can run in parallel after the runtime port is finalized.

## Implementation Strategy

1. Complete Angular Universal setup and server-safe guards.
2. Replace the placeholder server with a real SSR runtime.
3. Validate SSR locally before changing deployment wiring.
4. Remove active sidecar wiring from compose/Caddy only after SSR works.
