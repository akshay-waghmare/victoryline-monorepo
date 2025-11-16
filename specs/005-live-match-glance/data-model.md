# Data Model: Live Match Glance Layout

## Entities

### LiveMatchSnapshot
- **id**: string (match slug or ID; must match `/cric-live/:slug` route)
- **status**: enum (`LIVE`, `INNINGS_BREAK`, `DELAYED`, `COMPLETED`)
- **timestamp**: ISO-8601 string (last update; used for staleness tiers)
- **innings**: `InningsScore` (current batting team context)
- **chaseContext**: `ChaseContext | null` (only present when chasing target)
- **batters**: `ParticipantSummary[]` (ordered `[striker, nonStriker]`, max length 2)
- **bowler**: `BowlerSummary | null`
- **partnership**: `PartnershipSummary | null`
- **odds**: `OddsQuote | null`
- **staleness**: `StalenessSignal`

Validation:
- `timestamp` must be within ±5 minutes of client clock; otherwise flag as stale error.
- `batters.length` must equal 2 when match status is `LIVE`; fallback labels shown when players unknown.
- `bowler` required when status is `LIVE` or `INNINGS_BREAK`.

### InningsScore
- **teamCode**: string (3-4 letter abbreviation)
- **teamName**: string
- **runs**: number
- **wickets**: number (0-10)
- **overs**: string (e.g., "32.4")
- **runRate**: number (current run rate)
- **projected**: number | null (for first innings projection)
- **resultSummary**: string | null (for completed match hero reuse)

### ChaseContext
- **target**: number (runs required to win)
- **runsRemaining**: number
- **ballsRemaining**: number
- **requiredRunRate**: number
- **winProbability**: number | null (mirrors odds when available)

Validation: `runsRemaining` and `ballsRemaining` cannot be negative; if response underflows, coerce to 0.

### ParticipantSummary
- **id**: string (player identifier)
- **name**: string
- **role**: enum (`BATTER`, `KEEPER`, `ALL_ROUNDER`, `UNKNOWN`)
- **runs**: number
- **balls**: number
- **fours**: number
- **sixes**: number
- **strikeRate**: number
- **isOnStrike**: boolean
- **recentBalls**: string[] (last 6 outcomes; optional)

Validation: `strikeRate` computed as `(runs / balls) * 100`; guard divide-by-zero.

### BowlerSummary
- **id**: string
- **name**: string
- **overs**: string
- **maidens**: number
- **runsConceded**: number
- **wickets**: number
- **economy**: number
- **lastOverFigure**: string | null (e.g., "1 0 4 W 0 2")

Validation: economy recalculated from `runsConceded` and `overs` whenever snapshot updates.

### PartnershipSummary
- **runs**: number
- **balls**: number
- **wicketsFallen**: number (for last wicket description)
- **description**: string (e.g., "P'ship 45 (36)")

### OddsQuote
- **label**: string (e.g., "Pakistan win odds")
- **value**: number (percentage 0-100 or decimal price)
- **format**: enum (`PERCENT`, `DECIMAL`, `FRACTIONAL`)
- **trend**: enum (`UP`, `DOWN`, `STABLE`, `UNKNOWN`)
- **provider**: string (for compliance disclosure)
- **timestamp**: ISO-8601 string
- **jurisdictionEnabled**: boolean (false when odds hidden; triggers placeholder text)

Validation: Ensure `value` falls within valid range for chosen format; when `jurisdictionEnabled=false`, display placeholder and hide `value`.

### StalenessSignal
- **tier**: enum (`FRESH`, `WARNING`, `ERROR`)
- **ageSeconds**: number
- **message**: string (localized)
- **nextRetryAllowed**: ISO-8601 string | null

Derivation: tier computed from `ageSeconds` relative to thresholds (<30, 30–120, >120). When `tier=ERROR`, `nextRetryAllowed` stores manual retry timestamp.

## Relationships
- `LiveMatchSnapshot` aggregates `InningsScore`, `ChaseContext`, `ParticipantSummary[]`, `BowlerSummary`, `OddsQuote`, and `StalenessSignal`.
- View layer binds directly to `LiveMatchSnapshot`; condensed sticky header consumes same entity with reduced fields (score + participants + odds).
- Analytics events reference `LiveMatchSnapshot.id`, `staleness.tier`, and `odds.jurisdictionEnabled` for telemetry.
