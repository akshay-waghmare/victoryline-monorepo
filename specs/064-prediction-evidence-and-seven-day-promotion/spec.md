# CrickZen Prediction Evidence and Seven-Day Promotion

## Status

Drafted for implementation on 2026-09-02. This is a cross-repository contract:
the CrickZen application starts and displays predictions, while the prediction
repository owns model inference, evidence capture, evaluation, and promotion.

## Objective

Build a model that is demonstrably better than the market on:

1. Brier score (lower is better).
2. Log loss (lower is better).
3. Expected calibration error, ECE (lower is better).

The market comparison must be made on the same valid match-state observations,
with both probabilities expressed as the probability that the currently batting
team wins. A missing or ambiguous market value is unavailable data, never a
fabricated 0.5 or a silent exclusion.

## User stories

### US1 — Auditable probability evidence

For every distinct observed ball state, the system records the market
probability, incumbent model probability, candidate/shadow model probability
when available, their signed and absolute differences, and the eventual outcome
label. An operator can trace every value to one match, one innings/over/ball,
one model version, and one feature snapshot.

### US2 — Complete inference context

For every recorded state, the system retains the exact inputs used by inference:
batting and bowling teams, striker, non-striker, bowler and available bowling
figures, score, wickets, overs, target, venue, toss, innings carryover, recent
ball context, all engineered feature keys/values, calibration chain, market
source/age/raw odds, model version, feature-store version, and data-quality
flags. The structured payload is versioned JSON inside the Parquet row so new
features do not require a destructive migration.

### US3 — Seven-calendar-day candidate evaluation

When a candidate model is enabled, it runs in shadow mode beside the incumbent
on the same eligible states. A review window starts at the first candidate
observation and closes only after seven calendar days have elapsed. The review
uses completed matches whose outcomes are proven, not merely process exits.

### US4 — Frozen promotion decision

At the end of the seven-day window, the system writes one immutable review
report and one machine-readable decision. Promotion is allowed only when every
required gate passes. A failed or insufficient review leaves the incumbent
route unchanged and records the reason plus the next action.

## Definitions and measurement contract

### Prediction orientation

Every probability is named and stored in batting-team orientation:

- `market_batting_team_prob`: normalized market probability for the current
  batting team.
- `incumbent_batting_team_prob`: production model probability for the current
  batting team.
- `candidate_batting_team_prob`: shadow candidate probability for the current
  batting team.
- `actual_batting_team_win`: `1` when the current batting team eventually wins,
  `0` when the other team wins.

For each available comparison:

- `model_minus_market = model_batting_team_prob - market_batting_team_prob`.
- `absolute_model_market_gap = abs(model_minus_market)`.
- `model_brier = (model_probability - actual)^2`.
- `market_brier = (market_probability - actual)^2`.

The report also includes log loss and 10 equal-width-bin ECE. Probabilities are
clipped to `[0.001, 0.999]` only for log-loss calculation; the original values
remain in the evidence row.

### Evaluation units

The ledger keeps every distinct ball-state observation for diagnosis. It may
contain correlated rows, so the promotion report must publish both:

- ball-row metrics for operational visibility; and
- match-equal-weighted metrics for promotion, where each match contributes the
  same total weight regardless of how many states were captured.

Only pre-result states with a proven winner, valid model probability, valid
feature completeness, and a valid market probability are eligible for the
model-versus-market gate. Market-unavailable rows remain in coverage and data
quality reporting but cannot help or hurt the market comparison metric.

## Evidence record contract

The current per-match state file remains the primary storage surface:
`data/match_states/<league>/<match_id>.parquet`.

Required top-level row groups:

1. Identity: match id/url, league, observed timestamp, innings, over, legal ball
   index, match phase, and a stable `state_key`.
2. Teams and state: batting team, bowling team, striker, non-striker, bowler,
   individual batter/bowler figures, score, wickets, overs, CRR, RRR, target,
   venue, toss, and innings transition fields.
3. Inference inputs: `features_json` containing every feature passed to model
   construction, plus `inference_context_json` containing the source state and
   carryover inputs. JSON must be finite, deterministic, and redacted of
   credentials/cookies.
4. Predictions: raw, smoothed, calibrated, final, router, ensemble, and
   candidate/production role/version where applicable.
5. Market: favorite team, raw back/lay odds, implied favorite probability,
   batting/bowling orientation, market source, market age, and an explicit
   availability/reason code.
6. Comparison: signed/absolute model-market gap, direction, bucket, and
   previous-state deltas.
7. Quality/provenance: source timestamps, feature completeness, team identity
   completeness, market completeness, model artifact fingerprint/version, and
   feature-store version.

Match-level metadata must include match URL, first/second batting teams, winner,
result type, score summaries, model versions observed, total recorded balls, and
recording start/end. Finalization must be idempotent: restarting a predictor
cannot append a second completion row for the same match/version.

## Seven-day shadow protocol

1. Register a candidate artifact with a unique candidate id, model directory,
   feature order/fingerprint, calibration artifact fingerprints, creation time,
   and source revision.
2. Start the candidate in shadow mode. It must consume the same frozen state and
   feature snapshot as the incumbent; it must not alter the live displayed
   probability or market blend.
3. Capture incumbent, candidate, and market values under the same state key.
4. Continue collecting until seven calendar days have passed from candidate
   activation. If fewer than 7 completed matches, 200 eligible ball states, or
   80% market coverage are available, the result is `insufficient_evidence`.
5. Settle completed matches only from a source-backed final result. No-result,
   abandoned, ambiguous-team, stale-market, or missing-feature records are
   excluded from the promotion sample and counted by reason.
6. Produce the review report, then run the promotion gate against the report.
7. Promotion, if allowed, is a separate explicit deployment action. The report
   and decision are immutable and the previous incumbent remains rollback-ready.

## Frozen promotion gates

The candidate must pass all gates below on the seven-day eligible window and on
the same-row incumbent comparison:

- G1 — window: at least seven elapsed calendar days.
- G2 — sample: at least 7 completed matches and 200 eligible ball states.
- G3 — coverage: at least 80% market-valid eligible rows and no unexplained
  team-orientation mismatch.
- G4 — candidate versus market: candidate match-equal Brier, log loss, and ECE
  are each strictly lower than market by at least the configured practical
  margins (`0.002`, `0.010`, and `0.005` respectively by default).
- G5 — candidate versus incumbent: candidate is not materially worse than the
  incumbent on any of the three metrics; default allowed regression is `0.001`
  Brier, `0.005` log loss, or `0.003` ECE.
- G6 — operational quality: feature completeness >= 95%, team identity
  completeness = 100%, valid probability range = 100%, and no production
  exception/latency regression above the configured limit.
- G7 — segment safety: no innings or phase segment with at least 30 eligible
  rows has a candidate Brier regression greater than the incumbent tolerance.
- G8 — reproducibility: the report identifies exact source revisions,
  artifacts, feature order, calibrators, input window, code version, and command
  receipts; a second read of the same ledger yields the same decision.

These gates are deliberately stronger than “the candidate had a better average
in seven days”. Seven days is the review cadence, not proof that a model will
generalize indefinitely. If the sample is too small or a gate fails, keep the
incumbent, preserve the candidate for diagnosis, and extend/restart the shadow
window after fixing the named defect.

## Reporting contract

Each review writes:

- `data/model_reviews/review_<candidate_id>_<window_end>.json` — machine-readable
  metrics, counts, gates, decision, reasons, and artifact fingerprints.
- `data/model_reviews/review_<candidate_id>_<window_end>.md` — operator report
  showing model/market metrics, differences, strengths, weaknesses, coverage,
  segment tables, top divergence states, and recommended next experiment.
- `data/model_reviews/review_manifest.jsonl` — append-only decision index.

“Strength” means a segment where the candidate beats both market and incumbent
on the selected metric with adequate support. “Weakness” means a segment where
it loses, is poorly calibrated, has high missingness, or shows large divergence.
The report must not claim causality from feature correlation; it should name a
feature or state for investigation only.

## Safety and scope

- The market is a benchmark, not a label source and not a guarantee of truth.
- Never use post-result information as an inference feature.
- Never silently flip teams because a probability looks wrong. Record the
  orientation failure and quarantine the row.
- Never auto-promote from an incomplete, ambiguous, or non-reproducible report.
- Production promotion remains a separate explicit rollout gate with health,
  source parity, rollback, and post-deploy verification.
- Existing public prediction proof thresholds remain separate from this
  seven-day operational candidate cadence.

## Acceptance scenarios

1. A complete row with Dublin Guardians batting stores striker, non-striker,
   bowler, all feature keys, market probability, model probability, difference,
   and the exact current batting orientation.
2. A row without market odds stores `market_status=unavailable` and a reason;
   it does not receive a fake comparison value.
3. A completed match receives one winner metadata record even after predictor
   restart/finalization retry.
4. Seven completed calendar days with insufficient samples returns
   `insufficient_evidence` and does not promote.
5. A candidate that beats market on only two of Brier/log-loss/ECE returns
   `retain_incumbent`.
6. A candidate that passes all gates produces a promotion-ready decision but
   still requires the separately authorized deployment step.
7. Re-running a review on an unchanged ledger produces the same JSON decision
   and manifest digest.

## Rollback

Rollback is data-safe: retain all evidence and reports, switch model routing back
to the prior incumbent artifact, and keep the candidate marked `rejected` or
`shadow`. No historical evidence rows are deleted or rewritten.
