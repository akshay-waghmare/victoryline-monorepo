# Plan: Canonical Match SSR Integrity

**Date:** 2026-07-27  
**Scope:** `GET /cric-live/{slug}` only  
**Status:** Slice 0 and the bounded identity snapshot are deployed; lifecycle-complete snapshot work remains

## Outcome

Every valid canonical match URL returns a meaningful server-rendered document before hydration. The document remains useful when a live API is slow or incomplete; only truly invalid routes return a 404.

This phase protects the existing contract:

- `/cric-live/{slug}` is the stable, self-canonical match entity.
- Child tabs fold to the parent canonical under the existing policy.
- Match Intelligence remains `noindex,follow`.
- Browser hydration enhances a correct document; it does not create the first usable representation of the match.

## Implemented checkpoint — 2026-07-27

- `76a9f51` eliminates the bare Angular index-shell response when canonical match SSR reaches its deadline or render error. A valid `/cric-live/{slug}` receives a deterministic, indexable route fallback with its own title, description, canonical, robots, H1, breadcrumbs, hub links, and `SportsEvent` JSON-LD.
- `29bef5f` adds a bounded server-side snapshot enrichment step before that fallback is written. It reads only the existing match-info endpoint, has a 700 ms deadline and a short in-process TTL cache, and never waits for scorecard, commentary, player, or prediction data.
- The current enrichment is deliberately limited to data that is independently available and safe to display: series, scheduled time, venue, and toss. If that endpoint is slow or unavailable, the server still returns the deterministic route fallback rather than an empty shell.
- Response headers make the degradation visible without changing indexing semantics: `X-SSR-Fallback: canonical-match` and `X-SSR-Fallback-Level: snapshot|route`. Structured server logs include the reason, snapshot source, and total fallback time.
- `scripts/Assert-CanonicalMatchSsr.ps1` is the raw-HTML regression gate. It verifies HTTP 200, a minimum body size, title, self-canonical, robots, one H1, `SportsEvent` JSON-LD, and non-empty app root across a supplied canonical-URL set.
- A forced 1 ms SSR-timeout container test proved the snapshot branch includes series, venue, scheduled time, and toss. After deployment, the public Hundred and Bangladesh–Zimbabwe canonical URLs both returned HTTP 200, 9.6–9.8 KB documents, and `X-SSR-Fallback-Level: snapshot`.

This checkpoint is not a claim of complete lifecycle SSR. Score/result/target/status, real entity links, TransferState parity, invalid-slug 404 evidence, and the full fixture matrix remain in the later slices below.

## Confirmed baseline

Production is selective, not universally broken. A representative Hundred canonical page previously returned full SSR HTML, while other valid canonical pages repeatedly returned an approximately 8,115-byte Angular shell after 8.7–8.9 seconds. A fresh live Hundred probe still returned that shell with a generic title and no H1, canonical, robots directive, JSON-LD, or match identity.

The recently deployed `e1ae152` metadata fallback corrects the hydrated browser title. It cannot correct this server shell because the Angular SSR response has already fallen back before the component can render.

## Design principle

Separate three decisions that are currently too easy to collapse together:

1. **Route validity:** invalid slug → HTTP 404.
2. **Index policy:** valid canonical page → `index,follow`; intentional child surface → existing policy.
3. **Data completeness:** temporary upstream failure → a 200 SSR fallback with stable identity, canonical, lifecycle-aware metadata, visible H1, and honest stale/unavailable copy.

No temporary data failure may turn a valid canonical match into an empty 200 shell or an unavailable page.

## Release slices

### Slice 0 — Reproduce and instrument the shared SSR failure

- Trace the server request from `apps/frontend/server.js` through route resolution, `cricket-odds.component.ts`, match-info, last-updated-data, TransferState, and the SSR timeout/fallback path.
- Add bounded diagnostic timing for the canonical match SSR path: slug, resolver source, upstream request outcome, timeout/fallback reason, document state, and render duration. Do not log player/private data.
- Reproduce with two currently shelling canonical slugs and one known-good slug, using raw server requests rather than browser hydration.
- Identify whether the shared cause is an SSR timeout, an uncaught component failure, TransferState encoding, a blocked upstream request, or a route-state mismatch.

**Exit gate:** the failure has one evidenced shared cause and a minimal failing test or reproducible command.

### Slice 1 — Introduce a server-safe canonical match snapshot

- Define a small SSR snapshot contract sourced in priority order from: live state → stored/current match snapshot → schedule/catalogue record → route slug.
- Snapshot fields: canonical slug, teams, series, lifecycle/status, date/time, venue, score/result/target where known, and source freshness.
- Ensure the snapshot is resolved with a bounded deadline independent of non-essential scorecard, player-stat, commentary, or model calls.
- Store the resolved snapshot in TransferState so the client hydrates the same identity instead of replacing server metadata with a weaker state.

**Exit gate:** a delayed optional API still yields a complete SSR snapshot for a valid route.

### Slice 2 — Render a visible lifecycle-aware SSR summary

- Render one visible H1, breadcrumb hierarchy, match identity, lifecycle status, and an honest useful summary from the snapshot.
- Upcoming: teams, schedule, venue, and preview context.
- Live: score/balls/target/probability when available; otherwise identity plus “live data temporarily unavailable.”
- Completed: result/final scores when available; otherwise completed match context without invented details.
- Use existing real team and series href builders. Never emit fabricated entity URLs solely for SEO.

**Exit gate:** raw HTML remains meaningful for full, partial, and delayed-data cases.

### Slice 3 — Make head metadata and schema snapshot-driven

- Generate title, description, canonical, robots, Open Graph, Twitter metadata, SportsEvent, and BreadcrumbList from the same SSR snapshot.
- Retain the hierarchy already adopted for live titles: teams+series, teams-only, then generic valid-live fallback.
- Keep `EventInProgress`, completed, postponed, and unavailable schema/status consistent with visible copy.
- Preserve self-canonical `index,follow` for valid canonical routes even if a score request fails.

**Exit gate:** raw head and visible body agree for every lifecycle state.

### Slice 4 — Correct invalid-route and hydration behavior

- Define a real invalid-slug decision using route/catalogue evidence; return 404 only when the slug cannot be resolved after the fallback chain.
- Confirm a temporary backend timeout remains 200 with canonical fallback content.
- Confirm client hydration consumes TransferState first and never replaces a correct SSR title/canonical/H1 with unavailable metadata.

**Exit gate:** valid/temporary/invalid states have distinct HTTP and metadata outcomes.

### Slice 5 — Regression harness and controlled rollout

- Add a raw-SSR audit fixture matrix: upcoming, live innings one, innings break, chase, delay, completed, abandoned/no result, Hundred, international white-ball, Test, domestic, and women’s match.
- For each fixture assert status, title, description, one H1, canonical, robots, JSON-LD, visible identity, real links, body-size floor, and no app-shell-only response.
- Add repeated and concurrent request checks to catch intermittent shell fallbacks.
- Build from clean source, deploy frontend-only, then repeat production raw HTML and browser hydration checks before promoting the checkpoint.

## Explicit exclusions

- sitemap restructuring or entity-template remediation;
- major match-page redesign;
- new child-route architecture;
- full commentary/LiveBlogPosting implementation;
- broad performance/CWV programme;
- model or scraper contract changes beyond the minimal snapshot dependency.

## Acceptance criteria

| State | HTTP | Raw SSR requirement | Index policy |
|---|---|---|---|
| Valid upcoming/live/completed canonical match | 200 | title, description, self-canonical, robots, one visible H1, match identity, useful lifecycle summary, schema and real related links | `index,follow` |
| Valid match with temporary upstream failure | 200 | same stable identity/head; honest stale or unavailable message; no empty shell | `index,follow` |
| Intentional child route | existing response | parent/child policy remains unchanged | existing policy |
| Truly invalid slug | 404 | clear not-found page | `noindex`/404 behavior |

## Verification commands

Use raw requests as the primary gate, then browser hydration as the second gate:

```powershell
$html = (Invoke-WebRequest -UseBasicParsing -Uri "https://www.crickzen.com/cric-live/<slug>" -TimeoutSec 30).Content
[Text.Encoding]::UTF8.GetByteCount($html)
[regex]::Matches($html, '(?is)<h1[ >]').Count
[regex]::Matches($html, '(?is)rel=["'']canonical["'']').Count
[regex]::Matches($html, '(?is)name=["'']robots["'']').Count
[regex]::Matches($html, '(?is)application/ld\+json').Count
```

The release is not complete if a browser looks correct but raw HTML is still a shell.

## First implementation decision

Do not start by adding more visible SEO text. Start with Slice 0: capture the precise SSR timeout/fallback trace for one good and two shelling canonical URLs. The evidence determines whether the minimal repair belongs in server timeout handling, route-state hydration, or snapshot resolution.
