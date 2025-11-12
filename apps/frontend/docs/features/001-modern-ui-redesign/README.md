# Crickzen - Cricket Live Scores

Modern cricket live scores application with real-time updates, responsive design, and dark/light theme support.

## 🚀 Quick Start

### Prerequisites
- Node.js 16.20.2 (use `nvm use 16.20.2`)
- Angular CLI 6.2.3+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Application will be available at http://localhost:4200
```

### Backend
The backend for this app is available at: https://github.com/akiaksdon/jwt-example-role-based/tree/cricket

**Note**: Angular version 8.9.0, Angular CLI version 6.2.3

## ✨ Features

### Modern UI Redesign (v2.0)
- **Responsive Design**: Mobile-first approach with responsive layouts (320px - 2560px)
- **Dark/Light Theme**: System preference detection with manual toggle
- **Live Match Cards**: Real-time score updates with smooth animations
- **iOS Safe Areas**: Support for notched devices (iPhone X+)
- **Smooth Animations**: 60fps animations with reduced motion support
- **Intuitive Navigation**: Active route highlighting and tab-based filtering
- **Search & Filter**: Real-time search by team names and venues
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation

## 🎨 Design System

### CSS Custom Properties
The application uses CSS custom properties for consistent theming:

```css
/* Color System */
--color-primary: #1976d2;
--color-background: #ffffff;
--color-text-primary: #212121;

/* Spacing (8px grid) */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;

/* Typography */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
--font-size-xxl: 1.5rem;
--font-size-xxxl: 2rem;

/* Shadows */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
```

### Utility Classes

#### Spacing
```html
<div class="p-md">Padding medium</div>
<div class="mt-lg">Margin top large</div>
<div class="gap-sm">Gap small</div>
```

#### Typography
```html
<h1 class="text-xxl font-bold">Heading</h1>
<p class="text-base text-secondary">Body text</p>
```

#### Button Animations
```html
<button class="btn-hover-lift">Lift on hover</button>
<button class="btn-hover-shadow">Shadow on hover</button>
<button class="btn-hover-glow">Glow on hover</button>
<button class="btn-hover-scale">Scale on hover</button>
```

### Component Library

#### Match Card
```typescript
import { MatchCardComponent } from './features/matches/components/match-card/match-card.component';

<app-match-card
  [match]="matchData"
  [enableAnimations]="true"
  [showDetailsButton]="true"
  (cardClick)="onMatchClick($event)"
  (detailsClick)="onDetailsClick($event)"
></app-match-card>
```

#### Tab Navigation
```typescript
import { TabNavComponent } from './shared/components/tab-nav/tab-nav.component';

<app-tab-nav
  [tabs]="filterTabs"
  [activeTabId]="selectedTab"
  (tabChange)="onTabChange($event)"
></app-tab-nav>
```

#### Skeleton Loader
```typescript
import { SkeletonCardComponent } from './shared/components/skeleton-card/skeleton-card.component';

<app-skeleton-card [count]="6"></app-skeleton-card>
```

### Theme Service

```typescript
import { ThemeService } from './core/services/theme.service';

constructor(private themeService: ThemeService) {}

// Toggle theme
toggleTheme(): void {
  this.themeService.toggleTheme();
}

// Set specific theme
setTheme(mode: 'light' | 'dark'): void {
  this.themeService.setTheme(mode);
}

// Subscribe to theme changes
this.themeService.currentTheme$.subscribe(theme => {
  console.log('Current theme:', theme);
});
```

### Animation Service

```typescript
import { AnimationService } from './core/services/animation.service';

constructor(private animationService: AnimationService) {}

// Check if reduced motion is preferred
if (this.animationService.isReducedMotionPreferred()) {
  // Use simpler animations
}

// Register animation
this.animationService.registerAnimation('element-id', 300);

// Unregister when complete
this.animationService.unregisterAnimation('element-id');
```

## 📁 Project Structure

```
apps/frontend/src/
├── app/
│   ├── core/
│   │   ├── animations/        # Reusable Angular animations
│   │   ├── layout/           # Navbar, Mobile Nav components
│   │   ├── models/           # TypeScript interfaces
│   │   ├── services/         # Theme, Animation services
│   │   ├── themes/           # Light/Dark theme SCSS
│   │   └── utils/            # Helper functions
│   ├── features/
│   │   └── matches/
│   │       ├── components/   # Match Card, Skeleton Card
│   │       ├── models/       # Match data models
│   │       └── pages/        # Matches List page
│   ├── shared/
│   │   └── components/       # Tab Nav, reusable components
│   └── styles/
│       ├── _variables.scss   # Design tokens
│       ├── _mixins.scss      # Responsive mixins
│       ├── _utilities.scss   # Utility classes
│       └── _animations.scss  # CSS keyframes
└── styles.scss               # Global styles
```

## 🎯 Development Guidelines

### Code Style
- **TypeScript**: Use strict mode, define interfaces for all data structures
- **CSS**: Use CSS custom properties, BEM naming for components
- **Angular**: Follow Angular style guide, use OnPush change detection where possible

### Responsive Breakpoints
```scss
// Mobile: < 768px
// Tablet: 768px - 1023px
// Desktop: >= 1024px

@media (max-width: 767px) { /* Mobile */ }
@media (min-width: 768px) and (max-width: 1023px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### Accessibility
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **ARIA Labels**: Use aria-label, aria-selected, role attributes
- **Focus Management**: Visible focus indicators with :focus-visible
- **Reduced Motion**: Respect prefers-reduced-motion preference

### Performance
- **Lazy Loading**: Use `loading="lazy"` for below-fold images
- **Bundle Size**: Keep main bundle < 500KB gzipped
- **FPS Target**: Maintain 60fps for animations
- **LCP**: Target < 2.5s Largest Contentful Paint

## 🧪 Testing

```bash
# Unit tests
ng test

# E2E tests
ng e2e

# Lint
ng lint

# Build
ng build --prod
```

## 📦 Build & Deploy

```bash
# Production build
ng build --prod --output-path=dist

# Analyze bundle size
npm run build:analyze

# Docker build
docker build -t crickzen-frontend .
docker run -p 80:80 crickzen-frontend
```

## 🔧 Configuration

### Environment Variables
- `environment.ts`: Development configuration
- `environment.prod.ts`: Production configuration

### Angular Version
- Angular: 8.9.0
- Angular CLI: 6.2.3
- TypeScript: 4.9+

## 📚 Documentation

- [Design System Spec](../../specs/001-modern-ui-redesign/spec.md)
- [Task Breakdown](../../specs/001-modern-ui-redesign/tasks.md)
- [Implementation Plan](../../specs/001-modern-ui-redesign/plan.md)

## 🤝 Contributing

1. Create feature branch from `main`
2. Follow coding standards and design system guidelines
3. Test on multiple devices (iOS, Android, Desktop)
4. Ensure accessibility compliance
5. Submit pull request with detailed description

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- Angular Team for the framework
- Material Design for design principles
- Cricket data providers for match information

---

**Note**: This is version 2.0 with modern UI redesign. For legacy version, see branch `legacy-ui`.
