# Selective Canonical Match SSR Completion — Root-Cause Follow-Up

**Date:** 2026-07-28
**Status:** root cause identified with production + source evidence. No code was
modified. This is the narrow follow-up to the P0 thin-SSR finding in
`baseline-audit-2026-07.md`; it does not reopen the whole phase.

## Question

Why do MIL vs SB and BAN vs ZIM not reach the same bounded snapshot path as
healthy matches (PAK vs WI, AUT vs ROM)?

## Answer (verified)

**They do reach the snapshot path.** The failing matches have valid snapshots
and the fallback they serve is the `snapshot`-level shell. What they never reach
is the **full Angular Universal render**, because a client-intended
player-stats retry timer keeps the server render zone unstable until the 8 s
render timeout fires.

### Failure chain (end-to-end)

1. `server.js:534-601` receives `/cric-live/{slug}`; snapshot prefetch
   (`fetchCanonicalMatchSnapshot`, server.js:294-337) succeeds in ~0.7 s.
2. Angular Universal render starts (`res.render('index', ...)`, server.js:574).
3. `CricketOddsComponent.ngOnInit` → `fetchCricketData`
   (cricket-odds.component.ts:376) → `resolveRouteMatch` (1243) →
   `fetchPlayerStatsForMatch` (1268 → 1334).
4. `GET /api/crawler/player-stats/match?url={slug}` returns **404** for these
   matches (no player-stats record).
5. `getPlayerStatsMatch` catchError (cricket-odds.service.ts:382-387) converts
   the 404 to `of(null)` (no cache present on server).
6. Component success handler (cricket-odds.component.ts:1354-1365) sees `null`,
   sets `playerStatsError = true`, and calls `schedulePlayerStatsRetry`
   (1364 → 1375).
7. `schedulePlayerStatsRetry` (1375-1384) schedules `setTimeout(..., 3000 *
   attempt)` — retry 1 at 3 s, retry 2 at 6 s, retry 3 at 9 s. These are
   zone-tracked macrotasks.
8. Angular Universal cannot reach stability while macrotasks are pending, so
   serialization never completes.
9. At `SSR_RENDER_TIMEOUT_MS = 8000` (server.js:23), `fallbackTimer`
   (server.js:563-572) fires → `sendSsrFallback(..., 'timeout')` →
   `buildCanonicalMatchFallbackHtml` (server.js:375-438) emits the ~10 KB shell
   using the valid prefetched snapshot (H1, canonical, meta description,
   1 SportsEvent JSON-LD block).
10. Response headers: `X-SSR-Fallback: canonical-match`,
    `X-SSR-Fallback-Level: snapshot`, `X-SSR-Lifecycle: live|completed`.

Healthy matches take the same path but step 4 returns **200 with teams**, so no
retry is scheduled, the zone stabilises, and the full 288-727 KB render
completes in 2-4.8 s.

## Production evidence

### Determinism (3 attempts each, same session)

| URL | Attempt timings | Result |
|---|---|---|
| `mil-vs-sb-...-ZKD` | 8.9 / 8.7 / 8.7 s | FALLBACK 10,051 B every time |
| `ban-vs-zim-...-12AN` | 8.7 / 8.7 / 8.7 s | FALLBACK 9,980 B every time |
| `aut-vs-rom-...-138I` | 3.5 / 2.3 / 2.1 s | full 288,023 B every time |

Byte-identical fallback sizes and identical timings across attempts prove this
is deterministic per match, not load- or cache-flake-driven.

### Fallback headers (failing matches only)

- MIL vs SB: `X-SSR-Fallback: canonical-match`, `X-SSR-Fallback-Level: snapshot`,
  `X-SSR-Lifecycle: live`
- BAN vs ZIM: `X-SSR-Fallback: canonical-match`, `X-SSR-Fallback-Level: snapshot`,
  `X-SSR-Lifecycle: completed`

`X-SSR-Fallback-Level: snapshot` confirms the snapshot was valid — the failure
is downstream of snapshot creation, in the full render.

### Direct endpoint timing probes (all four matches)

| Endpoint | MIL vs SB | BAN vs ZIM | PAK vs WI | AUT vs ROM |
|---|---|---|---|---|
| `canonical-match-snapshot?slug=` | 0.95 s 200 | 0.72 s 200 | 0.71 s 200 | 0.70 s 200 |
| `match-info/get?url=` | 0.83 s 200 | 0.69 s 200 | 0.72 s 200 | 0.71 s 200 |
| `sC4-stats/get?url=` (scorecard) | 0.84 s 200 | 0.71 s 200 | 0.70 s 200 | 0.70 s 200 |
| `last-updated-data?url=` | 1.10 s 200 | 404 (handled) | 0.96 s 200 | 404 (handled) |
| **`crawler/player-stats/match?url=`** | **404** | **404** | **200 (21 KB)** | **200 (68 KB)** |
| `crawler/player-stats/match?externalMatchKey=` | 404 | 404 | 404 | 404 |

Every endpoint is fast. The **only** response that differs between failing and
healthy matches is player-stats: 404 for MIL vs SB and BAN vs ZIM, 200 for
PAK vs WI and AUT vs ROM. That single difference maps exactly onto the retry
branch in source.

## Ruled-out classes (from the likely-failure list)

| Suspected class | Verdict | Evidence |
|---|---|---|
| Competition metadata shape (Hundred vs Test/T20) | Ruled out | No format branching exists in the SSR data path (`fetchCanonicalMatchSnapshot`, `last-updated-data`, `match-info/get` are format-agnostic). Format only affects match-intelligence chart axes and prediction holdout (`prediction-format-eligibility.ts:2-9`). AUT vs ROM (T20) renders fully while BAN vs ZIM (T20) fails; format is not the discriminator. |
| Missing team/series fields | Ruled out | MIL vs SB snapshot has `series` present, BAN vs ZIM has `series: null` — one of each fails. PAK vs WI has `series: null` and renders fully. |
| Older match record format | Ruled out | Snapshot `source: "stored-match-record"` for all four; all snapshots valid. |
| Endpoint timeout before snapshot resolution | Ruled out | Snapshot endpoint answers in 0.70-0.95 s for all four; the 700 ms snapshot timeout is never hit. |
| Optional calls still blocking render | **Confirmed — this is the cause** | The player-stats retry `setTimeout` chain (3 s/6 s/9 s) keeps the zone busy past the 8 s render timeout. |
| Cache key mismatch | Ruled out | Snapshot cache is keyed by slug and hits for all four (fallback level is `snapshot`, not `route`). Deterministic behaviour across attempts also argues against cache flakiness. |
| Lifecycle resolver failing for some states | Ruled out | `X-SSR-Lifecycle` is correct on the failing shells (`live` for MIL vs SB, `completed` for BAN vs ZIM); lifecycle derivation (server.js:339-373) works. |
| Serializer returning Angular shell after exception | Ruled out | Fallback reason is `timeout`, not `render-error`; the shell is the purpose-built canonical fallback (server.js:375-438), not a crashed render. |

## Where the bug lives (source)

- Retry scheduling, never gated for server:
  `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts:1375-1384`
  (`schedulePlayerStatsRetry` uses raw `setTimeout` with no platform check).
- Retry trigger on null data:
  `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts:1362-1365`.
- 404-to-null conversion:
  `apps/frontend/src/app/cricket-odds/cricket-odds.service.ts:382-387`.
- Render timeout that converts the stall into the thin shell:
  `apps/frontend/server.js:23` (`SSR_RENDER_TIMEOUT_MS = 8000`), fired at
  `server.js:563-572`.

Contrast: the live-score WebSocket block in the same component **is** correctly
browser-gated (`if (this.isBrowser())`, cricket-odds.component.ts:426). The
player-stats retry is the only un-gated server-side timer in this path.

## Fix direction (minimal, low blast radius)

Gate the retry for SSR. Any one of these is sufficient; the first is smallest:

1. In `schedulePlayerStatsRetry`, return early when `!this.isBrowser()` (server
   platform) — a 404 on the server then resolves as `playerStatsError = true`
   with no pending timer, letting the zone stabilise and the full render ship.
2. Alternatively, skip `fetchPlayerStatsForMatch` entirely during SSR and let
   the browser hydrate stats client-side (consistent with the WebSocket gate).
3. Keep `SSR_RENDER_TIMEOUT_MS = 8000` unchanged; with the retry gated, healthy
   and currently-failing matches should both complete in the 2-4.8 s band.

Do **not** raise the 8 s timeout to accommodate the retry chain — that would
only delay the thin shell, not remove it, and would worsen crawler latency.

## Acceptance check for the fix

After gating, MIL vs SB and BAN vs ZIM must return full SSR: visible match
identity, correct title, description, self-canonical, `index,follow`, visible
H1, lifecycle summary, team/series text, crawlable links, and the required
schema types present and matching visible content (SportsEvent, BreadcrumbList,
WebPage — plus the other types the full template emits), with response time
materially below 8.7 s (target: the 2-5 s band of healthy matches).

## Follow-ons tracked separately (not part of this fix)

- Smoke-check sampling gap: add one recently-problematic competition/format,
  one upcoming, one live, one completed, one invalid slug, and rotate one
  canonical from production inventory; detect thin responses by missing match
  H1/canonical/team identity/SportsEvent/lifecycle content, with byte size as
  a warning signal only.
- `/live-cricket-score` policy decision (consolidate via 301 to `/live-score`
  preferred, unless intent is genuinely distinct).
- Entity metadata for `/teams`, `/players`, team/player/series profiles after
  the selective-SSR fix.
- Match Intelligence links must point to the standalone
  `/match-intelligence/{slug}` route; the nested
  `/cric-live/{slug}/match-intelligence` pattern 404s and must not be generated.
