# Project Skills

Available local skills for this repository:

- `crickzen-prod-restart` — safely restart main-site prod services without rebuilding from the dirty server tree
- `crickzen-live-score-incident` — diagnose whether a live-score issue is scraper, schedule discovery, backend, or frontend hero/websocket related
- `crickzen-local-stack-ops` — bring up and verify the local Docker stack, including frontend image verification
- `crickzen-match-state-reconcile` — debug mismatches between cards, hero, match-info, scorecard, and live snapshot data
- `crickzen-match-seo-ops` — audit match-page SEO from SSR HTML, verify sitemap/GSC state, and prove rollout markers
- `crickzen-prematch-discovery-seo` — audit pre-match discovery timing, lifecycle SEO, hub links, sitemap freshness, and GSC evidence
- `crickzen-isolated-seo-prod-rollout` — deploy a narrow SEO slice safely from a clean snapshot with local-build plus registry-push as the default rollout path
- `crickzen-match-surface-ux-pass` — clean crowded homepage, hubs, matches, and match-page surfaces without stripping SSR SEO support, including hero-ownership, collapsed key-moments, and SSR hydration regressions
- `crickzen-seo-health-pattern-audit` — run repeated production SEO health checks and detect correlated sitemap, SSR, canonical, thin-page, and crawl-graph patterns
- `crickzen-frontend-prod-rollout` — deploy frontend-only production fixes safely by pushing a tagged frontend image to the registry, then pinning and recreating only the frontend service
- `crickzen-backend-scraper-prod-rollout` — deploy backend and scraper production changes safely with backend-first restart order, bind-mount checks, and registry-first image rollout
- `emil-design-eng` — UI polish and design-engineering guidance

Use the incident skills before rebuilding prod images or assuming the scraper is the root cause.

## Shared SEO Preflight

Before any Crickzen SEO rollout, audit, or sitemap submission, check these recurring issue families first:

- orphan-page spikes versus real internal discovery-link counts
- `noindex` pages appearing in sitemap output
- non-canonical URLs appearing in sitemap output
- indexable pages missing from sitemap
- schema validation error spikes across one template family
- widespread title or meta-description inflation caused by one shared generator
- pages with only one dofollow incoming internal link, especially match and support surfaces
- repeated SSR shell or fallback behavior that would collapse H1, links, or body text

Default routing:

- use `crickzen-seo-health-pattern-audit` first for broad issue clusters and correlated production patterns
- use `crickzen-prematch-discovery-seo` when the core problem is crawl-path timing or lifecycle discovery
- use `crickzen-match-seo-ops` when the core problem is page-level metadata, schema, canonical, or SSR proof
- deploy only after the likely shared cause is identified, not from raw issue counts alone
