# Spec 048: Human-readable scorecard dismissal context

## Objective

Replace opaque dismissal values in the batting scorecard with readable cricket context, for example:

- `caught Mady Villiers b Kirstie Gordon`
- `lbw b Grace Ballinger`
- `bowled b Kathryn Bryce`
- `run out (fielder)`
- `c & b Kirstie Gordon`

## Current data path

1. CREX scorecard data is scraped and stored by the scraper.
2. The backend returns it from `/cricket-data/sC4-stats/get`.
3. The frontend `app-scorecard` component reads `match_stats_by_innings.innings[*].batsman_stats`.
4. Each dismissed batter currently receives fields such as:
   - `dismissal_code`
   - `bowler_code`
   - `player_caught`
   - `status`
5. The frontend formatter `getDismissalText()` only recognizes textual codes (`^1`, `^2`, `^3`, `lbw`, `bowled`, etc.).

## Evidence from DUR W vs TBZ

The live local payload contains:

```json
{
  "dismissal_code": "2",
  "bowler_code": "VP",
  "player_caught": "6DB",
  "status": "dismissed"
}
```

Other dismissed batters return codes `1` and `8`. The current UI therefore cannot reliably explain how the wicket occurred, even though the raw API has the dismissal context.

## Plan

### Phase 1: Confirm the code contract

- Compare numeric and caret-prefixed dismissal codes across current CREX scorecards.
- Confirm the meaning of code `8` instead of guessing from one match.
- Confirm whether `bowler_code` and `player_caught` are player IDs, short IDs, or encoded aliases.
- Capture a small fixture containing caught, bowled, LBW, stumped, run out, caught-and-bowled, hit wicket, and unknown cases.

### Phase 2: Normalize the data at the scraper/backend boundary

- Preserve the raw fields for debugging.
- Add normalized fields such as `dismissal_type`, `dismissal_bowler_name`, and `dismissal_fielder_name` when the source mapping is available.
- Resolve player IDs using the same localStorage/player-name map already used by the scraper.
- Keep unresolved IDs out of the human-facing label rather than displaying opaque values.

### Phase 3: Improve the frontend presentation

- Normalize both numeric (`1`, `2`, `8`) and caret (`^1`, `^2`, `^3`) formats in one formatter.
- Render readable labels with correct cricket notation and names.
- Keep `not out` and `yet to bat` states unchanged.
- Add a compact secondary line or tooltip only when fielder/bowler detail exists, so the batting table does not become too wide on mobile.
- Use a neutral fallback such as `dismissed` when the code is unknown.

### Phase 4: Tests and runtime verification

- Unit-test every dismissal type and unresolved-name fallback.
- Add a regression fixture for the DUR W vs TBZ payload shape.
- Verify desktop and mobile scorecard rendering on the real local match page.
- Verify that bowling figures remain unchanged and that no scorecard rows disappear when a dismissal field is missing.

## Guardrails

- Do not infer a dismissal type solely from the wicket count.
- Do not display encoded IDs as if they were player names.
- Do not remove raw fields until the normalized representation is proven across multiple scorecards.
- Keep the change limited to scorecard data normalization and presentation; no model or live-score behavior changes.
