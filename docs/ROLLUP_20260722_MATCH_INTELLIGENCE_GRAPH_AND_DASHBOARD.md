# Match Intelligence graph and dashboard rollout — 2026-07-22

## Scope

- Remove repeated win-probability copy from the Match Intelligence card.
- Keep a first-innings probability timeline in innings one; add the second-innings lane only for an actual chase.
- Suppress unavailable metric cards instead of showing `--`, and do not show `RRR 0.00` in innings one.
- Publish the internal prediction dashboard at `https://prediction.crickzen.com`.

## Source release

| Component | Commit | State |
| --- | --- | --- |
| Match Intelligence chart and metric handling | `8101c7d` | Pushed to `origin/008-match-title-seo` |
| First-innings label correction | `c045348` | Pushed to `origin/008-match-title-seo` |
| Dashboard Caddy host configuration | `8101c7d` | Pushed to `origin/008-match-title-seo` |
| Schedule series-name parser | `6b745f4` | Pushed to `origin/008-match-title-seo` |
| Calibrated dashboard/model runtime | `0a25cd6`, `41256c4` | Pushed to `crickzen-pred/feature/ntb-t20-blast-model` |

The client now uses a positive target, runs-required value, or positive RRR to identify a chase. The public feed's first-innings `required_run_rate: 0` therefore no longer creates an innings-two chart or label. When the latest live-swing point is for the current score and over, its plotted probability is aligned with the current model probability so the chart does not finish at a stale percentage.

## Production state

| Surface | State | Evidence |
| --- | --- | --- |
| `https://prediction.crickzen.com` | Deployed | Caddy was recreated with the new host and returned HTTP 200. |
| Prediction dashboard runtime | Deployed | Image `machine_learning_bbl-dashboard@sha256:9bf48242668f…`; health check passed. |
| Live Match Intelligence predictions | Restored | Public feed returned calibrated ODI v2 predictions for GLCS–LEIC and GLM–Sussex, plus T20 predictions for Colombo Kaps–Jaffna Kings and Hong Kong–Tanzania. |
| Hundred model routing | Deployed | Runtime resolver returned `models/hundred_all_v1`; only Hundred URLs select this dedicated model. |
| Scraper schedule parser | Deployed | Image `macubex/victoryline-scraper:20260722-6b745f4`; health score 100 with five managed live matches. |
| Match Intelligence frontend image | Pending artifact build and rollout | Production is intentionally still on `macubex/victoryline-frontend:20260722-d73f105`; no unverified image was deployed. |

## Validation

- `npx tsc -p src/tsconfig.app.json --noEmit` passed after the final correction.
- The focused Angular test command is not usable on this legacy Angular runner with `--include`; the runner invocation without that flag exceeded the local command window before returning assertions.
- Two Docker build attempts (BuildKit and the legacy-builder fallback) stalled before creating an image. Docker Desktop's recovery then exposed `Wsl/Service/E_UNEXPECTED`; this is a local WSL/Docker runtime issue, not a production rollback.
- Production dashboard model artifacts were verified by loading them before release. The approved ODI v2 model is routed in production; the local v3 feature-pruned artifact remains an explicitly opt-in experiment and was not promoted.
- The malformed U19 series-name regression is covered by the parser test and the exact text now resolves to `India U19 Tour of Sri Lanka, 2026`. The reported U19 match had already rotated out of the live catalog by rollout time.
- Public Match Intelligence suppresses a live predictor until it has written a real state JSON, so startup rows no longer appear as blank `Awaiting model` cards.

## Remaining release gate

After Docker/WSL is healthy, build and push `macubex/victoryline-frontend:20260722-c045348`, switch only `FRONTEND_IMAGE` in the production `.env`, recreate only the frontend service, and verify the running image digest plus the public Match Intelligence page.
