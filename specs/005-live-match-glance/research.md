# Research Notes: Live Match Glance Layout

## Decision: Adopt Crex-style hero band with modular pods
- **Rationale**: The referenced Crex page surfaces score summary, chase context, batter/bowler pods, and odds within one horizontal band, keeping secondary tabs accessible through inline links. Mirroring this structure lets us satisfy the "no scroll" requirement while giving users instant context. A CSS grid with fixed-height pods allows responsive rearrangement without collapsing critical data.
- **Alternatives considered**: Keeping VictoryLine's current stacked cards (requires scroll and obscures odds); full-screen modal overlay (hurts navigation to commentary/scorecard). Both rejected because they break the glance requirement or disrupt existing tab structure.

## Decision: Source hero data from MatchApiService snapshot + scorecard endpoints
- **Rationale**: `MatchApiService.getSnapshot` already aggregates live score, player state, and win probability for the match details feature. Pairing it with scorecard fallbacks ensures we can populate striker/non-striker, bowler spell, partnership, and staleness tiers without adding backend work, aligning with spec assumptions.
- **Alternatives considered**: Calling the legacy `cricket-data/sC4-stats/get` directly (requires extra parsing and duplicates logic now centralized in MatchApiService); building a new backend endpoint (violates scope and adds delay). Rejected to stay within frontend-only changes.

## Decision: Handle odds with graceful fallbacks linked to jurisdiction settings
- **Rationale**: Odds fields are present in current snapshot payloads for regulated markets, but availability can be toggled. Displaying "Odds unavailable" (with timestamp) when the feed omits pricing keeps layout intact and meets transparency goals. Jurisdiction toggles can reuse logic from existing `CricketOddsComponent`.
- **Alternatives considered**: Hiding the odds pod entirely (creates layout gaps and conflicts with spec); using third-party odds widgets (adds latency and compliance complexity). Rejected to maintain consistent shell and satisfy "odds visible" ask while handling gaps responsibly.
