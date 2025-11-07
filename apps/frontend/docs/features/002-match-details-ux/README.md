# Feature 002 – Match Details UI/UX Redesign (Frontend Docs)

This directory tracks frontend implementation notes, a11y/performance instrumentation, and test scripts.

## Live Data Channels
- Snapshot topic: `/topic/cricket.match.{matchId}.snapshot`
- Commentary topic: `/topic/cricket.match.{matchId}.commentary`
- REST fallback endpoints defined in `specs/002-match-details-ux/contracts/openapi.yaml`

## Accessibility Script Placeholder
(Add axe-core invocation script reference here once integrated; see tasks T042/T047.)

## Implementation Notes
- CSS-only styling: no SCSS. Use design tokens (custom properties) introduced in Feature 001.
- Virtualization required >200 commentary entries (target scalable to 1000 for memory NFR).

## Pending Additions
- Axe integration command
- Lighthouse CI configuration snippet
- Usability test checklist (snapshot comprehension)