# Feature Specification: Match URL Lifecycle and Canonical Intent Map

**Feature Branch**: `019-match-url-lifecycle`  
**Created**: 2026-06-07  
**Status**: Draft  
**Input**: Roadmap phase from `docs/LIVE_MATCH_SEO_PHASE_ROADMAP.md` to define stable canonical behavior for match URLs before deeper page-type expansion.

## Current Evidence

- `specs/015-long-tail-match-seo/` already established canonical recovery for the active `/cric-live/{slug}` route family.
- `specs/018-match-discovery-link-graph/` strengthened discovery links, but it intentionally did not settle which match sub-surfaces should self-canonicalize versus fold back to the base match URL.
- The frontend route matcher in `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts` already accepts multi-segment `/cric-live/*` forms and normalizes them back to one `:path` slug.
- `apps/frontend/src/app/core/utils/match-utils.ts` still recognizes legacy endings such as `/live`, `/scorecard`, `/info`, `/match-scorecard`, and `/match-details`.
- `apps/frontend/src/app/seo/match-seo.service.ts` currently self-canonicalizes valid match pages to `/cric-live/{slug}`, but it does not yet encode an explicit policy map for future live/commentary/scorecard/report intent splits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One Stable Base Match URL Survives The Match Lifecycle (Priority: P1)

As a search user or crawler, I want the same base match URL to remain the primary canonical entity through pre-match, live, and completed states so ranking signals do not fragment across lifecycle changes.

**Why this priority**: The roadmap depends on a single durable match entity URL before any route expansion or page-type enrichment can be safe.

**Independent Test**: Build canonical metadata for sample upcoming, live, and completed matches and verify they all resolve to the same base `/cric-live/{slug}` canonical URL.

**Acceptance Scenarios**:

1. **Given** a match is upcoming, **When** canonical metadata is generated, **Then** the base `/cric-live/{slug}` URL remains canonical.
2. **Given** the same match becomes live, **When** canonical metadata is generated again, **Then** the canonical URL stays on the same base `/cric-live/{slug}` path instead of switching to a live-only alias.
3. **Given** the same match completes, **When** canonical metadata is generated, **Then** the canonical URL still stays on the same base match path unless a later approved phase explicitly introduces a separate post-match canonical.

---

### User Story 2 - Child Match Surfaces Follow An Explicit Canonical Policy (Priority: P1)

As a developer shipping match-page SEO, I want a clear rule for live, commentary, scorecard, and report surfaces so we only self-canonicalize URLs that serve truly distinct intent.

**Why this priority**: Without a written and implemented policy, future route work will create duplicate or competing pages by accident.

**Independent Test**: Evaluate sample child-surface requests and verify each one either self-canonicalizes or canonicalizes back to the base match URL according to the policy map.

**Acceptance Scenarios**:

1. **Given** a child surface is currently only a tab, section, or wrapper around the same core match content, **When** metadata is generated, **Then** it canonicalizes back to the base match URL.
2. **Given** a child surface is not yet approved as independently indexable, **When** the route is requested, **Then** it must not present itself as a competing canonical page.
3. **Given** a future surface is explicitly marked as distinct and index-worthy, **When** policy evaluation runs, **Then** the code path can support self-canonicalization without rewriting the whole match SEO layer.

---

### User Story 3 - Duplicate Or Legacy Match Route Forms Collapse Safely (Priority: P2)

As a crawler hitting older or malformed match URLs, I want duplicate route forms to collapse back to the canonical match entity URL or fail safely so the index does not accumulate low-value variants.

**Why this priority**: Legacy CREX-derived suffixes and multi-segment aliases already exist in the current route inputs.

**Independent Test**: Run sample requests for legacy route forms and verify they resolve to one canonical decision: base canonical, safe fallback, or noindex handling.

**Acceptance Scenarios**:

1. **Given** a requested route contains legacy endings such as `/live`, `/scorecard`, or `/match-scorecard`, **When** the route is normalized, **Then** it maps back to the canonical base slug unless Phase 2 explicitly approves a distinct child URL.
2. **Given** a requested route contains an unknown child suffix, **When** canonical metadata is generated, **Then** the page does not create a new indexable canonical variant by accident.
3. **Given** the requested route cannot be resolved to a reliable canonical slug, **When** SEO metadata is generated, **Then** the page falls back to safe noindex behavior instead of emitting a fake canonical target.

### Edge Cases

- A match may move from upcoming to live to completed without a route change.
- A crawler may request older CREX-style suffix routes long after the base match page has been normalized.
- The route matcher may receive multi-segment `/cric-live/*` paths even though the current app renders one match component.
- Some future surfaces may deserve distinct URLs later, but Phase 2 should not grant that by default before page content proves unique intent.
- Numeric or broken aliases must not become canonical just because they are routable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The phase MUST define one base canonical match entity URL for the active public route family `/cric-live/{slug}`.
- **FR-002**: The base match URL MUST remain canonical across upcoming, live, and completed lifecycle states unless a later approved phase introduces a justified exception.
- **FR-003**: The phase MUST define an explicit canonical policy for child match surfaces, including live, commentary, scorecard, and report intents.
- **FR-004**: Child surfaces that are not yet approved as distinct indexable pages MUST canonicalize to the base match URL rather than competing with it.
- **FR-005**: Legacy suffix routes and duplicate route forms MUST normalize to the canonical policy map instead of inventing separate canonical targets.
- **FR-006**: Unknown or unresolved match route forms MUST fail safely with noindex behavior or a base canonical fallback rather than indexable duplicates.
- **FR-007**: Canonical policy decisions MUST be encoded in shared SEO or route utilities rather than duplicated across components.
- **FR-008**: Verification for this phase MUST prove canonical behavior on representative upcoming, live, completed, legacy, and unresolved match-route samples.
- **FR-009**: The phase MUST preserve the current public base match route family as `/cric-live/{slug}`.

### Key Entities

- **Base Match Entity URL**: The primary canonical URL for a match, currently `/cric-live/{slug}`.
- **Child Match Surface**: A live, commentary, scorecard, report, or other match-specific view that may share or diverge from the base URL.
- **Legacy Match Alias**: An older or duplicate route form such as `/live`, `/scorecard`, or other suffix-based variants.
- **Canonical Policy Map**: Shared logic that decides whether a requested route self-canonicalizes, folds to the base URL, or fails safely.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sample upcoming, live, and completed states for the same match all resolve to the same base canonical URL.
- **SC-002**: Sample child-surface requests no longer rely on ad hoc canonical behavior; each one follows the documented policy map.
- **SC-003**: Legacy route forms such as `/live`, `/scorecard`, or `/match-scorecard` collapse to the approved canonical target or safe fallback.
- **SC-004**: Unresolved or malformed match routes do not emit competing indexable canonicals.
- **SC-005**: The repo gains focused verification coverage for canonical lifecycle behavior before Phase 3 page enrichment begins.
