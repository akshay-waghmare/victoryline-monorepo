# Research: Upcoming and Completed Matches

**Feature**: `010-upcoming-completed-matches`  
**Date**: 2026-03-10

## Goal

Understand how CREX presents upcoming and completed matches, compare that to VictoryLine's current architecture, and identify the gaps that must be closed for a reliable implementation.

## External CREX Findings

### Schedule UX patterns observed

- CREX separates match states clearly across schedule-oriented surfaces.
- Upcoming fixtures emphasize start time and relative timing.
- Completed fixtures emphasize the final result summary.
- Lists are compact and optimized for quick scanning.
- Series/date context helps users browse multiple related fixtures.

### Product takeaways for VictoryLine

- Upcoming cards should prioritize teams, series/format context, and countdown/start time.
- Completed cards should prioritize teams and a one-line result summary.
- Users should not need to open a match detail page just to learn whether a game has not started or has already finished.

## Internal Codebase Findings

### What already exists

- The frontend already defines `UPCOMING`, `LIVE`, and `COMPLETED` in `MatchStatus`.
- The matches page already includes tabs for `All`, `Live`, `Upcoming`, and `Completed`.
- Frontend utilities already include filtering helpers for upcoming and completed states.
- Some heuristic status parsing already exists in the frontend transformation layer.

### What is missing

- Discovery currently targets live matches only.
- Upcoming matches are not ingested from CREX schedule pages today.
- Completed matches are not exposed as a first-class schedule feed for the matches page.
- Backend persistence relies too heavily on soft deletion and implicit finished logic.
- Required schedule fields such as explicit status and reliable start time are not modeled strongly enough for countdowns and result browsing.

## Subagent Summary

### Schedule/data flow analysis

- Frontend data flow currently starts from a live-only endpoint and transforms that into match cards.
- Existing `Upcoming` and `Completed` UI states are present, but they do not have a real upstream data source.
- Backend already has some finished-match concepts, but not a complete schedule-browsing model.

### CREX-specific implementation analysis

- Current scraper discovery navigates live-focused CREX surfaces and filters for live indicators.
- Upcoming and completed schedule states are therefore absent from the existing discovery pipeline.
- Explicit lifecycle modeling is recommended so the app does not infer schedule state from `isDeleted` alone.

## Recommended Implementation Shape

### Data model direction

Introduce a canonical schedule-oriented match record that includes:

- canonical match identifier
- teams
- series/context label
- format
- scheduled start time
- explicit lifecycle status
- latest update timestamp
- completed result summary where available

### API direction

Support status-aware schedule retrieval for the frontend, either with:

- a unified schedule endpoint plus status filter, or
- dedicated `upcoming` and `completed` endpoints

Either approach should preserve existing live APIs while enabling the current UI tabs to become real.

### Frontend direction

- Keep the existing tabs and card infrastructure.
- Replace live-only assumptions with status-aware data loading.
- Render countdowns for upcoming matches and one-line result summaries for completed matches.
- Distinguish zero-state, stale-state, and error-state messaging.

## Risks

- CREX schedule pages may expose inconsistent metadata.
- A live-first persistence model can create duplicates or incorrect transitions.
- Timezone handling can make upcoming countdowns appear wrong even when the source timestamp is correct.

## Open Questions for Planning

- What completed-retention window should VictoryLine guarantee before archival?
- Should the backend expose one unified schedule endpoint or dedicated per-status endpoints?
- Should the first release group matches by date, by series, or only sort them?
