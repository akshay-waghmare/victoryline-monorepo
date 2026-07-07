# Homepage Restore And Frontend Prod Sync

Date: 2026-07-08 IST
Branch: `008-match-title-seo`
Primary frontend commit: `34c1325`
Prod host: `administrator@204.12.199.137`

## Scope

This checkpoint covered three things:

- restore the older Crickzen homepage after the newer homepage changes broke the live surface
- keep the upcoming match tabs visible on `/cric-live/{slug}` while stopping the scorecard tab from looking stuck before innings data exists
- sync the known production checkout drift back against local so future work starts from the real deployed state rather than chat memory

## Commits already on the branch

- `43336f3` `docs(spec): add decision-intent acquisition strategy`
- `a242dc0` `docs(skills): add seo issue-cluster preflight checks`
- `34c1325` `fix(frontend): restore homepage and stabilize upcoming tabs`

## Production image state after this rollout

- `BACKEND_IMAGE=macubex/victoryline-backend:20260708-012231-3126nc1`
- `FRONTEND_IMAGE=macubex/victoryline-frontend:20260708-024508-34c1325`
- `SCRAPER_IMAGE=macubex/victoryline-scraper:20260708-012231-3126nc1`

## What changed

### 1. Homepage restore

The experimental homepage changes were rolled back and the older homepage shape was redeployed.

Important practical rule for follow-up work:

- treat the current production homepage as the baseline
- do not let previously backed-out homepage experiments creep back into later frontend rollouts unless they are intentionally re-reviewed and re-shipped

### 2. Upcoming match tab behavior

The tab set stays visible for upcoming matches, including `Live Match` and `Scorecard`, but the scorecard tab no longer falls into a misleading loading state when no innings data exists yet.

The fix was:

- keep the tabs rendered
- skip scorecard loading for upcoming matches
- use an explicit scorecard loading flag instead of proxying off the live-hero state
- show the honest empty-state copy when the match has not started

### 3. Prod-to-local sync check

The production checkout still shows tracked modifications, but the meaningful code drift is already represented locally:

- `apps/scraper/crex_scraper_python/src/dom_match_extract.py`
  - local and prod match
- `apps/scraper/crex_scraper_python/src/crex_scraper.py`
  - local and prod logic match; the remaining difference observed during comparison was mojibake in a comment dash on prod
- `docker-compose.prod.yml`
  - local and prod logic match; the remaining difference observed during comparison was the same mojibake in a comment dash on prod

This means local already contains the functional prod drift that mattered for the current rollout, even though both worktrees are still broadly dirty for other reasons.

## Verification

### Build proof

Frontend build completed locally from `apps/frontend` with:

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build
```

### Prod rollout proof

Frontend-only image push and switch completed with:

- image tag `20260708-024508-34c1325`
- container `victoryline-frontend` healthy after restart

### Live URL proof

Verified after rollout:

- `https://www.crickzen.com/`
  - returned `200`
  - restored Crickzen homepage title rendered
- `https://www.crickzen.com/cric-live/bad-vs-sgt-12th-match-shpageeza-cricket-league-2026-match-updates-12VM/scorecard`
  - returned `200`
  - `Live Match` tab present
  - `Scorecard` tab present
  - `Loading scorecard` not present in HTML
  - `Detailed scorecard is not available for this match yet.` present in HTML

## Repo cleanliness notes

### Local

The local repo still contains a large amount of broader in-progress work outside this rollout. That work was not force-cleaned here because it would risk dropping uncommitted product and SEO work.

Safe cleanup performed or recommended:

- remove temporary `.codex_*` deploy helper files after rollout
- keep rollout evidence in docs instead of temporary scratch files
- use local excludes for backup and deploy residue instead of hiding real source changes

### Production checkout

The production runtime is correct, but the server-side git checkout is still not a trustworthy build source:

- it is on older `HEAD` history
- it includes many backup files and operational residue
- the Docker images are newer than the checkout

That checkout should continue to be treated as an operational shell, not as the source of truth for future builds.
