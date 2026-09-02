# Implementation Plan: Prediction Evidence and Seven-Day Promotion

**Constitution version consulted**: 1.5.0
**Wiki constitution/checkpoint**: `[[CrickZen Constitution]]`; `[[CrickZen Prediction Evidence and Seven-Day Promotion 2026-09-02]]`

## Workstreams

### 1. Freeze the measurement contract

1. Reuse the existing `MatchStateLogger` and `StateAnalyzer` metric conventions.
2. Add the explicit batting-team orientation, market availability, feature
   completeness, and stable state-key fields from the spec.
3. Define one shared evaluator for Brier, log loss, 10-bin ECE, coverage, and
   match-equal weighting so dashboards and batch reports cannot disagree.

### 2. Capture complete inference evidence

1. Enable state recording for dashboard-launched predictor processes with a
   configurable per-league data directory.
2. Store all engineered features and source inference inputs as deterministic JSON
   strings alongside the typed Parquet columns.
3. Include striker, non-striker, bowler figures, market source/age, calibration
   chain, model/feature-store versions, and quality flags.
4. Make match finalization carry the exact source URL and proven winner and make
   metadata completion idempotent.

### 3. Build candidate shadow evaluation

1. Register a candidate with `scripts/register_candidate_model.py`; the manifest
   records the candidate id, model/companion artifact hashes, feature order hash,
   source revision, and activation timestamp.
2. Load that candidate in the predictor as a shadow-only `Predictor`; it receives
   the same typed state and ball-history snapshot and cannot change the live
   probability or market blend.
3. Preserve incumbent and candidate probabilities in one comparison key and
   reject changed candidate artifacts before shadow scoring.

### 4. Generate the seven-day review

1. Run `scripts/review_model_promotion.py` against the evidence directory and
   registered candidate manifest after the seven-calendar-day window.
2. Write JSON/Markdown reports with overall, innings, phase, confidence,
   market-coverage, and top divergence sections.
3. Add deterministic frozen gates and an append-only decision manifest.
4. Make failed gates produce a clear next experiment instead of a vague failure.

### 5. Operator visibility and rollout

1. Add an authenticated operator read surface only after the report files are
   correct; do not expose raw market evidence on the public page by default.
2. Add tests for capture, orientation, missing market, winner settlement,
   candidate comparison, and each promotion gate.
3. Validate a local replay and an unchanged-ledger repeatability run.
4. Run an independent evidence-storage watcher during live matches. It joins
   the fresh dashboard state to the exact provider match URL and durable
   Parquet file, checks schema/identity/quality/market completeness, writes an
   atomic health report, and escalates repeated storage failures without
   restarting or changing prediction output.
5. Production rollout is a separate checkpoint requiring exact image/source
   proof and rollback artifacts.

## Execution order

1. Implement and test the evidence schema/metrics.
2. Wire dashboard predictor launch and completion settlement.
3. Implement candidate replay and seven-day gate/report.
4. Run focused tests and a synthetic end-to-end review.
5. Record the checkpoint in the CrickZen wiki.
6. Decide whether to deploy the telemetry/reporting slice; never promote a
   model without a passing real review artifact.

## Current checkpoint

The implementation slice is complete: production capture, full-feature
snapshots, metadata settlement, candidate manifests, deterministic review gates,
and the evidence-storage watcher. Production is running dashboard image
`20260902-market-evidence-r2` with isolated source release
`market-evidence-r3-20260903` and container `crickzen-evidence-watcher`.
The watcher is healthy, the incumbent route remains active, and no candidate
artifact is configured yet. The next work is the real seven-day shadow window
and its review artifact.

## Operator workflow

1. Build a candidate model into an immutable model directory.
2. Register it, for example:
   `python scripts/register_candidate_model.py --model-dir models/<candidate> --candidate-id <candidate-id> --league <league> --source-revision <git-sha>`.
   If metadata does not contain feature order, repeat `--feature-order` for
   every feature in the trained order.
3. Set the dashboard's `SHADOW_CANDIDATE_MODEL_DIR` to that directory and keep
   `RECORD_MATCH_STATES=true`.
4. Allow the candidate to shadow live matches for seven calendar days. Do not
   change the candidate artifact during the window.
5. Run:
   `python scripts/review_model_promotion.py --states-dir data/match_states --candidate-id <candidate-id> --candidate-manifest models/<candidate>/candidate_manifest.json --window-start <UTC-start> --window-end <UTC-start-plus-7-days>`.
6. A `promote_candidate` report authorizes a separate, explicitly reviewed
   deployment. `retain_incumbent` or `insufficient_evidence` never changes the
   production route.
