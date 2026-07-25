# Match Intelligence History and Mobile Release Plan

## Outcome

Match Intelligence must show a complete, readable model-probability history for
both innings while a match is live and after it finishes. The same history must
remain available from the public match route without exposing raw predictor
state. On mobile, the current score, probability and graph must be the first
reading layer; supporting explanation must be progressive rather than an
unbroken desktop-derived stack.

## Verified failure

- The production Hundred sidecar retains 3,411 history events covering innings
  1 and 2.
- The public detail API currently returns only 24 recent events, all from
  innings 2, because production is still using the compact serializer path.
- Finished predictors are removed from the in-memory prediction registry. The
  public list only returns `running` rows and the detail route consequently
  returns `404` despite the persisted sidecars.

## Workstreams

### 1. Public history contract

- Keep the list endpoint compact (latest 24 points).
- Make the selected-match detail endpoint return a de-duplicated, format-aware
  complete history representation, with safe visual downsampling only when a
  format exceeds the client rendering budget.
- Preserve `innings`, score, overs and probability in every returned point.
- Use the explicit Hundred 100-ball contract when mapping chart positions.

### 2. Completed-match archive

- Persist a compact manifest when a predictor finishes: canonical CREX URL,
  public slug, league/format, lifecycle, state-sidecar path, history-sidecar
  path and completion time.
- Resolve public detail by canonical match identity against both active
  predictions and archived manifests.
- Retain finished public history for the agreed archive window; purge state and
  manifest together only after that window.
- Keep completed matches out of the live public list while permitting their
  direct canonical Match Intelligence routes.

### 3. Frontend resolver and chart

- Resolve direct match detail by canonical route/source URL for completed
  routes; do not require a live-list row before requesting it.
- Render two innings as separate chronological chart ranges and label both
  sides clearly.
- Handle Hundred, T20 and ODI chart lengths explicitly.
- Add tests for full two-innings detail, archived completed lookup, Hundred
  points, and a completed route whose summary-list row is absent.

### 4. Mobile-first UX

- Mobile order: match identity and status, probability/score pair, graph,
  compact key metrics, progressive explanation, history log.
- Replace competing mobile media-query blocks with one final responsive
  contract.
- Keep the graph at a usable fixed height, make innings labels visible without
  horizontal clipping, and collapse explanation/detail content behind native
  disclosure controls.
- Remove duplicate probability and narrative cards from the first mobile
  viewport; retain them as lower-priority context.

## Acceptance gates

1. A live Hundred detail response contains innings 1 and 2, while its list
   response remains compact.
2. A completed T20/Hundred route resolves after predictor shutdown and returns
   its retained graph history.
3. The Match Intelligence graph visibly spans both innings at 390px and 768px
   widths, with correct ball/over positions.
4. The first mobile viewport shows score, probability, graph and no clipped or
   duplicated reading layer.
5. Dashboard and frontend images are deployed separately, each verified by its
   public endpoint and a fresh production browser visit.

## Release implementation note (2026-07-26)

- The dashboard detail response now uses the persisted history sidecar and a
  600-state cap, which covers the maximum two-innings ODI visual timeline while
  keeping list payloads at 24 points.
- The public resolver accepts the canonical CREX source URL, so a completed
  Match Intelligence route does not depend on a row remaining in the live list.
- Hundred charts use twenty five-ball sets per innings and fractional set
  positions divide by five; innings two starts at chart position 20.
- Monte Carlo is intentionally excluded for Hundred until its six-ball-only
  simulator receives a separately calibrated 100-ball implementation.
