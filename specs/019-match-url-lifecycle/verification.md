# Match URL Lifecycle Verification

## Date

- `2026-06-08`

## Scope

- Phase 2 local canonical-policy coverage
- Phase 2 route-normalization coverage
- Requested-versus-canonical audit proof on one live production match sample

## Local Verification

### Focused canonical-policy spec compile

Command run in `apps/frontend`:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit --target es2017 --module commonjs --moduleResolution node --lib es2017,dom --types jasmine,node --experimentalDecorators --skipLibCheck .\src\app\seo\match-canonical-policy.spec.ts .\src\app\seo\match-seo.service.spec.ts
```

Result:

- Passed

What this covers:

- base route self-canonical behavior
- live and scorecard child-surface fold-back behavior
- unknown child-surface noindex behavior
- unresolved numeric-route noindex behavior
- lifecycle derivation for prematch, live, and postmatch states

### Frontend compile checks

Commands run in `apps/frontend`:

```powershell
.\node_modules\.bin\tsc.cmd -p .\src\tsconfig.app.json --noEmit
.\node_modules\.bin\tsc.cmd -p .\tsconfig.server.json --noEmit
```

Result:

- Both passed

## Production Route Audit Baseline

Sample slug extracted from the live homepage and `/matches` on `2026-06-08`:

- `ana-vs-aub-4th-match-eut20-belgium-league-2026-match-updates-11Y2`

Sample URLs checked:

- `https://www.crickzen.com/cric-live/ana-vs-aub-4th-match-eut20-belgium-league-2026-match-updates-11Y2`
- `https://www.crickzen.com/cric-live/ana-vs-aub-4th-match-eut20-belgium-league-2026-match-updates-11Y2/live`
- `https://www.crickzen.com/cric-live/ana-vs-aub-4th-match-eut20-belgium-league-2026-match-updates-11Y2/match-scorecard`
- `https://www.crickzen.com/cric-live/ana-vs-aub-4th-match-eut20-belgium-league-2026-match-updates-11Y2/custom-view`

Observed live HTML results:

| Requested URL | Status | Canonical | Robots | Interpretation |
|---|---:|---|---|---|
| base match URL | `200` | base match URL | `index,follow` | correct self-canonical baseline |
| `/live` child URL | `200` | base match URL | `index,follow` | correct fold-back baseline |
| `/match-scorecard` child URL | `200` | base match URL | `index,follow` | correct fold-back baseline |
| `/custom-view` unknown child URL | `200` | `https://www.crickzen.com/cric-live/custom-view` | empty | incorrect legacy behavior on current production baseline |

## Audit Script Verification

Command run from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Audit-MatchSeo.ps1 -UrlList $env:TEMP\phase2-canonical-audit-lines.txt -OutputPath $env:TEMP\phase2-canonical-audit-output.txt
```

Confirmed script behavior:

- Main output now includes `ExpectedCanonical`
- Main output now includes `CanonicalRouteOutcome`
- Route summary section now prints a compact requested-versus-canonical policy table
- The sample production output showed:
  - base route outcome: `SELF`
  - `/live` route outcome: `FOLDS_TO_BASE`
  - `/match-scorecard` route outcome: `FOLDS_TO_BASE`
  - `/custom-view` route outcome: expected `FOLDS_TO_BASE`, but current production canonical remained incorrect

## Conclusion

- Local Phase 2 code now has shared canonical-policy coverage and requested-path-aware route handling.
- The upgraded audit flow can now express expected route-policy outcomes directly.
- Current production baseline before rollout showed an unresolved unknown-child-route canonical bug on `/custom-view`, which matched the pre-rollout state.

## Production Rollout Verification

### Deployed slice

- Date: `2026-06-08`
- Branch: `008-match-title-seo`
- Deployed code commit: `a6a44d2`
- Frontend image: `victoryline-frontend:phase2-canonical-a6a44d2-20260608-030916`

### Server checks

- `FRONTEND_IMAGE=victoryline-frontend:phase2-canonical-a6a44d2-20260608-030916`
- `docker inspect victoryline-frontend` reported the same image and `health=healthy`
- `docker compose -f docker-compose.prod.yml ps frontend` showed the frontend service healthy after recreate

### Post-rollout route results

Observed live HTML results after the rollout:

| Requested URL | Status | Canonical | Robots | Interpretation |
|---|---:|---|---|---|
| base match URL | `200` | base match URL | `index,follow` | correct self-canonical |
| `/live` child URL | `200` | base match URL | `index,follow` | correct fold-back |
| `/match-scorecard` child URL | `200` | base match URL | `index,follow` | correct fold-back |
| `/custom-view` unknown child URL | `200` | base match URL | `noindex,follow` | correct safe fallback after Phase 2 rollout |

### Post-rollout audit outcome

The upgraded route summary reported:

- base route outcome: `SELF`
- `/live` route outcome: `FOLDS_TO_BASE`
- `/match-scorecard` route outcome: `FOLDS_TO_BASE`
- `/custom-view` route outcome: `FOLDS_TO_BASE`

### Final outcome

- The production unknown-child-route canonical bug is fixed.
- Production now matches the intended Phase 2 policy for the sampled base, legacy, and unknown child match routes.
