# Launch Readiness Checklist

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Pre-stack execution checklist

## Purpose

This checklist is the exact pre-launch and pre-indexing pass for the first public `Match Intelligence` release.

It is designed to answer one question:

`Can we safely start the local stack, verify the route, and know what still blocks launch?`

## Current Status Snapshot

### Already done

- `/match-intelligence/{slug}` route exists
- canonical match-page CTA exists
- lifecycle-aware shell exists for upcoming, live, and completed matches
- richer explanation UI is implemented:
  - `What changed`
  - `Why it changed`
  - `What matters next`
  - utility cards
  - turning-point framing
- `prediction_view`, `prediction_interaction`, `model_unavailable`, `intelligence_cta_*`, and `explanation_expand` are wired
- frontend SSR build passes locally

### Not yet proved on the running stack

- direct browser route verification
- refresh and back-button behavior
- keyboard and screen-reader behavior
- mobile layout behavior
- real sample-match content quality across upcoming, live, and completed states
- proof that only public-safe fields are rendered

## Step 1: Local Stack Start

- [x] Docker Desktop engine is running
- [x] `docker compose -f docker-compose.local.yml up -d --build` succeeds
- [x] frontend container is recreated
- [x] backend and scraper containers are healthy
- [x] `http://localhost:5000/health` responds
- [ ] `http://localhost:8080/Home` responds

## Step 2: Route Verification

Check at least one eligible match per lifecycle:

- [ ] upcoming sample opens `/match-intelligence/{slug}`
- [x] live sample opens `/match-intelligence/{slug}`
- [ ] completed sample opens `/match-intelligence/{slug}`
- [ ] each sample has a valid return path to `/cric-live/{slug}`
- [x] direct refresh works on the intelligence route
- [ ] browser back returns correctly to the canonical match surface

## Step 3: UX And Accessibility Verification

- [ ] CTA is visible and understandable on eligible canonical match pages
- [ ] CTA is hidden or honestly explained when model data is unavailable
- [x] page works on mobile width without broken layout
- [ ] keyboard users can reach CTA, modules, and return path
- [ ] detail modules are usable by keyboard
- [ ] screen-reader labels for breadcrumb, CTA, and expandable modules are acceptable

## Step 4: Public-Safe Data Verification

- [x] no operator-only dashboard controls are visible
- [x] no bet history or customer-account state is visible
- [x] no raw blend or raw model-weight language is visible
- [x] no raw commentary dump is used as the core explanation block
- [x] stale or missing data is labeled honestly
- [x] probability is described as informational, not certain

## Step 5: SEO Gate Verification

- [x] route is `noindex,follow`
- [ ] route is absent from sitemaps
- [ ] canonical page remains `/match-intelligence/{slug}` for the intelligence surface itself
- [ ] canonical match page remains `/cric-live/{slug}`
- [ ] visible body content is meaningfully distinct from the canonical score page
- [ ] internal discovery exists from the canonical page CTA

## Step 6: Analytics Verification

- [x] `intelligence_cta_impression` fires once per eligible view
- [x] `intelligence_cta_click` fires on CTA click
- [x] `prediction_view` fires on route view
- [x] `prediction_interaction` fires for module and utility interactions
- [x] `explanation_expand` fires on explanation module expand
- [x] `model_unavailable` fires only when model data is missing
- [x] event payload includes match path, intelligence path, lifecycle, and surface

## Step 7: Launch Decision

### Safe to launch free internally if

- local stack route behavior is correct
- explanation copy is public-safe
- analytics events are visible in the configured destination
- noindex and sitemap exclusion are confirmed

### Not ready for indexing if any of these are still true

- explanation is mostly fallback copy
- unique value over the canonical page is weak
- direct refresh or SSR metadata is unstable
- sampled lifecycle pages do not maintain content-to-metadata parity
- there is no real traffic and event baseline yet

## Recommended Immediate Execution Order

1. Start the local stack
2. Verify the three sample lifecycle pages
3. Verify analytics payloads
4. Verify noindex and sitemap exclusion
5. Record pass or fail notes against this checklist
