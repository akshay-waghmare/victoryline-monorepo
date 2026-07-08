---
description: "Task list for Phase 032: canonical match intent capture"
---

# Tasks: Canonical Match Intent Capture

**Input**: Design documents from `/specs/032-canonical-match-intent-capture/`
**Generated**: 2026-06-26
**Branch**: `032-canonical-match-intent-capture`

**Prerequisites**: `spec.md`, `plan.md`

**Tests**: Raw SSR HTML inspection for upcoming/live/completed samples; focused Angular tests for lifecycle-aware SEO copy/helpers; child-route canonical verification; rerun of match SEO / health audit for canonical, H1, robots, and JSON-LD regressions.

## Phase 1: Documentation

- [ ] T001 Create `specs/032-canonical-match-intent-capture/spec.md`
- [ ] T002 Create `specs/032-canonical-match-intent-capture/plan.md`
- [ ] T003 Create `specs/032-canonical-match-intent-capture/tasks.md`

## Phase 2: US1 Lifecycle-Aware Top SEO Fields (Priority: P1)

**Goal**: Make the canonical `/cric-live/{slug}` page communicate the right lifecycle intent in title, H1, description, and summary instead of using one generic live/upcoming pattern.

**Independent Test**: Render one upcoming, one live, and one completed sample and verify the raw SSR title/H1/description better capture preview/commentary/scorecard intent.

### Tests for US1

- [ ] T004 [P] [US1] Add or update `apps/frontend/src/app/seo/match-seo.service.spec.ts` to assert distinct title/H1/description output for upcoming, live, and completed match states
- [ ] T005 [P] [US1] Add a spec asserting child-route aliases such as `/scorecard` still fold canonical to the base path while using the strengthened base-page SEO copy

### Implementation for US1

- [ ] T006 [US1] In `apps/frontend/src/app/seo/match-seo.service.ts`, replace the generic live/upcoming title pattern with lifecycle-aware title variants
- [ ] T007 [US1] In `match-seo.service.ts`, replace the generic live/upcoming H1 pattern with lifecycle-aware H1 variants that better capture preview/commentary/scorecard intent
- [ ] T008 [US1] In `match-seo.service.ts`, update description and summary helpers so upcoming/live/completed pages describe commentary, scorecard, toss, and playing XI honestly
- [ ] T009 [US1] Verify the strengthened copy remains readable and avoids repetitive keyword stuffing

**Checkpoint**: The canonical page speaks clearly about preview, commentary, and scorecard intent in its top SEO fields without changing canonicals.

---

## Phase 3: US2 Always-Visible Match Intent Snapshot Rail (Priority: P1)

**Goal**: Add a compact SSR-visible rail below the hero that surfaces commentary, scorecard, lineups, and match-info intent regardless of which tab is active.

**Independent Test**: Fetch raw SSR HTML for a match page and verify the snapshot rail exists below the hero with compact summaries for the main match-intent surfaces.

### Tests for US2

- [ ] T010 [P] [US2] Add focused component/spec coverage for any new lifecycle-aware summary helpers used by the snapshot rail
- [ ] T011 [P] [US2] Add a template-level assertion or targeted HTML check that the snapshot rail renders commentary, scorecard, lineups, and match-details summary blocks

### Implementation for US2

- [ ] T012 [US2] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`, add helpers that summarize commentary, scorecard, lineups, and match details for upcoming, live, and completed states
- [ ] T013 [US2] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`, render a compact snapshot rail directly below the hero and above deeper tab content
- [ ] T014 [US2] Ensure the snapshot rail remains SSR-visible regardless of which tab is selected by default
- [ ] T015 [US2] In `cricket-odds.component.css`, style the rail so it reads as a compact overview layer rather than a second full details section

**Checkpoint**: The canonical page exposes a strong overview layer for scorecard/commentary/lineup intent before any tab interaction.

---

## Phase 4: US4 Honest Lifecycle Summaries (Priority: P2)

**Goal**: Keep intent capture truthful when commentary, scorecard, or lineups are not yet available.

**Independent Test**: Compare one upcoming, one live, and one completed match page and confirm the rail and summary helpers use state-appropriate copy and placeholders.

### Tests for US4

- [ ] T016 [P] [US4] Add helper/spec coverage for the "not yet available" copy paths for lineups, commentary, and scorecard

### Implementation for US4

- [ ] T017 [US4] In `cricket-odds.component.ts`, add explicit placeholder copy for upcoming pages without confirmed lineups, toss, or scorecard data
- [ ] T018 [US4] In `cricket-odds.component.ts`, add live-state copy that prefers latest commentary or current status when available
- [ ] T019 [US4] In `cricket-odds.component.ts`, add completed-state copy that foregrounds result and innings/scorecard context over preview phrasing

**Checkpoint**: Stronger intent capture does not depend on misleading or fake live phrasing.

---

## Phase 5: US3 In-Page Intent Anchors (Priority: P2)

**Goal**: Make the canonical page structurally clearer with visible jump links and matching section IDs, without creating duplicate route families.

**Independent Test**: Inspect raw SSR HTML and verify `href="#commentary"`, `href="#scorecard"`, and `href="#match-info"` style links exist with matching section IDs.

### Tests for US3

- [ ] T020 [P] [US3] Add a targeted HTML assertion or static check that visible fragment links for commentary, scorecard, and match details are rendered

### Implementation for US3

- [ ] T021 [US3] In `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`, add visible jump links for commentary, scorecard, and match details near the snapshot rail or hero support area
- [ ] T022 [US3] Add stable `id` attributes to the corresponding commentary, scorecard, lineups, and match-details sections in `cricket-odds.component.html`
- [ ] T023 [US3] Verify that the current tab UX still works and that child-route intent remains a UX concern rather than a new SEO split

**Checkpoint**: The base canonical page has real internal structure signals without route churn.

---

## Phase 6: Guardrails And Regression Proof

**Goal**: Ship the stronger canonical page without accidentally splitting canonicals or breaking prior SEO hardening.

**Independent Test**: Verify `/scorecard` and `/commentary` still canonicalize to base, and rerun the SEO checks for canonical/H1/JSON-LD.

### Implementation

- [ ] T024 In `apps/frontend/src/app/seo/match-canonical-policy.spec.ts` or related specs, confirm child-route canonical folding behavior remains unchanged
- [ ] T025 Verify no code in this phase changes the canonical disposition map or introduces self-canonical child-route behavior

## Phase 7: End-to-End Verification

- [ ] T026 Run focused frontend tests for `match-seo.service` and any updated `cricket-odds` helper coverage
- [ ] T027 Start local SSR or use a production-like build; inspect one upcoming, one live, and one completed `/cric-live/*` page in raw HTML for title, H1, description, snapshot rail, and fragment links
- [ ] T028 Verify `/cric-live/{slug}/scorecard` and `/cric-live/{slug}/commentary` still return the base canonical URL
- [ ] T029 Rerun the match SEO audit / health audit and confirm no regression in canonical, robots, H1 count, or JSON-LD
- [ ] T030 Compare the final page shape against one CREX and one Cricbuzz sample and document whether the canonical page now captures scorecard/commentary intent more clearly without copying their route families
- [ ] T031 Roll out via the `crickzen-frontend-prod-rollout` skill only after local verification passes and the guardrails remain intact

## Change Log

| Date       | Version | Description                   | Author |
|------------|---------|-------------------------------|--------|
| 2026-06-26 | 0.1     | Initial draft from research.  | Codex |
