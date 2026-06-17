---
name: crickzen-seo-baseline-monitor
description: Monitor the Crickzen Phase 2 SEO baseline after hub/canonical work, especially when asked to check GSC, SerpBear, raw production HTML, indexing movement, or whether Spec 023 canonical migration can start. Use to prevent premature /live-cricket-score/{slug} aliases, canonical migration, 301 redirect migration, duplicate match URLs, or new SEO route experiments during the 7-14 day observation window.
---

# Crickzen SEO Baseline Monitor

Use this skill when Crickzen SEO is in observation mode after Phase 1/2 hub work. The default posture is monitoring and proof, not new SEO implementation.

## Baseline Policy

Treat the current URL strategy as approved unless the user explicitly overrides it:

- `/live-cricket-score` is a real self-canonical keyword hub.
- `/cric-live/{slug}` remains the canonical match page URL.
- Do not expose `/live-cricket-score/{slug}` match aliases.
- Do not migrate match canonicals.
- Do not add duplicate match URLs to sitemap.
- Do not start Spec 023 until the baseline decision rule passes.

Allowed work during the baseline window:

- Fix bugs that break the approved Phase 1/2 behavior.
- Run raw production HTML audits after deploys.
- Collect GSC indexing, impressions, query, CTR, and canonical-selection signals.
- Collect SerpBear keyword movement.
- Update monitoring docs with observed evidence.

## Monitoring Cadence

Every `2-3` days during the `7-14` day baseline, check:

- `/live-cricket-score` indexed status.
- `/live-score/today` indexed status.
- `/live-score/ipl` indexed status.
- Whether hub impressions have started.
- Whether queries are showing.
- Whether Google reports canonical confusion.
- Whether `/cric-live/{slug}` pages are losing visibility.

Weekly, record for each monitored URL:

- Indexed status.
- Impressions.
- Clicks.
- Average position.
- Top queries.
- CTR.
- Crawl or indexing issues.
- Google-selected canonical, if visible.

## Production HTML Proof

After every deploy that could affect SEO, run the production raw HTML audit before declaring success:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Audit-ProdSeoRawHtml.ps1 -BaseUrl https://www.crickzen.com
```

For a match-page check, include a current or known match slug:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Audit-ProdSeoRawHtml.ps1 -BaseUrl https://www.crickzen.com -MatchSlug <slug>
```

Minimum proof for `/live-cricket-score`:

- `200` status.
- Exactly one H1.
- Title present.
- Meta description present.
- Canonical is `https://www.crickzen.com/live-cricket-score`.
- Robots is `index,follow`.
- FAQ content present.
- Raw SSR HTML includes many `/cric-live/` links.
- The page is not redirected to `/`.

Also verify sitemap and robots:

```powershell
$sitemap = Invoke-WebRequest -Uri https://www.crickzen.com/sitemaps/sitemap-matches-0001.xml -UseBasicParsing -TimeoutSec 30
$robots = Invoke-WebRequest -Uri https://www.crickzen.com/robots.txt -UseBasicParsing -TimeoutSec 20
```

Expected sitemap posture:

- `/live-cricket-score` is present.
- Hub URLs are present.
- `/cric-live/` match URLs remain present.
- `/live-cricket-score/{slug}` alias URLs are absent.

## Known Production Pitfall

If `/live-cricket-score` appears to render homepage HTML, check redirects before changing Angular routing.

The Phase 2 production issue was caused by a legacy Caddy rule:

```caddyfile
redir /live-cricket-score / permanent
```

That rule must remain removed. Check both direct headers and raw HTML:

```powershell
curl.exe -I --max-redirs 0 https://www.crickzen.com/live-cricket-score
```

Expected result: `200 OK`, not `301`.

## Spec 023 Gate

Only recommend planning Spec 023 if all are true after the baseline period:

- `/live-cricket-score` gets indexed.
- `/live-cricket-score` starts receiving impressions.
- `/cric-live/{slug}` pages remain stable.
- No canonical confusion appears in GSC.
- SerpBear or GSC show at least some keyword movement.

When Spec 023 is eventually allowed, compare these options without implementing immediately:

- Option A: Keep `/cric-live/{slug}` forever as canonical.
- Option B: Add `/live-cricket-score/{slug}` as alias but canonical remains `/cric-live/{slug}`.
- Option C: Use `/live-cricket-score/{slug}` canonical only for new future matches.
- Option D: Full migration from `/cric-live/{slug}` to `/live-cricket-score/{slug}` with `301` redirects.

## Response Shape

When reporting, keep the answer focused:

- Current baseline status.
- GSC/SerpBear movement, if available.
- Raw HTML proof after deploys.
- Any bug fixes needed to preserve approved behavior.
- Explicitly state whether Spec 023 is still blocked or ready to plan.
