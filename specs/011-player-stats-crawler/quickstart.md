# Quickstart Guide: Decoupled Player Stats Crawler

**Feature**: 011-player-stats-crawler  
**Date**: 2026-03-24  
**Audience**: Developers and operators implementing or validating the new player-stats worker

> This quickstart describes the **target development workflow** for the planned implementation. It is intentionally aligned to the current VictoryLine scraper/backend layout so the feature can be built and validated without redesigning the stack.

## Prerequisites

- **Python**: 3.9+ for `apps\scraper\crex_scraper_python`
- **Java**: 8/11 for `apps\backend\spring-security-jwt`
- **Redis**: available locally or via Docker
- **Playwright Chromium**: installed for the scraper codebase
- **Backend running locally** so the worker can read canonical match candidates and push snapshots

## Initial Setup

### 1. Backend

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\backend\spring-security-jwt
mvn spring-boot:run
```

Expected candidate endpoints once backend is up:

- `http://127.0.0.1:8099/cricket-data/live-matches`
- `http://127.0.0.1:8099/cricket-data/upcoming-matches`

### 2. Scraper Environment

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\scraper\crex_scraper_python

# If needed
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium
```

### 3. Primary Scraper (existing live pipeline)

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\scraper\crex_scraper_python
python src\app.py
```

Health endpoints already used by this repo:

- `http://127.0.0.1:5000/health`
- `http://127.0.0.1:5000/status`

## Planned Feature Flags

Set these before starting the new worker:

```powershell
$env:ENABLE_PLAYER_STATS_CRAWLER = "true"
$env:ENABLE_PLAYER_STATS_LIVE = "true"
$env:ENABLE_PLAYER_STATS_UPCOMING = "true"
$env:ENABLE_PLAYER_STATS_ESPN_ENRICHMENT = "false"

$env:PLAYER_STATS_PRIMARY_SCRAPER_STATUS_URL = "http://127.0.0.1:5000/status"
$env:PLAYER_STATS_LIVE_INTERVAL_SECONDS = "20"
$env:PLAYER_STATS_UPCOMING_INTERVAL_SECONDS = "600"
$env:PLAYER_STATS_UPCOMING_NEAR_START_INTERVAL_SECONDS = "120"
$env:PLAYER_STATS_PREMATCH_WINDOW_HOURS = "24"
$env:PLAYER_STATS_MAX_CONCURRENCY = "2"
$env:PLAYER_STATS_RATE_LIMIT_TOKENS_PER_SEC = "0.5"
$env:PLAYER_STATS_RATE_LIMIT_BURST = "2"
$env:PLAYER_STATS_QUEUE_MAX = "100"
```

## Planned Worker Startup

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\scraper\crex_scraper_python
python src\player_stats_app.py
```

Expected worker responsibilities:

1. poll backend for live and upcoming canonical match candidates
2. check primary scraper health before scheduling work
3. crawl live scorecard data and upcoming squad data on separate cadences
4. push snapshots to backend via planned player-stats sync endpoint

## Planned Backend APIs

The implementation should expose:

- `POST /cricket-data/player-stats/sync`
- `GET /cricket-data/player-stats/match/{externalMatchKey}`
- `POST /cricket-data/player-stats/enrich`

### Example smoke checks

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8099/cricket-data/live-matches
Invoke-RestMethod -Uri http://127.0.0.1:8099/cricket-data/upcoming-matches
Invoke-RestMethod -Uri http://127.0.0.1:5000/status | ConvertTo-Json -Depth 6
```

## Development Workflow

### Run targeted scraper tests

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\scraper\crex_scraper_python
pytest tests\unit -k "player_stats or scorecard or squad" -v
pytest tests\integration -k "player_stats" -v
```

### Run targeted backend tests

```powershell
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo\apps\backend\spring-security-jwt
mvn test -Dtest=PlayerStats*Test
```

### Compare safety before/after enablement

1. Start backend and primary scraper with `ENABLE_PLAYER_STATS_CRAWLER=false`.
2. Record live scraper `/status` output and any baseline freshness/PID values.
3. Start the player-stats worker with conservative defaults.
4. Compare:
   - primary scraper state
   - PID count
   - memory usage
   - live freshness / error rate
5. Disable the worker and verify live scraping remains unaffected.

## Recommended Local Validation Scenarios

### Scenario A - Live only

```powershell
$env:ENABLE_PLAYER_STATS_LIVE = "true"
$env:ENABLE_PLAYER_STATS_UPCOMING = "false"
$env:ENABLE_PLAYER_STATS_ESPN_ENRICHMENT = "false"
python src\player_stats_app.py
```

Validate that live snapshots arrive and the primary scraper remains healthy.

### Scenario B - Upcoming enabled

```powershell
$env:ENABLE_PLAYER_STATS_LIVE = "true"
$env:ENABLE_PLAYER_STATS_UPCOMING = "true"
$env:ENABLE_PLAYER_STATS_PREMATCH_WINDOW_HOURS = "24"
python src\player_stats_app.py
```

Validate `coverageState` transitions such as `NOT_AVAILABLE` → `SQUAD_ONLY` → `PLAYING_XI`.

### Scenario C - ESPN on-demand enrichment

```powershell
$env:ENABLE_PLAYER_STATS_ESPN_ENRICHMENT = "true"
python src\player_stats_app.py
```

Then trigger a planned backend request:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8099/cricket-data/player-stats/enrich `
  -ContentType "application/json" `
  -Body '{"externalMatchKey":"sample-match","playerKey":"sample-player"}'
```

Validate that:

- enrichment is queued asynchronously
- no live or upcoming base snapshot waits on ESPN
- negative-cache behavior works on misses

## Rollback / Kill Switch

The feature must be easy to disable:

```powershell
$env:ENABLE_PLAYER_STATS_CRAWLER = "false"
```

Operational expectations after disablement:

- the player-stats worker stops scheduling new jobs
- existing live scraper continues normally
- backend read APIs may continue serving the last persisted snapshots

## Notes

- Keep ESPN enrichment disabled in the first production rollout.
- Prefer a separate worker/container in non-local environments.
- If primary scraper health degrades, the player-stats worker should pause itself rather than compete for resources.
