# Rollup: Live Match SEO Hardening and Reusable Skills

**Date**: 2026-06-03  
**Branch**: `008-match-title-seo`  
**Code Commit**: `813852b`  
**Production Frontend Image**: `victoryline-frontend:seo-live-813852b-20260603-2355`

## Scope

This rollup captures the live match SEO hardening pass, the safe frontend-only production rollout, and the reusable operational patterns extracted from the session.

## What Changed

### 1. Live match pages were hardened for crawl trust

The frontend SSR layer was updated so live match pages expose stronger first-paint SEO signals.

- self-canonical match URLs preserved
- one visible `h1` preserved
- real `og:image` and Twitter image tags added
- JSON-LD added for real match pages
- navbar logo no longer lazy-loads above the fold
- unknown frontend routes now return `404`

Primary files:

- `apps/frontend/server.js`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.*`
- `apps/frontend/src/app/seo/*`
- `apps/frontend/src/app/shared/components/logo/logo.component.ts`
- `apps/frontend/src/app/layouts/admin-layouts/*`
- `apps/frontend/src/assets/og/crickzen-default-1200x630.jpg`

### 2. Match-page verification was tightened

The repo audit script was extended so the rollout can prove match-page SEO markers instead of checking only canonical/H1 basics.

- `scripts/Audit-MatchSeo.ps1` now flags missing `og:image`
- local SSR checks were standardized on Node `17.9.1` plus `--openssl-legacy-provider`

### 3. Frontend-only production deployment was used safely

The server checkout was dirty, so the rollout used a low-blast-radius frontend-only deployment:

- pushed branch head from local first
- hard-reset the server repo to `origin/008-match-title-seo`
- built only the frontend image on the server
- updated only `FRONTEND_IMAGE` in `.env`
- recreated only `victoryline-frontend`

## Production Verification

Verified after deploy:

- server HEAD moved to `813852b`
- `FRONTEND_IMAGE=victoryline-frontend:seo-live-813852b-20260603-2355`
- `victoryline-frontend` was healthy after recreate
- sample live page `ham-vs-sus-35th-match-t20-blast-2026-match-updates-ZUX` returned:
  - `200`
  - correct self-canonical
  - `robots=index,follow`
  - one `h1`
  - `og:image=true`
  - `jsonLd=2`
  - eager logo loading present
- bad route `https://www.crickzen.com/this-page-should-not-exist` returned `404`
- `robots.txt` and `sitemap.xml` both returned `200`
- `scripts/Audit-MatchSeo.ps1` returned clean on the sampled live match page

## GSC / Indexing Status

The production indexing services were healthy at rollout time:

- `gscInitialized=true`
- `indexingInitialized=true`
- sitemap scheduler active
- live match indexing scheduler active

Manual sitemap submission succeeded:

```json
{"success":true,"message":"Sitemap submitted successfully"}
```

Known caveat:

- manual per-URL indexing requests are currently rate-limited
- backend logs showed `429 Too Many Requests` for a direct indexing request
- this should be treated as a follow-up on the indexing helper path, not as a blocker for the SEO HTML rollout

## Reusable Session Patterns

The most reusable patterns from this session were:

1. Bring the local Docker stack up and prove that frontend image changes are actually inside the running app.
2. Reconcile one match across cards, hero, match-info, scorecard, and live snapshot APIs before assuming the UI is wrong.
3. Distinguish scraper outages, discovery failures, backend freshness issues, and frontend stale-cache issues.
4. Audit match-page SEO from raw SSR HTML rather than from visual inspection alone.
5. Deploy frontend-only production fixes by resetting the server repo to the pushed branch and pinning only `FRONTEND_IMAGE`.

## Skills Created or Captured

- `crickzen-live-score-incident`
  - expanded to cover local vs prod triage, schedule discovery failures, and stale completed-match cache patterns
- `crickzen-local-stack-ops`
  - start, rebuild, and verify the local Crickzen Docker stack
- `crickzen-match-state-reconcile`
  - compare one match across list feeds, match hero, match info, and scorecard sources
- `crickzen-match-seo-ops`
  - audit, verify, and roll out match-page SEO changes
- `crickzen-frontend-prod-rollout`
  - ship frontend-only production changes safely with low blast radius

## Suggested Follow-up

One useful next step would be to harden the direct URL indexing helper so it backs off cleanly on quota pressure and avoids noisy manual failures when sitemap submission is already healthy.
