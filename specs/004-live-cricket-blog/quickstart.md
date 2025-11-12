# Quickstart: Live Cricket Updates Blog (Strapi + Angular + Scully)

This guide helps you stand up the blog and live updates stack locally and in CI/CD.

## Prerequisites
- Docker & docker-compose
- Node 14+ for Strapi and Scully tooling
- Java 17+ for Spring Boot 3.x (verify your project version)
- MySQL and Redis services (docker-compose provided in repo)

## 1) Strapi CMS
- Install Strapi (self-host) and create content type `BlogPost` with fields:
  - title (string, required), slug (UID from title, unique), excerpt (text), content (markdown),
    status (enum DRAFT/PUBLISHED), publishedAt (datetime), seoTitle (string),
    seoDescription (text), ogImage (media), tags (string repeatable)
- Install/upload-time image optimization plugin (responsive image/Sharp). Configure sizes:
  - thumbnail 150w, small 500w, medium 1000w, large 1920w, and OG crop 1200x630
- Configure webhook on publish/unpublish → GitHub Actions endpoint (light job):
  - Invalidate Redis keys for affected slugs and list pages
  - Regenerate sitemap.xml and ping Google/Bing (no full rebuild here)

## 2) Angular + Scully
- Add Scully to Angular 8 (use compatible Scully version)
- Configure route discovery plugin to fetch slugs from Strapi API for `/blog/:slug`
- Blog components:
  - BlogListComponent: fetch paginated posts, SEO meta for list
  - BlogDetailComponent: fetch by slug, render markdown via marked/markdown-it, set meta + JSON-LD NewsArticle
- Pre-render flow:
  - Build SPA → Run `npx scully` → Output `dist/static` for Nginx
  - Sitemap generation script compiles all `/blog` and `/blog/:slug` routes

## 3) Spring Boot (SSE + Proxy)
- Implement LiveEvent entity/repo/service and SSE controller:
  - GET /api/v1/live/matches/{matchId}/stream → `text/event-stream`
  - POST /api/v1/live/matches/{matchId}/events → ROLE_BLOG_EDITOR
- Optional read proxy (caching):
  - GET /api/v1/blog/posts and /{slug} forwarding to Strapi, wrapped in standard envelope and cached in Redis
- Flyway migration: create `live_event` table (see data-model.md)

## 4) Nginx
- Serve `/` from Angular SPA build, and Scully pre-rendered `dist/static` for `/blog/*`
- Ensure correct caching headers for static HTML (short TTL if needed) and images (long TTL)

## 5) CI/CD (GitHub Actions)
- Nightly cron workflow:
  - ng build --prod → npx scully → generate sitemap.xml → deploy `dist/static` to Nginx → ping search engines
- Webhook-triggered lightweight workflow (on publish/unpublish):
  - Invalidate Redis → regenerate sitemap.xml → ping Google/Bing

## 6) Live Page (Frontend)
- Route `/live/:matchId` → LiveMatchComponent
- Connect `EventSource('/api/v1/live/matches/{matchId}/stream')`
- Render events in descending time; auto-scroll to latest with accessible live region announcements

## 7) Quality Gates
- Lighthouse CI ≥ 90 on mobile and desktop for `/blog` and `/blog/:slug`
- axe-core: 0 critical violations
- Contract tests: Validate OpenAPI under `specs/004-live-cricket-blog/contracts/blog-live-contracts.yaml`

## Environment Variables
- BACKEND_API_BASE
- STRAPI_API_BASE
- REDIS_URL
- NGINX_ROOT
- SITEMAP_URL

## Troubleshooting
- If Scully fails on Angular 8, pin to compatible Scully version or consider minimal Angular upgrade path
- SSE behind proxies: ensure `Connection: keep-alive` and no buffering (Nginx `X-Accel-Buffering: no`)
