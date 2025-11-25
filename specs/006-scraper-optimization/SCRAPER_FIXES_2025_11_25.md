# Scraper Fixes - 2025-11-25

## 1. Discovery Service Resilience ("Stumps" Fix)
**File**: `apps/scraper/crex_scraper_python/src/crex_main_url.py`

**Issue**: 
Matches that went into a break (e.g., "Stumps", "Lunch") were often marked as "completed" or simply stopped being scraped. When they went live again, the discovery service ignored them because they were already present in the `scraped_urls` database (no "new" URL detected).

**Fix**:
Modified the `scrape()` function to iterate through **all** currently visible live URLs in the DOM, not just the newly added ones.
- Checks if a scraper thread is currently running for each live URL.
- If a URL is live in the DOM but has no active thread (or the thread died), it triggers `/start-scrape` immediately.
- This ensures self-healing for interrupted matches.

## 2. Data Extraction Enhancements
**Files**: 
- `apps/scraper/crex_scraper_python/src/cricket_data_service.py`
- `apps/scraper/crex_scraper_python/src/adapters/crex_adapter.py`

### Score Update Mapping
**Issue**: The backend expects specific strings for `current_ball` / `score_update`, but the API returns codes like 'e' or 'B'.
**Fix**:
- Mapped `'e'` -> `"player entering"`
- Mapped `'B'` -> `"ball start"`

### Overs Data Extraction
**Issue**: `overs_data` was missing from the payload sent to the backend.
**Fix**:
- Added `overs_data` to the payload in `cricket_data_service.py`.
- Enhanced `crex_adapter.py` to extract overs data from multiple sources in the API response:
    - **Primary**: `rb` (Recent Balls) field - contains detailed ball-by-ball data.
    - **Fallback**: `l` (Last), `n` (Next to last), `m` (3rd last) fields - parsed as over strings.
- Relaxed network interception to match `"sV3"` instead of strict `"sV3.php"` to ensure API responses are captured.

## 3. Browser Pool Recovery
**Files**:
- `apps/scraper/crex_scraper_python/src/browser_pool.py`
- `apps/scraper/crex_scraper_python/src/discovery.py`

**Issue**:
The discovery service encountered `Connection closed while reading from the driver` errors, causing the discovery loop to fail repeatedly. The browser pool was not correctly invalidating the broken Playwright instance, leading to a loop of failed attempts to use a dead driver.

**Fix**:
- Updated `AsyncBrowserPool.get_context` to aggressively clean up both the `Browser` and `Playwright` instances when a critical error (Target closed/Connection closed) occurs.
- This forces a complete re-initialization of the browser stack on the next cycle, ensuring recovery from driver crashes.
- Added explicit logging in `discovery.py` to indicate when this recovery mechanism is triggered.
