# Feature Specification: Low-resource HTTP Live Score Fast Lane

**Feature Branch**: `053-http-live-score-fast-lane`
**Created**: 2026-08-13
**Status**: Implemented locally; image build and production canary pending
**Input**: Replace unsafe persistent-browser interception with a bounded direct HTTP `sV3` lane for the selected live matches, while preserving browser-derived identity and rich match data.

## Problem statement

The existing persistent-page fast lane produces timely `sV3` pushes, but it requires long-lived Chromium contexts. Its production safety gate failed: isolated browsers raised process use from roughly 115 to 209 PIDs on the two-CPU host and normal scraping degraded before three matches could remain covered. The production baseline is therefore three managed matches with persistent pages disabled.

CREX `getSV3` was verified from the production egress as a public JSON feed for all three selected matches. It contains the score, recent-ball, current event, odds, session odds, and format fields already accepted by `CricketDataService.push_immediate_sv3()`. It does not replace the browser's richer scorecard, player, commentary, venue, or identity work.

## Decision

Use a single shared `httpx.AsyncClient` to poll the direct `sV3` endpoint only for the hard-selected live slate. The HTTP lane sends changed, merge-safe patches through the existing backend contract. The normal browser scrape remains the authority for discovery, lifecycle reconciliation, localStorage identity mapping, scorecard enrichment, player/lineup data, and a 45-second correctness fallback.

No persistent live browser pages are started by this feature.

## User scenarios & testing

### User Story 1 — Timely, low-resource live score (Priority: P1)

As a live-score viewer, I receive current score, ball, over, odds, and recent-over changes within a bounded interval without the scraper creating persistent Chromium pages.

**Independent test**: Feed two distinct `sV3` fixtures into the HTTP lane. Assert each changed response uses the existing immediate-patch mapper, while unchanged responses do not produce a backend push.

### User Story 2 — Human-readable identity is preserved (Priority: P1)

As a viewer, I continue to see full team and favourite-team names rather than CREX internal codes.

**Independent test**: Start an HTTP lane with an incomplete localStorage snapshot. Assert it is not eligible to push. Add a complete snapshot and assert the same `sV3` payload is pushed with decoded team identity.

### User Story 3 — Rich data remains correct (Priority: P1)

As a viewer, I retain scorecard, commentary, lineup, player, venue, and lifecycle information while fast score patches run.

**Independent test**: Verify direct `sV3` uses only the existing merge-patch endpoint and that the normal full-scrape scheduling still submits a selected match after its 45-second fallback interval.

### User Story 4 — CREX egress is protected (Priority: P1)

As an operator, the scraper avoids turning the production IP into an aggressive polling client and fails closed on rate limiting or blocking.

**Independent test**: Simulate `429`, `403`, malformed JSON, and repeated timeout responses. Assert exponential backoff, per-host circuit opening, no immediate patches while open, and fallback scraping remains available.

## Functional requirements

- **FR-001**: The HTTP fast lane MUST use the existing selected live-match set; production cap remains `MAX_LIVE_MATCHES=3`.
- **FR-002**: It MUST use one reusable async HTTP client and MUST NOT create a persistent Playwright page or context.
- **FR-003**: A match is eligible only after a complete cached localStorage mapping exists for team full and short names. Missing mappings MUST fail closed to normal scraping.
- **FR-004**: It MUST reuse `CricketDataService.push_immediate_sv3()` and send only a changed payload, preserving backend merge behavior and stale-regular-push protection.
- **FR-005**: The normal scraper MUST retain responsibility for live discovery, localStorage refresh, scorecard/sC4, commentary, player stats, venue, playing XI, lifecycle reconciliation, and a full live scrape at least every 45 seconds.
- **FR-006**: Polling MUST begin conservatively at five seconds per eligible match, with independent jitter. A shorter 2–3 second interval is allowed only while a recent score change is observed and the per-host rate budget permits it.
- **FR-007**: The host-wide request budget, not per-match workers, MUST limit all direct `sV3` traffic. No catch-up burst is allowed after a delay.
- **FR-008**: Any `403`, `429`, CAPTCHA-like/non-JSON response, or configured timeout/error burst MUST open a host circuit breaker, stop direct polling, and back off exponentially with jitter. It MUST never rotate proxies or attempt to bypass upstream access controls.
- **FR-009**: Health output MUST report HTTP-lane enabled state, eligible/covered matches, client errors, circuit state, last successful fetch, and observed request rate.
- **FR-010**: The HTTP lane MUST be separately feature-flagged and default disabled until the production gate passes. Persistent-page mode remains disabled.

## Data ownership contract

| Data | Owner | Behaviour |
| --- | --- | --- |
| Score, recent balls, event, over, odds, session odds, format | HTTP `sV3` lane | Changed values pushed immediately through existing patch mapper |
| Team-code/favourite-code decoding | Redis localStorage cache | Captured/refreshed by normal browser scrape; required before HTTP patching |
| Scorecard, dismissals, batsmen, bowlers | Browser/sC4 path | Normal scrape/fallback remains authoritative |
| Commentary | Browser `getBallFeeds` path | Existing schedule unchanged |
| Playing XI, venue, series, player names | Browser/info and iV4 paths | Existing cache/enrichment ownership unchanged |
| Discovery and lifecycle | Normal scraper | Selected slate remains the single source of truth |

## Edge cases

- A match with a valid API key but no complete identity cache stays on normal scraping only.
- A direct response may omit `v`; the existing mapper derives the over from `rb`.
- Toss delay or innings break uses the conservative interval and still receives normal lifecycle/full-scrape coverage.
- A direct feed schema change, HTML response, or block response opens the host breaker; no partial/raw-code patch is sent.
- A normal scrape failure does not trigger a direct-request burst.
- A match leaving the selected live slate is cancelled immediately and its HTTP state is cleared.

## Success criteria

- **SC-001**: With three selected matches, the HTTP lane adds no persistent pages and does not materially increase scraper PID count from the stable baseline.
- **SC-002**: 100% of enabled HTTP patches have complete decoded identity or are skipped.
- **SC-003**: 100% of `429`/`403`/block simulations stop immediate direct polling and leave the browser fallback operational.
- **SC-004**: Focused unit tests cover changed/unchanged responses, identity readiness, interval/jitter, circuit breaking, selection removal, and fallback scheduling.
- **SC-005**: Before production enablement, a 15-minute gate proves three eligible matches, zero normal scrape failures, stable restarts/PIDs, no block signals, and advancing public match timestamps.
- **SC-006**: Production rollback is one scraper-only configuration change: disable the HTTP lane; no backend/frontend rollback is required.
