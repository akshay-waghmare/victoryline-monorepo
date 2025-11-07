# Quickstart (Phase 1) — Match Details UI/UX Redesign

This quickstart guides implementers to prototype and validate the Match Details page redesign.

## Prerequisites
- Branch: `002-match-details-ux`
- Spec: `specs/002-match-details-ux/spec.md`
- Plan: `specs/002-match-details-ux/plan.md`
- Contracts: `specs/002-match-details-ux/contracts/openapi.yaml`

## Frontend (Angular)
1) Create route `/match/:id` (if not present) and page shell with tabs: Summary, Commentary, Scorecard, Lineups, Info.
2) Implement Snapshot header component with staleness tiers and reduced-motion compliance.
3) Commentary tab: list (latest-first), page size 30, Load More appends older.
4) Scorecard tab: display innings, batting, bowling, extras, fall-of-wickets with accessible tables.
5) Lineups tab: show roles with accessible legend; highlight active batter/bowler when live.
6) Info tab: venue, toss, officials, format; show last updated timestamp.
7) A11y/pass: focus-visible, ARIA roles, keyboard nav; run axe locally or CI.

## Data Integration
- Use endpoints from `contracts/openapi.yaml`.
- If backend is not ready, mock responses in frontend service (fixtures) to unblock UI work.
- Polling: ≤5s refresh for snapshot and commentary head; staleness tiers per Constitution.

## Testing
- Unit tests (components/services) to cover rendering and state changes.
- E2E critical flow: load match, switch tabs, load more commentary, verify snapshot update.

## Validation
- Lighthouse mobile ≥90; Accessibility ≥90.
- Keyboard-only traversal of all interactive elements.
- Verify reduced motion disables animations.

## Optional Enhancements (post-MVP)
- Desktop compact mode toggle and persistence.
- WebSocket-based live updates.
- Partnerships and charts.
