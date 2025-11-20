# Spec: Scraper Data Extraction

**Capability**: Complete and robust extraction of cricket match scorecard data  
**Status**: Active Development  
**Owner**: Scraper Team  
**Last Updated**: 2025-11-20

---

## Overview

The scraper data extraction capability ensures that all batsman and bowler statistics are accurately and completely extracted from cricket match APIs. This spec defines requirements for parsing, validation, and error handling to ensure no player data is silently dropped or corrupted.

---

## ADDED Requirements

### Requirement: Complete Scorecard Data Extraction

**ID**: `SDE-001`  
**Priority**: High

The scraper SHALL extract all batsman and bowler statistics from the API response, including players who have not yet batted or bowled.

#### Scenario: Extract all batsmen including yet-to-bat

- **GIVEN** an API response with batsmen in 'b' attribute including codes for yet-to-bat players
- **WHEN** the scraper processes the innings data
- **THEN** all batsman codes are extracted, including those with minimal data
- **AND** yet-to-bat players have status = "yet_to_bat"
- **AND** no batsman codes are silently dropped
- **AND** extraction completes without exceptions

**Example**:
```json
// API Response 'b' attribute
"b": ["37X", "T2.44.39.7.0", "P5.12.8.2.0.66.T8.1.ct"]

// Expected extraction
[
  {code: "37X", status: "yet_to_bat", runs: 0, balls: 0, ...},
  {code: "T2", status: "batting", runs: 44, balls: 39, ...},
  {code: "P5", status: "dismissed", runs: 12, balls: 8, ...}
]
```

#### Scenario: Extract all bowlers including unused

- **GIVEN** an API response with bowlers in 'a' attribute including those who haven't bowled
- **WHEN** the scraper processes the innings data
- **THEN** all bowler codes are extracted
- **AND** bowlers with 0 overs have valid stats structure (0 runs, 0 wickets, 0 maidens)
- **AND** no bowler codes are silently dropped
- **AND** extraction completes without exceptions

**Example**:
```json
// API Response 'a' attribute
"a": ["T8", "P5.35.24.0.2", "66.18.12.1.0"]

// Expected extraction
[
  {code: "T8", overs: 0.0, runs: 0, wickets: 0, maidens: 0},
  {code: "P5", overs: 4.0, runs: 35, wickets: 2, maidens: 0},
  {code: "66", overs: 2.0, runs: 18, wickets: 0, maidens: 1}
]
```

---

### Requirement: Robust Parsing with Error Recovery

**ID**: `SDE-002`  
**Priority**: High

The scraper SHALL handle malformed or incomplete API data gracefully without crashing or silently dropping data.

#### Scenario: Handle malformed batsman string

- **GIVEN** a batsman string with unexpected format or missing fields
- **WHEN** `parse_batsman_string()` is called
- **THEN** the function returns best-effort parsed data with defaults for missing fields
- **AND** logs a WARNING with the original string for investigation
- **AND** does not raise an exception
- **AND** preserves the player code even if stats parsing fails

**Example**:
```python
# Malformed input
input_string = "37X.44.39"  # Missing expected fields

# Expected behavior
result = parse_batsman_string(input_string)
# Returns: {code: "37X", runs: 44, balls: 39, fours: 0, sixes: 0, ...}
# Logs: "WARNING: Incomplete batsman string '37X.44.39', using defaults"
```

#### Scenario: Handle malformed bowler string

- **GIVEN** a bowler string with unexpected format or missing fields
- **WHEN** `parse_bowler_string()` is called
- **THEN** the function returns best-effort parsed data with defaults for missing fields
- **AND** logs a WARNING with the original string for investigation
- **AND** does not raise an exception
- **AND** preserves the bowler code even if stats parsing fails

**Example**:
```python
# Malformed input
input_string = "T8.35"  # Missing expected fields

# Expected behavior
result = parse_bowler_string(input_string)
# Returns: {code: "T8", runs: 35, balls: 0, wickets: 0, maidens: 0, overs: 0.0}
# Logs: "WARNING: Incomplete bowler string 'T8.35', using defaults"
```

#### Scenario: Handle null or empty input

- **GIVEN** a null or empty string as input to parsing functions
- **WHEN** `parse_batsman_string()` or `parse_bowler_string()` is called
- **THEN** the function returns a default structure with all fields set to safe defaults
- **AND** logs a WARNING indicating invalid input
- **AND** does not raise an exception

---

### Requirement: Scorecard Completeness Validation

**ID**: `SDE-003`  
**Priority**: Medium

The scraper SHALL validate scorecard completeness and log warnings when expected player data is missing.

#### Scenario: Detect missing batsmen

- **GIVEN** an innings with fewer than 11 batsmen extracted
- **WHEN** scorecard validation runs
- **THEN** a WARNING is logged indicating missing batsmen count
- **AND** the list of found batsman codes is logged for debugging
- **AND** extraction continues (does not fail)
- **AND** completeness metrics are recorded

**Example**:
```python
# Only 8 batsmen extracted from innings
found_batsmen = ["37X", "T2", "P5", "66", "T8", "89", "12", "45"]

# Expected log
"WARNING: Innings 1 - Found 8/11 batsmen. Codes: [37X, T2, P5, 66, T8, 89, 12, 45]"
```

#### Scenario: Detect missing bowlers

- **GIVEN** an innings with fewer than expected bowlers (based on match format)
- **WHEN** scorecard validation runs
- **THEN** a WARNING is logged indicating missing bowlers
- **AND** the list of found bowler codes is logged for debugging
- **AND** extraction continues (does not fail)
- **AND** completeness metrics are recorded

#### Scenario: Validate completeness percentage

- **GIVEN** extracted scorecard data
- **WHEN** `validate_scorecard_completeness()` is called
- **THEN** returns a dict with completeness metrics
- **AND** includes: `{complete: bool, batsmen_count: int, bowlers_count: int, completeness_pct: float, warnings: list}`
- **AND** completeness is calculated as: `(found_players / expected_players) * 100`

---

## MODIFIED Requirements

### Requirement: Parse Batsman Statistics

**ID**: `SDE-004` (Modified)  
**Priority**: High

~~The scraper SHALL parse batsman strings from the 'b' attribute of innings data.~~

The scraper SHALL parse batsman strings from the 'b' attribute of innings data, handling all player states (batting, dismissed, yet-to-bat) with robust error recovery.

**Changes**:
- Added explicit handling for yet-to-bat status (single code with no stats)
- Added validation for empty/null input
- Added error logging for unparseable strings
- Return partial data instead of None on parsing errors
- Never raise exceptions - always return usable structure

#### Scenario: Parse yet-to-bat batsman

- **GIVEN** a batsman string containing only the player code (e.g., "37X")
- **WHEN** `parse_batsman_string()` is called
- **THEN** returns `{code: "37X", status: "yet_to_bat", runs: 0, balls: 0, fours: 0, sixes: 0, strike_rate: 0.0}`
- **AND** logs INFO message indicating yet-to-bat player detected

#### Scenario: Parse currently batting batsman

- **GIVEN** a batsman string with current stats (e.g., "T2.44.39.7.0")
- **WHEN** `parse_batsman_string()` is called
- **THEN** returns `{code: "T2", status: "batting", runs: 44, balls: 39, fours: 7, sixes: 0, strike_rate: 112.82}`
- **AND** no errors or warnings logged

#### Scenario: Parse dismissed batsman with full details

- **GIVEN** a batsman string with dismissal info (e.g., "P5.12.8.2.0.66.T8.1.ct")
- **WHEN** `parse_batsman_string()` is called
- **THEN** returns complete stats including dismissal details
- **AND** dismissal_type, fielder_code, and bowler_code are correctly parsed
- **AND** no errors or warnings logged

---

### Requirement: Parse Bowler Statistics

**ID**: `SDE-005` (Modified)  
**Priority**: High

~~The scraper SHALL parse bowler strings from the 'a' attribute of innings data.~~

The scraper SHALL parse bowler strings from the 'a' attribute of innings data, handling bowlers who have not yet bowled or have incomplete data with robust error recovery.

**Changes**:
- Added explicit handling for bowlers with 0 overs
- Added handling for single-code format (bowler not yet bowled)
- Added validation for empty/null input
- Added error logging for unparseable strings
- Return partial data instead of None on parsing errors
- Validate balls_bowled calculation (handle > 5 balls edge case)

#### Scenario: Parse bowler with zero overs (explicit format)

- **GIVEN** a bowler string with 0 balls bowled (e.g., "T8.0.0.0.0")
- **WHEN** `parse_bowler_string()` is called
- **THEN** returns `{code: "T8", overs: 0.0, runs: 0, balls: 0, maidens: 0, wickets: 0, economy: 0.0}`
- **AND** no errors or warnings logged

#### Scenario: Parse bowler not yet bowled (code only)

- **GIVEN** a bowler string containing only the bowler code (e.g., "T8")
- **WHEN** `parse_bowler_string()` is called
- **THEN** returns `{code: "T8", overs: 0.0, runs: 0, balls: 0, maidens: 0, wickets: 0, economy: 0.0}`
- **AND** logs INFO message indicating unused bowler detected

#### Scenario: Parse bowler with partial overs

- **GIVEN** a bowler string with decimal overs (e.g., "P5.35.24.0.2" = 4 overs + 0 balls = 24 balls, 35 runs, 2 wickets)
- **WHEN** `parse_bowler_string()` is called
- **THEN** overs are calculated correctly (24 balls = 4.0 overs)
- **AND** economy rate is calculated correctly (35/4.0 = 8.75)
- **AND** all stats parsed accurately

#### Scenario: Validate balls calculation

- **GIVEN** a bowler string with balls > 30 (indicating multiple overs)
- **WHEN** `parse_bowler_string()` calculates overs
- **THEN** overs = floor(balls / 6) + (balls % 6) / 10
- **AND** example: 23 balls = 3.5 overs (3 overs + 5 balls)
- **AND** edge case: 6 balls = 1.0 over (not 1.6)

---

## Implementation Notes

### Parsing Strategy

1. **Never fail silently**
   - Always log warnings for unparseable data
   - Use appropriate log levels: INFO (expected), WARNING (recoverable), ERROR (critical)
   - Include original string in log for debugging

2. **Default values**
   - Use sensible defaults (0 for numeric fields, empty string for optional text)
   - Ensure returned structure always matches expected schema
   - Document default values in code comments

3. **Preserve codes**
   - Always extract player/bowler codes even if stats parsing fails
   - Codes are primary keys for linking data
   - Never return None - always return at least {code: "XX", ...defaults}

4. **Status tracking**
   - Maintain batting status: "yet_to_bat", "batting", "dismissed"
   - Use status to inform downstream processing
   - Status helps identify data quality issues

### Known API Response Patterns

Based on observed production data:

**Batsmen ('b' attribute)**:
- Yet-to-bat: `"37X"` (code only)
- Currently batting: `"37X.44.39.7.0"` (code + 4 stats: runs.balls.fours.sixes)
- Dismissed: `"37X.44.39.7.0.66.86.2.PP.389/25.29-184.30/"` (full string with dismissal info)
  - Format: code.runs.balls.fours.sixes.bowler.fielder.dismissal_type.additional_info

**Bowlers ('a' attribute)**:
- Not yet bowled (option 1): `"T8"` (code only)
- Not yet bowled (option 2): `"T8.0.0.0.0"` (explicit zeros: runs.balls.maidens.wickets)
- Has bowled: `"T8.35.24.0.2"` (code.runs.balls.maidens.wickets)
  - Overs calculated from balls: 24 balls = 4.0 overs

**Edge Cases**:
- Empty 'b' or 'a' arrays (match not started or innings not yet begun)
- Null values in response (API error or data not available)
- Partially complete strings (API truncation or encoding issues)
- Unusual dismissal types (timed out, obstructing field, handled ball)

### Testing Data Sources

1. **Live API Responses**
   - Capture from ongoing matches
   - Save to `apps/scraper/test_data/api_responses/live/`
   - Include timestamp and match ID in filename

2. **Historical Data**
   - Completed match scorecards
   - Save to `apps/scraper/test_data/api_responses/completed/`
   - Cover various match formats (T20, ODI, Test)

3. **Edge Case Collection**
   - Rain-interrupted matches
   - Matches with substitutes
   - Matches with unusual dismissals
   - Save to `apps/scraper/test_data/api_responses/edge_cases/`

4. **Synthetic Test Data**
   - Manually crafted strings for unit tests
   - Cover all parsing branches
   - Include malformed data for error handling tests

---

## Success Metrics

### Completeness Metrics

- **Batsman Completeness**: `(batsmen_extracted / 11) * 100` ≥ 95%
- **Bowler Completeness**: `(bowlers_extracted / expected_bowlers) * 100` ≥ 90%
- **Overall Scorecard Completeness**: ≥ 95%

### Error Metrics

- **Parsing Error Rate**: < 1% of all parsing attempts
- **Fatal Errors**: 0 (no exceptions causing service crash)
- **Validation Warnings**: Track trend, investigate if increasing

### Performance Metrics

- **Parsing Performance**: < 10ms per innings (should not degrade)
- **Memory Usage**: No increase in scraper memory footprint
- **API Response Time**: Not affected by scraper changes

---

## Monitoring & Alerts

### Log Monitoring

Monitor these log patterns:

- `"WARNING: Incomplete batsman string"` - Track frequency, investigate if > 10/hour
- `"WARNING: Incomplete bowler string"` - Track frequency, investigate if > 10/hour
- `"WARNING: Innings X - Found Y/11 batsmen"` - Alert if Y < 9 consistently
- `"ERROR: Scorecard extraction failed"` - Alert immediately

### Metrics Dashboard

Create dashboard with:
- Scorecard completeness % over time (by match, by day)
- Parsing error rates (batsmen, bowlers, dismissals)
- Player count distributions (histogram of batsmen/bowlers found)
- Top parsing errors (by error type and frequency)

### Alerts

- **Critical**: Scorecard completeness < 80% for 5+ consecutive matches
- **Warning**: Parsing error rate > 5% for 1 hour
- **Info**: Unusual dismissal type detected (for data collection)

---

## Related Specs

- (Future) `scraper-api-resilience` - Handle API failures and retries
- (Future) `scraper-data-validation` - Comprehensive data quality checks
- (Existing) `scraper-resilience` (from Feature 004) - Resource management and health monitoring

---

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2025-11-20 | Initial spec created for fix-scorecard-scraping-incomplete-data | OpenSpec |
