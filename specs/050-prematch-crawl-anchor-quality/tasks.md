# Tasks: Prematch Crawl Anchor Quality

Status legend: `[ ]` queued, `[-]` in progress, `[x]` complete, `[!]` blocked.

## Phase 1: Spec Kit Artifacts

- [x] T001 Create `specs/050-prematch-crawl-anchor-quality/spec.md`.
- [x] T002 Create `specs/050-prematch-crawl-anchor-quality/plan.md`.
- [x] T003 Create `specs/050-prematch-crawl-anchor-quality/tasks.md`.

## Phase 2: Implementation

- [x] T004 Inspect existing SSR hub link flow and confirm `buildCanonicalMatchLinkLabel()` is the shared label boundary.
- [x] T005 Treat placeholder teams as missing for crawl-anchor labels.
- [x] T006 Derive both teams from the canonical `-vs-` slug when placeholder feed fields are present.
- [x] T007 Preserve honest `TBD` fallback when no valid slug exists.

## Phase 3: Tests

- [x] T008 Add focused tests for empty team fields with slug-derived identity.
- [x] T009 Add focused tests for `TBD` team fields with slug-derived identity.
- [x] T010 Add focused tests for `Team 1` / `Team 2` fields with slug-derived identity.
- [x] T011 Preserve existing lifecycle label tests for live/upcoming/completed.

## Phase 4: Verification

- [x] T012 Run `npx tsc --noEmit -p src/tsconfig.app.json` from `apps/frontend`.
  Evidence: passed on 2026-08-10.
- [!] T013 Run available focused frontend unit tests, or record the existing Angular/Karma blocker if the local runner cannot target this spec cleanly.
  Evidence: pure helper execution passed with `TS_NODE_COMPILER_OPTIONS='{ "module": "commonjs" }' npx ts-node -e ...`, producing `HK vs TAN match preview | HK vs TAN match preview | EDR vs WDL live score | TBD vs TBD live score`. Focused Jasmine assertions were also added. Karma remains a local runner gate: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/utils/match-utils.spec.ts` fails because Angular CLI 7 rejects `--include`; untargeted `npx ng test --watch=false --browsers=ChromeHeadless` produced no test output after roughly two minutes and was stopped.
- [x] T014 Record production rollout and GSC outcome proof as pending gates rather than source-complete claims.
  Evidence: source completion was not treated as Google indexing proof. The frontend rollout and raw SSR hub proof are now complete; GSC T-24/T-12 outcome proof remains pending.

## Phase 5: Production Rollout

- [x] T015 Commit and push the narrow frontend/spec source snapshot.
  Evidence: commit `3a6dc08` (`Fix prematch crawl anchor placeholders`) pushed to `origin/008-match-title-seo`.
- [x] T016 Build and push a frontend-only image from the committed source.
  Evidence: local Docker build produced `macubex/victoryline-frontend:20260810-crawl-anchor-r1-3a6dc08` with browser hash `145cf74e068f6013e954` and server hash `52bf14c365afc1a79eef`; pushed digest `sha256:2e03413932b1f26f0c9f9d3afcc9e5a9084063c80e0913c4982a27e49445f9cc`.
- [x] T017 Deploy only the production frontend service.
  Evidence: production `.env` backed up as `.env.bak.20260810-crawl-anchor-r1-3a6dc08`, `FRONTEND_IMAGE=macubex/victoryline-frontend:20260810-crawl-anchor-r1-3a6dc08`, and `victoryline-frontend` is healthy on that image.
- [x] T018 Verify raw production SSR hub anchors.
  Evidence: cache-busted Googlebot/normal probes for `/live-score`, `/live-score/today`, and `/cricket-schedule/today` each returned 200 with 48 `/cric-live/` links, `TBD vs TBD=0`, and `Team 1|Team 2=0`. Sample anchors include `HK vs TAN match preview`, `ITA vs UGN match preview`, `EDR vs WDL match preview`, and `AFG vs IRE match preview`.
- [ ] T019 Measure the next GSC cohort outcome.
  Gate: wait for StartupOS/GSC observations at T-24/T-12/T-1h and compare discovered/indexed outcomes without claiming causation from crawl-anchor proof alone.
