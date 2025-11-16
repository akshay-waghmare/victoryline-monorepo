# Implementation Plan: Live Match Glance Layout

**Branch**: `005-live-match-glance` | **Date**: 2025-11-16 | **Spec**: `specs/005-live-match-glance/spec.md`
**Input**: Feature specification plus `asd.pdf` layout mock (desktop hero reference)

## Summary

Deliver a Crex-inspired, no-scroll hero for the live match page by lifting score, batters, bowler, odds, and staleness into a single responsive band. Angular 7 components will read from the existing `/cricket-data` snapshot DTO and render modular pods that align with the reference mock in `asd.pdf` while preserving accessibility and update performance dictated by the constitution.

**Update 2025-11-17**: Hero data source realigned to reuse the legacy `/cricket-data` DTO plus WebSocket patches; the experimental `/v1/matches/*` REST client is paused until public endpoints are available.

## Technical Context

**Language/Version**: TypeScript 3.2.x, Angular 7.2 CLI, HTML5, SCSS
**Primary Dependencies**: Angular core & router, RxJS 6.x, Angular Material 7 (layout primitives), internal design tokens
**Storage**: N/A (consumes snapshot/scorecard REST endpoints only)
**Testing**: Jasmine + Karma (component/service unit tests), Protractor E2E (smoke), axe-core CI audit
**Target Platform**: Web SPA (`apps/frontend`) served to desktop/tablet browsers
**Project Type**: Web frontend module within existing Angular app
**Performance Goals**: Hero paints key data ≤2.5s on Fast 3G, live updates propagate ≤5s from snapshot emit, maintain ≤500 KB main bundle
**Constraints**: Follow 8px grid tokens, WCAG 2.1 AA, respect reduced-motion, hero height ≤720px, staleness badges per constitution tiers
**Scale/Scope**: Single hero surface within `match-live` feature reused across all live fixtures (one Angular module, ~3 components, shared facade)

## Constitution Check

*Pre-Research Gate (PASS)*
- **I. Real-Time Data Accuracy**: PASS – reuses verified snapshot updates with staleness states from spec.
- **II. Monorepo Architecture Standards**: PASS – frontend-only changes interfacing with backend via existing REST services.
- **III. REST API Design Standards**: PASS – consumes `live-match-snapshot.yaml` contract without introducing new endpoints.
- **IV. Testing Requirements**: PASS – plan schedules Karma/Jasmine, targeted Protractor, and axe-core coverage.
- **V. Performance Standards for Live Updates**: PASS – hero update budget ≤5s, layout optimized for 60 fps swaps.
- **VI. Frontend UI/UX Standards**: PASS – honors 8px grid, accessibility checklist, and references `asd.pdf` for visual guidance.

*Post-Design Gate (re-evaluated 2025-11-16 – PASS)*
- Research resolved layout/source unknowns, data model & contracts align with constitution (see `/specs/005-live-match-glance/research.md` and `/specs/005-live-match-glance/contracts/live-match-snapshot.yaml`).

## Project Structure

### Documentation (this feature)

```text
specs/005-live-match-glance/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
   └── live-match-snapshot.yaml
```

### Source Code (repository root)

```text
apps/frontend/
├── src/
│   ├── app/
│   │   ├── match-live/
│   │   │   ├── components/
│   │   │   │   ├── live-hero/
│   │   │   │   │   ├── live-hero.component.ts
│   │   │   │   │   ├── live-hero.component.html
│   │   │   │   │   └── live-hero.component.scss
│   │   │   │   ├── hero-pod/
│   │   │   │   │   └── hero-pod.component.ts|html|scss
│   │   │   │   └── hero-condensed/
│   │   │   │       └── hero-condensed.component.ts|html|scss
│   │   │   ├── services/
│   │   │   │   ├── live-hero-data.adapter.ts
│   │   │   │   └── live-hero-state.service.ts
│   │   │   ├── match-live.module.ts
│   │   │   └── match-live-routing.module.ts
│   │   └── shared/
│   │       └── ui/
│   │           └── tokens/
│   │               └── live-hero.tokens.ts
│   └── assets/
│       └── mocks/
│           └── live-hero-snapshot.json
└── tests/
   └── match-live/
      ├── live-hero.component.spec.ts
      └── live-hero-state.service.spec.ts
```

**Structure Decision**: Extend `apps/frontend/src/app/match-live` with a dedicated `live-hero` component suite, adapter service, and shared tokens so the hero can integrate with existing match-live routing without disrupting other views.

## Phase 0 – Research (COMPLETE)

- Validated hero layout approach against Crex inspiration and `asd.pdf` mock, confirming modular pod strategy. (`research.md`)
- Confirmed data sourcing via `MatchApiService.getSnapshot` plus scorecard fallback; no backend changes required.
- Locked odds fallback behavior tied to jurisdiction toggles for graceful degradation.

## Phase 1 – Design & Contracts (COMPLETE)

- Authored `data-model.md` detailing `LiveMatchSnapshot`, `ParticipantSummary`, `BowlerSummary`, `OddsQuote`, and `StalenessSignal` interfaces with validation notes.
- Created OpenAPI contract `contracts/live-match-snapshot.yaml` representing the snapshot payload consumed by the hero.
- Documented local iteration workflow and validation checklist in `quickstart.md` (run frontend, load mock snapshot, verify no-scroll hero).
- Updated Copilot agent context via `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` (run 2025-11-16).

## Phase 2 – Implementation Plan (UPCOMING)

1. **Scaffold UI Shell**
  - Generate `live-hero` component tree under `match-live/components`, wire to routing entry.
  - Lay out CSS grid per `asd.pdf` mock using 8px spacing tokens and Angular Material layout utilities.
  - Introduce condensed sticky variant (`hero-condensed`) triggered on quick-link navigation or scroll threshold.

2. **Bind Data Layer**
  - Implement `live-hero-data.adapter.ts` to transform `LiveMatchSnapshot` into view models defined in `data-model.md`.
  - Connect to existing `MatchLiveFacade`/`MatchApiService` snapshot stream; ensure polling/websocket updates propagate.
  - Handle odds fallback, staleness tiers, and placeholder messaging per spec.

3. **Interactions & Accessibility**
  - Build quick-link sticky behavior preserving hero visibility when navigating to commentary/scorecard.
  - Add keyboard focus order, ARIA landmarks, and reduced-motion handling for player/bowler swap animations.
  - Surface analytics events for hero impressions, staleness warnings, odds visibility, and quick-link clicks.

4. **Testing & Validation**
  - Author Jasmine/Karma unit specs for data adapter and pod components (cover staleness/odds fallbacks, condensed mode triggers).
  - Add Protractor (or Cypress equivalent) smoke to confirm hero remains above the fold using viewport checks.
  - Run axe-core audit and Lighthouse (desktop) to certify accessibility/performance budgets.
  - Verify layout against `asd.pdf` mock and Crex reference on 1366x768 & 1024x768 landscapes; capture screenshots.

## Complexity Tracking

N/A – No constitution violations or extraordinary complexity identified.
