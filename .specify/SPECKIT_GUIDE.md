# SpecKit Guide for VictoryLine Monorepo

SpecKit has been integrated into this monorepo to enable specification-driven development for new features.

## 📁 What Was Added

### `.specify/` Directory
- **`memory/constitution.md`** - Project principles and guidelines (customize this!)
- **`scripts/powershell/`** - Automation scripts for Windows/PowerShell
- **`templates/`** - Templates for specifications, plans, and tasks

### `.github/prompts/` Directory
Slash commands available in GitHub Copilot:
- `/speckit.constitution` - Establish project principles
- `/speckit.specify` - Create feature specifications
- `/speckit.plan` - Generate implementation plans
- `/speckit.tasks` - Break down into actionable tasks
- `/speckit.implement` - Execute implementation
- `/speckit.clarify` - Ask structured questions before planning
- `/speckit.analyze` - Cross-artifact consistency check
- `/speckit.checklist` - Quality validation

## 🚀 Getting Started

### Step 1: Establish Project Constitution
Define the principles that will guide all development:

```
/speckit.constitution Create principles for this cricket match scraping and display platform focusing on: 
- Real-time data accuracy and freshness
- Monorepo architecture (Angular frontend, Spring Boot backend, Python scraper)
- API design standards (REST conventions)
- Testing requirements for each component
- Performance requirements for real-time updates
- Code quality and consistency across tech stacks
```

### Step 2: Create Feature Specifications
When adding a new feature, start with a specification:

```
/speckit.specify [Describe your feature in detail - what it does, why it's needed, user scenarios]
```

Example:
```
/speckit.specify Add a feature to display player statistics during live matches. Users should be able to click on a player's name in the scorecard and see a popup with their career statistics, current season stats, and recent form. The stats should update in real-time as the match progresses.
```

### Step 3: Generate Implementation Plan
Specify technical details and tech stack:

```
/speckit.plan [Specify which part of the monorepo, tech stack details, architecture decisions]
```

Example:
```
/speckit.plan This will be implemented across the stack:
- Backend: Spring Boot REST endpoint in LiveMatchService
- Frontend: Angular component with Material Design popup
- Scraper: Python module to extract player stats
Use existing WebSocket connections for real-time updates.
```

### Step 4: Create Task Breakdown
Generate actionable tasks:

```
/speckit.tasks
```

### Step 5: Implement
Execute the implementation:

```
/speckit.implement
```

## 📋 Workflow for New Features

1. **Constitution** → Define once, update as needed
2. **Specify** → Clear requirements and user stories
3. **Clarify** (optional) → Resolve ambiguities before planning
4. **Plan** → Technical design and architecture
5. **Checklist** (optional) → Validate plan quality
6. **Tasks** → Actionable breakdown
7. **Analyze** (optional) → Consistency check
8. **Implement** → Execute the plan

## 🏗️ Monorepo Structure Considerations

Your project has three main components:

### Frontend (Angular)
- Path: `apps/frontend/`
- Technologies: Angular, TypeScript
- Port: Typically 4200

### Backend (Spring Boot)
- Path: `apps/backend/spring-security-jwt/`
- Technologies: Java, Spring Boot, Maven
- Port: Typically 8080

### Scraper (Python Flask)
- Path: `apps/scraper/crex_scraper_python/`
- Technologies: Python, Flask
- Port: 5000

When creating specs and plans, be clear about which component(s) the feature affects.

## 📖 Example Feature Lifecycle

### Feature: Add Live Match Notifications

1. **Specify**:
```
/speckit.specify Create a live match notification system. Users can subscribe to specific matches and receive browser notifications when key events occur (wickets, boundaries, milestones). Notifications should be configurable per user.
```

2. **Plan**:
```
/speckit.plan 
- Backend: Spring Boot WebSocket endpoint for notifications, JPA entities for user subscriptions
- Frontend: Angular service using Web Notifications API, settings component for preferences
- Scraper: Python module to detect key events and trigger notifications via backend API
Store preferences in PostgreSQL
```

3. **Tasks**:
```
/speckit.tasks
```

4. **Implement**:
```
/speckit.implement
```

## 🎯 Benefits for This Project

1. **Structured Development** - Clear specs before coding
2. **Cross-Component Features** - Better planning for features spanning frontend/backend/scraper
3. **Documentation** - Specs serve as living documentation
4. **Team Alignment** - Clear requirements and implementation plans
5. **Quality** - Validation checklists and consistency checks

## 📚 Additional Resources

- [SpecKit Repository](https://github.com/github/spec-kit)
- [SpecKit Documentation](https://github.github.io/spec-kit/)
- [Spec-Driven Development Guide](https://github.com/github/spec-kit/blob/main/spec-driven.md)

## 🔄 Updating SpecKit

To get the latest version:

```powershell
uvx --from git+https://github.com/github/spec-kit.git specify init . --ai copilot --script ps --force
```

## 📂 Where Specs Are Stored

Feature specifications will be stored in:
```
.specify/specs/
├── 001-feature-name/
│   ├── spec.md          # Feature specification
│   ├── plan.md          # Implementation plan
│   ├── tasks.md         # Task breakdown
│   ├── research.md      # Technical research (optional)
│   ├── data-model.md    # Data models (optional)
│   └── contracts/       # API contracts (optional)
```

## 💡 Tips

1. **Start Small** - Try SpecKit with a small feature first
2. **Customize Constitution** - Update `.specify/memory/constitution.md` with your project's actual principles
3. **Iterate** - Use `/speckit.clarify` if specs aren't clear enough
4. **Validate** - Use `/speckit.checklist` before implementation
5. **Review** - Keep specs updated as features evolve
