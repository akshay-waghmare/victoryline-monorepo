# Crickzen Development Guidelines

Auto-generated from feature plans. Last updated: 2025-11-12

## Active Technologies
- Frontend: Angular (CLI ~6.x/7.x), TypeScript ~3.2; Backend: Spring Boot (2.x, Java 8/11) [NEEDS CLARIFICATION]; Scraper: Python 3.x (Flask) + Angular, RxJS; Backend REST API (Spring); Scraper Flask API; axe-core (CI audit) [NEEDS CLARIFICATION on tooling integration] (002-match-details-ux)
- Backend MySQL (per Constitution), Redis (optional cache) [NEEDS CLARIFICATION for usage in this feature] (002-match-details-ux)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (003-seo-optimization)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (003-seo-optimization)
- Angular Universal (SSR), Express server adapter, Helmet (security headers), Sharp (OG image resizing), Spring Boot Web + Jackson, MySQL JDBC, Redis client, Flask + requests, Lighthouse CI, axe-core (accessibility audit), sitemap + robots generator utility (custom or library), json-schema / OpenAPI tooling. (003-seo-optimization)
- MySQL (authoritative match / team / player data); Redis (caching rendered SEO metadata & sitemap snapshot); File store or object storage (future) for generated OG/social images (initially build-time static assets). (003-seo-optimization)
- TypeScript 4.9+ (Angular 7 currently, upgrade path TBD), HTML5, CSS3 + Angular (CLI ~6.x/7.x), RxJS, Bootstrap (TBD - to be confirmed during audit), CSS Grid, Flexbox, CSS Custom Properties (004-mobile-ui-redesign)
- Backend MySQL + Redis cache (no frontend changes), WebSocket connection state in memory (004-mobile-ui-redesign)

- TypeScript 4.9+ (Angular 15+), HTML5, CSS3 (CSS Grid, Flexbox, Custom Properties)  <!-- + ACTION REQUIRED: Replace the content in this section with the technical details (001-modern-ui-redesign)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 4.9+ (Angular 15+), HTML5, CSS3 (CSS Grid, Flexbox, Custom Properties)  <!--: Follow standard conventions

## Recent Changes
- 004-mobile-ui-redesign: Added TypeScript 4.9+ (Angular 7 currently, upgrade path TBD), HTML5, CSS3 + Angular (CLI ~6.x/7.x), RxJS, Bootstrap (TBD - to be confirmed during audit), CSS Grid, Flexbox, CSS Custom Properties
- 003-seo-optimization: Added Angular Universal (SSR), Express server adapter, Helmet (security headers), Sharp (OG image resizing), Spring Boot Web + Jackson, MySQL JDBC, Redis client, Flask + requests, Lighthouse CI, axe-core (accessibility audit), sitemap + robots generator utility (custom or library), json-schema / OpenAPI tooling.
- 003-seo-optimization: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
