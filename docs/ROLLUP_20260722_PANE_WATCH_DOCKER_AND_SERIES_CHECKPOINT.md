# CrickZen pane coordination, Docker cleanup, and homepage series checkpoint — 2026-07-22

## Verified state

- The concurrent work is split into three coordination lanes: `Hundred + Prediction Models`, `Frontend + Series Surfaces`, and `Backend Live-Catalog Recovery`.
- The VictoryLine release boundary is frontend/scraper checkpoint `d73f105`, deployment hardening `3de0608`, and backend live-catalog correction `631a861`.
- The model repository contains Hundred implementation `32f4d27`, calibrated live routing `0a25cd6`, and pending-prediction suppression `41256c4`.
- The Hundred model remains shadow-only for promotion decisions even though the dedicated resolver path exists. Production promotion still requires the frozen evaluation gates and a real Hundred fixture verification.

## Docker maintenance

Docker Desktop recovered and reported seven running containers. Unused images and build cache were pruned without removing volumes:

- Images reduced from `22.35 GB` to `18.97 GB`.
- Build cache reduced from `8.561 GB` to `2.593 GB`.
- Approximately `9.35 GB` reclaimed.
- Frontend, backend, scraper, dashboard, Caddy, Redis, and PostgreSQL remained healthy.

## Homepage series finding

The strip above homepage match cards is not a dedicated popularity/latest-series feed. It is derived from match-card arrays in `live → upcoming → recent` order and truncated to six unique names. The production result included `W T20I in Namibia 2026`, `PPL 2026`, `Maharani T20 2026`, `LPL 2026`, `England One Day Cup 2026`, and `The Hundred W 2026`.

The next frontend slice should introduce a ranked current-series selector based on active/live and upcoming fixtures, deduplicate related men/women variants where appropriate, and provide specific series destinations. Current chips point to `/series` and use a client-side homepage filter, which is not yet the intended series discovery experience.

## Coordination rule

No deployment or broad cleanup is safe while a pane owns overlapping files. Use the `crickzen-pane-watch` skill to inventory branches, dirty paths, ownership, tests, and production evidence before integration.

## Remaining gates

1. Confirm Pane 3's backend production verification after `631a861`.
2. Decide and implement the homepage current-series ranking as a narrow frontend slice.
3. Verify Hundred model routing on a real local and production Hundred fixture before any promotion claim.
4. Keep local auth databases and generated training datasets outside source commits unless explicitly packaged as release artifacts.
