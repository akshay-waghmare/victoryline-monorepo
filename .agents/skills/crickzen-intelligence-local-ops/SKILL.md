---
name: crickzen-intelligence-local-ops
description: Start and verify the Crickzen local frontend, dashboard, scraper, and automatic T20/ODI model prediction workflow without manually maintaining match URLs.
---

# Crickzen Intelligence Local Ops

Use this skill whenever Match Intelligence work needs the local stack or model dashboard.

## Start everything

Run the model-repo launcher. It starts the dashboard only when health is absent, starts Docker services, waits for health, and reports public model rows:

```powershell
& 'C:\Users\ADMINS\Documents\projects\machine_learning_bbl_009-odi-mc-predictor\scripts\start_crickzen_stack.ps1'
```

Use `-CleanStart` when resuming after an interrupted session or when old
predictor processes may still be running. It clears only Crickzen dashboard
and predictor processes before rediscovering the current source slate:

```powershell
& 'C:\Users\ADMINS\Documents\projects\machine_learning_bbl_009-odi-mc-predictor\scripts\start_crickzen_stack.ps1' -CleanStart
```

Use `-BuildFrontend` only after frontend source changes:

```powershell
& 'C:\Users\ADMINS\Documents\projects\machine_learning_bbl_009-odi-mc-predictor\scripts\start_crickzen_stack.ps1' -BuildFrontend
```

## Automation contract

- Dashboard `.env` enables the auto-scheduler and uses `AUTO_LEAGUE_KEYS=ALL` with exclusions, not individual match URLs.
- The scheduler discovers current CREX matches for every configured league and starts only live/eligible candidates.
- `AUTO_MATCH_URLS` stays empty by default and is an emergency override only.
- League classification selects format/gender metadata; model resolution selects `t20_all_v2` or `odi_all_v2`.
- Restarting the dashboard clears the in-memory stale match registry; do not hand-edit a match list to remove old rows.

## Verify

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/public/matches
Invoke-WebRequest http://localhost:8080/match-intelligence/<canonical-slug>
```

Confirm the public feed has `T20 all-gender v2` and/or `ODI all-gender v2`, fresh `updated_at`, and no fallback-only row before visual verification.
