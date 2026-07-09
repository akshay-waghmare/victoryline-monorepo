# Completed-Match Turning-Point Template

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Strategy artifact

## Purpose

This template defines how Crickzen should explain a completed match without falling back to a generic recap.

The completed-match job is not `show the result again`.
The job is `explain where the match flipped and why`.

## Primary Questions

Every completed-match intelligence page should answer:

1. What was the turning point?
2. Why did that moment matter more than the rest?
3. What did the probability swing look like around that phase?
4. What should the user explore next?

## Required Inputs

- final match result and status
- `turning_point`
- `probability_swing`
- `insight`
- `last_swings`
- score-state context around the decisive phase

## Above-The-Fold Template

1. Match result and status
2. Turning-point headline
3. Short explanation of why that phase changed control
4. One compact before/after swing summary
5. Link back to scorecard and commentary
6. One owned next step

## Turning-Point Headline Pattern

`The match turned when <event or phase>, shifting control to <team>.`

Examples:

- `The match turned when Namibia broke the partnership in the 14th over, shifting control back their way.`
- `The match turned when Vidarbha fell behind the chase rate after the timeout phase.`

## Explanation Structure

### Section 1: The Moment

Answer:

- what exact over, wicket, partnership break, collapse, or acceleration changed the match

### Section 2: Why It Mattered

Answer:

- why that moment mattered on this pitch, in this chase, or in that innings phase

### Section 3: The Swing

Answer:

- what the probability looked like before and after the moment

### Section 4: The Aftermath

Answer:

- what happened once the decisive shift occurred

## Public Language Rules

- Name the phase and cricket event first.
- Use probability only as supporting proof, not as the whole explanation.
- Do not publish internal market-edge or betting-language copy.
- Do not claim one exact ball was the turning point unless the source payload supports it.

## Supported Module Variants

### Short version

Use when only `turning_point` plus minimal swing data exists.

Contains:

- turning-point headline
- one why-it-mattered sentence
- one next-step link

### Full version

Use when `probability_swing` and richer explanation fields exist.

Contains:

- turning-point headline
- decisive-phase paragraph
- before/after swing summary
- aftermath paragraph
- next-match recommendation

## Owned Next Steps

Preferred completed-match next steps:

- `See the next match intelligence page`
- `Go back to the scorecard`
- future `follow this team` or alert CTA after relationship work is approved

Avoid:

- hard-selling a product from the completed surface
- burying the user in archive links with no decision value

## Acceptance Standard

A completed-match intelligence page passes only if:

- the page explains a distinct decisive phase
- the explanation is stronger than a generic recap
- the swing summary supports the story
- the user gets a clear next path after the result
