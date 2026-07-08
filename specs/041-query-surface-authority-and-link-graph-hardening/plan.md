# Implementation Plan: Query Surface Authority And Link Graph Hardening

**Branch**: `041-query-surface-authority-and-link-graph-hardening` | **Date**: 2026-06-29 | **Spec**: `specs/041-query-surface-authority-and-link-graph-hardening/spec.md`  
**Input**: Feature specification from `/specs/041-query-surface-authority-and-link-graph-hardening/spec.md`

## Summary

Crickzen’s next SEO phase should stop treating page-level validity as the main open problem. The next gain comes from clarifying which surfaces own which intents and from strengthening the internal-link graph between them.

This phase uses the existing canonical and freshness surfaces, then hardens:

1. authority by page type
2. hub-to-surface internal linking
3. completed/result retention
4. documented off-page authority follow-up

## Technical Context

**Primary Goal**: Make page-purpose ownership explicit and strengthen the crawl graph that connects canonical, freshness, hub, series, and archive surfaces.

**Stack**:
- Angular 7 frontend under `apps/frontend`
- Spring Boot backend under `apps/backend/spring-security-jwt`
- Existing match/freshness link utilities in `apps/frontend/src/app/seo`
- Existing hub/discovery pages in `apps/frontend/src/app/home`, `features/matches`, and `features/stats/series-page`

**Constraints**:
- do not reopen canonical route churn
- do not introduce thin or broken support URLs
- do not bloat hub pages with unreadable link dumps
- preserve deduplication and SSR visibility

## Current Repo Baseline

### Already present

- canonical `/cric-live/{slug}` pages with strong intent support
- preview/live-update/result support route family
- homepage support-link cluster logic
- `/matches` support-link cluster logic
- series grouped canonical upcoming links
- completed/archive hub references

### Still shallow or missing

- support-link clusters on home and `/matches` only sample one URL per lifecycle bucket
- series discovery does not yet expose explicit preview-support links
- query ownership exists across scattered code and specs, but not in one consolidated phase artifact
- backlink strategy is still implied rather than tracked

## Detailed Ownership Contract

### Canonical `/cric-live/{slug}`

- Owns: live score, scorecard, commentary, toss, lineups, and match-detail utility
- Supports: related preview, live-update, and result surfaces
- Must not drift into: thin article recap or generic tournament-list behavior

### Preview support page

- Owns: preview, pitch report, weather, toss timing, probable XI
- Supports: early discovery and prematch long-tail
- Must not drift into: live utility or result ownership

### Live-update support page

- Owns: latest developments, live updates, key moments, today-match freshness phrasing
- Supports: match-day freshness coverage
- Must not drift into: duplicating the canonical scorecard/commentary surface with no added value

### Result support page

- Owns: result, highlights, recap, post-match follow-up
- Supports: completed-match long-tail and archive retention
- Must not drift into: live-match or prematch ownership

### Hubs

- `/matches` owns broad lifecycle browsing
- `/series` owns tournament navigation and fixture-to-match transitions
- `/live-score/archive` owns retained completed discovery

The implementation should keep these distinctions visible in titles, summaries, and link destinations.

## Implementation Slices

### Slice A - Query ownership matrix

Create the consolidated ownership contract across:
- canonical match page
- preview page
- live-update page
- result page
- matches hub
- series hub
- archive surface

### Slice B - Richer freshness clusters on home and `/matches`

Refactor the current one-link-per-state sampling into a reusable helper that:
- chooses the right support page by lifecycle
- supports multiple qualifying matches
- deduplicates URLs cleanly
- stays readable in SSR HTML

### Slice C - Series -> preview support

Extend `/series` discovery cards so qualifying upcoming matches can expose:
- canonical match link
- explicit preview-support link

### Slice D - Result retention framing

Use the same support-link logic to keep recent completed matches connected to result-support URLs from hub surfaces.

### Slice E - Backlink and linkable-asset backlog

Document the non-code SEO workstream, likely as:
- embeddable live score widgets
- embeddable scorecards
- match/series datasets
- API or scoreboard snippets
- publisher-facing assets for local leagues and tournaments

This slice is intentionally backlog-oriented in this phase. The expected output is a durable roadmap section, not a pretend code implementation.

## Acceptance Mapping

- `FR-002` maps to the ownership matrix and detailed ownership contract in the phase docs
- `FR-003` and `FR-004` map to the richer support-link cluster helper and hub usage
- `FR-006` maps to the `/series` preview-support link implementation
- `FR-008` maps to the linkable-asset backlog section
- `FR-009` remains open until raw SSR verification is completed

## Current Implementation Status

Already implemented in this phase:

- reusable multi-link freshness-support helper
- homepage support-link cluster upgrade
- `/matches` support-link cluster upgrade
- `/series` preview-support links
- focused helper tests and TypeScript compile verification

Still pending:

- raw SSR runtime proof on `/`, `/matches`, and `/series`
- explicit follow-up backlog itemization for result-retention deepening and off-page rollout sequencing

## Verification Strategy

1. Focused unit coverage for new support-link helper behavior
2. Existing component logic checks for home and `/matches`
3. Raw SSR HTML proof after build/restart on:
   - `/`
   - `/matches`
   - `/series`
4. Spot checks that support links deduplicate and preserve the correct lifecycle page type

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hubs expose too many support links | weaker UX and noisy crawl blocks | cap per lifecycle bucket and deduplicate |
| Wrong lifecycle page chosen for a match | query confusion | centralize lifecycle-to-support selection in one helper |
| Series preview links overshadow canonical links | tournament UX becomes noisy | keep preview links visually secondary |
| Backlink backlog remains aspirational | strategy loses momentum after code ships | preserve explicit follow-up tasks and backlog ownership |
