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
4. Map correlated failures to one likely shared cause before editing:
   - repeated `7,974`-byte or missing-H1 listing responses -> SSR timeout/fallback shell;
   - sitemap duplicates plus canonical-without-links -> duplicate source records or missing sitemap deduplication;
   - one sitemap 4XX -> unrouted or deleted URL still emitted;
   - many pages sharing missing H1, no links, low word count, and missing canonical -> one broken/thin template family;
   - alternative page with proper canonical -> usually expected alias behavior unless aliases are internally linked or sitemap-listed;
   - high sitemap match count with few discovery links -> orphan/crawl-graph weakness.
5. Inspect relevant production logs and source only after the pattern is identified.
6. Make the smallest fix, test locally, deploy only affected services, then rerun this audit.
7. Submit the sitemap only after the post-deploy audit is clean.

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
- `robots.txt`, sitemap, indexing status, and websocket info return `200`;
- an unknown route returns `404`;
- no new `[SSR] Render timed out` or `[SSR] Render failed` production logs appear during verification.
