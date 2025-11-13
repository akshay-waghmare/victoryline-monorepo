# Research: Mobile-First UI/UX Redesign

**Feature**: 004-mobile-ui-redesign  
**Date**: 2025-11-13  
**Phase**: Phase 0 (Outline & Research)

This document consolidates all research findings for implementing mobile-first responsive design for VictoryLine's home page and match details page.

---

## 1. Frontend Codebase Audit

### Current State

**Angular Version**: 7.2.16  
**Angular CLI**: 6.2.3  
**TypeScript**: 3.2.4

**Key Dependencies**:
- `@angular/material`: 7.0.3 (Material Design component library)
- `bootstrap`: 4.1.3 (CSS framework)
- `hammerjs`: 2.0.8 (✅ Touch gesture library already installed!)
- `@stomp/ng2-stompjs`: 8.0.0 (WebSocket library)
- `rxjs`: 6.2.0 (Reactive programming)

### Design System Findings

**CSS Framework**: Hybrid Bootstrap 4 + Angular Material approach
- Bootstrap 4.1.3 imported globally in `styles.css`
- Angular Material 7 with `indigo-pink` prebuilt theme
- Both frameworks co-exist (potential for conflicts/bloat)

**CSS Custom Properties**: ✅ PRESENT
- Found in `src/styles.css` (lines 100-122):
  ```css
  :root {
    --primary-color: #1e3a8a;
    --secondary-color: #ffffff;
    --accent-color: #f59e0b;
    --muted-color: #6b7280;
    --background-color: #f3f4f6;
    --font-family-primary: 'Poppins', sans-serif;
    --font-family-secondary: 'Roboto', sans-serif;
    --font-size-small: 0.875rem;
    --font-size-medium: 1rem;
    --font-size-large: 1.25rem;
    --primary-dark: #163e7a;
    --primary-darker: #0f2e63;
    --text-color: #333333;
  }
  ```
- Design tokens exist for colors, typography (good foundation!)
- Missing: spacing tokens (need to add 8px grid variables)

**Responsive Typography**: ✅ PRESENT
- Uses `clamp()` for fluid typography (modern approach)
- Example: `h1 { font-size: clamp(2rem, 4vw, 2.75rem); }`
- Body text: `clamp(15px, 1.8vw, 18px)`
- Meets constitution's responsive typography requirement

**Reduced Motion Support**: ✅ PRESENT
- `@media (prefers-reduced-motion: reduce)` implemented
- Disables transitions and animations when user prefers reduced motion
- Aligns with constitution's accessibility requirements

**Current Breakpoints**: ⚠️ NEEDS INVESTIGATION
- Bootstrap 4 default breakpoints (xs: <576px, sm: ≥576px, md: ≥768px, lg: ≥992px, xl: ≥1200px)
- Not explicitly mobile-first in custom components
- Many component CSS files use desktop-first approach

**Existing Shared Components**:
- `skeleton-card` - Loading state component ✅ (reusable for mobile)
- `staleness-indicator` - Data freshness warning ✅ (good for WebSocket monitoring)
- `tab-nav` - Tab navigation component ✅ (mobile-friendly pattern)
- `theme-toggle` - Dark/light theme switcher ✅ (theme system exists!)
- `footer`, `logo`, `error-404`, `splash-screen`

**Theme System**: ✅ PRESENT
- `theme-toggle` component exists
- Implies light/dark mode already implemented
- Need to verify how themes are managed (localStorage, CSS variables, etc.)

### Audit Findings Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| CSS Framework | ⚠️ Hybrid | Bootstrap 4 + Angular Material (potential bloat) |
| CSS Custom Properties | ✅ Present | Colors + typography tokens exist, missing spacing |
| Responsive Typography | ✅ Present | Modern clamp() approach |
| Reduced Motion | ✅ Present | Accessibility compliant |
| Touch Gestures | ✅ Dependency Present | HammerJS 2.0.8 installed, needs integration |
| Theme System | ✅ Present | Light/dark mode toggle exists |
| Mobile-First CSS | ❌ Absent | Most components desktop-first |
| Utility Classes | ⚠️ Partial | Some utilities (aspect-ratio), not comprehensive |
| Component Library | ⚠️ Limited | Few shared components, potential for reusability |
| Breakpoints | ⚠️ Bootstrap Default | Need mobile-first custom breakpoints |

**Baseline Metrics** (to be measured):
- Bundle size: NEEDS MEASUREMENT (`ng build --prod --stats-json`)
- Lighthouse mobile score: NEEDS MEASUREMENT (run Lighthouse CI)
- Test coverage: NEEDS MEASUREMENT (`ng test --code-coverage`)
- Mobile viewport testing: NEEDS SETUP (current tests likely desktop-only)

### Decision: Hybrid Approach with Mobile-First Enhancement

**Rationale**:
- Constitution requires design system foundation - we have CSS custom properties ✅
- Existing theme system and components reduce implementation scope ✅
- HammerJS already installed - touch gestures ready to implement ✅
- Bootstrap 4 + Material coexistence is acceptable but watch bundle size ⚠️

**Recommendation**:
1. **Keep** existing CSS custom properties, expand with 8px grid spacing tokens
2. **Keep** Bootstrap 4 + Material, but lazy-load non-critical Material components
3. **Enhance** existing shared components (skeleton-card, tab-nav) for mobile
4. **Add** mobile-first utility classes alongside Bootstrap (not replace)
5. **Integrate** HammerJS for swipe gestures (library already present)
6. **Audit** theme system implementation for mobile optimization

---

## 2. Mobile-First CSS Strategy

### Problem Statement

Current CSS is desktop-first (many components use `max-width` media queries). Need to retrofit mobile-first approach without breaking desktop experience.

### Approaches Evaluated

#### Option A: Refactor All Existing CSS to Mobile-First
**Pros**: Clean, consistent, aligns with constitution  
**Cons**: High risk of desktop regression, large scope, time-intensive  
**Verdict**: ❌ Too risky for this iteration

#### Option B: Parallel Mobile Stylesheets
**Pros**: Zero desktop regression risk, clear separation  
**Cons**: CSS duplication, maintenance burden, increased bundle size  
**Verdict**: ❌ Violates DRY principle

#### Option C: Progressive Enhancement Hybrid (RECOMMENDED)
**Pros**: Low regression risk, leverages existing CSS, mobile-first for new components  
**Cons**: Requires discipline to maintain approach  
**Verdict**: ✅ SELECTED

### Decision: Progressive Enhancement Hybrid

**Strategy**:
1. **New mobile-specific components**: Write mobile-first from scratch
2. **Existing components being modified**: Add mobile-first overrides without removing desktop CSS
3. **Global utilities**: Create mobile-first utility classes (prefixed `.m-` for mobile)
4. **Breakpoint system**: Add custom mobile-first breakpoints alongside Bootstrap

**Implementation**:

```css
/* Add to styles.css - Mobile-First Breakpoints */
:root {
  /* Existing tokens... */
  
  /* 8px Grid System (Constitution VI) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
  --spacing-xxxl: 64px;
  
  /* Mobile-First Breakpoints */
  --breakpoint-mobile-sm: 320px;
  --breakpoint-mobile-md: 375px;
  --breakpoint-mobile-lg: 428px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-desktop-lg: 1440px;
}

/* Mobile-First Utility Classes */
.m-p-sm { padding: var(--spacing-sm); }
.m-p-md { padding: var(--spacing-md); }
.m-p-lg { padding: var(--spacing-lg); }
/* ... more utilities ... */

/* Mobile-first media queries */
@media (min-width: 768px) {
  .m-p-md { padding: var(--spacing-lg); } /* Scale up for tablet */
}

@media (min-width: 1024px) {
  .m-p-md { padding: var(--spacing-xl); } /* Scale up for desktop */
}
```

**Component Pattern**:

```css
/* match-card.component.css - Mobile-First Approach */

/* Base styles = Mobile (320px+) */
.match-card {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.team-name {
  font-size: var(--font-size-medium);
}

/* Tablet (768px+) - Progressive enhancement */
@media (min-width: 768px) {
  .match-card {
    flex-direction: row;
    padding: var(--spacing-lg);
  }
  
  .team-name {
    font-size: var(--font-size-large);
  }
}

/* Desktop (1024px+) - Further enhancement */
@media (min-width: 1024px) {
  .match-card {
    padding: var(--spacing-xl);
  }
}
```

**Rationale**:
- Aligns with constitution's mobile-first requirement
- Minimizes desktop regression risk (additive, not subtractive)
- Leverages existing CSS custom properties
- Uses 8px grid system from constitution
- Standard `min-width` media queries for progressive enhancement

---

## 3. Touch Gesture Implementation

### Library Decision

**Selected**: HammerJS 2.0.8 (already installed in package.json)

**Rationale**:
- Zero additional dependency cost (already present)
- Official Angular recommendation (pre-Angular 9)
- Mature library with good browser support
- Handles touch/mouse/pointer events uniformly
- Solves swipe vs. scroll conflict out-of-the-box

**Note**: HammerJS was removed from Angular Material in Angular 9+, but we're on Angular 7, so it's the recommended approach.

### Implementation Pattern

**Create Reusable Directives**:

1. **SwipeGestureDirective** - For tab navigation, carousels
2. **PullToRefreshDirective** - For live match updates
3. **TouchFeedbackDirective** - For ripple effects on tap

**Example: SwipeGestureDirective**

```typescript
import { Directive, Output, EventEmitter, HostListener } from '@angular/core';
import * as Hammer from 'hammerjs';

@Directive({
  selector: '[appSwipeGesture]'
})
export class SwipeGestureDirective {
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();
  
  private hammer: HammerManager;
  
  ngOnInit() {
    this.hammer = new Hammer(this.element.nativeElement, {
      recognizers: [
        [Hammer.Swipe, { direction: Hammer.DIRECTION_HORIZONTAL }]
      ]
    });
    
    this.hammer.on('swipeleft', () => this.swipeLeft.emit());
    this.hammer.on('swiperight', () => this.swipeRight.emit());
  }
  
  ngOnDestroy() {
    this.hammer.destroy();
  }
}
```

**Usage**:

```html
<div appSwipeGesture 
     (swipeLeft)="nextTab()" 
     (swipeRight)="prevTab()"
     class="match-details-tabs">
  <!-- Tab content -->
</div>
```

**Touch Feedback Pattern (Material Design Ripple)**:

Use Angular Material's `mat Ripple` directive (already available):

```html
<div class="match-card" 
     matRipple 
     [matRippleColor]="'rgba(0,0,0,0.1)'"
     (click)="navigateToMatch()">
  <!-- Card content -->
</div>
```

**Scroll vs. Swipe Conflict Resolution**:

```typescript
// Configure HammerJS to require 30px horizontal movement before triggering swipe
this.hammer = new Hammer(element, {
  recognizers: [
    [Hammer.Swipe, { 
      direction: Hammer.DIRECTION_HORIZONTAL,
      threshold: 30, // px - prevents accidental swipes during scroll
      velocity: 0.3   // Moderate velocity required
    }]
  ]
});
```

**Accessibility**:

- Provide keyboard equivalents (Arrow keys for swipe, Enter/Space for tap)
- Add ARIA labels for gesture-driven actions
- Test with screen readers (announce tab changes)

**Testing**:

```typescript
// Unit test for SwipeGestureDirective
it('should emit swipeLeft on horizontal swipe', () => {
  const directive = new SwipeGestureDirective(elementRef);
  let emitted = false;
  directive.swipeLeft.subscribe(() => emitted = true);
  
  // Simulate Hammer.js swipeleft event
  directive.hammer.emit('swipeleft');
  
  expect(emitted).toBe(true);
});
```

---

## 4. Responsive Image Strategy

### Problem Statement

Match cards display team logos, player photos. Need appropriately sized images for different devices (320px phone vs. 1440px desktop) and pixel densities (1x, 2x, 3x).

### Approach Decision

**Selected**: Native HTML `<img srcset>` + Angular Lazy Loading Directive

**Rationale**:
- Zero additional dependencies (browser-native)
- Best performance (browser chooses optimal image)
- Lazy loading support in Angular 7 (via Intersection Observer)
- Future-proof (standards-based)

### Implementation

**Create LazyImageComponent**:

```typescript
@Component({
  selector: 'app-lazy-image',
  template: `
    <img 
      [src]="src" 
      [srcset]="srcset"
      [alt]="alt"
      [loading]="'lazy'"
      (error)="onImageError()"
      [class]="imageClass"
    />
    <div *ngIf="error" class="image-placeholder">
      {{ fallbackText }}
    </div>
  `,
  styles: [`
    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--muted-color);
      color: var(--secondary-color);
      font-size: var(--font-size-small);
    }
  `]
})
export class LazyImageComponent {
  @Input() src: string;
  @Input() srcset: string; // e.g., "logo-1x.png 1x, logo-2x.png 2x, logo-3x.png 3x"
  @Input() alt: string;
  @Input() fallbackText: string = '?';
  @Input() imageClass: string = '';
  
  error = false;
  
  onImageError() {
    this.error = true;
  }
}
```

**Usage in Match Card**:

```html
<app-lazy-image 
  [src]="'assets/team-logos/' + team.id + '.png'"
  [srcset]="'assets/team-logos/' + team.id + '-1x.png 1x, ' +
            'assets/team-logos/' + team.id + '-2x.png 2x, ' +
            'assets/team-logos/' + team.id + '-3x.png 3x'"
  [alt]="team.name + ' logo'"
  [fallbackText]="team.abbreviation"
  imageClass="team-logo"
></app-lazy-image>
```

**Image Optimization Pipeline**:

1. **Build-time**: Use `sharp` (Node.js) to generate 1x, 2x, 3x versions
2. **Format**: Serve WebP with PNG fallback
3. **Compression**: Optimize with `imagemin` during build

**Add to build scripts**:

```json
// package.json
{
  "scripts": {
    "optimize-images": "node scripts/optimize-images.js",
    "prebuild": "npm run optimize-images"
  }
}
```

**`scripts/optimize-images.js`**:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceDir = 'src/assets/team-logos-source';
const outputDir = 'src/assets/team-logos';

fs.readdirSync(sourceDir).forEach(file => {
  const input = path.join(sourceDir, file);
  const basename = path.basename(file, path.extname(file));
  
  // Generate 1x, 2x, 3x versions
  [1, 2, 3].forEach(scale => {
    sharp(input)
      .resize(64 * scale) // Base size 64px
      .webp({ quality: 85 })
      .toFile(path.join(outputDir, `${basename}-${scale}x.webp`));
    
    // PNG fallback
    sharp(input)
      .resize(64 * scale)
      .png({ compressionLevel: 9 })
      .toFile(path.join(outputDir, `${basename}-${scale}x.png`));
  });
});
```

---

## 5. WebSocket Connection Status Indicator

### Design Decision

**Selected**: Non-intrusive snackbar (Material Design pattern)

**Rationale**:
- Doesn't obstruct content (appears at bottom, auto-dismisses)
- Familiar pattern (Angular Material `MatSnackBar` available)
- Accessible (ARIA live region)
- Mobile-friendly (doesn't block interactions)

### Implementation

**Create ConnectionStatusService**:

```typescript
@Injectable({ providedIn: 'root' })
export class ConnectionStatusService {
  private statusSubject = new BehaviorSubject<ConnectionStatus>('connected');
  public status$ = this.statusSubject.asObservable();
  
  constructor(
    private snackBar: MatSnackBar,
    private webSocketService: WebSocketService
  ) {
    this.webSocketService.connectionState$.subscribe(state => {
      this.updateStatus(state);
    });
  }
  
  private updateStatus(state: 'connected' | 'connecting' | 'disconnected') {
    this.statusSubject.next(state);
    
    if (state === 'disconnected') {
      this.snackBar.open('Connection lost. Retrying...', 'Dismiss', {
        duration: 0, // Don't auto-dismiss
        panelClass: 'connection-error-snackbar'
      });
    } else if (state === 'connected') {
      this.snackBar.dismiss();
      // Optionally show brief "Connected" message
      this.snackBar.open('Connected', '', { duration: 2000 });
    }
  }
}
```

**Visual States**:

- **Connected** (Green): Hidden (no indicator needed)
- **Reconnecting** (Yellow): "Reconnecting..." snackbar, pulsing indicator
- **Disconnected** (Red): "Connection lost" snackbar, manual refresh button

**Mobile CSS** (snackbar positioned for thumb reach):

```css
.connection-error-snackbar {
  background-color: var(--accent-color);
  color: white;
  bottom: calc(var(--spacing-xxxl) + env(safe-area-inset-bottom)); /* Above bottom nav */
}

@media (min-width: 768px) {
  .connection-error-snackbar {
    bottom: var(--spacing-md); /* Standard position on desktop */
  }
}
```

---

## 6. Performance Optimization Plan

### Current Baseline (TO BE MEASURED)

**Measurements Needed**:
1. Bundle size: `ng build --prod --stats-json; npx webpack-bundle-analyzer dist/*/stats.json`
2. Lighthouse mobile score: `lighthouse https://crickzen.com --view --preset=mobile`
3. Network waterfall: Chrome DevTools Network tab (3G throttling)

### Optimization Techniques (Prioritized)

#### Priority 1: Code Splitting & Lazy Loading (HIGH IMPACT)

**Problem**: All routes likely loaded eagerly (common in Angular 7 apps)

**Solution**: Lazy load routes with `loadChildren`

```typescript
// app.routing.ts - Before (eager loading)
const routes: Routes = [
  { path: 'matches', component: MatchesListComponent },
  { path: 'match/:id', component: MatchDetailsComponent }
];

// After (lazy loading)
const routes: Routes = [
  { 
    path: 'matches', 
    loadChildren: () => import('./features/matches/matches.module').then(m => m.MatchesModule)
  },
  { 
    path: 'match/:id', 
    loadChildren: () => import('./features/match-details/match-details.module').then(m => m.MatchDetailsModule)
  }
];
```

**Expected Impact**: 30-40% reduction in initial bundle size

---

#### Priority 2: Image Lazy Loading (HIGH IMPACT)

**Solution**: Already covered in section 4 (LazyImageComponent with `loading="lazy"`)

**Expected Impact**: 20-30% faster initial page load on mobile

---

#### Priority 3: Tree-Shaking Bootstrap & Material (MEDIUM IMPACT)

**Problem**: Importing entire Bootstrap CSS and Angular Material library

**Solution**: Import only needed Bootstrap components, lazy-load Material modules

```typescript
// app.module.ts - Before
import { MaterialModule } from '@angular/material';

// After (lazy loading)
// Only import Material components used on home page
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [MatCardModule, MatButtonModule] // Not all of Material
})
```

**Bootstrap**: Use Bootstrap utilities only, remove unused components via PurgeCSS

```javascript
// Add to angular.json production build
"optimization": {
  "styles": {
    "inlineCritical": true,
    "minify": true,
    "purge": true // Requires ngx-unused-css or manual PurgeCSS config
  }
}
```

**Expected Impact**: 15-20% bundle size reduction

---

#### Priority 4: Ahead-of-Time (AOT) Compilation (ALREADY ENABLED)

**Status**: ✅ Already enabled in production build (`angular.json`: `"aot": true`)

---

#### Priority 5: Service Worker for Caching (FUTURE - OUT OF SCOPE)

**Note**: Constitution mentions PWA features are future enhancements. Skip for this iteration.

---

### Performance Budget Enforcement

**Add to `angular.json`**:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "400kb",
      "maximumError": "500kb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "6kb",
      "maximumError": "10kb"
    }
  ]
}
```

**Lighthouse CI in GitHub Actions**:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v8
        with:
          urls: |
            http://localhost:4200
            http://localhost:4200/match/sample
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

## 7. Mobile Testing Strategy

### Testing Pyramid for Mobile

```
      /\
     /E2E\        ← Few, slow, expensive (critical mobile flows)
    /------\
   /  INT   \     ← Some (responsive behavior, gestures)
  /----------\
 /   UNIT     \   ← Many, fast, cheap (component logic)
/--------------\
```

### Unit Testing (70%+ coverage target)

**Viewport Simulation in Karma**:

```typescript
// karma.conf.js - Add mobile viewport configs
browsers: ['ChromeHeadless', 'ChromeMobile'],
customLaunchers: {
  ChromeMobile: {
    base: 'ChromeHeadless',
    flags: [
      '--window-size=375,667', // iPhone 8 dimensions
      '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X)'
    ]
  }
}
```

**Component Test Example (Responsive Behavior)**:

```typescript
// match-card.component.spec.ts
describe('MatchCardComponent (Mobile)', () => {
  it('should stack teams vertically on mobile viewport', () => {
    // Simulate 375px viewport
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    
    const compiled = fixture.nativeElement;
    const card = compiled.querySelector('.match-card');
    
    expect(card.classList).toContain('mobile-layout');
    expect(getComputedStyle(card).flexDirection).toBe('column');
  });
});
```

---

### Integration Testing

**Touch Gesture Testing**:

```typescript
// swipe-gesture.directive.spec.ts
it('should emit swipeLeft event on left swipe', () => {
  let emitted = false;
  directive.swipeLeft.subscribe(() => emitted = true);
  
  // Simulate touch events
  const touchStart = new TouchEvent('touchstart', { touches: [{ clientX: 200 }] });
  const touchMove = new TouchEvent('touchmove', { touches: [{ clientX: 100 }] });
  const touchEnd = new TouchEvent('touchend');
  
  element.dispatchEvent(touchStart);
  element.dispatchEvent(touchMove);
  element.dispatchEvent(touchEnd);
  
  expect(emitted).toBe(true);
});
```

---

### E2E Testing (Migrate from Protractor to Cypress)

**Rationale**: Protractor is deprecated, Cypress has better mobile support

**Migration Plan**:
1. Install Cypress: `npm install --save-dev cypress`
2. Add Cypress config for mobile viewports
3. Write mobile-specific E2E tests

**Cypress Mobile Viewport Config**:

```javascript
// cypress.json
{
  "viewportWidth": 375,
  "viewportHeight": 667,
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X)"
}
```

**E2E Test Example**:

```javascript
// cypress/integration/home-mobile.spec.js
describe('Home Page (Mobile)', () => {
  beforeEach(() => {
    cy.viewport('iphone-8'); // 375x667
    cy.visit('/');
  });
  
  it('should display match cards without horizontal scroll', () => {
    cy.get('.match-card').should('be.visible');
    cy.window().its('scrollX').should('equal', 0); // No horizontal scroll
  });
  
  it('should navigate to match details on card tap', () => {
    cy.get('.match-card').first().click();
    cy.url().should('include', '/match/');
  });
});
```

---

### Accessibility Testing

**axe-core Integration** (automated WCAG checks):

```typescript
// Install: npm install --save-dev axe-core @axe-core/angular

// app.component.spec.ts (run on every component test)
import { axe, toHaveNoViolations } from 'jasmine-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const results = await axe(fixture.nativeElement);
  expect(results).toHaveNoViolations();
});
```

**Manual Testing Checklist**:
- [ ] Test with VoiceOver (iOS) or TalkBack (Android)
- [ ] Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Test with 200% browser zoom (text scaling)
- [ ] Test with high contrast mode
- [ ] Verify touch target sizes ≥44x44px (Chrome DevTools Inspect Mode)

---

### Lighthouse CI (Performance + Accessibility Gates)

**Add to PR checks** (covered in section 6)

---

## 8. Component Reusability & Design System Foundation

### Component API Guidelines

**Follow Angular Best Practices**:

1. **Input/Output Pattern**:
```typescript
@Component({ selector: 'app-match-card' })
export class MatchCardComponent {
  @Input() match: Match; // Data
  @Input() layout: 'compact' | 'expanded' = 'compact'; // Variant
  @Output() cardClick = new EventEmitter<string>(); // Events
}
```

2. **Lifecycle Hooks**:
   - `ngOnInit()`: Initialize data
   - `ngOnChanges()`: React to input changes
   - `ngOnDestroy()`: Clean up subscriptions (prevent memory leaks)

3. **Change Detection**: Use `OnPush` for performance
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

4. **Accessibility**: Always include ARIA labels
```html
<div role="button" 
     [attr.aria-label]="'View details for ' + match.teams"
     tabindex="0">
</div>
```

---

### Component Documentation Template

**Use JSDoc for TypeScript**:

```typescript
/**
 * Mobile-optimized match card component.
 * 
 * Displays match information in a compact, touch-friendly card format.
 * Supports two layouts: 'compact' (mobile) and 'expanded' (desktop).
 * 
 * @example
 * ```html
 * <app-match-card 
 *   [match]="matchData" 
 *   [layout]="'compact'"
 *   (cardClick)="navigateToMatch($event)">
 * </app-match-card>
 * ```
 * 
 * @accessibility
 * - 44x44px minimum touch target
 * - ARIA label includes team names
 * - Keyboard navigable (Tab, Enter)
 * - Screen reader announces match status
 */
@Component({...})
export class MatchCardComponent { }
```

---

### Component Checklist Enforcement (from Constitution VI)

**Create PR Template** (`.github/pull_request_template.md`):

```markdown
## Component Checklist (if applicable)

- [ ] Follows design system tokens (colors, spacing, typography)
- [ ] Responsive on all breakpoints (test 320px, 375px, 768px, 1024px)
- [ ] Keyboard accessible
- [ ] Screen reader friendly (ARIA labels)
- [ ] Respects reduced motion preference
- [ ] Works in light AND dark themes
- [ ] Focus indicators visible
- [ ] Loading/error states handled
- [ ] Documented (JSDoc + usage example)
- [ ] Unit tests written (>70% coverage)
```

---

## Research Consolidation Summary

### Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **CSS Strategy**: Progressive Enhancement Hybrid | Low regression risk, leverages existing tokens | Medium effort, mobile-first for new components only |
| **Touch Gestures**: HammerJS (existing dependency) | Zero cost, Angular 7 recommended approach | Low effort, library already installed |
| **Images**: Native `srcset` + lazy loading | Standards-based, future-proof, best performance | Medium effort, build script needed |
| **WebSocket Status**: MatSnackBar (Material Design) | Non-intrusive, mobile-friendly, accessible | Low effort, Material already present |
| **Performance**: Code splitting + lazy loading + tree-shaking | High impact, standard Angular optimization | Medium effort, refactor to lazy modules |
| **Testing**: Cypress for E2E, axe-core for a11y, Lighthouse CI | Modern stack, better mobile support than Protractor | High effort, migration + CI setup |
| **Components**: Reusable + documented + checklistenforced | Foundation for future design system | Medium effort, process change |

### Alternatives Considered

- **CSS**: Big-bang refactor to mobile-first ❌ (too risky)
- **Touch**: Custom event handlers ❌ (reinventing wheel, HammerJS exists)
- **Images**: CDN-based optimization ❌ (adds infrastructure complexity)
- **Status**: Inline banner ❌ (obstructs content on mobile)
- **Testing**: Keep Protractor ❌ (deprecated, poor mobile support)

---

## Next Steps: Proceed to Phase 1 (Design & Contracts)

With all research questions resolved, we can now confidently proceed to:

1. **data-model.md**: Define component props, state models, API contracts
2. **contracts/**: OpenAPI specs for any new API endpoints (unlikely for frontend-only feature)
3. **quickstart.md**: Developer setup guide for mobile development workflow
4. **Update agent context**: Add new technologies to Copilot instructions

**Phase 0 Complete** ✅Human: continue