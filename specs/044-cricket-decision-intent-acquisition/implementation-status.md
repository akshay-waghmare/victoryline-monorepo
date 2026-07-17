# Spec 044 Implementation Status

Updated: 2026-07-13

## Completed In This Checkpoint

## Intelligence Surface Upgrade

- Added safe public metrics for innings, CRR/RRR, expected final, venue average, resources, resource win probability, par pace, pressure, and probability swings.
- Added metric cards, probability timeline, expected-final versus venue comparison, resource/pace comparison, pressure, and momentum modules to Match Intelligence.
- Added an explicit `Bowling` metric card beside `Batting`, sourced from the public model payload rather than inferred from the route title.
- Upgraded the expected-final versus venue module from a number-only comparison to a bounded proportional bar chart, using one shared maximum so the visual relationship remains honest across formats and venues.
- Added formula/source notes beside the visual modules so public users can interpret the model outputs.
- Added model-side payload tests for safe metrics, timeline points, and unavailable states (`5 passed` in the predictor repository).
- Added a public-safe `reasons` array to the model serializer. Reasons are short, number-backed explanations derived from expected final, venue average, score vs par, run rate, and pressure; raw model features remain excluded.
- Added a Match Intelligence "Model factors" module that renders up to three serializer-backed reasons instead of relying only on frontend-generated copy.
- Added a public-safe confidence and uncertainty module that distinguishes unavailable, stale, balanced, moderate, and pronounced signals without presenting probability as certainty.
- Added a collapsible metric glossary covering CRR, RRR, expected final, projected score, venue average, score vs par, resources, resource WP, and calibrated model probability.
- Added focused frontend coverage for upcoming/live/completed lifecycle classification, abbreviation-to-full-name route matching, and bounded/empty probability timeline data.
- Added a public-safe explanation pack based on the trueodds-video-studio shape: venue behaviour, toss readiness, expected score/wickets, turning point, and probability swing.
- Added a Manhattan/Worm analysis module that connects public update-level probability points without pretending to have ball-by-ball history.
- Added a capped public `prediction_history` derivative so the same chart can show expected-final/projected-score movement over time alongside the probability worm.
- Added automated dashboard startup, rendered CREX discovery, Test-match exclusion, and format-aware routing so current white-ball matches start without a hand-maintained URL list.
- Added a clean-start local launcher mode that removes only stale Crickzen dashboard/predictor processes before rediscovery, preventing old IPL/ODI rows from surviving into a new local session; the launcher now probes the frontend root for readiness.
- Updated live predictor history to record expected-final and projected-score values from the same inference feature snapshot used for the current prediction.
- Connected the analytics service to standard `gtag`, `dataLayer`, and DOM-event sinks; provider-less local and SSR execution remains safe.
- Added the missing `intelligence_cta_impression` trigger to Match Intelligence alongside `prediction_view`, with lifecycle, match path, capability tier, and CTA properties; browser-only analytics remains intentionally absent from SSR HTML.
- Added the named `intelligence_cta_click` event alongside the existing `alert_cta_click` compatibility event; browser verification captures both on the relationship CTA.
- The supported clean launcher was rerun without manual match URLs; automatic discovery produced a live `ODI all-gender v2` row with numeric probability, score, overs, and a fresh timestamp. The current source slate did not expose a second eligible T20 row during this check.
- Hardened rendered CREX discovery to use DOM-content readiness with network-idle as an optional best-effort wait; this prevents long-lived analytics/live connections from silently suppressing rendered candidates. Focused scheduler/model contract suite remains `15 passed`.
- Fixed the rendered-discovery root cause: `_browser_executable()` referenced `get_settings()` without importing it, causing the exception handler to return an empty rendered page and drop browser-only T20 cards. Added a regression test; focused scheduler/model suite is now `16 passed`.
- Added a rendered Shpageeza-style T20 fixture regression; the automatic discovery/model suite is now `17 passed`, including league classification, live detection, Test exclusion, and browser resolution.
- Hardened lifecycle detection so completed CREX cards containing score-shaped text such as `161/5 18.0` are not treated as live when the card also says `Won`, `Final`, or another completion state. The focused scheduler/model suite is now `18 passed`.

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

## Fresh SSR Audit - 2026-07-13

- Rebuilt the frontend image with the Match Intelligence model-factor template and recreated the frontend container.
- ODI route SSR contains the expected-final module, probability timeline, no loading state, and no unavailable state.
- T20 route SSR contains the expected-final module, probability timeline, no loading state, and no unavailable state.
- The public model feed currently exposes `ODI all-gender v2` and `T20 all-gender v2` for active model rows.
- After restarting the dashboard and starting real ODI and T20 predictions, `/api/public/matches` exposes non-empty, numeric-backed `reasons` for both model rows.
- ODI SSR includes the `Why the signal leans this way` module. After recreating the frontend container to clear the SSR cache, the canonical T20 route also includes `T20 all-gender v2` and the model-factors module.
- Homepage boundary check: no changed file path contains `home` or `homepage`.
- Fresh direct Docker rebuild completed successfully after the glossary change; the recreated frontend container is healthy.
- Fresh ODI and T20 SSR samples both contain the model summary, model-factors explanation, metric glossary, formula text, probability timeline, canonical, and `noindex,follow` policy.
- Fresh ODI and T20 SSR samples also contain the Match Briefing explanation pack and the Manhattan/Worm chart.
- Fresh T20 SSR verification now contains the expected-final comparison bar markup alongside `T20 all-gender v2`, with no loading state and the route still marked `noindex`.
- After a clean dashboard restart, the live public feed exposed both `ODI all-gender v2` (`Nepal vs JSY`) and `T20 all-gender v2` (`AMO vs MAK`) with numeric probability, score, overs, and fresh update timestamps. Both canonical Match Intelligence SSR routes returned model summary, confidence module, model reasons, expected-finish bars, no loading state, and `noindex`.
- Browser verification on a live T20 route confirms model summary, briefing, worm chart, no horizontal overflow at 390px, and `T20 all-gender v2` in the rendered surface.
- Browser event verification now captures `prediction_view`, `intelligence_cta_impression`, `explanation_expand`, `prediction_interaction`, and `alert_cta_click` on a live ODI route; an unavailable route captures `model_unavailable`. Mobile T20 verification reports body width `390px` against a `390px` viewport with model and confidence content visible.
- Added `analytics-runtime-evidence-2026-07-13.md`, documenting the configured GA4 destination, browser event evidence, and the still-open DebugView/real-traffic gate.
- Re-audited `trueodds-video-studio`: its venue/player intelligence data and prematch/post-match pack schemas are now recorded as reusable enrichment inputs, while stale IPL-only facts remain deliberately excluded from the generic T20/ODI public route.
- Corrected stale-data copy so an old timestamp is distinguished from a missing timestamp in the public freshness label.
- The new reason field is covered by model serializer tests, present in the running public feed, and visible in both ODI and T20 SSR samples.

## Remaining Work

- Verify the clean-start launcher in a fresh Windows session and document the dashboard startup command for production-safe local operations.
- Add focused unit tests for route matching, abbreviated team matching, model merge behavior, and SSR-relative model URL behavior.
- Complete the richer explanation modules: model factors, confidence/uncertainty explanation, score-state context, and scenario/calculator surfaces.
- Add a focused frontend browser-test run for the bounded comparison mapping when a compatible ChromeHeadless runtime is available; the production Docker build compiles the changed component, but the local Karma browser runner exited before launching.
- Rebuilt and recreated the Docker frontend after the batting/bowling metric addition. Current automatic ODI SSR verification contains both team metrics, `ODI all-gender v2`, confidence content, no loading state, and `noindex`; the application TypeScript also passes `npx tsc -p src/tsconfig.app.json --noEmit`.
- Verify the complete analytics event set against real traffic: `intelligence_cta_impression`, `prediction_view`, `prediction_interaction`, and `model_unavailable`.
- Run the SEO indexing gate on the deployed intelligence route and make the eventual sitemap inclusion decision from evidence.
- Connect deeper backend/model outputs from the canonical model repo and the video-studio intelligence extraction repo beyond the current public prediction payload.
- Rebuilt the frontend image after the prediction-history changes and verified the new marker in the running container bundle.
- Capture a durable production-safe evidence artifact for the newly verified live ODI/T20 routes, including non-empty prediction-history points and freshness timestamps.
- Run a production-safe rollout and verify the public route, canonical, indexing policy, and model freshness in the deployed environment.
- Collect real-traffic analytics evidence and complete a browser-based responsive visual pass on representative desktop and mobile widths.
- Browser pixel inspection remains pending because the available in-app browser runtime could not launch in this environment; source media-query coverage is present and SSR is verified.
- Chrome headless was also unavailable in this Windows session, so pixel-level desktop/mobile screenshots are not claimed as verified.
- Latest clean restart evidence: the model scheduler repopulated one current ODI row (`ODI all-gender v2`) after its discovery interval; no eligible T20 row was exposed by the current CREX source slate during this run, so the live T20 acceptance gate remains open rather than being inferred from older evidence.
- Added explicit accessible labels for the canonical return link, relationship CTA, and utility action cards. After rebuilding and recreating the frontend, SSR contains those labels, returns `200`, reports a healthy container, has no loading shell, retains `noindex`, and the homepage diff guard remains clean.
- Repaired the stale `CricketOddsComponent` lifecycle fixture constructor and made the optional accessibility helper compile-safe when `axe-core` is absent. The main Angular Karma target now reaches ChromeHeadless and executes 168 specs (`110 passed`, `58 failed`); remaining failures are legacy app-test fixture/module-provider issues. Match Intelligence-specific results are not claimed independently because this Angular 7 runner has no focused-file filter configured.
- Added a focused `id-card-app:test-intelligence` Angular target. Its ChromeHeadless run is green at `15/15`; it also exposed and fixed full-name `west-indies` route matching and validated the Match Intelligence payload/chart/lifecycle/analytics specs independently of the legacy suite.

## Commit Scope

This checkpoint commits only Spec 044 intelligence/model integration and its documentation. Existing unrelated worktree changes remain unstaged.
