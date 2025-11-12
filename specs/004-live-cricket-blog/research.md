# Research: Live Cricket Updates Blog

Date: 2025-11-12 | Branch: 004-live-cricket-blog

## Decisions & Rationale

1) Hybrid Delivery (Dynamic then Nightly Static)
- Decision: Serve new posts dynamically from Strapi (cached), then nightly Scully pre-render
- Rationale: Fast publish (≤2 min), good SEO next day, avoids long builds on each publish
- Alternatives: Full rebuild on publish (slow), incremental-only Scully (tooling risk), pure dynamic (SEO tradeoffs)

2) Auth Integration (Public Strapi + Spring Proxy)
- Decision: Keep Strapi public for reads; use Spring Boot proxy middleware for editor operations
- Rationale: Simplifies initial integration without writing custom Strapi auth provider; centralizes RBAC in Spring
- Alternatives: Spring as auth provider (complex), Strapi as primary auth (coupling), CDN auth edge (overkill)

3) Live Updates (SSE Backend)
- Decision: Implement internal SSE endpoints in Spring Boot; EventSource client in Angular
- Rationale: Full control, predictable cost, aligns with real-time performance standards
- Alternatives: Arena embed (faster but vendor lock-in), WebSocket (more overhead; SSE adequate for broadcast)

4) Content Format (Markdown + WYSIWYG)
- Decision: Store markdown in Strapi with WYSIWYG editor
- Rationale: Portable, diffable, easy to render safely; editors get friendly UI
- Alternatives: Raw HTML (XSS/prone), proprietary rich text models

5) Image Optimization (Upload-time)
- Decision: Strapi plugin generates WebP + responsive sizes and OG crop 1200x630
- Rationale: Best performance/complexity balance; works for both dynamic and static
- Alternatives: CDN transformations (adds dependency), build-time only (misses dynamic)

## Integrations & Patterns

- Scully Route Discovery: Fetch slugs list from Strapi during Scully route plugin phase
- Redis Caching: Key pattern blog:list:{page}:{size} and blog:slug:{slug}; TTL 5-10 min
- SSE Scale: Use SseEmitter with 0L timeout; heartbeat event every 20s; client auto-reconnect
- Sitemap Generation: Use a small Node script post-Scully to collect routes and write sitemap.xml
- Webhook Flow: Strapi → GitHub Actions (cache invalidation + sitemap ping) without full rebuild

## Risks & Mitigations

- Angular 8 + Scully compatibility: Verify plugin version that supports Angular 8; upgrade if minimal
- SSE connection load: For high concurrency, consider Spring WebFlux or simple load balancer sticky sessions
- Strapi exposure: Restrict admin panel by IP; ensure CORS and rate limiting; publish-only webhooks signed
- Image CPU: Offload to worker or configure concurrency limits in Strapi Sharp plugin

