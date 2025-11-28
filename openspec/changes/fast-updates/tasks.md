## 1. Configuration Updates
- [ ] 1.1 Change `polling_interval_seconds` from 2.5 to 1.0 in `src/config.py`
- [ ] 1.2 Add `scorecard_polling_interval_seconds` (5.0) to ScraperSettings
- [ ] 1.3 Add `push_on_api_response` (True) to ScraperSettings

## 2. Immediate Push on sV3 Response
- [ ] 2.1 Modify `_setup_network_interception()` in `crex_adapter.py` to capture sV3 data
- [ ] 2.2 Add `_push_live_update()` async method to push immediately on sV3 response
- [ ] 2.3 Pass auth token and match context to adapter for immediate push
- [ ] 2.4 Add logging for immediate push events with timing metrics

## 3. Dedicated Scorecard Polling
- [ ] 3.1 Add `_scorecard_poll_loop()` async task in `CrexScraperService`
- [ ] 3.2 Track active matches needing scorecard polling
- [ ] 3.3 Call sC4 API every 5 seconds independently of main scrape cycle
- [ ] 3.4 Push scorecard updates via `CricketDataService.push_sc4_stats()`
- [ ] 3.5 Start scorecard poller in `start()` method
- [ ] 3.6 Stop scorecard poller gracefully in `stop()` method

## 4. CrexAdapter Enhancements
- [ ] 4.1 Store sC4 URL and headers when sV3 response is captured
- [ ] 4.2 Add `fetch_scorecard()` method for dedicated sC4 fetching
- [ ] 4.3 Reuse browser context for scorecard polling (from pool)

## 5. Testing & Validation
- [ ] 5.1 Add unit test for 1-second polling interval
- [ ] 5.2 Add integration test for immediate sV3 push
- [ ] 5.3 Add integration test for ball sequence verification (9.3 → 9.4 → 9.5)
- [ ] 5.4 Measure end-to-end latency (scraper → backend → frontend)
- [ ] 5.5 Performance test with multiple concurrent matches
- [ ] 5.6 Verify no regression in memory/PID usage

## 6. Documentation
- [ ] 6.1 Update MONITORING_GUIDE.md with new timing metrics
- [ ] 6.2 Document new configuration options
- [ ] 6.3 Add performance tuning guide
