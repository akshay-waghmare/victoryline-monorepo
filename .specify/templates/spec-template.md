# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Constitution and Evidence Boundaries *(mandatory for CrickZen features)*

- **Constitution version consulted**: [e.g., 1.4.0]
- **Wiki constitution/checkpoint consulted**: [wikilink or path]
- **Canonical surface and lifecycle owner**: [Which URL/service owns the truth?]
- **Source-backed facts**: [Which provider, catalogue, snapshot, or model evidence is valid?]
- **Indexability boundary**: [What may be indexable, noindex, 404, or withheld until data is ready?]
- **Proof boundary**: [Separate local tests, runtime/artifact proof, GSC outcomes, and business outcomes]
- **Rollback and continuity**: [Rollback artifact, isolated rollout boundary, and wiki/spec update]
- **Managed-slate and provider boundary**: [Selection cap/stickiness, per-match freshness,
  provider identity scope, and fallback behavior]
- **Navigation and latency boundary**: [Immediate shell, canonical route, Back/history contract,
  provider latency measurement, and no fabricated identity]
- **Production image inventory**: [Service tags, immutable digests, rollback references, and
  escalation/alert destination]

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]
- **FR-UI-001**: For user-facing page changes, the spec MUST state what content owns the
  above-the-fold area and why.
- **FR-UI-002**: The spec MUST identify any hero facts and confirm they are not duplicated
  by nearby support modules.
- **FR-UI-003**: The spec MUST mark secondary SEO/support content as either directly visible
  because it is primary, or progressively disclosed because it is optional.
- **FR-TRUTH-001**: The spec MUST define how stale, empty, placeholder, invalid, or
  semantically default data is withheld from indexable output.
- **FR-TRUTH-002**: The spec MUST define the authoritative source for identity, lifecycle,
  schedule, score, and probability facts when more than one surface is involved.
- **FR-TRUTH-003**: The spec MUST define any bounded managed-live slate, its sticky release rule,
  and per-managed-match freshness/watchdog evidence.
- **FR-NAV-001**: Provider-resolution routes MUST define canonicalization, sanitized return paths,
  native/visible Back behavior, and the immediate truthful loading state.
- **FR-OPS-001**: The spec MUST name deployed image tags/digests, rollback artifacts, and the
  admin-visible escalation path for repeated or unresolved production failures.
- **FR-EVIDENCE-001**: The spec MUST distinguish technical readiness from Google discovery,
  indexing, ranking, traffic, engagement, AI citation, and business outcomes.
- **FR-CONTINUITY-001**: The spec MUST identify the rollback boundary and the durable wiki
  or checkpoint update required when the feature creates a CrickZen decision or checkpoint.

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
- **SC-UI-001**: [For changed user-facing screens, users can identify the primary match/page
  state from the first viewport without relying on duplicate summary blocks]
- **SC-EVIDENCE-001**: [The changed surface has an explicit verification result and does not
  claim an external outcome that was not measured]
