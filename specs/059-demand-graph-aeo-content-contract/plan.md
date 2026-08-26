# Plan: Search Demand Graph and AEO Content Contract

## Continuity brief

The current CrickZen strategy already treats search as:

`keyword -> lifecycle -> owning URL -> useful answer -> intent event -> owned next step -> outcome`

Existing work has already implemented or specified canonical match intent, series discovery links, entity `href` relationships, lifecycle-safe cohorts, rich SSR fallback, and sitemap hygiene. This plan integrates the new demand graph and AEO principles into those surfaces; it does not reopen the canonical route policy.

## Workstreams

### Phase 0 — Demand governance and evidence

1. Preserve the workbook as source evidence and create a versioned ownership matrix.
2. Add competitor URL provenance fields for the next research refresh.
3. Review every `Missing` and `Weak` cluster against actual data/API availability.
4. Mark each cluster `target now`, `observe`, `merge`, or `reject`.

### Phase 1 — First entity vertical slice

1. Select one real series with reliable fixtures and standings data.
2. Verify the series profile route, table route, team links, match links, and completed result state.
3. Add answer-first and atomic sections to the series profile without inventing facts.
4. Ensure raw SSR and hydrated output contain the same useful answer and links.
5. Verify the slice locally before any production rollout.

### Phase 2 — Canonical match AEO contract

Implementation prompt: `canonical-match-lifecycle-aeo-prompt.md`

Execution sequence:

1. **Contract first** — define one pure lifecycle vocabulary and one data state (`populated`, `loading`, `error`). Unknown or placeholder identities produce no AEO answer.
2. **Answer surface** — render one top-level canonical answer block with lifecycle-specific BLUF copy and atomic facts. Keep score/result/venue/toss/model fields optional and source-backed.
3. **Hydration parity** — use the same normalized input contract for SSR and TransferState/browser hydration. Preserve SSR structured data while client data is loading.
4. **State tests** — cover populated, loading, error, each lifecycle, placeholder rejection, model provenance gating, and hydrated output equality.
5. **Crawler tests** — check normal, desktop Googlebot, and mobile Googlebot raw HTML for one H1, one canonical, index/follow only for valid populated canonical pages, no placeholder answer, and lifecycle parity.
6. **Rollout** — build from an isolated clean snapshot, deploy frontend only unless backend changes are required, then recheck the pinned image/digest and exact public canonical canaries.
7. **Outcome separation** — record technical SSR/data readiness separately from GSC discovery/indexing, rankings, traffic, engagement, repeat use, and AI citations.

Acceptance matrix:

| Gate | Pass condition | Evidence |
|---|---|---|
| Lifecycle contract | upcoming/live/innings-break/completed/delayed/abandoned map deterministically; unknown returns no block | focused unit spec |
| Populated page | BLUF names teams and lifecycle; available facts are explicit; no placeholders | component spec + raw HTML |
| Loading/error | no indexable AEO block or invented fact | component spec + noindex/503 route contract |
| Hydration | TransferState produces the same answer contract before refetch | hydration spec + browser review |
| Schema | SportsEvent only has trustworthy start time and venue; SSR JSON-LD survives hydration | structured-data spec + raw HTML |
| Crawler parity | normal/desktop Googlebot/mobile Googlebot agree on H1, canonical, robots, lifecycle, and answer | public request matrix |
| Deployment | intended isolated image is running and public canary rechecks pass | image digest, container, URL evidence |
| Outcome boundary | report makes no indexing, ranking, traffic, or AI-citation claim | checkpoint/report |

### Phase 2 execution result — 2026-08-26

The canonical match AEO slice is implemented and deployed from an isolated frontend snapshot. The production gate passed for upcoming, innings-break, and completed canaries across normal, desktop Googlebot, and mobile Googlebot requests: 9/9 returned 200 with one H1, one canonical, `index,follow`, the expected lifecycle, one populated AEO block, no placeholder identity, and no temporary answer copy. Hydrated browser review also passed on the innings-break canary: one AEO block retained the verified `SL 265/8 (83.4 ov)` score shown by the live hero.

The production artifact is `macubex/victoryline-frontend:20260825-match-aeo-r8` with digest `sha256:8da4424460211cfea34d9d0fe7d1a5e2a6914f64da44eaf38601bda28e92314c`. Backend and scraper services were not changed. Full legacy Karma remains a repository baseline issue (`49 FAILED, 192 SUCCESS`); the new lifecycle/helper TypeScript checks and public gates pass.

This proves technical SSR, canonical/schema/hydration parity, and data readiness only. GSC discovery/indexing, rankings, organic traffic, engagement, repeat use, and AI citations remain separate measurement work in Phase 4.

### Phase 3 — Hubs and supporting surfaces

1. Align schedule and today hubs with their planning/live utility intent.
2. Strengthen team pages with upcoming, recent, series, and squad relationships when data is present.
3. Keep scorecard value on the completed canonical match page unless a distinct route proves unique value.
4. Add standings and series internal-link paths only where current data makes the page useful.

### Phase 4 — Measurement and expansion

1. Create a 3–9 URL cohort per selected surface and record a pre-change baseline.
2. Measure SSR/canonical/robots/schema/data freshness separately from GSC discovery/indexing/queries.
3. Measure `match_view`, deeper intelligence engagement, relationship actions, and repeat visits.
4. Expand only when the first vertical slice proves useful content and measurable discovery/engagement.

## Rollout gates

No production rollout is accepted on source edits alone. Each slice requires:

1. Focused tests and a clean diff check.
2. Raw normal and Googlebot SSR proof.
3. Hydration parity and mobile review.
4. Canonical, robots, schema, sitemap, and internal-link proof.
5. Lifecycle/data freshness proof.
6. Pinned production image/digest and public recheck if deployed.
7. Timed GSC observation after deployment; no ranking claim before it.

## Worktree boundary

The repository contains unrelated dirty backend, scraper, frontend hub, test, artifact, and Spec 058 changes. The first slice must avoid those overlapping files or use an isolated clean-snapshot rollout workflow. No reset or cleanup is permitted.
