# Implementation Tasks

**Change ID**: `fix-scorecard-scraping-incomplete-data`  
**Status**: Not Started  
**Last Updated**: 2025-11-20

---

## 1. Investigation & Analysis

**Goal**: Understand the root cause of missing batsman and bowler data.

- [ ] **Task 1.1**: Capture sample API responses from live matches
  - Use test script to fetch and save raw API responses
  - Focus on matches showing incomplete scorecard data
  - Save responses to `apps/scraper/test_data/api_responses/`
  
- [ ] **Task 1.2**: Identify parsing failure patterns
  - Analyze 'a' (bowlers) and 'b' (batsmen) attributes structure
  - Document variations in data format (yet-to-bat, current, dismissed)
  - List specific string patterns that cause parsing to fail
  
- [ ] **Task 1.3**: Review existing logs
  - Search logs for parsing errors or warnings
  - Identify frequency and patterns of missing data
  - Document which matches/innings are most affected
  
- [ ] **Task 1.4**: Document edge cases
  - Create a table of observed edge cases with examples
  - Prioritize by frequency and impact
  - Add to spec documentation

**Acceptance**: Complete understanding of parsing failures with documented examples.

---

## 2. Code Changes - Parsing Functions

### 2.1 Enhance `parse_batsman_string()` in `crex_scraper.py`

**Goal**: Make batsman parsing robust and complete.

- [ ] **Task 2.1.1**: Add input validation
  - Check for None or empty string
  - Log warning if input is invalid
  - Return default structure with status="unknown"
  
- [ ] **Task 2.1.2**: Handle yet-to-bat scenario
  - Detect single code format (e.g., "37X")
  - Return structure with status="yet_to_bat" and zero stats
  - Preserve player code for tracking
  
- [ ] **Task 2.1.3**: Improve dismissal parsing
  - Review regex/split logic for dismissal info
  - Handle complex dismissal strings (run out, caught & bowled, etc.)
  - Add fallback for unparseable dismissal data
  
- [ ] **Task 2.1.4**: Add fallback defaults
  - Define default values for all optional fields
  - Ensure partial parsing returns usable data
  - Never return None - always return a structure
  
- [ ] **Task 2.1.5**: Add detailed logging
  - Log original string when parsing fails
  - Include player code and match context
  - Use appropriate log level (WARNING for recoverable, ERROR for critical)

**Acceptance**: Function handles all documented edge cases without exceptions.

### 2.2 Enhance `parse_bowler_string()` in `crex_scraper.py`

**Goal**: Make bowler parsing robust and complete.

- [ ] **Task 2.2.1**: Add input validation
  - Check for None or empty string
  - Log warning if input is invalid
  - Return default structure with zero stats
  
- [ ] **Task 2.2.2**: Handle bowlers with minimal stats
  - Detect format with 0 balls bowled (e.g., "T8.0.0.0.0" or just "T8")
  - Return valid stats structure with zeros
  - Preserve bowler code
  
- [ ] **Task 2.2.3**: Validate balls_bowled calculation
  - Check for edge case: balls > 5 in an over
  - Handle decimal overs correctly (e.g., 3.4 = 3 overs + 4 balls)
  - Log warning if calculation seems incorrect
  
- [ ] **Task 2.2.4**: Add fallback defaults
  - Define default values for runs, maidens, wickets
  - Ensure partial parsing returns usable data
  - Never return None - always return a structure
  
- [ ] **Task 2.2.5**: Add detailed logging
  - Log original string when parsing fails
  - Include bowler code and match context
  - Use appropriate log level (WARNING for recoverable, ERROR for critical)

**Acceptance**: Function handles all documented edge cases without exceptions.

---

## 3. Code Changes - Data Extraction

### 3.1 Update `extract_match_stats_by_innings()` in `crex_scraper.py`

**Goal**: Ensure all players are extracted from API response.

- [ ] **Task 3.1.1**: Add null/empty checks
  - Validate 'a' and 'b' attributes exist before iteration
  - Handle cases where attributes are null, empty list, or missing
  - Log warning if attributes are unexpected
  
- [ ] **Task 3.1.2**: Track player counts
  - Count total batsmen found vs expected (typically 11)
  - Count total bowlers found vs expected (varies by match)
  - Store counts for validation
  
- [ ] **Task 3.1.3**: Add completeness logging
  - Log summary: "Found X/Y batsmen, A/B bowlers"
  - Log list of found codes for debugging
  - Use INFO level for normal operation, WARNING if counts are low
  
- [ ] **Task 3.1.4**: Handle edge cases
  - Matches with fewer than 11 players (rain, forfeit, etc.)
  - Matches with substitute players
  - Don't fail extraction if counts are unexpected

**Acceptance**: All player data extracted even with incomplete API responses.

### 3.2 Add Validation Helper Function

**Goal**: Create reusable validation for scorecard completeness.

- [ ] **Task 3.2.1**: Create `validate_scorecard_completeness()` function
  - Input: innings data with batsmen and bowlers lists
  - Return: validation result with completeness percentage
  - Location: `apps/scraper/crex_scraper.py` or `apps/scraper/shared.py`
  
- [ ] **Task 3.2.2**: Implement completeness checks
  - Check expected vs actual player counts
  - Identify missing player codes (if roster available)
  - Calculate completeness percentage
  
- [ ] **Task 3.2.3**: Return detailed results
  - Return dict with: `{complete: bool, batsmen_count: int, bowlers_count: int, missing_codes: list, warnings: list}`
  - Include actionable information for debugging
  
- [ ] **Task 3.2.4**: Integrate with extraction
  - Call validation after each innings extraction
  - Log validation results
  - Don't block on validation failures (just warn)

**Acceptance**: Validation function provides clear completeness metrics.

---

## 4. Testing

### 4.1 Unit Tests

- [ ] **Task 4.1.1**: Test `parse_batsman_string()` edge cases
  - Test with None, empty string
  - Test yet-to-bat format (single code)
  - Test currently batting format
  - Test dismissed with various dismissal types
  - Test malformed strings
  
- [ ] **Task 4.1.2**: Test `parse_bowler_string()` edge cases
  - Test with None, empty string
  - Test bowler with 0 overs
  - Test bowler with partial overs (e.g., 3.4)
  - Test bowler with complete stats
  - Test malformed strings
  
- [ ] **Task 4.1.3**: Test `validate_scorecard_completeness()`
  - Test with complete data (11 batsmen, multiple bowlers)
  - Test with partial data (fewer players)
  - Test with empty data
  - Verify correct completeness calculations

**Acceptance**: All unit tests pass with 100% code coverage for parsing functions.

### 4.2 Integration Tests

- [ ] **Task 4.2.1**: Test with real API responses
  - Use captured JSON samples from investigation phase
  - Verify all players extracted correctly
  - Check logs for appropriate warnings
  
- [ ] **Task 4.2.2**: Test with ongoing match
  - Fetch live match data during active play
  - Verify real-time updates work correctly
  - Check player counts during different match phases
  
- [ ] **Task 4.2.3**: Test with completed match
  - Verify all final statistics are captured
  - Check completeness of full scorecard
  
- [ ] **Task 4.2.4**: Test with edge case matches
  - Rain-interrupted match
  - Match with substitute players
  - Match with retirements
  
- [ ] **Task 4.2.5**: Regression testing
  - Run existing test suite
  - Verify no existing functionality broken
  - Check performance hasn't degraded

**Acceptance**: All integration tests pass, no regressions detected.

---

## 5. Integration with Cricket Data Service

- [ ] **Task 5.1**: Update `cricket_data_service.py` if needed
  - Handle validation warnings from scraper
  - Ensure incomplete data doesn't break downstream processing
  - Pass through completeness metrics to API consumers
  
- [ ] **Task 5.2**: Add metrics tracking
  - Track scorecard completeness over time
  - Monitor parsing failure rates
  - Create dashboard alerts for low completeness

**Acceptance**: Service layer handles enhanced scraper output correctly.

---

## 6. Documentation

- [ ] **Task 6.1**: Document API response formats
  - Add code comments describing observed formats
  - Include examples of each edge case
  - Document assumptions and limitations
  
- [ ] **Task 6.2**: Update monitoring guide
  - Add section to `MONITORING_GUIDE.md` about scorecard completeness
  - Document new log messages and their meanings
  - Add troubleshooting steps for missing data
  
- [ ] **Task 6.3**: Update scraper documentation
  - Document new validation function
  - Explain parsing improvements
  - Add examples of edge case handling
  
- [ ] **Task 6.4**: Create runbook
  - Steps to investigate missing scorecard data
  - How to capture and analyze API responses
  - When to escalate issues

**Acceptance**: Complete documentation for maintenance and troubleshooting.

---

## 7. Deployment & Monitoring

- [ ] **Task 7.1**: Pre-deployment checklist
  - All tests passing
  - Code review completed
  - Documentation updated
  - Rollback plan prepared
  
- [ ] **Task 7.2**: Deploy to production
  - Deploy updated scraper code
  - Restart scraper service
  - Verify service health
  
- [ ] **Task 7.3**: Monitor for 24 hours
  - Watch error logs for parsing failures
  - Check scorecard completeness metrics
  - Review validation warnings
  - Compare before/after missing data rates
  
- [ ] **Task 7.4**: Verify success criteria
  - Confirm all batsmen being extracted
  - Confirm all bowlers being extracted
  - Verify edge cases handled correctly
  - No increase in error rates
  
- [ ] **Task 7.5**: Post-deployment review
  - Document lessons learned
  - Update incident log if this resolves known issues
  - Plan follow-up improvements if needed

**Acceptance**: Successful deployment with confirmed improvement in data completeness.

---

## Progress Tracking

**Overall Status**: Not Started

| Phase | Status | Start Date | Completion Date | Notes |
|-------|--------|------------|-----------------|-------|
| Investigation | Not Started | - | - | |
| Code Changes | Not Started | - | - | |
| Testing | Not Started | - | - | |
| Integration | Not Started | - | - | |
| Documentation | Not Started | - | - | |
| Deployment | Not Started | - | - | |

**Next Action**: Begin Task 1.1 - Capture sample API responses
