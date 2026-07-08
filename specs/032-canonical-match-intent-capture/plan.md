# Implementation Plan: Canonical Match Intent Capture

**Branch**: `032-canonical-match-intent-capture` | **Date**: 2026-06-26 | **Spec**: `specs/032-canonical-match-intent-capture/spec.md`
**Input**: Feature specification from `/specs/032-canonical-match-intent-capture/spec.md`

## Summary

Strengthen the base `/cric-live/{slug}` page so it captures more live score, commentary, scorecard, lineup, toss, and preview intent without changing the canonical strategy. The phase keeps one canonical match URL, upgrades lifecycle-aware SEO copy, introduces an always-SSR-visible match intent snapshot rail, and adds real in-page anchors for commentary/scorecard/details. It intentionally does **not** split child routes into new self-canonical pages yet.

## Technical Context

**Language/Version**: TypeScript 3.2.x (Angular 7.2.x)  
**Primary Dependencies**: Angular SSR, `MatchSeoService`, `CricketOddsComponent`, `match-canonical-policy.ts`, Angular templates + CSS  
**Storage**: None  
**Testing**: Angular unit tests where practical, raw SSR HTML inspection, targeted match SEO audit script, production-like URL checks for upcoming/live/completed samples  
**Target Platform**: `apps/frontend`  
**Project Type**: Frontend-only monorepo slice  
**Performance Goals**: Preserve current SSR behavior and avoid introducing route churn or duplicate indexed surfaces  
**Constraints**: Keep `/cric-live/{slug}` canonical stable; do not self-canonicalize child surfaces; do not reduce H1 or JSON-LD quality from prior specs; keep copy honest when data is missing  
**Scale/Scope**: Focused frontend SEO and template pass across `match-seo.service.ts`, `cricket-odds.component.ts`, `cricket-odds.component.html`, and companion specs/CSS if needed

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time Data Accuracy | PASS | The phase improves how real match state is explained in SSR HTML without inventing unavailable data. |
| II. Monorepo Architecture Standards | PASS | Work stays inside the frontend app and existing match SEO layer. |
| III. REST API Design Standards | PASS | No API contract changes. Existing match and scorecard data are reused. |
| IV. Testing Requirements | PASS | Verification includes raw SSR HTML, frontend specs where useful, and SEO audit checks. |
| V. Performance Standards for Live Updates | PASS | No new polling or heavier live-update loops; only SSR-visible copy and structure improvements. |
| VI. Frontend UI/UX Standards | PASS | The page becomes clearer for both crawlers and users without route churn or duplicated surfaces. |

## Project Structure

### Documentation (this feature)

```text
specs/032-canonical-match-intent-capture/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/frontend/src/app/
├── seo/
│   ├── match-seo.service.ts
│   └── match-seo.service.spec.ts
└── cricket-odds/
    ├── cricket-odds.component.ts
    ├── cricket-odds.component.html
    ├── cricket-odds.component.css
    └── cricket-odds.component.lifecycle.spec.ts

scripts/
└── Audit-MatchSeo.ps1
```

**Structure Decision**: This is a frontend-only implementation slice. The canonical policy file remains a guardrail reference, but this phase should not change its disposition map unless verification reveals a bug. The main work lives in SEO copy helpers and SSR-visible template structure.

## Execution Order

1. **Lifecycle-aware metadata pass**
   - Update `MatchSeoService` so upcoming, live, and completed match pages generate distinct title, H1, description, and summary text.
   - Keep titles readable and concise while introducing stronger intent phrases such as scorecard, commentary, preview, or playing XI where appropriate.
   - Preserve one canonical path across lifecycle states and child-route aliases.

2. **Always-visible intent snapshot rail**
   - Add a compact SSR-visible rail directly below the hero.
   - Each card/summary should cover one intent cluster:
     - commentary/live updates
     - scorecard/result state
     - lineups/playing XI
     - match details (venue, toss, start time, status)
   - Move this rail outside deeper tab dependence so it is present regardless of the currently active tab.

3. **Lifecycle-aware summary helpers**
   - Add helpers in `CricketOddsComponent` that summarize commentary, scorecard, lineups, and match details differently for upcoming, live, and completed states.
   - Use real data when available.
   - Use honest placeholders when data is absent.

4. **Fragment-link and section-ID pass**
   - Add visible in-page links like `#commentary`, `#scorecard`, and `#match-info`.
   - Ensure the target sections have stable IDs in the actual SSR HTML.
   - Preserve the current tab UX; fragment links are structural support, not a new route strategy.

5. **Verification**
   - Verify upcoming, live, and completed samples in raw SSR HTML.
   - Verify `/scorecard` and `/commentary` child routes still canonicalize to base.
   - Rerun the SEO audit to ensure no regression in canonical, H1, or JSON-LD behavior.

## Recommended Copy Direction

The implementation should use a consistent lifecycle-aware framing rather than one generic phrase:

- **Upcoming**: emphasize `live score`, `match preview`, `playing XI`, `toss`, `start time`
- **Live**: emphasize `live score`, `commentary`, `scorecard`, `playing XI`, `current match state`
- **Completed**: emphasize `match result`, `full scorecard`, `innings summary`, `result context`

The copy should not pretend that commentary or lineups exist before they do. Placeholder wording must stay explicit, for example:

- "Playing XI will appear once the teams are confirmed."
- "Detailed scorecard will populate when innings data is available."
- "Ball-by-ball commentary appears here once live updates begin."

## Verification Approach

1. **Raw SSR HTML inspection**
   - Check one upcoming, one live, and one completed sample `/cric-live/{slug}` page.
   - Assert title, H1, description, snapshot-rail headings, and visible fragment links exist.
   - Confirm the sampled child aliases `/scorecard` and `/commentary` still point canonical back to the base page.

2. **Focused frontend/spec checks**
   - Add or update tests around lifecycle-aware SEO copy and any new helpers.
   - Keep tab-default tests from Spec 026 intact.

3. **SEO audit rerun**
   - Use the repo match SEO audit or health audit to confirm no regression in canonical, H1 count, robots, or JSON-LD.

4. **Competitor sanity check**
   - Recheck one CREX and one Cricbuzz sample after implementation to confirm the intended direction still reflects the market pattern without copying route churn blindly.

## Risks And Mitigations

- **Risk**: Overstuffed titles or H1s become spammy.
  **Mitigation**: Keep one primary intent phrase per lifecycle plus one supporting phrase; prefer readability over keyword stacking.

- **Risk**: Snapshot rail duplicates too much text from deeper sections.
  **Mitigation**: Keep it compact and summary-driven; use it as an overview layer, not as a second full details section.

- **Risk**: Fragment links do not align with rendered IDs.
  **Mitigation**: Verify raw SSR HTML directly and add stable IDs where missing.

- **Risk**: Team may misread this phase as approval for self-canonical child pages.
  **Mitigation**: Preserve explicit guardrails in code and verification: child routes remain aliases in this phase.

## Definition of Done

- Upcoming, live, and completed canonical match pages each emit stronger lifecycle-aware title, H1, description, and summary copy.
- The canonical page exposes an SSR-visible match intent snapshot rail for commentary, scorecard, lineups, and match details.
- Visible fragment links and matching section IDs exist in raw SSR HTML.
- `/scorecard` and `/commentary` child routes still fold canonical back to the base `/cric-live/{slug}` page.
- Match SEO verification shows no regression in canonical tags, robots, H1 count, or JSON-LD.
- The phase finishes without route-family changes or self-canonical child-route rollout.
