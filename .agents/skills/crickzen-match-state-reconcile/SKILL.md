---
name: crickzen-match-state-reconcile
description: Diagnose mismatches between homepage cards, schedule feeds, match hero, match-info, scorecard, and live snapshot data for a specific Crickzen match.
---

# Crickzen Match State Reconcile

Use this skill when different Crickzen surfaces disagree about a match state, especially when one place says completed but another still looks live.

## Compare these sources for one match slug

```powershell
$slug = "<match-slug>"
Invoke-RestMethod "http://localhost:8099/cricket-data/live-matches" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:8099/cricket-data/upcoming-matches" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:8099/cricket-data/completed-matches" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:8099/cricket-data/last-updated-data?url=$slug" | ConvertTo-Json -Depth 8
Invoke-RestMethod "http://localhost:8099/cricket-data/match-info/get?url=$slug" | ConvertTo-Json -Depth 8
Invoke-RestMethod "http://localhost:8099/cricket-data/sC4-stats/get?url=$slug" | ConvertTo-Json -Depth 8
```

## What each source usually means

- `live/upcoming/completed-matches`
  - catalog state used by list surfaces and cards
- `last-updated-data`
  - live snapshot used by the match hero
- `match-info/get`
  - static-ish details and often the final result banner
- `sC4-stats/get`
  - detailed scorecard payload that may lag behind final result state

## Common mismatch patterns

### 1. Card says completed, hero still looks live

Typical signs:

- match is present in `completed-matches`
- `last-updated-data` returns `404`
- browser still shows old chase text or live batter/bowler blocks

Likely cause:

- stale cached live snapshot on the frontend

Known fix direction:

- clear cached `last-updated-data` when the backend returns `404`
- prefer a completed fallback view over stale live hero state
- hide live-only hero sections for terminal matches

### 2. Card says completed, scorecard still shows interrupted live state

Typical signs:

- `match-info/get` reflects final result
- `sC4-stats/get` still shows rain/interruption or in-progress batter data

Likely cause:

- stale stored scorecard record or incomplete hydration

Useful action:

```powershell
$body = '{"url":"https://crex.com/cricket-live-score/<match-slug>"}'
Invoke-RestMethod -Method Post -Uri http://localhost:5000/hydrate-match-details -ContentType 'application/json' -Body $body
```

If hydration succeeds but scorecard still lags, treat that as a scraper/scorecard-source issue, not a home-card issue.

### 3. Home page is empty but schedule exists upstream

Switch to `crickzen-live-score-incident` and confirm discovery did not return early before schedule sync.

## Browser verification

After data checks, verify the actual match route:

```powershell
Invoke-WebRequest "http://localhost:8080/cric-live/<match-slug>" | Select-Object -ExpandProperty Content
```

For a cleaner client-side check, use a fresh browser session or headless Chrome and look for:

- final result text present
- stale chase text absent
- live-only batter/bowler panels absent on completed matches

## Reference

- `docs/ROLLUP_20260602_HOME_MATCH_SURFACE_AND_LOCAL_DATA.md`
