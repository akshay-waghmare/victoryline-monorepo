# Change: Fix Scorecard Data Scraping - Missing Batsman and Bowler Stats

**Change ID**: `fix-scorecard-scraping-incomplete-data`  
**Status**: Proposed  
**Created**: 2025-11-20  
**Impact**: Medium

## Why

The scorecard scraper in `crex_scraper.py` is not extracting all batsman and bowler data from live match API responses. Users are seeing incomplete scorecards with missing player statistics, which undermines the real-time accuracy requirement of the application. This affects match detail pages and live score updates.

### Root Cause Analysis

The current implementation in `crex_scraper.py` assumes all data is present in the response 'a' (bowlers) and 'b' (batsmen) attributes, but there are several issues:

- **Incomplete data parsing**: Missing batsman/bowler entries are silently dropped
- **String format mismatches**: Edge cases in dismissal patterns and player status not handled
- **Edge cases with dismissals**: Complex dismissal strings may fail to parse
- **Current batting status**: Players currently batting may have different data format
- **Yet-to-bat players**: Players who haven't batted may be represented differently
- **Possible pagination or lazy-loading**: API response structure may vary during match

## What Changes

### Core Changes
- **Enhance data extraction logic** in `parse_batsman_string()` and `parse_bowler_string()` to handle edge cases
- **Add validation** for incomplete API responses (missing or malformed 'a' and 'b' attributes)
- **Improve error handling** for string format mismatches and parsing failures
- **Add comprehensive logging** to track missing data patterns for debugging
- **Handle edge cases**: yet-to-bat players, currently batting status, dismissals, pagination/lazy-loading

### Files Modified
- `apps/scraper/crex_scraper.py` - Core parsing functions
- `apps/scraper/cricket_data_service.py` - Data service integration (if needed)
- `apps/scraper/shared.py` - Shared utilities (if needed)

## Impact

### Affected Specs
- `scraper-data-extraction` (new capability spec)

### Breaking Changes
**None** - This is a bug fix that improves data completeness without changing API contracts or data structures.

### User Impact
- **Positive**: Complete scorecard data displayed for all matches
- **Positive**: Better error visibility through detailed logging
- **Risk**: Low - Changes are additive with fallback logic

## Success Criteria

- [ ] All batsmen (including yet-to-bat) are extracted from scorecard
- [ ] All bowlers (including those who haven't bowled) are extracted
- [ ] Edge cases handled: dismissals, current batting, not-yet-batting
- [ ] Error logs clearly indicate parsing failures with sample data
- [ ] Integration tests pass with various match states (ongoing, completed, rain delay)
- [ ] Zero regressions in existing scorecard functionality
- [ ] Validation warnings logged when player counts don't match expectations

## Rollout Plan

### Phase 1: Investigation (Day 1)
1. Capture sample API responses from live matches showing missing data
2. Identify specific patterns causing parsing failures
3. Document edge cases and create test fixtures

### Phase 2: Implementation (Day 2-3)
1. Add comprehensive logging to identify missing data patterns
2. Implement fixes for parsing functions with validation
3. Add unit tests for all edge cases
4. Test with captured API responses

### Phase 3: Testing (Day 4)
1. Test with live matches in various states
2. Monitor logs for parsing errors
3. Verify completeness metrics
4. Code review and refinement

### Phase 4: Deployment (Day 5)
1. Deploy to production scraper
2. Monitor logs for 24 hours to confirm fix
3. Track scorecard completeness metrics
4. Update documentation

## Open Questions

- [ ] Are there specific match types or tournaments where this issue is more prevalent?
- [ ] Should we implement retry logic for incomplete data?
- [ ] Do we need to store validation warnings in the database for analytics?

## Sign-off

- [ ] **Author**: Implementation complete and tested
- [ ] **Reviewer**: Code review passed
- [ ] **QA**: Integration tests passed
- [ ] **Product**: Acceptance criteria met
