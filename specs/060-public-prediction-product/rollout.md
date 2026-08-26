# Public Prediction Product - Implementation Checkpoint

Date: 2026-08-26

## Completed in the first slice

- Added the public-product route and host specification in this folder.
- Added a host-aware Angular public product component for the prediction landing page, methodology, history policy, creator packs, partners, media kit, developer proposal, share cards, and embeds.
- Reused the existing public model feed and freshness policy. Missing, stale, or invalid probabilities render as `Unavailable`.
- Added public share/embed metadata, attribution, disclaimer, canonical match links, and responsive layout.
- Added the `prediction.crickzen.com` to Angular SSR routing boundary while leaving `app.crickzen.com` on the operator/dashboard route.
- Added `scripts/seo/Test-PublicPredictionSurface.ps1` for repeatable SSR and boundary checks.

## Local proof

After the browser and SSR production builds, requests to the local SSR server with `Host: prediction.crickzen.com` returned:

- `200` for `/`, `/how-it-works`, `/creator-packs`, `/developers`, `/share/demo-slug`, and `/embed/demo-slug`.
- Public static pages self-canonicalized to `https://prediction.crickzen.com/...`.
- Share/embed pages returned `noindex,follow` and canonicalized to `https://www.crickzen.com/cric-live/demo-slug`.
- Prediction-host HTML did not contain Streamlit or operator-control text.
- `www.crickzen.com` root and `/matches` continued to return their existing canonical host and score-first content.

## Production rollout — 2026-08-26

- Built from an isolated `git archive HEAD` snapshot with only the public-prediction frontend overlays and the nine public SSR route patterns. Unrelated dirty worktree changes were excluded.
- Published `macubex/victoryline-frontend:20260826-public-prediction-r1` with digest `sha256:b541676d4b2806dfb756fe1932c1f4ed43ce572e12f7b41a604c93148af5198e`.
- Recreated only `victoryline-frontend`; it is running healthy. Backend and scraper images were not changed.
- Applied the server's current Caddyfile as a narrow patch: `app.crickzen.com` remains the operator/dashboard host and `prediction.crickzen.com` now proxies to `frontend:4000`. Caddy validation passed and the configuration was reloaded without restarting the proxy container.
- Production check `scripts/seo/Test-PublicPredictionSurface.ps1 -SiteUrl https://prediction.crickzen.com` passed. The public routes return `200`; static pages self-canonicalize to `prediction.crickzen.com`; developer/share/embed routes are `noindex`; share/embed canonicalize to the main match URL; and the public host contains no operator text.
- Rollback copies retained on the server: `.env.backup-20260826-public-prediction-r1` and `Caddyfile.prod.backup-public-prediction-20260826-public-prediction-r1`.

## Not yet complete

- The public v1 gateway, rate limits, CORS policy, structured API errors, and API contract tests are not live.
- TrueOdds verified pack manifests and public artifact storage are not yet connected to `/creator-packs`.
- `/history` is a publishing policy page until a complete reproducible audit dataset is selected.
- Prediction-host sitemap and robots ownership still need a production decision; the main sitemap must not silently become a duplicate host sitemap.
- The API gateway, TrueOdds public artifact path, real share-card slug canary, and publisher pack samples still need their own production gates.

The current result is an additive, production-live public shell, not evidence of Google indexing, rankings, traffic, backlinks, or business value.

## Public artifact library and real-match canonical gate — 2026-08-26

- Three fixed, verified TrueOdds sample packs are served read-only from `apps/frontend/src/assets/public-packs/`. Each includes an MP4, thumbnail, card JSON, report JSON, social caption, timed captions, and a public SHA-256 manifest.
- The production image `macubex/victoryline-frontend:20260826-public-artifacts-r2` was built from an isolated clean snapshot and pushed with digest `sha256:74ad197d2cc78de9dadeb4b672f337115f6ffb8f7f82be90976fd925f95a7d47`. Only the frontend was restarted; backend and scraper were not changed.
- Production downloads of all 21 manifest-referenced artifacts matched their recorded hashes. The public prediction surface guard passed.
- A real `KK vs TGC` share/embed canary returned `200`, `noindex,follow`, and the permanent canonical `https://www.crickzen.com/cric-live/kk-vs-tgc-qualifier-2nd-match-tamil-nadu-premier-league-2026-match-updates-12ZP`. The component now derives canonical match URLs from the source match URL instead of the public prediction slug.
- The future-pack TrueOdds adapter, public API gateway, sitemap ownership, automated manifest-hash test, and outreach pilot remain separate gates. This rollout proves technical delivery only.
