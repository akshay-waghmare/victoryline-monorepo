# Tasks: Investigate Scorecard Data Incompleteness

## Phase 1: Data Collection & Logging (Priority: Critical)

### Task 1.1: Add Comprehensive sC4 Response Logging
**Goal**: Capture full sC4 API response to verify data completeness at source

**Steps**:
1. Modify `trigger_sC4_call()` in `crex_scraper.py` (line ~365)
   - Add full JSON response logging before processing
   - Log response size and structure
   - Sample log: `api_logger.debug(f"Full sC4 response: {json.dumps(sc4_data, indent=2)}")`

2. Add innings count validation
   - Log number of innings in response
   - Compare with expected count (2 for T20/ODI, 4 for Test)

3. Add array size logging
   - Log length of `a` (bowlers) array per innings
   - Log length of `b` (batsman) array per innings
   - Sample: `api_logger.info(f"Innings {idx}: {len(a_attribute)} bowlers, {len(b_attribute)} batsmen")`

**Expected Output**: Clear visibility into whether sC4 API returns complete data

---

### Task 1.2: Add localStorage Snapshot Logging
**Goal**: Verify localStorage contains all required player/team mappings

**Steps**:
1. Modify `categorize_local_storage_data()` (line ~111)
   - Log count of player_data entries (`p_*`)
   - Log count of team_data entries (`t_*`)
   - Sample: `api_logger.info(f"localStorage: {len(player_data)} players, {len(team_data)} teams")`

2. Add missing code detection in `handle_sC4_result()`
   - Before calling `get_player_name()`, check if code exists in player_data
   - Log warning if code not found: `api_logger.warning(f"Player code {code} not in localStorage")`

3. Create localStorage dump for debugging
   - Save full localStorage to file when sC4 call is made
   - File: `localStorage_dump_{match_id}_{timestamp}.json`

**Expected Output**: Identify if localStorage is incomplete or timing issue exists

---

### Task 1.3: Add Parsing Validation Logs
**Goal**: Detect parsing failures for specific player string formats

**Steps**:
1. Enhance `parse_bowler_string()` (line ~245)
   - Add try-catch with detailed error logging
   - Log unparseable strings in full
   - Track count of successful vs failed parses

2. Enhance `parse_batsman_string()` (line ~280)
   - Add validation for all status types: yet_to_bat, currently_batting, dismissed
   - Log any string that produces 'unknown' status
   - Add regex pattern validation before splitting

3. Create parsing test suite
   - Test with known bowler strings: `"T8.35.24.0.2"`
   - Test with known batsman strings: `"37X.44.39.7.0.66.86.2.PP.389/25.29-184.30/"`
   - Verify all fields are extracted correctly

**Expected Output**: Identify edge case string formats that fail parsing

---

## Phase 2: Async/Threading Validation (Priority: High)

### Task 2.1: Add Callback Execution Tracking
**Goal**: Verify `handle_sC4_result()` callback executes successfully

**Steps**:
1. Add entry/exit logging in `handle_sC4_result()` (line ~390)
   ```python
   api_logger.info(f"[CALLBACK START] Processing sC4 result")
   # ... existing code ...
   api_logger.info(f"[CALLBACK END] Successfully processed {len(match_stats_by_innings.get('innings', {}))} innings")
   ```

2. Add exception tracking
   - Wrap entire function in try-catch
   - Log full stack trace on any exception
   - Count successful vs failed callbacks

3. Add timing metrics
   - Log time taken for callback execution
   - Detect if callback is timing out or being dropped

**Expected Output**: Confirm callback executes completely without silent failures

---

### Task 2.2: Verify Thread Pool Executor Behavior
**Goal**: Ensure ThreadPoolExecutor doesn't drop tasks

**Steps**:
1. Add task submission logging in `trigger_sC4_call_async()` (line ~348)
   ```python
   api_logger.info(f"[EXECUTOR] Submitting sC4 task for URL: {sc4_url}")
   future = executor.submit(trigger_sC4_call, sc4_url, headers)
   api_logger.info(f"[EXECUTOR] Task submitted, future ID: {id(future)}")
   ```

2. Check executor queue status
   - Log active threads: `executor._threads`
   - Log pending tasks: `executor._work_queue.qsize()`
   - Detect if executor is saturated

3. Add future result validation
   - Check if `future.result()` raises exceptions
   - Log any futures that return None

**Expected Output**: Confirm executor processes all submitted tasks

---

## Phase 3: Data Comparison & Testing (Priority: Medium)

### Task 3.1: Create Test Match Data Validator
**Goal**: Compare scraped data against known complete scorecard

**Steps**:
1. Select a completed match with known full scorecard
   - Use IPL match or international match
   - Manually verify website shows complete data

2. Run scraper with all logging enabled
   - Capture sC4 response
   - Capture localStorage
   - Capture final extracted data

3. Compare against expected data
   - Count batsmen: Expected 11, Got X
   - Count bowlers: Expected 6-7, Got Y
   - List missing players

**Expected Output**: Quantify data completeness percentage

---

### Task 3.2: Test Edge Cases
**Goal**: Verify handling of unusual match scenarios

**Test Cases**:
1. **Retired Hurt Batsman**
   - Player code format: `"37RH.44.39..."`
   - Verify status detection

2. **Yet-to-Bat Players**
   - Player code only, no stats: `"P12"`
   - Verify status = "yet_to_bat"

3. **Super Over**
   - 3rd innings in T20 match
   - Verify innings indexing

4. **Incomplete Match**
   - Rain-affected, only 1 innings
   - Verify graceful handling

**Expected Output**: Identify which edge cases break parsing

---

## Phase 4: Fix Implementation (Priority: After Root Cause Found)

### Task 4.1: Implement Fix Based on Investigation Results

**If Root Cause = Incomplete API Response**:
- Find alternative endpoint or scraping method
- Consider scraping HTML tables as fallback

**If Root Cause = Parsing Bug**:
- Fix regex/split logic
- Add comprehensive unit tests
- Handle all identified edge cases

**If Root Cause = localStorage Timing**:
- Add polling mechanism to wait for localStorage to populate
- Add retry logic if codes not found
- Consider caching localStorage between scrapes

**If Root Cause = Threading Issue**:
- Refactor to synchronous processing
- Or implement proper async/await pattern
- Add proper error propagation

**If Root Cause = Backend Schema Mismatch**:
- Fix backend validation/schema
- Add data transformation layer

---

## Verification Checklist

After implementing any fixes:
- [ ] All batsmen appear in scorecard (11 per innings)
- [ ] All bowlers appear in scorecard (6-7 per innings typically)
- [ ] Player names correctly resolved (not showing codes)
- [ ] Dismissal details complete (bowler, fielder for catches)
- [ ] Stats match website (runs, balls, fours, sixes)
- [ ] Works for T20, ODI, and Test matches
- [ ] Works for live and completed matches
- [ ] No silent failures in logs
- [ ] Performance acceptable (<30s per match)

---

**Priority Order**: 1.1 → 1.2 → 1.3 → 2.1 → 3.1 → (Root Cause Analysis) → 4.1

**Estimated Timeline**: 
- Phase 1: 2-3 hours (logging implementation)
- Phase 2: 1-2 hours (async validation)
- Phase 3: 2-3 hours (testing & comparison)
- Phase 4: Variable (depends on root cause)

**Success Metric**: 100% data completeness for standard matches, graceful degradation for edge cases
