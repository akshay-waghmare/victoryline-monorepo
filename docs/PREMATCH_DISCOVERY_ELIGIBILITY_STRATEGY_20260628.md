# Prematch Discovery And Eligibility Strategy

Date: 2026-06-28  
Repo: `C:\Users\ADMINS\Documents\projects\victoryline-monorepo`

## Executive conclusion

The May 26-29, 2026 lift was driven primarily by discovery breadth, not by CTR improvement on the same already-ranking URLs.

What the evidence says:

- Search Console `/cric-live/` page breadth expanded sharply during the spike.
- `pages with impressions` moved from `49` in the pre-spike window to `89` during the spike.
- `65` URLs were newly impression-earning during the spike window.
- Those newly surfaced URLs contributed `1,822 / 1,887` spike impressions and `86 / 92` spike clicks.
- CTR did not improve in the spike. It dropped from `7.51%` pre-spike to `4.88%` during the spike.
- Average position did not improve in the spike. It worsened from `6.29` to `10.01`.

Interpretation:

- The lift came from Google surfacing more match URLs.
- Event eligibility likely helped unlock that exposure, but it was not the main standalone mechanism.
- The post-spike drop happened because that discovery breadth did not hold.

## What we learned

### 1. Discovery created the upside

The traffic lift happened when more canonical match URLs entered Search visibility at once.

This means our highest-leverage system is:

- URL exists before start
- URL is in sitemap early
- URL is linked by real SSR hubs early
- URL has enough prematch content quality to be worth indexing

### 2. Eligibility amplified discovery, but did not replace it

The rise in valid event pages appears to have helped more match URLs become acceptable or trustworthy to Google.

But the GSC pattern shows:

- broader exposure
- lower CTR
- weaker average position

That is a breadth story, not a same-page quality or snippet win story.

### 3. Manual submission is an exception path, not the strategy

Manual submission may still help a tiny number of healthy, high-priority prematch URLs, but the preferred operating window is early rather than close to start time.

But if many URLs still need manual submission, that is usually a discovery-system problem:

- weak hub exposure
- weak sitemap freshness
- weak prematch eligibility
- weak URL-level observability

## Strategy

## A. Discovery strategy

The goal is for every strong upcoming canonical `/cric-live/{slug}` page to be discoverable roughly `30-120` hours before the match starts, with `24h` treated as the latest safe fallback rather than the primary target.

Required path:

1. Match appears in feed
2. Canonical page resolves `200`
3. Page enters sitemap partition with honest `lastmod`
4. Page is linked by one or more real SSR hubs
5. Page is visible to Googlebot before start
6. Page is monitored until indexed, impression-earning, or manually escalated

Priority surfaces:

1. `/cricket-schedule/today`
2. `/matches`
3. relevant series hub
4. homepage only when editorially justified
5. live-score hubs when that fit is semantically clean

Working rule:

- If a match page is technically fine but Google has not discovered it before start, treat that as a discovery failure.

## B. Eligibility strategy

The goal is for upcoming pages to be index-worthy and event-eligible before the match starts.

Minimum prematch eligibility contract:

- self-canonical
- `index,follow`
- exactly one `h1`
- useful title with teams plus match intent
- useful description with series plus match timing intent
- `Article` JSON-LD
- `BreadcrumbList` JSON-LD
- `SportsEvent` whenever `startDate` is known
- visible SSR support content for match info, scorecard, lineups, and related lifecycle links

Working rule:

- Do not drop `SportsEvent` just because venue is unknown.
- Omit weak fields. Do not omit the whole event when `startDate` is trustworthy.

## C. Operator strategy

Use manual submission only when all of these are true:

- page is healthy in raw HTML
- page is canonical and indexable
- page is in sitemap or strong SSR hubs
- page is still `unknown` or `discovered but not indexed`
- match start is near enough that delay matters

Otherwise:

- if page is unhealthy, fix product first
- if page is already indexed or impression-earning, monitor only

## Ranked remaining gaps

Ranked by impact on prematch discovery.

### P1. No authoritative per-URL discovery timeline

We still do not have a fully trustworthy per-URL record of:

- first seen in feed
- first seen in sitemap
- first seen in SSR hubs
- first submitted for indexing
- first indexed
- first impressions

Impact:

- hard to prove whether late discovery is feed delay, sitemap delay, hub delay, or Google delay

Current status:

- the operator dashboard now tracks dashboard-observed first-seen timestamps
- this is useful but still not authoritative historical submission telemetry

Recommendation:

- persist backend-side per-slug discovery telemetry
- expose it to the dashboard and incident tooling

### P1. Prematch discovery still depends too much on a few hubs

The system is stronger than before, but discovery breadth will still be fragile if only one hub reliably exposes upcoming URLs early.

Impact:

- one hub regression can collapse prematch discovery breadth again

Recommendation:

- make `/cricket-schedule/today` the primary positive-control hub
- ensure `/matches` and relevant series surfaces also expose real upcoming anchors
- keep negative-control checks so we know which hubs should and should not include upcoming links

### P1. Series surfaces are still underused for discovery

Series intent matters and can drive prematch traffic, but series enrichment is still lighter than it should be.

Impact:

- weaker discovery redundancy
- weaker semantic support for tournament-specific match pages

Recommendation:

- enrich `/series` and later series detail hubs with SSR links to high-priority upcoming matches
- keep the canonical match page stable

### P2. Manual submission still lacks a backend-side audit trail

The new dashboard queue helps operators know which 3-5 URLs matter, but we still do not have a durable server-side record of manual escalations.

Impact:

- hard to evaluate whether manual submission actually changed discovery timing

Recommendation:

- log and persist manual-submit actions with timestamp, slug, reason, and post-submit outcome

### P2. Eligibility verification is still sampled, not exhaustive

We have strong targeted proof, but not continuous large-sample validation of:

- `SportsEvent`
- H1 integrity
- title/description quality
- SSR support section presence

Impact:

- template regressions can slip through and hit breadth again

Recommendation:

- add recurring sampled audits across upcoming, live, and completed sets

### P3. Queue observability is stronger, but full live refresh still needs runtime validation

The new dashboard queue logic and tests are in place, but it should be verified in routine use with live credentials and production-scale refreshes.

Impact:

- low product risk
- moderate operator confidence risk

Recommendation:

- keep running the local dashboard against production and verify queue quality over several days

## Recommended daily KPI dashboard

These are the KPIs we should track every day for prematch SEO.

## Discovery KPIs

### 1. Upcoming URLs in discovery window

Definition:

- number of upcoming canonical match URLs in the next `12-24h`
- optional secondary bucket for `24-48h`

Why:

- establishes the prematch candidate pool

### 2. Percent in sitemap before start

Definition:

- `%` of discovery-window upcoming URLs present in match sitemap partitions before start

Target:

- `>95%`

### 3. Percent linked by SSR hubs before start

Definition:

- `%` of discovery-window upcoming URLs linked by at least one intended SSR hub

Track separately:

- schedule hub
- matches hub
- series hub
- homepage

Target:

- schedule hub should be near-complete for relevant same-day fixtures

### 4. Median hours from feed discovery to sitemap presence

Definition:

- time from `firstSeenInFeed` to `firstSeenInSitemap`

Target:

- near real-time

### 5. Median hours from feed discovery to hub exposure

Definition:

- time from `firstSeenInFeed` to `firstSeenInHubs`

Target:

- within the same operational cycle, not many hours later

### 6. Percent indexed before start

Definition:

- `%` of discovery-window upcoming URLs already indexed before scheduled start

This is the core prematch outcome KPI.

## Eligibility KPIs

### 7. Percent of upcoming pages with valid `SportsEvent`

Definition:

- sampled `%` of upcoming URLs where `SportsEvent` is present whenever `startDate` is known

Target:

- `100%` when `startDate` exists

### 8. One-H1 integrity rate

Definition:

- sampled `%` of match pages with exactly one `h1`

Target:

- `100%`

### 9. Prematch support-content completeness

Definition:

- sampled `%` of upcoming pages with visible SSR support for:
  - match info
  - scorecard
  - lineups
  - lifecycle links

Target:

- high and stable

## Search outcome KPIs

### 10. Pages with impressions in the prematch cohort

Definition:

- number of upcoming and newly live match URLs earning impressions

Why:

- best breadth signal

### 11. First-impression lag

Definition:

- time from feed discovery to first GSC impressions

Why:

- direct business measure of discovery speed

### 12. Query breadth for the prematch cohort

Definition:

- number of unique queries generating impressions for the prematch cohort

Why:

- rising breadth usually indicates discovery expansion

### 13. CTR and position only after discovery is healthy

Use CTR and average position as second-order quality metrics, not as the primary prematch discovery KPI.

Reason:

- the May spike proves breadth can rise while CTR falls

## Alert thresholds

Use these as simple operator rules.

- If upcoming URLs in the `12-24h` window are not in sitemap: alert
- If schedule hub loses upcoming SSR anchors: alert
- If `SportsEvent` disappears on sampled prematch URLs: alert
- If `indexed before start` rate drops sharply: alert
- If `pages with impressions` breadth drops while feed volume is stable: alert

## Practical operating playbook

### When discovery is weak

Check in this order:

1. page exists and is canonical
2. page present in sitemap
3. page linked by intended SSR hubs
4. page has usable prematch eligibility
5. operator queue contains only a tiny urgent subset

### When eligibility is weak

Check:

1. `SportsEvent`
2. H1
3. title and description
4. breadcrumbs
5. visible SSR support sections

### When manual submission volume starts rising

Treat it as a systems warning.

Manual-submit count should stay low. If it rises, investigate:

- sitemap freshness
- hub exposure
- template regressions
- feed lag
- Google-side delay only after product evidence is clean

## Strategy summary

The correct long-term strategy is:

- discovery first
- eligibility second
- manual submission third

In plain language:

- get more upcoming match URLs exposed early
- make those pages clearly index-worthy and event-eligible
- only manually push the tiny number of healthy urgent misses

That is the path most consistent with both the GSC evidence and the May 26-29 lift.
