# Data Model: Upcoming Matches

Date: 2025-11-16

## Entities

### UpcomingMatch

Purpose: Persist normalized fixture (upcoming match) records as the authoritative source for the API.

Fields:
- id: bigint, PK, auto-increment
- source: varchar(32), NOT NULL — e.g., "crex"
- source_key: varchar(128), NOT NULL — stable key/URL slug/id from source
- series_name: varchar(255), NOT NULL
- match_title: varchar(255), NOT NULL — e.g., "India vs Australia"
- team_a_name: varchar(128), NOT NULL
- team_b_name: varchar(128), NOT NULL
- team_a_code: varchar(16), NULL — e.g., "IND"
- team_b_code: varchar(16), NULL — e.g., "AUS"
- start_time_utc: datetime(3) UTC, NOT NULL
- venue_name: varchar(255), NULL
- city: varchar(128), NULL
- country: varchar(128), NULL
- status: enum('scheduled','postponed','cancelled'), DEFAULT 'scheduled'
- notes: varchar(512), NULL — short free-text for special cases
- last_scraped_at: datetime(3) UTC, NOT NULL
- created_at: datetime(3) UTC, NOT NULL (default NOW)
- updated_at: datetime(3) UTC, NOT NULL (on update NOW)

Constraints & Indexes:
- UNIQUE (source, source_key)
- INDEX (start_time_utc)
- INDEX (series_name)
- INDEX (team_a_name)
- INDEX (team_b_name)

Relationships:
- None required in Phase 1. Future: link to teams table when available.

DTO Shape (response data):
```json
{
  "id": 12345,
  "source": "crex",
  "sourceKey": "india-vs-australia-2025-12-01",
  "seriesName": "Border-Gavaskar Trophy",
  "matchTitle": "India vs Australia",
  "teamA": { "name": "India", "code": "IND" },
  "teamB": { "name": "Australia", "code": "AUS" },
  "startTime": "2025-12-01T09:30:00Z",
  "venue": { "name": "Wankhede Stadium", "city": "Mumbai", "country": "India" },
  "status": "scheduled",
  "lastUpdated": "2025-11-16T08:45:12.345Z"
}
```

## Validation Rules

- source in {"crex"} (Phase 1); reserved for future expansion
- source_key: non-empty, max 128 chars, URL-safe preferred
- series_name, match_title: non-empty, trimmed, max 255
- team names: non-empty, trimmed, max 128
- team codes: uppercase A–Z, 2–4 letters if present
- start_time_utc: ISO-8601; should be ≥ now() - 1 day (fixtures can be added late or corrected) — warn if < now()
- status: one of scheduled/postponed/cancelled
- last_scraped_at: set on each scraper sync

## State Transitions

- scheduled → postponed | cancelled
- postponed → scheduled (if rescheduled)
- cancelled: terminal (rare reversion; if so, create new record with new source_key)

## Notes

- All times treated/stored as UTC. Backend may format local time for UI later (Phase 2 UI scope).
- Schema anticipates multi-source reconciliation without requiring it in Phase 1.
