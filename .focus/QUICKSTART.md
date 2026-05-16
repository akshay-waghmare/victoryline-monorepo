# Focus App Quick Start

## What is Focus?
Focus is a StartupOS Phase 1 strategic planning tool integrated with your project. It helps prioritize tasks based on your project's current bottleneck and strategic focus areas.

## Your Current Focus
**Bottleneck**: No distribution channels to reach cricket fans searching for live scores  
**Strategic Direction**: Own long-tail search traffic for specific live matches and tournaments

## Active Tasks
The following strategic tasks are tracked:
1. **seo-match-pages** - Dynamic match page titles with team names + "Live Score Ball by Ball"
2. **social-share-buttons** - One-tap share buttons that update with live match data
3. **tournament-landing-pages** - Tournament aggregate pages for SEO targeting

## How to Run Focus
```bash
cd C:\Users\ADMINS\Documents\projects\victoryline-monorepo
focus --tasks ".\.focus\tasks.json" --logs ".\.focus\logs"
```

## Key Files
- `.focus/config.yaml` - Project configuration
- `.focus/memory.json` - AI coaching history and recommendations
- `.focus/tasks.json` - Task tracking (synced with focus app)
- `.focus/logs/` - Focus app execution logs
- `.focus/personas/` - AI personas (Game Theory, Growth Strategy, StoryBrand)

## Useful References
For detailed strategy and recommendations, see `.focus/memory.json` which contains:
- Growth recommendations from AI personas
- Specific action items for each week
- What NOT to do (ignore_list)

---
Generated: 2026-04-20T11:20 | Status: ✅ Fully Operational
