# Investigation: Incomplete Scorecard Data Fetching

## ✅ RESOLUTION SUMMARY

**Status**: RESOLVED  
**Date**: November 21, 2025  
**Solution**: Wait for `networkidle` + 5 seconds on live page  
**Result**: 24/24 player codes now available (100% complete, up from 27%)

**Root Cause Found**: localStorage was extracted too early (only 6/22 players loaded)  
**Fix Applied**: Changed wait strategy from `domcontentloaded` to `networkidle` + increased wait from 2s to 5s  
**Files Modified**: `crex_match_data_scraper.py` (renamed from `crex_scraper.py`)  
**Verification**: Zero [MISSING CODE] warnings, all player names correctly decoded

**Key Changes**:
1. Renamed `crex_scraper.py` → `crex_match_data_scraper.py` for clarity (distinguish from URL discovery scraper)
2. Updated wait strategy for localStorage population
3. Added comprehensive investigation logging (kept for monitoring)
4. Created ARCHITECTURE.md documenting dual-scraper design

---

## Problem Statement

The scraper is not fetching complete batsman and bowler data for scorecards despite successfully making API calls to the sC4 endpoint. While the scraper retrieves some data, all batsman and bowler statistics are incomplete or missing.

## Current Behavior

### What Works
- ✅ sC4 API call is triggered successfully with proper URL and headers
- ✅ Response is received with HTTP 200 status
- ✅ JSON decoding succeeds without errors
- ✅ Local storage data is retrieved (player_data, team_data with p_* and t_* keys)
- ✅ Data extraction functions exist: `extract_match_stats_by_innings()`, `parse_batsman_string()`, `parse_bowler_string()`

### What Doesn't Work
- ❌ Batsman statistics are incomplete (missing players or partial data)
- ❌ Bowler statistics are incomplete (missing bowlers or partial data)
- ❌ Code replacement from localStorage works but source data appears incomplete

## Technical Context

### Data Flow Architecture

1. **API Call Chain**:
   ```
   sV3.php (live updates) → extract 'key' parameter → sC4.php?key={key} → scorecard data
   ```

2. **Data Decoding Process**:
   - sC4 API returns encoded data (format: array of innings objects)
   - Each innings contains:
     - `a`: Bowler stats array (format: `"code.runs.balls.maidens.wickets"`)
     - `b`: Batsman stats array (format: `"code.runs.balls.fours.sixes.dismissal_details..."`)
     - `c`: Team code
     - `d`: Team score
   - Player/team codes are decoded using localStorage keys:
     - `p_{code}_name` → Player name
     - `t_{code}_name` → Team name

3. **Current Implementation** (`crex_scraper.py`):
   - `trigger_sC4_call_async()` → Makes async API call
   - `trigger_sC4_call()` → Fetches sC4 data, extracts stats
   - `extract_match_stats_by_innings()` → Parses response JSON
   - `parse_bowler_string()` → Decodes bowler stats
   - `parse_batsman_string()` → Decodes batsman stats
   - `handle_sC4_result()` → Replaces codes with names from localStorage

## Investigation Required

### 1. API Response Validation
- [ ] Log the raw sC4 API response JSON to verify completeness
- [ ] Check if the response contains all expected innings (1st, 2nd, etc.)
- [ ] Verify the `a` (bowlers) and `b` (batsman) arrays contain all players
- [ ] Compare response size with expected data (e.g., typical T20 has 11 batsmen, 6-7 bowlers per innings)

### 2. Data Extraction Analysis
- [ ] Verify `extract_match_stats_by_innings()` correctly iterates all innings
- [ ] Check if `parse_bowler_string()` handles all bowler string formats
- [ ] Check if `parse_batsman_string()` handles all batsman string formats
- [ ] Validate parsing of special cases:
  - Retired hurt batsmen
  - Yet-to-bat players
  - Concussion substitutes
  - Incomplete overs (balls < 6)

### 3. localStorage Mapping Issues
- [ ] Verify localStorage contains mappings for all player codes in sC4 response
- [ ] Check timing: Is localStorage fully populated before sC4 call?
- [ ] Identify if any player codes in sC4 response are missing from localStorage
- [ ] Log unmapped codes to identify patterns

### 4. Async/Threading Concerns
- [ ] Verify `handle_sC4_result()` is called and completes successfully
- [ ] Check if `data_store['lock']` is properly preventing race conditions
- [ ] Confirm the async callback chain completes before data is sent to backend
- [ ] Validate that `executor.submit()` doesn't silently drop errors

### 5. Backend Data Transmission
- [ ] Check if incomplete data is due to scraper or backend processing
- [ ] Verify the data structure sent to backend matches expected schema
- [ ] Log the exact payload sent to `cricket_data_service.send_data_to_api_endpoint()`

## Success Criteria

The investigation will be complete when we can answer:

1. **Where is the data loss occurring?**
   - In sC4 API response (incomplete from source)
   - In parsing logic (missing edge cases)
   - In localStorage mapping (missing codes)
   - In async handling (callback not executing)
   - In backend transmission (data dropped)

2. **What is the root cause?**
   - API limitation (source doesn't provide all data)
   - Timing issue (localStorage not ready)
   - Parsing bug (regex/split logic fails on certain formats)
   - Threading bug (race condition or dropped callback)
   - Data format change (website structure changed)

3. **What data is actually missing?**
   - Specific player roles (openers, tail-enders, part-time bowlers)
   - Specific match situations (super overs, rain-affected matches)
   - Specific dismissal types (run-outs, stumpings, etc.)

## Next Steps After Investigation

Once root cause is identified:
- If API incomplete → Find alternative data source or endpoint
- If parsing bug → Fix regex/parsing logic with test cases
- If timing issue → Add proper async/await or localStorage polling
- If threading bug → Refactor to use proper async patterns or sync processing
- If backend issue → Fix backend schema or validation

## Files to Investigate

- `apps/scraper/crex_scraper.py` (lines 335-450, 550-700)
  - `trigger_sC4_call()`
  - `trigger_sC4_call_async()`
  - `handle_sC4_result()`
  - `extract_match_stats_by_innings()`
  - `parse_bowler_string()`
  - `parse_batsman_string()`
- `apps/scraper/cricket_data_service.py` (data transmission)
- Browser Network tab logs (manual inspection)

## Test Cases Needed

1. Known complete match (e.g., completed IPL match with full scorecard on website)
2. Live match (to verify real-time updates)
3. Test match with multiple innings (complex scenario)
4. Match with unusual dismissals (run-out, retired hurt, etc.)

---

**Status**: Investigation phase  
**Priority**: High (affects core functionality)  
**Type**: Bug investigation
