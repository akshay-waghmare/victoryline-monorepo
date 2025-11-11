# Research: SEO Optimization for Crickzen

## Decisions & Rationale

| Decision | Rationale | Alternatives Considered | Outcome |
|----------|-----------|-------------------------|---------|
| Angular Universal SSR | Enables server-rendered HTML for bots & improved LCP | Pre-render only (insufficient for live updates), Client-only SPA (poor SEO) | Adopt Now |
| MetaTagsService centralization | Consistent metadata, testable, single update point | Per-component manual tags (risk of omissions) | Implement |
| JSON-LD Structured Data blocks | Flexible injection, easy snapshot test | Microdata (harder to maintain), RDFa (niche) | Implement |
| Real-time sitemap refresh (debounced 5s) | Rapid indexing of live/time-sensitive content | Hourly batch (slower), Manual rebuild (risk of forget) | Implement |
| Pagination/facet noindex + canonical base | Consolidates ranking signals, saves crawl budget | Index all (dilution), Robots block (still waste) | Implement |
| Static curated OG images (1200x630) | Reliable visuals, low latency | On-demand dynamic render (added complexity), External image service (dependency) | Phase 1 static, revisit dynamic |
| Canonical host https://www.crickzen.com | Single source of truth, prevents duplicates | Multi-host (splits authority), Non-www root (branding decision) | Adopt |
| Live → final match canonical handoff | Preserves live page links; search signals consolidate | Immediate redirect (loss of context), Keep both indexable (duplicate risk) | Implement |
| Redis caching (short TTL live) | Balances freshness & performance | No cache (higher latency), Long TTL (stale data) | Implement |
| Lighthouse CI + axe-core in pipeline | Automated regression guard | Manual periodic audits (inconsistent) | Implement |
| Snapshot tests for JSON-LD | Rapid validation of schema consistency | Manual checks (error-prone) | Implement |

## Detailed Rationale

### SSR Strategy
SSR reduces time to first meaningful HTML for crawlers and users. Angular Universal chosen due to native framework support and community tooling; pre-render only rejected for inability to handle constantly changing live match states.

### Metadata & Structured Data
Central services ensure deterministic generation of titles/descriptions and JSON-LD blocks tied to entity models (Match, Player, Team). Snapshot tests catch accidental regressions in schema shape.

### Sitemap & Indexing
Real-time (debounced) updates ensure Google picks up new matches rapidly without thrashing on high-frequency updates. Partition strategy planned after exceeding 50k URLs.

### Pagination/Facet Handling
Noindex & canonical to base preserves authority and prevents crawl waste. Robots disallow alone was rejected—it hides signal but doesn’t consolidate ranking authority.

### OG Images
Static curated assets meet social size requirements quickly; dynamic generation reserved for future phase to avoid initial complexity and performance risk.

### Canonical & URL Strategy
Including tournament + season + format prevents collisions and supports long-term historical archiving with clarity.

### Live vs Final Pages
Canonical handoff pattern retains inbound links from live sharing while pointing search engines to authoritative final statistics page.

### Performance & Caching
Short TTL (15–60s) for live match metadata ensures freshness, while long TTL (hours) for completed matches conserves resources. Redis chosen for simplicity; fallback to in-memory if unavailable.

### Testing & Quality Gates
Automated audits (Lighthouse, axe-core) enforce objective quality; contract tests validate new SEO endpoints; JSON-LD snapshots ensure schema stability.

## Open Alternative Notes
- Dynamic OG images: Evaluate after initial launch; consider Node canvas or headless browser.
- IndexNow support: Future enhancement for faster Bing indexing.
- Multi-language hreflang: Post-English expansion; structure prepared for future `lang` field.

## Next Actions
1. Implement SSR skeleton (server.ts) and MetaTagsService stub.
2. Define JSON-LD builders per entity.
3. Build sitemap generator with debounce mechanism.
4. Add robots endpoint and canonical logic middleware.
5. Set up Redis cache wrappers.
6. Integrate Lighthouse CI job and axe-core test.
