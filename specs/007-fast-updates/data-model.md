# Data Model: Fast Ball-by-Ball Updates

**Feature**: 007-fast-updates  
**Date**: 2025-11-28

## Entities

### BallEvent

Represents a single delivery in a cricket match.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | string | ✅ | Unique match identifier from Crex |
| `ball_number` | float | ✅ | Over.ball format (e.g., 9.4 = 9th over, 4th ball) |
| `runs` | int | ✅ | Runs scored off bat (0-6) |
| `extras` | object | ❌ | Extra runs: `{wides: int, no_balls: int, byes: int, leg_byes: int}` |
| `wicket` | object | ❌ | Wicket details: `{type: string, batsman: string, fielder?: string}` |
| `timestamp` | datetime | ✅ | ISO 8601 timestamp when ball was bowled |
| `sequence_number` | int | ✅ | Monotonically increasing sequence per match |

**Validation Rules**:
- `ball_number`: Must follow cricket format (0.1-0.6, 1.0-1.6, etc.)
- `runs`: Range 0-6 (7 = boundary overthrow, rare)
- `sequence_number`: Must be > previous sequence for same match

**Identity**: Composite key `(match_id, ball_number, sequence_number)`

---

### ScoreSnapshot

Current match state at a point in time.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | string | ✅ | Unique match identifier |
| `innings` | int | ✅ | Current innings (1 or 2) |
| `batting_team` | string | ✅ | Team currently batting |
| `runs` | int | ✅ | Total runs scored |
| `wickets` | int | ✅ | Wickets fallen (0-10) |
| `overs` | float | ✅ | Overs completed (e.g., 15.4) |
| `run_rate` | float | ✅ | Current run rate (runs per over) |
| `required_rate` | float | ❌ | Required run rate (2nd innings only) |
| `target` | int | ❌ | Target score (2nd innings only) |
| `timestamp` | datetime | ✅ | When snapshot was captured |
| `sequence_number` | int | ✅ | For ordering updates |

**Validation Rules**:
- `wickets`: Range 0-10
- `overs`: Max depends on match format (20 for T20, 50 for ODI)
- `required_rate`: Only present when `innings == 2`

**Identity**: `match_id` (singleton per match, always latest state)

---

### ScorecardState

Detailed batting and bowling statistics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | string | ✅ | Unique match identifier |
| `innings` | int | ✅ | Innings number |
| `batting` | array | ✅ | Array of `BatsmanStats` |
| `bowling` | array | ✅ | Array of `BowlerStats` |
| `extras` | object | ✅ | Extras breakdown |
| `fall_of_wickets` | array | ✅ | Array of `FallOfWicket` |
| `timestamp` | datetime | ✅ | When scorecard was last updated |

#### BatsmanStats (nested)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Batsman name |
| `runs` | int | Runs scored |
| `balls` | int | Balls faced |
| `fours` | int | Boundaries (4s) |
| `sixes` | int | Sixes |
| `strike_rate` | float | (runs/balls) × 100 |
| `status` | string | "batting", "out", "retired" |
| `dismissal` | string | Dismissal description (if out) |

#### BowlerStats (nested)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Bowler name |
| `overs` | float | Overs bowled |
| `maidens` | int | Maiden overs |
| `runs` | int | Runs conceded |
| `wickets` | int | Wickets taken |
| `economy` | float | Runs per over |
| `wides` | int | Wide balls |
| `no_balls` | int | No balls |

---

### UpdateSequence

Ordering mechanism for reliable update delivery.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | string | ✅ | Unique match identifier |
| `last_sequence` | int | ✅ | Last processed sequence number |
| `last_ball_number` | float | ✅ | Last processed ball number |
| `gap_detected` | bool | ✅ | Whether a gap was detected |
| `gap_details` | string | ❌ | Description of gap if detected |
| `updated_at` | datetime | ✅ | When last updated |

**State Transitions**:
```
Initial → Processing → Updated → (Gap Detected → Alerting → Updated)
```

---

### MatchPriority

Priority scoring for resource allocation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | string | ✅ | Unique match identifier |
| `viewer_count` | int | ✅ | Current active viewers |
| `match_phase` | enum | ✅ | "start", "powerplay", "middle", "death", "final_over", "super_over" |
| `match_importance` | enum | ✅ | "international", "franchise", "domestic", "club" |
| `priority_score` | float | ✅ | Calculated composite score |
| `calculated_at` | datetime | ✅ | When priority was last calculated |

**Priority Calculation**:
```python
phase_weight = {"super_over": 4, "final_over": 3, "death": 2.5, "powerplay": 2, "middle": 2, "start": 1, "toss": 0.5}
importance_weight = {"international": 3, "franchise": 2.5, "domestic": 2, "club": 1}

priority_score = viewer_count * phase_weight[phase] * importance_weight[importance]
```

---

## State Transitions

### Match Lifecycle

```
MatchState:
  SCHEDULED → TOSS → IN_PROGRESS → INNINGS_BREAK → IN_PROGRESS → COMPLETED
                                                              ↓
                                                          ABANDONED
```

### Ball Update Flow

```
sV3 Response Received
        ↓
Parse ball_number
        ↓
Check sequence (gap?)
   ↓ No gap    ↓ Gap detected
   ↓           Log + Alert
   ↓              ↓
Push to backend ←─┘
        ↓
Update last_ball_number
        ↓
Clear to receive next update
```

---

## Redis Cache Keys

| Pattern | TTL | Description |
|---------|-----|-------------|
| `live:{match_id}:score` | 5s | Latest ScoreSnapshot JSON |
| `live:{match_id}:scorecard` | 8s | Latest ScorecardState JSON |
| `live:{match_id}:sequence` | 300s | UpdateSequence for gap tracking |
| `priority:{match_id}` | 30s | Calculated priority score |

---

## Relationships

```
Match (1) ─── (*) BallEvent
  │
  ├─── (1) ScoreSnapshot (latest state)
  │
  ├─── (1) ScorecardState (per innings)
  │
  ├─── (1) UpdateSequence (tracking)
  │
  └─── (1) MatchPriority (scheduling)
```
