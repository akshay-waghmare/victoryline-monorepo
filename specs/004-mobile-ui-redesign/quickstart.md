# Quickstart Guide: Mobile-First UI/UX Development

**Feature**: 004-mobile-ui-redesign  
**Date**: 2025-11-13  
**Phase**: Phase 1 (Design & Contracts)

This guide helps developers get started with mobile-first development for VictoryLine.

---

## Prerequisites

- **Node.js**: 14.21.3 (recommended via nvm-windows)
- **npm**: 6.x or higher
- **Angular CLI**: 6.2.3 (project-local)
- **Git**: Latest version
- **VS Code** (recommended) with extensions:
  - Angular Language Service
  - ESLint
  - Prettier
  - Angular Schematics

---

## Initial Setup

### 1. Clone Repository & Install Dependencies

```powershell
# Clone the repository
git clone https://github.com/akshay-waghmare/victoryline-monorepo.git
cd victoryline-monorepo

# Checkout feature branch
git checkout 004-mobile-ui-redesign

# Navigate to frontend
cd apps/frontend

# Install dependencies
npm install
```

### 2. Verify Installation

```powershell
# Check Angular CLI version
npx ng version

# Should show:
# Angular CLI: 6.2.3
# Angular: 7.2.16
```

---

## Development Workflow

### Running the Development Server

```powershell
# From apps/frontend/
npm start
# or
npx ng serve

# Open browser to http://localhost:4200
```

### Mobile Development Mode

```powershell
# Serve with mobile viewport emulation (custom script - to be added)
npm run serve:mobile

# Opens Chrome with mobile viewport (375x667) and touch emulation
```

**Manual Mobile Testing**:
1. Open Chrome DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select device: iPhone 8 (375x667) or custom viewport
4. Enable "Touch" in device settings

---

## Building the Project

### Development Build

```powershell
npm run build
# or
npx ng build
```

### Production Build

```powershell
npm run build -- --prod

# Output: dist/id-card-app/
```

### Analyze Bundle Size

```powershell
# Generate stats file
npx ng build --prod --stats-json

# Analyze with webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/id-card-app/stats.json
```

---

## Testing

### Unit Tests

```powershell
# Run all tests
npm test
# or
npx ng test

# Run with code coverage
npx ng test --code-coverage

# View coverage report: coverage/index.html
```

### E2E Tests (Cypress - after migration)

```powershell
# Install Cypress (one-time)
npm install --save-dev cypress

# Open Cypress Test Runner
npx cypress open

# Run headless
npx cypress run
```

### Mobile-Specific Tests

```powershell
# Run tests with mobile viewport simulation
npx ng test --browsers=ChromeMobile

# ChromeMobile configured in karma.conf.js
```

---

## Mobile Development Best Practices

### 1. Always Start with Mobile Viewport

```typescript
// ❌ Bad: Desktop-first
.match-card {
  width: 400px;
}

@media (max-width: 768px) {
  .match-card {
    width: 100%;
  }
}

// ✅ Good: Mobile-first
.match-card {
  width: 100%;
}

@media (min-width: 768px) {
  .match-card {
    width: 400px;
  }
}
```

### 2. Use CSS Custom Properties

```css
/* Define in src/styles.css */
:root {
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --primary-color: #1e3a8a;
}

/* Use in components */
.match-card {
  padding: var(--spacing-md);
  background-color: var(--primary-color);
}
```

### 3. Test on Real Devices

**Using BrowserStack** (if available):
```powershell
# Set up BrowserStack local tunnel
npx browserstack-local --key YOUR_KEY

# Run tests on real devices
npm run test:browserstack
```

**Using Physical Devices**:
1. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Run dev server: `ng serve --host 0.0.0.0`
3. Open on device: `http://<your-ip>:4200`

---

## Component Development Workflow

### Creating a New Mobile Component

```powershell
# Generate component with Angular CLI
npx ng generate component components/match-card

# Creates:
# src/app/components/match-card/
# ├── match-card.component.ts
# ├── match-card.component.html
# ├── match-card.component.css
# └── match-card.component.spec.ts
```

### Component Checklist (from Constitution)

Before marking component as complete, verify:

- [ ] Follows design system tokens (colors, spacing, typography)
- [ ] Responsive on all breakpoints (320px, 375px, 768px, 1024px)
- [ ] Keyboard accessible (Tab, Enter, Escape)
- [ ] Screen reader friendly (ARIA labels)
- [ ] Respects reduced motion preference
- [ ] Works in light AND dark themes
- [ ] Focus indicators visible
- [ ] Loading/error states handled
- [ ] Documented (JSDoc + usage example)
- [ ] Unit tests written (>70% coverage)

---

## Debugging Mobile Issues

### Common Issues & Solutions

#### Issue: Component looks broken on mobile but fine on desktop

**Solution**: Check if you're using desktop-first CSS

```powershell
# Search for max-width media queries (desktop-first indicator)
grep -r "max-width" src/app/components/
```

#### Issue: Touch events not working

**Solution**: Ensure HammerJS is imported in main.ts

```typescript
// src/main.ts
import 'hammerjs'; // ✅ Must be imported before Angular
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
```

#### Issue: Images not lazy loading

**Solution**: Use native `loading="lazy"` attribute

```html
<!-- ✅ Modern browsers support this -->
<img src="..." alt="..." loading="lazy">
```

#### Issue: Bundle size too large

**Solution**: Lazy load routes

```typescript
// app.routing.ts
const routes: Routes = [
  {
    path: 'matches',
    loadChildren: () => import('./features/matches/matches.module').then(m => m.MatchesModule)
  }
];
```

---

## Performance Monitoring

### Lighthouse CI (Local)

```powershell
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --config=lighthouserc.json

# View report: .lighthouseci/
```

### Chrome DevTools Performance

1. Open DevTools (F12) → Performance tab
2. Click "Record" (Ctrl+E)
3. Interact with page (scroll, tap, navigate)
4. Stop recording
5. Analyze:
   - FPS (target: 60fps)
   - Network waterfall
   - JavaScript execution time

### Mobile Network Throttling

1. DevTools → Network tab
2. Select "Fast 3G" from throttling dropdown
3. Test page load times (target: <3s)

---

## Git Workflow

### Branch Strategy

```powershell
# Feature branch already created: 004-mobile-ui-redesign
git checkout 004-mobile-ui-redesign

# Create sub-task branch (optional)
git checkout -b 004-mobile-ui-redesign/match-card-component

# Work on feature...

# Commit with conventional format
git commit -m "feat(mobile): add mobile-optimized match card component"

# Push to remote
git push origin 004-mobile-ui-redesign/match-card-component

# Create pull request on GitHub
```

### Commit Message Format

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Formatting, whitespace
- refactor: Code restructuring
- test: Adding tests
- chore: Build/tooling

Examples:
feat(mobile): add pull-to-refresh directive
fix(mobile): correct touch target size for match cards
docs(mobile): update quickstart with mobile testing guide
test(mobile): add viewport tests for match card component
```

---

## Useful Commands Reference

```powershell
# Development
npm start                          # Start dev server
npm run build                      # Development build
npm run build -- --prod            # Production build
npm test                           # Run unit tests
npm run lint                       # Lint code

# Analysis
npx ng build --stats-json --prod   # Generate bundle analysis
npx webpack-bundle-analyzer dist/id-card-app/stats.json

# Testing
npx ng test --code-coverage        # Test with coverage
npx cypress open                   # E2E tests (after setup)
npx lighthouse http://localhost:4200 --view --preset=mobile

# Code Generation
npx ng generate component components/my-component
npx ng generate directive directives/my-directive
npx ng generate service services/my-service

# Debugging
ng serve --source-map              # Enable source maps in dev
ng build --verbose                 # Verbose build output
```

---

## IDE Setup (VS Code)

### Recommended Extensions

```json
// .vscode/extensions.json (add to project root)
{
  "recommendations": [
    "angular.ng-template",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "cipchk.cssrem",
    "formulahendry.auto-rename-tag"
  ]
}
```

### Workspace Settings

```json
// .vscode/settings.json (add to project root)
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "apps/frontend/node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.angular": true
  }
}
```

---

## Troubleshooting

### "Cannot find module '@angular/core'"

```powershell
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Port 4200 is already in use"

```powershell
# Kill process on port 4200
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Or use different port
ng serve --port 4201
```

### Angular CLI version mismatch

```powershell
# Use project-local CLI (recommended)
npx ng version

# NOT: ng version (uses global CLI)
```

---

## Next Steps

1. **Read the spec**: `specs/004-mobile-ui-redesign/spec.md`
2. **Review research**: `specs/004-mobile-ui-redesign/research.md`
3. **Study data models**: `specs/004-mobile-ui-redesign/data-model.md`
4. **Check component APIs**: `specs/004-mobile-ui-redesign/contracts/component-api.md`
5. **Start implementing**: Begin with P1 user stories (Home Page, Match Details)

---

## Support & Resources

- **Angular 7 Docs**: https://v7.angular.io/docs
- **Angular Material 7**: https://v7.material.angular.io/components
- **HammerJS**: https://hammerjs.github.io/getting-started/
- **Constitution**: `.specify/memory/constitution.md`
- **Team Chat**: [Add your team chat link]

Happy coding! 🚀