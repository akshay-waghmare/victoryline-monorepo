# Public Model Output Inventory

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Purpose

This inventory records the model-like outputs already visible in the current stack so Spec 044 can reuse real data instead of inventing product promises.

## Confirmed Available Inputs

### Match identity and state

- teams
- match slug / URL
- lifecycle state
- match status
- venue
- match date
- result summary
- toss info

Evidence:

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/seo/match-seo.service.ts`

### Commentary and score state

- commentary entries
- over / ball context
- scoreboard state
- lineups / scorecard / match-info APIs

Evidence:

- `apps/frontend/src/app/cricket-odds/*`
- `apps/frontend/src/app/match-live/*`

### Team-odds style probability signal

- `team_odds`
- favorite team signal
- derived win probability labels in frontend

Evidence:

- `apps/backend/.../CricketDataDTO.java`
- `apps/scraper/crex_scraper_python/src/cricket_data_service.py`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/match-live/services/live-hero-state.service.ts`

### Session pressure signal

- `session_odds`
- session odds list in frontend and scraper flow

Evidence:

- `apps/backend/.../CricketDataDTO.java`
- `apps/scraper/crex_scraper_python/src/cricket_data_service.py`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`

## Product Translation

These are the approved public-language translations for the first implementation slice.

| Raw output | Public-language translation |
|---|---|
| `team_odds` | win probability / current model direction |
| `session_odds` | pressure or session signals |
| commentary events | what changed |
| score progression, wickets, required rate | why it changed |
| current state + upcoming overs / wickets in hand | what matters next |

## Not Approved For Public Framing Yet

- internal dashboard or exposure-monitoring language
- operator controls
- any claim of guaranteed outcomes

## Gap Notes

- public intelligence packaging exists only partially today
- event taxonomy and dedicated intelligence route still need implementation
- turning-point preservation for completed matches still needs product structure
