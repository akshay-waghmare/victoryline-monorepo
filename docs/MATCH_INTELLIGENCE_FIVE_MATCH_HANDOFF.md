# Match Intelligence: Five-Match Handoff Contract

Updated: 2026-07-21

## Purpose

The local CrickZen stack selects five live matches for scraper coverage. Match Intelligence must consume that same selected slate, start one prediction process per selected match, publish the result through the model public API, and expose the same match-specific route through the frontend.

## Runtime contract

1. The scraper applies its bounded live-selection policy and stores the current managed URLs.
2. `GET http://localhost:5000/prediction-candidates` exposes those URLs as `scraper:selected` candidates.
3. The dashboard scheduler prefers that endpoint and falls back to CREX discovery only when the scraper contract is unavailable.
4. The dashboard container must use `AUTO_SCRAPER_URL=http://host.docker.internal:5000`; `127.0.0.1:5000` points to the dashboard container itself.
5. `AUTO_LEAGUE_KEYS=ALL` with `AUTO_EXCLUDE_LEAGUES=IPL` enables the non-IPL supported slate.
6. The service account `system:auto-scheduler` bypasses the interactive `MAX_USER_MATCHES=2` quota, while `MAX_TOTAL_MATCHES=6` remains the global safety cap.

## Format resolution

Known league URLs use their league preset. Generic white-ball URLs are classified as:

- T20, premier-league, and The Hundred markers -> generic `T20` combined model.
- ODI, one-day, CWC League, and World Cup League markers -> `ODI Male`, or `ODI Women` when women markers are present.

## Verification evidence

On 2026-07-21 the local stack verified:

- Scraper selected/managed: 5.
- Scraper endpoint candidate count: 5.
- Public model rows: 5.
- Model rows with `model_label` and fresh `updated_at`: 5.
- All five `/match-intelligence/{slug}` frontend routes returned HTTP 200.

The verified rows included TAN-W vs Namibia, DBS vs Durham, MIL-W vs W, VMK vs OAW, and Namibia vs Nepal. The exact slate is dynamic and may rotate as the scraper's live selection changes.

## Failure modes now documented

- Scraper count can be five while model rows are fewer when the scheduler independently scrapes CREX HTML; this is a source-of-truth mismatch.
- A healthy dashboard can still be on an old image. Rebuild/recreate `crickenzen-dashboard` after model dashboard source changes.
- A dashboard container using `127.0.0.1:5000` cannot reach the host scraper.
- The scraper backend circuit breaker can temporarily clear the selected slate; restart the scraper only after backend readiness is restored, then verify `/prediction-candidates` before judging prediction coverage.
- A public candidate row without `model_label` is not a completed prediction attachment; require fresh model output and a working frontend route.

## Operator verification

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:5000/prediction-candidates
Invoke-RestMethod http://127.0.0.1:8000/api/public/matches
Invoke-WebRequest http://localhost:8080/match-intelligence/<slug>
```

The acceptance condition is `selected_count == model_row_count == frontend_route_200_count`, with fresh `updated_at` values and no fallback-only rows.
