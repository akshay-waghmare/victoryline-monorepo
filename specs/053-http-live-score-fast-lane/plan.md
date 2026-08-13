# Implementation Plan: Low-resource HTTP Live Score Fast Lane

**Branch**: `053-http-live-score-fast-lane` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Architecture

```text
selected live slate (max 3)
          |
          +--> normal browser scraper (discovery, localStorage, sC4, commentary, player data)
          |                 |
          |                 +--> Redis localStorage snapshot
          |
          +--> HTTP sV3 lane (only if snapshot complete)
                            |
                            +--> existing live-patch mapper --> backend/websocket --> hero/cards
```

The HTTP lane never owns rich data and never creates a browser. It is an optional, bounded delta source beside—not instead of—the normal scraper.

## Phases

1. Add settings and observability with default-disabled feature flags.
2. Implement a single-client `HttpSv3PollService`, keyed only by the selected live slate.
3. Gate each match on complete Redis localStorage; reuse the existing patch mapper.
4. Add rate budget, jitter, adaptive interval, and host circuit breaker. No proxy rotation or stealth dependency.
5. Keep/reassert 45-second full-scrape fallback and selected-slate cancellation.
6. Run focused unit/runtime tests and a no-browser local probe.
7. Build an image, then use a production 15-minute scraper-only canary with immediate rollback on any gate failure.

## Configuration contract

| Setting | Initial value | Purpose |
| --- | ---: | --- |
| `ENABLE_HTTP_SV3_FAST_LANE` | `false` | Explicit rollout flag |
| `HTTP_SV3_BASE_INTERVAL_SECONDS` | `5` | Conservative idle polling |
| `HTTP_SV3_ACTIVE_INTERVAL_SECONDS` | `3` | Short interval after a real change |
| `HTTP_SV3_FALLBACK_SCRAPE_SECONDS` | `45` | Maximum gap before normal full scrape |
| `HTTP_SV3_MAX_REQUESTS_PER_MINUTE` | `40` | Host-wide budget, leaves headroom below 3x/5s=36 rpm |
| `HTTP_SV3_BREAKER_FAILURE_THRESHOLD` | `3` | Opens on block/error burst |
| `HTTP_SV3_BREAKER_COOLDOWN_SECONDS` | `300` | Fail-closed cooldown |

## Verification and rollout gates

- Local: no persistent pages, changed-only patching, identity fail-closed, and all breaker scenarios pass.
- Runtime: a direct feed is fetched through one async client; three selected matches create no Playwright contexts.
- Production: enable only the HTTP flag, keep persistent pages disabled, observe at least 15 minutes.
- Abort/rollback if: any `403`/`429`, host breaker opens, any normal scrape failure, health not `healthy`, PIDs grow materially beyond the stable baseline, coverage below 3/3 eligible selected matches, or public timestamps do not advance.

## Rejected alternatives

- Separate persistent Chromium browser: failed production gate due resource contention.
- Shared persistent browser: normal recovery can close the fast lane.
- Scrapling as the primary client: adds a Python 3.10+ dependency and does not improve the already-working JSON contract. Evaluate only as an isolated future fallback if direct HTTP begins being rejected.
