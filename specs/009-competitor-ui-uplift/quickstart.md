# Quickstart: Competitor-Informed UI Uplift

**Feature Branch**: `009-competitor-ui-uplift`  
**Created**: 2026-03-07

---

## What This Feature Does

Closes the visual and functional gap between Crickzen and the two dominant cricket platforms (Crex.com and Cricbuzz.com) by adding:

1. **Team flags** on all match cards (country flag icons)
2. **Series context** on match cards (series badge + link)
3. **Countdown timers** for upcoming matches
4. **Player of the Match** on completed match cards
5. **Enhanced scorecard** with partnerships, fall of wickets, yet-to-bat sections
6. **Match ticker strip** below navbar (persistent live score strip)
7. **Mobile bottom tab bar** (Home / Matches / Series / More)
8. **Series listing page** with month grouping and format filters
9. **Match detail tabs** (Info / Live / Scorecard / Squads / Overs / Commentary)
10. **Stats leaderboard** page (Most Runs, Most Wickets by tournament)
11. **Unified color system** (eliminate purple gradients, legacy variables, hardcoded hex)
12. **Sidebar removal** (clean single-level top navbar only)

---

## Quick Reference: Key Files to Modify

| File | Change |
|------|--------|
| `apps/frontend/src/app/features/matches/components/match-card/` | Add flags, series badge, countdown, POTM |
| `apps/frontend/src/app/scorecard/scorecard.component.*` | Add FOW, partnerships, yet-to-bat; remove purple |
| `apps/frontend/src/app/cricket-odds/cricket-odds.component.css` | Replace 2657 lines of hardcoded colors |
| `apps/frontend/src/styles.css` | Migrate legacy variables, reduce `!important` |
| `apps/frontend/src/app/layouts/admin-layouts/` | Remove sidebar, full-width content |
| `apps/frontend/src/app/component/sidebar/` | DELETE this component |
| `apps/frontend/src/app/component/navbar/` | Ensure standalone nav, add series/stats links |
| `apps/frontend/src/app/app.component.*` | Add match ticker, conditional bottom tab bar |

## Quick Reference: New Files to Create

| File | Purpose |
|------|---------|
| `app/shared/components/team-flag/` | SVG country flag with fallback |
| `app/shared/components/series-badge/` | Clickable series name chip |
| `app/shared/components/countdown-timer/` | Real-time countdown display |
| `app/shared/components/match-ticker/` | Horizontal scrollable match strip |
| `app/core/layout/bottom-tab-bar/` | Mobile persistent bottom nav |
| `app/features/matches/components/partnership-bar/` | Partnership contribution bars |
| `app/features/matches/components/fall-of-wickets/` | FOW timeline table |
| `app/features/matches/components/yet-to-bat/` | Remaining batsmen cards |
| `app/features/matches/components/over-summary/` | Over-by-over result strip |
| `app/features/matches/components/commentary/` | Ball-by-ball text commentary |
| `app/features/matches/components/squad-view/` | Side-by-side playing XI |
| `app/features/series/pages/series-list/` | Month-grouped series page |
| `app/features/series/pages/series-detail/` | Series fixtures + points table |
| `app/features/stats/pages/stats-leaderboard/` | Tournament stat tables |

---

## Design Token Cheat Sheet

```scss
// Use THESE (unified system from styles.scss):
var(--color-primary)           // #1976d2 — links, buttons, accents
var(--color-primary-light)     // hover states
var(--color-match-live)        // #4caf50 — green live indicator
var(--color-match-upcoming)    // #2196f3 — blue upcoming
var(--color-match-completed)   // #757575 — gray completed
var(--color-background)        // page background
var(--color-background-elevated) // card background
var(--color-text-primary)      // main text
var(--color-text-secondary)    // muted text

// NEVER use these (legacy, being removed):
--primary-color     → use --color-primary
--accent-color      → use --color-warning
--background-color  → use --color-background
--muted-color       → use --color-text-secondary
#667eea / #764ba2   → use var(--color-primary)
```

---

## Getting Started

```bash
# 1. Create feature branch
git checkout -b 009-competitor-ui-uplift

# 2. Install flag package
cd apps/frontend
npm install circle-flags --save

# 3. Start with Phase 1 — create TeamFlagComponent
ng generate component shared/components/team-flag --module=app

# 4. Run dev server to verify
npm start
```

---

## Competitive Reference URLs

- **Crex homepage**: https://crex.com/
- **Crex scorecard**: https://crex.com/scoreboard/YAA/1UY/2nd-Semi-Final/O/S/eng-vs-ind-2nd-semi-final-t20-world-cup-2026/scorecard
- **Crex series**: https://crex.com/series
- **Cricbuzz homepage**: https://www.cricbuzz.com/
- **Cricbuzz live scores**: https://www.cricbuzz.com/live-cricket-scores/139478/ind-vs-eng-2nd-semi-final-icc-mens-t20-world-cup-2026
- **Cricbuzz scorecard**: https://www.cricbuzz.com/live-cricket-scorecard/139478/ind-vs-eng-2nd-semi-final-icc-mens-t20-world-cup-2026
