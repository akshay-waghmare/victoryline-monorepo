# Scorecard Regression Fix — 2026-03-07

## Summary

The missing scorecard investigation was revisited after a live match returned incomplete or unavailable scorecard data again. The current frontend and backend paths were checked first, and both were found to be largely contract-compatible. The failure pattern again pointed to the scraper's player/team code decoding step.

The scraper-side fix now lives in [apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py](apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py) and hardens when `localStorage` is accepted, reused, and cached.

## What Was Observed

- The frontend scorecard view still depends on backend-provided stored JSON and does not invent scorecard data on its own.
- The backend scorecard save/get flow remained simple but structurally consistent with the active `app-scorecard` component.
- Historical logs and prior archived findings already showed the same symptom family:
  - `[MISSING CODE]` warnings during scorecard decode
  - incomplete player mappings
  - malformed or missing decoded scorecard rows

## Root Cause

The scraper could reuse or extract `localStorage` before Crex had loaded enough player/team mapping entries.

That created two bad paths:

1. **Fresh extraction too early**
   - the live/info/scorecard page had not finished populating the player/team keys yet
   - scorecard decoding then had unresolved player codes

2. **Incomplete cache reuse**
   - Redis/local cache could preserve an incomplete mapping set
   - later scrapes would trust and reuse bad mappings

## Implemented Fix

### 1. Validate cached `localStorage` before reuse

Cached mappings are now only reused when they contain at least:

- `18` player name keys
- `2` team name keys

Incomplete cached mappings are ignored and logged.

### 2. Wait for `localStorage` readiness on live/info/scorecard pages

The adapter now:

- waits for `networkidle` when possible
- waits for a browser-side predicate confirming the minimum player/team key counts
- falls back to an additional timeout if the predicate is not met in time

### 3. Cache only validated mappings

The scraper now writes back to cache only when the extracted mapping set passes the same completeness thresholds.

## Key Methods Added/Used

- `_count_local_storage_entities()`
- `_has_complete_local_storage()`
- `_wait_for_local_storage_ready()`

These methods were added to centralize the completeness rules and avoid repeating ad hoc timing logic.

## Verification Performed

- Reviewed the full scorecard flow across scraper, backend, and frontend.
- Confirmed the active frontend scorecard component expects the same stored payload shape the backend returns.
- Applied the scraper fix.
- Rebuilt and restarted the scraper container.
- Confirmed the scraper container returned to a healthy state after restart.

## What Could Not Be Fully Verified

Final live end-to-end proof was not completed because live matches were no longer available by the end of the investigation window.

That leaves one operational follow-up:

- re-check a freshly scraped live match to confirm that the backend is storing refreshed scorecard payloads and that no stale empty row is still being served for affected matches

## Follow-up When Live Matches Return

1. Watch scraper logs for scorecard extraction and absence of `[MISSING CODE]` warnings.
2. Query the backend `sC4-stats` endpoint for a freshly active match URL.
3. Confirm the frontend scorecard tab renders innings rows from the refreshed payload.
4. If needed, backfill or invalidate stale backend rows for any match scraped before this fix.