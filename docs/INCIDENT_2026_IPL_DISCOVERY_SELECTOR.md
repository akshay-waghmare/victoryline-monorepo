# Incident: Scraper Discovery Silent Failure — IPL Match Not Detected

**Date**: 2026 (IPL 2026 season, 64th match LSG vs RR)  
**Status**: ✅ Resolved — Fix committed in `008-match-title-seo` branch  
**Severity**: High — All live matches missed for ~12 hours  
**Commit**: `753ff67` — `fix(scraper): fix discovery selector to handle nested anchor crex.com HTML structure`

---

## Symptoms

- Scraper health endpoint: `state="failing"`, `active_matches=0`, `seconds_since_last_scrape=43655` (~12 hours stale)
- `consecutive_failures=0` — scraper was NOT crashing, making it hard to detect
- `restart_recommended=false` — auto-restart never triggered
- Backend `/api/cricket-data/live-matches` returned 0 matches
- IPL 64th match (LSG vs RR) was live and visible on crex.com, but not being tracked

---

## Root Cause

### crex.com Angular DOM Structure (Two-Component Nesting)

crex.com uses two nested Angular components on `/live-matches`:

```
Outer component (sc80):
  <li class="live-card">
    <a href="/cricket-live-score/lsg-vs-rr-64th-match-...-1199">   ← MATCH link
      <app-form-match-card>                                          ← inner component

Inner component (sc82) rendered inside app-form-match-card:
  <div class="live-card-wrapper">
    <div class="live-card">
      <div class="live-card-top">
        <a href="/series/indian-premier-league-2026-1PW">           ← SERIES link (1st <a>)
          <div class="live">...</div>                                ← live indicator
        </a>
      </div>
      <a href="/cricket-live-score/lsg-vs-rr-64th-match-...-1199"> ← MATCH link (2nd <a>)
        <div class="live-card-middle">...</div>
      </a>
    </div>
  </div>
```

### Bug in `discovery.py` Strategy 2

```javascript
// BEFORE (buggy):
const a = div.querySelector('a');
// Returns: <a href="/series/indian-premier-league-2026-1PW">  ← WRONG
// href.includes('/cricket-live-score/') → FALSE → URL is silently discarded
```

`div.querySelector('a')` returns the **first** `<a>` inside the `.live-card` div, which is the series header link inside `.live-card-top`. This link does NOT contain `/cricket-live-score/`, so the subsequent href check fails and the match is discarded.

### Bug in `isLive()` check

```javascript
// BEFORE (fragile):
return element.querySelector('div.live') !== null;
```

This only matches `<div class="live">`. If Angular's hydration renders the element with a different tag (e.g., `<span class="live">`), the check fails. Also in Strategy 1, the `isLive()` guard on the outer `li.live-card` was redundant — the outer `li` itself is only rendered when the match is live.

### Why `consecutive_failures` stayed 0

The scraper is split into two processes:
- **Discovery** (`LiveMatchDiscoverer`): finds live matches on crex.com, registers them to backend
- **Poll loop** (`_poll_loop`): fetches registered matches from backend, scrapes them

Discovery ran every 60s, returned 0 URLs silently (no exception thrown), the backend never received any live match registrations, so `_poll_loop` fetched 0 tasks and scraped nothing. No exceptions → `consecutive_failures` = 0.

### Why auto-restart never triggered

The restart condition in `crex_scraper.py` requires `active_matches > 0` AND stale data:
```python
if active_matches > 0 and seconds_since_last_scrape > STALENESS_THRESHOLD:
    schedule_container_restart()
```
Since `active_matches = 0` (discovery found nothing), the restart was never scheduled.

---

## Fix

### `apps/scraper/crex_scraper_python/src/discovery.py`

1. **New `getMatchLink()` helper** — uses attribute selector to find the match URL specifically:
   ```javascript
   const getMatchLink = (element) => {
       return element.querySelector(
           'a[href*="/cricket-live-score/"], a[href*="/scoreboard/"]'
       );
   };
   ```

2. **Updated `isLive()` helper** — tag-agnostic class selector:
   ```javascript
   const isLive = (element) => {
       return element.querySelector('.live, .liveTag, [class*="live-indicator"]') !== null;
   };
   ```

3. **Strategy 1** — Removed redundant `isLive()` check; uses `getMatchLink(li) || li.querySelector('a')` so the specific match link is preferred.

4. **Strategy 2** — Uses `getMatchLink(div)` instead of `div.querySelector('a')` to correctly skip the series link.

5. **Strategy 3** — Activated as a real fallback: traverses match links and checks the nearest `.live-card` ancestor for a live indicator via `.closest()`.

6. **Deduplication** — Returns `[...new Set(urls)]` to avoid duplicate registrations.

---

## Deployment Steps

After merging this fix, deploy with:

```bash
# On prod server:
cd /home/administrator/victoryline-monorepo
git pull origin main

# Rebuild scraper image with the fix
docker compose build scraper

# Restart with new image
docker compose up -d scraper

# Verify recovery
docker compose logs scraper --tail=50 -f
curl http://localhost:5000/health | python3 -m json.tool
```

**Immediate mitigation (before code deploy)** — restart container to reset browser pool:
```bash
docker compose restart scraper
```

---

## Detection & Monitoring Gaps

The scraper was silently failing for ~12 hours before this was detected manually. The existing monitoring was insufficient because:

1. **Health score 30** ("failing") was correct, but `restart_recommended=false` gave a false sense that no action was needed
2. **Zero consecutive_failures** masked the discovery loop returning empty results
3. **No alerting** on sustained `active_matches=0` during known cricket schedules

### Recommended monitoring improvements

- [ ] Alert when `active_matches=0` AND `seconds_since_last_scrape > 600` AND known matches are scheduled
- [ ] Log discovery URL extraction results (how many cards found, how many URLs extracted, strategy used)
- [ ] Add a `discovery_urls_found` Prometheus metric

---

## Prevention

**When scraping Angular SSR pages**:
- Never use generic `querySelector('a')` on cards with multiple anchor tags — always use attribute selectors targeting the specific link type
- Use tag-agnostic class selectors (`.live`) instead of tag-specific ones (`div.live`)
- The `wait_for_selector` should include the actual match link format (already does: `a[href*='/cricket-live-score/']`) so the DOM is guaranteed to contain match links before `evaluate()` runs

**When crex.com changes its HTML structure**:
- The outer `li.live-card > a[href]` (Strategy 1) is the most reliable selector since the outer component's link is directly on the `li`
- Strategy 2 and 3 act as fallbacks for structural changes
