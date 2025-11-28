# Delta for Scraper Configuration

## ADDED Requirements

### Requirement: Fast Polling Configuration
The scraper MUST support configurable polling intervals for live match updates.

#### Scenario: Live match polling
- GIVEN a live cricket match is being scraped
- WHEN the scraper is configured with `live_polling_interval_seconds = 1.0`
- THEN the observation loop SHALL poll every 1 second

#### Scenario: Scorecard polling
- GIVEN a live cricket match is being scraped
- WHEN the scraper is configured with `scorecard_polling_interval_seconds = 5.0`
- THEN the dedicated scorecard poller SHALL fetch sC4 data every 5 seconds

### Requirement: Immediate API Response Push
The scraper MUST push data immediately when API responses are received.

#### Scenario: sV3 response immediate push
- GIVEN `push_on_api_response = True`
- WHEN a sV3 API response is intercepted
- THEN the scraper SHALL immediately push the data to the backend
- AND the push SHALL occur in a background thread to avoid blocking

#### Scenario: Ball-by-ball sequence
- GIVEN a live match with continuous play
- WHEN balls 9.3, 9.4, 9.5, 9.6 occur in sequence
- THEN all four ball updates SHALL be captured and pushed
- AND no balls SHALL be skipped due to polling timing

### Requirement: Scorecard Freshness
The scraper MUST maintain scorecard freshness within acceptable limits.

#### Scenario: Scorecard update latency
- GIVEN a batsman scores runs
- WHEN the sC4 API reflects the updated stats
- THEN the backend SHALL receive the updated scorecard within 10 seconds

## MODIFIED Requirements

### Requirement: Polling Interval
The observation loop polling interval SHOULD be configurable (previously hardcoded to 2.5 seconds).

#### Scenario: Configurable polling
- GIVEN the scraper settings include `live_polling_interval_seconds`
- WHEN the observation loop waits between iterations
- THEN it SHALL wait for the configured interval (default: 1.0 second)
