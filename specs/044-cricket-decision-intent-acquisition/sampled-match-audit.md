# Sampled Match Audit

Date: 2026-07-08 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Week 1 foundation artifact

## Purpose

Audit one upcoming, one live, and one completed match against the first implementation requirements.

## Sample 1: Upcoming / delayed

- URL: `/cric-live/nam-vs-vid-4th-odi-vidarbha-cricket-association-tour-of-namibia-2026-match-updates-12WM`
- Lifecycle: upcoming / delayed

Checks:

- canonical match route exists
- breadcrumb and series context render
- score-first match surface exists
- useful for pre-match / delayed lifecycle review

Gaps:

- no dedicated public intelligence route yet
- no prediction-specific free surface yet
- no event model wired for prediction interaction yet

## Sample 2: Live

- URL: `/cric-live/bad-vs-sgt-12th-match-shpageeza-cricket-league-2026-match-updates-12VM`
- Lifecycle: live

Checks:

- canonical live route exists
- commentary and score-first layout exist
- scorecard fallback handling already improved
- useful surface for “what changed” and win-probability integration

Gaps:

- explanation layer is not yet formalized as a decision-intelligence module
- no dedicated match-intelligence route yet
- event taxonomy not yet implemented

## Sample 3: Completed

- URL: `/cric-live/eng-vs-ind-3rd-t20-india-tour-of-england-2026-match-updates-VSH`
- Lifecycle: completed

Checks:

- canonical completed match route remains useful
- good candidate for turning-point and prediction-review design

Gaps:

- no explicit completed-state turning-point product surface yet
- no dedicated explanation preservation pattern yet

## Audit Outcome

The current repo has enough public match-state, score, commentary, and model-adjacent inputs to proceed with:

1. route contract
2. event contract
3. content template
4. public match-intelligence route

The main missing piece is product packaging, not raw match data.
