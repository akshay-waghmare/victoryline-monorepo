# CREX and CrickZen XML sitemap comparison — July 2026

## Scope and method

Read-only production audit performed on 26 July 2026 (Asia/Kolkata). No application code, production configuration, CDN state, or sitemap content was changed.

The audit fetched both sitemap indexes and every child sitemap they declared:

- [CREX index](https://crex.com/sitemap.xml): 14 children.
- [CrickZen index](https://www.crickzen.com/sitemap.xml): 6 children.

For each sitemap file, this report records status, elapsed request time, transfer size, content type, content encoding, URL count, `lastmod` presence, duplicate URLs, parameter URLs, and route composition. Page-level status, canonical, robots, redirect, and SSR-link checks are a **stratified sample**, not a 64k-page crawl. A sitemap XML file cannot itself reveal a page's canonical, `noindex`, redirect, or rendered internal-link state.

Response times are single-run observations from the audit location, not a crawler SLA or Core Web Vitals measurement.

## 1. CREX sitemap architecture

`https://crex.com/sitemap.xml` is a 200 XML sitemap index (333 ms, 2,074 B, `application/xml; charset=utf-8`, no content encoding observed on the index). It partitions 58,948 URL records into purpose-named children:

- Current and monthly editorial/news archives: 8 files.
- Entity collections: player, team, and series.
- Search/product collections: rankings and stats.
- One large canonical live-score/match collection.

The child files were all 200 in this run, delivered with Brotli (`br`) when requested, and completed in 0.60–3.12 seconds. This is a coherent **family-based architecture**, although it is not perfectly clean: the current news sitemap overlaps monthly archives, January has internal duplicates, and the stats file publishes parameter URLs.

| CREX child sitemap | Status / time | Transfer / decoded size | Encoding | URLs | `lastmod` | Duplicate records | Principal route family |
|---|---:|---:|---|---:|---|---:|---|
| `news_sitemap.xml` | 200 / 676 ms | 9,831 / 65,055 B | br | 77 | 77; 23–26 Jul | 0 | current editorial |
| `news_archive_2026_01.xml` | 200 / 1,209 ms | 32,853 / 201,967 B | br | 718 | 718; 15 Jan–22 Jul | 107 | editorial archive |
| `news_archive_2026_02.xml` | 200 / 1,627 ms | 68,975 / 397,030 B | br | 1,413 | 1,413; 2 Feb–17 Jul | 0 | editorial archive |
| `news_archive_2026_03.xml` | 200 / 1,667 ms | 70,797 / 399,645 B | br | 1,443 | 1,443; 1 Mar–24 Jul | 0 | editorial archive |
| `news_archive_2026_04.xml` | 200 / 1,680 ms | 73,709 / 429,254 B | br | 1,562 | 1,562; 1 Apr–18 Jul | 0 | editorial archive |
| `news_archive_2026_05.xml` | 200 / 884 ms | 74,812 / 457,254 B | br | 1,671 | 1,671; 1 May–26 Jun | 0 | editorial archive |
| `news_archive_2026_06.xml` | 200 / 599 ms | 53,789 / 329,225 B | br | 1,203 | 1,203; 1 Jun–24 Jul | 0 | editorial archive |
| `news_archive_2026_07.xml` | 200 / 1,368 ms | 44,428 / 244,952 B | br | 892 | 892; 1–25 Jul | 0 | editorial archive |
| `player.xml` | 200 / 3,123 ms | 278,762 / 4,209,530 B | br | 20,461 | 20,461; one generation timestamp | 0 | players |
| `rankings.xml` | 200 / 1,219 ms | 374 / 5,861 B | br | 28 | 28; one generation timestamp | 0 | rankings |
| `team.xml` | 200 / 1,536 ms | 20,290 / 359,612 B | br | 1,763 | 1,763; one generation timestamp | 0 | teams |
| `cricket-live-score.xml` | 200 / 2,821 ms | 415,100 / 6,424,276 B | br | 24,181 | 24,181; 1987–26 Jul | 0 | canonical match URLs |
| `series.xml` | 200 / 1,488 ms | 17,311 / 460,189 B | br | 2,029 | 2,029; one generation timestamp | 0 | series |
| `stats.xml` | 200 / 1,476 ms | 12,849 / 428,388 B | br | 1,507 | 1,507; one generation timestamp | 0 | stat pages with parameters |

Child-sitemap median response time was 1.48 seconds; mean was 1.53 seconds. The compressed child payload total was 1.17 MB. All child responses declared `application/xml` (some with `charset=utf-8`) and `Content-Encoding: br`.

### CREX URL distribution

The table classifies every one of the 58,948 XML records by its route pattern. Editorial includes the `cricket-news`, `cricket-analysis`, `cricket-prediction`, `cricket-records`, `cricket-reactions`, `cricket-listicles`, and `cricket-stories` families.

| Route type | URL records | Notes |
|---|---:|---|
| static hubs / rankings / stats | 1,536 | Includes 1,507 stats URLs; all 1,507 carry query parameters. |
| matches | 24,183 | `/cricket-live-score/{slug}`; the collection root is counted as a hub, not a match. |
| match child routes | 0 | No scorecard/commentary/lineups-style children found in the XML. |
| series | 2,029 | `/series…` family. |
| teams | 1,763 | `/team…` family. |
| players | 20,461 | `/player…` family. |
| schedules | 0 | — |
| archives | 0 | News archives are sitemap sharding, not archive-page URLs. |
| match reports | 0 | — |
| editorial/news | 8,976 | Current plus monthly content files. |
| unknown | 0 | Every observed pattern maps to a family above. |
| **Total** | **58,948** | **58,764 unique URLs** |

There are 184 duplicate URL occurrences overall: 107 duplicate occurrences inside `news_archive_2026_01.xml` and a further 77 duplicate occurrences across sitemap files, principally overlap between `news_sitemap.xml` and recent monthly archives. Example overlap: the same article occurs in `news_sitemap.xml` and `news_archive_2026_07.xml`.

## 2. CrickZen sitemap architecture

`https://www.crickzen.com/sitemap.xml` is a 200 XML index (999 ms, 881 B, `application/xml; charset=UTF-8`, no content encoding) with six generic children named `sitemap-matches-0001.xml` through `0006.xml`. The index exposes only these match shards: it has no separately named hub, series, team, player, schedule, or editorial sitemap.

### Critical delivery inconsistency observed during this audit

The same six sitemap URLs returned two materially different valid-XML states during the audit window:

1. **Initial populated read:** all six were 200 and contained 5,370 URLs in total. Each had 100% `lastmod` coverage, no parameter URLs, and no duplicates within the file. They mixed `/cric-live/{slug}` URLs with `/cricket-match-report/{slug}` URLs; `0001` also contained the home page.
2. **Repeated current read:** each same URL was a 200, 107-byte empty `<urlset>` with zero URLs, served with `Cache-Control: public, max-age=300, stale-while-revalidate=60`. A `Cache-Control: no-cache` revalidation of `0001` returned the same empty set. The index continued to reference all six files.

The current crawler-visible count is therefore **zero**, despite the index advertising six shards. The initial populated count is retained below as evidence of a volatile delivery/generation defect, not reported as a stable current inventory.

| CrickZen child sitemap | Initial populated read | Initial elapsed / bytes | `lastmod` in populated read | Recheck current state |
|---|---:|---:|---|---|
| `sitemap-matches-0001.xml` | 1,000 URLs | 55.4 s / 229,436 B | 1,000; 486 distinct; 12 Mar–25 Jul | 200 / 868 ms / 107 B / 0 URLs |
| `sitemap-matches-0002.xml` | 1,000 URLs | 55.7 s / 228,811 B | 1,000; 846 distinct; 10 Jun–21 Jul | 200 / 697 ms / 107 B / 0 URLs |
| `sitemap-matches-0003.xml` | 1,000 URLs | 55.9 s / 231,315 B | 1,000; 841 distinct; 8 May–10 Jun | 200 / 738 ms / 107 B / 0 URLs |
| `sitemap-matches-0004.xml` | 1,000 URLs | 59.5 s / 230,602 B | 1,000; 877 distinct; 23 Mar–11 May | 200 / 698 ms / 107 B / 0 URLs |
| `sitemap-matches-0005.xml` | 1,000 URLs | 59.8 s / 212,596 B | 1,000; 913 distinct; 15 Nov–25 Jul | 200 / 699 ms / 107 B / 0 URLs |
| `sitemap-matches-0006.xml` | 370 URLs | 60.0 s / 79,022 B | 370; all distinct; 23 Jan–25 Jul | 200 / 703 ms / 107 B / 0 URLs |

All populated reads were `application/xml; charset=UTF-8` with no `Content-Encoding`; their combined transfer was 1.21 MB. The mean populated response time was 57.7 seconds. All current empty rechecks were also uncompressed `application/xml; charset=UTF-8`; their mean time was 734 ms, but they carried no discoverable URLs.

The index's single shared `lastmod` was `2026-07-25T21:00:45Z`, while populated child URLs reached `2026-07-25T21:11:56.990927Z`; the index timestamp was therefore not a reliable upper bound for child freshness in this observation.

### CrickZen URL distribution

| Route type | Current, repeatedly revalidated sitemap URLs | Populated-state evidence |
|---|---:|---|
| static hubs | 0 | The home page appeared in `0001`; no dedicated hub sitemap. |
| matches | 0 | `/cric-live/{slug}` observed in every populated shard. |
| match child routes | 0 | No child-route example was observed in the populated endpoints; the current response has no URLs. |
| series / teams / players / schedules / archives / editorial | 0 | No dedicated family sitemap exists in the index. |
| match reports | 0 | `/cricket-match-report/{slug}` observed throughout populated shards. |
| unknown / parameter URLs | 0 | No parameter URL observed in populated shards. |
| **Total** | **0** | **5,370 initial populated records, but not stable** |

Exact populated-state counts by match versus report cannot be responsibly reconstructed after the endpoint began serving empty URL sets. The audit does **not** infer them from shard names. The verified architectural finding is that a file called `sitemap-matches-*` mixed two materially different URL types, while the current delivery state makes neither discoverable.

## 3. Response-time comparison

| Surface | Index response | Child response / delivery | Interpretation |
|---|---:|---|---|
| CREX | 333 ms | 0.60–3.12 s; 1.48 s median | Purpose-named, compressed child files are cheaply crawlable in this audit. |
| CrickZen, populated state | 999 ms | 55.4–60.0 s; 57.7 s mean | A 370–1,000 URL file taking about a minute is expensive and unreliable for sitemap generation/crawling. |
| CrickZen, repeated current state | 999 ms | 0.70–0.87 s, but zero URLs | Fast delivery does not compensate for the empty, cacheable sitemap body. |

## 4. Canonical, indexability, redirects, and non-200 cleanliness

### Page-level sample results

| Site / sampled route family | Result | Canonical / robots / SSR evidence |
|---|---|---|
| CREX match | 200, 809 ms | Self-canonical, `index, follow`, one H1, 49 raw HTML `href` attributes. |
| CREX player | 200, 1,005 ms | Self-canonical, `index, follow`, one H1. |
| CREX editorial | 200, 62 ms | Self-canonical, `index, follow`, one H1. |
| CREX live-score / team / series hubs | 200 | Indexable robots meta found. The live-score and team hub samples did not expose a canonical link in raw HTML; do not assume that absence is intentional. |
| CREX parameterized stats URL | 200, 46 ms | `index, follow`, one H1, but no canonical link found in the raw HTML sample. This is a duplicate-control risk, especially because 1,507 parameter URLs are in the sitemap. |
| CrickZen canonical match | 200, 8.72 s | 8,115-byte shell; no canonical, robots meta, or H1 found in raw response. This fails the stated sitemap eligibility rule until SSR recovers. |
| CrickZen sitemap-listed reports | 6 of 6 sampled were 404 | Includes one example from each shard. No redirect or valid canonical could be established because the endpoints were not 200. |
| CrickZen SSR archive report | 404 | The first report link sampled from `/live-score/archive` was also 404. |

No redirect was observed for the successful CREX and CrickZen page samples; that is a bounded fetch result, not a redirect census. No sampled CREX content page was `noindex`. CrickZen Match Intelligence was absent from all sitemap files, which is correct for the required `noindex,follow` policy; its actual robots directive was not re-tested here because it is not a sitemap candidate.

## 5. Internal-link and SSR discoverability

The relevant standard is not whether a route is visible in the app after JavaScript runs, but whether a crawler receives real SSR `<a href>` links to a useful, indexable target.

| Surface sampled | Raw SSR link evidence | Finding |
|---|---:|---|
| CrickZen homepage | 35 `/cric-live/` anchors | Canonical-match discovery exists from the homepage. |
| CrickZen `/live-score` | 147 `/cric-live/` anchors; 12 report anchors | The sampled sitemap match URL was present. Report links exist but need target-state repair. |
| CrickZen `/live-score/archive` | 92 `/cric-live/` anchors; 24 report anchors; no child-route anchors | Archive has strong raw-link output, but the sampled report target 404s. Completed-only lifecycle intent must be preserved while removing dead targets. |
| CrickZen sampled hubs | 0 scorecard/commentary/lineups links; 0 Match Intelligence links | No evidence in these pages that child routes compete as indexable sitemap candidates. This aligns with keeping Match Intelligence out of the sitemap. |
| CREX live-score hub | The sampled match slug occurred in raw HTML, but was not confirmed as a literal `href` by the bounded regex check | Treat SSR discovery for that exact CREX match as unconfirmed, not as proven solely by embedded data. |

## 6. Lifecycle design observations

1. **CREX separates broad content families but not perfectly exclusive membership.** Monthly news archives plus a rolling current-news sitemap are easy to understand, but their overlap creates 184 duplicate records. Its sitemap boundary helps operations; duplicate publishing undermines the benefit.
2. **CREX uses a very large evergreen match collection.** This is viable only because the file stays under sitemap limits and fetched in 2.82 seconds with Brotli in this run. It is not automatically the right lifecycle for CrickZen.
3. **CrickZen currently shards by capacity, not by URL intent.** Generic `matches-000N` files mix canonical match pages, the home page, and report routes. That makes lifecycle policy and incident diagnosis harder.
4. **CrickZen's immediate issue is delivery correctness, not shard count.** Every child being cacheable and empty means the sitemap is technically 200 yet functionally unavailable. The prior minute-long populated response shows generation/serving is also too expensive.
5. **Completed-match archive integrity is currently broken by dead reports.** The archive may remain completed-only, but an internal link to a 404 report is not useful history and must not become sitemap inventory.

## 7. CREX practices worth adopting — evaluated against CrickZen rules

| Practice | Evaluation for CrickZen | Reason |
|---|---|---|
| Stable sitemap index with named child families | Adopt the principle | Separate canonical matches from entities, hubs, and editorial only when each family is actually indexable and SSR-useful. This improves diagnosis without changing `/cric-live/{slug}`. |
| Compressed XML delivery | Adopt | Brotli/gzip materially reduces transfer for XML; compression is compatible with sitemap crawlers and supports inexpensive generation. |
| Route-family sitemaps | Adopt selectively | A match-report route must be excluded unless it is 200, self-canonical (or canonicalizes appropriately), indexable, and useful. Do not mix it into the canonical match shard. |
| `lastmod` on every URL | Adopt only with meaningful source changes | A generation timestamp stamped on every entity is weak freshness evidence. For matches, update only on a material page-state change; for static entities, update on content change. |
| Current plus archive editorial sitemaps | Not applicable unless CrickZen adds editorial content | Do not add empty or speculative sitemap families. |

## 8. CREX practices not worth copying

- **Do not copy its duplicate rolling-news/archive membership.** Every sitemap URL should be unique across the index.
- **Do not copy parameterized stats URLs into the sitemap.** CRickZen's sitemap should contain canonical, parameter-free URLs only.
- **Do not copy a giant all-time match file just because CREX uses one.** CrickZen should choose shards based on fast, atomic generation and useful lifecycle slices, not competitor shape.
- **Do not copy sitemap rows for routes without proven canonical metadata.** CREX's sampled hubs and parameterized stats page lacked a raw canonical link; that is a warning, not a pattern.
- **Do not add child match routes or Match Intelligence to the sitemap merely to increase URL count.** They must not compete with `/cric-live/{slug}`; Match Intelligence remains `noindex,follow`.

## 9. Proposed CrickZen sitemap structure (proposal only; no implementation)

```text
/sitemap.xml
  /sitemaps/sitemap-core.xml
    homepage, live-score hubs, schedule hubs, completed-only archive hub
  /sitemaps/sitemap-matches-YYYY-MM-NN.xml
    only indexable, 200, self-canonical /cric-live/{slug} match pages
  /sitemaps/sitemap-series-NN.xml
    only indexable, SSR-linked canonical series pages
  /sitemaps/sitemap-teams-NN.xml
    only indexable, SSR-linked canonical team pages
  /sitemaps/sitemap-players-NN.xml
    only indexable, SSR-linked canonical player pages
  /sitemaps/sitemap-editorial-YYYY-MM.xml
    only when editorial routes exist and meet the same eligibility gate
```

Hard exclusion rules:

- Exclude `/cric-live/{slug}/scorecard`, `/commentary`, `/lineups`, `/match-details`, compatibility aliases, query URLs, and any redirecting/non-200 route unless a deliberate canonical policy changes this.
- Exclude `/match-intelligence/{slug}`: it remains `noindex,follow`.
- Exclude match reports until each candidate is 200, useful, SSR-reachable, and has an explicit canonical relationship. Do not use reports as a fallback for completed canonical match pages.
- The archive hub stays in `sitemap-core.xml`, but it must list completed matches only; the underlying canonical completed match URLs belong in the canonical match family, not an archive-only duplicate family.

Generation/delivery contract:

1. Build a cached, atomic manifest from eligible URLs only; never serve an empty manifest as a successful replacement for a populated one.
2. Validate every candidate before publication: 200, indexable, self-canonical, parameter-free, and SSR-useful; deduplicate globally before sharding.
3. Keep shard creation deterministic and bounded well below 50,000 URLs / 50 MB uncompressed.
4. Emit accurate per-file index `lastmod` and per-URL `lastmod` only when source content materially changes.
5. Serve precomputed XML with gzip/Brotli and a short, safe cache policy that cannot cache a failed/empty generation as a valid sitemap.
6. Monitor URL count, 2xx/empty-body rate, generator duration, duplicate count, and sampled canonical/non-200 rate before publishing each manifest.

## 10. Verified evidence versus assumptions

### Verified in production

- Both indexes and every child URL declared by them were requested.
- CREX: all 14 children were 200, Brotli-compressed, non-empty, and contained 58,948 records / 58,764 unique URLs in this run.
- CREX has 1,507 parameterized sitemap URLs and 184 duplicate occurrences.
- CrickZen: all six children initially returned populated 200 XML (5,370 URL records total, 55–60 seconds each) and later all six returned 200 empty XML bodies (107 B, zero URLs). Cache revalidation did not restore content.
- CrickZen populated shards contained both `/cric-live/` and `/cricket-match-report/` URL families. Six sitemap-listed report samples, plus one SSR-archive report sample, returned 404.
- CrickZen's sampled canonical match returned a 200 shell without canonical/robots/H1 in raw HTML; its homepage/live/archive hubs exposed real canonical-match anchors.
- CREX sampled match/player/editorial pages were 200, self-canonical, `index, follow`, and had an H1.

### Not asserted as verified

- A canonical, redirect, `noindex`, or SSR-link verdict for every individual CREX or CrickZen URL. Page-level checks were representative samples by route family.
- The exact match-versus-report split inside CrickZen's initial 5,370 populated records. The endpoint became empty before a stable route census could be repeated; inventing a count would hide the delivery defect.
- A cause for the CrickZen empty-sitemap state. The evidence supports a generation/cache delivery incident; root cause requires a separate code/runtime investigation.
- That any CREX pattern should be copied unchanged. All recommendations above are constrained by CrickZen's canonical `/cric-live/{slug}`, noindex Match Intelligence, completed-only archive, and SSR-usefulness rules.

## Priority conclusion

Before expanding CrickZen sitemap coverage, restore a reliable non-empty, fast, atomic canonical-match sitemap. A sitemap that alternates between minute-long populated responses and cacheable empty 200 responses is a more serious crawlability failure than the lack of entity sitemap families. The next integrity gate is to remove or repair the 404 report URLs and to require page-level canonical/SSR eligibility before any route enters a published sitemap.
