# Fixture Scraper Implementation Guide

## Feature 005: Upcoming Matches Feed - Scraper Component

### Overview

The fixture scraper infrastructure is complete and ready to use. The only remaining task is to implement the actual HTML parsing logic specific to Crex.live's fixture page structure.

### What's Already Implemented ✅

1. **CrexFixtureScraper** (`crex_fixture_scraper.py`)
   - HTTP + BeautifulSoup fetching (primary method)
   - Playwright browser automation fallback
   - Exponential backoff retry logic (2s → 4s → 5s max)
   - Strict browser cleanup to prevent PID leaks
   - Framework for parsing fixture cards

2. **UpcomingMatchApiClient** (`upcoming_match_api_client.py`)
   - Single match upsert with retry
   - Batch upsert with automatic chunking (100 matches/batch)
   - Backend health checking
   - Full error handling

3. **FixtureScraperScheduler** (`fixture_scraper_scheduler.py`)
   - 10-minute interval scheduling
   - Run immediately on startup
   - Statistics tracking (success rate, counts, errors)
   - Manual trigger capability via API

4. **Integration**
   - Scheduler auto-starts with Flask app
   - Status endpoint: `GET /api/fixtures/status`
   - Trigger endpoint: `POST /api/fixtures/trigger`
   - Configuration via environment variables

### What Needs Implementation 🚧

#### Step 1: Inspect Crex.live HTML Structure

Visit https://crex.live/fixtures in a browser and inspect the HTML to identify:

1. **Container element** for fixture cards (e.g., `<div class="fixture-card">`)
2. **Match ID/key** attribute (e.g., `data-match-id="12345"`)
3. **Series name** element (e.g., `<span class="series">ICC World Cup 2025</span>`)
4. **Team names** elements (e.g., `<span class="team-a">India</span>`)
5. **Match time** element and format (e.g., `<time>Jan 15, 2025 14:30 IST</time>`)
6. **Venue information** (if available)

#### Step 2: Update `_parse_fixtures()` Method

In `crex_fixture_scraper.py`, replace the placeholder parsing logic:

```python
def _parse_fixtures(self, html: str) -> List[UpcomingMatch]:
    matches = []
    soup = BeautifulSoup(html, 'html.parser')
    
    # REPLACE THIS with actual selector based on Crex.live HTML
    fixture_cards = soup.find_all('div', class_='actual-class-from-crex')
    
    logger.info(f"Found {len(fixture_cards)} fixture cards")
    
    for card in fixture_cards:
        try:
            match = self._parse_fixture_card(card)
            if match:
                matches.append(match)
        except Exception as e:
            logger.warning(f"Error parsing fixture card: {e}")
            continue
    
    return matches
```

#### Step 3: Update `_parse_fixture_card()` Method

Update with actual selectors and parsing logic:

```python
def _parse_fixture_card(self, card) -> Optional[UpcomingMatch]:
    # Extract match ID/key
    source_key = card.get('data-match-id') or card.find('a')['href']
    
    # Extract series name
    series_elem = card.find('span', class_='actual-series-class')
    series_name = series_elem.text.strip() if series_elem else "Unknown Series"
    
    # Extract team names
    team_a_elem = card.find('span', class_='actual-team-a-class')
    team_b_elem = card.find('span', class_='actual-team-b-class')
    
    if not team_a_elem or not team_b_elem:
        return None
    
    team_a_name = team_a_elem.text.strip()
    team_b_name = team_b_elem.text.strip()
    
    # Extract and parse match time
    time_elem = card.find('time', class_='actual-time-class')
    start_time = self._parse_match_time(time_elem.text.strip())
    
    if not start_time:
        return None
    
    # Create UpcomingMatch instance
    return UpcomingMatch(
        source="crex",
        source_key=source_key,
        series_name=series_name,
        match_title=f"{team_a_name} vs {team_b_name}",
        team_a_name=team_a_name,
        team_b_name=team_b_name,
        start_time_utc=start_time,
        last_scraped_at=datetime.now(timezone.utc),
        status=MatchStatus.SCHEDULED
    )
```

#### Step 4: Update `_parse_match_time()` Method

Implement time parsing based on Crex.live's actual format:

```python
def _parse_match_time(self, time_str: str) -> Optional[datetime]:
    try:
        # Example: "15 Jan 2025, 14:30 IST"
        from dateutil import parser
        
        # Remove IST/timezone suffix if needed
        time_str_clean = time_str.replace(' IST', '').replace(' GMT', '')
        
        dt = parser.parse(time_str_clean)
        
        # Convert IST to UTC (IST = UTC+5:30)
        if 'IST' in time_str:
            from datetime import timedelta
            dt = dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        else:
            # Assume UTC if no timezone
            dt = dt.replace(tzinfo=timezone.utc)
        
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    
    except Exception as e:
        logger.warning(f"Error parsing time '{time_str}': {e}")
        return None
```

### Testing the Scraper

#### 1. Manual Test

```python
# Create test script: test_fixture_scraper.py
from crex_scraper_python.crex_fixture_scraper import CrexFixtureScraper
from crex_scraper_python.src.config import Config

config = Config()
scraper = CrexFixtureScraper(config)

matches = scraper.scrape_fixtures()
print(f"Scraped {len(matches)} matches:")
for match in matches:
    print(f"  - {match.match_title} @ {match.start_time_utc}")
```

Run: `python test_fixture_scraper.py`

#### 2. Test via Flask API

```bash
# Start the scraper service
python crex_main_url.py

# Check scheduler status
curl http://localhost:5000/api/fixtures/status

# Trigger immediate scrape
curl -X POST http://localhost:5000/api/fixtures/trigger

# Check status again to see results
curl http://localhost:5000/api/fixtures/status
```

#### 3. Verify Backend Data

```bash
# Check if matches were upserted to backend
curl http://backend:8080/api/v1/matches/upcoming
```

### Environment Variables

Configure in `.env` or docker-compose:

```bash
# Backend API URL
BACKEND_URL=http://backend:8080

# Scraper timeout (seconds)
SCRAPER_TIMEOUT=10

# Logging
LOGGING_LEVEL=INFO
```

### Debugging Tips

1. **Enable debug logging**: Set `LOGGING_LEVEL=DEBUG`
2. **Check scraper logs**: `tail -f crex_scraper.log`
3. **Test HTTP fetch**: 
   ```python
   scraper._fetch_with_http()  # Should return HTML string
   ```
4. **Test parsing**: 
   ```python
   html = scraper._fetch_with_http()
   matches = scraper._parse_fixtures(html)
   ```
5. **Inspect HTML structure**:
   ```python
   from bs4 import BeautifulSoup
   soup = BeautifulSoup(html, 'html.parser')
   print(soup.prettify())
   ```

### Monitoring

The scheduler provides comprehensive statistics:

```json
{
  "running": true,
  "interval_seconds": 600,
  "last_run_time": "2025-01-15T10:30:00Z",
  "last_run_status": "success",
  "last_run_matches_count": 42,
  "last_error": null,
  "total_runs": 15,
  "successful_runs": 14,
  "failed_runs": 1,
  "success_rate": "93.3%"
}
```

### Next Steps

1. ✅ Inspect Crex.live HTML structure
2. ✅ Update `_parse_fixtures()` with actual selectors
3. ✅ Update `_parse_fixture_card()` with extraction logic
4. ✅ Update `_parse_match_time()` with format handling
5. ✅ Test manually with `test_fixture_scraper.py`
6. ✅ Deploy and monitor via `/api/fixtures/status`

### Related Files

- **Scraper**: `apps/scraper/crex_scraper_python/crex_fixture_scraper.py`
- **API Client**: `apps/scraper/crex_scraper_python/upcoming_match_api_client.py`
- **Scheduler**: `apps/scraper/crex_scraper_python/fixture_scraper_scheduler.py`
- **Config**: `apps/scraper/crex_scraper_python/src/config.py`
- **Flask App**: `apps/scraper/crex_main_url.py`
- **Data Model**: `apps/scraper/models/upcoming_match.py`

### Critical Reminders

⚠️ **Browser Cleanup**: The scraper uses `with sync_playwright()` context manager and explicit cleanup to prevent PID leaks (per incident SCRAPER_THREAD_LEAK_INCIDENT.md)

⚠️ **Retry Logic**: Exponential backoff with 2s initial, 2x multiplier, 5s max (per clarification decision)

⚠️ **Batch Size**: Backend limits to 100 matches per batch; client auto-chunks larger batches

⚠️ **Validation**: Python dataclass validates all fields; backend also validates via DTOs
