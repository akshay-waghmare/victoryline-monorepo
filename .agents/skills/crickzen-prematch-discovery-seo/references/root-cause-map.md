# Root Cause Map

Use this map when the audit turns up multiple symptoms and you need the smallest likely fix.

## Symptom clusters

### Upcoming pages look technically fine but are discovered too late

Check:

- `apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/LiveMatchIndexingScheduler.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/SitemapScheduler.java`
- `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/SitemapService.java`
- `specs/030-prematch-seo-discovery-fixes/`

Likely causes:

- upcoming matches excluded from early indexing push
- sitemap resubmission cadence too slow
- future or stale `lastmod`

### Pre-match pages miss SportsEvent while live and result pages are stronger

Check:

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/seo/structured-data.service.ts`
- `tests/frontend/seo/jsonld-match.spec.ts`

Likely causes:

- `SportsEvent` gated on venue instead of `startDate`
- weak location handling for TBD venues

### Completed pages lose quality at scale

Check:

- `apps/frontend/src/app/scorecard/scorecard.component.html`
- raw HTML for duplicate headings
- archive and result hubs for orphaning

Likely causes:

- duplicate `h1`
- generic scorecard-only heading
- archive pages no longer linked after the match ends

### GSC reports poor discovery while sitemap looks healthy

Check:

- raw hub HTML for real `/cric-live/` anchors
- `tools/seo-dashboard/collector.py`
- `scripts/Audit-ProdSeoRawHtml.ps1`
- `docs/seo-baseline-monitoring.md`

Likely causes:

- hub markup no longer exposes crawlable anchors
- the collector is stale and the product is actually fine
- sitemap presence exists without enough internal-link support

## Guardrails

- Do not respond to late discovery by changing canonicals first.
- Do not treat alternative-canonical classifications as the main issue when the intended base route is stable.
- Do not rely on manual per-URL indexing as the permanent solution when the crawl path is weak.
