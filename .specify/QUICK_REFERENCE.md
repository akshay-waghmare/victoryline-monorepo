# SpecKit Quick Reference

## Available Commands

### Core Workflow
```
/speckit.constitution  → Define project principles (do once)
/speckit.specify       → Create feature specification
/speckit.plan          → Generate implementation plan
/speckit.tasks         → Break down into tasks
/speckit.implement     → Execute implementation
```

### Optional Enhancement Commands
```
/speckit.clarify       → Ask structured questions before planning
/speckit.analyze       → Check consistency across artifacts
/speckit.checklist     → Generate quality validation checklist
```

## Typical Feature Development Flow

### 1. First Time Setup
```
/speckit.constitution Create principles for VictoryLine focusing on:
- Real-time cricket data accuracy
- Monorepo architecture (Angular + Spring Boot + Python)
- REST API standards
- Testing requirements
- Performance for live updates
- Code quality across tech stacks
```

### 2. New Feature
```
/speckit.specify Add player comparison feature allowing users to compare 
statistics between two players side-by-side with charts and historical data
```

### 3. Technical Planning
```
/speckit.plan 
- Backend: Spring Boot endpoint /api/players/compare
- Frontend: Angular component with Chart.js visualization
- Scraper: Enhance player stats collection
- Database: Add comparison_history table
```

### 4. Generate Tasks
```
/speckit.tasks
```

### 5. Implement
```
/speckit.implement
```

## Monorepo Component Paths

| Component | Path | Tech Stack |
|-----------|------|------------|
| Frontend | `apps/frontend/` | Angular, TypeScript |
| Backend | `apps/backend/spring-security-jwt/` | Spring Boot, Java |
| Scraper | `apps/scraper/crex_scraper_python/` | Python, Flask |

## Specs Storage Location
```
.specify/specs/
├── 001-feature-name/
│   ├── spec.md          # Requirements
│   ├── plan.md          # Technical design
│   ├── tasks.md         # Task breakdown
│   └── ... (optional docs)
```

## Tips

✅ **DO**
- Be specific in requirements
- Mention affected components (frontend/backend/scraper)
- Use `/speckit.clarify` if unsure
- Review with `/speckit.checklist`

❌ **DON'T**
- Skip the constitution step
- Mix requirements with implementation in `/speckit.specify`
- Skip task breakdown - go straight from plan to coding

## Examples

### Cross-Component Feature
```
/speckit.specify Add WebSocket-based live notifications. Users get instant 
alerts for wickets, boundaries, and milestones in matches they're following. 
Notifications should be configurable per user with sound/visual options.
```

### Backend-Only Feature
```
/speckit.specify Add API rate limiting to prevent abuse. Implement token bucket 
algorithm with configurable limits per user role. Admin users get 1000 req/min, 
regular users get 100 req/min.
```

### Frontend-Only Feature
```
/speckit.specify Add dark mode toggle. Users can switch between light/dark themes 
with preference saved to localStorage. Theme should apply to all components 
including charts and tables.
```

## Getting Help

- Full Guide: `.specify/SPECKIT_GUIDE.md`
- SpecKit Docs: https://github.github.io/spec-kit/
- Examples: https://github.com/github/spec-kit/blob/main/docs/quickstart.md
