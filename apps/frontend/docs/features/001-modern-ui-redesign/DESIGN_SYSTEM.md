# Victory Line Design System

Complete guide to the Victory Line Cricket App design system, including principles, components, utilities, and usage patterns.

## 🎯 Design Principles

### 1. Mobile-First Responsive
- Start with mobile (320px) and scale up to desktop (2560px)
- Use CSS Grid and Flexbox for fluid layouts
- Test on real devices regularly

### 2. Performance-Oriented
- Target 60fps for all animations
- Lazy load below-fold images
- Keep main bundle < 500KB gzipped
- Optimize for 3G networks (LCP < 2.5s)

### 3. Accessible by Default
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly
- Respect reduced motion preferences

### 4. Consistent & Scalable
- Use CSS custom properties for theming
- Follow 8px grid system for spacing
- Maintain design token consistency
- Reusable component library

### 5. Progressive Enhancement
- Core functionality without JavaScript
- Enhanced experience with animations
- Graceful degradation for older browsers
- Dark mode support

---

## 🎨 Design Tokens

### Color System

#### Light Theme
```css
/* Primary Colors */
--color-primary: #1976d2;
--color-primary-light: #63a4ff;
--color-primary-dark: #004ba0;

/* Semantic Colors */
--color-success: #4caf50;
--color-warning: #ff9800;
--color-error: #f44336;
--color-info: #2196f3;

/* Neutral Colors */
--color-background: #ffffff;
--color-surface: #f5f5f5;
--color-text-primary: #212121;
--color-text-secondary: #757575;
--color-border: #e0e0e0;
```

#### Dark Theme
```css
--color-background: #121212;
--color-surface: #1e1e1e;
--color-text-primary: #e0e0e0;
--color-text-secondary: #9e9e9e;
--color-border: #333333;
```

### Typography Scale

```css
/* Font Sizes (rem-based for accessibility) */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-xxl: 1.5rem;    /* 24px */
--font-size-xxxl: 2rem;     /* 32px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Spacing System (8px Grid)

```css
/* Spacing Tokens */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;
--spacing-xxxl: 64px;

/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Shadows

```css
/* Elevation System */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.2);
```

### Animation Timings

```css
/* Duration */
--animation-fast: 150ms;
--animation-normal: 300ms;
--animation-slow: 500ms;

/* Easing Functions */
--ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 📦 Component Library

### Match Card

**Purpose**: Display match information with scores and status

**Variants**:
- Default: Full match details with scores
- Compact: Minimal information for lists
- Hero: Featured match on homepage

**Props**:
```typescript
interface MatchCardProps {
  match: MatchCardViewModel;
  enableAnimations?: boolean; // Default: true
  showDetailsButton?: boolean; // Default: true
  variant?: 'default' | 'compact' | 'hero'; // Default: 'default'
}
```

**Events**:
- `(cardClick)`: Emitted when card is clicked
- `(detailsClick)`: Emitted when details button is clicked

**Usage**:
```html
<app-match-card
  [match]="matchData"
  [enableAnimations]="true"
  [showDetailsButton]="true"
  variant="default"
  (cardClick)="onMatchClick($event)"
  (detailsClick)="onDetailsClick($event)"
></app-match-card>
```

**Accessibility**:
- Keyboard navigable
- Screen reader announcements for live score updates
- Focus indicators on interactive elements

---

### Tab Navigation

**Purpose**: Tabbed navigation with animated indicator

**Props**:
```typescript
interface Tab {
  id: string;
  label: string;
  icon?: string; // Material icon name
  count?: number; // Badge count
}

interface TabNavProps {
  tabs: Tab[];
  activeTabId: string;
}
```

**Events**:
- `(tabChange)`: Emitted when tab is selected with new tab ID

**Usage**:
```html
<app-tab-nav
  [tabs]="filterTabs"
  [activeTabId]="selectedTab"
  (tabChange)="onTabChange($event)"
></app-tab-nav>
```

**Accessibility**:
- Uses `role="tablist"`, `role="tab"`
- Arrow key navigation
- `aria-selected` state management

---

### Skeleton Loader

**Purpose**: Loading placeholder for content

**Props**:
```typescript
interface SkeletonCardProps {
  count?: number; // Default: 3
  height?: string; // Default: '200px'
}
```

**Usage**:
```html
<app-skeleton-card [count]="6" height="250px"></app-skeleton-card>
```

**Features**:
- Shimmer animation
- Respects reduced motion
- Matches match card dimensions

---

### Navbar

**Purpose**: Main navigation with theme toggle

**Features**:
- Active route highlighting
- Responsive mobile menu
- Theme switcher
- Sticky positioning

**Usage**:
```html
<app-navbar></app-navbar>
```

**Customization**:
Edit `navbar.component.ts`:
```typescript
navLinks = [
  { label: 'Home', route: '/Home', icon: 'home' },
  { label: 'Tennis', route: '/tennis', icon: 'sports_tennis' },
  // Add more links
];
```

---

## 🛠️ Utility Classes

### Spacing Utilities

```html
<!-- Margin -->
<div class="m-sm">Margin small (8px all sides)</div>
<div class="mt-md">Margin top medium (16px)</div>
<div class="mx-lg">Margin horizontal large (24px)</div>

<!-- Padding -->
<div class="p-xl">Padding extra large (32px all sides)</div>
<div class="py-md">Padding vertical medium (16px)</div>

<!-- Gap (for Flexbox/Grid) -->
<div class="gap-sm">Gap small (8px)</div>
```

**Available sizes**: `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`

### Typography Utilities

```html
<!-- Font Sizes -->
<h1 class="text-xxxl">Extra Large Heading</h1>
<p class="text-base">Body text</p>
<small class="text-xs">Small text</small>

<!-- Font Weights -->
<p class="font-normal">Normal weight</p>
<p class="font-medium">Medium weight</p>
<p class="font-bold">Bold weight</p>

<!-- Text Colors -->
<p class="text-primary">Primary color</p>
<p class="text-secondary">Secondary color</p>
<p class="text-success">Success color</p>
<p class="text-error">Error color</p>
```

### Button Animation Utilities

```html
<!-- Hover Effects -->
<button class="btn-hover-lift">Lifts on hover</button>
<button class="btn-hover-shadow">Shadow grows on hover</button>
<button class="btn-hover-glow">Glows on hover</button>
<button class="btn-hover-scale">Scales on hover</button>
```

**Technical Details**:
- Uses `transform` for GPU acceleration
- Respects `prefers-reduced-motion`
- 300ms duration with ease-out timing

### Layout Utilities

```html
<!-- Flexbox -->
<div class="flex flex-row items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>

<!-- Grid -->
<div class="grid grid-cols-2 gap-md">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

---

## 🎭 Theming

### Theme Service

**Purpose**: Manage light/dark theme with persistence

**Methods**:
```typescript
import { ThemeService } from './core/services/theme.service';

constructor(private themeService: ThemeService) {}

// Toggle between light and dark
toggleTheme(): void {
  this.themeService.toggleTheme();
}

// Set specific theme
setTheme(mode: 'light' | 'dark'): void {
  this.themeService.setTheme(mode);
}

// Subscribe to theme changes
this.themeService.currentTheme$.subscribe(theme => {
  console.log('Theme changed to:', theme);
});
```

**Features**:
- Automatic system preference detection
- LocalStorage persistence
- 300ms debounce on toggle to prevent rapid switching
- CSS custom properties for dynamic theming

**Implementation**:
1. Add ThemeService to component constructor
2. Call `toggleTheme()` on button click
3. Theme applies automatically to entire app

---

## ✨ Animation System

### Animation Service

**Purpose**: Coordinate animations with FPS monitoring

**Methods**:
```typescript
import { AnimationService } from './core/services/animation.service';

constructor(private animationService: AnimationService) {}

// Check if reduced motion is preferred
if (this.animationService.isReducedMotionPreferred()) {
  // Use simpler animations or disable
}

// Register animation (for FPS monitoring)
this.animationService.registerAnimation('my-animation', 500);

// Unregister when complete
this.animationService.unregisterAnimation('my-animation');
```

**Features**:
- FPS monitoring (target: 60fps)
- Reduced motion detection
- Animation registry for performance tracking
- Automatic performance degradation on low FPS

### Angular Animations

**Available Triggers**:

#### routeAnimations
```typescript
// In component
@Component({
  animations: [routeAnimations]
})

// In template
<div [@routeAnimations]="outlet.activatedRouteData['animation']">
  <router-outlet #outlet="outlet"></router-outlet>
</div>
```

#### fadeTransition
```typescript
@Component({
  animations: [fadeTransition]
})

// In template
<div [@fadeTransition]="isVisible">Content</div>
```

---

## 📱 Responsive Design

### Breakpoints

```scss
// Mobile: < 768px
@media (max-width: 767px) {
  /* Mobile styles */
}

// Tablet: 768px - 1023px
@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet styles */
}

// Desktop: >= 1024px
@media (min-width: 1024px) {
  /* Desktop styles */
}

// Large Desktop: >= 1440px
@media (min-width: 1440px) {
  /* Large desktop styles */
}
```

### Mobile-First Approach

**Best Practice**:
```scss
.my-component {
  /* Mobile styles (base) */
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
  
  /* Tablet and up */
  @media (min-width: 768px) {
    padding: var(--spacing-md);
    font-size: var(--font-size-base);
  }
  
  /* Desktop and up */
  @media (min-width: 1024px) {
    padding: var(--spacing-lg);
    font-size: var(--font-size-lg);
  }
}
```

### iOS Safe Areas

**Support for Notched Devices**:
```css
.navbar {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## ♿ Accessibility

### Focus Management

**Focus Visible**:
```css
/* Global focus styles */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

**Skip to Main Content**:
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

### Keyboard Navigation

**Requirements**:
- All interactive elements reachable via Tab
- Enter/Space to activate buttons
- Arrow keys for tabs and menus
- Escape to close modals/menus

**Testing**:
1. Disconnect mouse
2. Navigate entire app with keyboard only
3. Verify all functionality accessible

### Screen Readers

**ARIA Labels**:
```html
<!-- Button with icon only -->
<button aria-label="Toggle theme">
  <i class="material-icons">brightness_6</i>
</button>

<!-- Live region for score updates -->
<div aria-live="polite" aria-atomic="true">
  Score: {{ homeScore }} - {{ awayScore }}
</div>

<!-- Tab navigation -->
<div role="tablist">
  <button role="tab" aria-selected="true">Live</button>
  <button role="tab" aria-selected="false">Upcoming</button>
</div>
```

### Reduced Motion

**Respect User Preferences**:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**JavaScript Detection**:
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## 🚀 Performance

### Image Optimization

**Lazy Loading**:
```html
<img src="team-logo.png" alt="Team Name" loading="lazy">
```

**WebP with Fallback**:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="Description">
</picture>
```

### Code Splitting

**Lazy Load Modules**:
```typescript
{
  path: 'player/:id',
  loadChildren: () => import('./player/player.module').then(m => m.PlayerModule)
}
```

### Bundle Size

**Targets**:
- Main bundle: < 500KB gzipped
- Lazy loaded chunks: < 100KB each
- Total transferred: < 1MB on initial load

**Monitoring**:
```bash
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

---

## 🧪 Testing Guidelines

### Visual Regression

**Test Scenarios**:
- Light vs Dark theme
- Mobile, Tablet, Desktop viewports
- All component states (hover, active, disabled)

### Accessibility Audits

**Tools**:
- Lighthouse CI (score > 90)
- axe DevTools (0 violations)
- Manual keyboard testing

### Performance Testing

**Metrics**:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- TTI (Time to Interactive): < 3.5s

---

## 📋 Component Checklist

When creating new components, ensure:

- [ ] Follows design system tokens (colors, spacing, typography)
- [ ] Responsive on all breakpoints (320px - 2560px)
- [ ] Keyboard accessible
- [ ] Screen reader friendly (ARIA labels)
- [ ] Respects reduced motion preference
- [ ] Works in light and dark themes
- [ ] Focus indicators visible
- [ ] Loading/error states handled
- [ ] Documented in design system
- [ ] Unit tests written

---

## 🎓 Learning Resources

### Internal Documentation
- [README.md](./README.md) - Project setup and overview
- [spec.md](../../specs/001-modern-ui-redesign/spec.md) - Design system specification
- [tasks.md](../../specs/001-modern-ui-redesign/tasks.md) - Implementation tasks

### External Resources
- [Angular Material Documentation](https://material.angular.io/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Performance](https://web.dev/performance/)

---

## 🤝 Contributing to Design System

### Proposing New Components

1. Check if existing components can be extended
2. Create proposal with use cases and mockups
3. Discuss with team for approval
4. Implement following component checklist
5. Document in this file
6. Add usage examples

### Modifying Design Tokens

1. Discuss impact on existing components
2. Update CSS custom properties in `styles.scss`
3. Test all components in light/dark themes
4. Update documentation
5. Notify team of changes

---

**Last Updated**: 2025-11-06  
**Version**: 2.0 (Modern UI Redesign)  
**Maintainer**: Development Team
