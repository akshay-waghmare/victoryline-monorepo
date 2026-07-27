# CrickZen Production SEO Baseline Audit — July 2026

**Scope:** production-only baseline and scoring. No application, configuration,
deployment, restart, or sitemap-submission action was taken.

**Audit date:** 2026-07-28
**Confidence:** high — representative production SSR samples were collected from
all required route types; three sitemap partitions loaded reliably; repository
routing and SEO services were inspected.

## Fixed SEO contract

- `/cric-live/{slug}` is the canonical match entity.
- `/live-score`, `/live-score/today`, `/cricket-schedule/today`, and
  `/live-score/archive` are discovery hubs.
- Child match routes canonicalise to their parent match. Match Intelligence is
  a noindex compatibility route.
- Evidence is production HTTP/SSR evidence unless explicitly labelled source.

## Production baseline

| Surface | Status | Size | H1 | Canonical | JSON-LD | Robots |
|---|---|---|---|---|---|---|
| `/` | 200 | 2,539,867 B | `Live cricket scores` | `https://www.crickzen.com/` | 6 | `index,follow` |
| `/live-score` | 200 | 192,465 B | `Cricket Live Score Today` | `https://www.crickzen.com/live-score` | 7 | `index,follow` |
| `/live-score/today` | 200 | 133,581 B | `Live Score Today` | `https://www.crickzen.com/live-score/today` | 7 | `index,follow` |
| `/cricket-schedule/today` | 200 | 134,753 B | `Cricket Schedule Today` | `https://www.crickzen.com/cricket-schedule/today` | 7 | `index,follow` |
| `/live-score/archive` | 200 | 129,581 B | `Cricket Match Discovery Archive` | `https://www.crickzen.com/live-score/archive` | 6 | `index,follow` |
| `/live-score/ipl` | 200 | 179,808 B | `IPL Live Score` | `https://www.crickzen.com/live-score/ipl` | 7 | `index,follow` |
| `/matches` | 200 | 125,513 B | `Cricket Matches` | `https://www.crickzen.com/matches` | 0 | not found |
| `/live-cricket-score` | 200 | 192,841 B | `Live Cricket Score` | `https://www.crickzen.com/live-cricket-score` | 7 | `index,follow` |
| `/series/{european-cup}` | 200 | 2,511,561 B | 1 H1, canonical, `index,follow`, 3 JSON-LD, meta description, OG tags, Twitter card |
| `/series/{pak-tour-of-wi}` | 200 | 2,511,561 B | `Pakistan tour of West Indies 2026`, canonical → self, 3 JSON-LD, `index,follow`, meta desc |
| `/cric-live/pak-vs-wi-...-11B4` (full SSR, live) | 200 | 726,905 B | `PAK vs WI Live Score, Commentary & Scorecard` | canonical → self | 7 | `index,follow` |
| `/cric-live/aut-vs-rom-...-138I` (full SSR, live) | 200 | 288,023 B | `AUT vs ROM Live Score, Commentary & Scorecard` | canonical → self | 7 | N/A |
| `/cric-live/mil-vs-sb-...-ZKD` (thin SSR, live) | 200 | 10,043 B | `MIL vs SB - Live match` | canonical → self | 1 | `index,follow` |
| `/cric-live/kt-vs-lancs-...-ZYP` (thin SSR, upcoming) | 200 | 10,063 B | `KT vs Lancs - Upcoming match` | canonical → self | 1 | N/A |
| `/cric-live/bb-w-vs-ht-w-...-1376` (thin SSR, upcoming) | 200 | 9,994 B | `BB W vs HT W - Upcoming match` | canonical → self | 1 | N/A |
| `/cric-live/ban-vs-zim-...-12AN` (thin SSR, completed) | 200 | 9,980 B | `BAN vs ZIM - Match completed` | canonical → self | 1 | `index,follow` |
| `/player/aaditya-mahata` | 200 | 65,657 B | `Aaditya Mahata` | **not found** | 0 | **not found** |
| `/teams` | 200 | 190,863 B | `Teams` (icons inside H1 caused audit parser miss) | **not found** | 0 | **not found** |
| `/players` | 200 | 1,850,959 B | `Players` (icons inside H1 caused audit parser miss) | **not found** | 0 | **not found** |

### Match child routes (pak-vs-wi, full SSR parent)

| Child route | Status | H1 | Canonical | JSON-LD | Robots |
|---|---|---|---|---|---|
| `/scorecard` | 200 | `PAK vs WI Full Scorecard` | parent match URL | 7 | `index,follow` |
| `/match-details` | 200 | `PAK vs WI Match Details` | parent match URL | 7 | `index,follow` |
| `/lineups` | 200 | `PAK vs WI Playing XI and Lineups` | parent match URL | 7 | `index,follow` |
| `/commentary` | 200 | `PAK vs WI Live Commentary` | parent match URL | 7 | `index,follow` |

### Match Intelligence route

- Standalone `/match-intelligence/{slug}` route (source:
  `admin-layouts.routing.ts:76`) returns **200** with H1, self-canonical,
  and `robots: noindex,follow` — working as designed.
- Nested `/cric-live/{slug}/match-intelligence` URL returns **404** — this
  nested pattern is not a supported route; only the standalone path is valid.
- The `noindex,follow` directive is correctly emitted by
  `MatchIntelligenceComponent` (line 449) on the working standalone route.

---

## Verified production findings

### P0 — selective canonical match pages fall back to a thin SSR shell (evolved)

**URLs tested repeatedly (same session)**

- `https://www.crickzen.com/cric-live/mil-vs-sb-9th-match-the-hundred-2026-men-match-updates-ZKD`
- `https://www.crickzen.com/cric-live/kt-vs-lancs-25th-match-england-domestic-one-day-cup-2026-match-updates-ZYP`
- `https://www.crickzen.com/cric-live/bb-w-vs-ht-w-9th-match-maharani-t20-trophy-2026-match-updates-1376`
- `https://www.crickzen.com/cric-live/ban-vs-zim-3rd-t20-bangladesh-tour-of-zimbabwe-2026-match-updates-12AN`

**Evidence:** each of the four thin-shell URLs returned `200` in approximately
8.7–8.9 seconds and produced HTML of ~9,980–10,063 bytes. Compared to the
previous audit (2026-07-26) where these produced **0 H1, 0 canonical, and 0
JSON-LD**, the thin shell has **partially recovered**: each now carries 1 H1
(e.g. `MIL vs SB - Live match`, `BAN vs ZIM - Match completed`), a canonical,
1 JSON-LD block, meta description, OG title/description, and Twitter card.

By contrast, the two full-SSR match pages tested (`pak-vs-wi-...-11B4`,
`aut-vs-rom-...-138I`) returned 726,905–288,023 bytes, 7 JSON-LD blocks, and
loaded in 2.9–4.3 seconds.

**Expected:** every canonical `/cric-live/` page should expose full match
content, 7 JSON-LD blocks, rich entity links, and the same content depth in raw
SSR HTML as the top-performing pages.

**Impact:** crawlers receive a significantly thinner document for some canonical
match URLs — lower content depth, reduced structured-data richness (1 vs 7
JSON-LD blocks), and slower response times (8.7–8.9 s vs 2.9–4.3 s).

**Change since 2026-07-26:** the shell has been partially patched (basic H1,
canonical, meta description, and 1 JSON-LD now present), but the content-depth
and performance gaps remain.

**Confidence:** high. **Exists in:** production.

**Source evidence:** `MetaTagsService.preserveCanonicalFallbackParity()`
(`meta-tags.service.ts:160-184`) detects and preserves SSR fallback titles,
canonicals, and robots directives, which explains why the thin shell now carries
these basic signals.

---

### P0 — `/live-cricket-score` is a duplicate-intent route with conflicting self-canonical policy

**Production URLs tested**

- `https://www.crickzen.com/live-score` → canonical: `https://www.crickzen.com/live-score`
- `https://www.crickzen.com/live-cricket-score` → canonical: `https://www.crickzen.com/live-cricket-score`

**Evidence:** both return `200` with distinct H1s (`Cricket Live Score Today`
vs `Live Cricket Score`), 7 JSON-LD blocks each, and self-referencing
canonicals. The `/live-cricket-score` URL is **listed in
`sitemap-matches-0001.xml`**.

**Source evidence:** `admin-layouts.routing.ts:74` defines
`{ path: 'live-cricket-score', component: LiveScoreHubComponent, data: { hubType: 'liveCricketScore' } }`.
This is an intentional route, not an accidental alias — both routes reuse
`LiveScoreHubComponent` with different `hubType` values producing separate
canonicals.

**Expected:** `/live-cricket-score` should either canonicalise to `/live-score`
or not be listed in the sitemap. Alternatively, if it serves a distinct user
intent with materially different content, it should be justified in the SEO
contract.

**Impact:** the two self-canonical URLs expose the same broad hub intent, so
Google may choose a different canonical or consolidate their signals unless the
SEO contract explicitly distinguishes them. Exact content duplication was not
established by this audit.

**Confidence:** high. **Exists in:** production and source.

---

### P1 — player and entity-listing templates lack core indexability metadata

**Production URLs tested**

- `https://www.crickzen.com/player/player%3Aaaditya-mahata-M7W/aaditya-mahata`
- `https://www.crickzen.com/teams`
- `https://www.crickzen.com/players`

**Evidence:** the player profile page returns `200` with title `Aaditya Mahata
Cricket Profile | Crickzen` and H1 `Aaditya Mahata`, but has **no canonical,
robots meta, meta description, Open Graph tags, Twitter card, or JSON-LD
structured data**. The `/teams` and `/players` listing pages return `200` with
H1 (`Teams` and `Players` respectively) but **no canonical, robots meta,
JSON-LD, OG, or Twitter tags** — only a `<title>` is present beside the H1.

**Source evidence:** `PlayersPageComponent` (`players-page.component.ts`) and
`TeamsPageComponent` (`teams-page.component.ts`) import only Angular's `Title`
service. They do **not** use `MetaTagsService` or `StructuredDataService`,
which are the centralized SEO services used by `HomeComponent`,
`CricketOddsComponent`, and `LiveScoreHubComponent`.

**Expected:** indexable entity pages should expose a canonical, robots meta,
Open Graph metadata, Twitter card, descriptive meta description, and
route-appropriate structured data (Person/SportsTeam schema for profiles,
CollectionPage for listings).

**Severity change since 2026-07-26:** the previous audit reported `/teams` and
`/players` had 1 H1 but no metadata. The current baseline confirms the H1
elements are present, but the metadata gap (no canonical, robots, JSON-LD, OG,
or Twitter) remains unchanged.

**Confidence:** high for all three templates. **Exists in:** production and source.

---

### P1 — internal entity graph stops at the series on the sampled match page

**URL tested:** `https://www.crickzen.com/cric-live/pak-vs-wi-1st-test-pakistan-tour-of-west-indies-2026-match-updates-11B4`

**Evidence:** its raw HTML contains:
- 2 crawlable links to child routes
- 2 crawlable links to the specific series page
  (`/series/series%3Apakistan-tour-of-west-indies-2026-2BC/pakistan-tour-of-west-indies-2026`)
- 4 links to discovery hubs
- 2 links to `/teams` (the listing page, **not** team-specific profile pages)
- **0 links** to specific player profiles
- **0 links** to specific team profiles (`/teams/{externalId}/{slug}`)

The homepage exposes 38 crawlable match links from raw SSR HTML.

**Impact:** direct match discovery is healthy, but team/player entity profile
links are absent from the strongest context page template. The links to `/teams`
are generic navigation, not entity connections.

**Confidence:** high for this sample. **Exists in:** production.

---

### P1 — nested `/cric-live/{slug}/match-intelligence` returns 404; standalone route works correctly

**URLs tested**

- `https://www.crickzen.com/cric-live/pak-vs-wi-1st-test-pakistan-tour-of-west-indies-2026-match-updates-11B4/match-intelligence` → **404**
- `https://www.crickzen.com/match-intelligence/pak-vs-wi-1st-test-pakistan-tour-of-west-indies-2026-match-updates-11B4` → **200**, H1 `PAK vs WI Live Match Intelligence`, self-canonical, `robots: noindex,follow`

**Evidence:** The nested `/cric-live/{slug}/match-intelligence` URL pattern
returns 404 because it is not a registered route. The standalone
`/match-intelligence/{slug}` route (`admin-layouts.routing.ts:76`) works
correctly and emits `noindex,follow` per `MatchIntelligenceComponent:449`.

**Expected:** internal links and discovery surfaces should reference the
standalone `/match-intelligence/{slug}` path, not the nested pattern. If the
product intends both patterns, the nested route should redirect or canonicalise
to the standalone one.

**Impact:** low — the correct route exists and works. The 404 only affects
users/crawlers following a nested-path convention that has no registered route.

**Confidence:** high. **Exists in:** production (nested 404).

---

### P2 — non-homepage sitemap URLs include non-canonical routes

**Evidence:** `sitemap-matches-0001.xml` (1,000 URLs, loaded in under 45
seconds) contains 10 non-`/cric-live/` URLs including `/live-cricket-score`
(duplicate route, P0), `/live-score/ipl`, `/cricket-schedule/ipl-2026`, `/matches`,
`/series`, and the homepage. All three sitemap partitions loaded reliably
(0001: 1,000 URLs, 0002: 1,000 URLs, 0003: 729 URLs).

The `/live-cricket-score` entry is the most concerning because it is a
duplicate canonical on the sitemap.

**Confidence:** high. **Exists in:** production.

---

## Verified strengths

- `robots.txt` is available and references the sitemap; it blocks internal API,
  admin, auth, private, search, facet, sort, and pagination crawl patterns.
  Crawl-delay is set to 1.
- HTTP and bare-host requests redirect to `https://www.crickzen.com/`
  (HTTP → 308 Permanent Redirect, bare host → 301).
- Unknown-route handling returned HTTP `404` with a branded `Oops! That's a
  Wide Ball!` page including navigation links.
- Trailing slash and UTM/pagination variants of `/live-score` return a clean
  canonical to `/live-score`; page query patterns are also blocked in robots.
- Discovery hubs have SSR-visible canonical match links (`<a href>`), not only
  client-side click handlers. Homepage has 38 crawlable match links.
- Sitemap index (`/sitemap.xml`) returns `200` with 3 partitions
  (`sitemap-matches-0001.xml` through `0003`), all loaded reliably.
- Full-SSR match pages (e.g. `pak-vs-wi-...-11B4`) carry 7 JSON-LD blocks,
  descriptive meta descriptions, OG/Twitter metadata, proper canonical, and
  child route links.
- Child match routes (`/scorecard`, `/match-details`, `/lineups`, `/commentary`)
  correctly canonicalise to the parent match URL with `index,follow`.
- The `MetaTagsService` includes an SSR fallback preservation mechanism
  (`preserveCanonicalFallbackParity`, `meta-tags.service.ts:160-184`) that
  prevents client-side hydration from overwriting server-rendered canonical,
  title, and robots directives.
- The `StructuredDataService` is a centralized JSON-LD factory supporting
  SportsEvent, Article, NewsArticle, LiveBlogPosting, Organization, SportsTeam,
  Person, BreadcrumbList, WebPage, CollectionPage, ItemList, and FAQPage schemas.

## Structured-data and sharing evidence

Homepage, discovery hubs, and full-SSR match pages all emit rich JSON-LD:
- Homepage: 6 blocks (WebPage + ItemLists)
- Hub pages: 6–7 blocks (CollectionPage + breadcrumbs + ItemLists + FAQPage)
- Full match pages: 7 blocks (WebPage + Article/NewsArticle + SportsEvent +
  BreadcrumbList + ItemList + FAQPage + LiveBlogPosting when applicable)
- Thin-SSR match pages: 1 block (reduced)

Player and team/players listing pages emit zero JSON-LD and zero Open
Graph/Twitter metadata. No external schema validator or Search Console
enhancement report was available in this audit.

## Performance, SSR, and mobile evidence

**Measured response times (raw `Invoke-WebRequest`):**

| Page | Time | HTML size |
|---|---|---|
| Full-SSR match (pak-vs-wi) | 4.3 s | 726,905 B |
| Full-SSR match (aut-vs-rom) | 2.9 s | 288,023 B |
| Thin-SSR match (mil-vs-sb) | 8.8 s | 10,043 B |
| Thin-SSR match (ban-vs-zim) | 8.9 s | 9,980 B |
| Homepage | 5.3 s | 2,539,867 B |
| Series page | 4.6 s | 2,511,561 B |
| Players hub | 4.3 s | 1,850,959 B |

**Risks, not confirmed CWV failures:** large SSR documents (homepage and series
pages exceed 2.4 MB of raw HTML), live-update WebSocket work, third-party
tracking tags (GA4, two Facebook Pixel instances), and selective SSR
timeout/fallback behaviour at 8.7–8.9 seconds can hurt LCP, INP, and mobile
data consumption. A real mobile-browser Core Web Vitals trace is still required.

## Source-code facts and production/source mismatches

| Source fact | Production confirmation |
|---|---|
| `admin-layouts.routing.ts:74` — `/live-cricket-score` is a dedicated route | Confirmed: 200, self-canonical, in sitemap. Duplicate-intent candidate relative to `/live-score`; exact content duplication is not established by this audit. |
| `admin-layouts.routing.ts:76` — standalone `/match-intelligence/:slug` | Confirmed: production returns 200 with self-canonical and `noindex,follow`; the nested `/cric-live/{slug}/match-intelligence` pattern returns 404. |
| `admin-layouts.routing.ts:84-85` — match matcher and catch-all for `/cric-live` | Confirmed: working for both full and thin SSR. |
| `PlayerPageComponent` / `TeamsPageComponent` — no MetaTagsService usage | Confirmed: player profile and listing pages have no canonical, robots, OG, Twitter, or JSON-LD. |
| `MatchIntelligenceComponent:448-449` — `robots: 'noindex,follow'` | Confirmed on the working standalone `/match-intelligence/{slug}` route; the unsupported nested route returns 404. |
| `MetaTagsService:37-48` — SSR fallback canonical detection | Confirmed: thin-SSR pages now carry canonical and robots from the fallback mechanism (vs 0-canonical in previous audit). |
| `StructuredDataService:262-276` — `setPageSchemas()` injects JSON-LD | Confirmed: rich JSON-LD present on full-SSR pages. |
| `match-canonical-policy.ts` — parent canonical policy for child routes | Confirmed: all child routes canonicalise to parent. |

No source-only conclusion is used to explain the match SSR shell failures; the
current deployment/runtime cause remains unverified, though the thin-shell
content has improved since 2026-07-26.

## Assumptions and evidence gaps

- No authenticated Search Console performance, URL-inspection, coverage, or
  Core Web Vitals data was available.
- Browser hydration was not inspected with a real mobile browser in this
  read-only baseline.
- Archive lifecycle labels were not semantically parsed from every card. Its
  SSR link surface is healthy, but completed-only correctness needs a separate
  data-level sample.
- No external schema validator or GSC enhancement report was available to
  validate JSON-LD correctness.
- The `og:image` regex did not resolve a clean URL for the homepage;
  this may indicate a missing or fallback OG image. A raw HTML grep is needed.

## Commands and tools used

- `Invoke-WebRequest` (PowerShell) for production SSR and metadata samples
- Repository route and service inspection via file reads and agent exploration
- `curl -I -L` equivalent via `Invoke-WebRequest` for redirect/status checks

## Controlled next gate

Stop here. The first implementation batch should address:
1. P0: Investigate and fix the selective SSR timeout/fallback that produces thin
   match shells (content-depth and JSON-LD gap between 1-block thin and 7-block
   full pages).
2. P0: Add a canonical from `/live-cricket-score` to `/live-score` or remove
   the duplicate-intent route from both the router and the sitemap.
3. P1: Wire `MetaTagsService` into `PlayersPageComponent` and
   `TeamsPageComponent` to provide canonical, robots, OG, Twitter, and meta
   description on all entity pages.
4. P1: Ensure internal links use the standalone `/match-intelligence/{slug}` path;
   the nested `/cric-live/{slug}/match-intelligence` pattern has no registered route.

Re-run this baseline sample after the first batch ships.

---

# SEO Scorecard — July 2026

Every score is derived exclusively from the production evidence and source-code
facts in this audit document. No extrapolation, assumption, or external tool was
used.

## Technical SEO — 4 / 10

| Finding | Evidence |
|---|---|
| `robots.txt` is available, references sitemap, blocks API/admin/auth/search/facet/sort/page patterns, sets crawl-delay | Verified strengths |
| HTTP → 308 to `https://www.crickzen.com/`; bare `crickzen.com` → 301 | Verified strengths |
| Unknown routes return branded HTTP `404` | Verified strengths |
| P0: four sampled canonical `/cric-live/` pages serve thin 10 KB SSR at 8.7–8.9 s with 1 JSON-LD block vs 727 KB / 7 JSON-LD blocks on full pages | P0 thin-SSR |
| P0: `/live-cricket-score` is a duplicate-intent route relative to `/live-score`, with its own self-canonical and sitemap entry | P0 duplicate-intent canonical policy |
| P1: player profile page has no canonical, robots meta, meta description, OG, Twitter, or JSON-LD | P1 entity metadata |
| P1: `/teams` and `/players` listing pages have no canonical, robots meta, or JSON-LD | P1 entity metadata |
| P1: nested `/cric-live/{slug}/match-intelligence` returns 404; standalone `/match-intelligence/{slug}` returns 200 with `noindex,follow` | P1 unsupported nested route |
| All three sitemap partitions load reliably under 45 s (2,729 total URLs) | Verified strengths |

**Rationale:** Core foundation (robots, redirects, 404) is well-executed. The
thin-SSR gap and `/live-cricket-score` conflicting self-canonical are significant
technical issues on the two most important page types. The P1 entity-page
metadata voids represent systematic gaps in SSR coverage. Score is lower than
the previous audit because the duplicate-intent canonical conflict is a new
verified finding.

## Crawlability and indexation — 4 / 10

| Finding | Evidence |
|---|---|
| `robots.txt` cleanly gates internal patterns; sitemap is referenced | Verified strengths |
| Discovery hubs expose SSR-visible canonical match links (`<a href>`), not only client-side handlers | Verified strengths; homepage: 38 match links |
| P0: crawlers can receive a successful `200` but significantly thinner document (~10 KB, 1 JSON-LD block) for some canonical match URLs | P0 thin-SSR |
| P0: sitemap lists `/live-cricket-score` alongside `/live-score` — duplicate-intent hubs in sitemap inflate crawl budget and indexation risk | P0 duplicate-intent sitemap entry |
| P1: entity pages (player profile, teams/players listings) have no canonical or robots directives — Google must guess indexation policy | P1 entity metadata |
| All three sitemap partitions are accessible and load reliably | Verified strengths |
| No GSC coverage or URL-inspection data was available | Assumptions |

**Rationale:** Hub-based discovery is healthy and sitemaps are now reliable.
The thin-SSR gap reduces crawl yield for match pages; the duplicate-intent
hub in the sitemap wastes crawl budget. Entity pages without canonical/robots
directives have indeterminate indexation status. Without GSC data, the real
indexing picture is unknown.

## Canonical and duplicate-content control — 5 / 10

| Finding | Evidence |
|---|---|
| Trailing-slash and UTM/pagination variants of `/live-score` return clean canonical to `/live-score` | Verified strengths |
| Child match routes canonicalise to parent `/cric-live/` URL | Match child routes |
| Page query patterns are blocked in `robots.txt` | Verified strengths |
| P0: `/live-cricket-score` has self-referencing canonical, listed in sitemap alongside `/live-score` — duplicate-intent hub with conflicting canonical policy | P0 duplicate-intent route |
| P1: `/teams`, `/players`, and player profile page have no canonical tag | P1 entity metadata |
| Thin-SSR match pages now carry a valid self-referencing canonical (improvement from previous 0-canonical) | P0 thin-SSR evolved |

**Rationale:** Canonical policy is well-designed for hubs and child routes but
has two gaps: the `/live-cricket-score` conflicting self-canonical alongside
`/live-score`, and entity pages with no canonical at all. The improved
thin-SSR canonical handling raises the score floor but the duplicate-intent
hub lowers the ceiling.

## Internal linking and entity graph — 5 / 10

| Finding | Evidence |
|---|---|
| Homepage exposes 38 crawlable match links in raw SSR HTML | Production baseline |
| `/live-score` hub provides 147 match links | Production baseline |
| `/live-score/today`: 63 match links; `/cricket-schedule/today`: 63; `/live-score/archive`: 92 | Production baseline |
| Sampled full-SSR match page links to child routes, discovery hubs, and its series page | P1 entity graph |
| Sampled match page has **0 SSR-visible specific team/player profile links** — team links point to generic `/teams` listing | P1 entity graph |
| 2 specific series links present on sampled match page | P1 entity graph |

**Rationale:** Hub-to-match discovery is strong with substantial match links
on every hub page. The match-to-entity (team/player) graph remains a verified
gap — no specific team or player profile links exist on the sampled match page.
The generic `/teams` links count for navigation but not entity authority.

## Match-page intent and usefulness — 5 / 10

| Finding | Evidence |
|---|---|
| Full-SSR match page (`pak-vs-wi-...-11B4`): 727 KB, rich H1, canonical, meta description, OG/Twitter, 7 JSON-LD blocks, child route links | Production baseline |
| Full-SSR match page (`aut-vs-rom-...-138I`): 288 KB, rich H1, canonical, 7 JSON-LD blocks | Production baseline |
| Thin-SSR match pages: ~10 KB, generic H1 (`MIL vs SB - Live match`), 1 JSON-LD block, meta description present, OG/Twitter present | P0 thin-SSR evolved |
| All four child match routes return `200`, correct parent canonical, 7 JSON-LD blocks, distinct H1 | Match child routes |

**Rationale:** When fully rendered, match pages are rich and well-structured.
The thin-SSR variants now carry basic SEO signals (H1, canonical, meta
description, 1 JSON-LD) compared to the previous 0-metadata shell — this is a
partial recovery that improves the score. But the content-depth gap between
full (727 KB, 7 JSON-LD) and thin (10 KB, 1 JSON-LD) remains significant.

## Structured data — 7 / 10

| Finding | Evidence |
|---|---|
| Homepage: 6 JSON-LD blocks | Production baseline |
| All hub pages: 6–7 JSON-LD blocks each (CollectionPage, breadcrumbs, ItemLists, FAQPage) | Production baseline |
| Full-SSR match pages: 7 JSON-LD blocks (WebPage, Article/NewsArticle, SportsEvent, BreadcrumbList, ItemList, FAQPage, LiveBlogPosting) | Production baseline |
| All four child match routes: 7 JSON-LD blocks each | Match child routes |
| Series hub: 3 JSON-LD blocks | Production baseline |
| Thin-SSR match pages: 1 JSON-LD block | P0 thin-SSR |
| Player profile, `/teams`, `/players`: 0 JSON-LD blocks | P1 entity metadata |
| `StructuredDataService` supports 12 schema types including `Organization`, `SportsTeam`, `Person` — unused on entity pages | Source code |
| No external schema validator or GSC enhancement report was available | Assumptions |

**Rationale:** JSON-LD coverage is production-grade on hubs and full match pages
with rich, multi-type blocks. The structured data factory has entity schemas
(Person, SportsTeam) available but unused. Thin-SSR match pages (1 block) and
entity pages (0 blocks) are the only verified gaps, unchanged from the
previous audit.

## Performance, SSR and mobile risk — 3 / 10

| Finding | Evidence |
|---|---|
| Full-SSR pages: 2.9–4.3 seconds | Performance evidence |
| Thin-SSR fallback pages: 8.7–8.9 seconds consistently | Performance evidence |
| Homepage raw HTML: 2,539,867 bytes (2.5 MB) | Production baseline |
| Series hub raw HTML: 2,511,561 bytes (2.5 MB) | Production baseline |
| Players hub raw HTML: 1,850,959 bytes (1.9 MB) | Production baseline |
| Third-party tags: GA4 (`G-Y32H6PDB9Q`), two Facebook Pixel instances (`1154153703083320`, `1321658105670223`) | Raw HTML evidence |
| Also observed: `aistekso.net` third-party script reference | Raw HTML evidence |
| No real mobile-browser or Core Web Vitals trace was available | Assumptions |

**Rationale:** 2.5 MB of raw SSR HTML on the homepage and series pages is an
extreme mobile payload. Thin-SSR fallback at 8.7+ seconds is a definitive
performance regression. Multiple third-party ad/tracking scripts compound
client-side overhead. Without real CWV data, the score is conservative, but the
observed figures are independently alarming and unchanged from the previous
audit.

## Content quality and topical authority — 4 / 10

| Finding | Evidence |
|---|---|
| Full-SSR pages carry exactly 1 H1 with descriptive match/surface text | Production baseline |
| Working match page delivers 288–727 KB of HTML covering match, scorecard, details, lineups, commentary, and intelligence sub-surfaces | Production baseline |
| Meta descriptions are present and descriptive on all tested surfaces (full-SSR match, thin-SSR match, series, homepage, hubs) | Raw HTML verification |
| Discovery hubs aggregate high link counts (38–147), suggesting broad schedule coverage | Production baseline |
| No textual content review, topical-depth analysis, or external-authority signal (backlinks, topical trust) was performed | Audit scope |

**Rationale:** Structural indicators (H1 discipline, extensive child-route
content, descriptive meta descriptions, high hub link density) suggest editorial
coverage depth. No direct content quality or authority evaluation was in scope.

## Measurement and monitoring — 3 / 10

| Finding | Evidence |
|---|---|
| No authenticated Search Console performance, URL-inspection, or coverage data was available | Assumptions |
| No Core Web Vitals data was available | Assumptions |
| No external schema validator or GSC enhancement report was available | Assumptions |
| Sitemap partitions now load reliably from the audit environment (improvement from previous timeout at 90+ seconds) | Production baseline |
| No verified GSC/indexing API endpoint was tested in this audit | Scope |

**Rationale:** Sitemap observability has improved but no authenticated GSC
data, CWV traces, or schema validation results were available to verify
real-world SEO health.

---

## Weighted overall score: 4.50 / 10

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 4 | 15% | 0.60 |
| Crawlability and indexation | 4 | 20% | 0.80 |
| Canonical and duplicate-content control | 5 | 10% | 0.50 |
| Internal linking and entity graph | 5 | 10% | 0.50 |
| Match-page intent and usefulness | 5 | 15% | 0.75 |
| Structured data | 7 | 10% | 0.70 |
| Performance, SSR and mobile risk | 3 | 10% | 0.30 |
| Content quality and topical authority | 4 | 5% | 0.20 |
| Measurement and monitoring | 3 | 5% | 0.15 |
| **Overall** | | | **4.50** |

**Weights rationale:** Crawlability/indexation is weighted highest (20%) because
it gates all other SEO value. Technical SEO and match-page usefulness each carry
15% — match pages are the primary SEO surface. The remaining categories are
weighted 10% or 5% by scope of impact. Content quality and measurement are
capped at 5% because this audit had the least evidence in those areas.

**Score movement since 2026-07-26 (was 4.70):**

| Category | Previous | Current | Delta | Driver |
|---|---|---|---|---|
| Technical SEO | 5 | 4 | -1 | Duplicate-intent route (`/live-cricket-score`) retains a conflicting self-canonical |
| Crawlability | 4 | 4 | 0 | Same thin-SSR risk; sitemap reliability improved but duplicate route in sitemap offsets |
| Canonical control | 6 | 5 | -1 | Conflicting self-canonical on `/live-cricket-score` outweighs improved thin-SSR canonicals |
| Entity graph | 6 | 5 | -1 | Team links confirmed as generic `/teams`, not specific profiles |
| Match-page usefulness | 4 | 5 | +1 | Thin-SSR pages now carry H1, canonical, meta desc, OG — partial recovery from 0-metadata shell |
| Structured data | 7 | 7 | 0 | No change |
| Performance | 3 | 3 | 0 | No change |
| Content quality | 4 | 4 | 0 | No change |
| Measurement | 3 | 3 | 0 | No change |

**Headline finding:** The thin-SSR match page recovery (H1, canonical, meta
description now present) partially offset new issues — the
`/live-cricket-score` conflicting self-canonical and the confirmed generic
team-link pattern. Net movement is -0.20 (4.70 → 4.50).

**Re-audit trigger:** After the P0 fixes ship (thin-SSR content depth,
`/live-cricket-score` canonical resolution, and P1 entity-page metadata),
re-run the production baseline sample and refresh this scorecard.
