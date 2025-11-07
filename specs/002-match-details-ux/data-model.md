# Data Model (Phase 1) — Match Details UI/UX Redesign

This model is technology-agnostic and describes entities and relationships required by the feature.

## Entities

### Match
- id: string
- format: enum (TEST, ODI, T20, T10, OTHER)
- status: enum (SCHEDULED, LIVE, DELAYED, COMPLETED, ABANDONED)
- series: string
- startTime: datetime (ISO 8601)
- lastUpdated: datetime (ISO 8601)
- venueId: string
- officials: Officials
- innings: [Innings]

### Innings
- id: string
- number: integer (1..N)
- battingTeamId: string
- bowlingTeamId: string
- runs: integer
- wickets: integer
- overs: decimal (e.g., 17.3)
- extras: Extras
- fallOfWickets: [FallOfWicket]
- batting: [BattingEntry]
- bowling: [BowlingEntry]

### BattingEntry
- playerId: string
- name: string
- runs: integer
- balls: integer
- fours: integer
- sixes: integer
- strikeRate: decimal
- dismissal: string (e.g., c Smith b Johnson)
- isOut: boolean

### BowlingEntry
- playerId: string
- name: string
- overs: decimal
- maidens: integer
- runs: integer
- wickets: integer
- economy: decimal

### FallOfWicket
- score: string (e.g., 45/2)
- over: decimal (e.g., 6.2)
- playerOutId: string
- playerOutName: string

### Extras
- byes: integer
- legByes: integer
- wides: integer
- noBalls: integer
- penalties: integer
- total: integer

### Team
- id: string
- name: string
- shortName: string
- logoUrl: string
- players: [Player]

### Player
- id: string
- name: string
- role: enum (BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER, UNKNOWN)
- isPlayingXI: boolean

### Venue
- id: string
- name: string
- city: string
- country: string
- capacity: integer (optional)

### Officials
- umpire1: string
- umpire2: string
- thirdUmpire: string (optional)
- referee: string (optional)

### ScoreSnapshot (derived)
- battingTeamId: string
- score: string (e.g., 132/4)
- overs: decimal
- currentRunRate: decimal
- requiredRunRate: decimal (nullable if not chasing)
- recentBalls: [RecentBall]
- matchStatus: string
- lastUpdated: datetime

### RecentBall
- overBall: string (e.g., "17.3")
- outcome: string (e.g., 4, 6, W, 1, .)
- highlight: enum (NONE, BOUNDARY, SIX, WICKET)

### CommentaryEntry
- id: string
- matchId: string
- inningsNumber: integer
- overBall: string
- overNumber: integer
- ballInOver: integer (1..6)
- text: string
- type: enum (BALL, OVER_SUMMARY, WICKET, BOUNDARY, INFO)
- batsmanId: string (optional)
- bowlerId: string (optional)
- timestamp: datetime
- highlights: [string]

## Relationships
- Match 1..N Innings
- Innings 1..N BattingEntry
- Innings 1..N BowlingEntry
- Innings 0..N FallOfWicket
- Match 2 Team (home/away or TeamA/TeamB)
- Team 1..N Player
- Match 0..N CommentaryEntry
- Match 1 Venue

## Validation Rules
- overs must be non-negative; wickets 0..10
- strikeRate = (runs/balls)*100 (if balls > 0)
- economy = runs/overs (if overs > 0)
- fallOfWickets increasing by over and score
- recentBalls max length 6 (truncate beyond)

## State Transitions (Match.status)
- SCHEDULED → LIVE | DELAYED | ABANDONED
- LIVE → COMPLETED | DELAYED | ABANDONED
- DELAYED → LIVE | ABANDONED
- COMPLETED (terminal), ABANDONED (terminal)
