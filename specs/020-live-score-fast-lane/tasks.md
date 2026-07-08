---
description: "Task list for the live score fast-lane implementation"
---

# Tasks: Live Score Fast Lane

**Input**: Design documents from `/specs/020-live-score-fast-lane/`  
**Generated**: 2026-06-10

## Phase 1: Research And Documentation

- [x] T001 Measure production live-match update behavior and scraper fast-lane state
- [x] T002 Compare Crickzen with the local `betx21.live` update architecture
- [x] T003 Create the Spec Kit specification and implementation plan

## Phase 2: Scraper Fast Lane

- [x] T004 Enable persistent pages and fast updates in production defaults
- [x] T005 Expose fast-lane coverage and capacity through scraper health
- [x] T006 Add focused scraper fast-lane status tests

## Phase 3: Atomic Snapshot Delivery

- [x] T007 Publish a complete merged backend snapshot while retaining legacy field topics
- [x] T008 Subscribe the live hero to the snapshot topic with merge-safe legacy fallback
- [x] T009 Add focused backend and frontend websocket tests

## Phase 4: Verification

- [x] T010 Run focused scraper tests
- [x] T011 Run focused backend tests and compile
- [x] T012 Run focused frontend tests and production build
- [x] T013 Record implementation and rollout evidence
