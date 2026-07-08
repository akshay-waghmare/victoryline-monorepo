# Tasks: Backend Freshness Narrative Engine

**Input**: Design documents from `/specs/040-backend-freshness-narrative-engine/`  
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1 - Backend summary contract

- [x] T001 Add backend DTOs for freshness summary, key events, and live-update entries.
- [x] T002 Implement backend event-to-text summary generation from commentary, match-info, and result signals.
- [x] T003 Compute a meaningful updated timestamp from visible freshness changes rather than generic cache churn.

## Phase 2 - API and frontend wiring

- [x] T004 Expose a backend freshness-summary endpoint for a match URL.
- [x] T005 Update the frontend freshness page to consume backend summary data for key events, narrative summary, and timestamps.
- [x] T006 Align frontend structured data dates and live-update entries to the backend summary contract.

## Phase 3 - Sitemap and verification

- [x] T007 Align freshness-support sitemap `lastmod` to the backend meaningful updated timestamp when available.
- [x] T008 Add focused backend tests for summary generation and sitemap timestamp alignment.
- [x] T009 Run targeted frontend type-check and backend tests to verify the slice.
