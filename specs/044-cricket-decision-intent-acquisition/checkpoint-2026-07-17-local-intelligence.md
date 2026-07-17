# Crickzen Match Intelligence Checkpoint

Date: 2026-07-17
Scope: local Match Intelligence, ODI model rollout, scraper, dashboard, and the NZ vs WI live route.

## Executive Summary

The local model public feed is working and is producing a live ODI prediction for West Indies vs New Zealand. The Match Intelligence page was empty because the canonical route used abbreviated teams (`nz`/`wi`) while the model feed used full team names (`new-zealand`/`west-indies`). The frontend identity matcher now normalizes both forms automatically.

The dashboard page itself currently has no prediction row because the dashboard process was started with `DISABLE_AUTO_UPDATE=true`. This disables the automatic prediction scheduler even though the public model feed still contains a running prediction.

## Completed Work

### ODI model audit and candidate

- Audited ODI training and inference features for parity, defaults, innings/phase coverage, and feature importance.
- Tested the `projected_score` removal as a chronological ablation.
- Created `models/odi_all_v3_feature_pruned_candidate` with 40 features.
- The candidate removes `projected_score` but retains the other validated projected/venue pressure features.
- Beta calibration improved the chronological OOF result and passed the required all, gender, innings-two, and late-phase slice gates.
- Added a reusable `BetaCalibrator` and verified loading through `Predictor.load`.
- Updated dashboard model resolution and public labels to recognize `ODI all-gender v3 feature-pruned`.
- Fixed the predictor loader path for calibration-free models.
- Model repository tests passed: 36 focused tests; dashboard public payload tests passed: 2 tests.

### Match Intelligence surface

- Added the Match Intelligence route and SSR support.
- Added public metrics including innings, CRR/RRR, expected final, venue average, resources, resource win probability, score vs par, pressure, and probability swings.
- Added model factors, confidence/uncertainty, glossary, explanation pack, expected-final comparison, and Manhattan/worm timeline modules.
- Added prediction history for expected-final/projected-score movement.
- Added a safe one-point chart fallback when a live prediction has no history yet.
- Added frontend lifecycle, route matching, merge, and timeline coverage.

### Automatic discovery and local runtime

- Automatic CREX discovery found the current route without manually adding a match URL:
  `https://crex.com/cricket-live-score/nz-vs-wi-3rd-odi-new-zealand-tour-of-west-indies-2026-match-updates-11ER`
- Test matches are excluded from prediction routing.
- Format-aware ODI/T20 routing is in place.
- The scraper container is up and healthy and successfully discovers the match.
- The public prediction API is healthy and returned a running row with live score, probability, model label, history, and freshness timestamp.

### Exact page fix

- Root cause: route and model slugs used different team naming conventions.
- Updated `match-intelligence-data.service.ts` to parse full team names and abbreviations such as `NZ`/`new-zealand`, `WI`/`west-indies`, `SA`/`south-africa`, and similar supported teams.
- Rebuilt the Angular SSR frontend image and recreated the frontend container.
- Verified the exact URL returns HTTP 200 with live score, teams, model label, probability timeline, and no loading/unavailable state.

## Runtime Evidence

At verification time, the public model feed returned a running ODI row including:

- Match: West Indies vs New Zealand
- Score: 140/9 at 37.1 overs
- Model: ODI all-gender v3 feature-pruned
- Mode: ML + calibrated
- Public prediction: 11% for the batting side
- Expected/projection and history fields: present

The exact Match Intelligence URL returned:

- Live score and team data: present
- Model label: present
- Probability timeline and Manhattan/worm module: present
- `publicPrediction: null`: absent
- Loading shell: absent

The scraper health endpoint reported `state: failing` despite the container being healthy. Logs show discovery and match parsing succeeded, but backend sync attempts hit an open backend authentication/API circuit breaker. The backend subsequently became healthy after restart.

## Current Blocker

The dashboard process is running with:

`DISABLE_AUTO_UPDATE=true`

Therefore:

- `/dashboard` loads.
- `/api/public/matches` contains the live ODI prediction.
- `/api/matches/all` is empty or unavailable without dashboard authentication.
- The automatic dashboard prediction scheduler is not starting new rows.

## Next Actions

1. Restart the dashboard with `DISABLE_AUTO_UPDATE=false`.
2. Verify `/api/matches/auto/status` and `/api/matches/all` after authentication.
3. Confirm the dashboard row shows the NZ vs WI match and the same model state as `/api/public/matches`.
4. Recheck scraper health after backend authentication circuit recovery.
5. Keep the manual-URL-free discovery workflow; do not add match-specific configuration.
6. Preserve the ODI candidate as a tested candidate until the promotion decision is formally recorded against the baseline.

## Files Changed In This Checkpoint

- `apps/frontend/src/app/features/match-intelligence/match-intelligence-data.service.ts`
- `specs/044-cricket-decision-intent-acquisition/implementation-status.md`
- `specs/044-cricket-decision-intent-acquisition/checkpoint-2026-07-17-local-intelligence.md`

This checkpoint does not claim a production rollout. It documents local runtime evidence and the remaining dashboard scheduler configuration issue.
