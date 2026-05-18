# Implementation Plan: Full Angular SSR Migration

**Branch**: `012-full-angular-ssr` | **Date**: 2026-05-18 | **Spec**: `specs/012-full-angular-ssr/spec.md`  
**Input**: Feature specification from `/specs/012-full-angular-ssr/spec.md`

**Note**: This plan follows the `/speckit.plan` workflow and is paired with `/speckit.tasks` output in `tasks.md`.

## Summary

Replace the existing bot-detection/prerender-sidecar SEO architecture with a single Angular Universal SSR frontend. Add Angular server entrypoints, configure Angular CLI server builds, replace the placeholder Express server with a real Universal renderer, harden browser-only code paths for server execution, rewrite server-side `/api/*` HTTP calls to backend service URLs, and update Docker/compose/Caddy wiring to run the Node SSR server directly.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, Node 14/16 compatible runtime  
**Primary Dependencies**: `@angular/platform-server@7.2.x`, `@nguniversal/express-engine@7.1.1`, `@nguniversal/module-map-ngfactory-loader@7.1.1`, `@angular/cli@7.3.x`, `@angular-devkit/build-angular@0.13.x`, Express, Helmet, HTTP proxy middleware, Domino  
**Storage**: N/A for SSR itself; backend remains authoritative for match data  
**Testing**: Existing Angular build/lint where feasible; SSR build and curl smoke tests for rendered routes  
**Target Platform**: Linux container running Node SSR behind Caddy  
**Project Type**: Web application in monorepo (`apps\frontend`, with deployment manifests at repository root)  
**Performance Goals**: Keep public route SSR responsive; live match cache headers preserve short freshness windows; static assets use long-lived caching  
**Constraints**: Preserve Angular 7-era tooling; do not upgrade the frontend framework as part of this migration; keep backend and scraper service boundaries unchanged; keep browser API behavior unchanged for client execution  
**Scale/Scope**: Public Angular routes, static assets, backend proxy compatibility, local/prod Docker compose, and Caddy reverse proxy wiring

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | SSR reads through backend APIs only and preserves live cache policies; no scraper/live-update cadence changes. |
| II. Monorepo Architecture Standards | PASS | Frontend remains a separate service communicating with backend over REST/proxy routes only. |
| III. REST API Design Standards | PASS | No new public API contract is introduced; existing routes are proxied compatibly. |
| IV. Testing Requirements | PASS | Build and SSR smoke validation are required; no unrelated test tooling is introduced. |
| V. Performance Standards for Live Updates | PASS | WebSocket/API paths remain routed to backend; SSR must not block live update infrastructure. |
| VI. Frontend UI/UX Standards | PASS | No UI redesign; server rendering must preserve current client behavior and accessibility. |

No constitution violations are expected.

## Project Structure

### Documentation (this feature)

```text
specs/012-full-angular-ssr/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/frontend/
├── angular.json                         # Add Angular CLI server target
├── package.json                         # Add SSR scripts/dependencies
├── server.js                            # Express + Angular Universal runtime
├── server.ts                            # Remove placeholder or keep only if no longer used
├── tsconfig.server.json                 # Server bundle TypeScript config
├── Dockerfile                           # Build browser/server bundles and run Node SSR
├── src/
│   ├── main.server.ts                   # Angular server entrypoint
│   ├── environments/
│   │   ├── environment.ts               # Browser-safe WebSocket URL helper
│   │   └── environment.prod.ts
│   └── app/
│       ├── app.module.ts                # BrowserModule.withServerTransition
│       ├── app.routing.ts               # Remove duplicate BrowserModule import
│       ├── app.server.module.ts         # ServerModule + SSR providers
│       ├── ssr/
│       │   └── server-api.interceptor.ts # Rewrite relative API URLs during SSR
│       ├── core/services/
│       │   ├── theme.service.ts         # Guard DOM/storage/matchMedia access
│       │   └── animation.service.ts     # Guard animation APIs on server
│       ├── cricket-odds/
│       │   ├── cricket-odds.component.ts # Skip WebSocket/window-only code on server
│       │   └── cricket-odds.service.ts  # Keep sessionStorage cache browser-only
│       └── token.storage.ts             # Browser-only sessionStorage access
├── nginx.conf                           # Retired from runtime SSR path
└── prerender-sidecar/                   # Retired from deployment wiring

docker-compose.yml
docker-compose.local.yml
docker-compose.prod.yml
Caddyfile
Caddyfile.local
Caddyfile.prod
```

**Structure Decision**: Keep the frontend as the only changed runtime service. The backend still owns data and SEO XML endpoints; the scraper remains unchanged. The SSR server replaces Nginx/prerender as the frontend runtime and also preserves frontend-adjacent proxy behavior where needed.

## Phase 0: Research & Decisions

| Topic | Decision | Rationale | Alternatives |
|-------|----------|-----------|--------------|
| SSR mechanism | Angular Universal for Angular 7 | Fits current framework without a major Angular upgrade | Framework upgrade first, too risky for SEO hotfix |
| Angular build tooling | Upgrade CLI/devkit to 7.x while keeping Angular framework 7.2.x | The existing CLI 6/devkit 0.8 stack does not reliably provide the server builder | Hand-build server bundle, more brittle |
| Runtime server | Express Node process | Required for dynamic SSR and static asset serving | Nginx plus prerender sidecar, current broken model |
| API handling | Express/Caddy proxy plus SSR HTTP interceptor | Preserves browser-relative `/api/*` while making server-side Angular fetches absolute | Hard-code backend URLs in environments, breaks browser portability |
| Browser-only APIs | Guard in services/components | Prevents server render crashes | Domino globals for every browser API, brittle |
| Third-party browser imports | Domino shim before loading server bundle plus targeted guards | Some packages can touch DOM globals at module load | Remove packages from server graph, larger refactor |
| Deployment | Frontend container exposes SSR port | One source of HTML for bots/users | Keep sidecar for bots, causes mismatch/staleness |

## Phase 1: Design

1. Add Angular server build target and server module entrypoint.
2. Implement Express Universal renderer with static asset serving, health endpoint, backend/scraper proxy routes, cache headers, and render error logging.
3. Make environment and client services safe for SSR by guarding browser-only APIs.
4. Add SSR-only HTTP interceptor to rewrite server-side relative API calls to backend service URLs.
5. Replace Docker/compose/Caddy frontend runtime wiring from Nginx/prerender to Node SSR.
6. Validate with build and SSR smoke requests.

## Complexity Tracking

No constitution violations.

## Definition of Done

- Spec, plan, and tasks exist for the full SSR migration.
- Angular browser and server bundles build successfully.
- The SSR server renders Angular routes instead of returning placeholder/prerender HTML.
- Frontend deployment no longer depends on the prerender sidecar.
- Browser-only API access is guarded enough that initial SSR requests do not crash.
