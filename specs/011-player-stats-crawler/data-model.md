# Data Model: Decoupled Player Stats Crawler

**Feature**: 011-player-stats-crawler  
**Date**: 2026-03-24

## Entities

### PlayerStatsJob

Represents a scheduled unit of player-stats work owned by the dedicated worker.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `job_id` | string | ✅ | Unique job identifier |
| `job_type` | enum | ✅ | `LIVE_SNAPSHOT`, `UPCOMING_SNAPSHOT`, `ESPN_ENRICHMENT` |
| `external_match_key` | string | ✅ | Canonical backend match key |
| `match_url` | string | ✅ | Source URL for CREX crawling |
| `priority` | int | ✅ | Lower number = higher priority |
| `status` | enum | ✅ | `PENDING`, `LEASED`, `SUCCEEDED`, `FAILED`, `PAUSED`, `DROPPED` |
| `scheduled_at` | datetime | ✅ | When job became eligible |
| `not_before` | datetime | ❌ | Earliest execution time for deferred/backoff jobs |
| `attempt_count` | int | ✅ | Retry count |
| `lease_owner` | string | ❌ | Worker instance currently owning the job |
| `lease_expires_at` | datetime | ❌ | Lease timeout for recovery |
| `pause_reason` | string | ❌ | Why the job is currently paused or deferred |

**Validation Rules**:

- `LIVE_SNAPSHOT` jobs may only be created for matches currently returned by backend live-match APIs.
- `UPCOMING_SNAPSHOT` jobs may only be created for matches inside the configured pre-match window.
- `ESPN_ENRICHMENT` jobs must only be accepted when the enrichment feature flag is enabled.

---

### PlayerMatchSnapshot

Latest player-stat payload for a given match and capture instant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `snapshot_id` | string | ✅ | Stable unique ID or content hash |
| `external_match_key` | string | ✅ | Canonical match identifier |
| `match_url` | string | ✅ | Source URL used by worker |
| `match_status` | enum | ✅ | `UPCOMING`, `LIVE`, `INNINGS_BREAK`, `COMPLETED`, etc. |
| `coverage_state` | enum | ✅ | `NOT_AVAILABLE`, `SQUAD_ONLY`, `PLAYING_XI`, `LIVE_SCORECARD`, `PARTIAL`, `COMPLETE` |
| `source_system` | enum | ✅ | `CREX` for base snapshots |
| `captured_at` | datetime | ✅ | When the snapshot was captured |
| `scheduled_start_time` | datetime | ❌ | Relevant for upcoming matches |
| `innings_number` | int | ❌ | Relevant for live scorecards |
| `player_lines` | array | ✅ | Array of `PlayerStatLine` |
| `raw_version_hash` | string | ✅ | Dedupe / idempotency hash |

**Identity**: `(external_match_key, snapshot_id)`  
**Latest Query Key**: `external_match_key`

---

### PlayerStatLine

Per-player row stored inside a match snapshot.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_player_key` | string | ✅ | Stable match-scoped player key |
| `canonical_player_id` | string | ❌ | Optional linked canonical player ID |
| `display_name` | string | ✅ | Best-known player name |
| `team_name` | string | ❌ | Team affiliation in the current match |
| `role` | enum | ❌ | `BATTER`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER`, `UNKNOWN` |
| `lineup_status` | enum | ✅ | `SQUAD`, `PLAYING_XI`, `IMPACT`, `SUBSTITUTE`, `NOT_AVAILABLE` |
| `batting_order` | int | ❌ | Order in lineup or innings |
| `batting_runs` | int | ❌ | Runs scored |
| `batting_balls` | int | ❌ | Balls faced |
| `batting_fours` | int | ❌ | Fours |
| `batting_sixes` | int | ❌ | Sixes |
| `strike_rate` | decimal | ❌ | Batting strike rate |
| `dismissal_text` | string | ❌ | Dismissal or status text |
| `bowling_overs` | decimal | ❌ | Overs bowled |
| `bowling_maidens` | int | ❌ | Maidens |
| `bowling_runs_conceded` | int | ❌ | Runs conceded |
| `bowling_wickets` | int | ❌ | Wickets taken |
| `economy_rate` | decimal | ❌ | Economy |
| `source_system` | enum | ✅ | Usually `CREX` for base rows |
| `identity_confidence` | decimal | ❌ | Confidence for canonical linkage |

**Validation Rules**:

- `match_player_key` must be stable across refreshes for the same player in the same match.
- Live scorecard rows may omit fields not exposed upstream.
- Upcoming rows may contain lineup metadata without batting/bowling numbers.

---

### PlayerEnrichmentSnapshot

Optional secondary data collected from ESPN or another enrichment provider.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enrichment_id` | string | ✅ | Unique enrichment record ID |
| `provider` | enum | ✅ | `ESPN` |
| `canonical_player_id` | string | ❌ | Linked internal player identity |
| `match_player_key` | string | ❌ | Match-scoped fallback when canonical ID is unavailable |
| `profile_name` | string | ❌ | Provider display name |
| `batting_style` | string | ❌ | Optional profile field |
| `bowling_style` | string | ❌ | Optional profile field |
| `recent_form_json` | json | ❌ | Optional recent performance blob |
| `career_summary_json` | json | ❌ | Optional aggregate stats blob |
| `provider_url` | string | ❌ | ESPN source URL |
| `captured_at` | datetime | ✅ | When enrichment was fetched |
| `expires_at` | datetime | ❌ | Cache expiry |
| `confidence_score` | decimal | ✅ | Match confidence |
| `negative_cache` | bool | ✅ | True when no good match was found |

**Merge Rule**:

- Enrichment fills optional or profile-oriented fields only.
- Enrichment must not overwrite match-specific live scorecard facts from CREX.

---

### PlayerIdentityLink

Stores a mapping between provider-specific identifiers and an optional canonical player identity.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | enum | ✅ | `CREX`, `ESPN` |
| `provider_player_key` | string | ✅ | Provider-specific key or normalized token |
| `match_player_key` | string | ❌ | Match-scoped linkage |
| `canonical_player_id` | string | ❌ | Internal canonical player identity |
| `confidence_score` | decimal | ✅ | Matching confidence |
| `linked_at` | datetime | ✅ | When the link was established |
| `linked_by` | enum | ✅ | `SYSTEM`, `MANUAL`, `HEURISTIC` |

---

## State Transitions

### Coverage State

```text
NOT_AVAILABLE
   ↓
SQUAD_ONLY
   ↓
PLAYING_XI
   ↓
LIVE_SCORECARD
   ↓
COMPLETE
```

Possible side path:

```text
SQUAD_ONLY / PLAYING_XI / LIVE_SCORECARD → PARTIAL
```

`PARTIAL` is used when upstream data is incomplete or contradictory, but still useful.

### Job Lifecycle

```text
PENDING → LEASED → SUCCEEDED
    ↓         ↓
    ↓         FAILED → PENDING
    ↓
  PAUSED
    ↓
  PENDING
```

### Source Precedence

```text
CREX match-scoped snapshot
      ↓
Optional ESPN enrichment
      ↓
Merged response with field-level provenance
```

---

## Suggested Backend Tables / Aggregates

| Table / Aggregate | Purpose |
|------------------|---------|
| `player_match_stats` | latest per-match snapshot or normalized stat lines |
| `player_enrichment_snapshot` | optional ESPN metadata / recent form |
| `player_identity_link` | provider-to-canonical identity mapping |

### Recommended Indexes

- `player_match_stats(external_match_key, captured_at desc)`
- `player_match_stats(external_match_key, coverage_state)`
- `player_enrichment_snapshot(canonical_player_id, provider, captured_at desc)`
- `player_identity_link(provider, provider_player_key)`

---

## Redis Cache Keys

| Pattern | TTL | Description |
|---------|-----|-------------|
| `playerstats:job:{job_id}` | 30m | Job state and lease metadata |
| `playerstats:queue:live` | n/a | Live job queue |
| `playerstats:queue:upcoming` | n/a | Upcoming job queue |
| `playerstats:queue:enrichment` | n/a | Enrichment job queue |
| `playerstats:match:{external_match_key}:latest` | 5m | Latest serialized snapshot shortcut |
| `playerstats:match:{external_match_key}:hash` | 1h | Last dedupe hash to skip unchanged writes |
| `playerstats:espn:negative:{lookup_key}` | 6h | Negative-cache result for failed ESPN match |
| `playerstats:health:last_pause` | 1h | Most recent pause reason / timestamp |

---

## Relationships

```text
LiveMatch (1) ─── (1..*) PlayerStatsJob
   │
   ├─── (1..*) PlayerMatchSnapshot
   │            └─── (1..*) PlayerStatLine
   │
   └─── (0..*) PlayerEnrichmentSnapshot
                 │
                 └─── (0..1) PlayerIdentityLink
```

---

## Notes

- The first implementation can store snapshots in a denormalized form if that reduces complexity, as long as retrieval and provenance remain explicit.
- Match-scoped player identity is preferred over risky early canonicalization.
- The data model intentionally separates enrichment from base snapshots so ESPN can be disabled or purged independently.
