# CrickZen Production SEO Baseline Audit — July 2026

**Scope:** production-only baseline and scoring. No application, configuration,
deployment, restart, or sitemap-submission action was taken.

**Audit date:** 2026-07-26
**Confidence:** medium — representative production SSR samples are strong, but
not every sitemap partition and no real-device Core Web Vitals run could be
completed from this environment.

## Fixed SEO contract

- `/cric-live/{slug}` is the canonical match entity.
- `/live-score`, `/live-score/today`, `/cricket-schedule/today`, and
  `/live-score/archive` are discovery hubs.
- Child match routes canonicalise to their parent match. Match Intelligence is
  a noindex compatibility route.
- Evidence is production HTTP/SSR evidence unless explicitly labelled source.

## Production baseline

| Surface | Status | Raw SSR evidence |
|---|---:|---|
| `/` | 200 | 2,490,127 bytes, 1 H1, canonical, 6 JSON-LD blocks, 35 match links |
| `/live-score` | 200 | 191,187 bytes, 1 H1, canonical, 7 JSON-LD blocks, 147 match links |
| `/live-score/today` | 200 | 132,336 bytes, 1 H1, canonical, 7 JSON-LD blocks, 63 match links |
| `/cricket-schedule/today` | 200 | 133,097 bytes, 1 H1, canonical, 7 JSON-LD blocks, 63 match links |
| `/live-score/archive` | 200 | 146,689 bytes, 1 H1, canonical, 7 JSON-LD blocks, 92 match links |
| `/series/current/european-cup-2026` | 200 | 1 H1, canonical, `index,follow`, 3 JSON-LD blocks |
| `/cric-live/bp-vs-tr-4th-match-the-hundred-2026-men-match-updates-ZK8` | 200 | 285,047 bytes, 1 H1, canonical, 7 JSON-LD blocks |
| `/player/player%3Aaaditya-mahata-M7W/aaditya-mahata` | 200 | 1 H1 but no canonical, robots meta, JSON-LD, Open Graph, or Twitter metadata |
| `/teams` | 200 | 1 H1 but no canonical or JSON-LD |
| `/players` | 200 | 1 H1 but no canonical or JSON-LD |

### Match child routes

The tested Hundred match's `/scorecard`, `/match-details`, `/lineups`, and
`/commentary` routes all returned `200`, one H1, 7 JSON-LD blocks, and a
canonical pointing to the parent `/cric-live/...` URL. Their robots meta was
`index,follow`; this is compatible with the parent-canonical policy, although
these routes must never be sitemap-listed or preferred in internal links.

The standalone `/match-intelligence/...` route returned `200`, one H1,
canonical to itself, 2 JSON-LD blocks, and `noindex,follow`, which matches the
product contract.

## Verified production findings

### P0 — selective canonical match pages fall back to a thin SSR shell

**URLs tested repeatedly**

- `https://www.crickzen.com/cric-live/ban-vs-zim-3rd-t20-bangladesh-tour-of-zimbabwe-2026-match-updates-12AN`
- `https://www.crickzen.com/cric-live/aut-vs-rom-3rd-match-eca-mens-european-cup-2026-match-updates-138I`

**Evidence:** each URL returned `200` three times, but took approximately
8.7–8.9 seconds and produced the same 8,115-byte HTML shell with **0 H1, 0
canonical tags, and 0 JSON-LD blocks**. A separate valid match URL returned
full SSR HTML on all three attempts, so this is selective rather than a
site-wide outage.

**Expected:** every canonical `/cric-live/` page should expose a title,
canonical, one H1, structured data, and useful match content in raw SSR HTML.

**Impact:** crawlers can receive a successful but non-indexable/thin document
for canonical match URLs. This is the highest-impact current technical SEO
blocker.

**Confidence:** high. **Exists in:** production.

### P1 — player and entity-listing templates lack core indexability metadata

**URLs tested**

- `https://www.crickzen.com/player/player%3Aaaditya-mahata-M7W/aaditya-mahata`
- `https://www.crickzen.com/teams`
- `https://www.crickzen.com/players`

**Evidence:** all returned `200` with one H1, but the sampled player page had
no canonical, robots meta, JSON-LD, Open Graph, or Twitter metadata. The team
and player listing pages had no canonical or JSON-LD.

**Expected:** indexable entity pages should have a canonical and route-appropriate
metadata; player profiles should also expose useful structured data where the
content supports it.

**Impact:** weak entity-page indexing and sharing signals; avoid assuming this
means all player/team routes are excluded until GSC URL inspection is checked.

**Confidence:** high for sampled templates. **Exists in:** production.

### P1 — internal entity graph stops at the series on the sampled match page

**URL tested:** `https://www.crickzen.com/cric-live/bp-vs-tr-4th-match-the-hundred-2026-men-match-updates-ZK8`

**Evidence:** its raw HTML contains crawlable links to the scorecard, details,
lineups, commentary, Match Intelligence, discovery hubs, and its series route;
it exposes no SSR-visible team or player profile links. The homepage and
live-score hub expose 17 and 120 crawlable match links respectively.

**Impact:** direct match discovery is healthy, but the team/player entity graph
is weak on one of the strongest context pages.

**Confidence:** high for this sample. **Exists in:** production.

### P1 — sitemap partition reliability/alignment needs a controlled follow-up

**Evidence:** `/sitemap.xml` returns `200` and lists six match sitemap
partitions. `sitemap-matches-0001.xml` eventually returned `200` after about
90 seconds with 1,000 URLs; its first URL was the homepage and its last URL was
a `/cricket-match-report/` route. Repeated requests for other child partitions
timed out at 90–120 seconds from this audit environment.

**Impact:** sitemap reliability and canonical alignment cannot be scored with
high confidence. The observed non-`/cric-live/` entries require validation
against their canonicals before being called an error.

**Confidence:** medium. **Exists in:** production observation; root cause
unknown.

## Verified strengths

- `robots.txt` is available and references the sitemap; it blocks internal API,
admin, auth, private, search, facet, sort, and pagination crawl patterns.
- HTTP and bare-host requests redirect to `https://www.crickzen.com/`.
- Unknown-route handling returned `404`.
- Trailing slash and UTM/pagination variants of `/live-score` return a clean
canonical to `/live-score`; page query patterns are also blocked in robots.
- Discovery hubs have SSR-visible canonical match links, not only client-side
click handlers.
- The live indexing status endpoint returned `200` and reports GSC/indexing API
enabled with a daily budget. This proves capability, not indexing success.

## Structured-data and sharing evidence

Homepage, discovery hubs, canonical match pages, and tested child match routes
all emitted JSON-LD and Open Graph/Twitter metadata. The sampled player page
emitted neither JSON-LD nor social metadata. No external schema validator or
Search Console enhancement report was available in this audit.

## Performance, SSR, and mobile evidence

**Measured:** full SSR pages ranged from roughly 1.0–4.0 seconds in the sampled
requests. The two fallback match pages repeatedly took roughly 8.7–8.9 seconds.
The homepage, series hub, and players hub served 2.49 MB, 2.43 MB, and 1.68 MB
of raw HTML respectively.

**Risks, not confirmed CWV failures:** large SSR documents, live-update work,
third-party tags/ads, and selective SSR timeout/fallback behaviour can hurt LCP,
INP, and mobile data use. A real mobile browser/CWV trace is still required.

## Source-code facts and production/source mismatches

`apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts` defines
the canonical match catch-all and the standalone Match Intelligence route.
Production confirms the intended noindex Match Intelligence behaviour and
parent canonical policy on sampled child match routes.

No source-only conclusion is used to explain the match SSR shell failures; the
current deployment/runtime cause remains unverified.

## Assumptions and evidence gaps

- No authenticated Search Console performance, URL-inspection, coverage, or
Core Web Vitals data was available.
- Browser hydration was not inspected with a real mobile browser in this
read-only baseline.
- All six sitemap child partitions could not be downloaded reliably from this
environment; do not infer complete sitemap cleanliness or breakage.
- Archive lifecycle labels were not semantically parsed from every card. Its
SSR link surface is healthy, but completed-only correctness needs a separate
data-level sample.

## Commands and tools used

- `Audit-CrickzenSeoHealth.ps1` (read-only; stopped on a sitemap-child timeout)
- `Invoke-WebRequest` for production SSR and metadata samples
- `curl -I -L` for redirect/status checks
- repository route inspection with `rg`

## Controlled next gate

Stop here. The first implementation batch should address only the P0 match SSR
fallback family after logs and a reproducible SSR trace identify its shared
cause. Re-run this baseline sample before widening scope.
