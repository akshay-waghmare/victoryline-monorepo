# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Real-time data path preserves freshness, timestamps, and degraded-state behavior.
- Provider discovery, match identity aliases, lifecycle state, and score semantics remain
  authoritative; fresh timestamps alone do not establish correctness.
- Any bounded live-management slate is sticky across discovery cycles and restarts, and
  freshness/watchdog coverage is proven per managed match rather than by aggregate coverage.
- Provider short keys are scoped by the verified team/format family or full source URL; player
  resolution uses a selected-match provider URL and canonical navigation does not fabricate IDs.
- Service boundaries remain frontend -> backend -> scraper with contract-safe changes only.
- Canonical ownership remains on `/cric-live/{slug}`; public prediction, operator, share,
  embed, and internal surfaces retain their defined host/indexability boundaries.
- Tests and verification cover the touched surfaces at the appropriate layer.
- The plan names exact runtime/artifact proof, public or authenticated verification, and a
  rollback path; source edits and health checks alone are not completion evidence.
- Technical crawlability/SSR/schema proof is kept separate from GSC discovery, indexing,
  ranking, traffic, engagement, AI citation, and business outcomes.
- Dirty-tree rollouts use an isolated clean snapshot and preserve unrelated work and storage.
- For frontend/live-score work: above-the-fold content serves the primary user task first.
- Hero-owned facts are not duplicated by nearby summary or "at a glance" blocks.
- Secondary SEO/support modules are lower on the page or intentionally progressively disclosed.
- Planned UX changes do not trade hero clarity for SEO copy or link clusters.
- Indexable AEO content contains only populated source-backed facts; loading, error,
  placeholder, stale, or unsupported prediction copy is excluded.
- Provider-backed navigation plans cover the immediate loading shell, canonical route, browser
  history/Back behavior, and the provider-latency boundary when a secondary page is involved.
- Prediction-model plans record market/incumbent/candidate probabilities in batting-team
  orientation on the same state rows, retain per-ball inference inputs, and define the
  chronological Brier/log-loss/ECE review and explicit promotion boundary when applicable.
- Production plans name every deployed service image with an immutable digest, a rollback
  image or backup, and any admin-visible escalation path for repeated failures.
- The plan identifies the constitution version and the related wiki constitution/checkpoint
  that were consulted; durable outcomes include a wiki synchronization task.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
