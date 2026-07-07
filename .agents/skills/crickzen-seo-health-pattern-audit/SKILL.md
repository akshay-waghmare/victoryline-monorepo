---
name: crickzen-seo-health-pattern-audit
description: Audit Crickzen production SEO health and detect recurring failure patterns across sitemap hygiene, repeated SSR reliability, canonical/indexability, internal discovery links, match-page metadata, and indexing services. Use when SEO traffic drops, Ahrefs or GSC reports new issue clusters, after SEO deployments, or when Codex needs to distinguish expected canonical exclusions from real crawl/indexing regressions.
---

# Crickzen SEO Health Pattern Audit

Run a read-only production audit before changing code or submitting the sitemap:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\crickzen-seo-health-pattern-audit\scripts\Audit-CrickzenSeoHealth.ps1
```

The script writes a timestamped JSON report under `artifacts/seo-health/` and exits `2` when it detects actionable failures.

## Workflow

1. Run the bundled audit with default repeated-route and match samples.
2. For impression drops, query Search Console performance and URL inspection before assigning causality:

```powershell
python .\scripts\query_gsc_search_analytics.py --credentials <service-account-path> --start-date YYYY-MM-DD --end-date YYYY-MM-DD
```

Keep credentials outside the repo and save only the sanitized JSON output.
3. Read the JSON `patterns` and `failures` sections first.
4. Add a search-intent and page-type check before editing:
   - is the affected query family better served by a match page, hub page, schedule page, series page, or result page?
   - does the current winner type in Google imply a mismatch in content type, format, or angle?
   - are we chasing a head term where long-tail traffic potential is the more realistic opportunity?
5. Map correlated failures to one likely shared cause before editing:
   - repeated `7,974`-byte or missing-H1 listing responses -> SSR timeout/fallback shell;
   - sitemap duplicates plus canonical-without-links -> duplicate source records or missing sitemap deduplication;
   - one sitemap 4XX -> unrouted or deleted URL still emitted;
   - many pages sharing missing H1, no links, low word count, and missing canonical -> one broken/thin template family;
   - alternative page with proper canonical -> usually expected alias behavior unless aliases are internally linked or sitemap-listed;
   - high sitemap match count with few discovery links -> orphan/crawl-graph weakness.
6. Inspect relevant production logs and source only after the pattern is identified.
7. Make the smallest fix, test locally, deploy only affected services, then rerun this audit.
8. Submit the sitemap only after the post-deploy audit is clean.

## Ahrefs and crawler issue triage lens

When a tool reports large raw counts, classify them into these buckets before changing code:

- `orphan page (indexable)`: compare sitemap match volume to direct SSR discovery-link volume first; for Crickzen this is often a crawl-graph gap, not a broken canonical or broken sitemap
- `noindex page in sitemap`: treat as a real hygiene failure until sampled URLs prove the crawler is reading stale aliases or old support routes
- `non-canonical page in sitemap`: check sitemap sources and canonical route families together; do not assume the page template is wrong
- `indexable page not in sitemap`: confirm whether the URLs are intended support pages, recent lifecycle pages, or thin aliases before adding them blindly
- `schema validation error spike`: look for one shared JSON-LD generator or one route family before editing many pages individually
- `title/meta too long` spikes: look for one generator or one state-string concatenation bug, especially toss-delay and result-copy paths
- `one dofollow incoming internal link`: treat as an internal-link distribution problem unless the route family itself is intentionally isolated

If the tool surfaces only counts but not representative URLs, sample real URLs before editing.

## Guardrails

- Treat the script as read-only. Do not deploy, restart, or submit the sitemap from it.
- Never conclude SSR health from one request. Use repeated renders of `/`, `/matches`, and `/live-cricket-score`.
- Do not self-canonicalize child aliases merely to remove GSC's expected alternative-canonical classification.
- Do not force-index thin, unresolved, duplicate, or noindex pages.
- Preserve rollbackable image pins and verify raw SSR HTML after deployments.
- Use `crickzen-match-seo-ops` for match-page rollout verification and sitemap submission.
- Use `crickzen-frontend-prod-rollout` for frontend-only production fixes.

## Interpretation

Read [references/patterns.md](references/patterns.md) when the report contains multiple issue groups or when Ahrefs/GSC counts need diagnosis.

Acceptance after a fix:

- sitemap URLs are unique and contain no known invalid static routes;
- sampled sitemap match pages return `200`, one canonical, one H1, JSON-LD, and no `noindex`;
- every repeated discovery-page render returns one H1 and crawlable `/cric-live/` links;
- the affected surface matches the likely query intent instead of forcing every keyword onto one page type;
- `robots.txt`, sitemap, indexing status, and websocket info return `200`;
- an unknown route returns `404`;
- no new `[SSR] Render timed out` or `[SSR] Render failed` production logs appear during verification.
- sampled sitemap URLs do not expose `noindex`, wrong canonicals, or schema regressions on the live site.
