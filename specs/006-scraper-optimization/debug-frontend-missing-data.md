# Debug Plan: Frontend Missing Data (Ball-by-Ball, Batsman, Bowler, Odds)

**Feature**: 006-scraper-optimization
**Date**: 2025-11-24
**Status**: Investigation

## Problem Description
The frontend is receiving some live updates via websockets but is missing critical match details:
- **Current Ball**: Not displayed.
- **Current Batsman**: Not displayed.
- **Current Bowler Stats**: Not displayed.
- **Odds**: User reports not seeing them, though logs show some odds data arriving.

## Log Analysis
From the provided frontend logs:
1.  **Odds Data**:
    - Received: `destination:/topic/cricket...team_odds`
    - Payload: `{"team_odds":{"backOdds":"27","layOdds":"29"}}`
    - Component Log: `Team Odds: {backOdds: '27', layOdds: '29'}`
    - *Observation*: Data reaches the component. If not visible, it might be a UI rendering issue or the data format doesn't match what the template expects.

2.  **Bowler Data**:
    - Received: `destination:/topic/cricket...bowler_data`
    - Payload Length: 131 bytes (content not fully visible in snippet, but message arrived).
    - *Observation*: Data is arriving. Need to verify payload structure.

3.  **Overs Data (Ball-by-Ball)**:
    - Component Log: `No overs_data available`
    - *Observation*: This suggests the `overs_data` field is missing or empty in the `match_update` or separate topic.

4.  **Match Update**:
    - Received: `destination:/topic/cricket...url` (contains match update?)
    - Payload: `{"url":"..."}`
    - *Observation*: The `url` topic seems to carry the match URL, but usually, the main score update comes on a different topic or as part of a larger payload. The logs show `matches.push.payload` in the scraper sending `match_update` with `score`, `overs_data`, etc. We need to confirm if this reaches the frontend.

## Hypothesis
1.  **Scraper Extraction**: The scraper might be extracting the data (as seen in scraper logs) but maybe not all fields are correctly mapped or populated for every update.
2.  **Backend Transformation**: The backend might be filtering or failing to map the `overs_data`, `batsman`, and `bowler` fields from the scraper's REST payload to the Websocket broadcast.
3.  **Frontend Consumption**: The frontend component might be expecting a different JSON structure than what is being sent.

## Investigation Plan

### Step 1: Verify Scraper Output
- Check `apps/scraper/crex_scraper_python/src/crex_scraper.py` and `dom_match_extract.py`.
- Confirm that `overs_data`, `current_batsmen`, and `current_bowlers` are being extracted and included in the payload sent to the backend.

### Step 2: Verify Backend Processing
- Check `apps/backend/src/main/java/com/victoryline/backend/controller/CricketDataController.java` (or similar).
- Trace how the `/cricket-data/live-matches` (or update endpoint) processes the payload.
- Check `apps/backend/src/main/java/com/victoryline/backend/service/CricketDataService.java` and how it publishes to `SimpMessagingTemplate`.
- Verify the topic destinations and payload structures.

### Step 3: Verify Frontend Subscription
- Check `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`.
- Verify which topics it subscribes to.
- Check how it parses the incoming JSON.
- Look for `overs_data` access.

## Action Items
1.  [ ] Inspect Scraper extraction logic for `overs_data`.
2.  [ ] Inspect Backend `CricketDataController` for websocket publishing logic.
3.  [ ] Compare Scraper payload vs Frontend expectation.

## Resolution (2025-11-25)

### Issue: Missing Current Ball for Completed Matches
**Symptoms**: 
- Completed matches (e.g., "West Indies U19 won by 98 runs") were showing blank or null for the "Current Ball" field on the frontend.
- Database showed `CURRENT_BALL` as `null`.

**Root Cause**:
1.  **Scraper**: The scraper relies on the live API field "B" for `current_ball`. For completed matches, this field is often missing. The match result text (e.g., "Team A won") is available in the DOM (`.result-box` or `.final-result`) but wasn't being used as a fallback for `current_ball`.
2.  **Backend/Scraper Mismatch**: The backend `JacksonCustomCricketDeserializer` expects the current ball text to be in a field named `score_update` (legacy reason), but the scraper was sending it as `current_ball`. The deserializer was ignoring `current_ball`.

**Fix Implemented**:
1.  **Scraper Adapter (`crex_adapter.py`)**: 
    - Added logic to extract `result_box` or `result` text from the DOM.
    - If `current_ball` is missing (or if match end is detected via keywords), the scraper now uses the result text as `current_ball`.
2.  **Scraper Service (`cricket_data_service.py`)**:
    - Updated the payload construction to map `data["current_ball"]` to `payload["score_update"]`.
    - This ensures the backend deserializer picks it up correctly without requiring backend code changes.

**Verification**:
- Scraper logs show: `matches.push.payload ... 'score_update': 'West Indies U19 won by 98 runs 🏆'`
- Frontend now displays the result text in the current ball indicator.
