# Tasks: Search Demand Graph and AEO Content Contract

## 0. Evidence and ownership

- [x] T001 Record workbook totals, cluster ranking, coverage, and methodology limits.
- [x] T002 Reconcile the workbook with existing CrickZen route and lifecycle decisions.
- [x] T003 Create `docs/seo/keywords/intent-to-page-ownership-20260825.md` from the unique-keyword and opportunity tabs.
- [ ] T004 Add competitor, source URL, extraction date, lifecycle, and observed-content fields to the next demand-graph refresh workflow.
- [x] T005 Review the top Missing/Weak clusters against data readiness and implementation effort.

## 1. Series and standings vertical slice

- [x] T101 Select one series with reliable fixtures and standings payloads.
- [x] T102 Verify `/series/{externalId}/{slug}`, `/table`, and `/stats` route ownership and canonical metadata.
- [x] T103 Add a series-profile BLUF summary using only resolved entity, season, fixture, standings, and stats facts.
- [x] T104 Make fixtures, points-table, teams, and results sections atomic and self-contained.
- [x] T105 Ensure headings and answer sentences explicitly name the series entity.
- [x] T106 Verify crawlable match and team `href` links are canonical, deduplicated, and placeholder-safe.
- [ ] T107 Add focused component tests for populated, missing-data, and loading/error states.

## 2. Canonical match lifecycle content

- [x] T201 Define the upcoming/live/completed BLUF fields and their data-source ownership.
- [x] T202 Add lifecycle-specific answer blocks to `/cric-live/{slug}` without changing canonical ownership.
- [x] T203 Add atomic sections for score, result, venue, series, teams, lineups, and model explanation where available.
- [x] T204 Add CrickZen metric provenance and freshness labels only for exact, fresh, public-safe model payloads.
- [x] T205 Add normal/Googlebot SSR and hydration parity tests for all three lifecycle states.
- [x] T206 Confirm stale, placeholder, temporary-loading, and unsupported prediction claims never reach indexable SSR.

## 3. Hubs, teams, and scorecard

- [ ] T301 Map schedule, today, live, series, team, and archive query ownership to existing routes.
- [ ] T302 Strengthen team profile answer blocks and links only where team data is available.
- [ ] T303 Preserve completed scorecard/result value on the canonical match page and verify durable archive discovery.
- [ ] T304 Add internal-link assertions for `series -> match`, `series -> team`, `team -> match`, and `match -> series/team` relationships.

## 4. Measurement and rollout

- [ ] T401 Build a versioned 3–9 URL cohort ledger with cluster, lifecycle, canonical URL, data readiness, and release timestamp.
- [ ] T402 Capture baseline SSR, sitemap, GSC, organic landing, `match_view`, intelligence engagement, and repeat-use evidence.
- [x] T403 Run focused local tests, raw SSR checks, Googlebot checks, hydration parity, and mobile review.
- [x] T404 Deploy only through the isolated CrickZen rollout workflow when the worktree boundary is satisfied.
- [x] T405 Recheck public image/digest, SSR, sitemap, and lifecycle/data parity after deployment.
- [ ] T406 Inspect timed GSC cohorts and record improve, expand, merge, observe, or stop decisions.

### T403–T405 evidence — 2026-08-26

- Production frontend: `macubex/victoryline-frontend:20260825-match-aeo-r8`, digest `sha256:8da4424460211cfea34d9d0fe7d1a5e2a6914f64da44eaf38601bda28e92314c`; container healthy; backend and scraper unchanged.
- Public matrix: 3 lifecycle canaries × 3 profiles = 9/9 passed with HTTP 200, one H1, one canonical, `index,follow`, expected lifecycle, populated AEO, no placeholders, and no temporary answer copy.
- Hydrated browser: innings-break canary retained one AEO block and matched the visible verified score `SL 265/8 (83.4 ov)`.
- Local TypeScript app/spec checks and isolated Node 12 SSR Docker build passed. Full legacy Karma remains `49 FAILED, 192 SUCCESS`; those failures are outside this slice and are not reported as a clean-suite result.
- Claim boundary: this is technical SSR/data-readiness evidence, not proof of Google indexing, ranking, traffic, engagement, repeat use, or AI citations.

## Definition of done

- [ ] One source-controlled ownership matrix maps the approved graph to canonical page families.
- [ ] One series vertical slice passes the full local content and SSR gate.
- [x] Match lifecycle content is truthful and self-contained for upcoming, live, and completed states.
- [x] Entity links and text relationships are explicit and crawlable.
- [x] Measurement separates technical readiness from visibility and product outcomes.
- [x] No unsupported AEO, ranking, or AI-citation claim is made.
