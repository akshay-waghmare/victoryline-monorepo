---
name: crickzen-prematch-discovery-seo
description: Audit and improve Crickzen match discovery across the upcoming, live, and completed lifecycle. Use when `/cric-live/{slug}` pages are not showing early enough in Google, impressions drop after sitemap or hub changes, Search Console evidence must be tied to sitemap freshness and internal links, or Codex needs a sports-specific SEO workflow beyond generic canonical and metadata checks.
---

# Crickzen Prematch Discovery SEO

Use this skill when the problem is discovery timing and lifecycle SEO, not just whether one match page has valid tags.

## Default posture

- Keep `/cric-live/{slug}` canonical stable unless the user explicitly changes strategy.
- Do not start `/live-cricket-score/{slug}` alias or migration work from this skill.
- Treat sitemap freshness, hub links, and GSC timing as the first suspects before proposing route churn.
- Treat search intent and traffic potential as part of discovery quality, not just metadata quality.
- Use `crickzen-match-seo-ops` for page-level rollout proof, `crickzen-seo-health-pattern-audit` for broad production failure clusters, and `crickzen-frontend-prod-rollout` or backend rollout skills only after the root cause is clear.

## Issue-pattern guardrail

When Ahrefs or GSC reports discovery problems, classify them before editing:

- very large orphan counts relative to sitemap match counts usually mean crawl-graph weakness, not that canonical match pages are broken
- `indexable page not in sitemap` can be a lifecycle-coverage gap, but first confirm the page family is intended for indexing
- `noindex page in sitemap` is a real hygiene issue and should be sampled quickly on live URLs
- pages with only one dofollow incoming internal link usually need better hub or series-link exposure before any metadata rewrite

Do not jump from "not indexed early enough" to route churn unless crawl-path, sitemap timing, and page intent have already been disproved.

## Query-fit lens

When reviewing a discovery opportunity, classify the query by:

- `content type`: match page, hub/listing page, schedule page, series page, result/archive page
- `content format`: live score utility, scorecard, lineup view, commentary, fixture list, points table
- `content angle`: live now, today, upcoming, result, venue, toss, playing xi

Prefer long-tail and league-specific opportunities where Crickzen can realistically satisfy the query better than broad head terms.

## Workflow

1. Pick one real fixture in the discovery window.
   Prefer a match `12-48` hours before start from `/api/cricket-data/upcoming-matches?_ts=spec025-window`. If the user says "today" or "tomorrow", include the exact date in the analysis.

2. Prove the URL exists on the public crawl path.
   Verify the exact `/cric-live/{slug}` page, then verify raw SSR HTML on the relevant hubs:
   - `/cricket-schedule/today`
   - `/live-score/today`
   - league or series hub when relevant
   - homepage only if it is expected to surface the match

3. Run the lifecycle checklist.
   Read [references/lifecycle-checklist.md](references/lifecycle-checklist.md) and verify the sample URL against the `upcoming`, `live`, or `completed` contract before concluding anything from GSC.

4. Collect discovery evidence.
   Read [references/discovery-evidence.md](references/discovery-evidence.md).
   - If a Search Console MCP tool is available in the current host, prefer it for URL inspection, sitemap status, and query/impression evidence.
   - If no GSC MCP is installed, use `scripts/query_gsc_search_analytics.py`, `tools/seo-dashboard`, and raw production HTML checks.
   - Confirm whether the page was first seen in sitemap, first seen in a crawlable hub, and whether Google discovered it before match start.
   - Distinguish `search volume` from `traffic potential`: if one page can rank for score, scorecard, lineup, toss, and result variants, treat it as one multi-query asset.

5. Map the symptom to one likely shared cause.
   Read [references/root-cause-map.md](references/root-cause-map.md) when multiple failures appear at once.
   Favor one root cause that explains the timing gap, such as:
   - upcoming matches not being pushed early enough
   - sitemap pings too infrequent
   - future-dated or stale `lastmod`
   - missing `SportsEvent` on pre-match pages
   - hub pages not exposing real SSR anchors
   - completed pages degrading into weak archive pages
   - page intent mismatch where the ranking surface should be a hub, schedule, or result page instead of the match page itself

6. Check internal-link completeness.
   For the sampled query family, verify that users and crawlers can move through:
   - homepage or league surface
   - live or schedule hub
   - `/cric-live/{slug}`
   - scorecard, lineup, commentary, or result-supporting sections on that canonical page

   If the page exists but the crawl path is weak, treat internal linking as the primary fix before escalating to manual submission.

7. Sample hygiene on the same route family.
   For the same lifecycle slice, spot-check whether:
   - sitemap URLs are indexable
   - sampled pages are self-canonical
   - pages avoid `noindex`
   - titles and descriptions are not bloated by lifecycle-state noise

   If those fail, fix hygiene first and only then return to discovery timing.

8. Route the implementation safely.
   - Use `crickzen-match-seo-ops` for raw HTML proof, schema verification, and sitemap submission after a fix.
   - Use `crickzen-seo-health-pattern-audit` after deployment to confirm the problem is isolated and resolved.
   - Use repo specs such as `specs/025-prematch-discovery-monitoring/` and `specs/030-prematch-seo-discovery-fixes/` when the work needs a durable roadmap or implementation plan.

## Useful commands

Current production HTML proof:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Audit-ProdSeoRawHtml.ps1 -BaseUrl https://www.crickzen.com -MatchSlug <slug>
```

Broad production SEO pattern audit:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\crickzen-seo-health-pattern-audit\scripts\Audit-CrickzenSeoHealth.ps1
```

Sanitized GSC export without MCP:

```powershell
python .\scripts\query_gsc_search_analytics.py --credentials <service-account-json> --start-date YYYY-MM-DD --end-date YYYY-MM-DD --inspect-url-file <urls.txt>
```

Local monitoring dashboard:

```powershell
.\scripts\Start-SeoDashboard.ps1
```

## Response shape

Return a compact diagnosis with:

- the exact URL and match date checked
- lifecycle state and whether the page was early enough
- likely query family and whether the page matches its intent
- raw HTML proof from the page and discovery hubs
- whether the issue looked like crawl-graph weakness, sitemap hygiene, or true page-template mismatch
- sitemap and GSC or MCP evidence
- the most likely root cause
- the safest next implementation slice
