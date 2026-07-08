# Repo Cleanup Keep vs Discard

Date: 2026-07-08 IST
Repo: `victoryline-monorepo`
Scope: remaining non-homepage dirty state after the scoped non-homepage frontend rollout

## Goal

This file classifies the remaining dirty repo state into:

- `Keep`: likely useful product, ops, spec, or tooling work worth preserving
- `Discard`: generated, temporary, duplicated, or low-value residue that should not block new feature work
- `Needs decision`: work that may be real, but should be confirmed before deletion or commit

## Executive summary

The repo is not dirty because of one single unfinished feature. It is dirty because several separate streams are mixed together:

- durable spec and rollout documentation
- reusable repo-local skills
- SEO dashboard/tooling work
- some test-only edits
- artifacts and generated residue

The safest path to a truly workable repo is:

1. keep the durable specs, rollout docs, and reusable skills
2. discard generated artifacts, caches, and temporary SEO exports
3. make an explicit decision on the SEO dashboard code changes and the few remaining test/config edits before the next feature branch

## Keep

These look like durable project assets or real in-progress work that should not be thrown away casually.

### Durable docs and rollout records

- `docs/FRONTEND_DEPLOYED_FROM_LOCAL_REPORT_20260708.md`
- `docs/INCIDENT_20260611_SCRAPER_BROWSER_CRASH_LOOP.md`
- `docs/LIVE_MATCH_SEO_PHASE_ROADMAP.md`
- `docs/MATCH_NEWS_FRESHNESS_SEO_PLAN_20260628.md`
- `docs/PREMATCH_DISCOVERY_ELIGIBILITY_STRATEGY_20260628.md`
- `docs/ROLLUP_20260611_LIVE_SCORE_FAST_LANE_PROD.md`
- `docs/ROLLUP_20260629_FRESHNESS_LIFECYCLE_PROD.md`

Reason:

- these are durable runbooks, incident records, or deployment history
- they support the user preference for preserving progress in repo artifacts rather than chat only

### Spec work that should be preserved

- `specs/017-commentary-reading-ux/`
- `specs/018-match-discovery-link-graph/rollout.md`
- `specs/020-live-score-fast-lane/`
- `specs/025-prematch-discovery-monitoring/`
- `specs/029-foreground-clean-background-seo/`
- `specs/031-match-page-cls-lcp-core-web-vitals/`
- `specs/032-canonical-match-intent-capture/`
- `specs/035-prematch-indexing-operator-queue/`
- `specs/036-series-discovery-hub-enrichment/`
- `specs/037-early-upcoming-discovery-window/`
- `specs/038-match-news-freshness-support/`
- `specs/039-match-freshness-authority-hardening/`
- `specs/040-backend-freshness-narrative-engine/`
- `specs/041-query-surface-authority-and-link-graph-hardening/`
- `specs/042-above-fold-at-a-glance-seo-rebalance/`
- `specs/043-canonical-live-match-coverage/`
- modified `specs/044-cricket-decision-intent-acquisition/{spec.md,plan.md,tasks.md}`

Reason:

- these match the repo’s spec-first workflow
- deleting them would likely lose planning context that the repo already depends on

### Repo-local skills worth preserving

- modified `.agents/skills/crickzen-live-score-incident/SKILL.md`
- modified `.agents/skills/crickzen-local-stack-ops/SKILL.md`
- modified `.agents/skills/crickzen-match-surface-ux-pass/SKILL.md`
- untracked `.agents/skills/crickzen-backend-scraper-prod-rollout/`
- untracked `.agents/skills/crickzen-competitor-seo-ux-benchmark/`
- untracked `.agents/skills/crickzen-live-catalog-guard/`
- untracked `.agents/skills/crickzen-prematch-discovery-seo/agents/`
- untracked `.agents/skills/crickzen-prematch-discovery-seo/references/`
- untracked `.agents/skills/crickzen-scraper-browser-crash-loop/`

Reason:

- these are durable operating knowledge for this repo
- several align directly with problems already investigated in production

## Discard

These are the easiest wins for cleanup because they look generated, duplicated, or temporary.

### Generated artifacts and raw evidence dumps

- `artifacts/competitor-keyword-discovery/`
- `artifacts/live-catalog-guard/`
- `artifacts/seo-health/crickzen-seo-health-20260617-184308.json`
- `artifacts/seo-health/crickzen-seo-health-20260625-070536.json`
- `artifacts/seo-health/crickzen-seo-health-20260625-073247.json`
- `artifacts/seo-health/crickzen-seo-health-20260625-093157.json`
- `artifacts/seo-health/crickzen-seo-health-20260625-093504.json`
- `artifacts/seo-health/crickzen-seo-health-20260707-194847.json`
- `artifacts/seo-investigation-20260610/`

Reason:

- these are output artifacts, not source of truth
- they create noise and can usually be regenerated when needed

### Temporary export/package residue

- `crickzen-seo-overlay-20260628-1556.tar.gz`

Reason:

- looks like a one-off transfer/export artifact rather than durable repo content

### Generated cache residue

- `tools/competitor-keyword-discovery/__pycache__/`

Reason:

- should never be kept in a clean working tree

## Needs decision

These look real, but they mix product/tooling value with cleanup risk. They should be either committed intentionally or discarded intentionally, not left floating.

### SEO dashboard code changes

- modified `tools/seo-dashboard/README.md`
- modified `tools/seo-dashboard/app.py`
- modified `tools/seo-dashboard/collector.py`
- modified `tools/seo-dashboard/static/dashboard.css`
- modified `tools/seo-dashboard/static/dashboard.js`
- modified `tools/seo-dashboard/templates/index.html`
- modified `tools/seo-dashboard/tests/test_collector.py`
- untracked `tools/seo-dashboard/state/`

Why this needs a decision:

- this is a large real code delta, not noise
- it may be useful ongoing tooling work
- `tools/seo-dashboard/state/` is probably runtime state and should likely be discarded even if the code changes are kept

Recommended split:

- `Keep and commit`: the code and tests under `tools/seo-dashboard/`
- `Discard`: `tools/seo-dashboard/state/`

### Competitor keyword discovery tool

- untracked `tools/competitor-keyword-discovery/`

Why this needs a decision:

- the tool code itself may be useful and reusable
- but it is currently mixed with generated cache residue

Recommended split:

- `Keep and commit`: source files like `README.md`, script, example config
- `Discard`: `__pycache__/`

### Light config/template edits

- modified `.github/copilot-instructions.md`
- modified `.specify/memory/constitution.md`
- modified `.specify/templates/plan-template.md`
- modified `.specify/templates/spec-template.md`
- modified `.specify/templates/tasks-template.md`
- modified `package.json`
- modified `Caddyfile.local`
- modified `docs/DEPLOYMENT_TROUBLESHOOTING.md`

Why this needs a decision:

- these may be useful workflow improvements
- but they are not obviously tied to one shipped feature
- if left dirty, they keep contaminating future work

Recommended action:

- review and either commit as a small “workflow/docs/config cleanup” slice or discard together

### Test-only frontend residue

- modified `apps/frontend/src/app/core/utils/match-utils.spec.ts`
- modified `apps/frontend/src/app/scrape-control/scraping-service.service.spec.ts`

Why this needs a decision:

- these are not homepage blockers anymore
- they are small enough to either finish and commit or discard
- leaving them dirty adds unnecessary noise to future frontend work

Recommended action:

- inspect whether they belong to already-deployed behavior; if yes, commit
- otherwise discard

## Recommended cleanup order

### Phase 1: safe deletes now

- delete `artifacts/competitor-keyword-discovery/`
- delete `artifacts/live-catalog-guard/`
- delete the `artifacts/seo-health/*.json` files
- delete `artifacts/seo-investigation-20260610/`
- delete `crickzen-seo-overlay-20260628-1556.tar.gz`
- delete `tools/competitor-keyword-discovery/__pycache__/`
- delete `tools/seo-dashboard/state/`

### Phase 2: preserve durable work

- stage and commit the `docs/` keep set
- stage and commit the `specs/` keep set
- stage and commit the `.agents/skills/` keep set

### Phase 3: resolve the decision set

- decide whether `tools/seo-dashboard/` is active work to keep
- decide whether `tools/competitor-keyword-discovery/` should become a real tracked tool
- decide whether the config/template/doc edits should be committed or dropped
- decide whether the two remaining frontend test edits should be committed or dropped

## Suggested “clean enough for new work” target

If the goal is to get truly ready for new feature work, the best target state is:

- all artifact folders and export residue removed
- durable docs/specs/skills committed
- either commit or discard the SEO dashboard slice as a single unit
- either commit or discard the small config/template/test leftovers as a single unit

That would leave the repo with intentional history instead of a mixed pile of long-lived dirt.
