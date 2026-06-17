# Tasks: Live Score Hub Intent Refinement

## Phase 0 - Spec Kit

- [x] T001 Create `spec.md` for Phase 2 ranking-intent refinement.
- [x] T002 Create `plan.md` with frontend-only architecture and validation.
- [x] T003 Create this `tasks.md` checklist.

## Phase 1 - Hub Content And Intent

- [x] T004 Extend hub route configuration with unique section headings, descriptions, and FAQs.
- [x] T005 Add visible FAQ blocks to hub pages.
- [x] T006 Make match cards show route-appropriate context lines.
- [x] T007 Keep hub-to-hub links visible on every hub route.
- [x] T007a Add `/live-cricket-score` as a real keyword-focused hub instead of routing it to the homepage.

## Phase 2 - Link Graph Refinement

- [x] T008 Split sitemap fallback links into primary and discovery sets.
- [x] T009 Use route-specific fallback slices/filters so hubs are not identical.
- [x] T010 Preserve enough crawlable `/cric-live/` links in raw SSR HTML.
- [x] T010a Add `/live-cricket-score` to sitemap and production raw HTML audit coverage.

## Phase 3 - Audit Tooling

- [x] T011 Add production raw HTML audit script for hubs and one match page.
- [x] T012 Include FAQ, JSON-LD, canonical, H1, title/meta, robots, and match-link counts.

## Phase 4 - Verification

- [x] T013 Run frontend app TypeScript no-emit check.
- [x] T014 Run frontend server TypeScript no-emit check.
- [x] T015 Run the production raw HTML audit script where network is available. Current prod is expected to fail FAQ checks until this Phase 2 frontend is deployed.
- [ ] T016 Summarize files changed, hub-specific improvements, link counts, FAQ proof, match long-tail proof, remaining risks, and Phase 3 recommendation.
