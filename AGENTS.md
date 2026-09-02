# CrickZen Agent Instructions

## Wiki-first continuity

For any CrickZen work—implementation, diagnosis, review, rollout, or a return to an earlier task—check the Agentic OS wiki before guessing when context is missing, uncertain, or contradictory.

1. Read `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/hot.md`.
2. Search `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/index.md` and the relevant wiki pages for the task terms.
3. Prefer the newest matching checkpoint or decision, while separating historical notes from current runtime proof.
4. Verify drift-prone claims against the current repository, public endpoint, deployed image, or exact artifact named by the task.

The wiki is the durable source for prior decisions, rationale, checkpoints, and unresolved gaps. It does not replace live verification, and an old wiki claim must not be presented as current production state without rechecking it.

When work creates a durable CrickZen checkpoint, decision, contradiction, or verified rollout change, update the relevant wiki note and its navigation/cache entries through the existing save workflow. Never save secrets or credentials.

## Constitution and wiki synchronization

The normative repository constitution is `.specify/memory/constitution.md`. The durable
continuity mirror is `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/meta/CrickZen Constitution.md`.
For every CrickZen implementation, diagnosis, review, rollout, or Spec Kit task:

1. Consult both constitution records before acting. Use the repository file for normative
   rules and the wiki mirror for rationale, checkpoints, contradictions, and current gates.
2. Treat the constitution version and the wiki mirror date as part of the working context.
3. When amending the constitution, update the wiki mirror, `wiki/index.md`, `wiki/log.md`,
   and `wiki/hot.md` in the same change through the wiki lock/save workflow.
4. When a durable CrickZen decision or checkpoint changes a constitutional rule, update
   the repository constitution or record the rule as an explicit follow-up; do not leave
   the two sources silently divergent.
5. Separate historical checkpoint evidence from current runtime proof, and record later
   contradictions instead of deleting the earlier evidence.

## Prediction model evidence and promotion

The current CrickZen prediction objective is to build a model that is demonstrably
better than the market on all three primary measures: Brier score, log loss, and
expected calibration error (ECE). A model is not considered better because it wins
on accuracy, one metric, a small sample, or a source-only test.

- Treat every probability as the probability that the current batting team wins.
  Validate batting/bowling roles from the authoritative provider identity before
  using a state for training, inference, or evaluation.
- Record one source-scoped, versioned state per observed ball with the source URL,
  match/innings/over/ball identity, striker, non-striker, bowler and bowling figures,
  score context, all engineered features, inference/calibration context, market
  source/age/status/raw odds, incumbent and candidate probabilities, differences,
  model versions, artifact hashes, and quality flags. Missing market data is explicit;
  never impute or silently drop it.
- Compare market, incumbent, and candidate on the same eligible rows. Use
  match-equal-weighted Brier, log loss, and ECE for promotion, with ball-level and
  segment diagnostics for innings, phase, competition, confidence, and coverage.
- Run candidates in shadow against the exact incumbent state and ball history. A
  candidate must not change public/live output during evaluation.
- Require an untouched chronological window of at least seven calendar days, seven
  completed matches, 200 eligible rows, 80% market coverage, 95% feature completeness,
  complete team identity, reproducible manifests, and incumbent safety before promotion.
  Default practical improvements are Brier `0.002`, log loss `0.010`, and ECE `0.005`
  versus market; incumbent regressions are bounded separately by the Spec 064 gates.
- Promotion is an explicit human-reviewed action from an immutable deterministic
  report. Never auto-promote, auto-deploy, or claim market superiority before all
  gates pass. Retain rollback artifacts and record the exact image/source proof.

The canonical implementation lives in
`C:/Users/ADMINS/Documents/projects/machine_learning_bbl_009-odi-mc-predictor/` and
the cross-repository contract is Spec 064. Use the LoopX-bound goal and daily monitor
for this long-horizon evidence lane; quiet monitoring is expected until a material
review window, data-quality regression, or candidate decision is ready.
