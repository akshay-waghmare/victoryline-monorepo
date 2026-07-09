# Spec 044 Implementation Status

Updated: 2026-07-10

## Completed In This Checkpoint

- Added the `/match-intelligence/:slug` frontend route and SSR route allowlist.
- Added the match intelligence page shell with loading, unavailable, lifecycle, freshness, and model-output states.
- Added frontend data loading for match metadata, match snapshot data, and the model public prediction feed.
- Added model prediction proxying through `/prediction-api` to the dashboard service.
- Added local Docker configuration for the dashboard service at `host.docker.internal:8000`.
- Added route-to-canonical-match resolution, including full-name to abbreviation matching such as `gibraltar-vs-romania` to `gib-vs-rom`.
- Added a public-model fallback when the scraper catalog has not yet registered the match.
- Added SSR model access through the frontend server proxy so model output appears in server-rendered HTML.
- Added model output merging for win probability, projected score, insight text, score, overs, batting team, bowling team, and update time.
- Verified the local Docker stack with the real dashboard prediction service.

## Runtime Proof

Verified URL:

`http://localhost:8080/match-intelligence/gibraltar-vs-romania`

The rendered page contains:

- `38%` win probability
- `Projected 160`
- `GIB projection is 160 runs below the venue average.`
- no `Loading match intelligence` state
- no `Model unavailable` fallback

The model service was verified on port `8000` through its health endpoint and public matches endpoint.

## Remaining Work

- Confirm the dashboard service startup is included in the supported local-stack startup workflow instead of relying on an already-running port `8000` process.
- Add focused unit tests for route matching, abbreviated team matching, model merge behavior, and SSR-relative model URL behavior.
- Complete the richer explanation modules: model factors, confidence/uncertainty explanation, score-state context, and scenario/calculator surfaces.
- Complete and verify the remaining Spec 044 analytics events against real traffic: `intelligence_cta_impression`, `prediction_view`, `prediction_interaction`, and `model_unavailable`.
- Run the SEO indexing gate on the deployed intelligence route and make the eventual sitemap inclusion decision from evidence.
- Connect deeper backend/model outputs from the canonical model repo and the video-studio intelligence extraction repo beyond the current public prediction payload.
- Run a production-safe rollout and verify the public route, canonical, indexing policy, and model freshness in the deployed environment.

## Commit Scope

This checkpoint commits only Spec 044 intelligence/model integration and its documentation. Existing unrelated worktree changes remain unstaged.
