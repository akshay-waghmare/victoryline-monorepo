# Caching Architecture — Instant Match Data Loading

**Date**: 2025-03-08  
**Branch**: `008-match-title-seo`  
**Commits**: `66d03a0`, `1dd4007`, `92dbced`

## Problem

When a user navigates to a live match page, all data (score, batsman, bowler, overs, odds, match info, lineups) loaded from scratch via HTTP + WebSocket. This caused a perceptible 1-3 second blank state before data appeared.

## Solution: Three-Layer Caching Architecture

### Layer 1 — Frontend: Stale-While-Revalidate (SWR)

**File**: `apps/frontend/src/app/cricket-odds/cricket-odds.service.ts`

- **Pattern**: `concat(of(cachedData), httpRequest$)` — emits cached data instantly, then fresh HTTP data when it arrives.
- **Storage**: Dual-write to in-memory `Map<string, any>` + `sessionStorage` (survives tab refreshes within a session).
- **Cache Key Prefix**: `vl_cache_` (e.g., `vl_cache_lastUpdated_{matchUrl}`, `vl_cache_matchInfo_{matchUrl}`)
- **Applies to**: `getLastUpdatedData()`, `getMatchInfo()`, `getScorecardInfo()`
- **WebSocket Merge**: Each WS message carries a single field (e.g., `{batsman_data: []}`). The frontend now **merges** partial WS updates into the existing cache (`{...existing, ...partial}`) instead of replacing.

### Layer 2 — Backend: In-Memory TTL Cache

**File**: `apps/backend/.../CricketDataService.java`

- **Structure**: `ConcurrentHashMap<String, CacheEntry<CricketDataDTO>>` with 10-second TTL.
- **CacheEntry**: Inner class holding `data`, `timestamp`, and `isExpired(ttlMs)` method.
- **Read path** (`getLastUpdatedData`): Checks cache first → returns if not expired → otherwise queries DB, caches result, returns.
- **Write path** (`setLastUpdatedData`): Invalidates cache entry (removed from map). Next read rebuilds from DB.
- **Transient Data Enrichment** (`enrichCacheWithTransientData`): After each scraper push, merges transient fields (`batsmanData`, `bowlerData`, `toss_won_country`) into the cached DTO. These fields are NOT persisted to MySQL — they only exist in WebSocket broadcasts and this in-memory cache.

### Layer 3 — Scraper: Match Info Re-Push

**File**: `apps/scraper/crex_scraper_python/src/crex_scraper.py`

- Previously, match info was only pushed to the backend when freshly fetched from the Crex info page.
- After a backend container rebuild, the DB has match info but the in-memory cache is empty, and match info/lineups would appear missing.
- Fix: Always re-push cached match info on every scrape cycle, ensuring the backend cache stays populated.

## Data Flow

```
User opens match page
    │
    ├─► Frontend emits cached data from sessionStorage (instant)
    │
    ├─► Frontend fires HTTP GET /api/v1/cricket-data/{url}
    │       │
    │       └─► Backend checks in-memory cache (ConcurrentHashMap)
    │               ├─ HIT & not expired → return cached DTO (includes batsman/bowler)
    │               └─ MISS or expired → query MySQL → cache result → return
    │
    ├─► Frontend emits fresh HTTP data (replaces stale cached view)
    │
    └─► WebSocket connects → receives real-time partial updates
            │
            └─► Frontend merges each partial update into cache
                (available instantly on next page visit)
```

## Transient Fields (Not in MySQL)

These fields are sent by the scraper, broadcast via WebSocket, and stored in the backend in-memory cache, but **never persisted to the database**:

| Field | DTO Getter | Description |
|-------|-----------|-------------|
| `batsmanData` | `getBatsmanData()` | Current batting pair stats |
| `bowlerData` | `getBowlerData()` | Current bowler stats |
| `toss_won_country` | `getToss_won_country()` | Toss winner team name |

These are enriched into the cache via `CricketDataService.enrichCacheWithTransientData()` after every scraper push.

## Key Files Modified

| File | Change |
|------|--------|
| `cricket-odds.service.ts` | SWR pattern, dual-write cache, WS merge |
| `cricket-odds.component.ts` | Call `updateMatchDataCache()` on WS updates |
| `CricketDataService.java` | In-memory TTL cache, `enrichCacheWithTransientData()` |
| `CricketDataController.java` | Call `enrichCacheWithTransientData()` after scraper push |
| `crex_scraper.py` | Always re-push cached match info |

## Monitoring

- Backend cache hit/miss: Add logging to `getLastUpdatedData()` if needed.
- Frontend cache: Check `sessionStorage` keys starting with `vl_cache_` in browser DevTools.
- Transient field presence: Verify `batsmanData` and `bowlerData` in HTTP response JSON.
